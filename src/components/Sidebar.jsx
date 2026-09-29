import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { cx } from './ui.jsx'
import { USE_MOCK } from '../services/api.js'
import { resetDemoData } from '../services/mockApi.js'

function NavIcon({ type }) {
  const paths = {
    home: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    new: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z" /></>,
    analyze: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /><path d="M11 7v8M7 11h8" /></>,
    history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{paths[type]}</svg>
}

export const NAV = [
  { to: '/', label: 'Dashboard', match: (p) => p === '/' },
  { to: '/decisions/new', label: 'New Decision', match: (p) => p === '/decisions/new' },
  { to: '/analyze', label: 'Analyze Proposal', match: (p) => p === '/analyze' },
  { to: '/decisions', label: 'Decision History', match: (p) => p.startsWith('/decisions') && p !== '/decisions/new' },
]

export default function Sidebar({ open, onClose, darkMode, onToggleTheme }) {
  const { pathname } = useLocation()
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={onClose} />}
      <aside className={cx(
        'app-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform lg:w-[72px] lg:items-center lg:px-2 lg:py-6 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Link to="/" title="Decision Archaeologist" aria-label="Decision Archaeologist home" className="flex items-center gap-2.5 px-2 lg:px-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-xs font-semibold text-white">DA</span>
          <span className="text-sm font-semibold leading-tight lg:hidden">Decision<br />Archaeologist</span>
        </Link>
        <nav className="mt-10 flex flex-col gap-2 lg:mt-14 lg:items-center">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={cx(
              'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors lg:h-11 lg:w-11 lg:justify-center lg:px-0',
              n.match(pathname) ? 'bg-accent-soft text-accent' : 'text-ink-soft hover:bg-slate-50 hover:text-ink'
            )} title={n.label} aria-label={n.label}><NavIcon type={n.to === '/' ? 'home' : n.to.includes('new') ? 'new' : n.to === '/analyze' ? 'analyze' : 'history'} /><span className="lg:hidden">{n.label}</span></Link>
          ))}
        </nav>
        <div className="mt-auto w-full space-y-4 px-2 text-xs text-ink-mute lg:flex lg:flex-col lg:items-center lg:px-0">
          <button type="button" role="switch" aria-checked={darkMode} onClick={onToggleTheme}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-slate-50 lg:h-11 lg:w-11 lg:justify-center lg:px-0"
            title={darkMode ? 'Switch to light mode' : 'Switch to night mode'}>
            <span className="lg:hidden">{darkMode ? 'Light mode' : 'Night mode'}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" /></svg>
            <span className={cx('relative h-5 w-9 rounded-full transition-colors lg:hidden', darkMode ? 'bg-accent' : 'bg-slate-300')}>
              <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform lg:hidden', darkMode ? 'translate-x-4' : 'translate-x-0.5')} />
            </span>
          </button>
          <p className="leading-relaxed lg:hidden">Remember why. Check what changed. You decide.</p>
          {USE_MOCK && (
            <button className="text-left underline-offset-2 hover:underline lg:hidden"
              onClick={() => { resetDemoData(); window.location.assign('/') }}>Reset sample data</button>
          )}
        </div>
      </aside>
    </>
  )
}
