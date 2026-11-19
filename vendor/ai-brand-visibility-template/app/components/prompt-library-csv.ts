/** Biblioteca Bento: CSV parsing, validation, merge and export.
 * This module contains no UI or storage calls. It is reusable by the React app.
 */
export interface PromptEntry {
  id: string;
  segment: string;
  title: string;
  address: string;
  description: string;
  body: string;
}

export const PROMPT_COLUMNS = ["id", "segment", "title", "address", "description", "body"] as const;
export const LIBRARY_STORAGE_KEY = "loopapp:prompt-library:v1";
export const MAX_CSV_BYTES = 4 * 1024 * 1024;
export const MAX_LIBRARY_ITEMS = 1000;
export type ImportMode = "merge" | "replace";

const ALIASES: Record<keyof PromptEntry, string[]> = {
  id: ["id", "identificador", "codigo", "code"],
  segment: ["segment", "segmento", "categoria", "category"],
  title: ["title", "titulo", "nome", "name"],
  address: ["address", "endereco", "posicao", "celula", "localizacao"],
  description: ["description", "descricao", "resumo", "summary"],
  body: ["body", "content", "conteudo", "texto", "promptcompleto", "prompttext", "promptbody", "comando"],
};

export const normalizeLabel = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const normalizeId = (value: string) => value.trim().toLocaleLowerCase("pt");

function detectSeparator(text: string): "," | ";" | "\t" {
  const candidates = [",", ";", "\t"] as const;
  const counts = [0, 0, 0];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { i++; continue; }
      quoted = !quoted;
      continue;
    }
    if (!quoted && (ch === "\n" || ch === "\r")) break;
    if (!quoted) {
      const index = candidates.indexOf(ch as (typeof candidates)[number]);
      if (index !== -1) counts[index]++;
    }
  }
  const max = Math.max(...counts);
  if (max === 0) throw new Error("Não foi encontrado um separador CSV. Utilize vírgula, ponto e vírgula ou tabulação.");
  return candidates[counts.indexOf(max)];
}

/** RFC 4180-style quoted cells, embedded line breaks and escaped double quotes. */
export function parseCsvCells(input: string): {rows: string[][]; separator: string} {
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES) throw new Error("O ficheiro CSV excede 4 MB.");
  if (!text.trim()) throw new Error("O CSV está vazio.");
  const separator = detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let justClosed = false;
  const finishCell = () => {
    row.push(cell);
    cell = "";
    justClosed = false;
  };
  const finishRow = () => {
    finishCell();
    if (row.some(value => value.trim().length > 0)) rows.push(row);
    row = [];
    if (rows.length > MAX_LIBRARY_ITEMS + 1) throw new Error("O CSV excede o limite de 1.000 prompts.");
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; justClosed = true; }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      if (cell.trim().length === 0 && !justClosed) {
        cell = "";
        quoted = true;
      } else {
        throw new Error("Aspas CSV inválidas perto do registo " + String(rows.length + 1) + ".");
      }
    } else if (char === separator) {
      finishCell();
    } else if (char === "\n") {
      finishRow();
    } else if (justClosed) {
      if (char !== " " && char !== "\t") {
        throw new Error("Caráter inesperado depois de aspas perto do registo " + String(rows.length + 1) + ".");
      }
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("Há aspas CSV por fechar.");
  if (row.length || cell.length || justClosed) finishRow();
  return { rows, separator };
}

function aliasesFor(field: keyof PromptEntry) {
  return ALIASES[field].map(normalizeLabel);
}

export function validatePrompt(entry: PromptEntry): string[] {
  const errors: string[] = [];
  if (!entry.id.trim()) errors.push("ID obrigatório.");
  if (entry.id.length > 80 || /[\r\n;,]/.test(entry.id)) errors.push("ID inválido (máximo 80 caracteres, sem quebras de linha, vírgulas ou ponto e vírgula).");
  if (!entry.title.trim()) errors.push("Título obrigatório.");
  if (!entry.body.trim()) errors.push("Conteúdo do prompt obrigatório.");
  if (entry.title.length > 160) errors.push("Título demasiado longo (máximo 160 caracteres).");
  if (entry.segment.length > 120 || entry.address.length > 120) errors.push("Segmento ou endereço demasiado longo.");
  if (entry.description.length > 1200) errors.push("Descrição demasiado longa (máximo 1.200 caracteres).");
  if (entry.body.length > 100000) errors.push("Prompt demasiado longo (máximo 100.000 caracteres).");
  return errors;
}

function getField(row: string[], index: number) {
  return index >= 0 ? (row[index] || "").trim() : "";
}

export interface CsvPreview {
  entries: PromptEntry[];
  warnings: string[];
  separator: string;
  columns: string[];
}

