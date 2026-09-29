import { useState } from 'react'
import { Field, ListInput, Section } from './ui.jsx'

const STATUSES = ['Proposed', 'Active', 'Deprecated', 'Superseded']
const clean = (a) => a.map((s) => s.trim()).filter(Boolean)

export default function DecisionForm({ initial = {}, nextId = '', onSubmit, submitting }) {
  const [f, setF] = useState({
    decision_id: nextId, title: '', context: '', problem: '', chosen_option: '', rationale: '', expected_outcome: '', status: 'Active',
    ...initial,
  })
  const [lists, setLists] = useState({ assumptions: [''], alternatives: [''], constraints: [''] })
  const [err, setErr] = useState({})
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: undefined }) }
  const setList = (k) => (v) => { setLists({ ...lists, [k]: v }); setErr({ ...err, [k]: undefined }) }

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    for (const k of ['decision_id', 'title', 'context', 'problem', 'chosen_option', 'rationale', 'expected_outcome']) if (!String(f[k]).trim()) next[k] = 'This field is required.'
    if (!clean(lists.assumptions).length) next.assumptions = 'Add at least one assumption — this is what future analysis checks.'
    setErr(next)
    if (Object.keys(next).length) { document.querySelector('[data-invalid]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return }
    const { supersedes, trigger, proposal_title, ...core } = f
    onSubmit({
      ...core,
      decision_id: core.decision_id.trim().toUpperCase(),
      status: core.status.toLowerCase(),
      assumptions: clean(lists.assumptions), alternatives: clean(lists.alternatives), constraints: clean(lists.constraints),
      ...(supersedes ? { supersedes, trigger, proposal_title } : {}),
    })
  }
  const inv = (k) => (err[k] ? { 'data-invalid': true } : {})

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Section title="Basic information" hint="What was the situation?">
        <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
          <div {...inv('decision_id')}><Field label="Decision ID" error={err.decision_id}><input className="input font-mono" value={f.decision_id} onChange={set('decision_id')} placeholder="DEC-006" /></Field></div>
          <div {...inv('title')}><Field label="Title" error={err.title}><input className="input" value={f.title} onChange={set('title')} placeholder="Introduce asynchronous processing" /></Field></div>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div {...inv('context')}><Field label="Context" error={err.context}><textarea className="input min-h-[96px]" value={f.context} onChange={set('context')} placeholder="The application now handles millions of events." /></Field></div>
          <div {...inv('problem')}><Field label="Problem" error={err.problem}><textarea className="input min-h-[96px]" value={f.problem} onChange={set('problem')} placeholder="Synchronous requests are becoming slow." /></Field></div>
        </div>
      </Section>

      <Section title="Decision" hint="What did you choose, and why?">
        <div className="space-y-5">
          <div {...inv('chosen_option')}><Field label="Chosen option" error={err.chosen_option}><input className="input" value={f.chosen_option} onChange={set('chosen_option')} placeholder="Background workers and a message queue" /></Field></div>
          <div {...inv('rationale')}><Field label="Rationale" error={err.rationale}><textarea className="input min-h-[96px]" value={f.rationale} onChange={set('rationale')} placeholder="Separate long-running work from HTTP requests." /></Field></div>
        </div>
      </Section>

      <Section title="Assumptions" hint="What must stay true for this decision to remain sound? These are compared against future proposals.">
        <div {...inv('assumptions')}>
          <ListInput values={lists.assumptions} onChange={setList('assumptions')} placeholder="Event volume will continue growing" addLabel="Add assumption" />
          {err.assumptions && <p className="mt-2 text-xs text-red-600">{err.assumptions}</p>}
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Alternatives" hint="What else was considered?">
          <ListInput values={lists.alternatives} onChange={setList('alternatives')} placeholder="Continue synchronous processing" addLabel="Add alternative" />
        </Section>
        <Section title="Constraints" hint="What limited the options?">
          <ListInput values={lists.constraints} onChange={setList('constraints')} placeholder="Limited infrastructure budget" addLabel="Add constraint" />
        </Section>
      </div>

      <Section title="Expected outcome and status">
        <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
          <Field label="Expected outcome" error={err.expected_outcome}><textarea className="input min-h-[120px]" value={f.expected_outcome} onChange={set('expected_outcome')} placeholder="Faster API responses" /></Field>
          <Field label="Status">
            <select className="input" value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
        </div>
      </Section>

      <div className="flex justify-end pt-1">
        <button type="submit" className="btn-primary px-6" disabled={submitting}>{submitting ? 'Recording…' : 'Record Decision'}</button>
      </div>
    </form>
  )
}
