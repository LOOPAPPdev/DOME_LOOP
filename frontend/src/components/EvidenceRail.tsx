import type { EvidenceItem } from "../data/analysis"

type EvidenceRailProps = {
  evidence: EvidenceItem[]
  activeEvidenceId: string
  onSelect: (id: string) => void
}

export function EvidenceRail({ evidence, activeEvidenceId, onSelect }: EvidenceRailProps) {
  return (
    <aside className="evidence-rail panel-surface" aria-label="Evidence and provenance">
      <div className="section-heading">
        <div>
          <p className="eyebrow">01 / TRACE</p>
          <h2>Evidence</h2>
        </div>
        <span className="count-badge">{String(evidence.length).padStart(2, "0")}</span>
      </div>
      <p className="muted-copy">Fictional demonstration records. Retrieval does not establish truth.</p>
      <div className="evidence-list">
        {evidence.length ? evidence.map((item) => (
          <button
            aria-pressed={activeEvidenceId === item.id}
            className={`evidence-card ${activeEvidenceId === item.id ? "is-active" : ""}`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <span className="evidence-card-topline">
              <span className="evidence-id">{item.id}</span>
              <span className="evidence-kind" lang="en">{item.kind} · {item.status}</span>
            </span>
            <strong lang={item.language}>{item.source}</strong>
            {item.sourceId && <span className="evidence-location" lang="en">Source ID: {item.sourceId}</span>}
            <span className="evidence-location" lang={item.language}>{item.location}</span>
            <span className="evidence-quote" lang={item.language}>{item.quote}</span>
          </button>
        )) : <p role="status">No evidence is attached to this case.</p>}
      </div>
      <div className="rail-footer">
        <span className="lock-icon" aria-hidden="true">◈</span>
        <span>Demo only · source authorization not evaluated</span>
      </div>
    </aside>
  )
}
