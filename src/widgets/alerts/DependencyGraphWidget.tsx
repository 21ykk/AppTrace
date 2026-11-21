import React, { useState } from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { ForceGraph, GraphNode } from '../../components/graphs/ForceGraph'
import { NodeDetailsPanel } from '../../components/graphs/NodeDetailsPanel'

export const DependencyGraphWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { processes, connections } = useTelemetryStore()
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <ForceGraph
        processes={processes}
        connections={connections}
        onSelectNode={setSelectedNode}
        selectedNodeId={selectedNode?.id}
      />
      {selectedNode && (
        <div className="absolute top-4 right-4 z-20">
          <NodeDetailsPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        </div>
      )}
    </div>
  )
}
