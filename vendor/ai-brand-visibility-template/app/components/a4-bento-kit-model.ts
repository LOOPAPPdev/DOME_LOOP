import source from "./a4-bento-kit.data.json";

/** Data model for the 27-card A4 Kit. Rendering and persistence stay separate. */
export const FACE_IDS=["A","B","C"] as const;
export type FaceId=typeof FACE_IDS[number];
export const FIELD_IDS=["title","subtitle","status","action_label"] as const;
export type FieldId=typeof FIELD_IDS[number];
export type CardRole="macro"|"meso"|"micro";
export type CardFields=Record<FieldId,string>;
export type Card={
  card_id:string;face_id:FaceId;section:string;slot:number;role:CardRole;
  geometry_slot:string;fields:CardFields;compact:Partial<CardFields>;
  action_type:string;target_card_id:string;
};
export type Seed={version:string;system:string;source_of_truth:string;locale:string;card_count:number;field_count:number;fields_per_card:string[];cards:Card[]};
export type FieldRow={
  record_id:string;card_id:string;face_id:string;slot:number;role:CardRole;
  field_key:FieldId;value:string;compact_value:string;required:string
};
export const ORIGINAL=source as Seed;
export const STORAGE_KEY="a4-bento-cleansea-v1"; // Same key as the original HTML editor
export const MAX_FILE_SIZE=1024*1024;
export const FIELD_LIMITS:Record<FieldId,number>={title:200,subtitle:500,status:1000,action_label:200};
export const ROLE_DIMS:Record<CardRole,[number,number]>={
  macro:[125.333333,51.333333],meso:[28.333333,51.333333],micro:[28.333333,23.666667]
};
export const SECTIONS:Record<FaceId,string>={A:"Planeamento",B:"Operação",C:"Fecho"};
export const COLUMNS=["record_id","card_id","face_id","slot","role","field_key","value","compact_value","required"] as const;
const clone=<T,>(v:T):T=>structuredClone(v);
export const originalCards=()=>clone(ORIGINAL.cards);

export function validateCards(raw:unknown,requireComplete=false):Card[]{
  if(!Array.isArray(raw)||raw.length!==27)throw new Error("São necessários exatamente 27 cartões.");
  const accepted=new Map(ORIGINAL.cards.map(card=>[card.card_id,card]));
  const seen=new Set<string>();
  const result:Card[]=[];
  for(const item of raw){
    if(!item||typeof item!=="object")throw new Error("Cartão inválido.");
    const input=item as Record<string,unknown>;
    const id=input.card_id;
    if(typeof id!=="string"||!accepted.has(id)||seen.has(id))throw new Error("ID desconhecido ou duplicado: "+String(id));
    seen.add(id);
    const baseline=accepted.get(id)!;
    if(!input.fields||typeof input.fields!=="object")throw new Error("Campos inválidos: "+id);
    const values=input.fields as Record<string,unknown>;
    const compactInput=(input.compact&&typeof input.compact==="object")?input.compact as Record<string,unknown>:{};
    const fields={} as CardFields,compact:Partial<CardFields>={};
    for(const key of FIELD_IDS){
      const val=values[key];
      if(typeof val!=="string"||val.length>FIELD_LIMITS[key]||(requireComplete&&!val.trim()))throw new Error("Campo obrigatório inválido: "+id+"|"+key);
      fields[key]=val;
      const short=compactInput[key];
      if(short!==undefined&&short!==null&&short!==""){
        if(typeof short!=="string"||short.length>FIELD_LIMITS[key])throw new Error("Valor compacto inválido: "+id+"|"+key);
        compact[key]=short;
      }
    }
    result.push({...baseline,fields,compact});
  }
  return ORIGINAL.cards.map(card=>result.find(x=>x.card_id===card.card_id)!);
}
export function updateCard(cards:Card[],id:string,key:FieldId,value:string,compact=false):Card[]{
  const limit=FIELD_LIMITS[key];
  return cards.map(card=>{
    if(card.card_id!==id)return card;
    return compact
      ? {...card,compact:{...card.compact,[key]:value.slice(0,limit)}}
      : {...card,fields:{...card.fields,[key]:value.slice(0,limit)}};
  });
}
export const selectedCard=(cards:Card[],id:string)=>cards.find(c=>c.card_id===id)??cards[1];
export const cardFor=(cards:Card[],face:FaceId,slot:number)=>cards.find(c=>c.face_id===face&&c.slot===slot);

