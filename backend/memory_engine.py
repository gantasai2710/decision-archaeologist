"""Application-level memory logic: turns API data into memories and back.

RETAIN  -> record_decision / record_outcome
RECALL  -> analyze_proposal / ask_question (step 1)
REFLECT -> analyze_proposal / ask_question (step 2)
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, time, timezone
from typing import Annotated, Any, Optional

from fastapi import Depends, Request

from hindsight_adapter import (
    HindsightAdapter,
    MemoryServiceError,
    RecalledMemory,
    ReflectionResult,
)
from local_memory import LocalMemory
from schemas import (
    AnalysisResult,
    AnalyzeRequest,
    AnalyzeResponse,
    AskRequest,
    AskResponse,
    AssumptionAssessment,
    DecisionRequest,
    HistoricalDecision,
    OutcomeRequest,
    ProposalEcho,
    RetainAckResponse,
)

logger = logging.getLogger("decision_archaeologist.engine")

BANK_MISSION = (
    "Organizational architectural memory: preserve architectural decisions with their "
    "rationale, assumptions, alternatives, constraints, expected outcomes, actual outcomes "
    "and lessons learned."
)

# Instructions that keep reflection on the "evidence, not verdicts" side of the line.
_BOUNDARY = (
    "Do NOT recommend or make the final architectural decision; the human architect decides. "
    "Use only what the recalled memories and the current proposal support, and say so when "
    "the memories do not cover something. Do not invent history."
)

ANALYSIS_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "historical_reasoning": {
            "type": "string",
            "description": "Why the relevant historical decision(s) made sense at the time.",
        },
        "changed_conditions": {"type": "array", "items": {"type": "string"}},
        "assumption_assessments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "original_assumption": {"type": "string"},
                    "current_condition": {"type": "string"},
                    "assessment": {"type": "string", "enum": ["changed", "unchanged", "uncertain"]},
                    "explanation": {"type": "string"},
                },
                "required": ["original_assumption", "current_condition", "assessment"],
            },
        },
        "changed_assumptions": {"type": "array", "items": {"type": "string"}},
        "implications": {"type": "array", "items": {"type": "string"}},
        "uncertainties": {"type": "array", "items": {"type": "string"}},
        "evidence": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "historical_reasoning",
        "changed_conditions",
        "changed_assumptions",
        "implications",
        "uncertainties",
        "evidence",
    ],
}


# ------------------------------------------------------- memory formatting
def _bullets(items: list[str]) -> str:
    return "\n".join(f"- {i}" for i in items) if items else "- None recorded"


def _decision_memory_text(d: DecisionRequest) -> str:
    return (
        f"Architectural decision {d.decision_id}: {d.title}\n"
        f"Status: {d.status.value}\n"
        f"Context: {d.context}\n"
        f"Problem: {d.problem}\n"
        f"Chosen option: {d.chosen_option}\n"
        f"Rationale (why this option was chosen): {d.rationale}\n"
        f"Assumptions at the time of the decision:\n{_bullets(d.assumptions)}\n"
        f"Alternatives considered:\n{_bullets(d.alternatives)}\n"
        f"Constraints:\n{_bullets(d.constraints)}\n"
        f"Expected outcome: {d.expected_outcome}"
        + (f"\nFollow-up to decision: {d.supersedes}\nTrigger: {d.trigger or 'Not recorded'}\nProposal title: {d.title}" if d.supersedes else "")
    )


def _outcome_memory_text(o: OutcomeRequest, title: Optional[str]) -> str:
    label = f"{o.decision_id} ({title})" if title else o.decision_id
    return (
        f"Observed outcome of architectural decision {label}, observed on {o.observed_at.isoformat()}\n"
        f"Actual outcome: {o.outcome}\n"
        f"Observations:\n{_bullets(o.observations)}\n"
        f"Lessons learned:\n{_bullets(o.lessons)}"
    )


def _format_memories(memories: list[RecalledMemory]) -> str:
    lines = []
    for i, m in enumerate(memories, 1):
        source = m.metadata.get("decision_id")
        prefix = f"[{i}] ({m.metadata.get('kind', 'memory')}{', ' + source if source else ''}) "
        lines.append(prefix + m.text.strip())
    return "\n".join(lines)


def _related_ids(memories: list[RecalledMemory]) -> list[str]:
    seen: dict[str, None] = {}
    for m in memories:
        candidates = [m.metadata.get("decision_id", "")]
        candidates += [t.split(":", 1)[1] for t in m.tags if t.startswith("decision:")]
        for c in candidates:
            if c:
                seen.setdefault(c)
    return list(seen)


def _to_historical(m: RecalledMemory) -> HistoricalDecision:
    meta: dict[str, Any] = dict(m.metadata)
    meta["memory_id"] = m.id
    if m.fact_type:
        meta["fact_type"] = m.fact_type
    if m.tags:
        meta["tags"] = m.tags
    return HistoricalDecision(
        content=m.text,
        metadata=meta,
        relevance_score=round(m.score, 4) if m.score is not None else None,
    )


def _str_list(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return []


def _build_analysis(r: ReflectionResult) -> AnalysisResult:
    """Normalize Hindsight's reflect output. Nothing is invented: missing pieces stay empty."""
    s = r.structured_output
    if not s:
        return AnalysisResult(historical_reasoning=r.text.strip(), evidence=r.supporting_facts[:5])

    assessments: list[AssumptionAssessment] = []
    for a in s.get("assumption_assessments") or []:
        if not isinstance(a, dict):
            continue
        verdict = str(a.get("assessment", "uncertain")).strip().lower()
        if verdict not in ("changed", "unchanged", "uncertain"):
            verdict = "uncertain"
        assessments.append(
            AssumptionAssessment(
                original_assumption=str(a.get("original_assumption", "")),
                current_condition=str(a.get("current_condition", "")),
                assessment=verdict,
                explanation=str(a.get("explanation", "")),
            )
        )

    changed = _str_list(s.get("changed_assumptions"))
    if not changed:  # derive from the model's own per-assumption verdicts
        changed = [a.original_assumption for a in assessments if a.assessment == "changed"]

    evidence = _str_list(s.get("evidence")) or r.supporting_facts[:5]
    return AnalysisResult(
        historical_reasoning=str(s.get("historical_reasoning") or r.text).strip(),
        changed_conditions=_str_list(s.get("changed_conditions")),
        changed_assumptions=changed,
        assumption_assessments=assessments,
        implications=_str_list(s.get("implications")),
        uncertainties=_str_list(s.get("uncertainties")),
        evidence=evidence,
    )


