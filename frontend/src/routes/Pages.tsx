import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AnalysisRail } from "../components/AnalysisRail"
import { CausalCanvas } from "../components/CausalCanvas"
import { EvidenceRail } from "../components/EvidenceRail"
import { StatusStrip } from "../components/StatusStrip"
import { DEMO_PROJECT_ID, useSystemCaseData } from "../app/SystemCaseProvider"
import { SystemCaseEditor } from "../features/systems/SystemCaseEditor"
import { projectSystemCase } from "../features/systems/systemCaseProjection"
import { InfographicView, TutorialView } from "../features/reports/ReportViews"

const modeLabels = { app: "App", infographic: "Infographic", tutorial: "Tutorial" } as const
type SystemMode = keyof typeof modeLabels

function SystemModeTabs({ systemId, mode }: { systemId: string; mode: SystemMode }) {
  const root = `/projects/${DEMO_PROJECT_ID}/systems/${systemId}`
  return (
    <nav className="mode-tabs" aria-label="System views">
      <Link aria-current={mode === "app" ? "page" : undefined} to={`${root}/app`}>App</Link>
      <Link aria-current={mode === "infographic" ? "page" : undefined} to={`${root}/infographic`}>Infographic</Link>
      <Link aria-current={mode === "tutorial" ? "page" : undefined} to={`${root}/tutorial`}>Tutorial</Link>
    </nav>
  )
}

export function HomeRoute() {
  const systemCase = useSystemCaseData()
  return (
    <section className="page-section" aria-labelledby="home-title">
      <p className="eyebrow">HOME / DEMO WORKSPACE</p>
      <h1 id="home-title">Trace the mechanism before proposing an intervention.</h1>
      <p>This is a fictional sample case for reviewing the interface. Sign-in, persistence and agent execution are not configured.</p>
      <div className="home-actions">
        <Link className="primary-button button-link" to="/projects">Browse projects</Link>
        <Link className="secondary-button button-link" to={`/projects/${DEMO_PROJECT_ID}/systems/${systemCase.id}/app`}>Open demo system</Link>
      </div>
      <section className="summary-card panel-surface" aria-labelledby="home-case-title">
        <p className="eyebrow">FICTIONAL SYSTEM · REVISION r{systemCase.revision}</p>
        <h2 id="home-case-title" lang={systemCase.contentLanguage}>{systemCase.title}</h2>
        <p lang={systemCase.contentLanguage}>{systemCase.problem}</p>
        <p className="status-text">Simulation: {systemCase.simulation.status.replaceAll("_", " ")}</p>
      </section>
    </section>
  )
}

export function ProjectsRoute() {
  const systemCase = useSystemCaseData()
  const [query, setQuery] = useState("")
  const matches = `${systemCase.title} fictional demo`.toLowerCase().includes(query.toLowerCase())

  return (
    <section className="page-section" aria-labelledby="projects-title">
      <p className="eyebrow">WORKSPACE / PROJECTS</p>
      <h1 id="projects-title">Projects</h1>
      <label className="field-label search-field" htmlFor="project-search">Search projects
        <input id="project-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <p className="demo-inline-note">Project creation and persistence require an authenticated API; this page lists demo data only.</p>
      {matches ? (
        <article className="project-card panel-surface">
          <div>
            <p className="eyebrow">DEMO PROJECT · FICTIONAL</p>
            <h2>LOOP Demo project</h2>
            <p><span lang={systemCase.contentLanguage}>{systemCase.title}</span> · revision r{systemCase.revision}</p>
          </div>
          <Link className="secondary-button button-link" to={`/projects/${DEMO_PROJECT_ID}/systems/${systemCase.id}/app`}>Open system</Link>
        </article>
      ) : <p role="status">No demo projects match “{query}”.</p>}
      <button className="secondary-button" type="button" disabled aria-describedby="create-project-note">Create project (API unavailable)</button>
      <p id="create-project-note" className="field-help">No project is created until an authenticated backend is connected.</p>
    </section>
  )
}