export function fieldRows(cards:Card[]):FieldRow[]{
  return cards.flatMap(card=>FIELD_IDS.map(field_key=>({
    record_id:card.card_id+"|"+field_key,
    card_id:card.card_id,face_id:card.face_id,slot:card.slot,role:card.role,
    field_key,value:card.fields[field_key],compact_value:card.compact?.[field_key]||"",required:"TRUE",
  })));
}
function quoteCSV(value:unknown):string {
  let raw=String(value??"");
  // Neutralize formula execution when CSV is opened by spreadsheet software.
  if(/^[\s]*[=+@-]/.test(raw))raw="'"+raw;
  return /[",\r\n]/.test(raw) ? '"'+raw.replace(/"/g,'""')+'"' : raw;
}
function restoreFormula(value:string):string {
  return /^'[\s]*[=+@-]/.test(value)?value.slice(1):value;
}
export function exportCSV(cards:Card[]):string {
  const rows=[COLUMNS as readonly string[],...fieldRows(cards).map(row=>COLUMNS.map(key=>String(row[key])) )];
  return "\uFEFF"+rows.map(row=>row.map(quoteCSV).join(",")).join("\r\n")+"\r\n";
}
export function exportJSON(cards:Card[]):string {
  return JSON.stringify({...ORIGINAL,cards},null,2)+"\n";
}

/** RFC4180-compatible comma parser; multiline quotes and Windows endings supported. */
export function parseCsvCells(raw:string):string[][] {
  if(new TextEncoder().encode(raw).length>MAX_FILE_SIZE)throw new Error("CSV superior a 1 MB.");
  const input=raw.replace(/^\uFEFF/,"");
  const rows:string[][]=[];
  let row:string[]=[],value="",quoted=false,finishedQuote=false;
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(quoted){
      if(c==='"'&&input[i+1]==='"'){value+='"';i++;}
      else if(c==='"'){quoted=false;finishedQuote=true;}
      else value+=c;
      continue;
    }
    if(c==='"'){
      if(value!==""||finishedQuote)throw new Error("Aspas inválidas no CSV.");
      quoted=true;continue;
    }
    if(finishedQuote&&c!==","&&c!=="\r"&&c!=="\n")throw new Error("Caracteres após aspas fechadas.");
    if(c===","){row.push(value);value="";finishedQuote=false;continue;}
    if(c==="\r"||c==="\n"){
      if(c==="\r"&&input[i+1]==="\n")i++;
      row.push(value);rows.push(row);row=[];value="";finishedQuote=false;continue;
    }
    value+=c;
  }
  if(quoted)throw new Error("Aspas CSV não fechadas.");
  if(row.length||value!==""||finishedQuote){row.push(value);rows.push(row);}
  return rows;
}
export function previewImportCSV(raw:string,baseline:Card[]):{cards:Card[];count:number;changed:number}{
  const parsed=parseCsvCells(raw);
  const headers=parsed.shift();
  if(!headers||new Set(headers).size!==headers.length||!COLUMNS.every(name=>headers.includes(name)))throw new Error("Cabeçalho CSV incompatível.");
  const ix=(name:typeof COLUMNS[number])=>headers.indexOf(name);
  const rowRecords=new Map<string,{value:string;short:string}>();
  const known=new Map(ORIGINAL.cards.map(card=>[card.card_id,card]));
  for(const row of parsed){
    if(row.length===1&&row[0]==="")continue;
    if(row.length!==headers.length)throw new Error("Número de colunas incorreto no CSV.");
    const id=row[ix("card_id")],key=row[ix("field_key")] as FieldId,record=row[ix("record_id")];
    if(!known.has(id)||!FIELD_IDS.includes(key)||record!==id+"|"+key||rowRecords.has(record))throw new Error("ID desconhecido ou duplicado: "+record);
    const original=known.get(id)!;
    if(row[ix("face_id")]!==original.face_id||Number(row[ix("slot")])!==original.slot||row[ix("role")]!==original.role||row[ix("required")]!=="TRUE")throw new Error("Geometria/identidade inválida: "+record);
    const value=restoreFormula(row[ix("value")]),short=restoreFormula(row[ix("compact_value")]);
    if(!value.trim()||value.length>FIELD_LIMITS[key]||short.length>FIELD_LIMITS[key])throw new Error("Campo vazio ou excessivo: "+record);
    rowRecords.set(record,{value,short});
  }
  if(rowRecords.size!==108)throw new Error("Esperadas 108 linhas; recebidas "+rowRecords.size+".");
  const imported=ORIGINAL.cards.map(original=>{
    const fields={} as CardFields,compact:Partial<CardFields>={};
    for(const key of FIELD_IDS){
      const record=rowRecords.get(original.card_id+"|"+key)!;
      fields[key]=record.value;
      if(record.short)compact[key]=record.short;
    }
    return {...original,fields,compact};
  });
  const changed=imported.filter(c=>{
    const previous=baseline.find(x=>x.card_id===c.card_id);
    return !previous || FIELD_IDS.some(k=>previous.fields[k]!==c.fields[k]|| (previous.compact[k]||"")!==(c.compact[k]||""));
  }).length;
  return {cards:validateCards(imported,true),count:108,changed};
}
