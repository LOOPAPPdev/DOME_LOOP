"""Bounded LangGraph orchestration for evidence-grounded system dynamics analysis.

The workflow is deliberately deterministic: LangGraph coordinates specialist-shaped
nodes, but no LLM call, simulation, external write, or retrieved-text execution is
performed here. Retrieved passages remain untrusted data and every generated claim
carries chunk-level provenance.
"""
from __future__ import annotations

from contextlib import closing
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from typing import Any, TypedDict
import uuid

from .core import connect
from .lsa import hybrid_search
from .runtime import plan


class WorkflowState(TypedDict, total=False):
    question: str
    db_path: str
    lsa_path: str | None
    group: str
    k: int
    output_dir: str | None
    task: dict[str, Any]
    attempts: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    causal_model: dict[str, Any]
    review: dict[str, Any]
    interventions: list[dict[str, Any]]
    run_id: str
    report: dict[str, Any]


ROLE_IDS = {
    "route": "ORC-00",
    "retrieve": "RET-05",
    "dynamics": "DYN-06",
    "review": "QA-07",
    "intervention": "INT-08",
}

_TOPIC_VARIABLES = {
    "causal_mapping": "Causal structure",
    "dynamic_model": "Stocks and flows",
    "simulation": "Model behavior",
    "validation": "Validation discipline",
    "intervention": "Policy intervention",
    "governance": "Governance and access",
}
_TOPIC_PAIRS = (
    ("causal_mapping", "dynamic_model"),
    ("dynamic_model", "simulation"),
    ("validation", "governance"),
    ("intervention", "causal_mapping"),
)


def _require_langgraph() -> tuple[Any, Any, Any]:
    try:
        from langgraph.graph import END, START, StateGraph
    except ImportError as exc:  # pragma: no cover - exercised in minimal installs
        raise RuntimeError(
            "LangGraph is optional. Install the agentic extra: "
            "python -m pip install -e '.[agentic]'."
        ) from exc
    return StateGraph, START, END


def _alternate_query(question: str) -> str:
    words = re.findall(r"\w+", question, flags=re.UNICODE)
    return " ".join(word for word in words if len(word) > 4)[:120]


def route_task(state: WorkflowState) -> dict[str, Any]:
    return {"task": plan(state["question"])}


def retrieve_evidence(state: WorkflowState) -> dict[str, Any]:
    db_path = Path(state["db_path"])
    lsa_path = Path(state["lsa_path"]) if state.get("lsa_path") else None
    group = state.get("group", "private")
    k = state.get("k", 6)
    attempts: list[dict[str, Any]] = []

    with closing(connect(db_path)) as conn:
        query = state["question"]
        evidence = hybrid_search(conn, query, lsa_path, group, k)
        attempts.append({"query": query, "retrieved": len(evidence)})
        if not evidence:
            alternate = _alternate_query(query)
            if alternate and alternate != query:
                evidence = hybrid_search(conn, alternate, lsa_path, group, k)
                attempts.append({"query": alternate, "retrieved": len(evidence)})

    return {"evidence": evidence, "attempts": attempts}


def build_dynamics_hypotheses(state: WorkflowState) -> dict[str, Any]:
    evidence = state.get("evidence", [])
    if not evidence:
        return {
            "causal_model": {
                "variables": [],
                "links": [],
                "hypotheses": [],
                "method": "no_evidence_abstention",
            }
        }

    topic_hits: dict[str, list[str]] = {}
    evidence_ids = [item["chunk_id"] for item in evidence]
    for item in evidence:
        for topic in item.get("tags", []):
            topic_hits.setdefault(topic, []).append(item["chunk_id"])

    variables: list[dict[str, Any]] = []
    variable_ids: dict[str, str] = {}
    for topic, label in _TOPIC_VARIABLES.items():
        if topic in topic_hits:
            variable_id = f"V{len(variables) + 1}"
            variable_ids[topic] = variable_id
            variables.append(
                {
                    "id": variable_id,
                    "name": label,
                    "kind": "unknown",
                    "status": "candidate",
                    "evidence_ids": sorted(set(topic_hits[topic])),
                }
            )

    links: list[dict[str, Any]] = []
    hypotheses: list[dict[str, Any]] = []
    for source_topic, target_topic in _TOPIC_PAIRS:
        if source_topic not in variable_ids or target_topic not in variable_ids:
            continue
        linked_evidence = sorted(
            set(topic_hits[source_topic] + topic_hits[target_topic])
        )
        link_id = f"L{len(links) + 1}"
        links.append(
            {
                "id": link_id,
                "source": variable_ids[source_topic],
                "target": variable_ids[target_topic],
                "polarity": "unknown",
                "delay": "unknown",
                "status": "hypothesis",
                "evidence_ids": linked_evidence,
                "disconfirmation_test": (
                    "Find a source or observation that contradicts the proposed relationship "
                    "or shows the variables move independently."
                ),
            }
        )
        hypotheses.append(
            {
                "id": f"H{len(hypotheses) + 1}",
                "statement": (
                    f"The retrieved material places { _TOPIC_VARIABLES[source_topic].lower() } "
                    f"and { _TOPIC_VARIABLES[target_topic].lower() } in the same analysis context; "
                    "a directional relationship remains unverified."
                ),
                "evidence_ids": linked_evidence,
                "status": "hypothesis",
            }
        )

    return {
        "causal_model": {
            "variables": variables,
            "links": links,
            "hypotheses": hypotheses,
            "method": "tag_cooccurrence_candidates_only",
            "simulation": "not_performed",
        }
    }


