import data from "./cleansea.data.json";

/** Domain layer. The React components read only this model and the source JSON. */
export type FieldType = "text" | "url" | "textarea" | "number" | "boolean";
export type FieldDef = { id: string; label: string; type: FieldType; required: boolean };
export type StageDef = { id: string; title: string; description: string; fields: FieldDef[] };
export type Verification = "needs_review" | "customer_confirmed" | "unverified" | "rejected";
export type Answer = {
  value: string | number | boolean | null;
  origin: "user_input" | "customer_document" | "public_web";
  verification: Verification;
  updated_at: string;
  source_url?: string;
};
export type ProcessNode = {
  id: string;
  type: "start" | "task" | "decision" | "end" | "document" | "note";
  label: string;
  actor?: string;
  origin: string;
  verification: Verification;
  source_ref?: string;
};
export type ProcessEdge = {id: string; source: string; target: string; kind: "sequence" | "association"; label?: string};
export type Process = {
  id: string;
  name: string;
  version: number;
  status: "draft" | "customer_confirmed";
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  risks: string[];
};
export type ResearchSuggestion = {
  id: string;
  field: string;
  value: string;
  source_url: string;
  state: "suggested" | "accepted" | "rejected";
  retrieved_at: string;
};
export type Session = {
  schema_version: string;
  session_id: string;
  organization: { name: string; website?: string; industry?: string };
  questionnaire: { current_stage: string; answers: Record<string, Answer> };
  research: { state: string; suggestions: ResearchSuggestion[] };
  process: Process;
  sources: Array<{ type: string; ref: string }>;
};

export const SCHEMA = data.questionnaire_schema as typeof data.questionnaire_schema;
export const STAGES = SCHEMA.stages as StageDef[];
export const EXAMPLE = data.example as Session;
export const SCENARIOS = data.scenarios;
export const DOCUMENTS = data.documents;
export const UNRESOLVED = data.unresolved;
export const CLEANSEA_STORAGE_KEY = "loopapp:cleansea-asis:v1";
export const MAX_SESSION_BYTES = 2 * 1024 * 1024;

export function createSession(): Session {
  return {
    schema_version: "1.0.0",
    session_id: "local-demo",
    organization: {name: ""},
    questionnaire: {current_stage: "A", answers: {}},
    research: {state: "idle", suggestions: []},
    process: {id: "process-local-demo", name: "Processo AS-IS", version: 1, status: "draft", nodes: [], edges: [], risks: []},
    sources: [],
  };
}
export function demoSession(): Session {
  return structuredClone(EXAMPLE);
}

export function answerValue(session: Session, fieldId: string) {
  const value = session.questionnaire.answers[fieldId]?.value;
  return value === undefined || value === null ? "" : String(value);
}
export function hasAnswer(session: Session, fieldId: string): boolean {
  const value = session.questionnaire.answers[fieldId]?.value;
  if (typeof value === "boolean") return true;
  return value !== undefined && value !== null && String(value).trim().length > 0;
}
function cleanTask(line: string) {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
}