export function parsePromptCsv(text: string): CsvPreview {
  const parsed = parseCsvCells(text);
  if (parsed.rows.length < 2) throw new Error("O CSV tem de conter um cabeçalho e pelo menos um registo.");
  const header = parsed.rows[0].map(normalizeLabel);
  const indices = Object.fromEntries(PROMPT_COLUMNS.map(key => [
    key, header.findIndex(cell => aliasesFor(key).includes(cell))
  ])) as Record<keyof PromptEntry, number>;
  const promptCol = header.findIndex(cell => cell === "prompt");
  if (indices.id < 0) throw new Error("Falta a coluna ID.");
  if (indices.title < 0 && indices.body < 0 && promptCol < 0) {
    throw new Error("Falta uma coluna de título ou conteúdo: title, titulo, prompt ou body.");
  }
  const result: PromptEntry[] = [];
  const seen = new Set<string>();
  const warnings: string[] = [];
  if (indices.body < 0) warnings.push("Sem coluna body/conteudo: o campo Prompt ou Título também será usado como texto integral.");
  if (indices.address < 0 || indices.description < 0) warnings.push("Colunas opcionais em falta serão preenchidas com valores vazios.");
  for (let i = 1; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    if (row.length > header.length && row.slice(header.length).some(value => value.trim())) {
      throw new Error("Linha " + String(i + 1) + ": mais colunas do que no cabeçalho.");
    }
    const prompt = getField(row, promptCol);
    const originalBody = getField(row, indices.body);
    const explicitTitle = getField(row, indices.title);
    const rawBody = originalBody || prompt || explicitTitle;
    const rawTitle = explicitTitle || prompt || rawBody;
    const title = rawTitle.slice(0, 160).split("\n")[0].trim() || rawTitle.slice(0, 160);
    const entry: PromptEntry = {
      id: getField(row, indices.id),
      segment: getField(row, indices.segment) || "Sem segmento",
      title,
      address: getField(row, indices.address),
      description: getField(row, indices.description),
      body: rawBody,
    };
    const issues = validatePrompt(entry);
    if (issues.length) throw new Error("Linha " + String(i + 1) + ": " + issues.join(" "));
    const key = normalizeId(entry.id);
    if (seen.has(key)) throw new Error("ID duplicado no CSV: " + entry.id + ".");
    seen.add(key);
    result.push(entry);
  }
  return {entries: result, warnings, separator: parsed.separator, columns: parsed.rows[0]};
}

export function validateLibrary(data: unknown): PromptEntry[] {
  if (!Array.isArray(data) || data.length > MAX_LIBRARY_ITEMS) throw new Error("Formato da biblioteca inválido.");
  const seen = new Set<string>();
  return data.map((raw, i) => {
    if (!raw || typeof raw !== "object") throw new Error("Registo " + String(i + 1) + " inválido.");
    const obj = raw as Record<string, unknown>;
    if (PROMPT_COLUMNS.some(k => typeof obj[k] !== "string")) throw new Error("O registo " + String(i + 1) + " contém campos inválidos.");
    const entry = Object.fromEntries(PROMPT_COLUMNS.map(k => [k, obj[k]])) as unknown as PromptEntry;
    const errors = validatePrompt(entry);
    if (errors.length) throw new Error("Registo " + String(i + 1) + ": " + errors.join(" "));
    const normalized = normalizeId(entry.id);
    if (seen.has(normalized)) throw new Error("ID repetido: " + entry.id + ".");
    seen.add(normalized);
    return entry;
  });
}

export function applyCsvImport(current: PromptEntry[], incoming: PromptEntry[], mode: ImportMode): PromptEntry[] {
  if (mode === "replace") return validateLibrary(incoming);
  const result = current.slice();
  const index = new Map(current.map((item, i) => [normalizeId(item.id), i]));
  for (const entry of incoming) {
    const key = normalizeId(entry.id);
    const position = index.get(key);
    if (position === undefined) {
      index.set(key, result.length);
      result.push(entry);
    } else {
      result[position] = entry;
    }
  }
  return validateLibrary(result);
}

function csvCell(value: string, delimiter: string): string {
  return /["\r\n]/.test(value) || value.includes(delimiter)
    ? '"' + value.replace(/"/g, '""') + '"'
    : value;
}

/** UTF-8 BOM and CRLF improve Excel compatibility without changing prompt bodies. */
export function exportPromptCsv(entries: PromptEntry[], delimiter = ";"): string {
  return "\uFEFF" + [
    PROMPT_COLUMNS.join(delimiter),
    ...entries.map(item => PROMPT_COLUMNS.map(key => csvCell(item[key], delimiter)).join(delimiter)),
  ].join("\r\n") + "\r\n";
}
