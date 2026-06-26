import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from jose import jwt
from passlib.context import CryptContext

from database import get_supabase_client, is_supabase_configured
from models.reports import ReportCreate, ReportResponse

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "nazaha-graph-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30

_in_memory_reports: list[dict] = []


def _hash_sensitive(value: str) -> str:
    return pwd_context.hash(value)


def _create_anonymous_token(report_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {"sub": report_id, "type": "anonymous_report", "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.post("/reports", response_model=ReportResponse)
async def create_report(report: ReportCreate) -> ReportResponse:
    report_id = str(uuid.uuid4())
    record: dict = {
        "id": report_id,
        "title": report.title,
        "description": report.description,
        "urgency": report.urgency,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_anonymous": True,
    }

    if report.anonymous_identifier:
        record["anonymous_identifier_hash"] = _hash_sensitive(report.anonymous_identifier)

    if report.anonymous_password:
        record["anonymous_password_hash"] = _hash_sensitive(report.anonymous_password)

    anonymous_token = None
    if report.anonymous_identifier and report.anonymous_password:
        anonymous_token = _create_anonymous_token(report_id)
        record["anonymous_token"] = anonymous_token

    client = get_supabase_client()
    if client:
        try:
            insert_payload = {k: v for k, v in record.items() if not k.endswith("_hash") or v}
            client.table("reports").insert(insert_payload).execute()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Erreur Supabase: {exc}") from exc
    else:
        _in_memory_reports.append(record)

    return ReportResponse(
        id=report_id,
        title=report.title,
        status="pending",
        anonymous_token=anonymous_token,
        message="Signalement enregistré anonymement. Conservez votre jeton pour le suivi.",
    )


@router.get("/reports/history")
async def list_anonymous_reports():
    client = get_supabase_client()
    if client:
        try:
            response = (
                client.table("reports")
                .select("id, title, status, created_at")
                .order("created_at", desc=True)
                .limit(20)
                .execute()
            )
            return {"reports": response.data or [], "source": "supabase"}
        except Exception:
            pass

    return {
        "reports": [
            {
                "id": r["id"],
                "title": r["title"],
                "status": r["status"],
                "submittedDate": r["created_at"][:10],
            }
            for r in _in_memory_reports
        ],
        "source": "memory" if not is_supabase_configured() else "supabase",
    }
