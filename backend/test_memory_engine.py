from memory_engine import MemoryEngine

engine = MemoryEngine(mode="hindsight")
with engine.memory:
    # ============================================================
    # 1. RECORD DECISION
    # ============================================================
    
    decision = {
        "decision_id": "DEC-TEST-001",
        "title": "Use asynchronous processing",
        "context": "The application is beginning to receive a large number of events.",
        "problem": "Synchronous processing may become a bottleneck.",
        "chosen_option": "Background workers with asynchronous processing",
        "rationale": "Long-running work should not block HTTP requests.",
        "assumptions": [
            "Event volume will continue increasing",
            "Background processing is acceptable",
        ],
        "alternatives": [
            "Continue synchronous processing",
            "Increase synchronous server capacity",
        ],
        "constraints": [
            "Limited infrastructure budget",
        ],
        "expected_outcome": "Improved API responsiveness",
        "status": "proposed",
    }
    
    
    print("\n=== 1. RECORD DECISION ===")
    
    result = engine.record_decision(decision)
    
    print(result)
    
    
    # ============================================================
    # 2. ANALYZE NEW PROPOSAL
    # ============================================================
    
    proposal = {
        "title": "Move event processing to background workers",
        "context": (
            "Event volume has increased and some operations "
            "are taking several seconds."
        ),
        "proposal": (
            "Use asynchronous processing with background workers "
            "to prevent long-running operations from blocking requests."
        ),
    }
    
    
    print("\n=== 2. ANALYZE PROPOSAL ===")
    
    analysis = engine.analyze_proposal(proposal)
    
    print("Status:", analysis["status"])
    
    print("\nHistorical decisions:")
    
    for decision in analysis["historical_decisions"]:
        print(decision)
    
    
    # ============================================================
    # 3. RECORD OUTCOME
    # ============================================================
    
    outcome = {
        "decision_id": "DEC-TEST-001",
        "observed_at": "2026-10-15",
        "outcome": "API response times improved after moving long-running work.",
        "observations": [
            "Background workers processed long-running operations successfully",
            "Infrastructure complexity increased",
        ],
        "lessons": [
            "Asynchronous processing is useful when operations become long-running",
        ],
    }
    
    
    print("\n=== 3. RECORD OUTCOME ===")
    
    outcome_result = engine.record_outcome(outcome)
    
    print(outcome_result)
