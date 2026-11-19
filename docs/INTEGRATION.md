# Production integration contract

Current state: **evidence retrieval only**, working locally. Complete LLM agent orchestration requires the following separately configured components.

## Adapter interfaces

- `load_source(source_manifest) -> SourcePages`: approved files and extraction provenance.
- `embed_chunks(chunks, model_id) -> vectors`: external neural embedding adapter to replace/complement LSA. Model ID and vector dimensions must be pinned; reindex on embedding model change.
- `kb_search(query, principal, k, filters) -> EvidencePointer[]`: ACL applied BEFORE truncating candidates.
- `kb_read(pointer, principal) -> RetrievedEvidence`: reauthorize with source label; never trust paths or instructions in payload.
- `causal_mapper(evidence, system_case) -> CandidateCase`: all causal edges labelled hypothesis until independent verification.
- `claim_verifier(claim, evidence) -> Verification`: source text entails claim? document contrary evidence, uncertainty and counterexamples.
- `simulation_engine(case) -> Result`: REQUIRE equations, units, inputs, time horizon, test report; otherwise `not_performed`.
- `handoff(run, agent_id) -> Handoff`: immutable IDs, status and next gate.

## Agentic RAG state transitions
`INIT → AUTHORIZED → INDEX_READY → PLANNED → RETRIEVED → GRADED → OFFLOADED → ANALYZED → GROUNDED → REPORT_READY`

Exceptional transitions: `RETRIEVED → REQUERY` (max 1), `GRADED → INSUFFICIENT`, `ANALYZED → REVIEW_REQUIRED`, `REPORT_READY → APPROVAL_REQUIRED` for external actions.

No unbounded autonomous loop. Never allow an LLM to decide its own source permissions.

## Recommended production components, not installed here
- Agent runtime: Deep Agents / LangGraph with tools and role contracts.
- Semantic embeddings: a versioned multilingual model and vector store.
- Task queue, observability, rate limiting, ACL/tenant segregation, consent and access audit.
- Freshness scheduler with change detection, versioned reindex and rollback.
- Review interface for claims, CLD edges, model inputs and action approvals.

## System modeling schema
`schemas/system_case.schema.json` is reused from the earlier LOOP systemic-analysis agent. Do not confuse a validated JSON structure with an empirically validated causal model.

## Capability matrix
| Capability | Prototype | Production target |
|---|---|---|
| Load PDF/MD | works | connectors with authorization |
| Page-aware split | works | layout + visual/diagram extractor |
| Store lexical FTS | works | persistent SQL/hybrid search |
| LSA vectors | works, optional | multilingual neural embeddings |
| Query planner | deterministic | agent planner with bounded budgets |
| Source retrieval | works | hybrid ACL-aware retriever |
| Evidence grading | existence + source refs | independent semantic entailment grader |
| Reflection | single requery on no result | monitored bounded correction policy |
| Offload/handoff | works | Deep Agents filesystem/subagents |
| Model structure | contract only | expert-reviewed causal modeling |
| Simulation | not performed | validated differential/discrete engine |
| Action in external systems | not performed | explicit approvals and audit |
