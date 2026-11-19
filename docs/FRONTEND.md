# Frontend contract

The `frontend/` application is a transparent analysis surface for the existing Python Agentic RAG pipeline. The first version uses typed local fixtures so the UI can be reviewed without exposing the excluded databases, vectors, indexes, or copyrighted source extracts on the public `MANUS` branch.

## Current view model

A response contains a question, a short answer, confidence, evidence items, causal nodes, causal edges, hypotheses, interventions, and a simulation status. Every factual claim should carry one or more chunk IDs. Causal edges declare polarity and whether they are supported or hypotheses. The UI renders these distinctions; it does not promote hypotheses to facts.

## Future API adapter

The future adapter should map a validated backend response into the same `AnalysisViewModel` shape. It must preserve source ACL decisions and provenance fields. Do not send private sources or local database paths to the browser. A future `/analysis` endpoint may be proxied by a deployment-specific server, but the static frontend must remain safe to build without credentials.

## Local development

```bash
cd frontend
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The interface is intentionally independent of the Python package. The backend can be run separately using the commands in the root README and connected after an authenticated, versioned API contract exists.
