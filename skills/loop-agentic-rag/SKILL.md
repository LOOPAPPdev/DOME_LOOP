---
name: loop-agentic-rag
version: 1.0.0
description: Build a source-traceable systems-thinking knowledge base, retrieve evidence and coordinate bounded specialist agents without unsupported claims.
---
# LOOP Agentic RAG Skill

## When to use
Use when the task names a complex system, a causal modeling question, a document corpus for a team of agents, or an evidence-based intervention proposal.

## Inputs
- System name, observed problem, objective and time horizon.
- Authorized source files or URLs with license/access metadata.
- Available budget, role permissions and approval requirements.

## Deterministic pipeline
A. Validate source permissions and provenance (`GOV-01`).
B. Extract layout-aware text and page numbers (`ING-02`).
C. Segment each page with overlap while preserving negation, units and numbers (`SEG-03`).
D. Persist chunk IDs, source hashes, taxonomy and access controls (`IDX-04`).
E. Route retrieval based on the user's question and source permissions (`RET-05`).
F. Retrieve and grade; try one bounded reformulation; if insufficient, abstain.
G. Offload individual passages to files and hand off paths to focused agents.
H. If a system problem is defined, map iceberg, patterns, feedback loops and hypotheses (`DYN-06`).
I. Validate claims and causal relationships independently (`ARI-00`, `QA-07`).
J. Draft roadmap (`INT-08`) and request authorization for real-world changes.

## Reference method
Insper modules: Fundamentals → causal mapping and archetypes → intervention roadmap.
Sterman (2000), Chapters 3, 5, 6, 21: problem framing → dynamic hypotheses → causal and stock-flow models → tests → policy analysis.

## Required output
- `case.json` (source of truth for system model) when system analysis is requested.
- `RUN-ID_handoff.json` with evidence paths, reviewer and next gate.
- Source citations for every substantive assertion; unsupported claims remain hypotheses.
- Explicit `not_performed` status for simulations without validated models.

## Strict limits
- This package does not contain a connected LLM or Deep Agents executor. Report only what was actually run.
- Do not turn the uploaded book into a public hosted searchable library without checking copyright.
- Do not promote an LSA vector similarity to verified truth.
