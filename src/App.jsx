import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Navbar from './components/Navbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NewDecision from './pages/NewDecision.jsx'
import AnalyzeProposal from './pages/AnalyzeProposal.jsx'
import DecisionHistory from './pages/DecisionHistory.jsx'
import DecisionDetail from './pages/DecisionDetail.jsx'

export default function App() {
  const [open, setOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('decision-archaeologist-theme') !== 'light')
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    window.localStorage.setItem('decision-archaeologist-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])
  return (
    <div className="min-h-screen lg:pl-[72px]">
      <Sidebar open={open} onClose={() => setOpen(false)} darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)} />
      <Navbar onMenu={() => setOpen(true)} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/decisions/new" element={<NewDecision />} />
          <Route path="/decisions" element={<DecisionHistory />} />
          <Route path="/decisions/:id" element={<DecisionDetail />} />
          <Route path="/analyze" element={<AnalyzeProposal />} />
          <Route path="*" element={<DecisionHistory />} />
        </Routes>
      </main>
    </div>
  )
}
