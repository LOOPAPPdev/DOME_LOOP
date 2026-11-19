import { Link } from "react-router";
import type { Route } from "./+types/project";
import { ArrowLeft } from "@phosphor-icons/react";
import { findProject } from "~/components/project-registry";
import { A4Bento27Cards } from "~/components/a4-bento-27-cards";
import { A4BentoModular } from "~/components/a4-bento-modular";
import { A4BentoKit } from "~/components/a4-bento-kit";
import { PromptLibrary } from "~/components/prompt-library";
import { CleanSeaOperations } from "~/components/cleansea-operacao";
import { SBC001Infographic } from "~/components/sbc-001";
import { ArcAbapLanding } from "~/components/arc-abap";

export function loader({params}:Route.LoaderArgs) {
  const project = findProject(params.slug || "");
  if(!project) throw new Response("Projeto não encontrado", {status:404});
  return { slug:project.slug, title:project.title };
}

export function meta({data}:Route.MetaArgs) {
  return [{title: data ? data.title + " | LOOPAPP" : "Projeto | LOOPAPP"}];
}

export default function ProjectRoute({loaderData}:Route.ComponentProps) {
  const {slug,title}=loaderData;
  return (
    <section className="loop-project-page" data-project-route={slug} aria-label={title}>
      <div className="loop-project-breadcrumb">
        <Link to="/" reloadDocument className="inline-flex items-center gap-2 text-xs font-semibold text-brand hover:underline">
          <ArrowLeft size={15} aria-hidden="true"/> Dashboard
        </Link>
        <span className="min-w-0 truncate text-xs text-neutral-500">/ {title}</span>
      </div>
      {slug === "arc-page" ? <ArcAbapLanding/> : slug === "a4-bento-kit" ? <A4BentoKit/> : slug === "cleansea-operacao" ? <CleanSeaOperations/> : slug === "diretorio-bento" ? <PromptLibrary/> : slug === "a4-bento-27-cards"
        ? <A4Bento27Cards/> : slug === "sbc-001-home-automation" ? <SBC001Infographic/> : slug === "a4-bento-modular" ? <A4BentoModular/>
        : <p role="alert">Projeto sem componente registado.</p>}
    </section>
  );
}
