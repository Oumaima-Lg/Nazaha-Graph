"""Mock du service INPPLC (Instance Nationale de Probité, de Prévention et de Lutte contre la Corruption)."""

import asyncio
import hashlib
from typing import Any


MOCK_LEGAL_RECORDS: dict[str, dict[str, Any]] = {
    "company-a": {
        "company_id": "company-a",
        "legal_status": "active",
        "sanctions": [],
        "investigations": [{"case_id": "INP-2023-014", "status": "closed", "outcome": "warning"}],
        "risk_level": "medium",
    },
    "company-b": {
        "company_id": "company-b",
        "legal_status": "active",
        "sanctions": [{"type": "fine", "year": 2022, "amount_mad": 150000}],
        "investigations": [{"case_id": "INP-2024-002", "status": "ongoing", "outcome": None}],
        "risk_level": "high",
    },
    "company-c": {
        "company_id": "company-c",
        "legal_status": "active",
        "sanctions": [],
        "investigations": [{"case_id": "INP-2024-008", "status": "ongoing", "outcome": None}],
        "risk_level": "high",
    },
    "company-d": {
        "company_id": "company-d",
        "legal_status": "active",
        "sanctions": [],
        "investigations": [],
        "risk_level": "low",
    },
    "company-e": {
        "company_id": "company-e",
        "legal_status": "active",
        "sanctions": [],
        "investigations": [],
        "risk_level": "low",
    },
    "supplier-common": {
        "company_id": "supplier-common",
        "legal_status": "active",
        "sanctions": [{"type": "administrative", "year": 2021, "amount_mad": 50000}],
        "investigations": [{"case_id": "INP-2023-031", "status": "closed", "outcome": "sanction"}],
        "risk_level": "high",
    },
}


def _derive_risk_from_name(company_id: str) -> dict[str, Any]:
    digest = hashlib.md5(company_id.encode()).hexdigest()
    risk_score = int(digest[:2], 16) % 100
    risk_level = "high" if risk_score > 70 else "medium" if risk_score > 40 else "low"
    return {
        "company_id": company_id,
        "legal_status": "active",
        "sanctions": [],
        "investigations": [],
        "risk_level": risk_level,
    }


async def fetch_legal_history(company_id: str) -> dict[str, Any]:
    """Simule un appel HTTP vers l'API INPPLC avec latence réseau."""
    await asyncio.sleep(0.05)
    normalized = company_id.lower().replace(" ", "-")
    return MOCK_LEGAL_RECORDS.get(normalized, _derive_risk_from_name(normalized))


async def fetch_legal_histories(company_ids: list[str]) -> dict[str, dict[str, Any]]:
    results = await asyncio.gather(*(fetch_legal_history(cid) for cid in company_ids))
    return {company_id: record for company_id, record in zip(company_ids, results)}
