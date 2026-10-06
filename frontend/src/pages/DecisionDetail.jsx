import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getDecision, listDecisions, recordOutcome, friendlyError } from '../services/api.js'
import { Bullets, Section, StatusBadge, fmtDate } from '../components/ui.jsx'
import Timeline from '../components/Timeline.jsx'
import OutcomeForm from '../components/OutcomeForm.jsx'
import ErrorState from '../components/ErrorState.jsx'

// Builds the Decision Evolution chain from optional `supersedes` links between decisions.
function buildEvolution(d, all) {
  const byId = Object.fromEntries(all.map((x) => [x.decision_id, x]))
  let root = d
  const seen = new Set()
  while (root.supersedes && byId[root.supersedes] && !seen.has(root.decision_id)) { seen.add(root.decision_id); root = byId[root.supersedes] }
  const steps = []
  const guard = new Set()
  for (let cur = root; cur && !guard.has(cur.decision_id); ) {
    guard.add(cur.decision_id)
    const next = all.find((x) => x.supersedes === cur.decision_id)
    const outcomes = cur.outcomes || []
    steps.push({ type: 'decision', id: cur.decision_id, title: cur.chosen_option || cur.title, to: `/decisions/${cur.decision_id}`, current: cur.decision_id === d.decision_id,
      edge: next ? next.trigger || 'conditions changed' : outcomes.length ? 'observed outcome' : null })
    if (outcomes.length) {
      const last = outcomes[outcomes.length - 1]
      steps.push({ type: 'outcome', title: 'Outcome + lessons', subtitle: [last.outcome, ...(last.lessons || [])].filter(Boolean).join(' · ') })
    }
    if (next) steps.push({ type: 'proposal', title: 'New proposal', subtitle: next.proposal_title || next.title, edge: 'human decision' })
    else if (cur.decision_id === d.decision_id) steps.push({ type: 'future', title: 'Consider a follow-up decision', subtitle: outcomes.length ? 'Choose a next action below.' : 'Record an outcome when known.', current: true })
    cur = next
  }
  return steps
}

