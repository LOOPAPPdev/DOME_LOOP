import { useState } from "react";
import type { CSSProperties } from "react";
import source from "./a4-bento-27-cards.data.json";
import "./a4-bento-27-cards.css";

/** Source of truth: JSON data, not the former standalone HTML document. */
export type BentoRole = "macro" | "meso" | "micro";
export type BentoCard = {
  id: string;
  face: number;
  role: BentoRole;
  slot: string;
  title: string;
  sub: string;
  state: string;
  action: string;
};
type View = "all" | "0" | "1" | "2";
type CardTuple = [string, string, string, string];

const SLOTS = [
  "meso-left", "macro", "meso-right",
  "micro-1", "micro-2", "micro-3",
  "micro-4", "micro-5", "micro-6",
] as const;

export const PAGE_GEOMETRY = source.page;

export const BENTO_CARDS: BentoCard[] = source.faces.flatMap((face, faceIndex) =>
  (face.cards as CardTuple[]).map(([title, sub, state, action], index) => ({
    id: String(faceIndex) + "-" + String(index),
    face: faceIndex,
    role: index === 1 ? "macro" : index === 0 || index === 2 ? "meso" : "micro",
    slot: SLOTS[index],
    title,
    sub,
    state,
    action,
  }))
);

const DIMENSIONS: Record<BentoRole, {w: string; h: string}> = {
  macro: { w: "125,33 mm", h: "51,33 mm" },
  meso: { w: "28,33 mm", h: "51,33 mm" },
  micro: { w: "28,33 mm", h: "23,67 mm" },
};

export function createBentoExport() {
  return { page: PAGE_GEOMETRY, cards: BENTO_CARDS };
}

