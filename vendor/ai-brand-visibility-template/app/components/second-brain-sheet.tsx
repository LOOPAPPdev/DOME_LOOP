import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { parseSheet } from "./second-brain-model";
import "./second-brain-sheet.css";

type Density = "compact" | "comfortable";
type SheetView = "table" | "cards";
type Sort = {column: number | null; direction: "asc" | "desc"};
type Row = {index: number; cells: string[]};
const PAGE_SIZE = 50;

function highlightMatch(value: string, query: string): ReactNode {
  const needle = query.trim();
  if (!needle) return value || "—";
  const start = value.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (start < 0) return value || "—";
  return <>{value.slice(0, start)}<mark>{value.slice(start, start + needle.length)}</mark>{value.slice(start + needle.length)}</>;
}

export function SheetReader({source}: {source:string}) {
  const sheet = useMemo(() => parseSheet(source), [source]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [view, setView] = useState<SheetView>("table");
  const [density, setDensity] = useState<Density>("compact");
  const [sort, setSort] = useState<Sort>({column:null, direction:"asc"});
  const [hidden, setHidden] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const inspector = useRef<HTMLElement>(null);

  const visibleColumns = sheet.headers.map((_, index) => index).filter(index => !hidden.includes(index));
  const rows = useMemo(() => {
    const term = query.toLocaleLowerCase().trim();
    const filtered:Row[] = sheet.rows.map((cells,index) => ({index,cells})).filter(row =>
      !term || row.cells.some(value => value.toLocaleLowerCase().includes(term)));
    if (sort.column !== null) {
      const column = sort.column;
      const collator = new Intl.Collator("pt-PT", {numeric:true,sensitivity:"base"});
      filtered.sort((left,right) => {
        const compare = collator.compare(left.cells[column] || "",right.cells[column] || "");
        return (sort.direction==="asc" ? compare : -compare) || left.index-right.index;
      });
    }
    return filtered;
  }, [sheet, query, sort]);

  const maxPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, maxPage);
  const displayed = rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selectedRow = selected !== null ? sheet.rows[selected] : undefined;

  function selectRow(index:number) {
    setSelected(index);
    window.requestAnimationFrame(() => inspector.current?.scrollIntoView({behavior:"smooth",block:"nearest"}));
  }
  function sortBy(column:number) {
    setSort(old => ({
      column,
      direction:old.column===column && old.direction==="asc" ? "desc" : "asc",
    }));
    setPage(0);
  }
  function toggleColumn(index:number) {
    setHidden(old => {
      if (old.includes(index)) return old.filter(value=>value!==index);
      if (sheet.headers.length-old.length<=1) return old;
      return [...old,index];
    });
  }
  function scrollColumns(direction: -1 | 1) {
    viewport.current?.scrollBy({left:direction*360,behavior:"smooth"});
  }

  return <section className="sb-sheet-v2" data-density={density} aria-label="Leitor de planilha">
    <div className="sb-sheet-summary">
      <div className="sb-sheet-metrics">
        <span><strong>{sheet.rows.length}</strong> linhas</span>
        <span><strong>{sheet.headers.length}</strong> colunas</span>
        <span><strong>{rows.length}</strong> resultados</span>
      </div>
      <div className="sb-sheet-modes" role="group" aria-label="Tipo de visualização da planilha">
        <button type="button" aria-pressed={view==="table"} onClick={()=>setView("table")}>Tabela</button>
        <button type="button" aria-pressed={view==="cards"} onClick={()=>setView("cards")}>Fichas</button>
      </div>
    </div>
    <div className="sb-sheet-tools">
      <label className="sb-sheet-query">
        <span>Pesquisar em todas as colunas</span>
        <input type="search" aria-label="Filtrar linhas da planilha" placeholder="Pesquisar valores…" value={query} onChange={event=>{setQuery(event.target.value);setPage(0);}}/>
      </label>
      <div className="sb-sheet-tool-buttons">
        {query&&<button type="button" onClick={()=>{setQuery("");setPage(0);}}>Limpar filtro</button>}
        <details className="sb-sheet-columns">
          <summary>Colunas ({visibleColumns.length}/{sheet.headers.length})</summary>
          <div className="sb-sheet-columns-menu" role="group" aria-label="Colunas visíveis">
            <div className="sb-sheet-columns-heading"><strong>Mostrar colunas</strong><button type="button" onClick={()=>setHidden([])}>Mostrar todas</button></div>
            {sheet.headers.map((label,index)=><label key={index}>
              <input type="checkbox" checked={!hidden.includes(index)} disabled={!hidden.includes(index)&&visibleColumns.length===1} onChange={()=>toggleColumn(index)}/>
              <span>{label}</span>
            </label>)}
          </div>
        </details>
        <div className="sb-sheet-density" role="group" aria-label="Densidade das linhas">
          <button type="button" aria-pressed={density==="compact"} onClick={()=>setDensity("compact")}>Compacta</button>
          <button type="button" aria-pressed={density==="comfortable"} onClick={()=>setDensity("comfortable")}>Confortável</button>
        </div>
      </div>
    </div>

    {view==="table" ? <>
      <div className="sb-sheet-navigation">
        <p>Selecione uma linha para ler todos os campos. Deslize para ver as restantes colunas.</p>
        <div role="group" aria-label="Deslocar colunas"><button type="button" onClick={()=>scrollColumns(-1)} aria-label="Colunas anteriores">←</button><button type="button" onClick={()=>scrollColumns(1)} aria-label="Colunas seguintes">→</button></div>
      </div>
      <div className="sb-sheet-viewport" ref={viewport} role="region" tabIndex={0} aria-label="Planilha navegável">
        <table className="sb-sheet-grid">
          <colgroup><col className="sb-sheet-index-col"/>{visibleColumns.map(column=><col key={column} className="sb-sheet-value-col"/>)}</colgroup>
          <thead><tr>
            <th scope="col" className="sb-sheet-index-cell">#</th>
            {visibleColumns.map(column=><th scope="col" key={column} aria-sort={sort.column===column?(sort.direction==="asc"?"ascending":"descending"):"none"}>
              <button type="button" title={"Ordenar por "+sheet.headers[column]} onClick={()=>sortBy(column)} className="sb-sheet-sort">
                <span>{sheet.headers[column]}</span>
                <span aria-hidden="true">{sort.column===column?(sort.direction==="asc"?"↑":"↓"):"↕"}</span>
              </button>
            </th>)}
          </tr></thead>
          <tbody>
            {displayed.map(row=><tr key={row.index} data-selected={selected===row.index?"true":undefined} onClick={()=>selectRow(row.index)}>
              <th scope="row" className="sb-sheet-index-cell"><button type="button" className="sb-sheet-row-button" aria-label={"Abrir linha "+(row.index+1)} aria-pressed={selected===row.index} onClick={event=>{event.stopPropagation();selectRow(row.index);}}>{row.index+1}<span aria-hidden="true">›</span></button></th>
              {visibleColumns.map(column=><td key={column} title={row.cells[column]}><div className="sb-sheet-cell">{highlightMatch(row.cells[column],query)}</div></td>)}
            </tr>)}
          </tbody>
        </table>
        {!displayed.length&&<p className="sb-sheet-no-results">Nenhuma linha corresponde à pesquisa.</p>}
      </div>
    </> : <div className="sb-sheet-cards" role="region" aria-label="Fichas de registos">
      {displayed.map(row=><article key={row.index} className="sb-sheet-card" data-selected={selected===row.index?"true":undefined}>
        <div className="sb-sheet-card-head"><strong>Registo {row.index+1}</strong><button type="button" onClick={()=>selectRow(row.index)}>Ver todos os campos</button></div>
        <dl>{visibleColumns.slice(0,4).map(column=><div key={column}><dt>{sheet.headers[column]}</dt><dd>{highlightMatch(row.cells[column],query)}</dd></div>)}</dl>
      </article>)}
      {!displayed.length&&<p className="sb-sheet-no-results">Nenhuma linha corresponde à pesquisa.</p>}
    </div>}

    <div className="sb-sheet-pagination">
      <span>{rows.length ? currentPage*PAGE_SIZE+1 : 0}–{Math.min((currentPage+1)*PAGE_SIZE,rows.length)} de {rows.length} linhas · página {currentPage+1}/{maxPage+1}</span>
      <div role="group" aria-label="Paginação da planilha">
        <button type="button" onClick={()=>setPage(Math.max(0,currentPage-1))} disabled={currentPage===0}>Anterior</button>
        <button type="button" onClick={()=>setPage(Math.min(maxPage,currentPage+1))} disabled={currentPage===maxPage}>Seguinte</button>
      </div>
    </div>
    {selectedRow&&<section className="sb-sheet-inspector" ref={inspector} aria-label={"Detalhes da linha "+(selected!+1)}>
      <header className="sb-sheet-inspector-head"><div><span>INSPEÇÃO DO REGISTO</span><h4>Linha {selected!+1} · {sheet.headers.length} campos</h4></div><button type="button" onClick={()=>setSelected(null)} aria-label="Fechar detalhes da linha">Fechar</button></header>
      <dl className="sb-sheet-field-grid">{sheet.headers.map((header,column)=><div key={column}><dt>{header}</dt><dd>{selectedRow[column]||<span className="sb-sheet-empty-value">Sem valor</span>}</dd></div>)}</dl>
    </section>}
  </section>;
}
