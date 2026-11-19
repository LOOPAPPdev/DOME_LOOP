type StatusStripProps = {
  evidenceCount: number
  simulation: "not_performed" | "blocked" | "validated"
  revision: string
  demo: boolean
}

export function StatusStrip({ evidenceCount, simulation, revision, demo }: StatusStripProps) {
  return (
    <footer className="status-strip" aria-label="System status">
      <div className="status-item"><span className="status-key">EVIDENCE</span><strong>{String(evidenceCount).padStart(2, "0")} record(s)</strong></div>
      <div className="status-item"><span className="status-key">CASE</span><strong>revision r{revision}{demo ? " · local demo" : ""}</strong></div>
      <div className="status-item status-warning"><span className="status-key">SIMULATION</span><strong>{simulation === "validated" ? "validated" : simulation === "blocked" ? "blocked by gate" : "not performed"}</strong></div>
      <div className="status-item status-end"><span className="status-key">RUN</span><strong>{demo ? "no live run" : "status unavailable"}</strong></div>
    </footer>
  )
}
