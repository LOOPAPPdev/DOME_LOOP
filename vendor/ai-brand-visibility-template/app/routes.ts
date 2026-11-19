import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/results.tsx"),
    route("prompts", "routes/prompts.tsx"),
    route("models", "routes/models.tsx"),
    route("projects/:slug", "routes/project.tsx"),
    route("*", "routes/legacy-redirect.tsx"),
  ]),
  route("setup", "routes/setup.tsx"),
] satisfies RouteConfig;
