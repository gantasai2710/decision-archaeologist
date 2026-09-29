import { useEffect, useMemo, useState } from 'react'
import { listDecisions, friendlyError } from '../services/api.js'
import { ActionLink, PageHeader, cx } from '../components/ui.jsx'
import DecisionCard from '../components/DecisionCard.jsx'
import ErrorState, { EmptyState } from '../components/ErrorState.jsx'

const FILTERS = ['All', 'Active', 'Deprecated', 'Superseded']

export default function DecisionHistory() {
  const [all, setAll] = useState(null)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('All')
  const load = () => { setError(null); setAll(null); listDecisions().then(setAll).catch(setError) }
  useEffect(() => { load() }, [])

  const shown = useMemo(() => (all || []).filter((d) =>
    (filter === 'All' || d.status?.toLowerCase() === filter.toLowerCase()) &&
    `${d.decision_id} ${d.title} ${d.chosen_option} ${d.context}`.toLowerCase().includes(q.trim().toLowerCase())), [all, q, filter])

  return (
    <>
      <PageHeader title="Decision History" subtitle="Every decision the organization remembers." actions={<ActionLink to="/decisions/new" kind="primary">+ New Decision</ActionLink>} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input className="input sm:max-w-xs" placeholder="Search decisions..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search decisions" />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cx('rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === f ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-ink-soft hover:bg-slate-50')}>{f}</button>
          ))}
        </div>
      </div>
      {error ? <ErrorState {...friendlyError(error, 'Decisions could not be loaded')} onRetry={load} />
        : !all ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="card h-40 animate-pulse bg-slate-100" />)}</div>
        : all.length === 0 ? <EmptyState title="No decisions recorded yet." message="Record decisions so Decision Archaeologist can build organizational memory." to="/decisions/new" action="Record Your First Decision" />
        : shown.length === 0 ? <EmptyState title="No matching decisions." message="Try a different search or filter." />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map((d) => <DecisionCard key={d.decision_id} d={d} />)}</div>}
    </>
  )
}
