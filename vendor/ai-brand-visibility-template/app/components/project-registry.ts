/** Canonical project catalogue. Routes, navigation and legacy aliases use this single source. */
export const PROJECTS = [
  { id:"01", slug:"diretorio-bento", legacy:"diretorio-bento", title:"Biblioteca Bento", type:"Diretório", description:"Diretório de prompts e vista Bento.", nativeReact:true },
  { id:"02", slug:"a4-bento-modular", legacy:"a4-bento-modular", title:"A4 Bento Modular", type:"Protótipo", description:"Layouts, dimensões e editor modular.", nativeReact:true },
  { id:"03", slug:"a4-bento-27-cards", legacy:"a4-bento-27-cards", title:"A4 Bento — 27 Cards", type:"Protótipo", description:"Três faces, inspeção e exportação.", nativeReact:true },
  { id:"04", slug:"a4-bento-kit", legacy:"a4-bento-kit", title:"A4 Bento Kit", type:"Ferramenta", description:"Editor e conteúdos originais do kit.", nativeReact:true },
  { id:"05", slug:"arc-page", legacy:"arc-page", title:"Arc Page", type:"Landing page", description:"ABAP · AI agents for business · landing page WebGL com narrativa de 36 segundos.", nativeReact:true },
  { id:"06", slug:"cleansea-operacao", legacy:"bundle", title:"CleanSea Operação", type:"Demonstração", description:"Interface operacional de demonstração.", nativeReact:true },
  { id:"07", slug:"sbc-001-home-automation", legacy:"sbc-001-home-automation", title:"SBC-001 — Home Automation", type:"Infográfico", description:"Especificação de um SBC de automação residencial: 11 requisitos, 4 grupos.", nativeReact:true },
] as const;

export type Project = (typeof PROJECTS)[number];
export type ProjectSlug = Project["slug"];
export const projectPath = (project: Project) => `/projects/${project.slug}`;
export const findProject = (slug: string) => PROJECTS.find(item => item.slug === slug);
export const findLegacyProject = (legacy: string) => PROJECTS.find(item => item.legacy === legacy || item.slug === legacy);
