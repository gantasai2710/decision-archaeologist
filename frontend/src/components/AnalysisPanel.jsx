import HistoricalDecision from './HistoricalDecision.jsx'
import AssumptionCard, { normalizeAssumption } from './AssumptionCard.jsx'
import { Bullets } from './ui.jsx'

function Step({ n, title, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-mono text-xs text-white">{n}</span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  )
}
const Down = ({ label }) => (
  <div className="flex items-center gap-3 py-3 pl-[9px] text-ink-mute" aria-hidden="true">
    <span className="flex flex-col items-center leading-none"><span className="h-3 w-px bg-slate-300" />▾</span>
    <span className="text-xs">{label}</span>
  </div>
)
const Block = ({ title, children }) => (
  <div className="card p-5">
    <h3 className="mb-2.5 text-sm font-semibold">{title}</h3>
    {children}
  </div>
)

function selectHistoricalDecisions(memories) {
  const canonical = memories.filter((item) =>
    item.metadata?.kind === 'decision' || item.metadata?.decision_id
  )
  const candidates = canonical.length ? canonical : memories
  const seenDecisionIds = new Set()

  return candidates.filter((item) => {
    const decisionId = item.metadata?.decision_id
    if (!decisionId) return true
    if (seenDecisionIds.has(decisionId)) return false
    seenDecisionIds.add(decisionId)
    return true
  }).slice(0, 5)
}

// Renders the full investigation: past decision → assumptions vs. now → reflection → human decision.
// Everything shown here comes from the API response; nothing is decided in the frontend.
export default function AnalysisPanel({ result, onRecord }) {
  const { historical_decisions: hist = [], analysis } = result
  const historicalDecisions = selectHistoricalDecisions(hist)
  const rows = analysis?.assumption_assessments?.length ? analysis.assumption_assessments : analysis?.changed_assumptions || []
  const noLongerHold = rows.map(normalizeAssumption).filter((r) => !['unchanged', 'holds'].includes(r.assessment.toLowerCase())).map((r) => r.original)

  return (
    <div>
      <Step n="1" title="What we decided before">
        <div className="space-y-4">
          {historicalDecisions.map((h, i) => <HistoricalDecision key={h.metadata?.decision_id || i} item={h} />)}
          {hist.length > 5 && <p className="text-xs text-ink-soft">Showing the 5 most relevant decisions from organizational memory.</p>}
        </div>
      </Step>

      <Down label="Do those assumptions still hold?" />

      <Step n="2" title="Assumption changes">
        {!analysis ? (
          <div className="card border-dashed p-5 text-sm text-ink-soft">
            Reflection was not available, so no assumption analysis is shown. The historical decisions above were retrieved from memory. Try the analysis again shortly.
          </div>
        ) : rows.length === 0 ? (
          <div className="card p-5 text-sm text-ink-soft">No assumption changes were identified.</div>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_auto_1fr_auto] gap-4 px-4 text-xs font-medium text-ink-mute md:grid">
              <span>Past assumption</span><span className="invisible">→</span><span>Current conditions</span><span className="min-w-[88px] text-center">Assessment</span>
            </div>
            {rows.map((r, i) => <AssumptionCard key={i} item={r} />)}
          </div>
        )}
      </Step>

      {analysis && (
        <>
          <Down label="What the reflection found" />
          <Step n="3" title="Reflection">
            <div className="space-y-4">
              {analysis.historical_reasoning && <Block title="Why the old decision made sense"><p className="text-sm leading-relaxed">{analysis.historical_reasoning}</p></Block>}
              <div className="grid gap-4 md:grid-cols-2">
                {analysis.changed_conditions?.length > 0 && <Block title="What has changed"><Bullets items={analysis.changed_conditions} /></Block>}
                {noLongerHold.length > 0 && <Block title="Assumptions that may no longer hold"><Bullets items={noLongerHold} /></Block>}
              </div>
              {analysis.implications?.length > 0 && (
                <div className="card border-accent-line bg-accent-soft/50 p-5">
                  <h3 className="mb-2.5 text-sm font-semibold text-accent">Implication</h3>
                  <Bullets items={analysis.implications} />
                </div>
              )}
              {analysis.uncertainties?.length > 0 && <Block title="Uncertainties"><Bullets items={analysis.uncertainties} /></Block>}
              {analysis.evidence?.length > 0 && (
                <details className="card group p-5">
                  <summary className="cursor-pointer text-sm font-semibold">Evidence ({analysis.evidence.length})</summary>
                  <div className="mt-3"><Bullets items={analysis.evidence} /></div>
                </details>
              )}
            </div>
          </Step>
        </>
      )}

      <Down label="Now it's your call" />

      <Step n="4" title="Architectural decision">
        <div className="rounded-xl bg-ink p-6 text-white sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1">Memory provides reasoning and evidence</span>
            <span className="text-white/50">→</span>
            <span className="rounded-full bg-white px-3 py-1 font-medium text-ink">The architect decides</span>
          </div>
          <p className="mt-5 text-lg font-medium">Historical analysis provided for architectural review.</p>
          <button onClick={onRecord} className="btn mt-5 bg-white text-ink hover:bg-slate-100">Record New Decision</button>
        </div>
      </Step>
    </div>
  )
}
