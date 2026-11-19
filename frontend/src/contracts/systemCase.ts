export const SYSTEM_CASE_SCHEMA_VERSION = "1.0.0" as const
export const SYSTEM_CASE_WORKFLOW_VERSION = "1.0.0" as const

/** `externally_validated` is untrusted display data here, not a verified reviewer attestation. */
export type SystemStatus = "draft" | "review_ready" | "externally_validated"
export type EvidenceKind = "observation" | "measurement" | "document" | "interview" | "assumption"
export type EvidenceStatus = "verified" | "unverified"
export type VariableKind = "stock" | "flow" | "auxiliary" | "exogenous" | "unknown"
export type LinkPolarity = "+" | "-" | "unknown"
export type CausalStatus = "hypothesis" | "supported" | "contradicted" | "unverified"

/**
 * Frontend domain object for Iteration A. This camelCase view model is deliberately
 * decoupled from the private backend's internal JSON structure; it is not yet an
 * API DTO. OpenAPI generation and mapping are a separate, agreed Iteration B gate.
 */
export interface SystemCase {
  id: string
  projectId: string
  schemaVersion: typeof SYSTEM_CASE_SCHEMA_VERSION
  workflowVersion: typeof SYSTEM_CASE_WORKFLOW_VERSION
  /** Language tag for the localized fictional display content; not a backend API field. */
  contentLanguage: string
  /** Opaque positive decimal string; the demo increments it in memory only. */
  revision: string
  title: string
  problem: string
  objective: string
  status: SystemStatus
  scope: {
    horizon: string
    included: string[]
    excluded: string[]
    stakeholders: string[]
    methodFit: "high" | "medium" | "low" | "unknown"
  }
  evidence: Array<{
    id: string
    kind: EvidenceKind
    statement: string
    status: EvidenceStatus
    sourceId: string | null
    documentTitle: string | null
    location: string | null
  }>
  iceberg: {
    events: Array<{ text: string; evidenceIds: string[] }>
    patterns: Array<{ text: string; evidenceIds: string[] }>
    structures: Array<{ text: string; evidenceIds: string[] }>
    mentalModels: Array<{ text: string; evidenceIds: string[] }>
  }
  variables: Array<{
    id: string
    name: string
    kind: VariableKind
    unit: string
    evidenceIds: string[]
  }>
  relations: Array<{
    id: string
    sourceId: string
    targetId: string
    polarity: LinkPolarity
    delay: "none" | "possible" | "confirmed" | "unknown"
    status: CausalStatus
    evidenceIds: string[]
    disconfirmationTest: string
  }>
  loops: Array<{
    id: string
    relationIds: string[]
    classification: "balancing" | "reinforcing" | "undetermined"
    status: CausalStatus
  }>
  hypotheses: Array<{
    id: string
    statement: string
    timeHorizon: string
    disconfirmationTest: string
    evidenceIds: string[]
  }>
  interventions: Array<{
    id: string
    action: string
    owner: string
    indicator: string
    checkpoint: string
    stopCondition: string
    approvalRequired: boolean
    evidenceIds: string[]
  }>
  simulation: {
    status: "not_performed" | "blocked" | "validated"
    missingRequirements: string[]
    validationEvidenceIds: string[]
    results: Array<Record<string, unknown>>
  }
  review: {
    externalReviewer: string | null
    externalEvidence: string | null
    limitations: string[]
    nextGate: string
  }
}

export function nextRevision(revision: string): string {
  if (!/^[1-9][0-9]*$/.test(revision)) {
    throw new Error("SystemCase revision must be a positive decimal string")
  }
  return (BigInt(revision) + 1n).toString()
}
