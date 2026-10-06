import { useState } from 'react'
import { Field } from './ui.jsx'

export default function ProposalForm({ onSubmit, disabled, demo, initial = {} }) {
  const [f, setF] = useState(() => ({ title: '', context: '', proposal: '', ...initial }))
  const [err, setErr] = useState({})
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: undefined }) }
  const submit = (e) => {
    e.preventDefault()
    const next = {}
    for (const k of ['title', 'context', 'proposal']) if (!f[k].trim()) next[k] = 'This field is required.'
    setErr(next)
    if (!Object.keys(next).length) onSubmit({ title: f.title.trim(), context: f.context.trim(), proposal: f.proposal.trim() })
  }
  return (
    <form onSubmit={submit} className="card space-y-5 p-5 sm:p-7" noValidate>
      <Field label="Proposal title" error={err.title}>
        <input className="input" value={f.title} onChange={set('title')} placeholder="Move event processing to background workers" />
      </Field>
      <Field label="Context" error={err.context} hint="What has changed since the last time this area was decided?">
        <textarea className="input min-h-[96px]" value={f.context} onChange={set('context')} placeholder="Event volume has increased significantly." />
      </Field>
      <Field label="What are you proposing?" error={err.proposal}>
        <textarea className="input min-h-[96px]" value={f.proposal} onChange={set('proposal')} placeholder="Use a message queue and background workers." />
      </Field>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="submit" className="btn-primary" disabled={disabled}>Analyze Against Decision History →</button>
        {demo && <button type="button" className="text-sm font-medium text-accent hover:underline" onClick={() => setF(demo)}>Fill with the demo proposal</button>}
      </div>
    </form>
  )
}
