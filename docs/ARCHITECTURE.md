\# Decision Archaeologist — Architecture



\## Purpose



Decision Archaeologist is an AI agent with persistent organizational

memory for technical and business decisions.



The system remembers decisions, reasoning, assumptions, alternatives,

and outcomes. When a new decision is proposed, it retrieves relevant

past experiences and reasons about how the previous assumptions relate

to the current situation.



\## Core Components



\### Frontend

Web application used by the user to:



\- Record decisions

\- Submit new proposals

\- View historical decision analysis

\- Record outcomes

\- Ask questions about decision history



\### Backend

API layer between the frontend and Hindsight.



Responsibilities:



\- Receive requests from the frontend

\- Validate input

\- Orchestrate Hindsight operations

\- Prepare structured responses

\- Handle errors



\### Hindsight

Persistent memory layer.



Core operations:



\- RETAIN — store experiences and decisions

\- RECALL — retrieve relevant historical memories

\- REFLECT — reason over relevant memories



\### Hindsight Cloud

The hosted Hindsight service provides persistent decision memory and its RETAIN, RECALL, and REFLECT operations. The application does not configure a separate model provider.



\## Core Memory Loop



Decision

&#x20;   ↓

RETAIN

&#x20;   ↓

Persistent Hindsight Memory

&#x20;   ↓

RECALL

&#x20;   ↓

Relevant Historical Experience

&#x20;   ↓

REFLECT

&#x20;   ↓

Current Decision Analysis

&#x20;   ↓

Human Decision

&#x20;   ↓

RETAIN

&#x20;   ↓

New Experience



\## Main Workflow



New Proposal

&#x20;   ↓

Backend

&#x20;   ↓

Hindsight RECALL

&#x20;   ↓

Relevant Historical Decisions

&#x20;   ↓

Hindsight REFLECT

&#x20;   ↓

Assumption / Context Analysis

&#x20;   ↓

User Makes Decision

&#x20;   ↓

Hindsight RETAIN



\## API



POST /api/decisions

POST /api/analyze

POST /api/outcomes

POST /api/ask

GET  /api/health

