type AppHeaderProps = {
  confidence: number
}

export function AppHeader({ confidence }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          L
        </div>
        <div>
          <p className="eyebrow">LOOP DYNAMICS / MANUS</p>
          <h1>Evidence console</h1>
        </div>
      </div>
      <div className="header-meta">
        <span className="live-dot" />
        <span>LOCAL ANALYSIS</span>
        <span className="header-divider" />
        <span>confidence {Math.round(confidence * 100)}%</span>
        <button className="ghost-button" type="button">
          Export handoff
        </button>
      </div>
    </header>
  )
}
