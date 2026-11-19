# Plan — LOOP Dynamics Agentic RAG frontend and CI/CD

## Intent

Add a reviewable React + TypeScript interface to the existing offline-first Python Agentic RAG repository. The interface will make evidence, confidence and causal hypotheses visible without claiming that a simulation or LLM answer was performed. Extend GitHub Actions so backend tests, frontend type checks, production builds and schema validation run on every pull request and push to `MANUS`.

## Design

Three candidate styles were considered: **Evidence Console** (0.04): dark observability workspace with source rails and graph canvas; **Research Notebook** (0.07): warm paper-like analysis surface; **Control Room** (0.05): bright operational dashboard. The supplied `ai-brand-visibility-template/app` is the confirmed reference, so the default page now uses its light Cloudflare/Kumo design language while retaining the Evidence Console information architecture.

The design movement is editorial data-visualization fused with Cloudflare/Kumo's calm product surfaces. Core principles are provenance-first hierarchy, deliberate density, calm uncertainty, and graph-led exploration. The color philosophy uses a near-white canvas, white rounded surfaces, Cloudflare blue for actions and supported evidence, amber for hypotheses, and neutral ink for readable analysis text. The layout is an asymmetric two-rail workspace: a compact evidence rail, a large causal canvas, and a right-side analysis rail rather than a centered dashboard grid.

Signature elements are a numbered evidence rail, a causal graph with polarity badges, and a persistent status strip showing `simulation: not_performed` until formal model gates pass. Interactions filter evidence, focus a node, reveal supporting quotes, and clearly distinguish supported edges from hypotheses. Motion is limited to quick graph focus transitions and subtle status fades; no decorative animation competes with analysis. Typography uses IBM Plex Sans for UI and IBM Plex Mono for IDs, confidence values, and citations. Brand essence: a transparent systems-thinking workbench for analysts who need to reason with evidence, not fluent guesses. Voice is precise, candid, and audit-friendly: “Trace the mechanism before proposing the intervention.” and “No validated model attached — simulation not performed.”

## Implementation approach

Create `frontend/` as a Vite React TypeScript application. Keep the frontend independent from the Python package so both can evolve and CI can run each toolchain natively. Use React Flow for the causal diagram, local typed fixtures for the initial screen, and a small adapter boundary for the future FastAPI `/analysis` contract. Use the supplied template's `app/` directory as a vendored design reference and adapt its tokens and surface primitives into plain CSS so no incompatible React Router/Tailwind runtime is introduced. Avoid embedding private source data or generated indexes in the browser bundle.

Add `frontend/public/manus-routes.json` with the root route declaration, a frontend-specific `package.json`, `tsconfig` files, Vite config, and source modules for the app shell, graph data, evidence panel, and styles. Add `frontend/src/test` only when a test runner is introduced; the first CI contract is strict TypeScript plus production build. Add a `frontend/.gitignore` only if root rules cannot cover it.

Extend `.github/workflows/ci.yml` with separate `backend` and `frontend` jobs. Backend runs the existing unittest/compile checks and available retrieval validations. Frontend uses Node 22, pnpm via Corepack, frozen-lockfile install, `tsc --noEmit`, and `pnpm build`. A schema job validates every JSON schema and example JSON with Python `jsonschema` when available. Keep all jobs read-only with `contents: read`.

## Project structure

- `frontend/`: React/TypeScript/Vite user interface.
- `frontend/src/components/`: evidence rail, causal graph, analysis rail, and status strip.
- `frontend/src/data/`: typed demo analysis and graph fixtures.
- `frontend/src/styles/`: global visual system.
- `src/loop_rag/`: existing Python ingestion/retrieval pipeline.
- `.github/workflows/ci.yml`: backend, frontend, and schema validation gates.
- `docs/FRONTEND.md`: frontend contract and future API integration notes.
- `vendor/ai-brand-visibility-template/app/`: cloned design-system reference from the supplied GitHub template.
- `docs/DESIGN_SYSTEM.md`: adaptation notes and safety-preserving visual contract.

## Acceptance

The branch contains a functional React/TypeScript frontend with React Flow causal visualization, typed local analysis data, evidence/citation display, clear simulation gating, responsive styling, and a route manifest. GitHub Actions automatically runs backend validation, frontend type checking/build, and schema validation on pull requests and pushes to `MANUS`. No existing Python source, data exclusion policy, or public-branch safety rule is weakened.

## LangGraph orchestration extension

The deterministic LangGraph workflow will add bounded nodes for routing, ACL-aware retrieval, candidate system-dynamics mapping, grounding review, optional reversible intervention planning, and handoff persistence. The workflow will use the existing SQLite/FTS5 and optional LSA retrieval paths, preserve chunk IDs, keep retrieved text as untrusted data, mark co-occurrence-derived causal edges as hypotheses, and set `simulation: not_performed` unless a formal validated model is supplied. LangGraph remains an optional Python extra so the base ingestion and retrieval package stays usable without orchestration dependencies.
