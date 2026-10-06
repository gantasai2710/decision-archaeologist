// All backend communication lives here. Components never call fetch() directly.
// The frontend only talks to FastAPI, never to Hindsight Cloud or its provider.
import * as mock from './mockApi.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const DECISION_INDEX_KEY = 'da-real-decisions-v1'

export class ApiError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status }
}

// The current backend has no GET endpoints for history/details. This browser-side
// index supports those views for decisions retained through this frontend.
function readDecisionIndex() {
  try {
    const value = JSON.parse(localStorage.getItem(DECISION_INDEX_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}
function writeDecisionIndex(decisions) {
  try { localStorage.setItem(DECISION_INDEX_KEY, JSON.stringify(decisions)) } catch { /* convenience index only */ }
}
function saveDecisionToIndex(decision) {
  const current = readDecisionIndex()
  const previous = current.find((d) => d.decision_id === decision.decision_id)
  const next = {
    ...previous,
    ...decision,
    created_at: previous?.created_at || decision.created_at || new Date().toISOString().slice(0, 10),
    outcomes: decision.outcomes || previous?.outcomes || [],
  }
  writeDecisionIndex([next, ...current.filter((d) => d.decision_id !== next.decision_id)])
}

async function request(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('NETWORK_ERROR')
  }
  if (!res.ok) {
    let code = 'SERVER_ERROR'
    try { code = (await res.json()).error || code } catch { /* ignore */ }
    throw new ApiError(code, res.status)
  }
  return res.json()
}

const pick = (real, fake) => (USE_MOCK ? fake() : real())

export const getHealth = () => pick(() => request('/api/health'), mock.getHealth)
export const createDecision = (data) => pick(async () => {
  const result = await request('/api/decisions', { method: 'POST', body: data })
  saveDecisionToIndex({ ...data, proposal_title: data.proposal_title || data.title })
  return result
}, () => mock.createDecision(data))
export const analyzeProposal = (data) => pick(() => request('/api/analyze', { method: 'POST', body: data }), () => mock.analyzeProposal(data))
export const recordOutcome = (data) => pick(async () => {
  const result = await request('/api/outcomes', { method: 'POST', body: data })
  const current = readDecisionIndex().find((d) => d.decision_id === data.decision_id)
  if (current) saveDecisionToIndex({ ...current, outcomes: [...(current.outcomes || []), { ...data }] })
  return result
}, () => mock.recordOutcome(data))
export const askQuestion = (question) => pick(() => request('/api/ask', { method: 'POST', body: { question } }), () => mock.askQuestion(question))

// The backend can add GET /api/decisions and GET /api/decisions/{id} later;
// until then these two views use the local index populated after successful writes.
export const listDecisions = () => pick(async () => readDecisionIndex().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))), mock.listDecisions)
export const getDecision = (id) => pick(async () => {
  const decision = readDecisionIndex().find((d) => d.decision_id === id)
  if (!decision) throw new ApiError('NOT_FOUND', 404)
  return decision
}, () => mock.getDecision(id))

export function friendlyError(err, title = 'Something went wrong') {
  if (err?.code === 'MEMORY_SERVICE_UNAVAILABLE')
    return { title: 'Memory service temporarily unavailable', message: 'Decision memory cannot be reached right now. Please try again shortly.' }
  return { title, message: 'Please try again.' }
}
