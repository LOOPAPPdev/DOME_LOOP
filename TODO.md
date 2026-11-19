# TODO — frontend, CI/CD, LangGraph, and Cloudflare

## React/TypeScript evidence interface

- [x] Add a `frontend/` Vite application written in React and TypeScript.
- [x] Visualize a causal diagram with React Flow, including node types, edge polarity, supported/hypothesis status, and focus interactions.
- [x] Show source evidence, chunk identifiers, quotations, confidence, and explicit simulation gating in the interface.
- [x] Serve `GET /manus-routes.json` from the frontend origin with the complete declared page route set.
- [x] Keep the initial UI backed by typed local fixtures and document the adapter boundary for the existing Python/FastAPI pipeline.

## Automated CI/CD validation

- [x] Configure GitHub Actions for automated testing and validation of the agentic RAG system.
- [x] Run Python tests, compilation and available retrieval/database checks on pull requests and pushes to `MANUS`.
- [x] Install frontend dependencies reproducibly and run TypeScript validation plus a production build.
- [x] Validate repository JSON schemas and example contracts without publishing excluded data or indexes.

## LangGraph multi-agent orchestration

- [x] Add a bounded LangGraph workflow for routing, retrieval, dynamics hypothesis generation, grounding review, optional intervention planning, and handoff persistence.
- [x] Preserve ACL filtering, chunk-level provenance, untrusted retrieved context, and explicit `simulation: not_performed` status.
- [x] Keep candidate causal edges as hypotheses until evidence and a disconfirmation test are present.
- [x] Add deterministic tests for evidence-found, insufficient-evidence, and intervention-routing paths.

## Cloudflare Pages and private R2

- [x] Add versioned Wrangler configuration for `frontend/dist` and the `PRIVATE_FILES` R2 binding.
- [x] Add a fail-closed Pages Function for private object reads with traversal protection and no-store caching.
- [x] Add a GitHub Actions Pages deploy workflow with pinned pnpm and secret-gated deployment.
- [x] Document one-time Pages/R2 provisioning, Pages secrets, GitHub Actions secrets, and the public/private boundary.
- [ ] Enable the Cloudflare connector and provision the Pages project and R2 bucket in the intended account.
- [ ] Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions secrets.
