import { useLocation } from 'react-router-dom'
import { NAV } from './Sidebar.jsx'

export default function Navbar({ onMenu }) {
  const { pathname } = useLocation()
  const current = NAV.find((n) => n.match(pathname))?.label || 'Decision Archaeologist'
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
      <button onClick={onMenu} aria-label="Open navigation" className="rounded-md p-2 text-ink-soft hover:bg-slate-100 lg:hidden">☰</button>
      <span className="text-sm font-medium lg:hidden">{current}</span>
      <span className="ml-auto hidden text-xs text-ink-mute sm:block">Architecture decision workspace</span>
    </header>
  )
}
