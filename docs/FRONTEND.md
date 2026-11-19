# Frontend contract — LOOP-FE-001

The canonical target is [`LOOP_DOME_FRONTEND_SPEC_v1.md`](LOOP_DOME_FRONTEND_SPEC_v1.md). The public React application uses the existing LOOP design tokens and separates one canonical `SystemCase` from read-only UI projections.

## Implemented UX baseline (Iteration A)

- React Router exposes Home, Projects, System App, Infographic, Tutorial, Runs, Knowledge, and Settings routes from the specification; unknown routes have an explicit 404 page and static deep links use the Pages SPA fallback.
- `SystemCase` view-model shape includes distinct `schemaVersion`, `workflowVersion`, and decimal-string `revision` fields. React Flow nodes/edges and their coordinates are derived presentation state.
- App is the only mode with edit controls. Its demo edits create a new in-memory revision and are explicitly labelled as local-only. Infographic and Tutorial read the same provider state and contain no mutation controls.
- The only loaded data is a separately authored camelCase frontend `SystemCase` demo fixture based on a fictional scenario. It is deliberately decoupled from the private backend JSON structure and is not yet an API DTO. Evidence is marked unverified; no source corpus, index, R2 credential or private URL is bundled.
- Preferences provide System/Light/Dark; the system choice follows `prefers-color-scheme` and the manual choice is device-local. Semantic palette tokens preserve the original LOOP light design and drive React Flow's dark presentation.
- On mobile the primary header navigation collapses behind an accessible menu button; SPA navigation updates the document title and moves focus to the new page heading. English is the interface language; the demo view-model carries `contentLanguage: "pt"` and Portuguese case text is marked with `lang="pt"`.
- No live identity provider, backend API, BFF, RAG retrieval, agent, ARI_00 run, persistence or authorization is connected. All related controls are disabled instead of showing simulated progress.

## View-model boundary

`frontend/src/features/systems/systemCaseProjection.ts` maps the versioned case into React Flow nodes, edges, evidence cards and inspector content. It does not add confidence scores, infer a supported variable from a source receipt, or promote a supported relation without verified evidence. Evidence selection cross-highlights referenced variables/relationships without changing their status or the inspector selection. The frontend display schema is `frontend/schemas/system-case-view.schema.json`; it is a demo view-model schema, not a network contract. Public API DTO/OpenAPI is not yet agreed; the illustrative TypeScript example in the spec is not used as a production contract.

## Next stages (not yet implemented)

1. Agree OpenAPI and public DTOs with the private backend, including tenant/project/system/run IDs, permissions, evidence access, status enums and ETag/`If-Match` semantics.
2. Implement BFF `/api/v1` with verified user session, CSRF protections, server-side service credentials and fail-closed behavior. The identity provider/issuer/audience/tenant mapping remain unconfigured.
3. Add persistence, authorized RAG, bounded agents/ARI_00, evidence details and real run traces; only claim completion after real HTTP logs and traceable backend response.
4. Complete production auth/tenant/contract tests and staging E2E. The current browser tests exercise demo UX only and are not backend integration evidence.

## Local development

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
CHROMIUM_PATH=/usr/bin/chromium pnpm test
pnpm typecheck && pnpm build
```

`pnpm test` runs unit/projection tests, the route manifest test, the axe accessibility gate in light and dark at 320px, and Playwright E2E for routes, local-only edits/read-only views, keyboard graph selection and theme preferences. These browser tests use the fictional fixture; they are not backend integration evidence. A manual screen-reader review is still required before making a WCAG conformance claim.
