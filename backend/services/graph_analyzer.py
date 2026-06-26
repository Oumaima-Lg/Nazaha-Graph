import asyncio
from collections import defaultdict
from typing import Any

import networkx as nx

from models.graph import AnalyzeResponse, ContractSummary, GraphEdge, GraphNode
from models.ocds import OCDSRelease, OCDSReleasePackage
from services.inpplc_mock import fetch_legal_histories


def _party_type(roles: list[str]) -> str:
    if "buyer" in roles:
        return "agency"
    if "procuringEntity" in roles or "contactPoint" in roles:
        return "person"
    if "supplier" in roles and "tenderer" not in roles:
        return "supplier"
    if "tenderer" in roles or "supplier" in roles:
        return "company"
    return "company"


def _format_amount(value: dict[str, Any] | None) -> str:
    if not value:
        return "N/A"
    amount = value.get("amount", 0)
    currency = value.get("currency", "MAD")
    return f"{amount:,.0f} {currency}".replace(",", " ")


def _contract_status(release: OCDSRelease, contract_status: str | None) -> str:
    normalized = (contract_status or "").lower()
    if normalized in {"terminated", "cancelled", "unsuccessful"}:
        return "rejete"
    if normalized == "active":
        return "sain"
    return "suspect"


def _risk_score(is_suspect: bool, contract_status: str, inpplc_risk: str | None) -> int:
    base = 85 if is_suspect else 20
    if contract_status == "rejete":
        base = max(base, 90)
    if inpplc_risk == "high":
        base = min(100, base + 15)
    elif inpplc_risk == "medium":
        base = min(100, base + 8)
    return base


def build_graph_from_ocds(package: OCDSReleasePackage) -> tuple[list[GraphNode], list[GraphEdge], list[ContractSummary]]:
    G = nx.Graph()
    nodes: dict[str, GraphNode] = {}
    edges: list[GraphEdge] = []
    contracts: list[ContractSummary] = []

    tender_bidders: dict[str, set[str]] = defaultdict(set)
    person_links: dict[str, set[str]] = defaultdict(set)

    def ensure_node(node_id: str, label: str, node_type: str) -> None:
        if node_id not in nodes:
            nodes[node_id] = GraphNode(id=node_id, label=label, type=node_type, isSuspect=False)
            G.add_node(node_id, type=node_type)

    def add_edge(source: str, target: str, weight: str, relation: str) -> None:
        if source == target:
            return
        G.add_edge(source, target, weight=weight, relation=relation)
        edges.append(GraphEdge(source=source, target=target, weight=weight, relation=relation))

    for release in package.releases:
        party_map = {p.id: p for p in release.parties}

        for party in release.parties:
            ensure_node(party.id, party.name or party.id, _party_type(party.roles))

        if release.tender:
            tender_id = release.tender.id
            ensure_node(tender_id, release.tender.title or tender_id, "tender")

            for party in release.parties:
                if "tenderer" in party.roles:
                    tender_bidders[tender_id].add(party.id)
                    add_edge(party.id, tender_id, "medium", "bid_on_tender")

            for party in release.parties:
                if "procuringEntity" in party.roles:
                    for bidder_id in tender_bidders[tender_id]:
                        person_links[party.id].add(bidder_id)
                        add_edge(bidder_id, party.id, "strong", "linked_decision_maker")

            for party in release.parties:
                if party.roles == ["supplier"] or (
                    "supplier" in party.roles and "tenderer" not in party.roles
                ):
                    for bidder_id in tender_bidders[tender_id]:
                        add_edge(party.id, bidder_id, "strong", "shared_supplier")

        for award in release.awards:
            for supplier in award.suppliers:
                supplier_id = supplier.get("id")
                if not supplier_id:
                    continue
                ensure_node(supplier_id, supplier.get("name", supplier_id), "company")
                if release.tender:
                    add_edge(supplier_id, release.tender.id, "medium", "awarded_tender")

        for contract in release.contracts:
            vendor = ""
            contract_status = _contract_status(release, contract.status)
            amount = _format_amount(contract.value)

            for award in release.awards:
                if award.id == contract.awardID and award.suppliers:
                    vendor = award.suppliers[0].get("name", award.suppliers[0].get("id", ""))
                    break

            contracts.append(
                ContractSummary(
                    id=contract.id,
                    title=contract.title or contract.id,
                    vendor=vendor or "Inconnu",
                    amount=amount,
                    date=contract.dateSigned or release.date or "",
                    status=contract_status,
                    riskScore=_risk_score(False, contract_status, None),
                )
            )

    suspect_ids: set[str] = set()

    # Règle 1 : plusieurs soumissionnaires sur le même appel d'offres ET un fournisseur commun
    for tender_id, bidders in tender_bidders.items():
        bidder_list = list(bidders)
        # Appel d'offres avec ≥3 soumissionnaires liés à un fournisseur commun = collusion probable
        if len(bidder_list) >= 3:
            # Vérifier si ces soumissionnaires partagent des fournisseurs communs
            shared_suppliers = set()
            for edge in edges:
                if edge.relation == "shared_supplier":
                    if edge.source in bidder_list or edge.target in bidder_list:
                        shared_suppliers.add(edge.source)
                        shared_suppliers.add(edge.target)
            if shared_suppliers or len(bidder_list) >= 4:
                for bidder in bidder_list:
                    suspect_ids.add(bidder)
                if tender_id in nodes:
                    suspect_ids.add(tender_id)
                suspect_ids.update(shared_suppliers)

    # Règle 2 : décideur lié à ≥2 entreprises soumissionnaires = conflit d'intérêts
    for person_id, linked_companies in person_links.items():
        if len(linked_companies) >= 2:
            suspect_ids.add(person_id)
            suspect_ids.update(linked_companies)

    # Règle 3 : détection de cliques dans le sous-graphe des sociétés (réseau dense = entente)
    company_nodes = [nid for nid, data in G.nodes(data=True) if data.get("type") in {"company", "supplier"}]
    if len(company_nodes) >= 3:
        subgraph = G.subgraph(company_nodes)
        try:
            cliques = [c for c in nx.find_cliques(subgraph) if len(c) >= 3]
            for clique in cliques:
                suspect_ids.update(clique)
        except Exception:
            pass

    for node_id in suspect_ids:
        if node_id in nodes:
            nodes[node_id].isSuspect = True

    for contract in contracts:
        vendor_node = next(
            (n for n in nodes.values() if n.label == contract.vendor or n.id == contract.vendor.lower()),
            None,
        )
        if vendor_node and vendor_node.isSuspect:
            contract.status = "suspect"
            contract.riskScore = max(contract.riskScore, 75)

    return list(nodes.values()), edges, contracts


