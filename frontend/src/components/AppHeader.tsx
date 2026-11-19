import { useState } from "react"
import { NavLink } from "react-router-dom"
import { DEMO_PROJECT_ID, useSystemCaseData } from "../app/SystemCaseProvider"

export function AppHeader() {
  const systemCase = useSystemCaseData()
  const systemPath = `/projects/${DEMO_PROJECT_ID}/systems/${systemCase.id}/app`
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">L</div>
        <div>
          <p className="eyebrow">LOOP DYNAMICS</p>
          <p className="brand-title">Systems workspace</p>
        </div>
      </div>
      <div className="header-meta">
        <span className="demo-badge" role="status">DEMO · NOT LIVE</span>
        <span>Revision r{systemCase.revision}</span>
        <span>No authenticated session</span>
      </div>
      <button
        className="mobile-nav-toggle"
        type="button"
        aria-expanded={mobileMenuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMobileMenuOpen((open) => !open)}
      >
        {mobileMenuOpen ? "Close menu" : "Open menu"}
      </button>
      <nav id="primary-navigation" className={`top-nav ${mobileMenuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
        <NavLink to="/" end onClick={closeMobileMenu}>Home</NavLink>
        <NavLink to="/projects" onClick={closeMobileMenu}>Projects</NavLink>
        <NavLink to={systemPath} onClick={closeMobileMenu}>System</NavLink>
        <NavLink to="/knowledge" onClick={closeMobileMenu}>Knowledge</NavLink>
        <NavLink to={`/projects/${DEMO_PROJECT_ID}/runs/demo-run`} onClick={closeMobileMenu}>Runs</NavLink>
        <NavLink to="/settings" onClick={closeMobileMenu}>Settings</NavLink>
      </nav>
    </header>
  )
}