export function generateProcess(session: Session): Process {
  const get = (id: string) => answerValue(session, id).trim();
  const lines = get("activities").split(/\r?\n/).map(cleanTask).filter(Boolean).slice(0, 60);
  const tasks = lines.length ? lines : ["Etapas operacionais ainda não descritas"];
  const origin = "user_input";
  const verified = (id: string): Verification =>
    session.questionnaire.answers[id]?.verification === "customer_confirmed"
      ? "customer_confirmed" : "needs_review";
  const nodes: ProcessNode[] = [{
    id: "N_START", type: "start", label: "Início: " + (get("trigger") || "(por confirmar)"),
    verification: verified("trigger"), origin,
  }];
  tasks.forEach((task, index) => nodes.push({
    id: "N_TASK_" + String(index + 1).padStart(2, "0"),
    type: "task", label: task,
    verification: verified("activities"), origin,
  }));
  nodes.push({
    id: "N_END", type: "end", label: "Resultado: " + (get("deliverable") || "(por confirmar)"),
    verification: verified("deliverable"), origin,
  });
  const edges: ProcessEdge[] = nodes.slice(1).map((node, index) => ({
    id: "E_" + String(index + 1), source: nodes[index].id,
    target: node.id, kind: "sequence",
  }));
  for(const [field, prefix] of [["decisions","DECISÕES"],["exceptions","EXCEÇÕES"],["handoffs","TRANSFERÊNCIAS"]]) {
    if(!get(field)) continue;
    const index = nodes.filter(node => node.type === "note").length + 1;
    const id = "N_NOTE_" + index;
    nodes.push({id, type:"note", label: prefix + ": " + get(field).slice(0,250),
      origin,verification:verified(field)});
    edges.push({id:"E_NOTE_" + index,source: lines.length ? "N_TASK_01" : "N_START", target:id,kind:"association"});
  }
  const risks: string[] = [];
  if(!lines.length) risks.push("Falta a sequência de atividades");
  if(get("decisions")) risks.push("Decisões descritas em texto ainda não possuem caminhos SIM/NÃO formalizados");
  if(get("exceptions")) risks.push("Exceções descritas; ramificações BPMN requerem confirmação");
  if(!get("duration_hours")) risks.push("Duração não informada; ROI não calculável");
  return {
    id: session.process.id,
    name: get("process_name") || "Processo AS-IS",
    version: session.process.version,
    status: "draft",
    nodes, edges, risks,
  };
}