async def analyze_ocds_package(package: OCDSReleasePackage, source: str = "supabase") -> AnalyzeResponse:
    nodes, edges, contracts = await asyncio.to_thread(build_graph_from_ocds, package)

    company_ids = [n.id for n in nodes if n.type in {"company", "supplier"} and n.isSuspect]
    legal_histories = await fetch_legal_histories(company_ids)

    enriched_nodes: list[GraphNode] = []
    for node in nodes:
        inpplc_data = legal_histories.get(node.id)
        if inpplc_data:
            node.inpplc = inpplc_data
            # Escalade : niveau de risque INPPLC "high" → marquer comme suspect même si non détecté par graphe
            if inpplc_data.get("risk_level") == "high":
                node.isSuspect = True
            # Si le nœud est suspect ET que l'INPPLC le confirme à risque élevé → recalculer le score dans les contrats
        enriched_nodes.append(node)

    # Recalcul des riskScores en tenant compte de l'enrichissement INPPLC
    inpplc_high_ids = {
        node.id for node in enriched_nodes
        if node.inpplc and node.inpplc.get("risk_level") == "high"
    }
    for contract in contracts:
        vendor_node = next(
            (n for n in enriched_nodes if n.label == contract.vendor),
            None,
        )
        if vendor_node:
            inpplc_bonus = 15 if vendor_node.id in inpplc_high_ids else 0
            contract.riskScore = min(100, contract.riskScore + inpplc_bonus)
            if vendor_node.isSuspect and contract.status == "sain":
                contract.status = "suspect"
                contract.riskScore = max(contract.riskScore, 75)

    suspect_count = sum(1 for n in enriched_nodes if n.isSuspect)

    return AnalyzeResponse(
        nodes=enriched_nodes,
        edges=edges,
        contracts=contracts,
        stats={
            "total_nodes": len(enriched_nodes),
            "total_edges": len(edges),
            "suspect_nodes": suspect_count,
            "contracts_analyzed": len(contracts),
        },
        source=source,
    )
