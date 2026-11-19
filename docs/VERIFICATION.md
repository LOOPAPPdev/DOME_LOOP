# Verification and findings — 2026-11-19

## Result
**Local prototype: PASSED its stated deterministic gates.** The production Agentic RAG platform, source diagram extraction, semantic grounding, and numerical simulation are NOT verified and NOT executed.

## Input records
- PDF: John D. Sterman, *Business Dynamics* (2000), uploaded by user. Document: 1,008 PDF pages.
- Public source summaries: Insper syllabus, Singh et al. 2026 survey v4, LangChain official skill, OWASP GenAI.
- Plugin instructions inspected from user-uploaded ZIPs: Senior Engineering Partner 1.28.0, Agent Engineering 0.3.2 and Agent Handoff 0.4.2. These were *applied as documented methods locally*, not installed or run as independent host plugins.

## Ingestion observations
- 979 of 1,008 PDF pages yielded nonempty text. 29 page-level extractions were blank.
- 35 PDF pages yielded <180 characters and were flagged for QA.
- 849 pages contained at least one embedded image. Embedded diagrams and charts are NOT guaranteed to be captured in extracted text.
- 3,322 chunks from PDF + 5 source-summary chunks = 3,327 chunks.
- Five source records: one restricted PDF and four authored, public source notes.
- All 3,327 chunk content hashes, access labels and segment offsets passed deterministic checks. FTS5 row count matches chunk row count.
- Chapter metadata uses a print-page offset of 25 specific to this PDF; front matter without Arabic page numbers remains PDF-only.
- Visually inspected PDF physical pages 111 (printed p. 86, table of modeling process) and 870 (printed p. 845, model-testing chapter opening). The diagrams and tables require separate visual semantic extraction beyond this sample.

## Tests executed
- `python -m unittest discover -s tests -v` → 20/20 PASS, including ACL tests, malformed query handling, chunk boundaries, stability under reindex, LSA JSON vocabulary regression, restricted source isolation in vector retrieval, non-executing adversarial source text, and bounded query planning.
- `python -m compileall -q src tests scripts` → PASS.
- `python scripts/verify_db.py --db output/loop_knowledge.sqlite` → 3,327/3,327 content hashes PASS; 0 integrity findings.
- `python scripts/benchmark.py ...` → manual gold set of 32 **English author-created queries**:
  - Lexical FTS5: hit@1 26/32; hit@5 32/32; MRR@5 0.906.
  - Hybrid FTS5 + LSA: hit@1 24/32; hit@5 32/32; MRR@5 0.857.
- `python scripts/evaluate_pt.py ...` → 8 **Portuguese author-created queries**: hit@1 7/8; hit@5 8/8.
- A live `investigate` invocation created an evidence-pointer handoff with no generated LLM answer.

## Root-cause fixes during implementation
- LSA vocabulary JSON serialization initially failed because scikit-learn returned numpy `int64` indices. Converted indices to Python integers and added a round-trip regression test.
- Book table-of-contents chunks were outranking chapter text. Penalized front matter and index during retrieval. Lexical top1 improved from 18/32 to 26/32, while all targets remained within top5.
- Fixed SQLite connection management and added restricted-vector retrieval tests.

## Important interpretation
**Hit@5 is only a weak retrieval smoke result**, measured on a small, manually authored and source-aware set. It does not measure answer accuracy, causality, multilingual generalization or unsupported-statement rate. The LSA explained-variance ratio is approximately 0.157, not a quality/accuracy score. No statistically independent holdout, human evaluation, neural embeddings, LangChain runtime or expert modeling review was performed.

## Blocking production gates
P1. **Source rights**: private PDF corpus must not be published or shared across tenants without permission review.
P2. **Visual extraction**: inspect relevant figures and page-level omissions; add diagram/table extraction before treating those as evidence.
P3. **Semantic grounding**: implement claim-level entailment and contradiction checks, then evaluate with domain experts.
P4. **Neural retrieval**: test an appropriately licensed multilingual embedding model against lexical baseline; do not assume embeddings improve results.
P5. **Agent runtime**: connect authorized, bounded tools and monitored orchestration; test prompt injection, source freshness, cost, cancellation and retries.
P6. **System Dynamics**: verify equations, dimensional consistency, boundary adequacy, parameter credibility, extreme conditions, sensitivity and reproduction of reference behavior before simulations inform action.

## Remaining decision
The team can safely use the package as a local, restricted **research index and handoff foundation**. It must not label model outputs or interventions scientifically validated until P3/P6 pass.
