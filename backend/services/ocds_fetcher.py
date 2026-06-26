import json
from typing import Any

from models.ocds import OCDSRelease, OCDSReleasePackage
from database import get_supabase_client, is_supabase_configured
from services.ocds_service import get_sample_ocds_data


async def fetch_ocds_from_supabase() -> tuple[OCDSReleasePackage, str]:
    client = get_supabase_client()
    if not client:
        return get_sample_ocds_data(), "sample"

    try:
        response = client.table("ocds_releases").select("*").execute()
        rows: list[dict[str, Any]] = response.data or []

        if not rows:
            return get_sample_ocds_data(), "sample"

        releases: list[OCDSRelease] = []
        for row in rows:
            payload = row.get("payload")
            if isinstance(payload, str):
                payload = json.loads(payload)
            if isinstance(payload, dict):
                if "releases" in payload:
                    for item in payload["releases"]:
                        releases.append(OCDSRelease.model_validate(item))
                else:
                    releases.append(OCDSRelease.model_validate(payload))
            elif isinstance(row, dict) and row.get("ocid"):
                releases.append(OCDSRelease.model_validate(row))

        if not releases:
            return get_sample_ocds_data(), "sample"

        return OCDSReleasePackage(releases=releases), "supabase"
    except Exception:
        return get_sample_ocds_data(), "sample"


async def get_ocds_package() -> tuple[OCDSReleasePackage, str]:
    if is_supabase_configured():
        return await fetch_ocds_from_supabase()
    return get_sample_ocds_data(), "sample"
