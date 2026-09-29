import { Link } from 'react-router-dom'

export const cx = (...a) => a.filter(Boolean).join(' ')
export const fmtDate = (d) => {
  if (!d) return '—'
  const x = new Date(d)
  return isNaN(x) ? d : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
export const splitReasons = (t = '') => String(t).split(/\s*[•\n]\s*/).map((s) => s.trim()).filter(Boolean)

const DOT = { active: 'bg-teal-500', proposed: 'bg-sky-500', deprecated: 'bg-slate-400', superseded: 'bg-amber-500' }
export function StatusBadge({ status = 'proposed' }) {
  const s = String(status).toLowerCase()
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-ink-soft">
      <span className={cx('h-1.5 w-1.5 rounded-full', DOT[s] || 'bg-slate-400')} />
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function Section({ title, hint, children, className }) {
  return (
    <section className={cx('card p-5 sm:p-6', className)}>
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-ink-soft">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

export function Field({ label, error, hint, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function ListInput({ values, onChange, placeholder, addLabel }) {
  const set = (i, v) => onChange(values.map((x, j) => (j === i ? v : x)))
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 text-right font-mono text-xs text-ink-mute">{i + 1}</span>
          <input className="input" value={v} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
          {values.length > 1 && (
            <button type="button" aria-label="Remove" onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="rounded-md p-2 text-ink-mute hover:bg-slate-100 hover:text-ink">✕</button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ''])} className="ml-7 text-sm font-medium text-accent hover:underline">
        + {addLabel}
      </button>
    </div>
  )
}

export function Bullets({ items = [] }) {
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-mute" />{t}</li>
      ))}
    </ul>
  )
}

export const ActionLink = ({ to, state, children, kind = 'ghost' }) => (
  <Link to={to} state={state} className={`btn-${kind}`}>{children}</Link>
)
