from typing import Any, Literal

from pydantic import BaseModel, Field


class OCDSParty(BaseModel):
    id: str
    name: str | None = None
    roles: list[str] = Field(default_factory=list)


class OCDSTender(BaseModel):
    id: str
    title: str | None = None
    status: str | None = None


class OCDSAward(BaseModel):
    id: str
    title: str | None = None
    status: str | None = None
    value: dict[str, Any] | None = None
    suppliers: list[dict[str, str]] = Field(default_factory=list)


class OCDSContract(BaseModel):
    id: str
    awardID: str | None = None
    title: str | None = None
    status: str | None = None
    value: dict[str, Any] | None = None
    dateSigned: str | None = None


class OCDSRelease(BaseModel):
    ocid: str
    id: str
    date: str | None = None
    tag: list[str] = Field(default_factory=list)
    parties: list[OCDSParty] = Field(default_factory=list)
    tender: OCDSTender | None = None
    awards: list[OCDSAward] = Field(default_factory=list)
    contracts: list[OCDSContract] = Field(default_factory=list)


class OCDSReleasePackage(BaseModel):
    uri: str | None = None
    publishedDate: str | None = None
    releases: list[OCDSRelease] = Field(default_factory=list)