def review_grounding(state: WorkflowState) -> dict[str, Any]:
    evidence = state.get("evidence", [])
    causal_model = state.get("causal_model", {})
    evidence_ids = {item.get("chunk_id") for item in evidence}
    missing: list[str] = []
    for hypothesis in causal_model.get("hypotheses", []):
        missing.extend(
            chunk_id for chunk_id in hypothesis.get("evidence_ids", []) if chunk_id not in evidence_ids
        )

    grounded = bool(evidence) and not missing
    return {
        "review": {
            "grounded": grounded,
            "evidence_count": len(evidence),
            "missing_chunk_ids": sorted(set(missing)),
            "retrieved_context_is_untrusted_data": True,
            "semantic_truth_checked": False,
            "simulation_gate": "not_performed",
            "human_approval_required": state.get("task", {}).get("requires_human_approval", False),
            "reviewer": ROLE_IDS["review"],
        }
    }


def propose_interventions(state: WorkflowState) -> dict[str, Any]:
    if state.get("task", {}).get("intent") != "intervention":
        return {"interventions": []}
    return {
        "interventions": [
            {
                "id": "INT-001",
                "action": "Run a small, reversible observation or validation step against the proposed mechanism.",
                "owner": "human decision-maker",
                "indicator": "A measurable change linked to the cited evidence appears within the stated horizon.",
                "stop_condition": "Stop if the observation contradicts the hypothesis or creates an unreviewed risk.",
                "approval_required": True,
                "status": "proposal_only",
            }
        ]
    }


def _write_handoff(state: WorkflowState, report: dict[str, Any]) -> None:
    output_dir = state.get("output_dir")
    if not output_dir:
        return
    destination = Path(output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    for hit in state.get("evidence", []):
        path = destination / f"{report['run_id']}_{hit['chunk_id']}.txt"
        path.write_text(hit["content"], encoding="utf-8")
    handoff = destination / f"{report['run_id']}_handoff.json"
    handoff.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")


def finalize(state: WorkflowState) -> dict[str, Any]:
    run_id = state.get("run_id", "RUN-LG-" + uuid.uuid4().hex[:12].upper())
    evidence = state.get("evidence", [])
    status = "evidence_found" if evidence else "insufficient_evidence"
    report = {
        "run_id": run_id,
        "workflow": "langgraph-bounded-v1",
        "task": state.get("task", {}),
        "status": status,
        "attempts": state.get("attempts", []),
        "evidence": [
            {
                "chunk_id": item["chunk_id"],
                "source_id": item["source_id"],
                "citation": item["citation"],
                "source_uri": item["source_uri"],
                "sha256": item["sha256"],
                "score": round(float(item.get("rrf", 0)), 6),
            }
            for item in evidence
        ],
        "causal_model": state.get("causal_model", {}),
        "interventions": state.get("interventions", []),
        "generated_answer": False,
        "simulation": "not_performed",
        "synthesis": (
            "Deterministic specialist handoff prepared; candidate causal links remain hypotheses."
            if evidence
            else "Insufficient source evidence. Abstain from factual or causal claims."
        ),
        "review": state.get("review", {}),
        "next_action": (
            "Have an authorized human or specialist validate hypotheses against the cited chunks."
            if evidence
            else "Request additional authorized sources; do not fabricate claims."
        ),
        "created_utc": datetime.now(timezone.utc).isoformat(),
    }
    _write_handoff(state, report)
    return {"run_id": run_id, "report": report}


def _after_review(state: WorkflowState) -> str:
    return "intervention" if state.get("task", {}).get("intent") == "intervention" else "finalize"


def build_workflow() -> Any:
    """Compile the bounded graph. LangGraph is imported only when this is called."""
    StateGraph, START, END = _require_langgraph()
    graph = StateGraph(WorkflowState)
    graph.add_node("route", route_task)
    graph.add_node("retrieve", retrieve_evidence)
    graph.add_node("dynamics", build_dynamics_hypotheses)
    graph.add_node("review", review_grounding)
    graph.add_node("intervention", propose_interventions)
    graph.add_node("finalize", finalize)
    graph.add_edge(START, "route")
    graph.add_edge("route", "retrieve")
    graph.add_edge("retrieve", "dynamics")
    graph.add_edge("dynamics", "review")
    graph.add_conditional_edges("review", _after_review, {"intervention": "intervention", "finalize": "finalize"})
    graph.add_edge("intervention", "finalize")
    graph.add_edge("finalize", END)
    return graph.compile()


def run_langgraph(
    db: str | Path,
    question: str,
    *,
    output: str | Path | None = None,
    lsa: str | Path | None = None,
    group: str = "private",
    k: int = 6,
) -> dict[str, Any]:
    """Run the graph and return a serializable audit report."""
    if not question.strip():
        raise ValueError("Question must not be empty")
    initial: WorkflowState = {
        "question": question,
        "db_path": str(db),
        "lsa_path": str(lsa) if lsa else None,
        "group": group,
        "k": k,
        "output_dir": str(output) if output else None,
    }
    result = build_workflow().invoke(initial)
    return result["report"]
