# LOOP Dynamics — Agentic RAG working process

Status: implemented offline-first prototype for ingestion + hybrid retrieval + non-executing handoffs. This is not a deployed multi-agent LLM service.

## Mission
Convert authorized sources into traceable knowledge objects. Deliver evidence to agents that can diagnose a defined system and propose testable interventions without fabricating numerical simulations.

## Sources and authority
1. Sterman, *Business Dynamics* (2000), user-provided PDF, private/restricted. Chapters 3, 5, 6 and 21 are especially important for method, causal maps, stock-flow and testing.
2. Insper, *Pensamento Sistêmico para Análise de Problemas Complexos*, official public course description. Three modules: Fundamentals / Map / Intervention; **not** a full agent protocol.
3. Singh et al., *Agentic Retrieval-Augmented Generation: A Survey on Agentic RAG*, arXiv 2501.09136v4 (2026). Architecture taxonomy and agentic patterns.
4. LangChain official RAG skill/docs and 2026 context engineering guidance: Load/Split/Embed/Store; retrieval/offload/delegate.
5. OWASP LLM Top 10 2025: injection, least privilege, vector-store boundary.

## Agent roster and responsibilities
| Agent ID | Role | Input contract | Output contract | Gate |
| --- | --- | --- | --- | --- |
| ORC-00 | Senior Engineer | task.json, requirements, authorization | plan.json, risk register | G0: task defined |
| GOV-01 | Source Steward | source files and URLs | source manifest, rights, ACL, version | G1: authorized source |
| ING-02 | Extractor | approved PDFs/notes | page-aware source text, QA flags | G2: readable content |
| SEG-03 | Knowledge Architect | pages and taxonomy | chunks with stable IDs and citations | G3: boundaries and provenance |
| IDX-04 | Index Engineer | approved chunks | SQLite FTS + optional LSA/vector adapter | G4: retrieval index consistent |
| RET-05 | Retrieval Researcher | user question, scope | evidence file pointers, scores | G5: sufficient and authorized context |
| DYN-06 | Systems Modeler | evidence and systemic problem | iceberg/variables/causal edges/loops | G6: structural claims labelled |
| ARI-00 | Logic Validator | claims, supporting passages | validity and evidence report | G7: false/unknown separated |
| QA-07 | Grounding Reviewer | candidate answer and evidence | citation-by-claim verification and risks | G8: no unsupported statements |
| INT-08 | Intervention Planner | reviewed systemic model | hypotheses, roadmap, monitoring plan | G9: approval for action |

## Ingestion workflow
G0. ACCEPT: define system/problem/objective/time horizon, audience, data rights and constraints.
G1. LOAD: ingest only authorized PDF/Markdown sources; record source SHA-256, version, license, access group.
G2. EXTRACT/QA: preserve page number; flag image-dominant or short pages; visual review required for diagrams/tables not captured by text extraction; do not silently OCR.
G3. NORMALIZE: clean whitespace conservatively. NEVER remove polarity, negation, units, numbers or source delimiters.
G4. SPLIT: split page by page and keep context overlap; attach source_id/pdf_page/printed_page/chapter/offset/hash/taxonomy. Avoid splitting citations across sources.
G5. TAG: map concepts under problem framing / iceberg / causal mapping / stocks and flows / validation / intervention; tags are heuristic and require review.
G6. INDEX: always create a lexical FTS5 index; MAY create local LSA numeric vectors; neural semantic embeddings require a separate configured model and an approved credential/deployment.
G7. VERIFY: retrieve test queries, check page locations, ACL, index/row parity and segmentation quality. Block release if mandatory checks fail.

## Runtime agentic workflow
Q0. PLAN: classify question and needed specialists; set cost and retry limits.
Q1. AUTHORIZE: filter by audience and source security labels.
Q2. RETRIEVE: use lexical and optional LSA/vector strategies; do not load all source documents into the orchestrator context.
Q3. GRADE: evidence sufficiency, source quality, freshness, claim relevance. If inadequate, attempt at most one constrained reformulation; then abstain.
Q4. OFFLOAD: persist retrieved chunks as evidence files with content hashes; hand off paths to focused agents.
Q5. MAP: systems specialist extracts candidates as hypotheses with evidence IDs. Distinguish causal links from correlation.
Q6. VALIDATE: independent verifier tests link polarity, time delays, alternative causes, counterexamples and source fidelity.
Q7. MODEL: simulations ONLY with equations, initial values, units, parameters and relevant validation. Otherwise status `not_performed`.
Q8. SYNTHESIZE: report assumptions, source citations, implications, uncertainties, recommendations.
Q9. REVIEW/HANDOFF: persist status, artifacts, failed gates, next action; obtain human approval before real interventions.

