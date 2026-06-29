import asyncio
from collections import defaultdict
from datetime import date
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


async def analyze_ocds_package(package: OCDSReleasePackage, source: str = "sample") -> AnalyzeResponse:
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


# ═══════════════════════════════════════════════════════════════════════════════
# SUPABASE GRAPH ANALYSIS — reads real relational graph, detects 5 fraud patterns
# ═══════════════════════════════════════════════════════════════════════════════

_EDGE_WEIGHT: dict[str, str] = {
    "family_links": "strong",
    "public_links": "strong",
    "professional_links": "medium",
    "allocation": "medium",
    "allocation_winner": "medium",
    "bid_participation": "weak",
}


def _mad_amount(value: Any) -> str:
    if value is None:
        return "N/A"
    try:
        return f"{float(value):,.0f} MAD".replace(",", " ")
    except (TypeError, ValueError):
        return "N/A"


def _parse_date(d: Any) -> date | None:
    if not d:
        return None
    try:
        return date.fromisoformat(str(d)[:10])
    except (ValueError, TypeError):
        return None


def _detect_family_conflict(
    G: nx.DiGraph,
    suspect_nodes: set[str],
    suspect_tenders: set[str],
) -> None:
    """Detect direct and indirect family conflicts of interest [Scenarios A & B].

    For each tender: if the presiding official (ordonnateur / président_commission)
    of the awarding agency has a family link to a person at the winning company,
    flag all four nodes (official, family_member, company, tender) as suspect.
    """
    for tender_id, tdata in G.nodes(data=True):
        if tdata.get("node_type") != "tender":
            continue

        winning = [
            tgt for tgt in G.successors(tender_id)
            if G[tender_id][tgt].get("edge_type") == "allocation_winner"
        ]
        if not winning:
            continue
        company_id = winning[0]

        agencies = [
            src for src in G.predecessors(tender_id)
            if G[src][tender_id].get("edge_type") == "allocation"
        ]
        if not agencies:
            continue
        agency_id = agencies[0]

        officials = [
            src for src in G.predecessors(agency_id)
            if G[src][agency_id].get("edge_type") == "public_links"
            and G[src][agency_id].get("label") in ("president_commission", "ordonnateur")
        ]

        company_persons = [
            src for src in G.predecessors(company_id)
            if G[src][company_id].get("edge_type") == "professional_links"
        ]

        for official in officials:
            for cp in company_persons:
                has_family = (
                    G.has_edge(official, cp)
                    and G[official][cp].get("edge_type") == "family_links"
                ) or (
                    G.has_edge(cp, official)
                    and G[cp][official].get("edge_type") == "family_links"
                )
                if has_family:
                    suspect_nodes |= {tender_id, official, cp, company_id}
                    suspect_tenders.add(tender_id)


def _detect_collusion_rotation(
    G: nx.DiGraph,
    suspect_nodes: set[str],
    suspect_tenders: set[str],
) -> None:
    """Detect bid-rotation collusion rings [Scenario C].

    Companies that always appear together as bidders on the same tenders
    (≥3 bidders, co-appearing on ≥2 tenders) form a suspect cartel.
    """
    tender_bidders: dict[str, set[str]] = defaultdict(set)
    for company_id, tender_id, edata in G.edges(data=True):
        if edata.get("edge_type") == "bid_participation":
            tender_bidders[tender_id].add(company_id)

    multi_tender = {t for t, comps in tender_bidders.items() if len(comps) >= 3}

    co_bid_count: dict[tuple[str, str], int] = defaultdict(int)
    for tender_id in multi_tender:
        companies = sorted(tender_bidders[tender_id])
        for i in range(len(companies)):
            for j in range(i + 1, len(companies)):
                co_bid_count[(companies[i], companies[j])] += 1

    for (comp_a, comp_b), count in co_bid_count.items():
        if count >= 2:
            suspect_nodes |= {comp_a, comp_b}
            for tender_id in multi_tender:
                if comp_a in tender_bidders[tender_id] and comp_b in tender_bidders[tender_id]:
                    suspect_nodes.add(tender_id)
                    suspect_tenders.add(tender_id)


def _detect_pantouflage(
    G: nx.DiGraph,
    suspect_nodes: set[str],
    suspect_tenders: set[str],
) -> None:
    """Detect pantouflage (revolving-door) [Scenario D].

    A public official leaves their post (public_link.until) and joins a private
    company (professional_link.since) within 36 months. If that company then wins
    a tender from the same agency, it is flagged as suspect.
    """
    PANTOUFLAGE_MONTHS = 36

    for person_id, pdata in G.nodes(data=True):
        if pdata.get("node_type") != "person":
            continue

        past_agencies: list[tuple[str, date]] = []
        for _, agency_id, edata in G.out_edges(person_id, data=True):
            if edata.get("edge_type") == "public_links":
                left = _parse_date(edata.get("until"))
                if left:
                    past_agencies.append((agency_id, left))

        if not past_agencies:
            continue

        private_companies: list[tuple[str, date]] = []
        for _, company_id, edata in G.out_edges(person_id, data=True):
            if edata.get("edge_type") == "professional_links":
                joined = _parse_date(edata.get("since"))
                if joined:
                    private_companies.append((company_id, joined))

        if not private_companies:
            continue

        for agency_id, left_date in past_agencies:
            for company_id, joined_date in private_companies:
                if joined_date < left_date:
                    continue
                months_gap = (
                    (joined_date.year - left_date.year) * 12
                    + (joined_date.month - left_date.month)
                )
                if months_gap > PANTOUFLAGE_MONTHS:
                    continue

                # Check if this company won a tender from that same agency
                for pred in G.predecessors(company_id):
                    edge = G.get_edge_data(pred, company_id, default={})
                    if edge.get("edge_type") != "allocation_winner":
                        continue
                    tender_id = pred
                    awarding = [
                        src for src in G.predecessors(tender_id)
                        if G[src][tender_id].get("edge_type") == "allocation"
                    ]
                    if agency_id in awarding:
                        suspect_nodes |= {person_id, company_id, tender_id}
                        suspect_tenders.add(tender_id)


