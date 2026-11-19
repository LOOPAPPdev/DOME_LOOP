/** Second Brain document model. All import, parsing, and validation happens before persistence. */
import { MAX_CSV_BYTES, parseCsvCells } from "./prompt-library-csv";

export type KnowledgeKind = "markdown" | "mermaid" | "sheet";
export interface KnowledgeEntry {
  id: string;
  title: string;
  kind: KnowledgeKind;
  body: string;
  updatedAt: number;
}
export const KNOWLEDGE_KEY = "loopapp:second-brain:v1";
export const MAX_KNOWLEDGE_ITEMS = 200;
export const MAX_KNOWLEDGE_BYTES = MAX_CSV_BYTES;
export const MAX_KNOWLEDGE_STORAGE_BYTES = 4 * 1024 * 1024;
export const KIND_LABELS: Record<KnowledgeKind, string> = {
  markdown: "Markdown", mermaid: "Mermaid", sheet: "Planilha",
};
const KINDS: KnowledgeKind[] = ["markdown", "mermaid", "sheet"];

export function kindFromFilename(name: string): KnowledgeKind | "json" | null {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext === "mmd" || ext === "mermaid") return "mermaid";
  if (ext === "csv" || ext === "tsv") return "sheet";
  if (ext === "json") return "json";
  return null;
}
export function extensionForKind(kind: KnowledgeKind) {
  return kind === "markdown" ? "md" : kind === "mermaid" ? "mmd" : "csv";
}
export function newKnowledgeId(items: KnowledgeEntry[]): string {
  const existing = new Set(items.map(item => item.id.toLowerCase()));
  for (let i = 1; i < 100000; i++) {
    const id = "KB-" + String(i).padStart(3, "0");
    if (!existing.has(id.toLowerCase())) return id;
  }
  throw new Error("Não foi possível atribuir um ID.");
}
export function validateKnowledge(raw: unknown): KnowledgeEntry[] {
  if (!Array.isArray(raw) || raw.length > MAX_KNOWLEDGE_ITEMS) throw new Error("Biblioteca de documentos inválida ou demasiado grande.");
  const seen = new Set<string>();
  const records: KnowledgeEntry[] = raw.map((value, index) => {
    if (!value || typeof value !== "object") throw new Error("Registo " + (index + 1) + " inválido.");
    const item = value as Record<string, unknown>;
    if (typeof item.id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(item.id)) throw new Error("ID inválido no registo " + (index + 1) + ".");
    if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 160) throw new Error("Título inválido no registo " + (index + 1) + ".");
    if (!KINDS.includes(item.kind as KnowledgeKind)) throw new Error("Tipo de documento inválido no registo " + (index + 1) + ".");
    if (typeof item.body !== "string" || !item.body.trim() || new TextEncoder().encode(item.body).length > MAX_KNOWLEDGE_BYTES) throw new Error("Conteúdo inválido ou maior que 4 MB no registo " + (index + 1) + ".");
    if (typeof item.updatedAt !== "number" || !Number.isFinite(item.updatedAt)) throw new Error("Data inválida no registo " + (index + 1) + ".");
    const id = item.id.toLowerCase();
    if (seen.has(id)) throw new Error("ID duplicado: " + item.id);
    seen.add(id);
    if (item.kind === "sheet") parseSheet(item.body);
    return {id: item.id, title: item.title.trim(), kind: item.kind as KnowledgeKind, body: item.body, updatedAt: item.updatedAt};
  });
  const bytes = new TextEncoder().encode(JSON.stringify(records)).length;
  if (bytes > MAX_KNOWLEDGE_STORAGE_BYTES) throw new Error("A biblioteca excede 4 MB. Exporte uma cópia e reduza o conteúdo.");
  return records;
}
export interface SheetTable {
  headers: string[];
  rows: string[][];
  separator: string;
}
export function parseSheet(source: string): SheetTable {
  const result = parseCsvCells(source);
  if (!result.rows.length || result.rows[0].every(cell => !cell.trim())) throw new Error("A planilha necessita de um cabeçalho.");
  const headers = result.rows[0].map((name, i) => name.trim() || "Coluna " + (i + 1));
  if (headers.length > 80) throw new Error("A planilha excede 80 colunas.");
  const rows = result.rows.slice(1).map((row, i) => {
    if (row.length > headers.length) throw new Error("Linha " + (i + 2) + ": número de colunas superior ao cabeçalho.");
    return Array.from({length: headers.length}, (_, c) => row[c] ?? "");
  });
  return {headers, rows, separator: result.separator};
}
export function blankDocument(kind: KnowledgeKind, items: KnowledgeEntry[]): KnowledgeEntry {
  const templates: Record<KnowledgeKind, string> = {
    markdown: "# Nova nota\n\nEscreva o conteúdo aqui.",
    mermaid: "flowchart LR\n  A[Entrada] --> B{Decisão?}\n  B -->|Sim| C[Executar]\n  B -->|Não| D[Rever]",
    sheet: "Coluna A;Coluna B\nValor 1;Valor 2",
  };
  return {id: newKnowledgeId(items), title:"Novo " + KIND_LABELS[kind], kind, body:templates[kind], updatedAt:Date.now()};
}
export function importKnowledgeText(name: string, text: string, current: KnowledgeEntry[]): KnowledgeEntry[] {
  if (new TextEncoder().encode(text).length > MAX_KNOWLEDGE_BYTES) throw new Error("O ficheiro excede 4 MB.");
  const kind = kindFromFilename(name);
  if (!kind) throw new Error("Formato não suportado: " + name + ". Utilize .md, .mmd, .csv, .tsv ou .json.");
  let incoming: KnowledgeEntry[];
  if (kind === "json") {
    incoming = validateKnowledge(JSON.parse(text));
  } else {
    const cleanName = name.replace(/\.(md|markdown|mmd|mermaid|csv|tsv)$/i, "").slice(0,160).trim();
    incoming = [{
      id: newKnowledgeId(current),
      title: cleanName || "Sem título",
      kind, body:text, updatedAt:Date.now(),
    }];
  }
  // Import is additive, even if the backup has IDs that already exist.
  const result = current.slice();
  for (const item of incoming) {
    result.push({...item, id: newKnowledgeId(result), updatedAt:Date.now()});
  }
  return validateKnowledge(result);
}
export type FlowNode = {id:string; label:string; shape:"rect"|"decision"|"round"};
export type FlowEdge = {from:string; to:string; label:string};
export type Flowchart = {direction:"TD"|"TB"|"BT"|"LR"|"RL"; nodes:FlowNode[]; edges:FlowEdge[]};

