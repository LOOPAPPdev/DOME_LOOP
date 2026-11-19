import { useEffect, useRef } from "react"
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom"
import { AppHeader } from "./components/AppHeader"
import { DEMO_PROJECT_ID, DemoSystemCaseProvider, useSystemCaseData } from "./app/SystemCaseProvider"
import {
  HomeRoute,
  KnowledgeRoute,
  NotFoundRoute,
  ProjectsRoute,
  RunRoute,
  SettingsRoute,
  SystemRoute,
} from "./routes/Pages"

function ApplicationShell() {
  const systemCase = useSystemCaseData()
  const location = useLocation()
  const previousPath = useRef(location.pathname)
  const systemPath = `/projects/${DEMO_PROJECT_ID}/systems/${systemCase.id}/app`

  useEffect(() => {
    const heading = document.querySelector<HTMLHeadingElement>("#main-content h1")
    const pageTitle = heading?.textContent?.trim()
    if (pageTitle) document.title = `${pageTitle} — LOOP Dynamics`
    if (heading && previousPath.current !== location.pathname) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
      heading.scrollIntoView({ block: "start" })
    }
    previousPath.current = location.pathname
  }, [location.pathname, systemCase.title])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <AppHeader />
      <div className="app-layout">
        <aside className="primary-sidebar">
          <nav aria-label="Workspace navigation">
            <Link to="/">Home</Link>
            <Link to="/projects">Projects</Link>
            <Link to={systemPath}>Systems</Link>
            <Link to="/knowledge">Knowledge</Link>
            <Link to={`/projects/${DEMO_PROJECT_ID}/runs/demo-run`}>Runs</Link>
            <Link to="/settings">Settings</Link>
          </nav>
        </aside>
        <main id="main-content" className="page-content" tabIndex={-1}>
          <div className="demo-banner" role="status">
            DEMO MODE — fictional example, in-memory only. No account, live backend, agent run, or private knowledge base is connected.
          </div>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/projects" element={<ProjectsRoute />} />
            <Route path="/projects/:projectId/systems/:systemId/app" element={<SystemRoute mode="app" />} />
            <Route path="/projects/:projectId/systems/:systemId/infographic" element={<SystemRoute mode="infographic" />} />
            <Route path="/projects/:projectId/systems/:systemId/tutorial" element={<SystemRoute mode="tutorial" />} />
            <Route path="/projects/:projectId/runs/:runId" element={<RunRoute />} />
            <Route path="/knowledge" element={<KnowledgeRoute />} />
            <Route path="/settings" element={<SettingsRoute />} />
            <Route path="*" element={<NotFoundRoute />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <DemoSystemCaseProvider>
        <ApplicationShell />
      </DemoSystemCaseProvider>
    </BrowserRouter>
  )
}
