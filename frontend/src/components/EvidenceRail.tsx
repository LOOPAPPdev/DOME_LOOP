import type { EvidenceItem } from "../data/analysis"

type EvidenceRailProps = {
  evidence: EvidenceItem[]
  activeEvidenceId: string
  onSelect: (id: string) => void
}

export function EvidenceRail({ evidence, activeEvidenceId, onSelect }: EvidenceRailProps) {
  return (
    <aside className="evidence-rail panel-surface">
      <div className="section-heading">
        <div>
          <p className="eyebrow">01 / TRACE</p>
          <h2>Evidence ledger</h2>
        </div>
        <span className="count-badge">{String(evidence.length).padStart(2, "0")}</span>
      </div>
      <p className="muted-copy">Primary sources linked to the current causal hypothesis.</p>
      <div className="evidence-list">
        {evidence.map((item) => (
          <button
            className={`evidence-card ${activeEvidenceId === item.id ? "is-active" : ""}`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <span className="evidence-card-topline">
              <span className="evidence-id">{item.id}</span>
              <span className="evidence-kind">{item.kind}</span>
            </span>
            <strong>{item.source}</strong>
            <span className="evidence-location">{item.location}</span>
            <span className="evidence-quote">“{item.quote}”</span>
          </button>
        ))}
      </div>
      <div className="rail-footer">
        <span className="lock-icon">◈</span>
        <span>ACL filter: <strong>public</strong></span>
      </div>
    </aside>
  )
}