export function SystemRoute({ mode }: { mode: SystemMode }) {
  const { projectId, systemId } = useParams()
  const systemCase = useSystemCaseData()
  const model = projectSystemCase(systemCase)
  const [activeEvidenceId, setActiveEvidenceId] = useState(model.evidence[0]?.id ?? "")
  const [selectedNodeId, setSelectedNodeId] = useState(model.nodes[0]?.id ?? "")
  const [selectedEdgeId, setSelectedEdgeId] = useState("")

  if (projectId !== systemCase.projectId || systemId !== systemCase.id) return <NotFoundRoute />
  if (mode === "infographic") return <InfographicView systemId={systemCase.id} />
  if (mode === "tutorial") return <TutorialView systemId={systemCase.id} />

  function selectNode(id: string) {
    setSelectedNodeId(id)
    setSelectedEdgeId("")
    const node = model.nodes.find((item) => item.id === id)
    if (node?.data.evidenceIds[0]) setActiveEvidenceId(node.data.evidenceIds[0])
  }

  const selectedNode = model.nodes.find((node) => node.id === selectedNodeId)
  return (
    <section className="system-view" aria-labelledby="system-app-title">
      <SystemModeTabs systemId={systemCase.id} mode={mode} />
      <div className="view-heading">
        <p className="eyebrow">APP / CANONICAL SYSTEM EDITOR</p>
        <h1 id="system-app-title" lang={systemCase.contentLanguage}>{systemCase.title}</h1>
        <p lang={systemCase.contentLanguage}>{systemCase.problem}</p>
        <p className="revision-line">SystemCase schema {systemCase.schemaVersion} · workflow {systemCase.workflowVersion} · local revision r{systemCase.revision}</p>
      </div>
      <div className="workspace app-workspace">
        <EvidenceRail evidence={model.evidence} activeEvidenceId={activeEvidenceId} onSelect={setActiveEvidenceId} />
        <CausalCanvas
          edges={model.edges}
          nodes={model.nodes}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          activeEvidenceId={activeEvidenceId}
          onSelectNode={selectNode}
          onSelectEdge={(id) => {
            setSelectedEdgeId(id)
            setSelectedNodeId("")
            const evidenceId = model.edges.find((edge) => edge.id === id)?.data?.evidenceIds[0]
            if (evidenceId) setActiveEvidenceId(evidenceId)
          }}
        />
        <div className="editor-stack">
          <AnalysisRail
            model={model}
            selectedNodeLabel={selectedNode?.data.label ?? "No variable selected"}
            selectedNode={selectedNode?.data}
            selectedEdge={model.edges.find((edge) => edge.id === selectedEdgeId)?.data}
          />
          <SystemCaseEditor />
        </div>
      </div>
      <StatusStrip evidenceCount={model.evidence.length} simulation={model.simulationStatus} revision={systemCase.revision} demo />
      <section className="composer-panel panel-surface" aria-labelledby="composer-title">
        <h2 id="composer-title">Investigation composer</h2>
        <label className="field-label" htmlFor="question-input">Describe a question
          <textarea id="question-input" rows={2} placeholder="Type a question to preserve it in this demo. No investigation will start." />
        </label>
        <button className="primary-button" type="button" disabled aria-describedby="run-unavailable-note">Run analysis (API unavailable)</button>
        <p id="run-unavailable-note" className="field-help">There is no backend session or live run. This control never starts a fake spinner.</p>
      </section>
    </section>
  )
}

export function RunRoute() {
  const { runId, projectId } = useParams()
  return (
    <section className="page-section" aria-labelledby="run-title">
      <p className="eyebrow">RUNS / AUDIT</p>
      <h1 id="run-title">Run trace</h1>
      <div className="empty-state panel-surface" role="status">
        <h2>No live run available</h2>
        <p>Run “{runId}” is not present in the demo. No progress or agent execution is being simulated.</p>
        <p>Project route: {projectId}</p>
      </div>
    </section>
  )
}

export function KnowledgeRoute() {
  const systemCase = useSystemCaseData()
  return (
    <section className="page-section" aria-labelledby="knowledge-title">
      <p className="eyebrow">KNOWLEDGE / PROVENANCE</p>
      <h1 id="knowledge-title">Knowledge and sources</h1>
      <p className="demo-inline-note">The sample below is fictional, not retrieved from the private knowledge base.</p>
      <ul className="knowledge-list">
        {systemCase.evidence.map((item) => <li key={item.id} className="panel-surface"><strong>{item.id} · {item.kind} · {item.status}</strong><p lang={systemCase.contentLanguage}>{item.statement}</p><span lang={item.documentTitle ? systemCase.contentLanguage : "en"}>{item.documentTitle ?? item.sourceId ?? "No external source"}</span></li>)}
      </ul>
    </section>
  )
}

type ThemePreference = "system" | "light" | "dark"

function readThemePreference(): ThemePreference {
  const initialized = document.documentElement.dataset.themePreference
  if (initialized === "system" || initialized === "light" || initialized === "dark") return initialized
  try {
    const stored = window.localStorage.getItem("loop-theme")
    if (stored === "system" || stored === "light" || stored === "dark") return stored
  } catch {
    // Keep the OS default when local storage is unavailable.
  }
  return "system"
}

export function SettingsRoute() {
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference)

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const applyTheme = () => {
      const resolved = themePreference === "system" ? (media.matches ? "dark" : "light") : themePreference
      const root = document.documentElement
      root.dataset.themeChanging = "true"
      root.dataset.theme = resolved
      root.dataset.themePreference = themePreference
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0b1118" : "#fafafa")
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => { delete root.dataset.themeChanging }))
    }
    applyTheme()
    try {
      window.localStorage.setItem("loop-theme", themePreference)
    } catch {
      // The in-memory preference still applies for this page.
    }
    if (themePreference !== "system") return
    media.addEventListener("change", applyTheme)
    return () => media.removeEventListener("change", applyTheme)
  }, [themePreference])

  return (
    <section className="page-section" aria-labelledby="settings-title">
      <p className="eyebrow">SETTINGS / ACCESSIBILITY</p>
      <h1 id="settings-title">Preferences</h1>
      <fieldset className="settings-fieldset panel-surface">
        <legend>Display</legend>
        <label className="field-label" htmlFor="theme-preference">Theme preference
          <select id="theme-preference" value={themePreference} onChange={(event) => setThemePreference(event.target.value as ThemePreference)}>
            <option value="system">System (follows device)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <p className="field-help">Theme preference is stored on this device only; it is not account data.</p>
      </fieldset>
      <p>Session: no authenticated account is connected.</p>
    </section>
  )
}

export function NotFoundRoute() {
  return (
    <section className="page-section" aria-labelledby="not-found-title">
      <p className="eyebrow">ROUTE / NOT FOUND</p>
      <h1 id="not-found-title">This page is unavailable</h1>
      <p>The requested project or system is not part of this fictional demo.</p>
      <Link className="secondary-button button-link" to="/">Return home</Link>
    </section>
  )
}
