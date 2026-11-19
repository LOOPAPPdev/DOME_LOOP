import {useEffect, useMemo, useRef, useState} from "react";
import type {ChangeEvent} from "react";
import {
  EXAMPLE, STAGES, SCENARIOS, DOCUMENTS, UNRESOLVED,
  CLEANSEA_STORAGE_KEY, MAX_SESSION_BYTES,
  adaptivePlan, answerValue, hasAnswer, createSession, demoSession,
  editAnswer, confirmSession, validateGraph, validateForConfirmation,
  proposePublicDemo, acceptPublicDemo, toMermaid, validateSessionImport
} from "./cleansea-model";
import type {FieldDef, Process, ProcessNode, Session} from "./cleansea-model";
import "./cleansea-operacao.css";

type MainTab = "diagnostico" | "modelo";
type ResultTab = "diagrama" | "mermaid" | "plano" | "lacunas";
type Scenario = keyof typeof SCENARIOS;
const RESULT_TABS: Array<{id:ResultTab;title:string}> = [
  {id:"diagrama",title:"Diagrama"},
  {id:"mermaid",title:"Mermaid"},
  {id:"plano",title:"Plano adaptativo"},
  {id:"lacunas",title:"Lacunas"},
];
function downloadJSON(session: Session) {
  const json=JSON.stringify(session,null,2);
  const url=URL.createObjectURL(new Blob([json],{type:"application/json;charset=utf-8"}));
  const a=document.createElement("a");
  a.href=url;a.download="cleansea-asis.json";document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Notice({children,warn=false}:{children:React.ReactNode;warn?:boolean}) {
  return <div role="note" className={"cs-notice"+(warn?" cs-warn":"")}>{children}</div>;
}
function NodeDiagram({process}:{process:Process}){
  const [focus,setFocus]=useState<string|null>(null);
  const active=process.nodes.find(node=>node.id===focus);
  const primary=process.nodes.filter(node=>node.type!=="note");
  const notes=process.nodes.filter(node=>node.type==="note");
  if(primary.length===0)return <div className="cs-empty-process">Preencha as atividades na etapa E ou carregue o exemplo Cleansea para gerar um diagrama.</div>;
  return <div className="cs-diagram" aria-label="Fluxo AS-IS">
    <div className="cs-flow-list">
      {primary.map((node,i)=><div className="cs-flow-element" key={node.id}>
        {i>0&&<span className="cs-connector" aria-hidden="true">↓</span>}
        <button type="button" className={"cs-node cs-node-"+node.type+(focus===node.id?" cs-node-selected":"")} onClick={()=>setFocus(node.id)} aria-pressed={focus===node.id} data-node={node.id}>
          <span className="cs-node-kind">{node.type==="start"?"INÍCIO":node.type==="end"?"FIM":"ATIVIDADE "+String(i).padStart(2,"0")}</span>
          <span>{node.label}</span>
          {node.actor&&<span className="cs-node-actor">{node.actor}</span>}
        </button>
      </div>)}
    </div>
    {notes.length>0&&<div className="cs-flow-notes">
      <strong>Associações e exceções</strong>
      {notes.map(node=><p key={node.id}>{node.label}</p>)}
    </div>}
    {active&&<div className="cs-flow-selected" role="status"><strong>Nó {active.id}</strong><span>{active.label}</span><small>Origem: {active.origin} · {active.verification==="customer_confirmed"?"Confirmado pelo cliente":"Requer validação"}</small></div>}
  </div>;
}
function ModelReference(){
  const [scenario,setScenario]=useState<Scenario>("base");
  const [panel,setPanel]=useState<"fluxo"|"documentos"|"lacunas">("fluxo");
  const item=SCENARIOS[scenario];
  const sourceNode=EXAMPLE.process.nodes;
  return <section className="cs-reference" aria-label="Modelo CleanSea">
    <div className="cs-reference-title"><div>
      <div className="cs-overline">MODELO CLEANSEA · DOCUMENTO DO CLIENTE</div>
      <h2>Processo operacional de referência</h2>
      <p>17 atividades transcritas. Os dados são indicativos e continuam por confirmar.</p>
    </div><span className="cs-tag cs-warn-tag">Não validado</span></div>
    <div className="cs-reference-head">
      <strong>Condições operacionais</strong>
      <div className="cs-scenario-tabs" role="group" aria-label="Cenários">
        {(["base","delay","concurrency"] as const).map(key=><button type="button" aria-pressed={scenario===key} onClick={()=>setScenario(key)} key={key}>{SCENARIOS[key].title}</button>)}
      </div>
      <h3>{item.headline}</h3>
      <p>{item.description}</p>
      <ul>{item.items.map(x=><li key={x}>{x}</li>)}</ul>
    </div>
    <div className="cs-subtabs" role="tablist" aria-label="Informação do modelo">
      {([["fluxo","17 atividades"],["documentos","Documentos D1–D4"],["lacunas","Lacunas"]] as const).map(([id,name])=><button type="button" key={id} role="tab" aria-selected={panel===id} onClick={()=>setPanel(id)}>{name}</button>)}
    </div>
    {panel==="fluxo"&&<div className="cs-reference-content">
      <div className="cs-reference-counters"><span>17 atividades</span><span>19 nós</span><span>18 ligações</span></div>
      <ol className="cs-reference-list">{sourceNode.filter(x=>x.type==="task").map((node,i)=><li key={node.id} className="cs-reference-item"><span className="cs-mono">{String(i+1).padStart(2,"0")}</span><div><strong>{node.label}</strong><small>{node.actor||"Responsável por confirmar"}</small></div><span className="cs-tag">Por validar</span></li>)}</ol>
    </div>}
    {panel==="documentos"&&<div className="cs-reference-content"><h3>Catálogo documental</h3><div className="cs-document-grid">{DOCUMENTS.map(x=><article key={x.id}><span className="cs-overline">{x.id}</span><strong>{x.title}</strong><small>{x.method}</small></article>)}</div></div>}
    {panel==="lacunas"&&<div className="cs-reference-content"><h3>Informações a confirmar</h3><ul className="cs-gap-list">{UNRESOLVED.map(x=><li key={x}>{x}</li>)}</ul><Notice warn>As simulações são cenários explicativos. Não existem probabilidades, custos ou tempos confirmados para simulação quantitativa.</Notice></div>}
  </section>;
}
function AnswersView({session,setSession,stageIndex,chooseStage,setStatus,onConfirm}:{
  session:Session;setSession:React.Dispatch<React.SetStateAction<Session>>;
  stageIndex:number;chooseStage:(n:number)=>void;
  setStatus:(text:string)=>void;onConfirm:()=>void;
}){
  const stage=STAGES[stageIndex],nextRequired=adaptivePlan(session).next;
  const demo=session.research.suggestions.find(s=>s.id==="example-demo");
  function change(field:FieldDef, text:string){
    const val=field.type==="number"?(text===""?null:Number(text)) : text;
    setSession(prev=>editAnswer(prev,field.id,val));
  }
  function next(){
    if(stageIndex===STAGES.length-1){onConfirm();return;}
    const missing=stage.fields.filter(f=>f.required&&!hasAnswer(session,f.id));
    if(missing.length){setStatus("Campo necessário: "+missing.map(f=>f.label).join(" · "));return;}
    chooseStage(stageIndex+1);
  }
  return <section className="cs-question-panel" aria-label="Perguntas do diagnóstico">
    <header className="cs-step-head">
      <div className="cs-step-line"><span>ETAPA {stage.id} / I · {stageIndex+1} DE {STAGES.length}</span><span>{Math.round((stageIndex+1)/STAGES.length*100)}%</span></div>
      <div role="progressbar" aria-label="Progresso do questionário" aria-valuemin={0} aria-valuemax={STAGES.length} aria-valuenow={stageIndex+1} className="cs-progress"><span style={{width:((stageIndex+1)/STAGES.length*100)+"%"}}/></div>
      <h2>{stage.title}</h2><p>{stage.description}</p>
    </header>
    <div className="cs-question-scroll">
      {nextRequired&&nextRequired.stage!==stage.id&&<button className="cs-next-suggestion" type="button" onClick={()=>chooseStage(STAGES.findIndex(x=>x.id===nextRequired.stage))}>
        Próxima pergunta sugerida · etapa {nextRequired.stage}<span>{nextRequired.label}</span>
      </button>}
      {stage.fields.map((field,localIndex)=>{
        const stored=session.questionnaire.answers[field.id];
        return <section className="cs-field" key={field.id}>
          <div className="cs-field-label"><label htmlFor={"answer-"+field.id}><span className="cs-mono">{String(stageIndex*2+localIndex+1).padStart(2,"0")} · </span>{field.label}</label>{!field.required&&<span className="cs-field-optional">opcional</span>}</div>
          {field.type==="boolean"?
            <div className="cs-boolean-options">{([["true","Sim, confirmo","O fluxo representa o processo atual"],["false","Ainda não","Há correções ou lacunas"]] as const).map(([value,title,description])=><button type="button" key={value} aria-pressed={String(stored?.value)===value} onClick={()=>setSession(prev=>editAnswer(prev,field.id,value==="true"))}><strong>{title}</strong><small>{description}</small></button>)}</div> :
          field.type==="textarea"?
            <textarea id={"answer-"+field.id} rows={field.id==="activities"?8:4} value={answerValue(session,field.id)} onChange={event=>change(field,event.target.value)} placeholder={field.id==="activities"?"Ex.: receber pedido\nvalidar documentos\nexecutar operação":"Escreva a resposta…"} maxLength={5000}/> :
            <input id={"answer-"+field.id} type={field.type} min={field.type==="number"?"0":undefined} step={field.type==="number"?"any":undefined} value={answerValue(session,field.id)} onChange={event=>change(field,event.target.value)} placeholder={field.id==="company_name"?"Nome da organização":field.id==="website"?"https://empresa.com":"Escreva a resposta…"} maxLength={5000}/>
          }
          {field.id==="activities"&&<Notice>Uma atividade por linha gera um nó no diagrama. O limite é 60 atividades.</Notice>}
          {stored?.origin==="customer_document"&&<Notice warn>Valor transcrito de documento do cliente; ainda por confirmar.</Notice>}
        </section>;
      })}
      {stageIndex===0&&<section className="cs-research-panel">
        <strong>Agente de pesquisa · camada pública</strong>
        <p>{!demo?"O agente consulta só informação pública do website e propõe sugestões. Esta demonstração não faz pesquisa externa e não trata sugestões como factos confirmados.":demo.state==="suggested"?"Sugestão simulada: setor “Serviços marítimos”. A fonte é fictícia e não foi pesquisada.":"Sugestão de demonstração aceite. Não constitui evidência real."}</p>
        {!demo&&<button type="button" onClick={()=>setSession(prev=>proposePublicDemo(prev))}>Simular sugestão pública</button>}
        {demo?.state==="suggested"&&<button type="button" onClick={()=>setSession(prev=>acceptPublicDemo(prev))}>Aceitar sugestão fictícia</button>}
      </section>}
    </div>
    <footer className="cs-step-actions">
      <button type="button" disabled={stageIndex===0} onClick={()=>chooseStage(stageIndex-1)}>Anterior</button>
      <button type="button" className="cs-dark-button" onClick={next}>{stageIndex===STAGES.length-1?"Validar AS-IS":"Próxima etapa"}</button>
    </footer>
  </section>;
}
function ResultView({session,tab,setTab,chooseStage,status,onExample}:{
  session:Session;tab:ResultTab;setTab:(tab:ResultTab)=>void;chooseStage:(n:number)=>void;
  status:string;onExample:()=>void;
}){
  const [copyStatus,setCopyStatus]=useState("");
  const mermaid=useMemo(()=>toMermaid(session.process),[session.process]);
  const graph=useMemo(()=>validateGraph(session.process),[session.process]);
  const plan=useMemo(()=>adaptivePlan(session),[session]);
  async function copyMermaid(){
    try{await navigator.clipboard.writeText(mermaid);setCopyStatus("Copiado.");}
    catch{setCopyStatus("Cópia indisponível. Selecione e copie o texto manualmente.");}
  }
  const currentConfirmed=session.process.status==="customer_confirmed";
  return <section className="cs-result-panel" aria-label="Resultado do processo AS-IS">
    <header className="cs-result-head"><h2>Processo AS-IS</h2><p>versão {session.process.version} · fonte: respostas locais</p>
      <span className={"cs-tag "+(currentConfirmed?"cs-ok-tag":"cs-warn-tag")}>{currentConfirmed?"Confirmado pelo cliente":"Rascunho"}</span>
    </header>
    <div className="cs-result-tabs" role="tablist" aria-label="Resultados">
      {RESULT_TABS.map(x=><button key={x.id} type="button" role="tab" aria-selected={tab===x.id} onClick={()=>setTab(x.id)}>{x.title}</button>)}
    </div>
    <div className="cs-result-scroll">
      {tab==="diagrama"&&<NodeDiagram process={session.process}/>}
      {tab==="mermaid"&&<div className="cs-result-content">
        <p>Fluxo Mermaid (pode copiar e reutilizar).</p>
        <pre className="cs-mermaid" data-testid="cleansea-mermaid">{mermaid}</pre>
        <button type="button" onClick={copyMermaid} className="cs-button">Copiar Mermaid</button>
        {copyStatus&&<p role="status">{copyStatus}</p>}
      </div>}
      {tab==="plano"&&<div className="cs-result-content">
        <h3>Plano adaptativo</h3>
        <Notice>{plan.next?"Próxima resposta sugerida: "+plan.next.label+" (etapa "+plan.next.stage+"). Faltam "+plan.remaining_required+" campos obrigatórios.":"Todos os campos estão confirmados."}</Notice>
        {plan.stages.map((stage,index)=><article className="cs-plan-stage" key={stage.id}><h4><span>{stage.id} · </span>{stage.title}</h4>
          {stage.fields.map(field=><button type="button" key={field.id} onClick={()=>chooseStage(index)}><span>{field.label}</span><span className="cs-tag">{({done:"Confirmado",review_public_suggestion:"Rever sugestão pública",ask_required:"Obrigatória",review_existing:"Rever resposta",optional:"Opcional"})[field.action]}</span></button>)}
        </article>)}
      </div>}
      {tab==="lacunas"&&<div className="cs-result-content">
        <Notice warn={!graph.ok}>{graph.ok?"Estrutura válida: existe um evento inicial, um final e todas as ligações têm origem e destino.":"Problemas de estrutura: "+graph.errors.join("; ")}</Notice>
        <h3>Riscos e lacunas identificados</h3>
        {session.process.risks.length?<ul className="cs-gap-list">{session.process.risks.map((r,i)=><li key={i}>{r}</li>)}</ul>:<p>Nenhum risco registado.</p>}
        <Notice>O diagrama não substitui BPMN 2.0.2. A validação formal exige BPMN XML, que não está disponível nesta demonstração.</Notice>
      </div>}
    </div>
    <footer className="cs-result-footer">
      <div><span>{session.process.nodes.length} NÓS</span><span>{session.process.edges.length} CONEXÕES</span><span>◇ REQUER VALIDAÇÃO</span></div>
      <div><button type="button" onClick={onExample}>Carregar exemplo Cleansea</button><button type="button" onClick={copyMermaid}>Copiar Mermaid</button></div>
    </footer>
    {status&&<div className="cs-result-status" role="status">{status}</div>}
  </section>;
}

export function CleanSeaOperations(){
  const [session,setSession]=useState<Session>(createSession);
  const [mainTab,setMainTab]=useState<MainTab>("diagnostico");
  const [resultTab,setResultTab]=useState<ResultTab>("diagrama");
  const [stageIndex,setStageIndex]=useState(0);
  const [expanded,setExpanded]=useState(false);
  const [mobileNav,setMobileNav]=useState(false);
  const [mobilePanel,setMobilePanel]=useState<"master"|"detail">("master");
  const [status,setStatus]=useState("");
  const [ready,setReady]=useState(false);
  const [storageBlocked,setStorageBlocked]=useState(false);
  const [pendingImport,setPendingImport]=useState<Session|null>(null);
  const [confirmReset,setConfirmReset]=useState(false);
  const [confirmExample,setConfirmExample]=useState(false);
  const importRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    try{
      const saved=window.localStorage.getItem(CLEANSEA_STORAGE_KEY);
      if(saved){
        const restored=validateSessionImport(JSON.parse(saved), true);
        setSession(restored);
        const index=STAGES.findIndex(s=>s.id===restored.questionnaire.current_stage);
        setStageIndex(Math.max(0,index));
      }
    }catch(e){
      console.error("CleanSea local session unavailable",e);
      setStorageBlocked(true);
      setStatus("Os dados locais não puderam ser lidos. Nenhuma alteração foi gravada. Exporte uma cópia antes de substituir.");
    }finally{setReady(true);}
  },[]);
  useEffect(()=>{
    if(!ready||storageBlocked)return;
    try{window.localStorage.setItem(CLEANSEA_STORAGE_KEY,JSON.stringify(session));}
    catch{setStatus("Armazenamento indisponível. Exporte uma cópia JSON.");}
  },[session,ready,storageBlocked]);
  function chooseStage(index:number){
    if(index<0||index>=STAGES.length)return;
    setStageIndex(index);
    setSession(prev=>({...prev,questionnaire:{...prev.questionnaire,current_stage:STAGES[index].id}}));
    setMobileNav(false);setMobilePanel("master");setStatus("");
  }
  function confirm(){
    const validation=validateForConfirmation(session);
    if(!validation.ok){setStatus("Antes de validar, preencha: "+validation.missing.join(", "));return;}
    try{setSession(prev=>confirmSession(prev));setMobilePanel("detail");setStatus("O cliente confirmou o rascunho AS-IS. Validação BPMN e motor de execução ainda não realizadas.");}
    catch(e){setStatus(e instanceof Error?e.message:"Falha na confirmação.");}
  }
  function loadExample(){setStorageBlocked(false);setSession(demoSession());setStageIndex(4);setResultTab("diagrama");setMainTab("diagnostico");setMobilePanel("master");setConfirmExample(false);setStatus("Exemplo Cleansea carregado: 17 atividades transcritas de documento do cliente. Dados não verificados.");}
  function reset(){setStorageBlocked(false);setSession(createSession());setStageIndex(0);setMainTab("diagnostico");setResultTab("diagrama");setConfirmReset(false);setStatus("Diagnóstico reiniciado neste navegador.");}
  async function readJSON(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value="";
    if(!file)return;
    if(file.size>MAX_SESSION_BYTES){setStatus("O JSON excede o limite de 2 MB.");return;}
    try{
      const parsed=validateSessionImport(JSON.parse(await file.text()));
      setPendingImport(parsed);
      setStatus("Ficheiro validado. Confirme a substituição da sessão local.");
    }catch(e){setStatus("Ficheiro inválido: "+(e instanceof Error?e.message:"erro desconhecido"));}
  }
  function acceptImport(){
    if(!pendingImport)return;
    setStorageBlocked(false);setSession(pendingImport);
    chooseStage(Math.max(0,STAGES.findIndex(x=>x.id===pendingImport.questionnaire.current_stage)));
    setPendingImport(null);setMainTab("diagnostico");
    setStatus("Sessão importada. É necessário rever e reconfirmar o AS-IS.");
  }
  const stage=STAGES[stageIndex];
  return <div id="loop-project-runtime" className="loop-project-runtime cs-runtime" data-status="ready" data-implementation="react-native">
    <div className="cs-app" aria-label="CleanSea Operação">
      <header className="cs-app-header">
        <div className="cs-app-identity"><span className="cs-logo">C</span><div><strong>CleanSea <span>/ ABAP LOOP</span></strong><small>Diagnóstico de processos · v1.1</small></div></div>
        <div className="cs-main-tabs" role="tablist" aria-label="Vistas">
          <button type="button" role="tab" aria-selected={mainTab==="diagnostico"} onClick={()=>setMainTab("diagnostico")}>Diagnóstico AS-IS</button>
          <button type="button" role="tab" aria-selected={mainTab==="modelo"} onClick={()=>setMainTab("modelo")}>Modelo CleanSea</button>
        </div>
        <span className="cs-header-demo">Demo local · sem pesquisa real</span>
      </header>
      <div className="cs-tools" role="group" aria-label="Gestão do diagnóstico">
        <span className="cs-tools-status">18 campos · 9 etapas · alterações locais</span>
        <button type="button" onClick={()=>downloadJSON(session)}>Exportar JSON</button>
        <button type="button" onClick={()=>importRef.current?.click()}>Importar JSON</button>
        <input ref={importRef} type="file" id="cleansea-import-file" accept="application/json,.json" className="cs-file-input" aria-label="Ficheiro JSON" onChange={readJSON}/>
        <button type="button" onClick={()=>setConfirmReset(true)}>Novo diagnóstico</button>
      </div>
      {mainTab==="diagnostico"?
      <main className="cs-layout">
        <aside className={"cs-steps"+(expanded?" cs-steps-expanded":"")} aria-label="Navegação do diagnóstico">
          <button type="button" className="cs-steps-toggle" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?"Recolher etapas":"Expandir etapas"}</button>
          <nav aria-label="Etapas do questionário">
            {STAGES.map((s,i)=>{
              const complete=s.fields.filter(f=>f.required).every(f=>hasAnswer(session,f.id));
              return <button key={s.id} type="button" aria-current={stageIndex===i?"step":undefined} onClick={()=>chooseStage(i)} title={s.id+" · "+s.title}>
                <span className={"cs-step-letter"+(complete&&stageIndex!==i?" cs-step-done":"")}>{complete&&stageIndex!==i?"✓":s.id}</span>
                {expanded&&<span className="cs-step-details"><strong>{s.title}</strong><small>{s.fields.length} campos</small></span>}
              </button>;
            })}
          </nav><div className="cs-steps-caption">9 ETAPAS · 18 CAMPOS</div>
        </aside>
        <div className="cs-mobile-toolbar">
          <button type="button" onClick={()=>setMobileNav(true)}>Etapa {stage.id} · {stage.title} ▾</button>
          <div role="tablist" aria-label="Painel móvel"><button type="button" role="tab" aria-selected={mobilePanel==="master"} onClick={()=>setMobilePanel("master")}>Perguntas</button><button type="button" role="tab" aria-selected={mobilePanel==="detail"} onClick={()=>setMobilePanel("detail")}>Resultado</button></div>
        </div>
        <div className={"cs-questions-wrap"+(mobilePanel==="detail"?" cs-mobile-hide":"")}>
          <AnswersView session={session} setSession={setSession} stageIndex={stageIndex} chooseStage={chooseStage} setStatus={setStatus} onConfirm={confirm}/>
          {status&&<div className="cs-global-status" role="status">{status}</div>}
        </div>
        <div className={"cs-results-wrap"+(mobilePanel==="master"?" cs-mobile-hide":"")}>
          <ResultView session={session} tab={resultTab} setTab={setResultTab} chooseStage={chooseStage} status={status} onExample={()=>setConfirmExample(true)}/>
        </div>
        {mobileNav&&<div className="cs-mobile-overlay" role="dialog" aria-modal="true" aria-label="Etapas do questionário">
          <div className="cs-mobile-menu"><button type="button" className="cs-mobile-close" onClick={()=>setMobileNav(false)}>Fechar</button>{STAGES.map((s,i)=><button type="button" key={s.id} onClick={()=>chooseStage(i)} aria-current={stageIndex===i?"step":undefined}>{s.id} · {s.title}</button>)}</div>
        </div>}
      </main>:
      <ModelReference/>}
      <p className="cs-storage-foot">Dados guardados neste navegador. Sem sincronização entre dispositivos. O exemplo e as sugestões não são pesquisa pública nem validação operacional.</p>
    </div>
    {(pendingImport||confirmReset||confirmExample)&&<div className="cs-modal-layer"><section role="dialog" aria-modal="true" aria-labelledby="cs-modal-title" className="cs-modal">
      <h2 id="cs-modal-title">{pendingImport?"Importar diagnóstico?":confirmReset?"Iniciar novo diagnóstico?":"Carregar exemplo Cleansea?"}</h2>
      <p>{pendingImport?"A importação substitui a sessão local. Dados importados requerem nova validação.":confirmReset?"Esta ação remove as respostas locais do diagnóstico. Exporte um JSON de segurança antes de continuar.":"O exemplo contém 17 atividades de documento não validado e substitui as respostas locais."}</p>
      <div><button type="button" onClick={()=>{setPendingImport(null);setConfirmReset(false);setConfirmExample(false);}}>Cancelar</button><button type="button" className="cs-dark-button" onClick={pendingImport?acceptImport:confirmReset?reset:loadExample}>Confirmar</button></div>
    </section></div>}
  </div>;
}
export default CleanSeaOperations;
