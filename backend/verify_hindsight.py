"""One-shot check of your Hindsight Cloud setup: connection, RETAIN, RECALL, REFLECT.

Costs a handful of credits (1 retain, 1-3 cheap recalls, 1 reflect). Run it once after
filling in .env:   python verify_hindsight.py
"""
import asyncio
import os
import sys

from dotenv import load_dotenv

from hindsight_adapter import HindsightAdapter, MemoryServiceError

load_dotenv()

DEC_005 = (
    "Architectural decision DEC-005: Use synchronous processing\n"
    "Status: active\n"
    "Context: Small workload.\n"
    "Problem: Incoming events need to be processed.\n"
    "Chosen option: Process events synchronously inside the request\n"
    "Rationale (why this option was chosen): Small workload, simple implementation, easy debugging.\n"
    "Assumptions at the time of the decision:\n- Processing remains short\n- Request volume remains manageable\n"
    "Expected outcome: A simple system that is easy to debug"
)


async def main() -> int:
    if not os.getenv("HINDSIGHT_API_KEY"):
        print("HINDSIGHT_API_KEY is missing. Copy .env.example to .env and fill it in.")
        return 1
    adapter = HindsightAdapter(
        base_url=os.getenv("HINDSIGHT_URL", "https://api.hindsight.vectorize.io"),
        bank_id=os.getenv("HINDSIGHT_BANK_ID", "decision-arch"),
        api_key=os.environ["HINDSIGHT_API_KEY"],
        timeout=float(os.getenv("HINDSIGHT_TIMEOUT_SECONDS", "90")),
        recall_budget=os.getenv("HINDSIGHT_RECALL_BUDGET", "mid"),
        reflect_budget=os.getenv("HINDSIGHT_REFLECT_BUDGET", "low"),
    )
    try:
        print("1. connection ...", "ok" if await adapter.health_check() else "FAILED")

        await adapter.retain(
            DEC_005,
            context="Architectural decision record with rationale and assumptions",
            document_id="DEC-005",  # same id every run, so re-running updates instead of duplicating
            metadata={"kind": "decision", "decision_id": "DEC-005", "title": "Use synchronous processing", "status": "active"},
            tags=["decision", "decision:DEC-005", "status:active"],
        )
        print("2. RETAIN ... ok")

        memories = []
        for attempt in range(3):
            memories = await adapter.recall("Why did we choose synchronous processing?")
            if memories:
                break
            await asyncio.sleep(4)
        print(f"3. RECALL ... {'ok' if memories else 'returned nothing (memory may still be processing; rerun in a minute)'}")
        for m in memories[:3]:
            print("   -", m.text[:110].replace("\n", " "), "| score:", m.score)
        if not memories:
            return 1

        r = await adapter.reflect(
            "Event volume has increased significantly and some operations now take several seconds. "
            "Proposal: move processing to background workers. Compare this with the historical decision "
            "and its assumptions. Do not recommend a decision.",
            context="\n".join(m.text for m in memories),
        )
        print("4. REFLECT ... ok")
        print("   ", r.text[:600].replace("\n", " "))
        return 0
    except MemoryServiceError as exc:
        print(f"FAILED: {exc.code} during '{exc}'. Check HINDSIGHT_URL, HINDSIGHT_API_KEY and the bank id.")
        return 1
    finally:
        await adapter.close()


sys.exit(asyncio.run(main()))
