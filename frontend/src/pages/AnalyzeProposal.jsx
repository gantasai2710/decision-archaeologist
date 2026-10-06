import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { analyzeProposal, friendlyError } from '../services/api.js'
import { PageHeader } from '../components/ui.jsx'
import ProposalForm from '../components/ProposalForm.jsx'
import LoadingState, { STAGES } from '../components/LoadingState.jsx'
import AnalysisPanel from '../components/AnalysisPanel.jsx'
import ErrorState, { EmptyState } from '../components/ErrorState.jsx'

const DEMO = {
  title: 'Move event processing to background workers',
  context: 'Event volume has increased significantly. Some operations now take several seconds.',
  proposal: 'Use a message queue and background workers.',
}

export default function AnalyzeProposal() {
  const nav = useNavigate()
  const followUp = useLocation().state?.followUp
  const [phase, setPhase] = useState('idle') // idle -> loading -> results | error
  const [stage, setStage] = useState(0)
  const [proposal, setProposal] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const timer = useRef()
  useEffect(() => () => clearInterval(timer.current), [])

  async function run(p) {
    setProposal(p); setError(null); setStage(0); setPhase('loading')
    // The API is a single request, so stage labels advance on a timer while it is in flight.
    // The last stage stays active until the response arrives; no percentages are shown.
    timer.current = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1200)
    try {
      const r = await analyzeProposal(p)
      clearInterval(timer.current)
      setStage(STAGES.length); setResult(r)
      await new Promise((res) => setTimeout(res, 450))
      setPhase('results')
    } catch (e) { clearInterval(timer.current); setError(e); setPhase('error') }
  }

  const record = () => {
    const first = followUp?.decisionId || result?.historical_decisions?.[0]?.metadata?.decision_id
    nav('/decisions/new', { state: { prefill: {
      context: followUp?.context || proposal.context, problem: proposal.title,
      ...(first ? { supersedes: first, trigger: followUp?.trigger || result.analysis?.changed_conditions?.[0] || '', proposal_title: proposal.title } : {}),
    } } })
  }

  if (phase === 'loading') return <LoadingState stage={stage} proposalTitle={proposal?.title} />
  if (phase === 'error') {
    return <ErrorState {...friendlyError(error, 'Something went wrong while analyzing the proposal.')} onRetry={() => run(proposal)} />
  }

  if (phase === 'results') {
    const empty = !result.historical_decisions?.length
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Analysis" actions={<button className="btn-ghost" onClick={() => setPhase('idle')}>Analyze another proposal</button>} />
        <div className="card mb-2 border-l-4 border-l-accent p-5 sm:p-6">
          <p className="text-sm font-medium text-accent">Your proposal</p>
          <h2 className="mt-1 text-lg font-semibold">{proposal.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{proposal.context}</p>
          <p className="mt-1 text-sm leading-relaxed">{proposal.proposal}</p>
        </div>
        <div className="h-6" />
        {empty && followUp
          ? <div className="card space-y-3 p-5"><p className="text-sm text-ink-soft">No related historical decisions were recalled. You can still record a follow-up using the outcome context below.</p><button className="btn-primary" onClick={record}>Record New Decision</button></div>
          : empty
          ? <EmptyState title="No historical decisions found." message="Record decisions so Decision Archaeologist can build organizational memory." to="/decisions/new" action="Record Your First Decision" />
          : <AnalysisPanel result={result} onRecord={record} />}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Analyze a New Proposal" subtitle="Compare a proposed architectural change with the organization's historical decisions and assumptions." />
      {followUp && <div className="mb-5 rounded-lg border border-accent-line bg-accent-soft/60 p-4 text-sm">
        <p className="font-medium text-accent">Follow-up from {followUp.decisionId}: {followUp.decisionTitle}</p>
        <p className="mt-1 text-ink-soft">The prior outcome and lessons are included in the editable context below.</p>
      </div>}
      <ProposalForm key={followUp?.decisionId || 'new'} onSubmit={run} demo={DEMO} initial={followUp ? { title: `Follow-up: ${followUp.decisionTitle}`, context: followUp.context, proposal: '' } : {}} />
      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-medium text-accent">Recall</span>
        <span>related past decisions</span><span className="text-ink-mute">→</span>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-medium text-accent">Reflect</span>
        <span>on what changed</span><span className="text-ink-mute">→</span>
        <span className="rounded-full bg-ink px-2.5 py-0.5 font-medium text-white">You decide</span>
      </div>
    </div>
  )
}
