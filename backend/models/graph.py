from typing import Any, Literal

from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    id: str
    label: str
    type: Literal["company", "person", "tender", "supplier", "agency"]
    isSuspect: bool = False
    inpplc: dict[str, Any] | None = None


class GraphEdge(BaseModel):
    source: str
    target: str
    weight: Literal["strong", "medium", "weak"]
    relation: str | None = None


class ContractSummary(BaseModel):
    id: str
    title: str
    vendor: str
    amount: str
    date: str
    status: Literal["sain", "suspect", "rejete"]
    riskScore: int


class AnalyzeResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    contracts: list[ContractSummary] = Field(default_factory=list)
    stats: dict[str, Any] = Field(default_factory=dict)
    source: str = "supabase"
