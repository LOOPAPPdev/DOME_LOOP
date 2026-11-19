# Plan — LOOP Agentic RAG Knowledge Base

## Intent
Deliver a reusable, verified knowledge-base pipeline and working-process contract for agents analyzing arbitrary systems, grounded in the user-provided Sterman PDF, Insper syllabus, RAG survey and LangChain.

## Scope authorized
Local code, segmentation, indexing, querying, schema, tests, documentation, ZIP. No deployment, Git changes, external credentials, live simulation or LLM API use.

## Change list
- `src/loop_rag/` ingestion, conservative splitter, SQLite FTS5, LSA, deterministic planner, query expansion, handoff.
- `output/` generated source index, vectors and evaluation results.
- `docs/` workflow and verification records.
- `schemas/` handoff/system model contracts.
- `tests/` deterministic ACL, provenance, integrity, non-fabrication and regression tests.
- `skills/` reusable skill for host agents.

## Verification plan
- `python -m unittest discover -s tests -v` — all tests pass.
- `python -m compileall -q src tests scripts` — compilation succeeds.
- `python scripts/benchmark.py --db output/loop_knowledge.sqlite --lsa output/lsa.npz --out output/benchmark_32.json` — report real retrieval outcomes.
- `python scripts/verify_db.py --db output/loop_knowledge.sqlite` — counts and hashes valid.
- package extraction test — ZIP opens and source can execute in a clean unpacked directory.

## Risk register
R1 High: accidental leak of user-provided copyrighted text if DB published publicly.
R2 High: treating retrieved text as instructions / prompt injection.
R3 High: unsupported causal inference, false confidence, simulated results without formal model.
R4 Medium: PDF image-only figures not captured in text.
R5 Medium: aging source and limited Portuguese-English terminology mapping.
R6 Medium: local LSA vectors do not replace neural embeddings.
