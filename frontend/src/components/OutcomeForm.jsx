import { useState } from 'react'
import { Field, ListInput } from './ui.jsx'

const clean = (a) => a.map((s) => s.trim()).filter(Boolean)

export default function OutcomeForm({ decisionId, onSubmit, onCancel, submitting }) {
  const [f, setF] = useState({ observed_at: new Date().toISOString().slice(0, 10), outcome: '' })
  const [obs, setObs] = useState([''])
  const [lessons, setLessons] = useState([''])
  const [err, setErr] = useState({})
  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!f.outcome.trim()) next.outcome = 'Describe what actually happened.'
    if (!f.observed_at) next.observed_at = 'Choose a date.'
    setErr(next)
    if (!Object.keys(next).length) onSubmit({ decision_id: decisionId, observed_at: f.observed_at, outcome: f.outcome.trim(), observations: clean(obs), lessons: clean(lessons) })
  }
  return (
    <form onSubmit={submit} className="card space-y-5 border-accent-line p-5 sm:p-6" noValidate>
      <p className="text-sm leading-relaxed text-ink-soft">Record what happened and what you learned. After saving, you can analyze a follow-up proposal, record a new decision, or finish without a follow-up.</p>
      <div className="grid gap-5 sm:grid-cols-[160px_180px]">
        <Field label="Decision ID"><input className="input bg-slate-50 font-mono" value={decisionId} readOnly /></Field>
        <Field label="Observed at" error={err.observed_at}><input type="date" className="input" value={f.observed_at} onChange={(e) => setF({ ...f, observed_at: e.target.value })} /></Field>
      </div>
      <Field label="Actual outcome" error={err.outcome}>
        <textarea className="input min-h-[88px]" value={f.outcome} onChange={(e) => { setF({ ...f, outcome: e.target.value }); setErr({}) }} placeholder="API response times improved." />
      </Field>
      <Field label="Observations"><ListInput values={obs} onChange={setObs} placeholder="Background workers processed long-running operations" addLabel="Add observation" /></Field>
      <Field label="Lessons learned"><ListInput values={lessons} onChange={setLessons} placeholder="Async processing is useful when operations become long-running" addLabel="Add lesson" /></Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Recording…' : 'Record Outcome'}</button>
      </div>
    </form>
  )
}
