import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import initialPrompts from "./prompt-library.data.json";
import {
  LIBRARY_STORAGE_KEY, MAX_CSV_BYTES, MAX_LIBRARY_ITEMS, PROMPT_COLUMNS,
  applyCsvImport, exportPromptCsv, normalizeId, normalizeLabel,
  parsePromptCsv, validateLibrary, validatePrompt,
} from "./prompt-library-csv";
import type { CsvPreview, ImportMode, PromptEntry } from "./prompt-library-csv";
import "./prompt-library.css";
import { SecondBrain } from "./second-brain";

const SEED: PromptEntry[] = validateLibrary(initialPrompts);
const BLANK: PromptEntry = {id: "", segment: "", title: "", address: "", description: "", body: ""};
type View = "directory" | "bento";
type Dialog = null | "editor" | "import" | "delete" | "restore";
type DraftMode = "new" | "edit";
type PendingImport = CsvPreview & {fileName: string};

function downloadText(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], {type: mime}));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readFilter(value: string) {
  return normalizeLabel(value);
}

function PromptCard({item, active, onSelect}: {item: PromptEntry; active: boolean; onSelect: () => void}) {
  return (
    <button
      className="pb-tile"
      type="button"
      aria-label={"Ativar " + item.id + " · " + item.title}
      aria-pressed={active}
      data-id={item.id}
      onClick={onSelect}
    >
      <span className="pb-tile-title"><span>{item.title}</span></span>
      <span className="pb-tile-top">
        <span className="pb-id">{item.id}</span>
        <span className="pb-pos pb-muted">{item.address}</span>
      </span>
      <span className="pb-tile-context">
        <span className="pb-tile-desc">{item.description || item.segment}</span>
      </span>
      <span className="pb-tile-action">{active ? "Ativo" : "Abrir prompt"}</span>
    </button>
  );
}

function PromptEditor({mode, draft, onChange, onCancel, onSubmit, errors}: {
  mode: DraftMode;
  draft: PromptEntry;
  onChange: (next: PromptEntry) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  errors: string[];
}) {
  const update = (key: keyof PromptEntry, value: string) => onChange({...draft, [key]: value});
  const fields: Array<{key: keyof PromptEntry;label:string;required?:boolean;placeholder:string}> = [
    {key:"id",label:"ID",required:true,placeholder:"Ex. EX-001"},
    {key:"segment",label:"Segmento",placeholder:"Ex. Estratégia"},
    {key:"title",label:"Título",required:true,placeholder:"Nome do prompt"},
    {key:"address",label:"Endereço / posição",placeholder:"Ex. A4"},
    {key:"description",label:"Descrição",placeholder:"Descrição curta para Bento"},
  ];
  return (
    <form onSubmit={onSubmit} className="pb-editor-form">
      <div className="pb-dialog-header">
        <div>
          <div className="pb-overline">EDITOR DE PROMPTS</div>
          <h2 id="pb-dialog-title">{mode === "new" ? "Novo prompt" : "Editar prompt"}</h2>
          <p>Defina os campos que aparecem no Diretório, no Bento e na leitura completa.</p>
        </div>
        <button type="button" aria-label="Fechar editor" onClick={onCancel}>Fechar</button>
      </div>
      <div className="pb-editor-grid">
        {fields.map(field => (
          <label key={field.key} className={"pb-editor-field pb-editor-" + field.key}>
            {field.label}{field.required ? " *" : ""}
            <input
              name={field.key}
              required={field.required}
              maxLength={field.key === "description" ? 1200 : field.key === "title" ? 160 : 120}
              value={draft[field.key]}
              onChange={event => update(field.key, event.target.value)}
              placeholder={field.placeholder}
              autoComplete="off"
            />
          </label>
        ))}
        <label className="pb-editor-field pb-editor-body">
          Conteúdo integral do prompt *
          <textarea
            name="body"
            required
            rows={11}
            maxLength={100000}
            spellCheck={false}
            value={draft.body}
            placeholder="Escreva o prompt completo ou importe um CSV."
            onChange={event => update("body", event.target.value)}
          />
        </label>
      </div>
      {errors.length > 0 && <div role="alert" className="pb-errors">{errors.join(" ")}</div>}
      <div className="pb-dialog-actions">
        <button type="button" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="pb-primary">Guardar prompt</button>
      </div>
    </form>
  );
}

