import {useEffect,useMemo,useRef,useState} from "react";
import type {CSSProperties,ChangeEvent,FormEvent} from "react";
import {
  PAGE_W,PAGE_H,FACES,PRESETS,LIMITS,STORAGE_KEY,
  defaultConfig,exampleData,geometry,cardId,getCard,format,px,
  allIds,copyFace,clearFace,legacyExportRows,setCardField,parseStored,importJSON,exportJSON
} from "./a4-bento-modular-model";
import type {Config,CardMap,FieldKey,Geometry,Level,Slot} from "./a4-bento-modular-model";
import "./a4-bento-modular.css";

type PreviewMode="est"|"ex";
type ConfirmAction=null|"clear"|"reset"|"import";
const fieldInfo:Array<{key:FieldKey;label:string;id:string}>= [
  {key:"t",label:"Título",id:"f-title"},
  {key:"s",label:"Subtítulo",id:"f-subtitle"},
  {key:"b",label:"Estado / Informação",id:"f-status"},
  {key:"a",label:"Texto da ação",id:"f-action"}
];
const levels:Level[]=["macro","meso","micro"];

function SaveFile({cfg,data}:{cfg:Config;data:CardMap}){
  function save(){
    const url=URL.createObjectURL(new Blob([exportJSON(cfg,data)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="a4-bento-modular.json";
    document.body.appendChild(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <button type="button" onClick={save} id="export-project">Exportar projeto JSON</button>;
}

function CardPreview({face,slot,active,data,mode,onSelect}:{face:number;slot:Slot;active:boolean;data:CardMap;mode:PreviewMode;onSelect:(face:number,n:number)=>void}){
  const item=getCard(data,cardId(face,slot.n)),style={
    gridColumn:slot.c+" / span "+slot.cs,
    gridRow:slot.r+" / span "+slot.rs,
    "--bm-fs":slot.fs.toFixed(2)
  } as CSSProperties;
  const text=mode==="est"?
    {t:slot.lv,s:cardId(face,slot.n),b:"Conteúdo",a:"Ação"}:
    {t:item.t||"Título",s:item.s||"Subtítulo",b:item.b||"Estado",a:item.a||"Ação"};
  return <button
    type="button"
    data-face={face}
    data-slot={slot.n}
    data-card-id={cardId(face,slot.n)}
    data-level={slot.lv}
    aria-pressed={active}
    aria-label={"Face "+FACES[face]+", card "+slot.n+", "+(item.t||slot.lv)}
    className={"bm-card bm-"+slot.lv+(active?" bm-selected":"")}
    style={style}
    onClick={()=>onSelect(face,slot.n)}
  >
    <span className={"bm-card-title"+(!item.t?" bm-placeholder":"")}>{text.t}</span>
    <span className={"bm-card-sub"+(!item.s?" bm-placeholder":"")}>{text.s}</span>
    {slot.lv!=="micro"&&<span className={"bm-card-state"+(!item.b?" bm-placeholder":"")}>{text.b}</span>}
    {slot.lv==="macro"&&<span className="bm-card-action">{text.a}</span>}
  </button>;
}
function FacePreview({index,geom,data,selectedFace,selectedSlot,mode,showParameters,onSelect}:{
  index:number;geom:Geometry;data:CardMap;selectedFace:number;selectedSlot:number;mode:PreviewMode;showParameters:boolean;onSelect:(f:number,s:number)=>void;
}){
  const {cfg,H}=geom;
  const style:CSSProperties={
    gridTemplateColumns:"repeat("+cfg.cols+", minmax(0,1fr))",
    gridTemplateRows:"repeat("+cfg.rows+", minmax(0,1fr))",
    gap:(cfg.gap/PAGE_W*100)+"cqw",
    padding:(cfg.margin/PAGE_W*100)+"cqw"
  };
  return <section
    className={"bm-face"+(selectedFace===index?" bm-active-face":"")}
    data-face={index}
    aria-label={"Face "+FACES[index]}
  >
    <div className="bm-face-grid" style={style}>
      {showParameters&&<><span className="bm-face-label">FACE {FACES[index]}</span><span className="bm-face-size">{format(PAGE_W/10,1)} × {format(H/10,1)} cm</span></>}
      {geom.slots.map(slot=><CardPreview
        key={slot.n} slot={slot} face={index} data={data}
        active={selectedFace===index&&selectedSlot===slot.n}
        mode={mode} onSelect={onSelect}
      />)}
      {showParameters&&<span className="bm-face-caption">Margens: {format(cfg.margin/10)} cm · Gap: {format(cfg.gap/10)} cm</span>}
    </div>
  </section>;
}
function GridMap({geom,withMargins}:{geom:Geometry;withMargins:boolean}){
  const {cfg,H,mw,mh}=geom;
  const cells=[];
  for(let f=0;f<cfg.faces;f++)for(let r=0;r<cfg.rows;r++)for(let c=0;c<cfg.cols;c++){
    const x=withMargins?cfg.margin+c*(mw+cfg.gap):c*PAGE_W/cfg.cols;
    const y=withMargins?f*H+cfg.margin+r*(mh+cfg.gap):(f*cfg.rows+r)*PAGE_H/(cfg.faces*cfg.rows);
    const w=withMargins?mw:PAGE_W/cfg.cols;
    const h=withMargins?mh:PAGE_H/(cfg.faces*cfg.rows);
    cells.push(<rect key={f+"-"+r+"-"+c} x={x} y={y} width={w} height={h} rx={withMargins?1.5:0} fill={withMargins&&((f*31+r*7+c)%4===0)?"var(--bm-selected)":"none"} stroke="var(--bm-grid)" strokeWidth=".4"/>);
  }
  return <svg viewBox={"0 0 "+PAGE_W+" "+PAGE_H} role="img" aria-label={withMargins?"Grelha por área com margens e gaps":"Grelha geral sem margens"} preserveAspectRatio="xMidYMid meet">
    {cells}
    {Array.from({length:cfg.faces-1},(_,i)=><line key={i} x1="0" x2={PAGE_W} y1={(i+1)*H} y2={(i+1)*H} stroke="var(--bm-ink)" strokeWidth=".9"/>)}
  </svg>;
}

export function A4BentoModular(){
  const [cfg,setCfg]=useState<Config>(defaultConfig);
  const [data,setData]=useState<CardMap>(exampleData);
  const [ready,setReady]=useState(false);
  const [blocked,setBlocked]=useState(false);
  const [mode,setMode]=useState<PreviewMode>("ex");
  const [showParameters,setShowParameters]=useState(true);
  const [face,setFace]=useState(0);
  const [slot,setSlot]=useState(1);
  const [showOutput,setShowOutput]=useState(false);
  const [output,setOutput]=useState("");
  const [confirm,setConfirm]=useState<ConfirmAction>(null);
  const [pendingImport,setPendingImport]=useState<{cfg:Config;data:CardMap}|null>(null);
  const [notice,setNotice]=useState("");
  const outRef=useRef<HTMLTextAreaElement>(null);
  const inputRef=useRef<HTMLInputElement>(null);

  const geom=useMemo(()=>geometry(cfg),[cfg]);
  const safeFace=Math.min(face,geom.cfg.faces-1);
  const safeSlot=geom.slots.some(s=>s.n===slot)?slot:geom.slots[0].n;
  const chosen=geom.slots.find(s=>s.n===safeSlot)!;
  const chosenId=cardId(safeFace,safeSlot);
  const current=getCard(data,chosenId);
  const counts=useMemo(()=>Object.fromEntries(levels.map(l=>[l,geom.slots.filter(s=>s.lv===l).length])) as Record<Level,number>,[geom]);

  useEffect(()=>{
    try{
      const saved=window.localStorage.getItem(STORAGE_KEY);
      if(saved){
        const restored=parseStored(JSON.parse(saved));
        setCfg(restored.cfg);setData(restored.data);
        setNotice("Dados locais existentes carregados.");
      }
    }catch(error){
      console.error("Erro ao carregar Bento Modular:",error);
      setBlocked(true);
      setNotice("Os dados locais não puderam ser lidos. O original foi preservado. Exporte o projeto antes de substituir.");
    }finally{setReady(true);}
  },[]);
  useEffect(()=>{
    if(!ready||blocked)return;
    try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify({cfg:geom.cfg,data}));}
    catch{setNotice("Não foi possível guardar neste navegador. Exporte o projeto JSON.");}
  },[geom.cfg,data,ready,blocked]);
  useEffect(()=>{if(showOutput){outRef.current?.focus();outRef.current?.select();}},[output,showOutput]);

  function updateConfig(key:keyof Config,value:string|number){
    setCfg(prev=>geometry({...prev,[key]:value}).cfg);
    setNotice("");
  }
  function setPreset(key:"bento"|"uni"){
    setCfg({...PRESETS[key]});setFace(0);setSlot(1);setNotice("Predefinição aplicada; conteúdo existente preservado.");
  }
  function pick(f:number,n:number){setFace(f);setSlot(n);setNotice("");}
  function updateField(key:FieldKey,text:string){
    setBlocked(false);
    setData(prev=>setCardField(prev,chosenId,key,text,chosen.lv));
  }
  async function showJSON(ids:string[]){
    const payload=JSON.stringify(legacyExportRows(data,ids),null,2);
    setOutput(payload);setShowOutput(true);
    try{await navigator.clipboard.writeText(payload);setNotice("JSON gerado e copiado.");}
    catch{setNotice("JSON gerado. Selecione o texto e copie manualmente.");}
  }
  function act(action:ConfirmAction){
    if(action==="clear"){setData(prev=>clearFace(prev,geom,safeFace));setNotice("Face "+FACES[safeFace]+" limpa.");}
    if(action==="reset"){setData(exampleData());setNotice("Exemplo original reposto.");}
    if(action==="import"&&pendingImport){
      setCfg(pendingImport.cfg);setData(pendingImport.data);setBlocked(false);
      setFace(0);setSlot(1);setNotice("Projeto importado e guardado localmente.");setPendingImport(null);
    }
    setConfirm(null);setShowOutput(false);
  }
  async function readProject(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value="";
    if(!file)return;
    if(file.size>1024*1024){setNotice("Ficheiro superior a 1 MB.");return;}
    try{
      const incoming=importJSON(await file.text());
      setPendingImport(incoming);setConfirm("import");
      setNotice("JSON validado. Confirme a substituição do projeto atual.");
    }catch(error){setNotice("Erro de importação: "+(error instanceof Error?error.message:"Formato inválido"));}
  }
  function dismiss(){setConfirm(null);setPendingImport(null);}
  const spec=levels.filter(l=>counts[l]>0).map(level=>{
    const items=geom.slots.filter(s=>s.lv===level),first=items[0],same=items.every(s=>Math.abs(s.w-first.w)<.01&&Math.abs(s.h-first.h)<.01);
    return {label:level.slice(0,1).toUpperCase()+level.slice(1)+(same?"":" (tamanho do primeiro)"),w:first.w,h:first.h,q:items.length};
  });
  const dimensionRows=[
    ...spec,
    {label:"Margem",w:geom.cfg.margin,h:geom.cfg.margin,q:"Uniforme" as const},
    {label:"Gap",w:geom.cfg.gap,h:geom.cfg.gap,q:"Uniforme" as const},
    {label:"Face",w:PAGE_W,h:geom.H,q:geom.cfg.faces+" na folha"}
  ];

  return <div id="loop-project-runtime" data-status="ready" data-implementation="react-native" className="loop-project-runtime bm-root">
    <main className="bm-main">
      <header className="bm-titlebar">
        <h1>A4 — Sistema Bento modular</h1>
        <p>Faces horizontais idênticas sobre uma folha A4. Escolha o layout, defina faces, colunas e linhas por número, e preencha cada card pelo formulário.</p>
      </header>
      <section className="bm-panel" aria-labelledby="lh">
        <div className="bm-panel-head"><div><h2 id="lh">Layout e grelha</h2><p>A geometria recalcula a folha, os slots, o formulário e as especificações.</p></div><span id="total" className="bm-chip">{geom.slots.length*geom.cfg.faces} cards</span></div>
        <div className="bm-segmented" role="tablist" aria-label="Layout" id="laysel">
          <button type="button" role="tab" aria-selected={geom.cfg.layout==="bento"} onClick={()=>updateConfig("layout","bento")}>Bento · macro, meso, micro</button>
          <button type="button" role="tab" aria-selected={geom.cfg.layout==="uniform"} onClick={()=>updateConfig("layout","uniform")}>Grelha uniforme</button>
        </div>
        <div className="bm-numbers">{([
          ["faces","Faces","n-f",1,6,1],
          ["cols","Colunas","n-c",1,12,1],
          ["rows","Linhas","n-r",1,8,1],
          ["margin","Margem (mm)","n-m",0,20,.5],
          ["gap","Gap (mm)","n-g",0,10,.5]
        ] as Array<[keyof Config,string,string,number,number,number]>).map(([key,label,id,min,max,step])=><label key={key} className="bm-field" htmlFor={id}>{label}<input id={id} type="number" inputMode={step===1?"numeric":"decimal"} min={min} max={max} step={step} value={geom.cfg[key]} onChange={e=>updateConfig(key,Number(e.target.value))}/></label>)}</div>
        <p className="bm-warning" id="warn" role="status">{geom.notes.join(" ")}</p>
        <div id="sum" className="bm-chips">
          <span className="bm-chip">Face {format(PAGE_W/10,1)} × {format(geom.H/10,1)} cm</span>
          <span className="bm-chip">Módulo {format(geom.mw)} × {format(geom.mh)} mm</span>
          <span className="bm-chip">Área útil {format((PAGE_W-2*geom.cfg.margin)/10,1)} × {format((geom.H-2*geom.cfg.margin)/10,1)} cm</span>
          <span className="bm-chip">{geom.slots.length} cards por face</span>
        </div>
        <div className="bm-actions"><button type="button" id="p-bento" onClick={()=>setPreset("bento")}>Predefinição Bento 3 × 6 × 3</button><button type="button" id="p-uni" onClick={()=>setPreset("uni")}>Predefinição uniforme 3 × 3 × 3</button></div>
      </section>
      <section className="bm-panel" aria-labelledby="pv">
        <div className="bm-panel-head"><div><h2 id="pv">Pré-visualização A4</h2><p>210 × 297 mm · Proporção real · toque num card para o editar</p></div></div>
        <div className="bm-segmented" role="tablist" aria-label="Vista">
          <button type="button" role="tab" id="t-est" aria-selected={mode==="est"} onClick={()=>setMode("est")}>Estrutura</button>
          <button type="button" role="tab" id="t-ex" aria-selected={mode==="ex"} onClick={()=>setMode("ex")}>Preenchido</button>
        </div>
        <div className="bm-preview-stage">
          <div id="sheet" className="bm-sheet" style={{gridTemplateRows:"repeat("+geom.cfg.faces+",minmax(0,1fr))"}}>
            {Array.from({length:geom.cfg.faces},(_,f)=><FacePreview
              key={f} index={f} geom={geom} data={data} selectedFace={safeFace} selectedSlot={safeSlot}
              mode={mode} showParameters={showParameters} onSelect={pick}/>)}
          </div>
        </div>
        <label className="bm-checkbox" htmlFor="par"><input type="checkbox" id="par" checked={showParameters} onChange={event=>setShowParameters(event.target.checked)}/>Mostrar parâmetros em cada face</label>
        <div className="bm-legend" id="legend">{levels.filter(l=>counts[l]>0).map(level=><span key={level}><i/>{level.slice(0,1).toUpperCase()+level.slice(1)} · {counts[level]}</span>)}</div>
        <div className="bm-actions"><button type="button" id="print-bento" onClick={()=>window.print()}>Imprimir A4</button></div>
      </section>
      <section className="bm-panel" aria-labelledby="fh2">
        <div className="bm-panel-head"><div><h2 id="fh2">Faces e slots</h2><p>Posições fixas e numeradas. Toque num slot para o escolher no editor.</p></div></div>
        <div className="bm-faces" id="faces">{Array.from({length:geom.cfg.faces},(_,f)=><article className="bm-slot-face" key={f}>
          <h3>FACE {FACES[f]}</h3>
          <div className="bm-slot-grid" style={{gridTemplateColumns:"repeat("+geom.cfg.cols+",minmax(0,1fr))",gridTemplateRows:"repeat("+geom.cfg.rows+",minmax(0,1fr))"}}>
            {geom.slots.map(item=><button key={item.n} type="button" aria-label={"Face "+FACES[f]+" card "+item.n} aria-pressed={safeFace===f&&safeSlot===item.n} style={{gridColumn:item.c+" / span "+item.cs,gridRow:item.r+" / span "+item.rs}} onClick={()=>pick(f,item.n)}>{item.n}</button>)}
          </div>
          <span>{geom.slots.length} cards</span>
        </article>)}</div>
      </section>
      <section className="bm-panel" aria-labelledby="eh">
        <div className="bm-panel-head"><div><h2 id="eh">Editor de card</h2><p>Face › Card › campos. Cada campo tem limite de caracteres para caber no card.</p></div><span id="cid" className="bm-chip">{chosenId}</span></div>
        <div className="bm-segmented" role="tablist" aria-label="Face a editar" id="facesel">
          {Array.from({length:geom.cfg.faces},(_,f)=><button type="button" key={f} role="tab" aria-selected={safeFace===f} onClick={()=>pick(f,safeSlot)}>Face {FACES[f]}</button>)}
        </div>
        <label className="bm-field" htmlFor="cardsel">Card
          <select id="cardsel" value={safeSlot} onChange={event=>pick(safeFace,Number(event.target.value))}>
            {geom.slots.map(s=><option value={s.n} key={s.n}>{cardId(safeFace,s.n)} · {s.lv}</option>)}
          </select>
        </label>
        <form id="form" autoComplete="off" onSubmit={(event:FormEvent<HTMLFormElement>)=>event.preventDefault()}>
          <fieldset><legend id="lg">{chosenId} · {chosen.lv.toUpperCase()} · {format(chosen.w/10)} × {format(chosen.h/10)} cm</legend>
            <div className="bm-form-grid">{fieldInfo.map(({key,label,id})=><label key={key} className="bm-field" htmlFor={id}>
              <span>{label}<em>{current[key].length}/{LIMITS[chosen.lv][key]}</em></span>
              <input id={id} maxLength={LIMITS[chosen.lv][key]} value={current[key]} onChange={event=>updateField(key,event.target.value)}/>
            </label>)}</div>
          </fieldset>
        </form>
        <p id="lvnote" className="bm-help">{chosen.lv==="macro"?"Macro mostra os quatro campos.":chosen.lv==="meso"?"Meso mostra título, subtítulo e estado. A ação fica guardada mas não é desenhada.":"Micro mostra título e subtítulo. Estado e ação ficam guardados mas não são desenhados."}</p>
        <div className="bm-actions">
          <button type="button" id="copycard" onClick={()=>showJSON([chosenId])}>Copiar JSON deste card</button>
          <button type="button" id="copyall" onClick={()=>showJSON(allIds(geom))}>Copiar JSON de todos</button>
          <button type="button" id="copyface" onClick={()=>{setData(prev=>copyFace(prev,geom,safeFace));setNotice("Conteúdo da face "+FACES[safeFace]+" copiado para as outras.");}}>Copiar esta face para as outras</button>
          <button type="button" id="reset" onClick={()=>setConfirm("reset")}>Repor exemplo</button>
          <button type="button" id="clear" onClick={()=>setConfirm("clear")}>Limpar face</button>
        </div>
        {showOutput&&<textarea ref={outRef} className="bm-output" id="out" value={output} readOnly aria-label="JSON gerado"/>}
        <div className="bm-actions bm-import-actions">
          <SaveFile cfg={geom.cfg} data={data}/>
          <button type="button" onClick={()=>inputRef.current?.click()}>Importar projeto JSON</button>
          <input ref={inputRef} type="file" accept=".json,application/json" className="bm-hidden-file" aria-label="Escolher projeto JSON" id="import-project" onChange={readProject}/>
        </div>
        <p role="status" className="bm-notice">{notice}</p>
        <p className="bm-help">As alterações ficam guardadas neste navegador. Exporte um projeto JSON para guardar ou transferir os dados.</p>
      </section>
      <section className="bm-specs" aria-labelledby="sp"><h2 id="sp">Especificações calculadas</h2>
        <div className="bm-table-wrap"><table><thead><tr><th>Elemento</th><th>Dimensões por card</th><th>Pixels (96 PPI)</th><th>Quantidade por face</th></tr></thead>
          <tbody id="spec">{dimensionRows.map((row,i)=><tr key={i}><td>{row.label}</td><td>{format(row.w/10,3)} × {format(row.h/10,3)} cm</td><td>{px(row.w)} × {px(row.h)}</td><td>{row.q}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="bm-rule">
        <strong>Regra de composição:</strong> todas as faces MUST utilizar a mesma geometria. O conteúdo MAY variar entre texto, indicadores, imagens, etapas ou gráficos, desde que respeite os limites de cada card. A hierarquia, a simetria e as posições permanecem fixas.
        <p>A grelha está dimensionada proporcionalmente a uma folha A4. A apresentação no ecrã não garante escala física de impressão.</p>
      </section>
      <section className="bm-specs" aria-labelledby="gr"><h2 id="gr">Visualização das grelhas aplicadas</h2>
        <div className="bm-panel bm-grid-panel"><div className="bm-grids">
          <div><h3>01 · GRELHA GERAL</h3><p id="d1">{geom.cfg.cols} colunas × {geom.cfg.faces*geom.cfg.rows} linhas · sem margem · módulo {format(PAGE_W/geom.cfg.cols)} × {format(PAGE_H/(geom.cfg.faces*geom.cfg.rows))} mm · {geom.cfg.cols*geom.cfg.faces*geom.cfg.rows} módulos</p><div id="g1"><GridMap geom={geom} withMargins={false}/></div></div>
          <div><h3>02 · GRELHA POR ÁREA</h3><p id="d2">{geom.cfg.cols} colunas × {geom.cfg.rows} linhas · margem {format(geom.cfg.margin)} mm · módulo {format(geom.mw)} × {format(geom.mh)} mm · {geom.cfg.cols*geom.cfg.rows} por área</p><div id="g2"><GridMap geom={geom} withMargins/></div></div>
        </div></div>
      </section>
    </main>
    {confirm&&<div className="bm-modal-layer"><section role="dialog" aria-modal="true" aria-labelledby="bm-dialog-title" className="bm-dialog">
      <h2 id="bm-dialog-title">{confirm==="clear"?"Limpar face "+FACES[safeFace]+"?":confirm==="reset"?"Repor exemplo original?":"Importar projeto?"}</h2>
      <p>{confirm==="clear"?"Todos os campos desta face serão removidos. As outras faces serão preservadas.":confirm==="reset"?"Os 27 cartões originais substituirão todos os textos atuais, sem alterar o layout.":"O projeto importado substituirá o layout e o conteúdo atual. Exporte uma cópia antes de continuar."}</p>
      <div><button type="button" onClick={dismiss}>Cancelar</button><button type="button" className="bm-confirm" onClick={()=>act(confirm)}>Confirmar</button></div>
    </section></div>}
  </div>;
}
export default A4BentoModular;
