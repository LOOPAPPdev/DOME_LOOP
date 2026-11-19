import { useState, type FormEvent } from "react"
import type { AnalysisModel } from "../data/analysis"

type AnalysisRailProps = {
  model: AnalysisModel
  selectedNodeLabel: string
  loading: boolean
  error: string | null
  onSubmit: (question: string) => Promise<void>
}

export function AnalysisRail({ model, selectedNodeLabel, loading, error, onSubmit }: AnalysisRailProps) {
  const [question, setQuestion] = useState(model.question)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (question.trim()) await onSubmit(question.trim())
  }

  return (
    <aside className="analysis-rail panel-surface">
      <div className="section-heading">
        <div>
          <p className="eyebrow">03 / SYNTHESIS</p>
          <h2>Analyst notes</h2>
        </div>
        <span className="confidence-ring">{Math.round(model.confidence * 100)}</span>
      </div>
      <div className="question-block">
        <span className="label">QUESTION</span>
        <form onSubmit={handleSubmit}>
          <input aria-label="Analysis question" value={question} onChange={(event) => setQuestion(event.target.value)} />
          <button className="ghost-button" disabled={loading} type="submit">{loading ? "Running…" : "Run analysis"}</button>
        </form>
        {error ? <p role="alert">{error}</p> : null}
      </div>
      <div className="answer-block">
        <span className="label">GROUNDED READOUT</span>
        <p>{model.answer}</p>
      </div>
      <div className="selected-node">
        <span className="label">FOCUSED NODE</span>
        <strong>{selectedNodeLabel}</strong>
        <span>4 linked relationships · 2 evidence anchors</span>
      </div>
      <div className="notes-section">
        <span className="label">HYPOTHESES TO TEST</span>
        {model.hypotheses.map((hypothesis) => <p className="note-line" key={hypothesis}>{hypothesis}</p>)}
      </div>
      <div className="notes-section">
        <span className="label">REVERSIBLE MOVES</span>
        {model.interventions.map((intervention) => <p className="note-line intervention" key={intervention}>{intervention}</p>)}
      </div>
    </aside>
  )
}
