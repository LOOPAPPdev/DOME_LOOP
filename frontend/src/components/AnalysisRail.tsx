import type { AnalysisModel, CausalEdgeData, CausalNodeData } from "../data/analysis"

type AnalysisRailProps = {
  model: AnalysisModel
  selectedNodeLabel: string
  selectedNode?: CausalNodeData
  selectedEdge?: CausalEdgeData
}

export function AnalysisRail({ model, selectedNodeLabel, selectedNode, selectedEdge }: AnalysisRailProps) {
  return (
    <aside className="analysis-rail panel-surface" aria-label="System inspector">
      <div className="section-heading">
        <div>
          <p className="eyebrow">03 / INSPECTOR</p>
          <h2>System analysis</h2>
        </div>
        <span className="revision-chip">r{model.revision}</span>
      </div>
      <div className="question-block">
        <span className="label">PROBLEM</span>
        <p lang={model.contentLanguage}>{model.question}</p>
      </div>
      <div className="answer-block">
        <span className="label">OBJECTIVE</span>
        <p lang={model.contentLanguage}>{model.objective}</p>
      </div>
      {!selectedEdge && (
        <div className="selected-node" aria-live="polite">
          <span className="label">SELECTED VARIABLE</span>
          <strong lang={selectedNode?.language ?? "en"}>{selectedNode?.label ?? selectedNodeLabel}</strong>
          {selectedNode && <span><span lang="en">{selectedNode.variableId} · {selectedNode.kind} · </span><span lang={selectedNode.language}>{selectedNode.unit}</span><span lang="en"> · {selectedNode.status}</span></span>}
          {selectedNode?.evidenceIds.length ? <span>Evidence: {selectedNode.evidenceIds.join(", ")}</span> : <span>No evidence reference attached.</span>}
        </div>
      )}
      {selectedEdge && (
        <div className="selected-node" aria-live="polite">
          <span className="label">SELECTED RELATIONSHIP</span>
          <strong>{selectedEdge.polarity} · {selectedEdge.status}</strong>
          <span>Delay: {selectedEdge.delay}</span>
          <span>Evidence: {selectedEdge.evidenceIds.join(", ") || "none"}</span>
          <p lang={selectedEdge.language}>{selectedEdge.disconfirmationTest}</p>
        </div>
      )}
      <div className="notes-section">
        <span className="label">BEHAVIOUR HYPOTHESES</span>
        {model.hypotheses.length ? model.hypotheses.map((hypothesis) => <p className="note-line" lang={model.contentLanguage} key={hypothesis}>{hypothesis}</p>) : <p>No hypotheses recorded.</p>}
      </div>
      <div className="notes-section">
        <span className="label">PROPOSED ROADMAP</span>
        {model.interventions.length ? model.interventions.map((intervention) => <p className="note-line intervention" key={intervention}><span lang={model.contentLanguage}>{intervention}</span><span lang="en"> · approval required before real-world action</span></p>) : <p>No intervention proposal recorded.</p>}
      </div>
      <div className="notes-section">
        <span className="label">LIMITATIONS</span>
        {model.limitations.map((limitation) => <p className="note-line" lang={model.contentLanguage} key={limitation}>{limitation}</p>)}
      </div>
    </aside>
  )
}