# ------------------------------------------------------------------ engine
class MemoryEngine:
    def __init__(self, adapter: HindsightAdapter, local: Optional[LocalMemory] = None) -> None:
        self._adapter = adapter
        self._local = local or LocalMemory()

    async def startup(self, auto_create_bank: bool = False) -> None:
        # Off by default: on Hindsight Cloud the bank already exists and its config is left alone.
        # Hindsight also creates a missing bank on first retain.
        if not auto_create_bank:
            return
        try:
            await self._adapter.ensure_bank(BANK_MISSION)
        except MemoryServiceError:
            logger.warning("Hindsight not reachable at startup; will retry on first request.")

    async def shutdown(self) -> None:
        await self._adapter.close()

    async def health_check(self) -> bool:
        return await self._adapter.health_check()

    # RETAIN ---------------------------------------------------------------
    async def record_decision(self, d: DecisionRequest) -> RetainAckResponse:
        metadata = {"kind": "decision", "decision_id": d.decision_id, "title": d.title, "status": d.status.value}
        tags = ["decision", f"decision:{d.decision_id}", f"status:{d.status.value}"]
        if d.supersedes:
            metadata.update({"supersedes": d.supersedes, "trigger": d.trigger or "", "proposal_title": d.title})
            tags.append(f"supersedes:{d.supersedes}")
        await self._adapter.retain(
            _decision_memory_text(d),
            context="Architectural decision record with rationale and assumptions",
            document_id=d.decision_id,  # re-recording the same id updates it
            metadata=metadata,
            tags=tags,
        )
        self._local.remember_title(d.decision_id, d.title)
        return RetainAckResponse(success=True, decision_id=d.decision_id, memory_status="retained")

    async def record_outcome(self, o: OutcomeRequest) -> RetainAckResponse:
        text = _outcome_memory_text(o, self._local.title_for(o.decision_id))
        digest = hashlib.sha1(text.encode()).hexdigest()[:8]
        await self._adapter.retain(
            text,
            context="Observed outcome and lessons learned for an architectural decision",
            document_id=f"{o.decision_id}:outcome:{o.observed_at.isoformat()}:{digest}",
            metadata={"kind": "outcome", "decision_id": o.decision_id, "observed_at": o.observed_at.isoformat()},
            tags=["outcome", f"decision:{o.decision_id}"],
            timestamp=datetime.combine(o.observed_at, time.min, tzinfo=timezone.utc),
        )
        return RetainAckResponse(success=True, decision_id=o.decision_id, memory_status="retained")

    # RECALL + REFLECT -----------------------------------------------------
    async def analyze_proposal(self, req: AnalyzeRequest) -> AnalyzeResponse:
        echo = ProposalEcho(title=req.title, context=req.context, proposal=req.proposal)
        recall_query = f"{req.title}. {req.context} Proposed approach: {req.proposal}"

        memories = await self._adapter.recall(recall_query)  # failure -> 503
        if not memories:
            return AnalyzeResponse(
                status="no_relevant_memory",
                proposal=echo,
                message="No relevant historical decisions were found in memory, so no analysis was produced.",
            )
        historical = [_to_historical(m) for m in memories]

        reflect_query = (
            "A software architect is considering a NEW architectural proposal. Compare it with the "
            "historical decisions and outcomes in memory.\n"
            f"Proposal title: {req.title}\nCurrent context: {req.context}\nProposal: {req.proposal}\n\n"
            "Explain: (1) why the relevant historical decisions made sense when they were made, "
            "(2) what has changed since then, (3) for each historical assumption, compare it with the "
            "current conditions and say whether it changed, is unchanged, or is uncertain, "
            "(4) the implications of those changes, (5) remaining uncertainties, and (6) the evidence "
            f"from history you relied on. {_BOUNDARY}"
        )
        try:
            reflection = await self._adapter.reflect(
                reflect_query, context=_format_memories(memories), response_schema=ANALYSIS_SCHEMA
            )
        except MemoryServiceError:
            logger.warning("Reflect failed during analyze; returning recalled memories only.")
            return AnalyzeResponse(
                status="recalled",
                proposal=echo,
                historical_decisions=historical,
                analysis=None,
                message="Historical memories were recalled, but reflection was unavailable, so no analysis was produced.",
            )
        return AnalyzeResponse(
            status="analyzed", proposal=echo, historical_decisions=historical, analysis=_build_analysis(reflection)
        )

    async def ask_question(self, req: AskRequest) -> AskResponse:
        memories = await self._adapter.recall(req.question)
        if not memories:
            return AskResponse(
                answer="No relevant decision history was found in memory for this question.", related_decisions=[]
            )
        reflection = await self._adapter.reflect(
            "Answer this question about the organization's architectural decision history, using only "
            "what memory contains. If memory does not contain the answer, say so. "
            f"{_BOUNDARY}\nQuestion: {req.question}",
            context=_format_memories(memories),
        )
        return AskResponse(answer=reflection.text.strip(), related_decisions=_related_ids(memories))


def get_engine(request: Request) -> MemoryEngine:
    return request.app.state.engine


EngineDep = Annotated[MemoryEngine, Depends(get_engine)]
