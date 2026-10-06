"""Direct Hindsight integration (the only file that imports hindsight_client).

Verified against hindsight-client 0.10.1: Hindsight.aretain / arecall / areflect /
aget_version / acreate_bank / aclose.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from hindsight_client import Hindsight

logger = logging.getLogger("decision_archaeologist.hindsight")


# --------------------------------------------------------------- exceptions
class MemoryServiceError(Exception):
    """Base error for anything that goes wrong talking to Hindsight."""

    code = "MEMORY_SERVICE_UNAVAILABLE"
    public_message = "Hindsight memory service is unavailable."


class MemoryUnavailableError(MemoryServiceError):
    pass


class MemoryTimeoutError(MemoryServiceError):
    public_message = "Hindsight memory service timed out."


class MemoryResponseError(MemoryServiceError):
    code = "MEMORY_SERVICE_INVALID_RESPONSE"
    public_message = "Hindsight memory service returned an unexpected response."


# ------------------------------------------------------------ result types
@dataclass
class RecalledMemory:
    id: str
    text: str
    fact_type: Optional[str] = None
    context: Optional[str] = None
    document_id: Optional[str] = None
    metadata: dict[str, str] = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)
    score: Optional[float] = None


@dataclass
class ReflectionResult:
    text: str
    structured_output: Optional[dict[str, Any]] = None
    supporting_facts: list[str] = field(default_factory=list)


# ------------------------------------------------------------------ adapter
class HindsightAdapter:
    def __init__(
        self,
        base_url: str,
        bank_id: str,
        api_key: Optional[str] = None,
        timeout: float = 240.0,
        health_timeout: float = 5.0,
        recall_budget: str = "mid",
        reflect_budget: str = "low",
        client: Optional[Hindsight] = None,
    ) -> None:
        self.bank_id = bank_id
        self._recall_budget = recall_budget
        self._reflect_budget = reflect_budget
        self._timeout = timeout
        self._health_timeout = health_timeout
        # api_key is sent as a Bearer token (Hindsight Cloud). max_attempts=1: fail fast and
        # never silently repeat a paid recall/reflect call.
        self._client = client or Hindsight(
            base_url=base_url, api_key=api_key, timeout=timeout, max_attempts=1
        )

    async def _call(self, op: str, coro: Any, timeout: float) -> Any:
        try:
            return await asyncio.wait_for(coro, timeout)
        except asyncio.TimeoutError as exc:
            logger.warning("Hindsight %s timed out after %.0fs", op, timeout)
            raise MemoryTimeoutError(op) from exc
        except MemoryServiceError:
            raise
        except Exception as exc:  # connection refused, HTTP errors, etc.
            logger.warning(
                "Hindsight %s failed: %s (status=%s)", op, type(exc).__name__, getattr(exc, "status", None)
            )
            raise MemoryUnavailableError(op) from exc

    async def ensure_bank(self, mission: Optional[str] = None) -> None:
        """Best-effort bank setup. Hindsight also creates banks on first retain."""
        await self._call(
            "create_bank",
            self._client.acreate_bank(bank_id=self.bank_id, mission=mission),
            self._health_timeout * 3,
        )

    async def health_check(self) -> bool:
        try:
            await self._call("health", self._client.aget_version(), self._health_timeout)
            return True
        except MemoryServiceError:
            return False

    async def retain(
        self,
        content: str,
        *,
        context: str,
        document_id: str,
        metadata: dict[str, str],
        tags: list[str],
        timestamp: Optional[datetime] = None,
    ) -> None:
        resp = await self._call(
            "retain",
            self._client.aretain(
                bank_id=self.bank_id,
                content=content,
                context=context,
                document_id=document_id,
                metadata=metadata,
                tags=tags,
                timestamp=timestamp,
            ),
            self._timeout,
        )
        if not getattr(resp, "success", False):
            raise MemoryResponseError("retain")

    async def recall(self, query: str, *, max_tokens: int = 4096) -> list[RecalledMemory]:
        resp = await self._call(
            "recall",
            self._client.arecall(bank_id=self.bank_id, query=query, max_tokens=max_tokens, budget=self._recall_budget),
            self._timeout,
        )
        results = getattr(resp, "results", None)
        if results is None:
            raise MemoryResponseError("recall")
        memories: list[RecalledMemory] = []
        for r in results:
            scores = getattr(r, "scores", None)
            final = getattr(scores, "final", None) if scores is not None else None
            memories.append(
                RecalledMemory(
                    id=str(getattr(r, "id", "")),
                    text=getattr(r, "text", "") or "",
                    fact_type=getattr(r, "type", None),
                    context=getattr(r, "context", None),
                    document_id=getattr(r, "document_id", None),
                    metadata=dict(getattr(r, "metadata", None) or {}),
                    tags=list(getattr(r, "tags", None) or []),
                    score=float(final) if final is not None else None,
                )
            )
        return memories

    async def reflect(
        self, query: str, *, context: Optional[str] = None, response_schema: Optional[dict[str, Any]] = None
    ) -> ReflectionResult:
        resp = await self._call(
            "reflect",
            self._client.areflect(
                bank_id=self.bank_id,
                query=query,
                context=context,
                budget=self._reflect_budget,
                response_schema=response_schema,
                include_facts=True,
            ),
            self._timeout,
        )
        text = getattr(resp, "text", None)
        if text is None:
            raise MemoryResponseError("reflect")
        based_on = getattr(resp, "based_on", None)
        facts = [f.text for f in (getattr(based_on, "memories", None) or []) if getattr(f, "text", None)]
        structured = getattr(resp, "structured_output", None)
        return ReflectionResult(
            text=text,
            structured_output=structured if isinstance(structured, dict) else None,
            supporting_facts=facts,
        )

    async def close(self) -> None:
        try:
            await self._client.aclose()
        except Exception:  # shutdown noise is not worth surfacing
            logger.debug("Hindsight client close failed", exc_info=False)