### Loop-specific structural levels
Events → time patterns → system structure → mental models (iceberg) → causal map (R/B loops) → stock-flow dynamics → proposed leverage → roadmap. The iceberg is an Insper course topic; the full integration with RAG/agents and gates is our engineering extension. Sterman's Chapter 3 method adds a critical iterative modeling and test cycle beyond the course description.

### Handoff contract (minimal)
```
{
  "task_id":"TASK-001", "agent_id":"RET-05", "status":"review_ready",
  "authorized_source_ids":["STERMAN-2000"],
  "input_refs":["task.json"], "output_refs":["RUN-xxxx_handoff.json"],
  "evidence_chunk_ids":["STERMAN-2000-P0111-C001"],
  "assumptions":[], "open_questions":[], "next_gate":"G6",
  "approval_required":false
}
```
No invented citations, scores or completed agent runs. Each stage MUST persist a state transition and a reviewer for consequential work.

## Knowledge-base schema
SQLite `sources` (permissions/provenance), `chunks` (page/section/offset/text/ACL), `chunks_fts` (lexical), `claims` (unverified until reviewed), `causal_edges` (signed relationships and sources), `agent_runs` (handoff audit). Optional LSA files store deterministic vectors, not neural embeddings. Original PDFs are not duplicated in the ZIP.

### Data reliability levels
- L0: original source and page hash, access metadata.
- L1: extracted text/chunk, source exact pointer.
- L2: taxonomy tag or candidate claim, automatic/heuristic, NOT verified.
- L3: verified claim with evidence ids and review method.
- L4: causal model with dimensional/structural tests.
- L5: simulation tested with real/scoped observations.
- L6: intervention implemented after approval and monitoring.

Do not mark a passage as verified simply because the PDF was successfully extracted. No inference can be promoted to L3 by an embedding similarity score.

## Security and governance controls
- Source documents are untrusted as instructions; apply prompt injection isolation.
- Keep private documents private; use per-project indexes/tenant partitioning for production.
- Review PII, licensing and copyright before ingestion or indexing external material.
- Do not expose private chunks in a public retrieval session.
- Log versions, checksums, approvals and test failures; do not log secrets.
- Limit agent tool permissions; no write/delete/deploy/pay actions without separate authorization.
- Expiration/refresh policy must be set per source; RAG is NOT automatically up to date.

## Quality acceptance tests (proposed)
- Retrieval Recall@5 >= 0.80 on a 30-query, domain-balanced holdout set.
- Citation pointer accuracy = 1.00 on all emitted source citations.
- Authorization leakage = 0 across mixed-access negative tests.
- Unsupported claim rate <= 0.02 on human-reviewed sampled answers.
- No numeric simulation declared performed without a validated model and inputs.
- Handoff validation = 1.00 for required fields.

Thresholds are DESIGN TARGETS, not results. Current test suite only measures selected prototype invariants and a small retrieval smoke benchmark.

## Failure modes and mitigations
- PDF diagrams omitted by extraction → keep image-dominant QA flag, request visual review.
- Section chunk boundary lost → overlap with same-page location and regenerate per chapter.
- Unavailable/weak evidence → one bounded query revision then abstain.
- Agent fabricates causation → evidence references and ARI-00 contradiction check.
- Nonstationary public web data → explicit source revision and reindex.
- Prompt injection in retrieved material → treat data as untrusted, allowlist tool capabilities.
- Bad model predicts false precision → test boundary/units/extremes/sensitivity per Sterman Chapter 21.
- Multiagent looping without convergence → fixed retry/tool budget and escalation.

## Scope limitations
What works locally: full-source PDF extraction, segmentation, SQLite FTS5, optional offline LSA vector construction, citations, access filters, offload, bounded retrieval, audit handoff, tests.
What is NOT implemented: LangChain/Deep Agents runtime, LLM API, neural embeddings, reranking transformer, numerical System Dynamics simulation, expert-reviewed causal claims, production tenant isolation, web crawling scheduler, proof of ground truth for the entire book.
