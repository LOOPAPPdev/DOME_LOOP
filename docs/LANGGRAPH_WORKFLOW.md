# LangGraph workflow

`loop_rag.langgraph_workflow` coordinates a bounded specialist workflow without making an implicit LLM call. Install it with `python -m pip install -e '.[agentic]'` or use the full test environment `.[vector,test,agentic]`.

```bash
loop-rag langgraph \
  --db output/loop_knowledge.sqlite \
  --lsa output/lsa.npz \
  --question 'How should we validate a causal model?' \
  --out output/langgraph_runs
```

## Nodes

`ORC-00` classifies intent with the existing deterministic planner. `RET-05` performs ACL-aware lexical/hybrid retrieval and allows one constrained alternate query. `DYN-06` converts topic co-occurrences into candidate variables and links only; every link has `status: hypothesis`, `polarity: unknown`, chunk IDs, and a disconfirmation test. It never promotes co-occurrence to causation.

`QA-07` checks that every candidate hypothesis points to retrieved chunks, marks retrieved context as untrusted data, and keeps semantic truth validation separate. `INT-08` runs only for intervention intent and emits a reversible proposal requiring human approval. The final node persists an auditable handoff when `--out` is supplied and always reports `simulation: not_performed` because no formal validated model is executed.

The compiled graph is exposed through `build_workflow()`, while `run_langgraph()` provides a serializable report for scripts and the CLI. The workflow does not execute retrieved text, call external services, write outside the requested output directory, or publish private indexes.
