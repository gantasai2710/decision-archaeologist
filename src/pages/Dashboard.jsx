import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listDecisions, friendlyError } from '../services/api.js'
import { fmtDate } from '../components/ui.jsx'
import ErrorState, { EmptyState } from '../components/ErrorState.jsx'

function QuickLink({ to, type, children }) {
  const icons = {
    analyze: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  }
  return <Link to={to} className="home-quick-link flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-ink-soft transition-colors hover:bg-slate-100 hover:text-ink">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-ink-mute">{icons[type]}</svg>{children}
  </Link>
}

export default function Dashboard() {
  const [decisions, setDecisions] = useState(null)
  const [error, setError] = useState(null)
  const load = () => { setError(null); setDecisions(null); listDecisions().then(setDecisions).catch(setError) }
  useEffect(() => { load() }, [])

  return (
    <div className="mx-auto max-w-3xl">
      <section className="home-hero pt-[8vh] sm:pt-[10vh]">
        <p className="mb-4 text-center text-lg font-semibold tracking-tight text-accent sm:text-xl">Decision Archaeologist</p>
        <h1 className="text-center text-3xl font-medium tracking-tight sm:text-4xl">What are you deciding?</h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-ink-soft sm:text-base">Keep the reasoning behind your architecture close at hand.</p>

        <Link to="/decisions/new" className="home-composer mt-9 flex items-center gap-4 rounded-full border border-slate-200 bg-white px-5 py-3.5 text-left shadow-card transition hover:border-slate-300 sm:px-6 sm:py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl leading-none text-ink-soft">+</span>
          <span className="flex-1 text-sm text-ink-mute sm:text-base">Record an architecture decision</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-lg text-white" aria-hidden="true">→</span>
        </Link>

        <div className="mx-auto mt-5 grid max-w-xl gap-1 sm:grid-cols-3">
          <QuickLink to="/analyze" type="analyze">Analyze a proposal</QuickLink>
          <QuickLink to="/decisions" type="search">Search your decisions</QuickLink>
          <QuickLink to="/decisions" type="history">Browse history</QuickLink>
        </div>
      </section>

      <section className="mt-14 sm:mt-16">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-soft">Recent decisions</h2>
          <Link to="/decisions" className="text-sm text-ink-mute transition hover:text-ink">View all <span aria-hidden="true">→</span></Link>
        </div>
        {error ? <ErrorState {...friendlyError(error, 'Decisions could not be loaded')} onRetry={load} />
          : !decisions ? <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
          : decisions.length === 0 ? <EmptyState title="No decisions recorded yet." message="Your decision history will appear here." to="/decisions/new" action="Record your first decision" />
          : <div className="home-recent divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {decisions.slice(0, 3).map((d) => <Link key={d.decision_id} to={`/decisions/${d.decision_id}`} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5">
                <span className="hidden font-mono text-xs text-ink-mute sm:block">{d.decision_id}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{d.title}</span><span className="mt-1 block truncate text-xs text-ink-mute">Chosen: {d.chosen_option}</span></span>
                <span className="shrink-0 text-xs text-ink-mute">{fmtDate(d.created_at)}</span>
                <span className="text-ink-mute" aria-hidden="true">→</span>
              </Link>)}
            </div>}
      </section>
    </div>
  )
}
