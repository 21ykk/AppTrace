import React, { useState } from 'react'
import { useTelemetryStore } from '../../stores/telemetryStore'
import {
  ForceGraph,
  GraphNode,
  GraphCategoryFilter,
  GraphSpeedMode,
} from '../../components/graphs/ForceGraph'
import { NodeDetailsPanel } from '../../components/graphs/NodeDetailsPanel'
import { Search, Share2, Cpu, Globe, SlidersHorizontal, Sparkles } from 'lucide-react'
import { isUserApp, isSystemProcess } from '../../utils/processClassifier'
import { cn } from '../../utils/cn'

export const DependencyGraphPage: React.FC = () => {
  const { processes, connections } = useTelemetryStore()
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [filterText, setFilterText] = useState('')
  const [nodeTypeFilter, setNodeTypeFilter] = useState<'all' | 'process' | 'network'>('all')
  const [categoryFilter, setCategoryFilter] = useState<GraphCategoryFilter>('user_apps')
  const [maxNodesLimit, setMaxNodesLimit] = useState<number>(30)
  const [speedMode, setSpeedMode] = useState<GraphSpeedMode>('slow')

  const userAppCount = processes.filter(isUserApp).length
  const systemCount = processes.filter(isSystemProcess).length
  const procWithNetwork = new Set(connections.filter((c) => c.pid).map((c) => c.pid))
  const netActiveCount = processes.filter((p) => procWithNetwork.has(p.pid)).length
  const heavyCount = processes.filter((p) => p.cpu_usage > 1.0 || p.memory_bytes > 100 * 1024 * 1024).length

  const handleToggleSpeed = () => {
    setSpeedMode((prev) => {
      if (prev === 'slow') return 'normal'
      if (prev === 'normal') return 'paused'
      return 'slow'
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] space-y-2 pb-1">
      {/* Graph Control Bar */}
      <div className="flex flex-col gap-2 bg-[#17191C] p-2.5 rounded-lg border border-[#30343A] shrink-0">
        {/* Top Row: Title, Search, Type and Speed */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#2878D0]/15 border border-[#2878D0]/30 flex items-center justify-center text-[#2878D0]">
              <Share2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-semibold text-xs text-[#E6E8EB] font-mono uppercase tracking-wider flex items-center gap-2">
                Workstation Dependency Topology
                <span className="text-[10px] px-1.5 py-0.2 bg-[#22262B] text-[#9A9FA8] font-mono border border-[#30343A] rounded">
                  Live Physics
                </span>
              </h2>
              <p className="text-[11px] text-[#9A9FA8] font-sans">
                Real-time process hierarchy and verified active TCP/UDP socket relationships
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-52">
              <Search className="w-3.5 h-3.5 text-[#6E747D] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter graph nodes..."
                className="w-full bg-[#101113] border border-[#30343A] rounded-md px-2.5 pl-8 py-1 text-xs text-[#E6E8EB] placeholder:text-[#6E747D] focus:outline-none focus:border-[#2878D0] font-mono transition-colors"
              />
            </div>

            {/* Node Type Selector */}
            <div className="flex items-center rounded-md bg-[#101113] border border-[#30343A] p-0.5 text-xs font-mono">
              {(
                [
                  { id: 'all', label: 'ALL' },
                  { id: 'process', label: 'PROCESS' },
                  { id: 'network', label: 'NETWORK' },
                ] as const
              ).map((type) => (
                <button
                  key={type.id}
                  onClick={() => setNodeTypeFilter(type.id)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors',
                    nodeTypeFilter === type.id
                      ? 'bg-[#2878D0] text-white'
                      : 'text-[#9A9FA8] hover:text-[#E6E8EB]'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Density Limit */}
            <div className="flex items-center gap-1 bg-[#101113] border border-[#30343A] rounded-md p-0.5 text-[10px] font-mono">
              <span className="px-1.5 text-[#6E747D]">Nodes:</span>
              {[15, 30, 50, 80].map((lim) => (
                <button
                  key={lim}
                  onClick={() => setMaxNodesLimit(lim)}
                  className={cn(
                    'px-1.5 py-0.5 rounded transition-colors',
                    maxNodesLimit === lim
                      ? 'bg-[#2878D0] text-white font-bold'
                      : 'text-[#9A9FA8] hover:text-white'
                  )}
                >
                  {lim}
                </button>
              ))}
            </div>

            {/* Physics Speed Button */}
            <button
              onClick={handleToggleSpeed}
              className={cn(
                'px-2 py-1 rounded-md text-[10px] font-mono font-semibold border transition-colors flex items-center gap-1',
                speedMode === 'slow'
                  ? 'bg-[#35B879]/15 text-[#35B879] border-[#35B879]/30'
                  : speedMode === 'normal'
                  ? 'bg-[#E4A83A]/15 text-[#E4A83A] border-[#E4A83A]/30'
                  : 'bg-[#22262B] text-[#9A9FA8] border-[#30343A]'
              )}
              title="Toggle physics simulation speed"
            >
              <Sparkles className="w-3 h-3" />
              {speedMode === 'slow' ? 'Calm' : speedMode === 'normal' ? 'Fast' : 'Paused'}
            </button>
          </div>
        </div>

        {/* Bottom Row: Quick Scope Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#30343A]/60 text-xs font-mono">
          <span className="text-[10px] text-[#6E747D] uppercase tracking-wide mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-[#2878D0]" />
            Scope:
          </span>

          <button
            onClick={() => setCategoryFilter('user_apps')}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1',
              categoryFilter === 'user_apps'
                ? 'bg-[#2878D0] text-white font-semibold'
                : 'bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB] border border-[#30343A]'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#35B879]" />
            User Apps ({userAppCount})
          </button>

          <button
            onClick={() => setCategoryFilter('network_active')}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1',
              categoryFilter === 'network_active'
                ? 'bg-[#2878D0] text-white font-semibold'
                : 'bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB] border border-[#30343A]'
            )}
          >
            <Globe className="w-3 h-3 text-[#2878D0]" />
            Network Sockets ({netActiveCount})
          </button>

          <button
            onClick={() => setCategoryFilter('high_usage')}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1',
              categoryFilter === 'high_usage'
                ? 'bg-[#E4A83A] text-black font-semibold'
                : 'bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB] border border-[#30343A]'
            )}
          >
            <Cpu className="w-3 h-3 text-[#E4A83A]" />
            Heavy ({heavyCount})
          </button>

          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-mono transition-colors',
              categoryFilter === 'all'
                ? 'bg-[#2878D0] text-white font-semibold'
                : 'bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB] border border-[#30343A]'
            )}
          >
            All Workstation ({processes.length})
          </button>

          <button
            onClick={() => setCategoryFilter('system')}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-mono transition-colors',
              categoryFilter === 'system'
                ? 'bg-[#2878D0] text-white font-semibold'
                : 'bg-[#22262B] text-[#6E747D] hover:text-[#9A9FA8] border border-[#30343A]'
            )}
          >
            System ({systemCount})
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area with Docked Inspector */}
      <div className="relative flex-1 rounded-lg border border-[#30343A] overflow-hidden bg-[#101113]">
        <ForceGraph
          processes={processes}
          connections={connections}
          onSelectNode={setSelectedNode}
          selectedNodeId={selectedNode?.id}
          filterText={filterText}
          nodeTypeFilter={nodeTypeFilter}
          categoryFilter={categoryFilter}
          maxNodesLimit={maxNodesLimit}
          speedMode={speedMode}
          onToggleSpeed={handleToggleSpeed}
        />

        {/* Floating Node Details Panel */}
        {selectedNode && (
          <div className="absolute top-3 right-3 z-30">
            <NodeDetailsPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
