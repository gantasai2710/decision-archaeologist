export const STAGES = [
  'Searching decision history',
  'Retrieving relevant historical decisions',
  'Comparing historical context',
  'Analyzing assumptions',
  'Generating decision analysis',
]

function Icon({ state }) {
  if (state === 'done') return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] text-white">✓</span>
  if (state === 'active') return <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-line border-t-accent" />
  return <span className="h-5 w-5 rounded-full border-2 border-slate-200" />
}

// stage: index of the step currently running. stage === STAGES.length means everything is done.
export default function LoadingState({ stage = 0, proposalTitle }) {
  return (
    <div className="card mx-auto max-w-xl p-6 sm:p-8" role="status" aria-live="polite">
      <h2 className="text-lg font-semibold">Analyzing proposal…</h2>
      {proposalTitle && <p className="mt-1 text-sm text-ink-soft">{proposalTitle}</p>}
      <ol className="mt-6 space-y-4">
        {STAGES.map((label, i) => {
          const state = i < stage ? 'done' : i === stage ? 'active' : 'pending'
          return (
            <li key={label} className="flex items-center gap-3">
              <Icon state={state} />
              <span className={state === 'pending' ? 'text-sm text-ink-mute' : 'text-sm font-medium'}>{label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