function ImportPreview({pending, current, mode, onMode, confirmed, onConfirm, onApply, onCancel}: {
  pending: PendingImport;
  current: PromptEntry[];
  mode: ImportMode;
  onMode: (mode: ImportMode) => void;
  confirmed: boolean;
  onConfirm: (checked: boolean) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const existingIds = new Set(current.map(item => normalizeId(item.id)));
  const updates = pending.entries.filter(item => existingIds.has(normalizeId(item.id))).length;
  const additions = pending.entries.length - updates;
  const finalCount = mode === "merge" ? current.length + additions : pending.entries.length;
  const limitExceeded = finalCount > MAX_LIBRARY_ITEMS;

  return (
    <div>
      <div className="pb-dialog-header">
        <div>
          <div className="pb-overline">IMPORTAÇÃO CSV · PRÉ-VISUALIZAÇÃO</div>
          <h2 id="pb-dialog-title">Confirmar importação</h2>
          <p>{pending.fileName} · {pending.entries.length} registos válidos · separador {pending.separator === "\t" ? "tabulação" : pending.separator}</p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Fechar importação">Fechar</button>
      </div>
      <div className="pb-import-stats">
        <span><strong>{additions}</strong> novos</span>
        <span><strong>{updates}</strong> IDs existentes</span>
        <span><strong>{finalCount}</strong> resultado previsto</span>
      </div>
      <fieldset className="pb-import-modes">
        <legend>Como aplicar os dados?</legend>
        <label className="pb-radio"><input type="radio" name="pb-import-mode" value="merge" checked={mode === "merge"} onChange={() => onMode("merge")}/><span><strong>Adicionar / atualizar</strong>Preserva os outros prompts. IDs iguais serão atualizados.</span></label>
        <label className="pb-radio"><input type="radio" name="pb-import-mode" value="replace" checked={mode === "replace"} onChange={() => onMode("replace")}/><span><strong>Substituir biblioteca</strong>Remove todos os prompts ausentes do CSV.</span></label>
      </fieldset>
      {mode === "replace" && (
        <label className="pb-confirm">
          <input id="pb-confirm-replace" type="checkbox" checked={confirmed} onChange={event => onConfirm(event.target.checked)}/>
          Confirmo a substituição da biblioteca atual.
        </label>
      )}
      {pending.warnings.length > 0 && <div className="pb-notice" role="note">{pending.warnings.map((warning,i) => <p key={i}>{warning}</p>)}</div>}
      {limitExceeded && <div role="alert" className="pb-errors">O resultado excede o limite de {MAX_LIBRARY_ITEMS} prompts.</div>}
      <div className="pb-preview-table" role="region" aria-label="Pré-visualização CSV">
        <table><thead><tr><th>ID</th><th>Segmento</th><th>Prompt</th></tr></thead>
          <tbody>{pending.entries.slice(0, 6).map(item => (
            <tr key={item.id}><td>{item.id}</td><td>{item.segment}</td><td>{item.title}</td></tr>
          ))}</tbody>
        </table>
      </div>
      {pending.entries.length > 6 && <p className="pb-dialog-muted">A mostrar 6 de {pending.entries.length} registos antes da aplicação.</p>}
      <div className="pb-dialog-actions">
        <button type="button" onClick={onCancel}>Cancelar</button>
        <button type="button" className="pb-primary" disabled={limitExceeded || (mode === "replace" && !confirmed)} onClick={onApply}>Aplicar CSV</button>
      </div>
    </div>
  );
}

export function PromptLibrary() {
  const [items, setItems] = useState<PromptEntry[]>(SEED);
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [activeId, setActiveId] = useState(SEED[0].id);
  const [view, setView] = useState<View>("directory");
  const [section, setSection] = useState<"prompts" | "knowledge">("prompts");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [draftMode, setDraftMode] = useState<DraftMode>("new");
  const [draft, setDraft] = useState<PromptEntry>(BLANK);
  const [draftErrors, setDraftErrors] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLPreElement>(null);
  const readerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (saved !== null) {
        const parsed = validateLibrary(JSON.parse(saved));
        setItems(parsed);
        setActiveId(parsed[0]?.id || "");
      }
    } catch (error) {
      console.error("Biblioteca local inválida:", error);
      setStorageBlocked(true);
      setStatus("Não foi possível ler os dados guardados. A cópia local não foi alterada. Exporte os dados antes de os substituir.");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready || storageBlocked) return;
    try {
      window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(items));
    } catch {
      setStatus("Não foi possível guardar neste navegador (armazenamento indisponível ou cheio). Exporte um CSV de segurança.");
    }
  }, [items, ready, storageBlocked]);

  useEffect(() => {
    if (promptRef.current) promptRef.current.scrollTop = 0;
  }, [activeId]);

  useEffect(() => {
    if (!dialog) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [dialog]);

  const current = items.find(item => item.id === activeId) || items[0] || null;
  const filtered = useMemo(() => {
    const needle = readFilter(query.trim());
    if (!needle) return items;
    return items.filter(item => readFilter([item.id, item.segment, item.title, item.address].join(" ")).includes(needle));
  }, [items, query]);
  const pageSize = view === "bento" ? 9 : 8;
  const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const start = safePage * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  function selectPrompt(item: PromptEntry) {
    setActiveId(item.id);
    setStatus(item.id + " ativo.");
    if (window.matchMedia("(max-width: 680px)").matches) {
      window.setTimeout(() => readerRef.current?.scrollIntoView({block:"nearest", behavior:"smooth"}), 0);
    }
  }

  function onActivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const exact = filtered.find(item => normalizeId(item.id) === normalizeId(query));
    const target = exact || (filtered.length === 1 ? filtered[0] : null);
    if (target) selectPrompt(target);
    else setStatus(filtered.length ? "Escolha um ID da lista." : "Nenhum ID corresponde à pesquisa.");
  }

  function changeView(next: View) {
    setView(next);
    setPage(0);
  }

  function tabKeys(event: KeyboardEvent<HTMLButtonElement>, next: View) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const chosen = next === "directory" ? "bento" : "directory";
      changeView(chosen);
      document.getElementById(chosen === "directory" ? "pb-directory-tab" : "pb-bento-tab")?.focus();
    }
  }

  async function copyPrompt() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.body);
      setStatus(current.id + " copiado.");
    } catch {
      if (!promptRef.current) return;
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(promptRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
      let copied = false;
      try { copied = document.execCommand("copy"); } catch { /* iPad permits manual copy */ }
      setStatus(copied ? current.id + " copiado." : "Texto selecionado. Use Copiar no dispositivo.");
    }
  }

  function newPrompt() {
    setDraftMode("new");
    setDraft({...BLANK});
    setDraftErrors([]);
    setDialog("editor");
  }
  function editPrompt() {
    if (!current) return;
    setDraftMode("edit");
    setDraft({...current});
    setDraftErrors([]);
    setDialog("editor");
  }

  function savePrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prepared: PromptEntry = {
      ...draft,
      id: draft.id.trim(),
      segment: draft.segment.trim() || "Sem segmento",
      title: draft.title.trim(),
      address: draft.address.trim(),
      description: draft.description.trim(),
      body: draft.body,
    };
    const issues = validatePrompt(prepared);
    if (items.some(item => normalizeId(item.id) === normalizeId(prepared.id) && (draftMode === "new" || item.id !== activeId))) {
      issues.push("Já existe um prompt com este ID.");
    }
    if (issues.length) { setDraftErrors(issues); return; }
    setStorageBlocked(false);
    if (draftMode === "edit") {
      setItems(previous => previous.map(item => item.id === activeId ? prepared : item));
    } else {
      if (items.length >= MAX_LIBRARY_ITEMS) { setDraftErrors(["A biblioteca atingiu o limite de 1.000 prompts."]); return; }
      setItems(previous => [...previous, prepared]);
    }
    setActiveId(prepared.id);
    setQuery("");
    setPage(0);
    setStatus(prepared.id + " guardado neste navegador.");
    setDialog(null);
  }

  function deletePrompt() {
    if (!current) return;
    const removed = current.id;
    const next = items.filter(item => item.id !== removed);
    setStorageBlocked(false);
    setItems(next);
    setActiveId(next[0]?.id || "");
    setQuery("");
    setPage(0);
    setStatus(removed + " eliminado da biblioteca local.");
    setDialog(null);
  }

  function restoreSeed() {
    setStorageBlocked(false);
    setItems(SEED.slice());
    setActiveId(SEED[0].id);
    setQuery("");
    setPage(0);
    setStatus("Os 30 prompts originais foram restaurados neste navegador.");
    setDialog(null);
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) {
      setStatus("O CSV excede o limite de 4 MB.");
      return;
    }
    try {
      const content = await file.text();
      const parsed = parsePromptCsv(content);
      setPending({...parsed, fileName:file.name});
      setImportMode("merge");
      setReplaceConfirmed(false);
      setDialog("import");
      setStatus("CSV validado. Confirme a aplicação dos dados.");
    } catch (error) {
      setPending(null);
      setDialog(null);
      setStatus(error instanceof Error ? "Erro no CSV: " + error.message : "Não foi possível ler o CSV.");
    }
  }

  function applyImport() {
    if (!pending) return;
    if (importMode === "replace" && !replaceConfirmed) return;
    try {
      const next = applyCsvImport(items, pending.entries, importMode);
      setStorageBlocked(false);
      setItems(next);
      setActiveId(pending.entries[0]?.id || next[0]?.id || "");
      setQuery("");
      setPage(0);
      setStatus(pending.entries.length + " registos importados (" + importMode + "). Guardados neste navegador.");
      setPending(null);
      setDialog(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha na importação.");
    }
  }

  function exportCSV() {
    downloadText(exportPromptCsv(items), "biblioteca-bento.csv", "text/csv;charset=utf-8");
    setStatus(items.length + " prompts exportados para CSV.");
  }
  function exportTemplate() {
    downloadText("\uFEFF" + PROMPT_COLUMNS.join(";") + "\r\n", "biblioteca-bento-modelo.csv", "text/csv;charset=utf-8");
  }

  return (
    <div id="loop-project-runtime" className="loop-project-runtime pb-runtime" data-status="ready" data-implementation="react-native">
      <div id="prompt-bento-app" data-section={section}>
        <header className="pb-header">
          <div className="pb-brand">
            <span className="pb-mark" aria-hidden="true"><i/><i/><i/><i/></span>
            <div><h1>Second Brain · Biblioteca Bento</h1><span className="pb-header-meta">{items.length} prompts · Markdown · Mermaid · planilhas</span></div>
          </div>
          {section === "prompts" && <nav className="pb-nav" role="tablist" aria-label="Vistas da biblioteca">
            <button type="button" role="tab" id="pb-directory-tab" aria-controls="pb-directory" aria-selected={view === "directory"} tabIndex={view === "directory" ? 0 : -1} onKeyDown={event => tabKeys(event,"directory")} onClick={() => changeView("directory")}>Diretório</button>
            <button type="button" role="tab" id="pb-bento-tab" aria-controls="pb-bento" aria-selected={view === "bento"} tabIndex={view === "bento" ? 0 : -1} onKeyDown={event => tabKeys(event,"bento")} onClick={() => changeView("bento")}>Bento</button>
          </nav>}
        </header>
        <div className="pb-body">
          <div className="pb-workspace-modes" role="group" aria-label="Áreas do Second Brain">
            <button type="button" aria-pressed={section === "prompts"} onClick={() => setSection("prompts")}>Prompts</button>
            <button type="button" aria-pressed={section === "knowledge"} onClick={() => setSection("knowledge")}>Documentos e conhecimento</button>
          </div>
          <div hidden={section !== "prompts"}>
          <div className="pb-managebar" role="group" aria-label="Gestão da biblioteca">
            <button type="button" className="pb-primary" id="pb-new" onClick={newPrompt}>+ Novo prompt</button>
            <button type="button" id="pb-import" onClick={() => csvRef.current?.click()}>Importar CSV</button>
            <input ref={csvRef} id="pb-csv-file" type="file" aria-label="Selecionar ficheiro CSV" accept=".csv,text/csv,text/plain" className="pb-visually-hidden" onChange={readFile}/>
            <button type="button" id="pb-export" onClick={exportCSV}>Exportar CSV</button>
            <button type="button" id="pb-template" onClick={exportTemplate}>Modelo CSV</button>
            <button type="button" id="pb-restore" className="pb-muted-action" onClick={() => setDialog("restore")}>Repor originais</button>
          </div>
          <form className="pb-toolbar" onSubmit={onActivate}>
            <label htmlFor="pb-search">ID, segmento ou nome
              <input type="search" id="pb-search" placeholder="Ex. EX-SBC" autoComplete="off" spellCheck={false}
                value={query} onChange={event => {setQuery(event.target.value);setPage(0);}}/>
            </label>
            <button type="submit" className="pb-primary">Ativar</button>
          </form>
          <div className="pb-layout">
            <div className="pb-panel">
              <div id="pb-directory" role="tabpanel" aria-labelledby="pb-directory-tab" hidden={view !== "directory"}>
                <table aria-label="Diretório de prompts">
                  <thead><tr><th scope="col">ID</th><th scope="col">Segmento</th><th scope="col">Prompt</th></tr></thead>
                  <tbody>{view === "directory" && visible.map(item => (
                    <tr key={item.id} data-active={current?.id === item.id ? true : undefined}>
                      <td><button type="button" className="pb-id pb-id-button" data-id={item.id} aria-label={"Ativar " + item.id + " · " + item.title} aria-pressed={current?.id === item.id} onClick={() => selectPrompt(item)}>{item.id}</button></td>
                      <td>{item.segment}</td><td>{item.title}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div id="pb-bento" role="tabpanel" aria-labelledby="pb-bento-tab" hidden={view !== "bento"}>
                <div className="pb-grid">{view === "bento" && visible.map(item => (
                  <PromptCard key={item.id} item={item} active={current?.id === item.id} onSelect={() => selectPrompt(item)}/>
                ))}</div>
              </div>
              <div className="pb-footer">
                <span className="pb-count pb-muted" aria-live="polite">
                  {visible.length ? (start + 1) + "–" + (start + visible.length) + " de " + filtered.length : "Nenhum prompt encontrado"}
                </span>
                <div className="pb-paging">
                  <button type="button" data-page="-1" disabled={safePage === 0} onClick={() => setPage(Math.max(0, safePage-1))}>Anterior</button>
                  <button type="button" data-page="1" disabled={start + pageSize >= filtered.length} onClick={() => setPage(safePage+1)}>Seguinte</button>
                </div>
              </div>
            </div>
            <section ref={readerRef} className="pb-reader" aria-labelledby="pb-active-title">
              {current ? (
                <>
                  <div className="pb-selected">
                    <div>
                      <div className="pb-id pb-meta">{current.id + " · " + current.address + " · " + current.segment}</div>
                      <h2 id="pb-active-title">{current.title}</h2>
                    </div>
                    <button type="button" id="pb-copy" className="pb-primary" onClick={copyPrompt}>Copiar prompt</button>
                  </div>
                  <pre ref={promptRef} className="pb-prompt" id="pb-prompt">{current.body}</pre>
                  <div className="pb-reader-actions">
                    <button type="button" id="pb-edit" onClick={editPrompt}>Editar</button>
                    <button type="button" id="pb-delete" className="pb-danger-link" onClick={() => setDialog("delete")}>Eliminar</button>
                  </div>
                </>
              ) : <div className="pb-empty" id="pb-active-title">A biblioteca está vazia. Importe um CSV ou crie um prompt.</div>}
              <p className="pb-status" role="status" aria-live="polite">{status || (current ? current.id + " ativo." : "")}</p>
            </section>
          </div>
          <p className="pb-storage-note">As alterações ficam guardadas neste navegador. Exporte um CSV para criar uma cópia de segurança. Não existe sincronização entre dispositivos.</p>
          </div>
          <div hidden={section !== "knowledge"}><SecondBrain /></div>
        </div>
      </div>
      {dialog && (
        <div className="pb-modal-layer">
          <section className="pb-dialog" role="dialog" aria-modal="true" aria-labelledby="pb-dialog-title">
            {dialog === "editor" && <PromptEditor mode={draftMode} draft={draft} onChange={setDraft} onCancel={() => setDialog(null)} onSubmit={savePrompt} errors={draftErrors}/>}
            {dialog === "import" && pending && (
              <ImportPreview pending={pending} current={items} mode={importMode} onMode={next => {setImportMode(next);setReplaceConfirmed(false);}}
                confirmed={replaceConfirmed} onConfirm={setReplaceConfirmed} onApply={applyImport} onCancel={() => setDialog(null)}/>
            )}
            {dialog === "delete" && current && (
              <div>
                <div className="pb-dialog-header"><div><div className="pb-overline">CONFIRMAÇÃO</div><h2 id="pb-dialog-title">Eliminar {current.id}?</h2><p>Este prompt será retirado dos dados locais. Pode recuperar o original com “Repor originais”, mas isso repõe toda a biblioteca.</p></div></div>
                <div className="pb-dialog-actions"><button type="button" onClick={() => setDialog(null)}>Cancelar</button><button type="button" className="pb-danger" onClick={deletePrompt}>Eliminar prompt</button></div>
              </div>
            )}
            {dialog === "restore" && (
              <div>
                <div className="pb-dialog-header"><div><div className="pb-overline">REPOR BIBLIOTECA</div><h2 id="pb-dialog-title">Restaurar 30 prompts originais?</h2><p>Esta ação substitui os dados locais. Exporte o CSV antes de continuar, caso queira preservar alterações.</p></div></div>
                <div className="pb-dialog-actions"><button type="button" onClick={() => setDialog(null)}>Cancelar</button><button type="button" className="pb-danger" id="pb-confirm-restore" onClick={restoreSeed}>Repor originais</button></div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
export default PromptLibrary;
