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
import type { CausalNodeData } from "../data/analysis"

type CausalCanvasProps = {
  nodes: Node<CausalNodeData>[]
  edges: Edge[]
  selectedNodeId: string
  onSelectNode: (id: string) => void
}

function CausalNode({ data, selected }: NodeProps<Node<CausalNodeData>>) {
  return (
    <div className={`causal-node ${selected ? "is-selected" : ""}`}>
      <Handle className="flow-handle" position={Position.Left} type="target" />
      <div className="causal-node-header">
        <span className={`node-status ${data.status}`} />
        <span>{data.status}</span>
      </div>
      <strong>{data.label}</strong>
      <span className="node-metric">{data.metric}</span>
      <Handle className="flow-handle" position={Position.Right} type="source" />
    </div>
  )
}

const nodeTypes = { causal: CausalNode }

export function CausalCanvas({ nodes, edges, selectedNodeId, onSelectNode }: CausalCanvasProps) {
  return (
    <section className="graph-panel panel-surface">
      <div className="graph-toolbar">
        <div>
          <p className="eyebrow">02 / MECHANISM MAP</p>
          <h2>Causal structure</h2>
        </div>
        <div className="graph-legend" aria-label="Graph legend">
          <span><i className="legend-dot supported" /> supported</span>
          <span><i className="legend-dot hypothesis" /> hypothesis</span>
        </div>
      </div>
      <div className="graph-canvas">
        <ReactFlow
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodes={nodes.map((node) => ({ ...node, selected: node.id === selectedNodeId }))}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => onSelectNode(node.id)}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#26333a" gap={24} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            maskColor="rgba(7, 16, 25, 0.74)"
            nodeColor={(node) => node.data?.status === "supported" ? "#6de0d0" : "#e8ad72"}
          />
        </ReactFlow>
        <div className="graph-note">
          <span className="pulse-line" />
          <span>Click a node to inspect linked evidence</span>
        </div>
      </div>
    </section>
  )
}
