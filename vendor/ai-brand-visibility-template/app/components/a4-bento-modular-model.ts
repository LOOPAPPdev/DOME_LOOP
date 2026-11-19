import source from "./a4-bento-modular.data.json";

export type Layout = "bento" | "uniform";
export type Level = "macro" | "meso" | "micro";
export type FieldKey = "t" | "s" | "b" | "a";
export type CardData = Record<FieldKey,string>;
export type CardMap = Record<string, CardData>;
export type Config = {layout:Layout; faces:number; cols:number;rows:number;margin:number;gap:number};
export type Slot = {n:number;lv:Level;c:number;cs:number;r:number;rs:number;w:number;h:number;fs:number};
export type Geometry = {cfg:Config;H:number;mw:number;mh:number;slots:Slot[];notes:string[]};
export type ProjectDocument = {schema_version:1;cfg:Config;data:CardMap};

export const PAGE_W=source.page_mm.width;
export const PAGE_H=source.page_mm.height;
export const FACES="ABCDEF";
export const PRESETS=source.presets as Record<"bento"|"uni",Config>;
export const LIMITS=source.limits as Record<Level,Record<FieldKey,number>>;
export const EXAMPLE=source.sample as CardMap;
export const STORAGE_KEY="bento-a4-v2"; // exact legacy key: local edits survive the React migration.
const EMPTY:CardData={t:"",s:"",b:"",a:""};
const MAX_IMPORT_BYTES=1024*1024;

export const defaultConfig=():Config=>({...PRESETS.bento});
export const exampleData=():CardMap=>structuredClone(EXAMPLE);
export const cardId=(face:number,slot:number)=>FACES[face]+"-"+String(slot).padStart(2,"0");
export const getCard=(data:CardMap,id:string):CardData=>data[id]||EMPTY;
export const format=(n:number,places=2)=>n.toLocaleString("pt-PT",{maximumFractionDigits:places});
export const px=(mm:number)=>format(mm/25.4*96,2);
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const numeric=(value:unknown, fallback:number)=>typeof value==="number" && Number.isFinite(value)?value:fallback;

export function geometry(raw:Config):Geometry {
  const notes:string[]=[];
  const cfg:Config={
    layout:raw.layout==="uniform"?"uniform":"bento",
    faces:clamp(Math.round(numeric(raw.faces,3)),1,6),
    cols:clamp(Math.round(numeric(raw.cols,6)),1,12),
    rows:clamp(Math.round(numeric(raw.rows,3)),1,8),
    margin:clamp(numeric(raw.margin,10),0,20),
    gap:clamp(numeric(raw.gap,4),0,10),
  };
  if(cfg.layout==="bento"&&cfg.cols<3){
    cfg.cols=3; notes.push("Bento precisa de pelo menos 3 colunas (meso, macro, meso).");
  }
  if(cfg.layout==="bento"&&cfg.rows<2){
    cfg.rows=2;notes.push("Bento precisa de pelo menos 2 linhas (topo e micro).");
  }
  const H=PAGE_H/cfg.faces;
  if(cfg.margin*2>=Math.min(PAGE_W,H)-1){
    cfg.margin=Math.min(cfg.margin,5);
    notes.push("Margem reduzida: não cabe na face.");
  }
  // Prevent negative heights when many rows/faces and a large gap are selected.
  const roomX=PAGE_W-2*cfg.margin, roomY=H-2*cfg.margin;
  const maxGapX=cfg.cols>1?(roomX-6*cfg.cols)/(cfg.cols-1):10;
  const maxGapY=cfg.rows>1?(roomY-4*cfg.rows)/(cfg.rows-1):10;
  const safeGap=Math.max(0,Math.min(cfg.gap,maxGapX,maxGapY));
  if(safeGap<cfg.gap){cfg.gap=Math.round(safeGap*100)/100;notes.push("Gap reduzido para manter dimensões positivas nos módulos.");}
  const mw=(PAGE_W-2*cfg.margin-(cfg.cols-1)*cfg.gap)/cfg.cols;
  const mh=(H-2*cfg.margin-(cfg.rows-1)*cfg.gap)/cfg.rows;
  if(mw<12||mh<8)notes.push("Módulos muito pequenos ("+format(mw/10)+" × "+format(mh/10)+" cm): o texto pode não caber.");
  const dims=(c:number,cs:number,r:number,rs:number)=>{
    void c;void r;
    return {w:cs*mw+(cs-1)*cfg.gap,h:rs*mh+(rs-1)*cfg.gap};
  };
  const fontFor=(w:number)=>clamp(1.1+(w/PAGE_W*100)*0.035,1.4,3.2);
  const slots:Slot[]=[];
  const add=(n:number,lv:Level,c:number,cs:number,r:number,rs:number)=>{
    const {w,h}=dims(c,cs,r,rs);
    const required={macro:9.8,meso:7.5,micro:5}[lv];
    slots.push({n,lv,c,cs,r,rs,w,h,fs:Math.max(.4,Math.min(fontFor(w),(h/PAGE_W*100)/required))});
  };
  if(cfg.layout==="bento"){
    add(1,"meso",1,1,1,cfg.rows-1);
    add(2,"macro",2,cfg.cols-2,1,cfg.rows-1);
    add(3,"meso",cfg.cols,1,1,cfg.rows-1);
    for(let k=0;k<cfg.cols;k++)add(k+4,"micro",k+1,1,cfg.rows,1);
  }else {
    for(let r=0;r<cfg.rows;r++)for(let c=0;c<cfg.cols;c++){
      const {w,h}=dims(c+1,1,r+1,1),fs=fontFor(w),hh=h/PAGE_W*100;
      const level:Level=hh>=fs*10?"macro":hh>=fs*7.5?"meso":"micro";
      add(r*cfg.cols+c+1,level,c+1,1,r+1,1);
    }
  }
  return {cfg,H,mw,mh,slots,notes};
}
export const allIds=(geom:Geometry)=>Array.from({length:geom.cfg.faces},(_,f)=>geom.slots.map(slot=>cardId(f,slot.n))).flat();

