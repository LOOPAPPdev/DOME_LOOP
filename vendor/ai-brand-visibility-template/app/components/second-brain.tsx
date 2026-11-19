import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  KIND_LABELS, KNOWLEDGE_KEY, MAX_KNOWLEDGE_BYTES,
  blankDocument, extensionForKind, importKnowledgeText, validateKnowledge,
} from "./second-brain-model";
import type { KnowledgeEntry, KnowledgeKind } from "./second-brain-model";
import { KnowledgeReader } from "./second-brain-viewers";
import "./second-brain.css";

type Filter = KnowledgeKind | "all";
const FILTERS: Array<{id:Filter;label:string}> = [
  {id:"all",label:"Todos"}, {id:"markdown",label:"Markdown"}, {id:"mermaid",label:"Mermaid"}, {id:"sheet",label:"Planilhas"},
];

function downloadText(value:string, filename:string, mime:string) {
  const url=URL.createObjectURL(new Blob([value],{type:mime}));
  const a=document.createElement("a");
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function safeFilename(title:string) {
  return title.replace(/[^\p{L}\p{N}._ -]/gu,"-").replace(/\s+/g,"-").slice(0,100)||"documento";
}

export function SecondBrain() {
  const [items,setItems]=useState<KnowledgeEntry[]>([]);
  const [hydrated,setHydrated]=useState(false);
  const [storageBlocked,setStorageBlocked]=useState(false);
  const [activeId,setActiveId]=useState("");
  const [filter,setFilter]=useState<Filter>("all");
  const [query,setQuery]=useState("");
  const [newKind,setNewKind]=useState<KnowledgeKind>("markdown");
  const [sourceMode,setSourceMode]=useState(false);
  const [wide,setWide]=useState(true);
  const [draft,setDraft]=useState<KnowledgeEntry|null>(null);
  const [isNew,setIsNew]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [status,setStatus]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    try {
      const saved=window.localStorage.getItem(KNOWLEDGE_KEY);
      if(saved!==null) {
        const docs=validateKnowledge(JSON.parse(saved));
        setItems(docs);setActiveId(docs[0]?.id||"");
      }
    } catch(error) {
      setStorageBlocked(true);
      setStatus("Erro ao ler documentos locais. Os dados guardados não foram alterados. "+(error instanceof Error?error.message:""));
    } finally {setHydrated(true);}
  },[]);
  useEffect(()=>{
    if(!hydrated||storageBlocked)return;
    try {window.localStorage.setItem(KNOWLEDGE_KEY,JSON.stringify(items));}
    catch{setStatus("Armazenamento cheio ou indisponível. Exporte a biblioteca para guardar uma cópia.");}
  },[items,hydrated,storageBlocked]);

  const filtered=useMemo(()=>{
    const needle=query.toLocaleLowerCase().trim();
    return items.filter(item=>(filter==="all"||item.kind===filter)&&(!needle||[item.id,item.title,item.body].some(part=>part.toLocaleLowerCase().includes(needle))));
  },[items,filter,query]);
  const current=filtered.find(item=>item.id===activeId)||filtered[0]||null;

  function createNew() {
    setDraft(blankDocument(newKind,items));setIsNew(true);setConfirmDelete(false);
  }
  function editCurrent() {
    if(!current)return;
    setDraft({...current});setIsNew(false);setConfirmDelete(false);
  }
  function saveDraft(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!draft)return;
    try {
      const prepared={...draft,title:draft.title.trim(),updatedAt:Date.now()};
      const next=validateKnowledge(isNew?[...items,prepared]:items.map(item=>item.id===prepared.id?prepared:item));
      setItems(next);setStorageBlocked(false);
      setActiveId(prepared.id);setQuery("");setFilter("all");setSourceMode(false);setDraft(null);
      setStatus(prepared.title+" guardado neste navegador.");
    } catch(error) {setStatus("Não foi possível guardar: "+(error instanceof Error?error.message:"Dados inválidos"));}
  }
  async function importFiles(event:ChangeEvent<HTMLInputElement>) {
    const files=Array.from(event.currentTarget.files||[]);
    event.currentTarget.value="";
    if(!files.length)return;
    try {
      let next=items;
      for(const file of files){
        if(file.size>MAX_KNOWLEDGE_BYTES)throw new Error(file.name+" excede 4 MB.");
        next=importKnowledgeText(file.name,await file.text(),next);
      }
      setItems(next);setStorageBlocked(false);
      setActiveId(next[next.length-1]?.id||"");setQuery("");setFilter("all");setSourceMode(false);
      setStatus(files.length+" ficheiro(s) importado(s). Os ficheiros foram validados antes da alteração.");
    } catch(error) {
      setStatus("Importação cancelada, sem alterações: "+(error instanceof Error?error.message:"Formato inválido"));
    }
  }
  function deleteCurrent() {
    if(!current||!confirmDelete)return;
    const next=items.filter(item=>item.id!==current.id);
    setItems(next);setStorageBlocked(false);setActiveId(next[0]?.id||"");setConfirmDelete(false);
    setStatus("Documento eliminado deste navegador.");
  }
  async function copyCurrent() {
    if(!current)return;
    try {await navigator.clipboard.writeText(current.body);setStatus("Conteúdo copiado.");}
    catch {setStatus("Cópia automática indisponível. Selecione o texto na vista Origem.");}
  }
  function downloadCurrent() {
    if(!current)return;
    downloadText(current.body,safeFilename(current.title)+"."+extensionForKind(current.kind),"text/plain;charset=utf-8");
    setStatus("Documento exportado.");
  }
  function backup() {
    downloadText(JSON.stringify(items,null,2),"second-brain-backup.json","application/json;charset=utf-8");
    setStatus(items.length+" documentos exportados em JSON.");
  }

  return <section className="sb-app" aria-label="Biblioteca de conhecimento">
    <div className="sb-heading"><div><h2>Documentos e conhecimento</h2><p>Markdown · Mermaid · planilhas CSV/TSV</p></div><span className="sb-total">{items.length} documentos</span></div>
    <div className="sb-actions">
      <label className="sb-new-kind">Criar
        <select aria-label="Tipo de documento" value={newKind} onChange={event=>setNewKind(event.target.value as KnowledgeKind)}>
          <option value="markdown">Markdown</option>
          <option value="mermaid">Mermaid</option>
          <option value="sheet">Planilha</option>
        </select>
      </label>
      <button type="button" className="sb-primary" onClick={createNew}>+ Novo documento</button>
      <button type="button" onClick={()=>fileRef.current?.click()}>Importar ficheiros</button>
      <input ref={fileRef} className="pb-visually-hidden" type="file" multiple accept=".md,.markdown,.mmd,.mermaid,.csv,.tsv,.json" aria-label="Selecionar ficheiros de conhecimento" onChange={importFiles}/>
      <button type="button" onClick={backup}>Exportar biblioteca JSON</button>
    </div>
    <div className="sb-filters" role="group" aria-label="Filtrar documentos">
      {FILTERS.map(option=><button type="button" key={option.id} aria-pressed={filter===option.id} onClick={()=>{setFilter(option.id);setConfirmDelete(false);}}>
        {option.label} <span>{option.id==="all"?items.length:items.filter(item=>item.kind===option.id).length}</span>
      </button>)}
    </div>
    <label className="sb-search">Pesquisar ID, título ou conteúdo
      <input type="search" placeholder="Pesquisar documentos" value={query} onChange={event=>setQuery(event.target.value)}/>
    </label>
    <div className="sb-layout-toolbar"><span>Escolha um documento para visualizar</span><button type="button" aria-pressed={wide} onClick={()=>setWide(value=>!value)}>{wide?"Painéis lado a lado":"Largura total"}</button></div>
    <div className={"sb-workspace"+(wide?" sb-workspace--focus":"")}>
      <div className="sb-list" role="region" aria-label="Diretório de documentos">
        {filtered.length ? filtered.map(item=><button key={item.id} type="button" className="sb-list-item" aria-pressed={current?.id===item.id} onClick={()=>{setActiveId(item.id);setSourceMode(false);setDraft(null);setConfirmDelete(false);}}>
          <span className="sb-list-title">{item.title}</span><span className="sb-list-meta"><span>{item.id}</span><span>{KIND_LABELS[item.kind]}</span></span>
        </button>) : <p className="sb-empty">{hydrated?"Nenhum documento encontrado. Importe um ficheiro ou crie um documento.":"A carregar documentos…"}</p>}
      </div>
      <section className="sb-reader" aria-label="Visualização do documento">
        {current ? <>
          <div className="sb-reader-head">
            <div><span className="sb-type">{current.id} · {KIND_LABELS[current.kind]}</span><h3>{current.title}</h3></div>
            <button type="button" className="sb-primary" onClick={copyCurrent}>Copiar conteúdo</button>
          </div>
          <div className="sb-reader-tabs" role="group" aria-label="Modo de leitura">
            <button type="button" aria-pressed={!sourceMode} onClick={()=>setSourceMode(false)}>Visualização</button>
            <button type="button" aria-pressed={sourceMode} onClick={()=>setSourceMode(true)}>Origem</button>
          </div>
          <div className="sb-reader-body" key={current.id+(sourceMode?"source":"preview")}><KnowledgeReader item={current} sourceMode={sourceMode}/></div>
          <div className="sb-reader-actions">
            <button type="button" onClick={editCurrent}>Editar</button>
            <button type="button" onClick={downloadCurrent}>Descarregar</button>
            <button type="button" className="sb-danger" onClick={()=>setConfirmDelete(true)}>Eliminar</button>
          </div>
          {confirmDelete&&<div role="alert" className="sb-confirm"><span>Eliminar “{current.title}”?</span><button type="button" onClick={()=>setConfirmDelete(false)}>Cancelar</button><button type="button" className="sb-danger" onClick={deleteCurrent}>Confirmar eliminação</button></div>}
        </> : <p className="sb-empty">Selecione um documento para visualizar.</p>}
      </section>
    </div>
    <p className="sb-status" role="status" aria-live="polite">{status}</p>
    <p className="sb-storage-note">Os documentos ficam apenas neste navegador. Exporte uma cópia JSON para fazer backup. Não existe sincronização entre dispositivos. A planilha não executa fórmulas.</p>
    {draft&&<div className="sb-modal">
      <form className="sb-editor" role="dialog" aria-modal="true" aria-label={isNew?"Novo documento":"Editar documento"} onSubmit={saveDraft}>
        <div className="sb-editor-head"><h2>{isNew?"Novo documento":"Editar documento"}</h2><button type="button" onClick={()=>setDraft(null)}>Fechar</button></div>
        <p>{draft.id} · {KIND_LABELS[draft.kind]}</p>
        <label>Título<input required maxLength={160} value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})}/></label>
        <label>Conteúdo<textarea required rows={15} spellCheck={false} value={draft.body} onChange={event=>setDraft({...draft,body:event.target.value})}/></label>
        <div className="sb-editor-actions"><button type="button" onClick={()=>setDraft(null)}>Cancelar</button><button type="submit" className="sb-primary">Guardar documento</button></div>
      </form>
    </div>}
  </section>;
}
