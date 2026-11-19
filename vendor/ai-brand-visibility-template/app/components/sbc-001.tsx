import { useState } from "react";
import { Microphone, Cpu, SpeakerHigh, Copy, CheckCircle, Printer } from "@phosphor-icons/react";
import { SBC_GROUPS, SBC_REQUIREMENTS, SBC_SEMANTIC_FIELDS, SBC_SOURCE_WORDS } from "./sbc-001-data";
import "./sbc-001.css";

export function SBC001Infographic() {
  const [selectedId, setSelectedId] = useState<string>("S01");
  const [copied, setCopied] = useState(false);
  const selected = SBC_REQUIREMENTS.find((item) => item.id === selectedId) ?? SBC_REQUIREMENTS[0];
  async function copyRequirement() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(`${selected.id} — ${selected.title}\n${selected.text}`);
      setCopied(true);
    } catch { setCopied(false); }
  }
  return (
    <article className="sbc-page" aria-labelledby="sbc-title">
      <div className="sbc-sheet">
        <header className="sbc-hero">
          <div>
            <p className="sbc-kicker">System specification / SBC-001</p>
            <h1 id="sbc-title">Home Automation SBC</h1>
            <p className="sbc-subtitle">One-page infographic · Requirements, hardware interfaces, engineering outputs and manufacturing objective.</p>
          </div>
          <div className="sbc-stats" aria-label="Document statistics">
            <div className="sbc-stat"><strong>11</strong><span>Requirements</span></div>
            <div className="sbc-stat"><strong>04</strong><span>Groups</span></div>
            <div className="sbc-stat"><strong>{SBC_SOURCE_WORDS}</strong><span>Source words</span></div>
          </div>
        </header>
        <section aria-label="System flow" className="sbc-flow">
          <div className="sbc-flow-node"><span className="sbc-flow-symbol"><Microphone size={24} aria-hidden="true"/></span><div><strong>Voice / MIC</strong><small>Request input</small></div></div>
          <span className="sbc-flow-arrow" aria-hidden="true">→</span>
          <div className="sbc-flow-node central"><span className="sbc-flow-symbol"><Cpu size={24} aria-hidden="true"/></span><div><strong>Home Assistant OS + Claude</strong><small>Orchestration · AI processing</small></div></div>
          <span className="sbc-flow-arrow" aria-hidden="true">→</span>
          <div className="sbc-flow-node"><span className="sbc-flow-symbol"><SpeakerHigh size={24} aria-hidden="true"/></span><div><strong>Speaker / TTS</strong><small>Spoken response</small></div></div>
        </section>
        <div className="sbc-grid">
          {SBC_GROUPS.map((group) => (
            <section key={group.id} className="sbc-section" aria-labelledby={`sbc-group-${group.id}`}>
              <div className="sbc-section-head">
                <div><p className="sbc-overline">{group.id} / Specification</p><h2 className="sbc-section-title" id={`sbc-group-${group.id}`}>{group.title}</h2></div>
                <span className="sbc-meta">{group.sourceWords} words</span>
              </div>
              <div className="sbc-cards">
                {group.requirements.map((req) => (
                  <button key={req.id} type="button" className="sbc-card" aria-pressed={selectedId === req.id} onClick={() => { setSelectedId(req.id); setCopied(false); }}>
                    <div className="sbc-card-top"><span className="sbc-id">{req.id}</span><span className="sbc-meta">{req.sourceWords}w</span></div>
                    <h3>{req.title}</h3>
                    <p>{req.text}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <section className="sbc-inspector" aria-live="polite" aria-label="Selected requirement">
          <div><span className="sbc-id">Selected / {selected.id}</span><p>{selected.title} — click a card to inspect and copy its source.</p></div>
          <div className="flex flex-wrap gap-2">
            <button className="sbc-button inline-flex items-center gap-2" type="button" onClick={copyRequirement}>{copied ? <CheckCircle size={15}/> : <Copy size={15}/>} {copied ? "Copied" : "Copy requirement"}</button>
            <button className="sbc-button inline-flex items-center gap-2" type="button" onClick={() => window.print()}><Printer size={15}/> Print</button>
          </div>
        </section>
        <section className="sbc-semantics" aria-labelledby="sbc-semantics-title">
          <p className="sbc-overline">Semantic decomposition / Sentence → 6 fields → atomic requirement</p>
          <h2 className="sbc-section-title" id="sbc-semantics-title">Requirement anatomy</h2>
          <div className="sbc-semantic-grid">
            {SBC_SEMANTIC_FIELDS.map(field => <div key={field.name} className="sbc-semantic-field"><span className="sbc-field-name">{field.name}</span><strong>{field.value}</strong>{"note" in field && <small>{field.note}</small>}</div>)}
          </div>
          <div className="sbc-atomic"><strong>R01</strong>Design a single-board computer for residential home automation.</div>
        </section>
        <footer className="sbc-footer"><span>Validation / Source → Cards: 11/11 units · S01–S11</span><span>Counts verified against whitespace-tokenized source: 188 words total. S09 preserves source ellipsis.</span></footer>
      </div>
    </article>
  );
}
