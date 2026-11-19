import { redirect } from "react-router";
import type { Route } from "./+types/legacy-redirect";
import { findLegacyProject, projectPath } from "~/components/project-registry";

/** Preserve old Cloudflare static URLs and clean URL aliases after the migration. */
export function loader({ params }: Route.LoaderArgs) {
  const path = params["*"] || "";
  const slug = path.replace(/\.html$/, "");
  if (slug === "publicacoes") return redirect("/");
  const project = findLegacyProject(slug);
  if (project) return redirect(projectPath(project), 302);
  throw new Response("Página não encontrada", { status: 404 });
}

export default function LegacyRedirect() { return null; }
