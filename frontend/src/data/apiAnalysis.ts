import type { AnalysisModel, CausalNodeData, EvidenceItem } from "./analysis"

export type AnalysisV1Response = {
  schema_version: "analysis/v1"
  run_id: string
  status: "complete" | "insufficient_evidence"
  question: string
  answer: string
  confidence: number
  evidence: Array<{
    id: string
    source: string
    locator: string
    quote: string
    status: "retrieved_unverified"
  }>
  provenance: {
    source: "api"
    retrieved_chunks: string[]
    ari_agent: "ARI_00"
    external_evidence_verification_executed: false
  }
  model: {
    nodes: Array<{ id: string; label: string; metric?: string; status?: "supported" | "hypothesis"; evidenceIds?: string[] }>
    edges: Array<{ id: string; source: string; target: string; label?: string }>
    hypotheses: string[]
    interventions: string[]
    simulation: "not_performed" | "validated"
    model_validated: boolean
  }
}

export function adaptAnalysis(response: AnalysisV1Response): AnalysisModel {
  const evidence: EvidenceItem[] = response.evidence.map((item) => ({
    id: item.id,
    source: item.source,
    location: item.locator,
    quote: item.quote,
    kind: "primary",
  }))
  const evidenceIds = new Set(evidence.map((item) => item.id))
  const nodes = response.model.nodes.map((node, index) => ({
    id: node.id,
    type: "causal",
    position: { x: 40 + (index % 3) * 250, y: 80 + Math.floor(index / 3) * 150 },
    data: {
      label: node.label,
      metric: node.metric ?? "undetermined",
      status: node.status ?? "hypothesis",
      evidenceIds: (node.evidenceIds ?? []).filter((id) => evidenceIds.has(id)),
    } satisfies CausalNodeData,
  }))

  return {
    question: response.question,
    answer: response.answer,
    confidence: response.confidence,
    evidence,
    nodes,
    edges: response.model.edges.map((edge) => ({ ...edge, type: "smoothstep" })),
    hypotheses: response.model.hypotheses,
    interventions: response.model.interventions,
    simulation: response.model.simulation,
  }
}

export async function requestAnalysis(question: string): Promise<AnalysisModel> {
  const response = await fetch("/api/analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ question }),
  })
  if (!response.ok) throw new Error("Analysis service unavailable")
  const payload = (await response.json()) as AnalysisV1Response
  if (payload.schema_version !== "analysis/v1" || payload.provenance.source !== "api") {
    throw new Error("Invalid analysis response")
  }
  return adaptAnalysis(payload)
}
