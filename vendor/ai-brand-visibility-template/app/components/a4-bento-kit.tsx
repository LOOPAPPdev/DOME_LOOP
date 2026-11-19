import {useEffect,useMemo,useRef,useState} from "react";
import type {ChangeEvent} from "react";
import {
  ORIGINAL,STORAGE_KEY,MAX_FILE_SIZE,FIELD_IDS,FIELD_LIMITS,
  FACE_IDS,SECTIONS,ROLE_DIMS,originalCards,
  selectedCard,updateCard,exportCSV,exportJSON,previewImportCSV,validateCards
} from "./a4-bento-kit-model";
import type {Card,FaceId,FieldId} from "./a4-bento-kit-model";
import "./a4-bento-kit.css";

type View="all"|FaceId;
type Pending={kind:"csv"|"json";cards:Card[];changed:number}|null;
const EDITORS:Array<{id:FieldId;title:string;hint:string;large?:boolean}>= [
  {id:"title",title:"A / Título",hint:"HEADER"},
  {id:"subtitle",title:"B / Contexto",hint:"DESCRIPTION"},
  {id:"status",title:"C / Estado",hint:"STATUS",large:true},
  {id:"action_label",title:"D / Ação",hint:"ACTION"}
];
const PREVIEW_ITEMS:Array<{id:FieldId;css:string}>=[
  {id:"title",css:"header"},{id:"subtitle",css:"description"},
  {id:"status",css:"status"},{id:"action_label",css:"action"},
];
function triggerDownload(filename:string,payload:string,type:string){
  const href=URL.createObjectURL(new Blob([payload],{type}));
  const anchor=document.createElement("a");
  anchor.href=href;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function CardTile({card,selected,onSelect}:{card:Card;selected:boolean;onSelect:(id:string)=>void}){
  const placement=card.role==="micro"?{gridColumn:String(card.slot-3),gridRow:"3"}:undefined;
  const klass=card.role==="meso"?(card.slot===1?"meso-left":"meso-right"):card.role;
  return <button type="button"
    className={"bmkit-tile bmkit-"+klass+(selected?" bmkit-selected":"")}
    style={placement} data-card-id={card.card_id} data-density="normal" data-use-compact="false"
    title={card.card_id+" · "+FIELD_IDS.map(key=>card.fields[key]).join(" · ")}
    aria-label={"Inspecionar card "+card.card_id+", "+card.fields.title}
    aria-pressed={selected} onClick={()=>onSelect(card.card_id)}
  >
    {PREVIEW_ITEMS.map(({id,css})=><span className={"bmkit-chunk bmkit-"+css} data-key={id} data-has-compact={Boolean(card.compact?.[id])} key={id}>
      <span className="bmkit-full" aria-hidden="true">{card.fields[id]}</span>
      {card.compact?.[id]&&<span className="bmkit-short" aria-hidden="true">{card.compact[id]}</span>}
    </span>)}
  </button>;
}
function FaceSection({face,cards,selected,view,onSelect}:{face:FaceId;cards:Card[];selected:string;view:View;onSelect:(id:string)=>void}){
  const active=view==="all"||view===face;
  return <section className={"bmkit-face"+(active?" bmkit-face-active":"")} data-face={face} aria-label={"Face "+face+": "+SECTIONS[face]}>
    <span className="bmkit-face-label">FACE {face} · {SECTIONS[face]}</span>
    <span className="bmkit-face-number">0{FACE_IDS.indexOf(face)+1}/03</span>
    <div className="bmkit-face-grid">{cards.filter(c=>c.face_id===face).map(card=>
      <CardTile key={card.card_id} card={card} selected={selected===card.card_id} onSelect={onSelect}/>)}
    </div>
  </section>;
}
function SidebarField({card,id,title,hint,large,onChange}:{card:Card;id:FieldId;title:string;hint:string;large?:boolean;onChange:(field:FieldId,v:string,compact?:boolean)=>void}){
  return <div className="bmkit-editor-field">
    <label htmlFor={"field-"+id}>{title}<small>{hint}</small></label>
    {large?<textarea id={"field-"+id} rows={2} required maxLength={FIELD_LIMITS[id]} value={card.fields[id]} onChange={e=>onChange(id,e.target.value)}/>:
      <input id={"field-"+id} required maxLength={FIELD_LIMITS[id]} value={card.fields[id]} onChange={e=>onChange(id,e.target.value)}/>}
    <span className="bmkit-count">{card.fields[id].length}/{FIELD_LIMITS[id]}</span>
  </div>;
}
function equalSet(a:Set<string>,b:Set<string>){
  return a.size===b.size&&[...a].every(v=>b.has(v));
}
export function A4BentoKit(){
  const [cards,setCards]=useState<Card[]>(originalCards);
  const [selected,setSelected]=useState("A-02");
  const [view,setView]=useState<View>("all");
  const [guides,setGuides]=useState(false);
  const [overflowed,setOverflowed]=useState<Set<string>>(new Set());
  const [zoom,setZoom]=useState(1);
  const [notice,setNotice]=useState("Conteúdo original preservado. A geometria da grelha é imutável.");
  const [warning,setWarning]=useState(false);
  const [ready,setReady]=useState(false);
  const [blocked,setBlocked]=useState(false);
  const [pending,setPending]=useState<Pending>(null);
  const [confirmReset,setConfirmReset]=useState(false);
  const [confirmCheck,setConfirmCheck]=useState(false);
  const [importError,setImportError]=useState("");
  const [fileType,setFileType]=useState<"csv"|"json">("csv");
  const stageRef=useRef<HTMLDivElement>(null);
  const paperRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLInputElement>(null);
  const chosen=useMemo(()=>selectedCard(cards,selected),[cards,selected]);
  const dims=ROLE_DIMS[chosen.role];

  useEffect(()=>{
    try{
      const text=window.localStorage.getItem(STORAGE_KEY);
      if(text){
        const restored=validateCards(JSON.parse(text));
        setCards(restored);
        setNotice("Conteúdo guardado anteriormente neste navegador carregado.");
      }
    }catch(err){
      console.error("A4 Bento Kit: sessão local inválida",err);
      setBlocked(true);
      setWarning(true);
      setNotice("Os dados locais não puderam ser lidos. Não foram alterados. Exporte antes de substituir.");
    }finally{setReady(true);}
  },[]);
  useEffect(()=>{
    if(!ready||blocked)return;
    try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(cards));}
    catch{setWarning(true);setNotice("Falha ao guardar. Exporte um CSV ou JSON para não perder as alterações.");}
  },[cards,ready,blocked]);

  // Keep printed physical dimensions; scale the on-screen A4 to fit the available workspace.
  useEffect(()=>{
    const stage=stageRef.current;if(!stage)return;
    const update=()=>{
      const width=stage.clientWidth-40;
      const fullWidth=210*96/25.4;
      setZoom(Math.max(.3,Math.min(1,Math.floor((width/fullWidth)*100)/100)));
    };
    update();
    const observer=new ResizeObserver(update);observer.observe(stage);
    return ()=>observer.disconnect();
  },[]);

  // React owns text; only visual density and measured overflow are applied to DOM.
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>{
      const paper=paperRef.current;if(!paper)return;
      const out=new Set<string>();
      const fits=(node:HTMLElement)=>[...node.querySelectorAll<HTMLElement>(".bmkit-chunk")].every(chunk=>
        chunk.scrollHeight<=chunk.clientHeight+1&&chunk.scrollWidth<=chunk.clientWidth+1);
      paper.querySelectorAll<HTMLButtonElement>(".bmkit-tile").forEach(tile=>{
        tile.dataset.density="normal";tile.dataset.useCompact="false";tile.classList.remove("bmkit-overflow");
        let ok=false;
        for(const density of ["normal","compact","minimum"]){
          tile.dataset.density=density;
          if(fits(tile)){ok=true;break;}
        }
        if(!ok){
          tile.dataset.useCompact="true";
          if(!fits(tile)){tile.classList.add("bmkit-overflow");out.add(tile.dataset.cardId||"");}
        }
      });
      setOverflowed(old=>equalSet(old,out)?old:out);
    });
    return ()=>window.cancelAnimationFrame(frame);
  },[cards,view,guides,zoom]);

  function select(id:string){
    if(!cards.some(c=>c.card_id===id))return;
    setSelected(id);
    if(view!=="all"&&id[0]!==view)setView(id[0] as FaceId);
  }
  function edit(field:FieldId,value:string,compact=false){
    setCards(previous=>updateCard(previous,chosen.card_id,field,value,compact));
    setWarning(false);setBlocked(false);
    setNotice("Alterações guardadas localmente. Exporte CSV para atualizar a planilha.");
  }
  function checkRequired():boolean{
    const invalid=cards.flatMap(c=>FIELD_IDS.filter(key=>!c.fields[key].trim()).map(key=>c.card_id+"|"+key));
    if(invalid.length){
      setWarning(true);setNotice("Existem "+invalid.length+" campos obrigatórios vazios. Corrija-os antes de exportar.");
      return false;
    }
    return true;
  }
  function downloadCSV(){
    if(!checkRequired())return;
    triggerDownload("FIELDS.csv",exportCSV(cards),"text/csv;charset=utf-8");
    setWarning(false);setNotice("FIELDS.csv exportado com 108 registos.");
  }
  function downloadJSON(){
    if(!checkRequired())return;
    triggerDownload("cards.json",exportJSON(cards),"application/json;charset=utf-8");
    setWarning(false);setNotice("cards.json exportado.");
  }
  function chooseImport(kind:"csv"|"json"){
    setFileType(kind);
    setImportError("");
    inputRef.current?.click();
  }
  async function readFile(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value="";
    if(!file)return;
    if(file.size>MAX_FILE_SIZE){
      setWarning(true);setNotice("Ficheiro superior a 1 MB.");return;
    }
    try{
      const text=await file.text();
      if(fileType==="csv"){
        const preview=previewImportCSV(text,cards);
        setPending({kind:"csv",cards:preview.cards,changed:preview.changed});
      }else{
        const raw=JSON.parse(text);
        const incoming=validateCards(raw?.cards,true);
        const changed=incoming.filter(c=>{
          const prior=cards.find(old=>old.card_id===c.card_id);
          return !prior||FIELD_IDS.some(key=>prior.fields[key]!==c.fields[key]||(prior.compact[key]||"")!==(c.compact[key]||""));
        }).length;
        setPending({kind:"json",cards:incoming,changed});
      }
      setConfirmCheck(false);setImportError("");
      setWarning(false);setNotice("Ficheiro validado. Confirme antes de substituir o conteúdo local.");
    }catch(error){
      const message=error instanceof Error?error.message:"Formato inválido";
      setWarning(true);setNotice("Importação rejeitada: "+message);setImportError(message);
    }
  }
  function applyImport(){
    if(!pending||!confirmCheck)return;
    setCards(pending.cards);setPending(null);setBlocked(false);setWarning(false);
    setNotice((pending.kind==="csv"?"CSV importado":"JSON importado")+" · 27 cartões atualizados. Exporte uma cópia para arquivo.");
  }
  function reset(){
    if(!confirmReset)return;
    setCards(originalCards());setSelected("A-02");setView("all");
setBlocked(false);setWarning(false);setConfirmReset(false);
    setNotice("Exemplo original restaurado: 27 cartões e 108 campos.");
  }
  const shownOverflow=overflowed.has(chosen.card_id);
  const displayStatus=shownOverflow?"Excesso de conteúdo no cartão "+chosen.card_id+". Defina valores compactos opcionais.":notice;
  const displayWarning=shownOverflow||warning;

  return <div id="loop-project-runtime" className="loop-project-runtime bmkit-root" data-status="ready" data-implementation="react-native">
    <main className="bmkit-shell">
      <header className="bmkit-topbar">
        <div><div className="bmkit-eyebrow">CLEANSEA / DESIGN SYSTEM / A4</div>
          <h1>Bento Grid <span>27 cards</span></h1>
          <p>Uma grelha fixa. Três faces idênticas. Conteúdo adaptativo.</p>
        </div>
        <div className="bmkit-badges"><span>210 × 297 mm</span><span>3 faces × 9 cards</span><span>108 campos</span></div>
      </header>
      <div className="bmkit-layout">
        <section className="bmkit-workspace" aria-label="Pré-visualização do A4">
          <div className="bmkit-toolbar">
            <div className="bmkit-tabs" role="group" aria-label="Selecionar visualização">
              {(["all",...FACE_IDS] as View[]).map(key=><button type="button" key={key}
                className={"bmkit-tab"+(view===key?" bmkit-tab-active":"")} aria-pressed={view===key}
                onClick={()=>setView(key)}>{key==="all"?"A4 completo":"Face "+key}</button>)}
            </div>
            <label className="bmkit-guide"><input type="checkbox" id="show-grid" checked={guides} onChange={e=>setGuides(e.target.checked)}/>Guias</label>
          </div>
          <div ref={stageRef} className="bmkit-stage" id="stage">
            <div ref={paperRef} className={"bmkit-paper"+(view!=="all"?" bmkit-focus":"")+(guides?" bmkit-guides":"")}
              id="paper" style={{zoom:view==="all"?zoom:Math.min(1.25,zoom*1.25)}}
              aria-label="Folha A4 com três faces e 27 cards">
              {FACE_IDS.map(face=><FaceSection key={face} face={face} cards={cards} selected={selected} view={view} onSelect={select}/>)}
            </div>
          </div>
          <footer className="bmkit-workspace-footer"><span>1 Macro + 2 Meso + 6 Micro por face</span><span>Margem 10 mm · Gap 4 mm</span></footer>
        </section>
        <aside className="bmkit-sidebar" aria-label="Formulário e inspeção">
          <div className="bmkit-eyebrow">FORMULÁRIO / FIELD EDITOR</div>
          <h2 id="card-name">{chosen.fields.title}</h2>
          <span className="bmkit-role" id="card-meta">{chosen.card_id} · {chosen.role.toUpperCase()}</span>
          <div className="bmkit-select-row">
            <label htmlFor="face-select">Face
              <select id="face-select" value={chosen.face_id} onChange={e=>select(e.target.value+"-"+String(chosen.slot).padStart(2,"0"))}>
                {FACE_IDS.map(face=><option key={face} value={face}>{face} · {SECTIONS[face]}</option>)}
              </select>
            </label>
            <label htmlFor="slot-select">Slot
              <select id="slot-select" value={chosen.slot} onChange={e=>select(chosen.face_id+"-"+String(e.target.value).padStart(2,"0"))}>
                {Array.from({length:9},(_,i)=><option key={i} value={i+1}>Card {String(i+1).padStart(2,"0")}</option>)}
              </select>
            </label>
          </div>
          <form id="editor" autoComplete="off" onSubmit={e=>e.preventDefault()}>
            {EDITORS.map(field=><SidebarField key={field.id} {...field} card={chosen} onChange={edit}/>)}
            <details className="bmkit-advanced"><summary>Valores compactos opcionais</summary>
              <p>Substituem apenas o texto visível quando o original não cabe. O valor completo permanece guardado.</p>
              {EDITORS.map(({id,title})=><label className="bmkit-compact-field" key={id} htmlFor={"compact-"+id}>{title.slice(4)} compacto
                <input id={"compact-"+id} value={chosen.compact?.[id]||""} maxLength={FIELD_LIMITS[id]}
                  onChange={event=>edit(id,event.target.value,true)} placeholder="Automático"/>
              </label>)}
            </details>
          </form>
          <p role="status" aria-live="polite" className={"bmkit-status-line"+(displayWarning?" bmkit-status-warning":"")} id="status-line">{displayStatus}</p>
          <div className="bmkit-dimensions">
            <div><span>Largura</span><strong id="dim-w">{dims[0].toFixed(2).replace(".",",")} mm</strong></div>
            <div><span>Altura</span><strong id="dim-h">{dims[1].toFixed(2).replace(".",",")} mm</strong></div>
            <div><span>Margem</span><strong>10 mm</strong></div>
            <div><span>Espaçamento</span><strong>4 mm</strong></div>
          </div>
          <div className="bmkit-actions">
            <button type="button" id="export-csv" className="bmkit-primary" onClick={downloadCSV}>Exportar FIELDS.csv</button>
            <button type="button" id="export-json" onClick={downloadJSON}>Exportar JSON</button>
          </div>
          <div className="bmkit-actions">
            <button type="button" id="import-csv" onClick={()=>chooseImport("csv")}>Importar CSV</button>
            <button type="button" id="import-json" onClick={()=>chooseImport("json")}>Importar JSON</button>
            <button type="button" id="print" onClick={()=>window.print()}>Imprimir A4</button>
          </div>
          <div className="bmkit-actions"><button type="button" id="reset" className="bmkit-danger" onClick={()=>setConfirmReset(true)}>Restaurar exemplo</button></div>
          <input type="file" id="csv-file" ref={inputRef} accept={fileType==="csv"?".csv,text/csv":".json,application/json"}
            className="bmkit-file-hidden" aria-label="Ficheiro de importação" onChange={readFile}/>
          {importError&&<p role="alert" className="bmkit-import-error">{importError}</p>}
          <p className="bmkit-help">Edição local com gravação neste navegador. Para alterar a planilha XLSX, edite a aba <code>FIELDS</code>, exporte como CSV e importe acima. Não existe ligação direta a Google Sheets.</p>
        </aside>
      </div>
      <footer className="bmkit-global-footer">Fonte de dados: <code>app/components/a4-bento-kit.data.json</code> · Geometria fixa / conteúdo fluido.</footer>
    </main>
    {(pending||confirmReset)&&<div className="bmkit-modal-backdrop">
      <section role="dialog" aria-modal="true" aria-labelledby="bmkit-dialog-title" className="bmkit-dialog">
        <h2 id="bmkit-dialog-title">{confirmReset?"Restaurar exemplo original?":"Confirmar importação "+pending?.kind.toUpperCase()+"?"}</h2>
        <p>{confirmReset?"Os 108 campos serão restaurados. As alterações locais atuais serão substituídas. Exporte uma cópia antes de continuar.":
          "O ficheiro contém 27 cartões e 108 campos. "+(pending?.changed??0)+" cartões têm títulos alterados ou conteúdos diferentes. Esta ação substitui os dados guardados neste navegador."}</p>
        {!confirmReset&&<label className="bmkit-confirm-label"><input type="checkbox" id="bmkit-import-confirm" checked={confirmCheck}
            onChange={event=>setConfirmCheck(event.target.checked)}/>Confirmo a substituição dos 108 campos locais.</label>}
        <div className="bmkit-dialog-actions">
          <button type="button" onClick={()=>{setPending(null);setConfirmReset(false);setConfirmCheck(false);}}>Cancelar</button>
          <button type="button" className="bmkit-primary" disabled={!confirmReset&&!confirmCheck} onClick={confirmReset?reset:applyImport}>Confirmar</button>
        </div>
      </section>
    </div>}
  </div>;
}
export default A4BentoKit;
