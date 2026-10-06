GET /api/health



&#x09;



Check service status



&#x09;



Health check



For the MVP, all decisions belong to one organizational memory bank: decision-arch.



2\. Define the request and response formats



Create a new document:



notepad docs\\API\_CONTRACT.md



Copy the following contract into it.



A. Record a decision



POST /api/decisions



Request



{

&#x20; "decision\_id": "DEC-006",

&#x20; "title": "Introduce asynchronous processing",

&#x20; "context": "The application now handles millions of events.",

&#x20; "problem": "Synchronous requests are becoming slow.",

&#x20; "chosen\_option": "Background workers and a message queue",

&#x20; "rationale": "Separate long-running work from HTTP requests.",

&#x20; "assumptions": \[

&#x20;   "Event volume will continue growing",

&#x20;   "Background processing is acceptable"

&#x20; ],

&#x20; "alternatives": \[

&#x20;   "Continue synchronous processing"

&#x20; ],

&#x20; "constraints": \[

&#x20;   "Limited infrastructure budget"

&#x20; ],

&#x20; "expected\_outcome": "Faster API responses",

&#x20; "status": "proposed"

}



Response



{

&#x20; "success": true,

&#x20; "decision\_id": "DEC-006",

&#x20; "memory\_status": "retained"

}



The backend must only return retained after Hindsight confirms successful storage.



B. Analyze a new proposal



POST /api/analyze



Request



{

&#x20; "title": "Introduce asynchronous processing",

&#x20; "context": "Event volume has increased significantly.",

&#x20; "proposal": "Use a message queue and background workers."

}



Response



{

&#x20; "proposal": {

&#x20;   "title": "Introduce asynchronous processing"

&#x20; },

&#x20; "historical\_decisions": \[

&#x20;   {

&#x20;     "decision\_id": "DEC-005",

&#x20;     "summary": "Synchronous processing was selected for small workloads."

&#x20;   }

&#x20; ],

&#x20; "analysis": {

&#x20;   "historical\_reasoning": "The original workload was small.",

&#x20;   "assumption\_changes": \[

&#x20;     {

&#x20;       "assumption": "Request volume remains manageable",

&#x20;       "assessment": "potentially\_changed",

&#x20;       "explanation": "The new proposal describes significantly increased event volume."

&#x20;     }

&#x20;   ],

&#x20;   "tradeoffs": \[

&#x20;     "Additional infrastructure complexity"

&#x20;   ],

&#x20;   "uncertainties": \[

&#x20;     "Actual throughput requirements have not been measured."

&#x20;   ]

&#x20; }

}



This is an illustrative response, not a verified result from Hindsight. The backend should derive its analysis from recalled memories and reflection rather than hardcoded text.



C. Record an outcome



POST /api/outcomes



Request



{

&#x20; "decision\_id": "DEC-006",

&#x20; "observed\_at": "2026-10-15",

&#x20; "outcome": "Average API response time decreased.",

&#x20; "observations": \[

&#x20;   "Background jobs process events successfully",

&#x20;   "Infrastructure costs increased"

&#x20; ],

&#x20; "lessons": \[

&#x20;   "Asynchronous processing helps with long-running tasks"

&#x20; ]

}



Response



{

&#x20; "success": true,

&#x20; "decision\_id": "DEC-006",

&#x20; "memory\_status": "retained"

}



Outcomes must become new memories. They should not overwrite the original decision because we want to preserve its history.



D. Ask about decision history



POST /api/ask



Request



{

&#x20; "question": "Why did we originally choose synchronous processing?"

}



Response



{

&#x20; "answer": "The team originally selected synchronous processing because...",

&#x20; "related\_decisions": \[

&#x20;   {

&#x20;     "decision\_id": "DEC-005",

&#x20;     "summary": "Process requests synchronously"

&#x20;   }

&#x20; ]

}



The answer must come from Hindsight's recalled memories and reflection. When evidence is insufficient, the response should communicate that uncertainty.



E. Health check



GET /api/health



Response



{

&#x20; "status": "healthy",

&#x20; "hindsight": "connected"

}



The backend must actually verify Hindsight connectivity before reporting it as connected.



3\. Important implementation rules

Our MVP rules



Hindsight is the persistent memory system, not an optional search feature.



The frontend communicates only with FastAPI.



The backend orchestrates RETAIN, RECALL and REFLECT.



Every analysis must use actual retrieved memories.



Preserve historical decisions when recording subsequent outcomes.



Return meaningful errors if Hindsight Cloud is unavailable.



Do not automatically approve or reject technical proposals; provide evidence for the human decision-maker.



The backend links outcomes to decisions with Hindsight document metadata and tags. Hindsight Cloud is the persistent memory service.

