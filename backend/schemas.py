"""Pydantic request/response models for the Decision Archaeologist API."""
from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Annotated, Any, Literal, Optional

from pydantic import BaseModel, Field, StringConstraints

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=8000)]
ShortStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
DecisionId = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=64, pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]*$"),
]


class DecisionStatus(str, Enum):
    proposed = "proposed"
    active = "active"
    deprecated = "deprecated"
    superseded = "superseded"


# ----------------------------------------------------------------- requests
class DecisionRequest(BaseModel):
    decision_id: DecisionId
    title: ShortStr
    context: NonEmptyStr
    problem: NonEmptyStr
    chosen_option: NonEmptyStr
    rationale: NonEmptyStr
    assumptions: list[NonEmptyStr] = Field(min_length=1)
    alternatives: list[NonEmptyStr] = Field(default_factory=list)
    constraints: list[NonEmptyStr] = Field(default_factory=list)
    expected_outcome: NonEmptyStr
    status: DecisionStatus
    supersedes: Optional[DecisionId] = None
    trigger: Optional[NonEmptyStr] = None
    proposal_title: Optional[ShortStr] = None


class AnalyzeRequest(BaseModel):
    title: ShortStr
    context: NonEmptyStr
    proposal: NonEmptyStr


class OutcomeRequest(BaseModel):
    decision_id: DecisionId
    observed_at: date
    outcome: NonEmptyStr
    observations: list[NonEmptyStr] = Field(default_factory=list)
    lessons: list[NonEmptyStr] = Field(default_factory=list)


class AskRequest(BaseModel):
    question: NonEmptyStr


# ---------------------------------------------------------------- responses
class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded"]
    memory: Literal["hindsight", "unavailable"]


class RetainAckResponse(BaseModel):
    success: bool
    decision_id: str
    memory_status: Literal["retained"]


class HistoricalDecision(BaseModel):
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    relevance_score: Optional[float] = None


class AssumptionAssessment(BaseModel):
    original_assumption: str
    current_condition: str
    assessment: Literal["changed", "unchanged", "uncertain"]
    explanation: str = ""


class AnalysisResult(BaseModel):
    historical_reasoning: str
    changed_conditions: list[str] = Field(default_factory=list)
    changed_assumptions: list[str] = Field(default_factory=list)
    assumption_assessments: list[AssumptionAssessment] = Field(default_factory=list)
    implications: list[str] = Field(default_factory=list)
    uncertainties: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)


class ProposalEcho(BaseModel):
    title: str
    context: str
    proposal: str


class AnalyzeResponse(BaseModel):
    # analyzed           -> recall + reflect both succeeded
    # recalled           -> recall succeeded, reflect failed (analysis is null)
    # no_relevant_memory -> recall returned nothing, so nothing was reflected on
    status: Literal["analyzed", "recalled", "no_relevant_memory"]
    proposal: ProposalEcho
    historical_decisions: list[HistoricalDecision] = Field(default_factory=list)
    analysis: Optional[AnalysisResult] = None
    message: Optional[str] = None


class AskResponse(BaseModel):
    answer: str
    related_decisions: list[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: str
    message: str
