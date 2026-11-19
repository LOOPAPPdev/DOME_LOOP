import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type NodeProps,
  type Node,
  type Edge,
} from "@xyflow/react"
import type { CausalEdgeData, CausalNodeData } from "../data/analysis"

type CausalCanvasProps = {
  nodes: Node<CausalNodeData>[]
  edges: Edge<CausalEdgeData>[]
  selectedNodeId: string
  selectedEdgeId: string
  activeEvidenceId: string
  onSelectNode: (id: string) => void
  onSelectEdge: (id: string) => void
  readOnly?: boolean
}

function CausalNode({ data, selected, isConnectable }: NodeProps<Node<CausalNodeData>>) {
  return (
    <div className={`causal-node ${selected ? "is-selected" : ""}`} aria-label={data.label} lang={data.language}>
      <Handle className="flow-handle" position={Position.Left} type="target" isConnectable={isConnectable} />
      <div className="causal-node-header" lang="en">
        <span className={`node-status ${data.status}`} aria-hidden="true" />
        <span>{data.status}</span>
      </div>
      <strong lang={data.language}>{data.label}</strong>
      <span className="node-metric"><span lang="en">{data.kind}</span> · <span lang={data.language}>{data.unit}</span></span>
      <Handle className="flow-handle" position={Position.Right} type="source" isConnectable={isConnectable} />
    </div>
  )
}

function ReadOnlyCausalNode(props: NodeProps<Node<CausalNodeData>>) {
  return <CausalNode {...props} isConnectable={false} />
}

const editableNodeTypes = { causal: CausalNode }
const readOnlyNodeTypes = { causal: ReadOnlyCausalNode }

export function CausalCanvas({ nodes, edges, selectedNodeId, selectedEdgeId, activeEvidenceId, onSelectNode, onSelectEdge, readOnly = false }: CausalCanvasProps) {
  const nodeLabels = new Map(nodes.map((node) => [node.id, node.data.label]))
  const visibleNodes = nodes.map((node) => ({
    ...node,
    draggable: readOnly ? false : node.draggable,
    connectable: readOnly ? false : node.connectable,
    selected: node.id === selectedNodeId,
    className: activeEvidenceId && node.data.evidenceIds.includes(activeEvidenceId) ? "evidence-linked" : undefined,
  }))
  const visibleEdges = edges.map((edge) => ({
    ...edge,
    selected: edge.id === selectedEdgeId,
    className: activeEvidenceId && edge.data?.evidenceIds.includes(activeEvidenceId) ? "evidence-linked" : undefined,
  }))
  return (
    <section className="graph-panel panel-surface" aria-labelledby="causal-structure-title">
      <div className="graph-toolbar">
        <div>
          <p className="eyebrow">02 / MECHANISM MAP</p>
          <h2 id="causal-structure-title">Causal structure</h2>
        </div>
        <div className="graph-legend" aria-label="Relationship status legend">
          <span><i className="legend-dot supported" aria-hidden="true" /> supported</span>
          <span><i className="legend-dot hypothesis" aria-hidden="true" /> hypothesis</span>
        </div>
      </div>
        <div className="graph-canvas" aria-label={readOnly ? "Read-only causal graph" : "Interactive causal graph"}>
        <ReactFlow
          edges={visibleEdges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodes={visibleNodes}
          nodeTypes={readOnly ? readOnlyNodeTypes : editableNodeTypes}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          onNodeClick={(_, node) => onSelectNode(node.id)}
          onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--loop-graph-dot)" gap={24} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            maskColor="var(--loop-graph-mask)"
            nodeColor={(node) => node.data?.status === "supported" ? "var(--loop-minimap-supported)" : "var(--loop-minimap-hypothesis)"}
          />
        </ReactFlow>
      </div>
      <p className="evidence-link-note" role="status">{activeEvidenceId ? `Evidence ${activeEvidenceId} is highlighted on linked variables and relationships.` : "Select an evidence record to highlight linked variables and relationships."}</p>
      <details className="graph-text-alternative">
        <summary>Text alternative: variables and relationships</summary>
        <h3>Variables</h3>
        <ul>
          {nodes.map((node) => (
            <li key={node.id}>
              <button type="button" aria-pressed={node.id === selectedNodeId} onClick={() => onSelectNode(node.id)}>
                <span lang={node.data.language}>{node.data.variableId}: {node.data.label}</span>
                <span lang="en"> — {node.data.kind}, </span><span lang={node.data.language}>{node.data.unit}</span><span lang="en">, {node.data.status}</span>
              </button>
            </li>
          ))}
        </ul>
        <h3>Relationships</h3>
        <ul>
          {edges.map((edge) => (
            <li key={edge.id}>
              <button type="button" aria-pressed={edge.id === selectedEdgeId} onClick={() => onSelectEdge(edge.id)}>
                <span lang={edge.data?.language}>{nodeLabels.get(edge.source) ?? edge.source}</span>
                <span lang="en"> to </span>
                <span lang={edge.data?.language}>{nodeLabels.get(edge.target) ?? edge.target}</span>
                <span lang="en">: polarity {edge.data?.polarity ?? "unknown"}; status {edge.data?.status ?? "unknown"}; delay {edge.data?.delay ?? "unknown"}; evidence {(edge.data?.evidenceIds ?? []).join(", ") || "none"}.</span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
