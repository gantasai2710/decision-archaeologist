import { Link } from 'react-router-dom'
import { cx } from './ui.jsx'

const DOT = {
  decision: 'border-ink bg-ink',
  proposal: 'border-accent bg-white border-dashed',
  outcome: 'border-teal-500 bg-teal-500',
  future: 'border-slate-300 bg-white',
}
// steps: [{ type, title, subtitle, id, to, current, edge }]  — edge labels the link to the next step.
export default function Timeline({ steps }) {
  return (
    <ol>
      {steps.map((s, i) => (
        <li key={i} className="relative pl-8">
          {i < steps.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200" />}
          <span className={cx('absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2', DOT[s.type], s.current && 'ring-4 ring-accent-line')} />
          <div className="pb-2">
            {s.id && <span className="font-mono text-xs text-ink-soft">{s.id}</span>}
            <p className="text-sm font-medium leading-snug">
              {s.to && !s.current ? <Link to={s.to} className="hover:text-accent hover:underline">{s.title}</Link> : s.title}
            </p>
            {s.subtitle && <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{s.subtitle}</p>}
          </div>
          {s.edge && <p className="pb-4 pt-1 text-xs italic text-ink-mute">↓ {s.edge}</p>}
        </li>
      ))}
    </ol>
  )
}
