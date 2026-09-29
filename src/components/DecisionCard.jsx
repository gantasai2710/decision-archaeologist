import { Link } from 'react-router-dom'
import { StatusBadge, fmtDate, splitReasons } from './ui.jsx'

export default function DecisionCard({ d }) {
  return (
    <article className="card flex flex-col p-5 transition-colors hover:border-slate-300">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-ink-soft">{d.decision_id}</span>
        <StatusBadge status={d.status} />
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug">{d.title}</h3>
      <p className="mt-1 text-sm text-ink-soft">Chosen: <span className="text-ink">{d.chosen_option}</span></p>
      {d.rationale && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">{splitReasons(d.rationale).join(' • ')}</p>}
      <div className="mt-4 flex items-center justify-between pt-1">
        <span className="text-xs text-ink-mute">{fmtDate(d.created_at)}</span>
        <Link to={`/decisions/${d.decision_id}`} className="text-sm font-medium text-accent hover:underline">View decision →</Link>
      </div>
    </article>
  )
}