/** Safe offline renderer for a documented subset of Mermaid flowcharts.
 * Never silently drops unsupported statements: callers display an explicit error.
 */
export function parseMermaidFlowchart(source: string): Flowchart {
  const statements = source.split(/\r?\n|;/).map(line => line.replace(/%%.*$/, "").trim()).filter(Boolean);
  const first = statements.shift() || "";
  const header = /^(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)$/i.exec(first);
  if (!header) throw new Error("Visualização disponível para Mermaid flowchart TD/TB/BT/LR/RL. Outros diagramas mantêm a vista de código.");
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const readNode = (raw: string): string => {
    const match = /^([A-Za-z][A-Za-z0-9_-]*)(?:\[([^\]]*)\]|\{([^}]*)\}|\(([^)]*)\))?$/.exec(raw.trim());
    if (!match) throw new Error("Nó ou forma não suportada: " + raw.trim());
    const id = match[1];
    const shape = match[3] !== undefined ? "decision" : match[4] !== undefined ? "round" : "rect";
    const label = (match[2] ?? match[3] ?? match[4] ?? id).replace(/^["']|["']$/g, "").trim();
    const previous = nodes.get(id);
    nodes.set(id, {id, label:match[2] === undefined && match[3] === undefined && match[4] === undefined && previous ? previous.label : label, shape:match[2] === undefined && match[3] === undefined && match[4] === undefined && previous ? previous.shape : shape});
    return id;
  };
  for (const statement of statements) {
    const edge = /^(.*?)\s*-->\s*(?:\|([^|]+)\|\s*)?(.*?)$/.exec(statement);
    if (edge) {
      const from = readNode(edge[1]), to = readNode(edge[3]);
      edges.push({from,to,label:(edge[2] || "").trim()});
    } else readNode(statement);
    if (nodes.size > 60 || edges.length > 120) throw new Error("Diagrama demasiado grande (máximo 60 nós e 120 ligações).");
  }
  if (!nodes.size) throw new Error("Adicione pelo menos um nó ao diagrama.");
  return {direction: header[1].toUpperCase() as Flowchart["direction"], nodes:[...nodes.values()], edges};
}
