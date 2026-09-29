// Sample data standing in for FastAPI while VITE_USE_MOCK=true.
// Response shapes mirror the implementation spec so swapping to the real API needs no UI changes.
import { ApiError } from './api.js'

const KEY = 'da-mock-v1'
const d = (decision_id, title, chosen_option, status, created_at, rationale, x = {}) => ({
  decision_id, title, chosen_option, status, created_at, rationale, outcomes: [],
  context: '', problem: '', assumptions: [], alternatives: [], constraints: [], expected_outcome: '', ...x,
})
const seed = [
  d('DEC-001', 'Choose PostgreSQL', 'PostgreSQL', 'Active', '2026-03-12', 'Strong consistency • Mature ecosystem • Team expertise', {
    context: 'We need a primary datastore for transactional order data.',
    problem: 'Order data is relational and consistency-critical.',
    assumptions: ['Data stays relational', 'A single region is enough'],
    alternatives: ['MongoDB', 'MySQL'], constraints: ['Small team', 'Limited budget'],
    expected_outcome: 'Reliable transactional storage with low operational overhead.',
    outcomes: [{ observed_at: '2026-07-01', outcome: 'Stable under production load with no data-integrity incidents.', observations: ['Query performance met targets'], lessons: ['A relational model fit the domain well'] }],
  }),
  d('DEC-002', 'Expose a REST API', 'REST over HTTP/JSON', 'Active', '2026-04-02', 'Familiar to partners • Easy to cache • Simple tooling', {
    context: 'Partners need programmatic access to order data.', problem: 'We need a public API contract.',
    assumptions: ['Partners prefer simple HTTP integrations'], alternatives: ['GraphQL', 'gRPC'], constraints: ['No dedicated API team'],
    expected_outcome: 'Partners integrate within days.',
  }),
  d('DEC-003', 'Deploy on a single VM', 'One VM per environment', 'Superseded', '2026-05-10', 'Lowest cost • Simple deployment • Fast iteration', {
    context: 'Early-stage traffic is low.', problem: 'Choose a hosting topology.',
    assumptions: ['Traffic stays low', 'Downtime during deploys is acceptable'], alternatives: ['Kubernetes', 'Managed containers'],
    constraints: ['Limited infrastructure budget'], expected_outcome: 'Cheap, predictable hosting.',
  }),
  d('DEC-004', 'Cache sessions in Memcached', 'Memcached', 'Deprecated', '2026-06-20', 'Very fast • Simple • Already in the stack', {
    context: 'Session lookups were hitting the database.', problem: 'Reduce database read load.',
    assumptions: ['Sessions can be lost on restart'], alternatives: ['Redis'], constraints: ['Minimal operations overhead'],
    expected_outcome: 'Lower database read latency.',
  }),
  d('DEC-005', 'Use synchronous processing', 'Synchronous processing', 'Active', '2026-09-14', 'Small workload • Simple implementation • Easy debugging • Background processing was unnecessary', {
    context: 'The application processes a small number of events per day.',
    problem: 'Events must be processed reliably with minimal engineering effort.',
    assumptions: ['Processing time remains short', 'Request volume remains manageable', 'Background jobs are uncommon'],
    alternatives: ['Use background workers', 'Use a message queue'],
    constraints: ['Limited infrastructure budget', 'Team has limited operations experience'],
    expected_outcome: 'Simple, predictable request handling that is easy to debug.',
  }),
]

const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.length) return s } catch { /* ignore */ } return structuredClone(seed) }
let db = load()
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* ignore */ } }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export function resetDemoData() { try { localStorage.removeItem(KEY) } catch { /* ignore */ } db = structuredClone(seed) }

export async function getHealth() { await wait(250); return { status: 'healthy', memory: 'hindsight' } }

export async function listDecisions() {
  await wait(300)
  return structuredClone(db).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.decision_id.localeCompare(a.decision_id))
}

export async function getDecision(id) {
  await wait(250)
  const found = db.find((x) => x.decision_id === id)
  if (!found) throw new ApiError('NOT_FOUND', 404)
  return structuredClone(found)
}

export async function createDecision(data) {
  await wait(700)
  if (db.some((x) => x.decision_id === data.decision_id)) throw new ApiError('VALIDATION_ERROR', 400)
  db.push({ ...data, created_at: new Date().toISOString().slice(0, 10), outcomes: [] })
  save()
  return { success: true, decision_id: data.decision_id, memory_status: 'retained' }
}

export async function recordOutcome(data) {
  await wait(700)
  const found = db.find((x) => x.decision_id === data.decision_id)
  if (!found) throw new ApiError('NOT_FOUND', 404)
  const { decision_id, ...rest } = data
  found.outcomes = [...(found.outcomes || []), rest]
  save()
  return { success: true, decision_id, memory_status: 'retained' }
}

export async function analyzeProposal(p) {
  await wait(5200) // stands in for RECALL + REFLECT latency
  const text = `${p.title} ${p.context} ${p.proposal}`.toLowerCase()
  const old = db.find((x) => x.decision_id === 'DEC-005')
  if (!old || !/async|worker|queue|background|volume|event|latency|second/.test(text))
    return { status: 'analyzed', proposal: p, historical_decisions: [], analysis: null }
  return {
    status: 'analyzed',
    proposal: p,
    historical_decisions: [{
      content: `${old.decision_id}: ${old.title}. ${old.rationale}`,
      metadata: { decision_id: old.decision_id, title: old.title, chosen_option: old.chosen_option, rationale: old.rationale, assumptions: old.assumptions, status: old.status, created_at: old.created_at },
      relevance_score: 0.91,
    }],
    analysis: {
      historical_reasoning: 'The original synchronous approach was reasonable under the earlier workload assumptions: a small event volume, short processing times, and a team that needed simple, debuggable code.',
      changed_conditions: ['Event volume increased', 'Processing operations became longer', 'Request latency is now affected'],
      changed_assumptions: [
        { original: 'Processing time remains short', current: 'Operations now take several seconds', assessment: 'Changed' },
        { original: 'Request volume remains manageable', current: 'Event volume has increased significantly', assessment: 'Changed' },
        { original: 'Background jobs are uncommon', current: 'Background workers are now being considered', assessment: 'Changed' },
      ],
      implications: ['The historical reasoning should be reconsidered under the current operating conditions.'],
      uncertainties: ['Future event growth is unknown', 'Infrastructure budget remains constrained'],
      evidence: [`${old.decision_id} rationale: ${old.rationale}`, `${old.decision_id} assumptions: ${old.assumptions.join('; ')}`, `Proposal context: ${p.context}`],
    },
  }
}

export async function askQuestion() {
  await wait(800)
  return { answer: 'Synchronous processing was chosen because the workload was small and simple, debuggable code was the priority.', related_decisions: ['DEC-005'] }
}
