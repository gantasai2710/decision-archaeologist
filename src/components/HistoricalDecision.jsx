import { StatusBadge, Bullets, fmtDate, splitReasons } from './ui.jsx'

// Visually distinct from the current proposal: neutral slate rail = the past.
export default function HistoricalDecision({ item }) {
  const m = item.metadata || {}
  const reasons = splitReasons(m.rationale)
  return (
    <article className="card overflow-hidden border-l-4 border-l-slate-400">
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6">
        <p className="text-sm font-medium text-ink-soft">Relevant historical decision</p>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-ink-soft">{m.decision_id || 'Historical decision'}{m.created_at ? ` · ${fmtDate(m.created_at)}` : ''}</p>
            <h3 className="mt-1 text-lg font-semibold">{m.title || 'Untitled decision'}</h3>
          </div>
          <div className="flex items-center gap-2">
            {m.status && <StatusBadge status={m.status} />}
            {item.relevance_score != null && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-ink-soft">Relevance {Number(item.relevance_score).toFixed(2)}</span>}
          </div>
        </div>
        {m.chosen_option && (
          <div>
            <p className="text-sm text-ink-soft">Original choice</p>
            <p className="mt-0.5 font-medium">{m.chosen_option}</p>
          </div>
        )}
        {reasons.length > 0 ? (
          <div>
            <p className="mb-2 text-sm text-ink-soft">Why it was chosen</p>
            <Bullets items={reasons} />
          </div>
        ) : (
          item.content && <p className="text-sm leading-relaxed text-ink-soft">{item.content}</p>
        )}
        {m.assumptions?.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-ink-soft">Assumptions at the time</p>
            <div className="flex flex-wrap gap-2">
              {m.assumptions.map((a) => <span key={a} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs">{a}</span>)}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
