import asyncio

import networkx as nx

from database import get_supabase_client


async def load_graph_from_supabase() -> tuple[nx.DiGraph, list[dict], list[dict], list[dict]]:
    """Load graph_nodes view, graph_edges view, and raw tenders from Supabase.

    Returns (G, raw_nodes, raw_edges, raw_tenders).
    G is a directed NetworkX graph keyed by string node IDs (UUIDs).
    Edge attributes mirror the graph_edges view columns: edge_type, label, is_active, since, until.
    """
    client = get_supabase_client()
    if client is None:
        raise RuntimeError("Supabase client not configured")

    def _fetch() -> tuple[list[dict], list[dict], list[dict]]:
        nodes = client.table("graph_nodes").select("*").execute().data or []
        edges = client.table("graph_edges").select("*").execute().data or []
        tenders = (
            client.table("tenders")
            .select(
                "id, reference_dossier, title, type, agency_id, awarded_value_mad, "
                "date_attribution, status, fraud_score, single_bidder, "
                "fractionnement_flag, winning_company_id, companies(name)"
            )
            .execute()
            .data
            or []
        )
        return nodes, edges, tenders

    raw_nodes, raw_edges, raw_tenders = await asyncio.to_thread(_fetch)

    G: nx.DiGraph = nx.DiGraph()

    for n in raw_nodes:
        G.add_node(str(n["id"]), **{k: v for k, v in n.items() if k != "id"})

    for e in raw_edges:
        src = str(e["source_id"])
        tgt = str(e["target_id"])
        attrs = {k: v for k, v in e.items() if k not in ("source_id", "target_id")}
        G.add_edge(src, tgt, **attrs)

    return G, raw_nodes, raw_edges, raw_tenders
