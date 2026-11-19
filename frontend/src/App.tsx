import { useMemo, useState } from "react"
import { AnalysisRail } from "./components/AnalysisRail"
import { AppHeader } from "./components/AppHeader"
import { CausalCanvas } from "./components/CausalCanvas"
import { EvidenceRail } from "./components/EvidenceRail"
import { StatusStrip } from "./components/StatusStrip"
import { analysis } from "./data/analysis"

export default function App() {
  const [activeEvidenceId, setActiveEvidenceId] = useState(analysis.evidence[0].id)
  const [selectedNodeId, setSelectedNodeId] = useState(analysis.nodes[3].id)
  const selectedNode = useMemo(
    () => analysis.nodes.find((node) => node.id === selectedNodeId) ?? analysis.nodes[3],
    [selectedNodeId],
  )

  return (
    <div className="app-shell">
      <AppHeader confidence={analysis.confidence} />
      <main className="workspace">
        <EvidenceRail
          activeEvidenceId={activeEvidenceId}
          evidence={analysis.evidence}
          onSelect={setActiveEvidenceId}
        />
        <CausalCanvas
          edges={analysis.edges}
          nodes={analysis.nodes}
          onSelectNode={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />
        <AnalysisRail model={analysis} selectedNodeLabel={selectedNode.data.label} />
      </main>
      <StatusStrip evidenceCount={analysis.evidence.length} simulation={analysis.simulation} />
    </div>
  )
}
