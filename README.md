# LOOP Dynamics — Agentic RAG Knowledge Base v1.0

A working **offline-first, evidence-first** indexing and retrieval prototype, designed for integration with a team of LLM agents. It does not instantiate a remote multi-agent system or make LLM API calls.

## Quick start

From the package directory:
```bash
python -m pip install -e '.[vector,test]'
loop-rag build --db output/loop_knowledge.sqlite --pdf /path/to/Business_Dynamics.pdf --page-offset 25 --notes-dir sources
loop-rag stats --db output/loop_knowledge.sqlite
loop-rag lsa-build --db output/loop_knowledge.sqlite --out output/lsa.npz --dimensions 64
loop-rag search --db output/loop_knowledge.sqlite --lsa output/lsa.npz --question 'How do I validate a system dynamics simulation?'
loop-rag investigate --db output/loop_knowledge.sqlite --lsa output/lsa.npz --question 'How should we test a causal model?' --out output/investigations
python -m unittest discover -s tests -v
```

The original ZIP includes `output/loop_knowledge.sqlite`, indexed from the user-provided *Business Dynamics* PDF. This public branch does not include that database. The original PDF is not included in the package. Sources added from `sources/*.md` are short source-cited research notes, not complete scraped pages.

**Important:** `output/lsa.npz` contains local LSA vectors, not neural sentence-transformer embeddings. `investigate` emits evidence and a reproducible handoff, not an invented model-generated answer. Human-agent integration is specified in `docs/WORKING_PROCESS.md`.

### Team contract
`ORC-00 → GOV-01 → ING-02 → SEG-03 → IDX-04 → RET-05 → DYN-06 → ARI-00 → QA-07 → INT-08`

See `docs/WORKING_PROCESS.md`, `docs/ARCHITECTURE.mmd`, `schemas/handoff.schema.json`, `evals/gold_queries.json`, and `docs/VERIFICATION.md`.

### Copyright and data rights
The PDF was supplied by the user and is indexed for private analysis. Do not redistribute the private chunk database publicly without confirming permissions. This package does not contain the original PDF.

## Public branch (MANUS)

This public branch contains 46 project files: Python source, schemas, tests, documentation, the architecture image, and non-sensitive verification reports. Eleven files from the original ZIP are deliberately excluded: `output/loop_knowledge.sqlite`, `output/lsa.npz`, `output/lsa.vocab.json`, `output/demo_investigation.json`, and the seven files in `output/demo_run/`. These artifacts include, quote, or derive from the copyrighted *Business Dynamics* source material. No redistribution rights were established for posting those materials to a public GitHub repository. Regenerate the indexes locally using an authorized PDF and the commands above.

## Frontend Evidence Console

A consola React/TypeScript fica em `frontend/` e usa React Flow para visualizar estruturas causais com distinção explícita entre relações suportadas e hipóteses. A primeira versão usa fixtures tipadas e não inclui a base privada, vetores, índices ou excertos derivados que permanecem excluídos da branch pública.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm --dir frontend dev
```

A interface mostra o ledger de evidências, o mapa causal, notas de análise e o gate `simulation: not performed` quando não existe um modelo formal validado. O contrato de transição para a API Python está documentado em [`docs/FRONTEND.md`](docs/FRONTEND.md).

## CI/CD

O workflow [`CI/CD validation`](.github/workflows/ci.yml) executa testes Python em três versões, compilação, typecheck e build do frontend, validação dos schemas públicos e, em pushes aprovados para `MANUS`, publica o bundle `frontend/dist` como artefato temporário. A pipeline não inclui bases, vetores ou índices derivados excluídos da branch pública; detalhes estão em [`docs/CI_CD.md`](docs/CI_CD.md).
