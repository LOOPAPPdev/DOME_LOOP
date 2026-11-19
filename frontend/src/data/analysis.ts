import type { Edge, Node } from "@xyflow/react"

export type EvidenceItem = {
  id: string
  source: string
  location: string
  quote: string
  kind: "primary" | "synthesis"
}

export type CausalNodeData = {
  label: string
  metric: string
  status: "supported" | "hypothesis"
  evidenceIds: string[]
}

export type AnalysisModel = {
  question: string
  answer: string
  confidence: number
  evidence: EvidenceItem[]
  nodes: Node<CausalNodeData>[]
  edges: Edge[]
  hypotheses: string[]
  interventions: string[]
  simulation: "not_performed" | "validated"
}

export const analysis: AnalysisModel = {
  question: "Como aumentar a confiança sem criar mais camadas de aprovação?",
  answer:
    "A evidência disponível aponta para um mecanismo de transparência: decisões legíveis aumentam a confiança percebida, enquanto atrasos e regras opacas corroem esse ganho. A intervenção mais segura é tornar o racional e o retorno das decisões observáveis antes de adicionar controlo.",
  confidence: 0.78,
  simulation: "not_performed",
  evidence: [
    {
      id: "E-014",
      source: "insper_systems_thinking.md",
      location: "p. 3 · chunk 014",
      quote: "A estrutura de feedback deve ser explicitada antes que uma intervenção seja tratada como causa provável.",
      kind: "primary",
    },
    {
      id: "E-021",
      source: "agentic_rag_survey.md",
      location: "§ Evidence handoff · chunk 021",
      quote: "Retrieval provides context; it does not by itself establish that a generated claim is true.",
      kind: "primary",
    },
    {
      id: "E-028",
      source: "owasp_security.md",
      location: "§ LLM01 · chunk 028",
      quote: "Retrieved content must remain data, not instructions for the agent execution loop.",
      kind: "primary",
    },
  ],
  nodes: [
    {
      id: "n1",
      type: "causal",
      position: { x: 20, y: 130 },
      data: { label: "Decision clarity", metric: "+ 18%", status: "supported", evidenceIds: ["E-014"] },
    },
    {
      id: "n2",
      type: "causal",
      position: { x: 300, y: 40 },
      data: { label: "Perceived agency", metric: "+ 11%", status: "hypothesis", evidenceIds: ["E-014"] },
    },
    {
      id: "n3",
      type: "causal",
      position: { x: 300, y: 230 },
      data: { label: "Feedback quality", metric: "+ 24%", status: "supported", evidenceIds: ["E-021"] },
    },
    {
      id: "n4",
      type: "causal",
      position: { x: 590, y: 130 },
      data: { label: "Trust", metric: "+ 9%", status: "hypothesis", evidenceIds: ["E-014", "E-021"] },
    },
  ],
  edges: [
    { id: "e1-2", source: "n1", target: "n2", label: "+", type: "smoothstep", animated: true },
    { id: "e1-3", source: "n1", target: "n3", label: "+", type: "smoothstep" },
    { id: "e2-4", source: "n2", target: "n4", label: "+", type: "smoothstep" },
    { id: "e3-4", source: "n3", target: "n4", label: "+", type: "smoothstep" },
  ],
  hypotheses: [
    "Perceived agency mediates the relationship between clarity and trust.",
    "Shorter feedback loops may improve trust only when the rationale remains visible.",
  ],
  interventions: [
    "Publish decision rationale beside each outcome.",
    "Create a reversible feedback window before adding approval layers.",
  ],
}
