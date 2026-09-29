from hindsight_adapter import HindsightAdapter
from local_memory import LocalMemory


class MemoryEngine:
    """
    Main memory interface for Decision Archaeologist.

    Modes:

    hindsight
        Real persistent Hindsight memory.

    local
        Temporary local development memory.
    """

    def __init__(
        self,
        mode: str = "local",
        hindsight_url: str = "http://localhost:8888",
        bank_id: str = "decision-arch",
    ):
        self.mode = mode

        if mode == "hindsight":
            self.memory = HindsightAdapter(
                base_url=hindsight_url,
                bank_id=bank_id,
            )

        elif mode == "local":
            self.memory = LocalMemory()

        else:
            raise ValueError(
                f"Unknown memory mode: {mode}"
            )

    # ---------------------------------------------------------
    # RETAIN DECISION
    # ---------------------------------------------------------

    def retain_decision(self, decision: dict):

        content = self._decision_to_memory(decision)

        return self.memory.retain(
            content=content
        )

    # ---------------------------------------------------------
    # RETAIN OUTCOME
    # ---------------------------------------------------------

    def retain_outcome(self, outcome: dict):

        content = self._outcome_to_memory(outcome)

        return self.memory.retain(
            content=content
        )

    # ---------------------------------------------------------
    # RECALL
    # ---------------------------------------------------------

    def recall(self, query: str):

        return self.memory.recall(
            query=query
        )

    # ---------------------------------------------------------
    # REFLECT
    # ---------------------------------------------------------

    def reflect(self, query: str):

        return self.memory.reflect(
            query=query
        )

    # ---------------------------------------------------------
    # RECORD DECISION
    # ---------------------------------------------------------

    def record_decision(self, decision: dict):

        result = self.retain_decision(decision)

        if isinstance(result, dict):
            memory_status = result.get(
                "memory_status",
                "retained"
            )
        else:
            memory_status = "retained"

        return {
            "success": True,
            "decision_id": decision["decision_id"],
            "memory_status": memory_status
        }

    # ---------------------------------------------------------
    # ANALYZE PROPOSAL
    # ---------------------------------------------------------

    def analyze_proposal(self, proposal: dict):

        query = f"""
Find historical decisions relevant to this new proposal.

TITLE:
{proposal["title"]}

CONTEXT:
{proposal["context"]}

PROPOSAL:
{proposal["proposal"]}

Look for decisions involving similar problems, technologies,
constraints, assumptions, alternatives, or operational conditions.
"""

        recalled_memories = self.recall(query)

        historical_decisions = []

        for memory in recalled_memories:

            normalized = self._normalize_recall_result(
                memory
            )

            historical_decisions.append(normalized)

        reflection_query = f"""
Assess this architectural proposal against relevant historical decisions.

CURRENT PROPOSAL
Title: {proposal['title']}
Context: {proposal['context']}
Proposal: {proposal['proposal']}

RECALLED HISTORICAL EVIDENCE
{self._format_recalled_memories(historical_decisions)}

Use only the historical evidence and proposal above. Explain relevant prior
decisions, their rationale, assumptions, alternatives, and constraints; compare
current conditions with those assumptions and identify assumptions that may
have changed. Describe implications and remaining uncertainty, cite the
historical evidence, and leave the architectural decision to the human.
"""

        try:
            reflection = self.reflect(reflection_query)
            reflection_result = self._normalize_reflection_result(reflection)
            reflection_status = "completed"
        except Exception as exc:
            reflection_result = {
                "status": "unavailable",
                "message": f"Hindsight reflection failed: {exc}",
            }
            reflection_status = "unavailable"

        # Older adapter fakes and local implementations may report a failure
        # as a value instead of raising. Preserve that unavailable state.
        if isinstance(reflection_result, dict) and reflection_result.get("status") == "unavailable":
            reflection_status = "unavailable"

        return {
            "status": reflection_status,
            "proposal": proposal,
            "historical_decisions": historical_decisions,
            "reflection": reflection_result,
        }

    # ---------------------------------------------------------
    # RECORD OUTCOME
    # ---------------------------------------------------------

    def record_outcome(self, outcome: dict):

        result = self.retain_outcome(outcome)

        if isinstance(result, dict):
            memory_status = result.get(
                "memory_status",
                "retained"
            )
        else:
            memory_status = "retained"

        return {
            "success": True,
            "decision_id": outcome["decision_id"],
            "memory_status": memory_status
        }

    # ---------------------------------------------------------
    # NORMALIZE HINDSIGHT RECALL RESULT
    # ---------------------------------------------------------

    @staticmethod
    def _normalize_recall_result(memory):

        # LocalMemory returns dictionaries.
        if isinstance(memory, dict):

            return {
                "content": memory.get("content"),
                "metadata": memory.get(
                    "metadata",
                    {}
                ),
                "relevance_score": memory.get(
                    "score"
                )
            }

        # hindsight-client 0.10.1 RecallResult fields are text, metadata,
        # scores (RecallScores.final), plus identifiers and context fields.
        if hasattr(memory, "model_dump"):

            data = memory.model_dump()
            scores = data.get("scores") or {}

            return {
                "content": data.get("text"),
                "metadata": {
                    key: data.get(key)
                    for key in (
                        "id", "type", "entities", "context",
                        "occurred_start", "occurred_end", "mentioned_at",
                        "document_id", "metadata", "chunk_id", "tags",
                    )
                    if data.get(key) is not None
                },
                "relevance_score": scores.get("final"),
            }

        # Fallback for unexpected response objects.
        return {
            "content": str(memory),
            "metadata": {},
            "relevance_score": None
        }

    @staticmethod
    def _normalize_reflection_result(reflection):
        if isinstance(reflection, dict):
            data = reflection
        elif hasattr(reflection, "model_dump"):
            data = reflection.model_dump()
        else:
            return {"status": "completed", "text": str(reflection)}

        if data.get("success") is False or data.get("status") == "unavailable":
            return {
                "status": "unavailable",
                "message": data.get("message", "Hindsight reflection is unavailable."),
            }

        return {
            "status": "completed",
            "text": data.get("text"),
            "based_on": data.get("based_on"),
        }

    @staticmethod
    def _format_recalled_memories(memories):
        if not memories:
            return "No historical memories were recalled."
        return "\n\n".join(
            f"Memory {index}: {memory.get('content')}\n"
            f"Evidence metadata: {memory.get('metadata')}\n"
            f"Relevance score: {memory.get('relevance_score')}"
            for index, memory in enumerate(memories, start=1)
        )

    # ---------------------------------------------------------
    # FORMAT DECISION
    # ---------------------------------------------------------

    @staticmethod
    def _decision_to_memory(decision: dict):

        return f"""
DECISION ID: {decision["decision_id"]}

TITLE:
{decision["title"]}

CONTEXT:
{decision["context"]}

PROBLEM:
{decision["problem"]}

CHOSEN OPTION:
{decision["chosen_option"]}

RATIONALE:
{decision["rationale"]}

ASSUMPTIONS:
{MemoryEngine._format_list(
    decision.get("assumptions", [])
)}

ALTERNATIVES CONSIDERED:
{MemoryEngine._format_list(
    decision.get("alternatives", [])
)}

CONSTRAINTS:
{MemoryEngine._format_list(
    decision.get("constraints", [])
)}

EXPECTED OUTCOME:
{decision["expected_outcome"]}

STATUS:
{decision["status"]}
"""

    # ---------------------------------------------------------
    # FORMAT OUTCOME
    # ---------------------------------------------------------

    @staticmethod
    def _outcome_to_memory(outcome: dict):

        return f"""
OUTCOME FOR DECISION:
{outcome["decision_id"]}

OBSERVED AT:
{outcome["observed_at"]}

OUTCOME:
{outcome["outcome"]}

OBSERVATIONS:
{MemoryEngine._format_list(
    outcome.get("observations", [])
)}

LESSONS:
{MemoryEngine._format_list(
    outcome.get("lessons", [])
)}
"""

    # ---------------------------------------------------------
    # FORMAT LIST
    # ---------------------------------------------------------

    @staticmethod
    def _format_list(items: list):

        if not items:
            return "None"

        return "\n".join(
            f"- {item}"
            for item in items
        )
