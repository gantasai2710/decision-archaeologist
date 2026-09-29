import { useEffect, useState } from 'react'
import { getHealth } from '../services/api.js'

const VIEW = {
  checking: ['bg-slate-300', 'Checking…'],
  ok: ['bg-teal-500', 'Connected'],
  down: ['bg-amber-500', 'Memory service temporarily unavailable'],
}
export default function MemoryStatus() {
  const [s, setS] = useState('checking')
  useEffect(() => {
    getHealth().then((h) => setS(h.status === 'healthy' && h.memory !== 'unavailable' ? 'ok' : 'down')).catch(() => setS('down'))
  }, [])
  const [dot, label] = VIEW[s]
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold">Memory status</h2>
      <p className="mt-3 text-sm text-ink-soft">Hindsight Memory</p>
      <p className="mt-1 flex items-center gap-2 text-sm font-medium"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</p>
    </div>
  )
}
