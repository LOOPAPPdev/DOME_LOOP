type StatusStripProps = {
  evidenceCount: number
  simulation: "not_performed" | "validated"
}

export function StatusStrip({ evidenceCount, simulation }: StatusStripProps) {
  return (
    <footer className="status-strip">
      <div className="status-item"><span className="status-key">EVIDENCE</span><strong>{String(evidenceCount).padStart(2, "0")} anchors</strong></div>
      <div className="status-item"><span className="status-key">MODEL</span><strong>qualitative / v0.1</strong></div>
      <div className="status-item status-warning"><span className="status-key">SIMULATION</span><strong>{simulation === "not_performed" ? "not performed" : "validated"}</strong></div>
      <div className="status-item status-end"><span className="status-key">LAST RUN</span><strong>just now · local</strong></div>
    </footer>
  )
}
