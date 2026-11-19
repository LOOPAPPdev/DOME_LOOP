# TODO — frontend and CI/CD

## React/TypeScript evidence interface

- [ ] Add a `frontend/` Vite application written in React and TypeScript.
- [ ] Visualize a causal diagram with React Flow, including node types, edge polarity, supported/hypothesis status, and focus interactions.
- [ ] Show source evidence, chunk identifiers, quotations, confidence, and explicit simulation gating in the interface.
- [ ] Serve `GET /manus-routes.json` from the frontend origin with the complete declared page route set.
- [ ] Keep the initial UI backed by typed local fixtures and document the adapter boundary for the existing Python/FastAPI pipeline.

## Automated CI/CD validation

- [ ] Configure GitHub Actions for automated testing and validation of the agentic RAG system.
- [ ] Run Python tests, compilation and available retrieval/database checks on pull requests and pushes to `MANUS`.
- [ ] Install frontend dependencies reproducibly and run TypeScript validation plus a production build.
- [ ] Validate repository JSON schemas and example contracts without publishing excluded data or indexes.

## LangGraph multi-agent orchestration

- [ ] Add a bounded LangGraph workflow for routing, retrieval, dynamics hypothesis generation, grounding review, optional intervention planning, and handoff persistence.
- [ ] Preserve ACL filtering, chunk-level provenance, untrusted retrieved context, and explicit `simulation: not_performed` status.
- [ ] Keep candidate causal edges as hypotheses until evidence and a disconfirmation test are present.
- [ ] Add deterministic tests for evidence-found, insufficient-evidence, and intervention-routing paths.
