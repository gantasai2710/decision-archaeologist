import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createDecision, listDecisions, friendlyError } from '../services/api.js'
import { PageHeader } from '../components/ui.jsx'
import DecisionForm from '../components/DecisionForm.jsx'
import ErrorState from '../components/ErrorState.jsx'

const nextId = (list) => 'DEC-' + String(Math.max(0, ...list.map((d) => parseInt(d.decision_id.replace(/\D/g, ''), 10) || 0)) + 1).padStart(3, '0')

export default function NewDecision() {
  const nav = useNavigate()
  const prefill = useLocation().state?.prefill
  const [id, setId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { listDecisions().then((l) => setId(nextId(l))).catch(() => setId('DEC-001')) }, [])

  async function submit(data) {
    setSubmitting(true); setError(null)
    try {
      const res = await createDecision(data)
      nav(`/decisions/${res.decision_id}`, { state: { recorded: true } })
    } catch (e) { setError(e); setSubmitting(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Record a Decision" subtitle="Capture what was decided, why, and which assumptions it depends on, so it can be recalled when conditions change." />
      {prefill?.supersedes && (
        <div className="mb-5 rounded-lg border border-accent-line bg-accent-soft/60 px-4 py-3 text-sm">
          Started from your analysis against <span className="font-mono">{prefill.supersedes}</span>. Context and problem are prefilled; the chosen option and rationale are yours to write.
        </div>
      )}
      {error && <div className="mb-5"><ErrorState {...friendlyError(error, 'The decision could not be recorded')} /></div>}
      {id ? <DecisionForm nextId={id} initial={prefill} onSubmit={submit} submitting={submitting} /> : <div className="card h-64 animate-pulse bg-slate-100" />}
    </div>
  )
}