function exportJSON() {
  const json = JSON.stringify(createBentoExport(), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "a4-bento-cleansea-27-cards.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cardPosition(card: BentoCard): CSSProperties | undefined {
  if (card.slot === "meso-left") return { gridColumn: 1 };
  if (card.slot === "meso-right") return { gridColumn: 6 };
  if (card.role === "micro") return { gridColumn: Number(card.slot.split("-")[1]) };
  return undefined;
}

function BentoTile({ card, selected, onSelect }: {
  card: BentoCard;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={"b27-tile b27-" + card.role + (selected ? " b27-selected" : "")}
      data-card-id={card.id}
      data-role={card.role}
      aria-pressed={selected}
      aria-label={card.title + ": " + card.sub + "; " + card.state + "; ação " + card.action}
      style={cardPosition(card)}
      onClick={() => onSelect(card.id)}
    >
      <span className="b27-tile-title">{card.title}</span>
      <span className="b27-tile-sub">{card.sub}</span>
      <span className="b27-tile-state">{card.state}</span>
      <span className="b27-tile-action">{card.action}</span>
    </button>
  );
}

function BentoFace({ index, active, selectedId, onSelect }: {
  index: number;
  active: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const face = source.faces[index];
  const cards = BENTO_CARDS.filter(card => card.face === index);
  return (
    <section
      className={"b27-face" + (active ? " b27-is-active" : "")}
      data-face={index}
      aria-label={face.name + ": " + face.section}
    >
      <span className="b27-face-mark">{face.name} · {face.section}</span>
      <span className="b27-face-number">0{index + 1}/03</span>
      <div className="b27-face-grid">
        {cards.map(card => (
          <BentoTile key={card.id} card={card} selected={card.id === selectedId} onSelect={onSelect}/>
        ))}
      </div>
    </section>
  );
}

function InspectorField({ label, value, action = false }: {
  label: string;
  value: string;
  action?: boolean;
}) {
  return (
    <div className="b27-field">
      <span className="b27-field-label">{label}</span>
      <div className={"b27-field-value" + (action ? " b27-field-action" : "")}>{value}</div>
    </div>
  );
}

function BentoInspector({ card }: {card: BentoCard}) {
  const dimensions = DIMENSIONS[card.role];
  return (
    <aside className="b27-side" aria-label="Inspetor do componente">
      <div className="b27-eyebrow">COMPONENT INSPECTOR</div>
      <h2 id="selected-title">{card.title}</h2>
      <div id="selected-meta" className="b27-tag">FACE {"ABC"[card.face]} · {card.role.toUpperCase()}</div>
      <p>Cada card usa exatamente quatro zonas. A disposição mantém-se em todas as escalas.</p>
      <div className="b27-divider"/>
      <div className="b27-fields">
        <InspectorField label="A · Cabeçalho" value={card.title}/>
        <InspectorField label="B · Contexto" value={card.sub}/>
        <InspectorField label="C · Estado / informação" value={card.state}/>
        <InspectorField label="D · Ação" value={card.action} action/>
      </div>
      <div className="b27-divider"/>
      <div className="b27-eyebrow">GEOMETRIA FIXA</div>
      <div className="b27-tokens">
        <div className="b27-token">Largura<strong>{dimensions.w}</strong></div>
        <div className="b27-token">Altura<strong>{dimensions.h}</strong></div>
        <div className="b27-token">Margem<strong>10 mm</strong></div>
        <div className="b27-token">Gap<strong>4 mm</strong></div>
      </div>
      <div className="b27-buttons">
        <button type="button" className="b27-button" id="print" onClick={() => window.print()}>Imprimir A4</button>
        <button type="button" className="b27-button b27-secondary" id="download" onClick={exportJSON}>Exportar JSON</button>
      </div>
      <p className="b27-foot-note">
        No modo A4, os cards Micro são miniaturas. Escolha uma face para aumentar a escala.
        Para produção, valide a legibilidade mínima na impressão física.
      </p>
    </aside>
  );
}

/** Native React implementation: state and event handlers belong to React. */
export function A4Bento27Cards() {
  const [view, setView] = useState<View>("all");
  const [selectedId, setSelectedId] = useState("0-1");
  const [guides, setGuides] = useState(false);
  const activeCard = BENTO_CARDS.find(card => card.id === selectedId) ?? BENTO_CARDS[1];
  const tabs: Array<{value: View; label: string}> = [
    {value: "all", label: "A4 completo"},
    {value: "0", label: "Face A"},
    {value: "1", label: "Face B"},
    {value: "2", label: "Face C"},
  ];

  return (
    <div
      id="loop-project-runtime"
      className="loop-project-runtime b27-root"
      data-status="ready"
      data-implementation="react-native"
    >
      <div className="b27-shell">
        <header className="b27-head">
          <div>
            <div className="b27-eyebrow">DESIGN SYSTEM / WIREFLOW</div>
            <h1>A4 · Bento operacional</h1>
            <p>3 faces iguais · 9 cards por face · mesma anatomia em 27 componentes</p>
          </div>
          <div className="b27-chips">
            <span className="b27-chip">210 × 297 mm</span>
            <span className="b27-chip">6 colunas × 3 linhas</span>
            <span className="b27-chip">1 Macro + 2 Meso + 6 Micro</span>
          </div>
        </header>
        <div className="b27-workspace">
          <section className="b27-board" aria-label="Protótipo de grelha A4">
            <nav className="b27-toolbar" aria-label="Visualização">
              <div className="b27-tabs" role="group" aria-label="Escala de visualização">
                {tabs.map(tab => (
                  <button
                    key={tab.value}
                    type="button"
                    className="b27-tab"
                    data-view={tab.value}
                    aria-pressed={view === tab.value}
                    onClick={() => setView(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <label className="b27-switch">
                <input type="checkbox" id="gridlines" checked={guides} onChange={event => setGuides(event.target.checked)}/>
                Guias
              </label>
            </nav>
            <div className="b27-stage">
              <div
                id="paper"
                className={"b27-paper" + (view !== "all" ? " b27-focus" : "") + (guides ? " b27-gridlines" : "")}
                role="group"
                aria-label="Folha A4 com 27 cards"
                data-view={view}
              >
                {source.faces.map((face, index) => (
                  <BentoFace
                    key={face.name}
                    index={index}
                    active={view === "all" || view === String(index)}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                ))}
              </div>
            </div>
            <footer className="b27-legend">
              <span><strong>Macro</strong> 1 × 4 col. / 2 lin. · <strong>Meso</strong> 2 × 1 col. / 2 lin. · <strong>Micro</strong> 6 × 1 cel.</span>
              <span>Margem: 10 mm · Gap: 4 mm · Faces: 99 mm</span>
            </footer>
          </section>
          <BentoInspector card={activeCard}/>
        </div>
      </div>
    </div>
  );
}

export default A4Bento27Cards;
