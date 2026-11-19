import { describe, expect, it } from "vitest"
import demoCaseJson from "../../data/demo-system-case.json"
import { nextRevision, type SystemCase } from "../../contracts/systemCase"
import { projectSystemCase } from "./systemCaseProjection"

const demoCase = demoCaseJson as unknown as SystemCase

describe("SystemCase UI projection", () => {
  it("preserves the case revision and marks the sample as fictional/unverified", () => {
    const projection = projectSystemCase(demoCase)
    expect(projection.revision).toBe("1")
    expect(projection.systemName).toContain("demonstração fictícia")
    expect(projection.evidence.every((item) => item.status === "unverified")).toBe(true)
    expect(projection.evidence[0]?.location).toContain("Exemplo fictício")
    expect(projection.contentLanguage).toBe("pt")
    expect(projection.evidence[0]?.language).toBe("pt")
  })

  it("uses units rather than fabricated numeric metrics", () => {
    const projection = projectSystemCase(demoCase)
    expect(projection.nodes[0]?.data.unit).toBe("pessoas/dia")
    expect(projection.nodes.every((node) => !node.data.unit.includes("%"))).toBe(true)
    expect(projection).not.toHaveProperty("confidence")
  })

  it("keeps the public camelCase DTO boundary and stable evidence/entity references", () => {
    expect(demoCase.id).toBe("SYS-DEMO-001")
    expect(demoCase.projectId).toBe("demo-project")
    expect(demoCase).not.toHaveProperty("case_id")
    expect(demoCase).not.toHaveProperty("evidence_ids")
    const variableIds = new Set(demoCase.variables.map((item) => item.id))
    const evidenceIds = new Set(demoCase.evidence.map((item) => item.id))
    for (const relation of demoCase.relations) {
      expect(variableIds.has(relation.sourceId)).toBe(true)
      expect(variableIds.has(relation.targetId)).toBe(true)
      expect(relation.evidenceIds.every((id) => evidenceIds.has(id))).toBe(true)
    }
  })

  it("does not promote a supported label without a verified evidence receipt", () => {
    const candidate: SystemCase = {
      ...demoCase,
      relations: [{ ...demoCase.relations[0]!, status: "supported" }],
    }
    const projection = projectSystemCase(candidate)
    expect(projection.edges[0]?.data?.status).toBe("hypothesis")
  })

  it("does not infer a supported variable claim merely from a verified source record", () => {
    const candidate: SystemCase = {
      ...demoCase,
      evidence: [{
        ...demoCase.evidence[0]!,
        id: "EV-SYNTHETIC-VERIFIED",
        kind: "document",
        statement: "Synthetic fixture proving evidence and causal assessment are separate.",
        status: "verified",
        sourceId: "SYNTHETIC-TEST-ONLY",
        documentTitle: "Synthetic unit-test record",
        location: "test fixture only",
      }],
      variables: demoCase.variables.map((variable) => ({ ...variable, evidenceIds: ["EV-SYNTHETIC-VERIFIED"] })),
    }
    const projection = projectSystemCase(candidate)
    expect(projection.nodes.every((node) => node.data.status === "hypothesis")).toBe(true)
  })

  it("keeps edge label and inspector status aligned after a conservative downgrade", () => {
    const candidate: SystemCase = {
      ...demoCase,
      relations: [{ ...demoCase.relations[0]!, status: "supported" }],
    }
    const edge = projectSystemCase(candidate).edges[0]!
    expect(edge.data?.status).toBe("hypothesis")
    expect(edge.label).toContain("hypothesis")
    expect(edge.label).not.toContain("supported")
  })

  it("preserves a source ID and does not replace it with a no-source fallback", () => {
    const candidate: SystemCase = {
      ...demoCase,
      evidence: [{ ...demoCase.evidence[0]!, sourceId: "SRC-SYNTHETIC-7", documentTitle: null }],
    }
    const evidence = projectSystemCase(candidate).evidence[0]!
    expect(evidence.sourceId).toBe("SRC-SYNTHETIC-7")
    expect(evidence.source).toContain("SRC-SYNTHETIC-7")
    expect(evidence.source).not.toContain("Sem fonte")
  })

  it("keeps distinct schema/workflow versions and increments only the case revision", () => {
    expect(demoCase.schemaVersion).toBe("1.0.0")
    expect(demoCase.workflowVersion).toBe("1.0.0")
    expect(nextRevision("1")).toBe("2")
    expect(nextRevision("999999999999999999999")).toBe("1000000000000000000000")
    expect(() => nextRevision("0")).toThrow(/positive decimal string/)
  })
})
