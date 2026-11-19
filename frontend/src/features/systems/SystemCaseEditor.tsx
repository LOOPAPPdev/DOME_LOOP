import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { useSaveDemoSystemCase, useSystemCaseData } from "../../app/SystemCaseProvider"
import type { LinkPolarity, SystemCase } from "../../contracts/systemCase"

export function SystemCaseEditor() {
  const savedCase = useSystemCaseData()
  const saveDemoRevision = useSaveDemoSystemCase()
  const [draft, setDraft] = useState<SystemCase>(savedCase)
  const [savedMessage, setSavedMessage] = useState("")

  useEffect(() => {
    setDraft(savedCase)
  }, [savedCase])

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(savedCase)
  const updateText = (key: "title" | "problem" | "objective", value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setSavedMessage("")
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveDemoRevision(draft)
    setSavedMessage("Local demo revision saved in this tab. No backend was called.")
  }

  function updateVariable(index: number, name: string) {
    setDraft((current) => ({
      ...current,
      variables: current.variables.map((variable, itemIndex) =>
        itemIndex === index ? { ...variable, name } : variable,
      ),
    }))
    setSavedMessage("")
  }

  function updatePolarity(index: number, polarity: LinkPolarity) {
    setDraft((current) => ({
      ...current,
      relations: current.relations.map((relation, itemIndex) => itemIndex === index ? { ...relation, polarity } : relation),
    }))
    setSavedMessage("")
  }

  return (
    <section className="editor-panel panel-surface" aria-labelledby="system-editor-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">APP / EDITOR</p>
          <h2 id="system-editor-title">SystemCase editor</h2>
        </div>
        <span className="revision-chip">r{savedCase.revision}</span>
      </div>
      <p className="demo-inline-note">Demo only: edits stay in memory and are not sent to a server.</p>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="case-name">System name</label>
        <input id="case-name" lang={savedCase.contentLanguage} required value={draft.title} onChange={(event) => updateText("title", event.target.value)} />

        <label className="field-label" htmlFor="case-problem">Problem</label>
        <textarea id="case-problem" lang={savedCase.contentLanguage} required rows={3} value={draft.problem} onChange={(event) => updateText("problem", event.target.value)} />

        <label className="field-label" htmlFor="case-objective">Objective</label>
        <textarea id="case-objective" lang={savedCase.contentLanguage} required rows={3} value={draft.objective} onChange={(event) => updateText("objective", event.target.value)} />

        <fieldset className="editor-fieldset">
          <legend>Variables</legend>
          {draft.variables.map((variable, index) => (
            <label className="field-label" key={variable.id} htmlFor={`variable-${variable.id}`}>
              <span lang="en">{variable.id} · {variable.kind} · </span><span lang={savedCase.contentLanguage}>{variable.unit}</span>
              <input id={`variable-${variable.id}`} lang={savedCase.contentLanguage} value={variable.name} onChange={(event) => updateVariable(index, event.target.value)} />
            </label>
          ))}
        </fieldset>

        <fieldset className="editor-fieldset">
          <legend>Relationship polarity</legend>
          {draft.relations.map((relation, index) => (
            <label className="field-label polarity-field" key={relation.id} htmlFor={`polarity-${relation.id}`}>
              {relation.id}: {relation.sourceId} → {relation.targetId}
              <select id={`polarity-${relation.id}`} value={relation.polarity} onChange={(event) => updatePolarity(index, event.target.value as LinkPolarity)}>
                <option value="+">Positive (+)</option>
                <option value="-">Negative (−)</option>
                <option value="unknown">Unknown</option>
              </select>
              <span className="field-help">Validation remains {relation.status}; editing a sign does not verify causality.</span>
            </label>
          ))}
        </fieldset>

        <div className="editor-actions">
          <button className="primary-button" type="submit" disabled={!hasChanges}>Save local demo revision</button>
          <button className="secondary-button" type="button" disabled={!hasChanges} onClick={() => { setDraft(savedCase); setSavedMessage("") }}>Discard</button>
        </div>
        <p className="form-feedback" role="status" aria-live="polite">{savedMessage}</p>
      </form>
    </section>
  )
}