export default function DecisionDetail() {
  const { id } = useParams()
  const { state } = useLocation()
  const nav = useNavigate()
  const [d, setD] = useState(null)
  const [all, setAll] = useState([])
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [followUpDismissed, setFollowUpDismissed] = useState(false)
  const [banner, setBanner] = useState(state?.recorded ? 'Decision retained in memory. It will now be recalled when related proposals are analyzed.' : null)

  const load = () => {
    setError(null)
    Promise.all([getDecision(id), listDecisions()]).then(([one, list]) => { setD(one); setAll(list) }).catch(setError)
  }
  useEffect(() => { setD(null); setFormOpen(false); load() }, [id])

  async function submitOutcome(data) {
    setSaving(true); setSaveError(null)
    try {
      await recordOutcome(data)
      setFormOpen(false); setFollowUpDismissed(false); setBanner('Outcome retained. The lessons are now part of organizational memory.')
      load()
    } catch (e) { setSaveError(e) }
    setSaving(false)
  }

  if (error) return <ErrorState {...friendlyError(error, error.code === 'NOT_FOUND' ? 'Decision not found' : 'The decision could not be loaded')} onRetry={error.code === 'NOT_FOUND' ? undefined : load} />
  if (!d) return <div className="card h-96 animate-pulse bg-slate-100" />

  const steps = buildEvolution(d, all)
  const outcomes = d.outcomes || []
  const successor = all.find((x) => x.supersedes === d.decision_id)
  const latestOutcome = outcomes[outcomes.length - 1]
  const outcomeContext = latestOutcome ? [
    `Follow-up to ${d.decision_id}: ${d.title}`,
    `Original context: ${d.context}`,
    `Observed outcome (${latestOutcome.observed_at}): ${latestOutcome.outcome}`,
    `Observations: ${latestOutcome.observations?.join('; ') || 'None recorded'}`,
    `Lessons learned: ${latestOutcome.lessons?.join('; ') || 'None recorded'}`,
  ].join('\n') : ''
  const text = (t) => <p className="text-sm leading-relaxed">{t || <span className="text-ink-mute">Not recorded</span>}</p>

  return (
    <>
      <Link to="/decisions" className="text-sm text-ink-soft hover:text-ink">← Decision History</Link>
      <header className="mb-6 mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-3 font-mono text-sm text-ink-soft">{d.decision_id}<StatusBadge status={d.status} /></p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{d.title}</h1>
          <p className="mt-1 text-sm text-ink-mute">Recorded {fmtDate(d.created_at)}</p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setFormOpen(true)} disabled={formOpen}>Record Outcome</button>
      </header>

      {banner && <div className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-accent-line bg-accent-soft/60 px-4 py-3 text-sm"><span>{banner}</span><button aria-label="Dismiss" onClick={() => setBanner(null)} className="text-ink-mute hover:text-ink">✕</button></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {formOpen && (
            <div>
              {saveError && <div className="mb-3"><ErrorState {...friendlyError(saveError, 'The outcome could not be recorded')} /></div>}
              <OutcomeForm decisionId={d.decision_id} onSubmit={submitOutcome} onCancel={() => setFormOpen(false)} submitting={saving} />
            </div>
          )}
          <Section title="Context and problem">
            <div className="grid gap-5 md:grid-cols-2">
              <div><p className="mb-1 text-sm text-ink-soft">Context</p>{text(d.context)}</div>
              <div><p className="mb-1 text-sm text-ink-soft">Problem</p>{text(d.problem)}</div>
            </div>
          </Section>
          <Section title="Decision">
            <p className="mb-1 text-sm text-ink-soft">Chosen option</p>
            <p className="font-medium">{d.chosen_option}</p>
            <p className="mb-1 mt-4 text-sm text-ink-soft">Rationale</p>
            {text(d.rationale)}
          </Section>
          <Section title="Assumptions" hint="Checked against future proposals.">{d.assumptions?.length ? <Bullets items={d.assumptions} /> : text()}</Section>
          <div className="grid gap-5 md:grid-cols-2">
            <Section title="Alternatives">{d.alternatives?.length ? <Bullets items={d.alternatives} /> : text()}</Section>
            <Section title="Constraints">{d.constraints?.length ? <Bullets items={d.constraints} /> : text()}</Section>
          </div>
          <Section title="Expected outcome">{text(d.expected_outcome)}</Section>
          <Section title="Outcome history" hint="Decision → outcome → lessons → future decisions.">
            {outcomes.length === 0 ? (
              <p className="text-sm text-ink-soft">No outcome recorded yet. Once you know how this decision played out, record it so the lessons inform future proposals.</p>
            ) : (
              <div className="space-y-4">
                {[...outcomes].reverse().map((o, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs text-ink-mute">Observed {fmtDate(o.observed_at)}</p>
                    <p className="mt-1 text-sm font-medium">{o.outcome}</p>
                    {o.observations?.length > 0 && <div className="mt-3"><p className="mb-1.5 text-xs text-ink-soft">Observations</p><Bullets items={o.observations} /></div>}
                    {o.lessons?.length > 0 && <div className="mt-3 rounded-md bg-accent-soft/60 p-3"><p className="mb-1.5 text-xs font-medium text-accent">Lessons learned</p><Bullets items={o.lessons} /></div>}
                  </div>
                ))}
              </div>
            )}
          </Section>
          {outcomes.length > 0 && <Section title="What next?" hint="The outcome and lessons are saved. Choose whether to explore a follow-up.">
            {successor ? <p className="text-sm text-ink-soft">A follow-up decision is already recorded: <Link className="font-medium text-accent hover:underline" to={`/decisions/${successor.decision_id}`}>{successor.decision_id} · {successor.title}</Link></p>
              : followUpDismissed ? <p className="text-sm text-ink-soft">No follow-up selected. You can return to this decision later.</p>
                : <div className="flex flex-wrap gap-2">
                  <button className="btn-primary" onClick={() => nav('/analyze', { state: { followUp: { decisionId: d.decision_id, decisionTitle: d.title, context: outcomeContext, trigger: latestOutcome?.lessons?.join('; ') || latestOutcome?.outcome || '' } } })}>Analyze a follow-up proposal</button>
                  <button className="btn-ghost" onClick={() => nav('/decisions/new', { state: { prefill: { context: outcomeContext, problem: d.problem, supersedes: d.decision_id, trigger: latestOutcome?.lessons?.join('; ') || latestOutcome?.outcome || '', proposal_title: `Follow-up to ${d.title}` } } })}>Record a new decision</button>
                  <button className="btn-ghost" onClick={() => setFollowUpDismissed(true)}>No follow-up needed</button>
                </div>}
          </Section>}
        </div>

        <aside>
          <Section title="Decision evolution" className="lg:sticky lg:top-20">
            <Timeline steps={steps} />
            {steps.length === 1 && !outcomes.length && <p className="mt-2 text-xs leading-relaxed text-ink-soft">No evolution yet. When a new proposal leads to a follow-up decision, the chain appears here.</p>}
          </Section>
        </aside>
      </div>
    </>
  )
}
