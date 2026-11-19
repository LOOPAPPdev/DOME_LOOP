import type { Edge, Node } from "@xyflow/react"
import type { CausalStatus, EvidenceKind, EvidenceStatus, LinkPolarity, VariableKind } from "../contracts/systemCase"

export type EvidenceItem = {
  id: string
  sourceId: string | null
  source: string
  location: string
  quote: string
  kind: EvidenceKind
  status: EvidenceStatus
  language: string
}

export type CausalNodeData = {
  variableId: string
  label: string
  kind: VariableKind
  unit: string
  status: "supported" | "hypothesis"
  evidenceIds: string[]
  language: string
}

export type CausalEdgeData = {
  polarity: LinkPolarity
  delay: string
  status: CausalStatus
  evidenceIds: string[]
  disconfirmationTest: string
  language: string
}

export type AnalysisModel = {
  systemName: string
  revision: string
  contentLanguage: string
  question: string
  objective: string
  evidence: EvidenceItem[]
  nodes: Node<CausalNodeData>[]
  edges: Edge<CausalEdgeData>[]
  hypotheses: string[]
  interventions: string[]
  simulationStatus: "not_performed" | "blocked" | "validated"
  limitations: string[]
}
