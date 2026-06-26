from typing import Literal

from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(default="", max_length=5000)
    urgency: Literal["low", "medium", "high"] = "medium"
    anonymous_identifier: str | None = Field(
        default=None,
        description="Identifiant anonyme optionnel pour le suivi (sera haché)",
    )
    anonymous_password: str | None = Field(
        default=None,
        description="Mot de passe optionnel pour consulter le signalement (sera haché)",
    )


class ReportResponse(BaseModel):
    id: str
    title: str
    status: str
    anonymous_token: str | None = None
    message: str