export function setCardField(data:CardMap,id:string,key:FieldKey,value:string,level:Level):CardMap {
  const max=LIMITS[level][key];
  return {...data,[id]:{...getCard(data,id),[key]:value.slice(0,max)}};
}
export function copyFace(data:CardMap,geom:Geometry,origin:number):CardMap {
  const result=structuredClone(data);
  for(const slot of geom.slots){
    const item=data[cardId(origin,slot.n)];
    for(let f=0;f<geom.cfg.faces;f++){
      if(f===origin)continue;
      const target=cardId(f,slot.n);
      if(item)result[target]={...item};
      else delete result[target];
    }
  }
  return result;
}
export function clearFace(data:CardMap,geom:Geometry,face:number):CardMap {
  const next={...data};
  for(const slot of geom.slots)delete next[cardId(face,slot.n)];
  return next;
}
export function legacyExportRows(data:CardMap,ids:string[]){
  const pairs:[string,FieldKey][]=[["title","t"],["subtitle","s"],["status","b"],["action_label","a"]];
  return ids.flatMap(id=>pairs.map(([field_key,key])=>({card_id:id,field_key,value:getCard(data,id)[key]})));
}
export function parseStored(data:unknown):{cfg:Config;data:CardMap}{
  if(!data || typeof data!=="object")throw new Error("Ficheiro inválido.");
  const raw=data as Record<string,unknown>;
  const candidate=raw.cfg;
  if(!candidate || typeof candidate!=="object")throw new Error("Configuração em falta.");
  const cfg=geometry(candidate as Config).cfg;
  const cards=raw.data;
  if(!cards||typeof cards!=="object"||Array.isArray(cards))throw new Error("Dados dos cartões em falta.");
  if(Object.keys(cards).length>1000)throw new Error("Número de cartões excessivo.");
  const valid:CardMap={};
  for(const [id,item] of Object.entries(cards)){
    if(!/^[A-F]-(?:0[1-9]|[1-9][0-9]{1,2})$/.test(id))throw new Error("ID de cartão inválido: "+id);
    if(!item||typeof item!=="object")throw new Error("Cartão inválido: "+id);
    const rawItem=item as Record<string,unknown>;
    for(const key of ["t","s","b","a"]){
      if(rawItem[key]!==undefined && (typeof rawItem[key]!=="string" || (rawItem[key] as string).length>5000))throw new Error("Campo inválido: "+id+" "+key);
    }
    valid[id]={t:String(rawItem.t||""),s:String(rawItem.s||""),b:String(rawItem.b||""),a:String(rawItem.a||"")};
  }
  return {cfg,data:valid};
}
export function importJSON(text:string){
  if(new TextEncoder().encode(text).length>MAX_IMPORT_BYTES)throw new Error("Ficheiro superior a 1 MB.");
  return parseStored(JSON.parse(text));
}
export function exportJSON(cfg:Config,data:CardMap){
  const payload:ProjectDocument={schema_version:1,cfg,data};
  return JSON.stringify(payload,null,2);
}
