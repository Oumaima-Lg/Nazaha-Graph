from fastapi import APIRouter

from database import is_supabase_configured
from models.graph import AnalyzeResponse
from services.graph_analyzer import analyze_from_supabase, analyze_ocds_package
from services.ocds_fetcher import get_ocds_package

router = APIRouter()


@router.get("/analyze", response_model=AnalyzeResponse)
async def analyze_contracts() -> AnalyzeResponse:
    if is_supabase_configured():
        return await analyze_from_supabase()
    package, source = await get_ocds_package()
    return await analyze_ocds_package(package, source=source)


@router.get("/stats")
async def get_stats() -> dict:
    """Endpoint léger : retourne uniquement les statistiques sans les nœuds/arêtes complets."""
    if is_supabase_configured():
        result = await analyze_from_supabase()
    else:
        package, source = await get_ocds_package()
        result = await analyze_ocds_package(package, source=source)

    return {
        "stats": result.stats,
        "source": result.source,
        "suspect_contracts": sum(1 for c in result.contracts if c.status == "suspect"),
        "rejected_contracts": sum(1 for c in result.contracts if c.status == "rejete"),
    }
