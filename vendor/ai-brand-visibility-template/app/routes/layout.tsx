import { Link, Outlet, NavLink, useLocation, useSearchParams } from "react-router";
import type { Route } from "./+types/layout";
import { Header } from "~/components/header";
import { PROJECTS, projectPath } from "~/components/project-registry";
import { Sidebar, SidebarSection, SidebarNav, SidebarNavItem } from "~/components/sidebar";
import { ChartBar, ListBullets, Cube, Plus, SquaresFour } from "@phosphor-icons/react";

export async function loader({ context, request }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const sites = ((await env.AEO_KV.get("sites", "json")) as any[]) ?? [];
  const url = new URL(request.url);
  const siteParam = url.searchParams.get("site");
  const activeSite = siteParam && sites.find((site:any) => site.domain === siteParam)
    ? siteParam : (sites[0]?.domain ?? "");
  return { sites, activeSite };
}

export type DashboardContext = { activeSite:string; sites:any[] };

export default function DashboardLayout({loaderData}:Route.ComponentProps) {
  const {sites,activeSite} = loaderData;
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const projectView = location.pathname.startsWith("/projects/");
  const siteLink = (path:string) => {
    const params = new URLSearchParams(searchParams);
    if(activeSite) params.set("site", activeSite);
    if(path !== "/") params.delete("testId");
    const query=params.toString();
    return query ? `${path}?${query}` : path;
  };
  const ctx:DashboardContext={activeSite,sites};
  return (
    <>
      <Header domain={activeSite}/>
      <div className="flex min-h-[calc(100vh-58px)]">
        {!projectView && <Sidebar>
          <SidebarSection label="Sites">
            {sites.map((site:any) => (
              <Link key={site.domain} to={`/?site=${encodeURIComponent(site.domain)}`}
                className={`mb-0.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${site.domain === activeSite ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"}`}>
                <span className="truncate">{site.domain}</span>
              </Link>
            ))}
            <NavLink to="/setup" className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-neutral-200 px-3 py-2 text-sm text-brand hover:bg-blue-50">
              <Plus size={14} weight="bold"/> Add site
            </NavLink>
          </SidebarSection>
          <SidebarSection label="Views">
            <SidebarNav>
              <SidebarNavItem to={siteLink("/")} icon={<ChartBar size={16}/>}>Results</SidebarNavItem>
              <SidebarNavItem to={siteLink("/prompts")} icon={<ListBullets size={16}/>}>Prompts</SidebarNavItem>
              <SidebarNavItem to={siteLink("/models")} icon={<Cube size={16}/>}>Models</SidebarNavItem>
            </SidebarNav>
          </SidebarSection>
          <SidebarSection label="Projetos">
            <nav aria-label="Projetos" className="flex flex-col gap-0.5">
              {PROJECTS.map(project => (
                <Link key={project.id} to={projectPath(project)} reloadDocument
                  className="flex min-h-9 items-center gap-2 rounded-lg px-3 text-[13px] text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950">
                  <SquaresFour size={16} aria-hidden="true"/>
                  <span className="truncate">{project.title}</span>
                </Link>
              ))}
            </nav>
          </SidebarSection>
        </Sidebar>}
        <main className="min-w-0 flex-1 bg-canvas">
          <Outlet context={ctx}/>
        </main>
      </div>
    </>
  );
}
