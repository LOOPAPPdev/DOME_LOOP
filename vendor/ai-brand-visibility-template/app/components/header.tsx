import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { CaretDown, House, SquaresFour } from "@phosphor-icons/react";
import { PROJECTS, findProject, projectPath } from "./project-registry";

/** Navigation in this component is shared by the Cloudflare dashboard and every project. */
export function Header({domain}:{domain?:string}) {
  const location = useLocation();
  const activeProject = findProject(location.pathname.split("/")[2] || "");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  return (
    <header className="loop-global-header sticky top-0 z-50 flex h-[58px] items-center border-b border-neutral-200 bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link to="/" reloadDocument aria-label="Dashboard Cloudflare" className="flex shrink-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-brand">
          <svg height="18" viewBox="0 0 109 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M88.17 23.63l.31-.94c.37-1.27.23-2.44-.39-3.33-.58-.8-1.53-1.27-2.7-1.33l-21.8-.28a.32.32 0 01-.25-.17.31.31 0 01.02-.32.38.38 0 01.39-.33l21.93-.28c2.6-.12 5.42-2.25 6.4-4.85l1.25-3.28a.34.34 0 00.01-.43c-1.43-6.44-7.14-11.24-13.97-11.24-6.28 0-11.62 4.08-13.54 9.75-1.29-.98-2.93-1.43-4.54-1.27-3.01.3-5.44 2.73-5.74 5.73a7.16 7.16 0 00.17 2.25c-4.93.14-8.89 4.2-8.89 9.17 0 .44.03.88.1 1.32a.35.35 0 00.34.3l40.16.01a.35.35 0 00.32-.33z" fill="#F6821F"/>
            <path d="M96.4 8.93c-.2 0-.4.01-.6.02a.25.25 0 00-.27.23l-.86 3.07c-.37 1.27-.23 2.45.39 3.32.57.8 1.52 1.27 2.69 1.32l4.64.28a.32.32 0 01.32.16.32.32 0 01-.03.33.37.37 0 01-.4.15l-4.82.28c-2.62.12-5.44 2.24-6.43 4.82l-.35.92a.2.2 0 00.25.26l16.58.01a.35.35 0 00.37-.32c.05-.59.08-1.19.08-1.83 0-6.58-5.33-11.92-11.9-11.92z" fill="#FBAD41"/>
          </svg>
          <span className="hidden h-6 w-px bg-neutral-200 sm:block"/>
          <span className="truncate text-sm font-semibold text-neutral-900">LOOPAPP</span>
        </Link>
        <span className="hidden text-sm text-neutral-500 sm:inline">/</span>
        <span className="max-w-[42vw] truncate text-xs text-neutral-600 sm:text-sm">
          {activeProject?.title ?? (domain ? `Dashboard · ${domain}` : "AI Brand Visibility")}
        </span>
      </div>
      <div className="relative ml-2 shrink-0" ref={root} onKeyDown={event => {
        if(event.key === "Escape") setOpen(false);
      }}>
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-controls="loop-project-switcher"
          aria-expanded={open}
          className="flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-brand sm:text-sm"
        >
          <SquaresFour size={17} aria-hidden="true"/>
          <span>Projetos</span>
          <CaretDown size={15} aria-hidden="true"/>
        </button>
        {open && (
          <nav id="loop-project-switcher" aria-label="Navegação do workspace" className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(340px,calc(100vw-24px))] max-h-[min(80vh,580px)] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2 shadow-xl">
            <Link reloadDocument to="/" aria-current={!activeProject ? "page" : undefined}
              className="mb-2 flex min-h-11 items-center gap-3 rounded-lg bg-neutral-100 px-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-200">
              <House size={17} aria-hidden="true"/> Dashboard Cloudflare
            </Link>
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">Trocar projeto</p>
            {PROJECTS.map(project => (
              <Link key={project.id} to={projectPath(project)} reloadDocument
                aria-current={activeProject?.slug === project.slug ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-brand ${activeProject?.slug === project.slug ? "bg-blue-50 font-semibold text-brand" : "text-neutral-700"}`}>
                <span className="font-mono text-[11px] text-neutral-400">{project.id}</span>
                <span>{project.title}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
