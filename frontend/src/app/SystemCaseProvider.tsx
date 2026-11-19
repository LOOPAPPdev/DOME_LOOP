import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import demoCaseJson from "../data/demo-system-case.json"
import { nextRevision } from "../contracts/systemCase"
import type { SystemCase } from "../contracts/systemCase"

export const DEMO_PROJECT_ID = "demo-project"
const initialDemoCase = demoCaseJson as unknown as SystemCase

const SystemCaseDataContext = createContext<SystemCase | null>(null)
const SystemCaseSaveContext = createContext<((draft: SystemCase) => void) | null>(null)

export function DemoSystemCaseProvider({ children }: { children: ReactNode }) {
  const [systemCase, setSystemCase] = useState<SystemCase>(() => initialDemoCase)

  const saveDemoRevision = useCallback((draft: SystemCase) => {
    setSystemCase((current) => {
      if (draft.id !== current.id || draft.projectId !== current.projectId) {
        throw new Error("A demo edit cannot change the SystemCase identity")
      }
      return {
        ...structuredClone(draft),
        schemaVersion: current.schemaVersion,
        workflowVersion: current.workflowVersion,
        revision: nextRevision(current.revision),
      }
    })
  }, [])

  const dataValue = useMemo(() => systemCase, [systemCase])
  return (
    <SystemCaseDataContext.Provider value={dataValue}>
      <SystemCaseSaveContext.Provider value={saveDemoRevision}>
        {children}
      </SystemCaseSaveContext.Provider>
    </SystemCaseDataContext.Provider>
  )
}

export function useSystemCaseData(): SystemCase {
  const value = useContext(SystemCaseDataContext)
  if (!value) throw new Error("useSystemCaseData must be used inside DemoSystemCaseProvider")
  return value
}

/** Only the App editor imports this mutation hook. Report projections use data only. */
export function useSaveDemoSystemCase(): (draft: SystemCase) => void {
  const value = useContext(SystemCaseSaveContext)
  if (!value) throw new Error("useSaveDemoSystemCase must be used inside DemoSystemCaseProvider")
  return value
}
