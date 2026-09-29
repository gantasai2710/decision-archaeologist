"""Unit tests for HindsightAdapter using a stubbed hindsight client."""
import asyncio
from types import SimpleNamespace as NS

import pytest

from hindsight_adapter import (
    HindsightAdapter, MemoryResponseError, MemoryTimeoutError, MemoryUnavailableError,
)


class StubClient:
    def __init__(self, **over):
        self.over = over

    async def aget_version(self):
        return self.over.get("version", NS(api_version="x"))

    async def aretain(self, **kw):
        return self.over.get("retain", NS(success=True))

    async def arecall(self, **kw):
        return self.over.get("recall", NS(results=[NS(id="1", text="t", type="world", context=None, document_id="DEC-1",
                                                       metadata={"decision_id": "DEC-1"}, tags=["decision"],
                                                       scores=NS(final=0.5))]))

    async def areflect(self, **kw):
        return self.over.get("reflect", NS(text="ok", structured_output={"a": 1},
                                           based_on=NS(memories=[NS(text="fact")])))

    async def aclose(self): ...


def make(**over):
    return HindsightAdapter("http://x", "bank", client=StubClient(**over), timeout=0.2, health_timeout=0.2)


def test_recall_normalizes():
    m = asyncio.run(make().recall("q"))
    assert m[0].score == 0.5 and m[0].metadata == {"decision_id": "DEC-1"}


def test_reflect_normalizes():
    r = asyncio.run(make().reflect("q"))
    assert r.text == "ok" and r.structured_output == {"a": 1} and r.supporting_facts == ["fact"]


def test_bad_recall_response():
    with pytest.raises(MemoryResponseError):
        asyncio.run(make(recall=NS()).recall("q"))


def test_retain_unsuccessful():
    with pytest.raises(MemoryResponseError):
        asyncio.run(make(retain=NS(success=False)).retain("c", context="c", document_id="d", metadata={}, tags=[]))


def test_connection_error_maps_to_unavailable():
    class Down(StubClient):
        async def arecall(self, **kw):
            raise ConnectionRefusedError("nope")

    a = HindsightAdapter("http://x", "b", client=Down())
    with pytest.raises(MemoryUnavailableError):
        asyncio.run(a.recall("q"))
    assert asyncio.run(HindsightAdapter("http://x", "b", client=type("D", (Down,), {"aget_version": Down.arecall})()).health_check()) is False


def test_timeout():
    class Slow(StubClient):
        async def areflect(self, **kw):
            await asyncio.sleep(1)

    with pytest.raises(MemoryTimeoutError):
        asyncio.run(HindsightAdapter("http://x", "b", client=Slow(), timeout=0.05).reflect("q"))
