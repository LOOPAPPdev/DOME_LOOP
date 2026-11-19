import { useState } from "react"
import { Link } from "react-router-dom"
import { DEMO_PROJECT_ID, useSystemCaseData } from "../../app/SystemCaseProvider"
import { projectSystemCase } from "../systems/systemCaseProjection"
import { CausalCanvas } from "../../components/CausalCanvas"
import { EvidenceRail } from "../../components/EvidenceRail"
import { AnalysisRail } from "../../components/AnalysisRail"

function ModeTabs({ systemId, active }: { systemId: string; active: "app" | "infographic" | "tutorial" }) {
  const root = `/projects/${DEMO_PROJECT_ID}/systems/${systemId}`
  return (
    <nav className="mode-tabs" aria-label="System views">
      <Link aria-current={active === "app" ? "page" : undefined} to={`${root}/app`}>App</Link>
      <Link aria-current={active === "infographic" ? "page" : undefined} to={`${root}/infographic`}>Infographic</Link>
      <Link aria-current={active === "tutorial" ? "page" : undefined} to={`${root}/tutorial`}>Tutorial</Link>
    </nav>
  )
}

export function InfographicView({ systemId }: { systemId: string }) {
  const systemCase = useSystemCaseData()
  const model = projectSystemCase(systemCase)
  const [activeEvidenceId, setActiveEvidenceId] = useState(model.evidence[0]?.id ?? "")
  const [selectedNodeId, setSelectedNodeId] = useState(model.nodes[0]?.id ?? "")
  const [selectedEdgeId, setSelectedEdgeId] = useState("")

  return (
    <section className="system-view" aria-labelledby="infographic-title">
      <ModeTabs systemId={systemId} active="infographic" />
      <div className="read-only-banner" role="status">READ ONLY · Derived from SystemCase revision r{systemCase.revision} · DEMO data</div>
      <header className="view-heading">
        <p className="eyebrow">REPORT / INFOGRAPHIC</p>
        <h1 id="infographic-title" lang={systemCase.contentLanguage}>{systemCase.title}</h1>
        <p lang={systemCase.contentLanguage}>{systemCase.objective}</p>
      </header>
      <div className="workspace report-workspace">
        <EvidenceRail evidence={model.evidence} activeEvidenceId={activeEvidenceId} onSelect={setActiveEvidenceId} />
        <CausalCanvas
          edges={model.edges}
          nodes={model.nodes}
          readOnly
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          activeEvidenceId={activeEvidenceId}
          onSelectNode={(id) => {
            setSelectedNodeId(id)
            setSelectedEdgeId("")
          }}
          onSelectEdge={(id) => {
            setSelectedEdgeId(id)
            setSelectedNodeId("")
            const evidenceId = model.edges.find((edge) => edge.id === id)?.data?.evidenceIds[0]
            if (evidenceId) setActiveEvidenceId(evidenceId)
          }}
        />
        <AnalysisRail
          model={model}
          selectedNode={model.nodes.find((node) => node.id === selectedNodeId)?.data}
          selectedNodeLabel={model.nodes.find((node) => node.id === selectedNodeId)?.data.label ?? "No variable selected"}
          selectedEdge={model.edges.find((edge) => edge.id === selectedEdgeId)?.data}
        />
      </div>
      <section className="report-limits panel-surface" aria-labelledby="report-limits-title">
        <h2 id="report-limits-title">Verification and limits</h2>
        <p lang="en">Case status: <strong>{systemCase.status}</strong>. Evidence is not independently verified by this demo.</p>
        <p>Simulation: <strong>{systemCase.simulation.status.replaceAll("_", " ")}</strong>. No numerical output was produced.</p>
        <ul>{systemCase.review.limitations.map((item) => <li lang={systemCase.contentLanguage} key={item}>{item}</li>)}</ul>
        <Link to={`/projects/${DEMO_PROJECT_ID}/systems/${systemId}/app`}>Open App editor</Link>
      </section>
    </section>
  )
}

export function TutorialView({ systemId }: { systemId: string }) {
  const systemCase = useSystemCaseData()
  const [step, setStep] = useState(0)
  const steps: Array<{ title: string; body: string; note: string; bodyLabel?: string; noteLabel?: string; language: string }> = [
    { title: "1. Define the system", body: systemCase.problem, note: systemCase.scope.horizon, bodyLabel: "Problem", noteLabel: "Horizon", language: systemCase.contentLanguage },
    { title: "2. Inspect evidence", body: `${systemCase.evidence.length} evidence item(s) are present.`, note: "Retrieved or illustrative evidence is not automatically a verified fact.", language: "en" },
    { title: "3. Read relationships", body: `${systemCase.variables.length} variables and ${systemCase.relations.length} candidate links.`, note: "Polarity and hypothesis status are shown as text, not only by color.", language: "en" },
    { title: "4. Validate before action", body: `Simulation: ${systemCase.simulation.status.replaceAll("_", " ")}.`, note: "No simulation or external intervention is performed in this demo.", language: "en" },
  ]

  return (
    <section className="system-view tutorial-view" aria-labelledby="tutorial-title">
      <ModeTabs systemId={systemId} active="tutorial" />
      <div className="read-only-banner" role="status">READ ONLY · Same SystemCase revision r{systemCase.revision} · DEMO data</div>
      <header className="view-heading">
        <p className="eyebrow">LEARN / SYSTEMS THINKING</p>
        <h1 id="tutorial-title"><span lang={systemCase.contentLanguage}>{systemCase.title}</span><span lang="en">: guided walkthrough</span></h1>
        <p>This tutorial is a read-only projection. It does not edit the case.</p>
      </header>
      <ol className="tutorial-step-list">
        {steps.map((item, index) => (
          <li key={item.title} className={step === index ? "is-current" : ""}>
            <button className="step-button" type="button" aria-current={step === index ? "step" : undefined} onClick={() => setStep(index)}>{item.title}</button>
            {step === index && <div className="tutorial-step-content"><p>{item.bodyLabel && <span lang="en">{item.bodyLabel}: </span>}<span lang={item.language}>{item.body}</span></p><p>{item.noteLabel && <span lang="en">{item.noteLabel}: </span>}<span lang={item.language}>{item.note}</span></p></div>}
          </li>
        ))}
      </ol>
      <section className="report-limits panel-surface" aria-labelledby="tutorial-model-title">
        <h2 id="tutorial-model-title">Current model summary</h2>
        <ul>{systemCase.variables.map((variable) => <li key={variable.id}><span lang="en">{variable.id}: </span><span lang={systemCase.contentLanguage}>{variable.name}</span><span lang="en"> ({variable.kind}, </span><span lang={systemCase.contentLanguage}>{variable.unit}</span><span lang="en">)</span></li>)}</ul>
        <p>SystemCase revision: <code>r{systemCase.revision}</code></p>
        <Link to={`/projects/${DEMO_PROJECT_ID}/systems/${systemId}/app`}>Open App editor</Link>
      </section>
    </section>
  )
}