def _detect_fractionnement(
    suspect_nodes: set[str],
    suspect_tenders: set[str],
    raw_tenders: list[dict],
) -> None:
    """Detect contract splitting below the open-tender threshold [Scenario E].

    If the same company wins ≥3 bons de commande from the same agency,
    each below 1 000 000 MAD, those contracts are flagged as suspect.
    """
    THRESHOLD_MAD = 1_000_000
    MIN_COUNT = 3

    groups: dict[tuple[str, str], list[str]] = defaultdict(list)
    for t in raw_tenders:
        if (
            t.get("type") == "bon_de_commande"
            and t.get("awarded_value_mad") is not None
            and float(t["awarded_value_mad"]) < THRESHOLD_MAD
            and t.get("winning_company_id")
            and t.get("agency_id")
        ):
            key = (str(t["agency_id"]), str(t["winning_company_id"]))
            groups[key].append(str(t["id"]))

    for (_, company_id), tender_ids in groups.items():
        if len(tender_ids) >= MIN_COUNT:
            suspect_nodes.add(company_id)
            for tid in tender_ids:
                suspect_nodes.add(tid)
                suspect_tenders.add(tid)


def _detect_single_bidder(
    suspect_nodes: set[str],
    suspect_tenders: set[str],
    raw_tenders: list[dict],
) -> None:
    """Flag open tenders that received only a single bid (marché fictif signal)."""
    for t in raw_tenders:
        if t.get("single_bidder") and t.get("type") == "appel_offres_ouvert":
            tid = str(t["id"])
            suspect_nodes.add(tid)
            suspect_tenders.add(tid)


def _contract_status_from_tender(t: dict, tid: str, suspect_tenders: set[str]) -> str:
    db_status = t.get("status", "")
    if db_status in ("annule", "resilie", "contentieux"):
        return "rejete"
    if tid in suspect_tenders:
        return "suspect"
    return "sain"


def _tender_risk_score(t: dict, tid: str, suspect_tenders: set[str]) -> int:
    score = 50 if tid in suspect_tenders else 0
    if t.get("single_bidder"):
        score += 20
    if t.get("fractionnement_flag"):
        score += 15
    return min(100, score)


async def analyze_from_supabase() -> AnalyzeResponse:
    """Build fraud graph from real Supabase data and run all 5 detection algorithms."""
    from services.graph_loader import load_graph_from_supabase  # local to avoid circular import at module load

    G, raw_nodes, raw_edges, raw_tenders = await load_graph_from_supabase()

    suspect_nodes: set[str] = set()
    suspect_tenders: set[str] = set()

    _detect_family_conflict(G, suspect_nodes, suspect_tenders)
    _detect_collusion_rotation(G, suspect_nodes, suspect_tenders)
    _detect_pantouflage(G, suspect_nodes, suspect_tenders)
    _detect_fractionnement(suspect_nodes, suspect_tenders, raw_tenders)
    _detect_single_bidder(suspect_nodes, suspect_tenders, raw_tenders)

    api_nodes: list[GraphNode] = []
    for n in raw_nodes:
        nid = str(n["id"])
        is_suspect = nid in suspect_nodes or n.get("inpplc_risk_level") == "high"
        inpplc = {"risk_level": n["inpplc_risk_level"]} if n.get("inpplc_risk_level") else None
        api_nodes.append(
            GraphNode(
                id=nid,
                label=n.get("label") or nid,
                type=n.get("node_type", "company"),
                isSuspect=is_suspect,
                inpplc=inpplc,
            )
        )

    api_edges: list[GraphEdge] = [
        GraphEdge(
            source=str(e["source_id"]),
            target=str(e["target_id"]),
            weight=_EDGE_WEIGHT.get(e.get("edge_type", ""), "weak"),
            relation=e.get("label"),
        )
        for e in raw_edges
    ]

    api_contracts: list[ContractSummary] = []
    for t in raw_tenders:
        tid = str(t["id"])
        vendor = (t.get("companies") or {}).get("name") or "—"
        status = _contract_status_from_tender(t, tid, suspect_tenders)
        score = _tender_risk_score(t, tid, suspect_tenders)
        api_contracts.append(
            ContractSummary(
                id=t.get("reference_dossier") or tid,
                title=t.get("title") or tid,
                vendor=vendor,
                amount=_mad_amount(t.get("awarded_value_mad")),
                date=str(t.get("date_attribution") or ""),
                status=status,
                riskScore=score,
            )
        )

    suspect_count = sum(1 for n in api_nodes if n.isSuspect)
    return AnalyzeResponse(
        nodes=api_nodes,
        edges=api_edges,
        contracts=api_contracts,
        stats={
            "total_nodes": len(api_nodes),
            "total_edges": len(api_edges),
            "suspect_nodes": suspect_count,
            "contracts_analyzed": len(api_contracts),
            "suspect_contracts": sum(1 for c in api_contracts if c.status == "suspect"),
        },
        source="supabase",
    )
