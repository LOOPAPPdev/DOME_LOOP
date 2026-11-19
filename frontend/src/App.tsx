import { useMemo, useState } from "react"
import { AnalysisRail } from "./components/AnalysisRail"
import { AppHeader } from "./components/AppHeader"
import { CausalCanvas } from "./components/CausalCanvas"
import { EvidenceRail } from "./components/EvidenceRail"
import { StatusStrip } from "./components/StatusStrip"
import { requestAnalysis } from "./data/apiAnalysis"
import { analysis } from "./data/analysis"

export default function App() {
  const [model, setModel] = useState(analysis)
  const [activeEvidenceId, setActiveEvidenceId] = useState(analysis.evidence[0].id)
  const [selectedNodeId, setSelectedNodeId] = useState(analysis.nodes[3].id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedNode = useMemo(
    () => model.nodes.find((node) => node.id === selectedNodeId) ?? model.nodes[0] ?? analysis.nodes[3],
    [model.nodes, selectedNodeId],
  )

  async function runAnalysis(question: string) {
    setLoading(true)
    setError(null)
    try {
      const next = await requestAnalysis(question)
      setModel(next)
      setActiveEvidenceId(next.evidence[0]?.id ?? "")
      setSelectedNodeId(next.nodes[0]?.id ?? "")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Analysis service unavailable")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <AppHeader confidence={model.confidence} />
      <main className="workspace">
        <EvidenceRail
          activeEvidenceId={activeEvidenceId}
          evidence={model.evidence}
          onSelect={setActiveEvidenceId}
        />
        <CausalCanvas
          edges={model.edges}
          nodes={model.nodes}
          onSelectNode={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />
        <AnalysisRail model={model} selectedNodeLabel={selectedNode.data.label} loading={loading} error={error} onSubmit={runAnalysis} />
      </main>
      <StatusStrip evidenceCount={model.evidence.length} simulation={model.simulation} />
    </div>
  )
}
