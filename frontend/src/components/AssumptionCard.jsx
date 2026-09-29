import { cx } from './ui.jsx'

const TONE = {
  changed: 'bg-amber-50 text-amber-800 border-amber-200',
  unchanged: 'bg-teal-50 text-teal-800 border-teal-200',
  holds: 'bg-teal-50 text-teal-800 border-teal-200',
}

export const normalizeAssumption = (a) => typeof a === 'string'
  ? { original: a, current: '—', assessment: 'Changed' }
  : {
      original: a.original || a.original_assumption || 'Assumption',
      current: a.current || a.current_condition || '—',
      assessment: a.assessment || 'Uncertain',
    }

export default function AssumptionCard({ item }) {
  const a = normalizeAssumption(item)
  const tone = TONE[a.assessment.toLowerCase()] || 'bg-slate-50 text-ink-soft border-slate-200'
  return (
    <div className="grid items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto_1fr_auto] md:gap-4">
      <div>
        <p className="mb-0.5 text-xs text-ink-mute md:hidden">Original assumption</p>
        <p className="text-sm">{a.original}</p>
      </div>
      <span className="hidden text-ink-mute md:block">→</span>
      <div>
        <p className="mb-0.5 text-xs text-ink-mute md:hidden">Current situation</p>
        <p className="text-sm font-medium">{a.current}</p>
      </div>
      <span className={cx('inline-flex w-fit items-center justify-center rounded-full border px-3 py-1 text-xs font-medium md:min-w-[88px]', tone)}>{a.assessment}</span>
    </div>
  )
}
