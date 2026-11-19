import type { Edge, Node } from "@xyflow/react"
import type { AnalysisModel, CausalEdgeData, CausalNodeData } from "../../data/analysis"
import type { SystemCase } from "../../contracts/systemCase"

export function projectSystemCase(systemCase: SystemCase): AnalysisModel {
  const verifiedEvidenceIds = new Set(
    systemCase.evidence.filter((item) => item.status === "verified").map((item) => item.id),
  )
  const evidence = systemCase.evidence.map((item) => ({
    id: item.id,
    sourceId: item.sourceId,
    source: item.documentTitle ?? (item.sourceId ? `Fonte ${item.sourceId}` : "Sem fonte externa — demonstração fictícia"),
    location: item.location ?? "Exemplo fictício · sem fonte externa",
    quote: item.statement,
    kind: item.kind,
    status: item.status,
    language: systemCase.contentLanguage,
  }))
  const nodes: Node<CausalNodeData>[] = systemCase.variables.map((variable, index) => ({
    id: variable.id,
    type: "causal",
    position: { x: 36 + Math.floor(index / 3) * 250, y: 36 + (index % 3) * 150 },
    data: {
      variableId: variable.id,
      label: variable.name,
      kind: variable.kind,
      unit: variable.unit,
      // A source receipt can verify the evidence record, not a causal/variable claim.
      // This view-model has no independently assessed variable status, so stay conservative.
      status: "hypothesis",
      evidenceIds: variable.evidenceIds,
      language: systemCase.contentLanguage,
    },
  }))
  const edges: Edge<CausalEdgeData>[] = systemCase.relations.map((relation) => {
    const effectiveStatus = relation.status === "supported" && !relation.evidenceIds.some((id) => verifiedEvidenceIds.has(id))
      ? "hypothesis"
      : relation.status
    return {
      id: relation.id,
      source: relation.sourceId,
      target: relation.targetId,
      type: "smoothstep",
      label: relation.polarity === "unknown" ? `? · ${effectiveStatus}` : `${relation.polarity} · ${effectiveStatus}`,
      data: {
        polarity: relation.polarity,
        delay: relation.delay,
        status: effectiveStatus,
        evidenceIds: relation.evidenceIds,
        disconfirmationTest: relation.disconfirmationTest,
        language: systemCase.contentLanguage,
      },
    }
  })

  return {
    systemName: systemCase.title,
    revision: systemCase.revision,
    contentLanguage: systemCase.contentLanguage,
    question: systemCase.problem,
    objective: systemCase.objective,
    evidence,
    nodes,
    edges,
    hypotheses: systemCase.hypotheses.map((item) => item.statement),
    interventions: systemCase.interventions.map((item) => item.action),
    simulationStatus: systemCase.simulation.status,
    limitations: systemCase.review.limitations,
  }
}
