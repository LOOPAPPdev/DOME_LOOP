import type { ReactNode } from "react";
import { parseMermaidFlowchart } from "./second-brain-model";
import { SheetReader } from "./second-brain-sheet";
import type { KnowledgeEntry, Flowchart } from "./second-brain-model";

function inline(value:string): ReactNode[] {
  return value.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\x60[^\x60]+\x60|\*[^*]+\*)/g).filter(Boolean).map((chunk,index)=>{
    const link=/^\[([^\]]+)\]\(([^)]+)\)$/.exec(chunk);
    if(link) return /^(https?:\/\/|mailto:)/i.test(link[2])?<a href={link[2]} key={index} target="_blank" rel="noopener noreferrer">{link[1]}</a>:<span key={index}>{link[1]} ({link[2]})</span>;
    if(chunk.startsWith("**")&&chunk.endsWith("**"))return <strong key={index}>{chunk.slice(2,-2)}</strong>;
    if(chunk.startsWith("*")&&chunk.endsWith("*"))return <em key={index}>{chunk.slice(1,-1)}</em>;
    if(chunk.startsWith("\x60")&&chunk.endsWith("\x60"))return <code key={index}>{chunk.slice(1,-1)}</code>;
    return <span key={index}>{chunk}</span>;
  });
}
export function MarkdownReader({source}:{source:string}) {
  const lines=source.replace(/\r\n?/g,"\n").split("\n");
  const result:ReactNode[]=[];
  for(let i=0;i<lines.length;){
    const line=lines[i], key=result.length;
    if(!line.trim()){i++;continue;}
    if(/^\s*\x60{3}/.test(line)){
      const lang=line.trim().slice(3).trim(),body:string[]=[];
      i++;
      while(i<lines.length&&!/^\s*\x60{3}/.test(lines[i]))body.push(lines[i++]);
      if(i<lines.length)i++;
      result.push(<div className="sb-code" key={key}>{lang&&<span>{lang}</span>}<pre><code>{body.join("\n")}</code></pre></div>);
      continue;
    }
    const heading=/^(#{1,6})\s+(.+)$/.exec(line);
    if(heading){result.push(<h3 key={key} className={"sb-h"+heading[1].length}>{inline(heading[2])}</h3>);i++;continue;}
    const cells=(str:string)=>str.trim().replace(/^\||\|$/g,"").split("|").map(cell=>cell.trim());
    if(/^\|.*\|$/.test(line.trim()) && i+1<lines.length && /^\s*\|?[\s:|-]+\|\s*$/.test(lines[i+1])){
      const headers=cells(line),rows:string[][]=[];
      i+=2;
      while(i<lines.length && /^\s*\|.*\|\s*$/.test(lines[i]))rows.push(cells(lines[i++]));
      result.push(<div key={key} className="sb-scroll"><table className="sb-table"><thead><tr>{headers.map((h,n)=><th key={n}>{inline(h)}</th>)}</tr></thead><tbody>{rows.map((row,n)=><tr key={n}>{headers.map((_,j)=><td key={j}>{inline(row[j]||"")}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if(/^\s*[-*+]\s+/.test(line)||/^\s*\d+\.\s+/.test(line)){
      const ordered=/^\s*\d+\.\s+/.test(line),pattern=ordered?/^\s*\d+\.\s+(.+)$/:/^\s*[-*+]\s+(.+)$/;
      const children:ReactNode[]=[];
      while(i<lines.length&&pattern.test(lines[i]))children.push(<li key={children.length}>{inline(lines[i++].match(pattern)![1])}</li>);
      result.push(ordered?<ol key={key}>{children}</ol>:<ul key={key}>{children}</ul>);
      continue;
    }
    if(/^\s*>\s?/.test(line)){
      const text:string[]=[];
      while(i<lines.length&&/^\s*>\s?/.test(lines[i]))text.push(lines[i++].replace(/^\s*>\s?/,""));
      result.push(<blockquote key={key}>{inline(text.join(" "))}</blockquote>);continue;
    }
    if(/^([-*_])\1{2,}\s*$/.test(line.trim())){result.push(<hr key={key}/>);i++;continue;}
    const paragraph:string[]=[];
    while(i<lines.length&&lines[i].trim()&&!/^\s*(?:#{1,6}\s|\x60{3}|[-*+]\s|\d+\.\s|>\s?)/.test(lines[i]))paragraph.push(lines[i++]);
    if(!paragraph.length)paragraph.push(lines[i++]);
    result.push(<p key={key}>{inline(paragraph.join(" "))}</p>);
  }
  return <article className="sb-markdown" aria-label="Markdown renderizado">{result}</article>;
}
function splitLabel(text:string){
  const words=text.split(/\s+/);const lines:string[]=[];let current="";
  for(const word of words){
    if(current&&(current+" "+word).length>23){lines.push(current);current=word;}
    else current=current?current+" "+word:word;
  }
  if(current)lines.push(current);
  return lines.slice(0,3);
}
function FlowSvg({chart}:{chart:Flowchart}){
  const horizontal=chart.direction==="LR"||chart.direction==="RL";
  const reverse=chart.direction==="RL"||chart.direction==="BT";
  const level=new Map<string,number>(chart.nodes.map(node=>[node.id,0]));
  const inDegree=new Map<string,number>(chart.nodes.map(node=>[node.id,0]));
  for(const edge of chart.edges)inDegree.set(edge.to,(inDegree.get(edge.to)||0)+1);
  const queue=chart.nodes.filter(node=>inDegree.get(node.id)===0).map(node=>node.id);
  for(let cursor=0;cursor<queue.length;cursor++){
    const id=queue[cursor];
    for(const edge of chart.edges.filter(e=>e.from===id)){
      level.set(edge.to,Math.max(level.get(edge.to)||0,(level.get(id)||0)+1));
      inDegree.set(edge.to,(inDegree.get(edge.to)||0)-1);
      if(inDegree.get(edge.to)===0)queue.push(edge.to);
    }
  }
  const groups=new Map<number,string[]>();
  chart.nodes.forEach(node=>{const depth=level.get(node.id)||0;groups.set(depth,[...(groups.get(depth)||[]),node.id]);});
  const depths=[...groups.keys()].sort((a,b)=>a-b);
  const maxRows=Math.max(...[...groups.values()].map(nodes=>nodes.length));
  const width=horizontal?depths.length*230+42:maxRows*225+42;
  const height=horizontal?maxRows*112+42:depths.length*112+42;
  const position=new Map<string,{x:number;y:number}>();
  depths.forEach((depth,index)=>{
    (groups.get(depth)||[]).forEach((id,row)=>{
      const d=reverse?depths.length-index-1:index;
      position.set(id,horizontal?{x:d*230+110,y:row*112+77}:{x:row*225+110,y:d*112+77});
    });
  });
  return <div className="sb-flow"><svg role="img" aria-label={"Fluxograma: "+chart.nodes.length+" nós, "+chart.edges.length+" ligações"} className="sb-flow-svg" viewBox={"0 0 "+Math.max(width,250)+" "+Math.max(height,160)}>
    <title>Fluxograma Mermaid</title><defs><marker id="sb-flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#737373"/></marker></defs>
    {chart.edges.map((edge,i)=>{
      const a=position.get(edge.from)!,b=position.get(edge.to)!;
      const dir=horizontal?(b.x>=a.x?1:-1):(b.y>=a.y?1:-1);
      const x1=horizontal?a.x+dir*83:a.x,y1=horizontal?a.y:a.y+dir*32;
      const x2=horizontal?b.x-dir*89:b.x,y2=horizontal?b.y:b.y-dir*37;
      const path=edge.from===edge.to?"M"+(a.x+70)+","+(a.y-15)+" C"+(a.x+135)+","+(a.y-85)+" "+(a.x+135)+","+(a.y+85)+" "+(a.x+70)+","+(a.y+15):"M"+x1+","+y1+" L"+x2+","+y2;
      return <g key={i}><path d={path} stroke="#737373" strokeWidth="1.5" fill="none" markerEnd="url(#sb-flow-arrow)"/>{edge.label&&<text x={(a.x+b.x)/2} y={(a.y+b.y)/2-8} fontSize="11" textAnchor="middle" stroke="white" strokeWidth="4" paintOrder="stroke">{edge.label.slice(0,30)}</text>}</g>;
    })}
    {chart.nodes.map(node=>{
      const {x,y}=position.get(node.id)!;const label=splitLabel(node.label);
      return <g key={node.id}>{node.shape==="decision"
        ? <polygon points={x+","+(y-35)+" "+(x+94)+","+y+" "+x+","+(y+35)+" "+(x-94)+","+y} fill="#f4f7ff" stroke="#7c93b7" strokeWidth="1.5"/>
        : <rect x={x-84} y={y-32} width="168" height="64" rx={node.shape==="round"?32:8} fill="#f8fafc" stroke="#a3a3a3" strokeWidth="1.5"/>}
        <text x={x} y={y-(label.length-1)*8} textAnchor="middle" fontSize="12" fill="#171717">{label.map((row,i)=><tspan key={i} x={x} dy={i?17:0}>{row}</tspan>)}</text>
      </g>;
    })}
  </svg><details><summary>Relações em texto · {chart.edges.length} ligações</summary><ul>{chart.edges.map((edge,i)=><li key={i}>{edge.from} → {edge.to}{edge.label?" · "+edge.label:""}</li>)}</ul></details></div>;
}
export function MermaidReader({source}:{source:string}){
  try{return <FlowSvg chart={parseMermaidFlowchart(source)}/>;}
  catch(error){return <div className="sb-notice" role="note">{error instanceof Error?error.message:"Diagrama não suportado."}</div>;}
}
export function KnowledgeReader({item,sourceMode}:{item:KnowledgeEntry;sourceMode:boolean}){
  if(sourceMode)return <pre className="sb-source">{item.body}</pre>;
  if(item.kind==="markdown")return <MarkdownReader source={item.body}/>;
  if(item.kind==="mermaid")return <MermaidReader source={item.body}/>;
  return <SheetReader key={item.id} source={item.body}/>;
}