export function editAnswer(session: Session, fieldId: string, value: string | number | boolean | null): Session {
  const cloned = structuredClone(session);
  if(typeof value === "string") value = value.slice(0, 5000);
  if(typeof value === "number" && !Number.isFinite(value)) throw new Error("O número deve ser finito.");
  cloned.questionnaire.answers[fieldId] = {
    value, origin:"user_input", verification:"needs_review", updated_at:new Date().toISOString(),
  };
  if(fieldId === "company_name") cloned.organization.name = String(value || "");
  if(fieldId === "website") cloned.organization.website = String(value || "");
  cloned.process.version += 1;
  cloned.process = generateProcess(cloned);
  return cloned;
}
export function validateGraph(process: Process): {ok: boolean; errors: string[]} {
  const errors: string[] = [];
  const seen = new Set<string>();
  for(const node of process.nodes) {
    if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(node.id)) errors.push("ID inválido: " + node.id);
    if(seen.has(node.id)) errors.push("Nó duplicado: " + node.id);
    seen.add(node.id);
  }
  for(const edge of process.edges) {
    if(!seen.has(edge.source) || !seen.has(edge.target)) errors.push("Ligação sem origem/destino: " + edge.id);
  }
  if(!process.nodes.some(node => node.type === "start")) errors.push("Falta evento inicial");
  if(!process.nodes.some(node => node.type === "end")) errors.push("Falta evento final");
  return {ok: errors.length === 0, errors};
}
export function validateForConfirmation(session: Session): {ok: boolean; missing: string[]} {
  const required = ["company_name","process_name","trigger","deliverable","activities"];
  const missing = required.filter(id => !hasAnswer(session,id));
  if(session.questionnaire.answers.confirmation?.value !== true) missing.push("confirmation");
  const graph = validateGraph(session.process);
  if(!graph.ok) missing.push("process: " + graph.errors.join("; "));
  return {ok: missing.length === 0, missing};
}
export function confirmSession(session: Session): Session {
  const validation = validateForConfirmation(session);
  if(!validation.ok) throw new Error("Antes de validar, preencha: " + validation.missing.join(", "));
  const cloned=structuredClone(session);
  Object.values(cloned.questionnaire.answers).forEach(answer => {
    if(["user_input","customer_document"].includes(answer.origin) && answer.verification !== "rejected"){
      answer.verification = "customer_confirmed";
    }
  });
  cloned.process = generateProcess(cloned);
  cloned.process.status = "customer_confirmed";
  return cloned;
}
export function proposePublicDemo(session: Session): Session {
  const cloned=structuredClone(session);
  if(cloned.research.suggestions.some(s=>s.id==="example-demo")) return cloned;
  cloned.research.state="ready";
  cloned.research.suggestions.push({
    id:"example-demo",field:"industry",value:"Serviços marítimos (EXEMPLO ILUSTRATIVO)",
    source_url:"https://example.org/illustration",state:"suggested",
    retrieved_at:new Date().toISOString(),
  });
  return cloned;
}
export function acceptPublicDemo(session: Session): Session {
  const cloned=structuredClone(session);
  const suggestion=cloned.research.suggestions.find(x=>x.id==="example-demo");
  if(!suggestion || suggestion.state!=="suggested") return cloned;
  suggestion.state="accepted";
  cloned.organization.industry=suggestion.value;
  cloned.questionnaire.answers.industry={
    value:suggestion.value,origin:"public_web",verification:"needs_review",
    source_url:suggestion.source_url,updated_at:new Date().toISOString(),
  };
  return cloned;
}
export function validateSessionImport(raw: unknown, preserveLocalSession = false): Session {
  if(!raw || typeof raw!=="object") throw new Error("O ficheiro não contém uma sessão JSON.");
  const obj = raw as Record<string, unknown>;
  if(obj.schema_version!=="1.0.0") throw new Error("Versão do esquema incompatível.");
  if(!obj.questionnaire || typeof obj.questionnaire!=="object") throw new Error("Questionário inválido.");
  const q=obj.questionnaire as Record<string, unknown>;
  if(!q.answers || typeof q.answers!=="object" || Array.isArray(q.answers)) throw new Error("Respostas inválidas.");
  const answers=q.answers as Record<string, unknown>;
  for(const [id,value] of Object.entries(answers)) {
    if(!/^[A-Za-z][A-Za-z0-9_]{0,50}$/.test(id) || !value || typeof value!=="object") throw new Error("Resposta inválida: "+id);
    const entry=value as Record<string, unknown>;
    const v=entry.value;
    if(!(v===null || typeof v==="boolean" || (typeof v==="number" && Number.isFinite(v)) || (typeof v==="string" && v.length<=5000))) throw new Error("Valor inválido: "+id);
  }
  const cloned=createSession();
  cloned.session_id=typeof obj.session_id==="string" ? obj.session_id.slice(0,120) : "imported-session";
  cloned.questionnaire.answers=answers as Record<string, Answer>;
  cloned.organization.name=String(cloned.questionnaire.answers.company_name?.value || "");
  cloned.questionnaire.current_stage=STAGES.some(x=>x.id===q.current_stage) ? String(q.current_stage) : "A";
  const originalProcess=obj.process;
  cloned.process.version=Math.max(1,Number((originalProcess as Record<string,unknown> | undefined)?.version)||1);
  cloned.process=generateProcess(cloned);
  cloned.process.version=Math.max(1,Number((originalProcess as Record<string,unknown> | undefined)?.version)||1);
  if(preserveLocalSession && originalProcess && typeof originalProcess==="object"){
    const prior=originalProcess as Record<string,unknown>;
    if(Array.isArray(prior.nodes) && Array.isArray(prior.edges) && Array.isArray(prior.risks) && prior.nodes.length<=100 && prior.edges.length<=150 && prior.risks.length<=100){
      const sourceNodes=prior.nodes as ProcessNode[];
      const sourceEdges=prior.edges as ProcessEdge[];
      if(sourceNodes.every(node=>typeof node.id==="string" && typeof node.label==="string" && node.label.length<=5000 && ["start","task","end","note","decision","document"].includes(node.type))
      && sourceEdges.every(edge=>typeof edge.id==="string" && typeof edge.source==="string" && typeof edge.target==="string")
      && prior.risks.every(risk=>typeof risk==="string" && risk.length<=2000)){
        const candidate={...cloned.process,nodes:sourceNodes,edges:sourceEdges,risks:prior.risks as string[],status:"draft" as const};
        if(validateGraph(candidate).ok){
          cloned.process={...candidate, status:prior.status==="customer_confirmed" && validateForConfirmation({...cloned,process:candidate}).ok ? "customer_confirmed" : "draft"};
        }
      }
    }
  }
  // Imports are never automatically granted customer-confirmed status.
  if(!preserveLocalSession) cloned.process.status="draft";
  return cloned;
}
export function cleanMermaid(value: unknown): string {
  return String(value).replace(/&/g,"&amp;").replace(/"/g,"#quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\r?\n/g," ").replace(/[\[\]{}]/g," ").slice(0,300);
}
export function toMermaid(process: Process): string {
  const check=validateGraph(process);
  if(!check.ok) return "%% " + check.errors.join("; ");
  const cls: Record<string,string> = {start:"startNode",task:"taskNode",decision:"decisionNode",end:"endNode",document:"docNode",note:"noteNode"};
  const label: Record<string,string>={start:"INÍCIO",task:"ATIVIDADE",decision:"DECISÃO",end:"FIM",document:"DOCUMENTO",note:"NOTA"};
  const lines=["flowchart TD"];
  for(const node of process.nodes) lines.push('  '+node.id+'["'+label[node.type]+" · "+cleanMermaid(node.label)+'"]:::'+cls[node.type]);
  for(const edge of process.edges){
    if(edge.kind==="association") lines.push("  "+edge.source+" -.-> "+edge.target);
    else if(edge.label) lines.push('  '+edge.source+' -->|"'+cleanMermaid(edge.label)+'"| '+edge.target);
    else lines.push("  "+edge.source+" --> "+edge.target);
  }
  lines.push("  classDef startNode fill:#e9f3ec,stroke:#2b6550,color:#17382a,stroke-width:2px;");
  lines.push("  classDef taskNode fill:#f1f4f7,stroke:#718299,color:#172532,stroke-width:1px;");
  lines.push("  classDef decisionNode fill:#fff4db,stroke:#a16c1c,color:#573e10,stroke-width:2px;");
  lines.push("  classDef endNode fill:#e8edf4,stroke:#233d63,color:#15273c,stroke-width:2px;");
  lines.push("  classDef docNode fill:#f0eaf7,stroke:#7159a4,color:#302046,stroke-width:1px;");
  lines.push("  classDef noteNode fill:#fff,stroke:#9aa5b0,color:#566576,stroke-width:1px,stroke-dasharray:5 3;");
  return lines.join("\n");
}
export type PlanItem = {stage:string;label:string;action:"done"|"review_public_suggestion"|"ask_required"|"review_existing"|"optional";required:boolean;};
export function adaptivePlan(session: Session) {
  const suggestions=session.research.suggestions || [];
  const stages = STAGES.map(stage=>({
    id:stage.id,title:stage.title,
    fields:stage.fields.map(field=>{
      const answer=session.questionnaire.answers[field.id];
      const has=hasAnswer(session,field.id);
      const suggested=suggestions.some(s=>s.field===field.id&&s.state==="suggested");
      const action:PlanItem["action"]=
        has&&answer?.verification==="customer_confirmed" ? "done" :
        suggested ? "review_public_suggestion" :
        has ? "review_existing" :
        field.required ? "ask_required" : "optional";
      return {stage:stage.id,label:field.label,id:field.id,required:field.required,action};
    }),
  }));
  const priority={review_public_suggestion:0,ask_required:1,review_existing:2,optional:3,done:4};
  const incomplete=stages.flatMap(s=>s.fields).filter(f=>f.action!=="done").sort((a,b)=>priority[a.action]-priority[b.action]);
  return {stages,next:incomplete[0]??null,remaining_required:incomplete.filter(f=>f.action==="ask_required").length};
}
