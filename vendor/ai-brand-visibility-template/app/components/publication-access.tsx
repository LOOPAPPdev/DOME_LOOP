import { Link } from "react-router";
import { ArrowRight, SquaresFour } from "@phosphor-icons/react";
import { PROJECTS, projectPath } from "./project-registry";

/** The dashboard remains the homepage, even when no monitoring site exists. */
export function PublicationAccess() {
  return (
    <main data-publication-access="six" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="mb-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          LOOPAPP / WORKSPACE
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl">
          Todos os projetos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
          Abra um projeto no mesmo workspace. A navegação e os tokens seguem o dashboard Cloudflare.
        </p>
      </div>
      <nav aria-label="Abrir projetos" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PROJECTS.map(item => (
          <Link
            key={item.id}
            to={projectPath(item)}
            reloadDocument
            aria-label={`Abrir ${item.title}`}
            className="group flex min-h-[178px] flex-col rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold text-brand">{item.id} / 06</span>
              <SquaresFour size={20} className="text-neutral-400" aria-hidden="true"/>
            </div>
            <span className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{item.type}</span>
            <strong className="mt-1 text-base font-semibold text-neutral-950">{item.title}</strong>
            <span className="mt-2 flex-1 text-sm leading-5 text-neutral-600">{item.description}</span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-brand">
              Abrir projeto <ArrowRight size={15} aria-hidden="true"/>
            </span>
          </Link>
        ))}
      </nav>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-5">
        <span className="text-xs text-neutral-500">6 projetos acessíveis pelo React Router.</span>
        <Link to="/setup" className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700">
          Configurar AI Brand Visibility
        </Link>
      </div>
    </main>
  );
}
