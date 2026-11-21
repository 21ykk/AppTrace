import React, { useState, useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { telemetryService } from '../../services/telemetry/telemetryService'
import { formatBytes } from '../../utils/formatters'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import {
  Search,
  Globe,
  Cpu,
  SlidersHorizontal,
  FolderOpen,
  XCircle,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  List,
  Network as NetworkIcon,
  Shield,
  Activity,
  FileText,
  GitFork,
  ArrowUpDown,
  Download,
} from 'lucide-react'
import { ProcessInfo, NetworkConnection } from '../../types/telemetry'
import { isUserApp, isSystemProcess } from '../../utils/processClassifier'
import { getCachedIpGeo } from '../../services/network/geoIpService'
import { cn } from '../../utils/cn'

type ProcessCategoryFilter = 'all' | 'user_apps' | 'system' | 'network_active' | 'high_usage'
type InspectorTab = 'overview' | 'performance' | 'network' | 'hierarchy' | 'files' | 'security'

interface ProcessTreeNode {
  process: ProcessInfo
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  children: ProcessTreeNode[]
}

export const ProcessesPage: React.FC = () => {
  const { processes, connections, fsEvents, refresh } = useTelemetryStore()
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree')
  const [categoryFilter, setCategoryFilter] = useState<ProcessCategoryFilter>('all')
  const [sortBy, setSortBy] = useState<keyof ProcessInfo | 'total_io'>('cpu_usage')
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedPid, setSelectedPid] = useState<number | null>(null)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('overview')
  const [collapsedPids, setCollapsedPids] = useState<Set<number>>(new Set())

  // Process termination modal state
  const [showKillModal, setShowKillModal] = useState(false)
  const [isTerminating, setIsTerminating] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const parentRef = useRef<HTMLDivElement>(null)

  // Map processes with active sockets
  const procWithNetwork = useMemo(() => {
    const s = new Set<number>()
    connections.forEach((c) => {
      if (c.pid) s.add(c.pid)
    })
    return s
  }, [connections])

  // Active counts for filter pills
  const userAppCount = useMemo(() => processes.filter(isUserApp).length, [processes])
  const systemCount = useMemo(() => processes.filter(isSystemProcess).length, [processes])
  const networkCount = useMemo(
    () => processes.filter((p) => procWithNetwork.has(p.pid)).length,
    [processes, procWithNetwork]
  )
  const highUsageCount = useMemo(
    () => processes.filter((p) => p.cpu_usage > 1.0 || p.memory_bytes > 150 * 1024 * 1024).length,
    [processes]
  )

  const selectedProcess = useMemo(() => {
    return processes.find((p) => p.pid === selectedPid) || null
  }, [processes, selectedPid])

  // Connections attributed to selected process
  const processConnections = useMemo(() => {
    if (!selectedPid) return []
    return connections.filter((c) => c.pid === selectedPid)
  }, [connections, selectedPid])

  // Filesystem events matching selected process
  const processFsEvents = useMemo(() => {
    if (!selectedProcess) return []
    const nameLower = selectedProcess.name.toLowerCase()
    return fsEvents.filter(
      (ev) =>
        (selectedProcess.pid && ev.path.includes(selectedProcess.name)) ||
        ev.path.toLowerCase().includes(nameLower)
    )
  }, [fsEvents, selectedProcess])

  // Child processes of selected process
  const childProcesses = useMemo(() => {
    if (!selectedPid) return []
    return processes.filter((p) => p.ppid === selectedPid)
  }, [processes, selectedPid])

  // Direct parent process
  const parentProcess = useMemo(() => {
    if (!selectedProcess || !selectedProcess.ppid) return null
    return processes.find((p) => p.pid === selectedProcess.ppid) || null
  }, [processes, selectedProcess])

  // Filter processes according to search and category
  const filteredList = useMemo(() => {
    return processes.filter((p) => {
      if (categoryFilter === 'user_apps' && !isUserApp(p)) return false
      if (categoryFilter === 'system' && !isSystemProcess(p)) return false
      if (categoryFilter === 'network_active' && !procWithNetwork.has(p.pid)) return false
      if (categoryFilter === 'high_usage' && p.cpu_usage <= 1.0 && p.memory_bytes <= 150 * 1024 * 1024)
        return false

      if (search) {
        const q = search.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          p.pid.toString().includes(q) ||
          p.exe_path.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [processes, categoryFilter, procWithNetwork, search])

  // Build hierarchical tree
  const treeNodes = useMemo(() => {
    if (viewMode === 'flat') {
      const sorted = [...filteredList].sort((a, b) => {
        let valA: any = a[sortBy as keyof ProcessInfo]
        let valB: any = b[sortBy as keyof ProcessInfo]
        if (sortBy === 'total_io') {
          valA = a.disk_read_bytes + a.disk_written_bytes
          valB = b.disk_read_bytes + b.disk_written_bytes
        }
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }
        return sortAsc ? (valA ?? 0) - (valB ?? 0) : (valB ?? 0) - (valA ?? 0)
      })
      return sorted.map((p) => ({
        process: p,
        depth: 0,
        hasChildren: false,
        isExpanded: false,
        children: [],
      }))
    }

    // Build tree
    const pidMap = new Map<number, ProcessInfo>()
    processes.forEach((p) => pidMap.set(p.pid, p))

    const childrenMap = new Map<number, ProcessInfo[]>()
    processes.forEach((p) => {
      const ppid = p.ppid
      if (ppid && pidMap.has(ppid)) {
        if (!childrenMap.has(ppid)) childrenMap.set(ppid, [])
        childrenMap.get(ppid)!.push(p)
      }
    })

    // Roots are processes whose ppid is null, 0, or not in current list
    const roots: ProcessInfo[] = []
    filteredList.forEach((p) => {
      if (!p.ppid || !pidMap.has(p.ppid)) {
        roots.push(p)
      }
    })

    // Sort roots
    roots.sort((a, b) => {
      let valA: any = a[sortBy as keyof ProcessInfo]
      let valB: any = b[sortBy as keyof ProcessInfo]
      if (sortBy === 'total_io') {
        valA = a.disk_read_bytes + a.disk_written_bytes
        valB = b.disk_read_bytes + b.disk_written_bytes
      }
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortAsc ? (valA ?? 0) - (valB ?? 0) : (valB ?? 0) - (valA ?? 0)
    })

    // Flatten visible tree nodes
    const flattened: ProcessTreeNode[] = []

    const traverse = (p: ProcessInfo, depth: number) => {
      const kids = childrenMap.get(p.pid) || []
      const isExpanded = !collapsedPids.has(p.pid)
      flattened.push({
        process: p,
        depth,
        hasChildren: kids.length > 0,
        isExpanded,
        children: [],
      })
      if (isExpanded && kids.length > 0) {
        kids.forEach((k) => traverse(k, depth + 1))
      }
    }

    roots.forEach((r) => traverse(r, 0))
    return flattened
  }, [processes, filteredList, viewMode, sortBy, sortAsc, collapsedPids])

  const toggleCollapse = (pid: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsedPids((prev) => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }

  const handleSort = (key: keyof ProcessInfo | 'total_io') => {
    if (sortBy === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(key)
      setSortAsc(false)
    }
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleOpenFolder = async (exePath: string) => {
    try {
      await telemetryService.openProcessDirectory(exePath)
    } catch (err: any) {
      setActionError(`Failed to open folder: ${err?.message || err}`)
    }
  }

  const handleTerminate = async () => {
    if (!selectedProcess) return
    setIsTerminating(true)
    setActionError(null)
    try {
      await telemetryService.terminateProcess(selectedProcess.pid)
      setShowKillModal(false)
      setSelectedPid(null)
      await refresh()
    } catch (err: any) {
      setActionError(`Failed to terminate process ${selectedProcess.pid}: ${err?.message || err}`)
    } finally {
      setIsTerminating(false)
    }
  }

  const handleExportCsv = () => {
    const headers = ['PID', 'PPID', 'Name', 'CPU_Pct', 'Memory_Bytes', 'Disk_Read', 'Disk_Write', 'Status', 'ExePath']
    const rows = filteredList.map((p) => [
      p.pid,
      p.ppid ?? '',
      `"${p.name.replace(/"/g, '""')}"`,
      p.cpu_usage.toFixed(2),
      p.memory_bytes,
      p.disk_read_bytes,
      p.disk_written_bytes,
      p.status,
      `"${p.exe_path.replace(/"/g, '""')}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `apptrace-processes-${Date.now()}.csv`
    a.click()
  }

  const rowVirtualizer = useVirtualizer({
    count: treeNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 12,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] space-y-2">
      {/* Top Filter and Controls Bar */}
      <div className="bg-[#17191C] border border-[#30343A] p-2.5 rounded-lg flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Search Input */}
          <div className="relative max-w-sm w-full">
            <Search className="w-3.5 h-3.5 text-[#6E747D] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PID, process name, or path..."
              className="w-full bg-[#101113] border border-[#30343A] rounded-md pl-8 pr-3 py-1 text-xs text-[#E6E8EB] placeholder:text-[#6E747D] focus:outline-none focus:border-[#2878D0] font-mono transition-colors"
            />
          </div>

          {/* View Mode Toggle and Export */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md bg-[#101113] border border-[#30343A] p-0.5 text-xs font-mono">
              <button
                onClick={() => setViewMode('tree')}
                className={cn(
                  'px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5',
                  viewMode === 'tree' ? 'bg-[#2878D0] text-white font-semibold' : 'text-[#9A9FA8] hover:text-[#E6E8EB]'
                )}
              >
                <GitFork className="w-3.5 h-3.5" />
                Process Tree
              </button>
              <button
                onClick={() => setViewMode('flat')}
                className={cn(
                  'px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5',
                  viewMode === 'flat' ? 'bg-[#2878D0] text-white font-semibold' : 'text-[#9A9FA8] hover:text-[#E6E8EB]'
                )}
              >
                <List className="w-3.5 h-3.5" />
                Flat List
              </button>
            </div>

            <Button variant="secondary" size="sm" onClick={handleExportCsv} icon={<Download className="w-3 h-3" />}>
              Export CSV
            </Button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono pt-1 border-t border-[#30343A]/60">
          <span className="text-[10px] text-[#6E747D] uppercase tracking-wide mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-[#2878D0]" />
            Filter:
          </span>

          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-mono transition-colors',
              categoryFilter === 'all'
                ? 'bg-[#2878D0] text-white font-semibold'
                : 'bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB] border border-[#30343A]'
            )}
          >
            All ({processes.length})
          </button>

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
            Applications ({userAppCount})
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
            Network Sockets ({networkCount})
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
            High Load ({highUsageCount})
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
            System & Services ({systemCount})
          </button>
        </div>
      </div>

      {/* Main Process Table */}
      <div className={cn('bg-[#17191C] border border-[#30343A] rounded-lg overflow-hidden flex flex-col', selectedProcess ? 'flex-1 min-h-[300px]' : 'flex-1')}>
        <div ref={parentRef} className="overflow-x-auto overflow-y-auto flex-1 h-full scrollbar-thin scrollbar-thumb-[#30343A]">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-[#1D2024] text-[#9A9FA8] sticky top-0 border-b border-[#30343A] z-20 shadow-xs">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="py-1.5 px-3 uppercase text-[10px] tracking-wider font-semibold cursor-pointer hover:text-[#E6E8EB] transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    Process Name {sortBy === 'name' && (sortAsc ? '▲' : '▼')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pid')}
                  className="py-1.5 px-3 uppercase text-[10px] tracking-wider font-semibold cursor-pointer hover:text-[#E6E8EB] transition-colors select-none w-20"
                >
                  PID {sortBy === 'pid' && (sortAsc ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => handleSort('cpu_usage')}
                  className="py-1.5 px-3 uppercase text-[10px] tracking-wider font-semibold cursor-pointer hover:text-[#E6E8EB] transition-colors select-none w-24 text-right"
                >
                  CPU % {sortBy === 'cpu_usage' && (sortAsc ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => handleSort('memory_bytes')}
                  className="py-1.5 px-3 uppercase text-[10px] tracking-wider font-semibold cursor-pointer hover:text-[#E6E8EB] transition-colors select-none w-28 text-right"
                >
                  Private WS {sortBy === 'memory_bytes' && (sortAsc ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => handleSort('total_io')}
                  className="py-1.5 px-3 uppercase text-[10px] tracking-wider font-semibold cursor-pointer hover:text-[#E6E8EB] transition-colors select-none w-24 text-right"
                >
                  Disk I/O {sortBy === 'total_io' && (sortAsc ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-1.5 px-3 uppercase text-[10px] tracking-wider font-semibold cursor-pointer hover:text-[#E6E8EB] transition-colors select-none w-20 text-center"
                >
                  Status
                </th>
                <th className="py-1.5 px-3 uppercase text-[10px] tracking-wider font-semibold">
                  Executable Path
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30343A]/40 text-[#E6E8EB]">
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={7} />
                </tr>
              )}
              {virtualItems.map((virtualRow) => {
                const node = treeNodes[virtualRow.index]
                if (!node) return null
                const p = node.process
                const isSelected = selectedPid === p.pid
                const totalDiskIo = p.disk_read_bytes + p.disk_written_bytes
                const hasNet = procWithNetwork.has(p.pid)
                const isUser = isUserApp(p)

                // Sysinternals color coding
                const isHighCpu = p.cpu_usage > 15.0
                const isHighMem = p.memory_bytes > 500 * 1024 * 1024

                return (
                  <tr
                    key={p.pid}
                    onClick={() => setSelectedPid(p.pid)}
                    className={cn(
                      'cursor-pointer transition-colors text-xs font-mono h-8',
                      isSelected
                        ? 'bg-[#1C3D6E] text-white border-l-3 border-[#2878D0]'
                        : isHighCpu
                        ? 'bg-[#E4A83A]/10 hover:bg-[#E4A83A]/20'
                        : isHighMem
                        ? 'bg-[#2878D0]/10 hover:bg-[#2878D0]/20'
                        : isUser
                        ? 'hover:bg-[#1D2024]'
                        : 'text-[#9A9FA8] hover:bg-[#17191C]'
                    )}
                  >
                    {/* Process Name with hierarchy indent and expand/collapse */}
                    <td className="py-1 px-3 whitespace-nowrap">
                      <div className="flex items-center" style={{ paddingLeft: `${node.depth * 16}px` }}>
                        {viewMode === 'tree' && node.hasChildren ? (
                          <button
                            onClick={(e) => toggleCollapse(p.pid, e)}
                            className="w-4 h-4 mr-1 text-[#9A9FA8] hover:text-[#E6E8EB] flex items-center justify-center shrink-0"
                          >
                            {node.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        ) : viewMode === 'tree' ? (
                          <span className="w-4 h-4 mr-1 inline-block shrink-0 text-[#6E747D] text-center">
                            {node.depth > 0 ? '└' : ''}
                          </span>
                        ) : null}

                        <span className={cn('font-medium truncate max-w-[260px]', isSelected ? 'text-white' : isUser ? 'text-[#E6E8EB]' : 'text-[#9A9FA8]')}>
                          {p.name}
                        </span>

                        {hasNet && (
                          <span
                            className="ml-2 px-1 py-0.2 rounded text-[9px] bg-[#2878D0]/20 text-[#5aa1f2] border border-[#2878D0]/40 font-mono"
                            title="Active Network Sockets"
                          >
                            NET
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PID */}
                    <td className="py-1 px-3 text-[#9A9FA8] font-bold">{p.pid}</td>

                    {/* CPU % */}
                    <td
                      className={cn(
                        'py-1 px-3 text-right font-bold',
                        p.cpu_usage > 15 ? 'text-[#D94B4B]' : p.cpu_usage > 5 ? 'text-[#E4A83A]' : p.cpu_usage > 0.5 ? 'text-[#2878D0]' : 'text-[#6E747D]'
                      )}
                    >
                      {p.cpu_usage > 0 ? `${p.cpu_usage.toFixed(1)}%` : '-'}
                    </td>

                    {/* Memory Working Set */}
                    <td className={cn('py-1 px-3 text-right', isHighMem ? 'text-[#E4A83A] font-bold' : 'text-[#9A9FA8]')}>
                      {formatBytes(p.memory_bytes)}
                    </td>

                    {/* Disk I/O */}
                    <td className="py-1 px-3 text-right text-[#6E747D]">
                      {totalDiskIo > 0 ? formatBytes(totalDiskIo) : '-'}
                    </td>

                    {/* Status */}
                    <td className="py-1 px-3 text-center">
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#22262B] text-[#9A9FA8] border border-[#30343A]">
                        {p.status}
                      </span>
                    </td>

                    {/* Executable Path */}
                    <td className="py-1 px-3 text-[#6E747D] truncate max-w-[320px]" title={p.exe_path}>
                      {p.exe_path || '-'}
                    </td>
                  </tr>
                )
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={7} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Docked Process Details & Investigation Inspector */}
      {selectedProcess && (
        <div className="bg-[#17191C] border border-[#30343A] rounded-lg p-3 shrink-0 flex flex-col gap-2.5 max-h-[38vh] overflow-hidden">
          {/* Header Row: Title, Action Buttons, Close */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30343A] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2878D0]" />
              <h3 className="font-semibold text-xs text-[#E6E8EB] font-sans">
                {selectedProcess.name} (PID: {selectedProcess.pid})
              </h3>
              <span className="text-[10px] text-[#9A9FA8] font-mono border-l border-[#30343A] pl-2">
                PPID: {selectedProcess.ppid ?? 'None'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleOpenFolder(selectedProcess.exe_path)}
                disabled={!selectedProcess.exe_path}
                icon={<FolderOpen className="w-3 h-3 text-[#2878D0]" />}
              >
                Open Location
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopy(selectedProcess.pid.toString(), 'pid')}
                icon={copiedField === 'pid' ? <Check className="w-3 h-3 text-[#35B879]" /> : <Copy className="w-3 h-3 text-[#9A9FA8]" />}
              >
                Copy PID
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopy(selectedProcess.exe_path, 'path')}
                disabled={!selectedProcess.exe_path}
                icon={copiedField === 'path' ? <Check className="w-3 h-3 text-[#35B879]" /> : <Copy className="w-3 h-3 text-[#9A9FA8]" />}
              >
                Copy Path
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowKillModal(true)}
                disabled={selectedProcess.pid <= 4}
                icon={<XCircle className="w-3 h-3" />}
              >
                End Process
              </Button>

              <button
                onClick={() => setSelectedPid(null)}
                className="text-[#6E747D] hover:text-[#E6E8EB] p-1 ml-1"
                title="Close Inspector"
              >
                ✕
              </button>
            </div>
          </div>

          {actionError && (
            <div className="p-2 rounded bg-[#D94B4B]/15 text-[#D94B4B] border border-[#D94B4B]/30 text-xs font-mono">
              {actionError}
            </div>
          )}

          {/* Inspector Tabs */}
          <div className="flex items-center gap-1 border-b border-[#30343A] text-xs font-mono">
            {(
              [
                { id: 'overview', label: 'Overview', icon: FileText },
                { id: 'performance', label: 'Performance', icon: Activity },
                { id: 'network', label: `Network (${processConnections.length})`, icon: NetworkIcon },
                { id: 'hierarchy', label: `Hierarchy (${childProcesses.length})`, icon: GitFork },
                { id: 'files', label: `Files (${processFsEvents.length})`, icon: FolderOpen },
                { id: 'security', label: 'Security', icon: Shield },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon
              const isActive = inspectorTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setInspectorTab(tab.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-t text-[11px] font-medium flex items-center gap-1.5 transition-colors border-b-2',
                    isActive
                      ? 'border-[#2878D0] bg-[#1D2024] text-[#E6E8EB] font-semibold'
                      : 'border-transparent text-[#9A9FA8] hover:text-[#E6E8EB] hover:bg-[#1D2024]/50'
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="overflow-y-auto pr-1 flex-1 text-xs font-mono space-y-2">
            {inspectorTab === 'overview' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[#101113] p-2.5 rounded border border-[#30343A]">
                  <div>
                    <span className="text-[10px] text-[#6E747D] block uppercase">CPU Utilization</span>
                    <span className="text-[#2878D0] font-bold text-sm">{selectedProcess.cpu_usage.toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6E747D] block uppercase">Physical Memory</span>
                    <span className="text-[#E6E8EB] font-bold text-sm">{formatBytes(selectedProcess.memory_bytes)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6E747D] block uppercase">Virtual Memory</span>
                    <span className="text-[#9A9FA8] font-bold text-sm">{formatBytes(selectedProcess.virtual_memory_bytes)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6E747D] block uppercase">Process Status</span>
                    <span className="text-[#35B879] font-bold text-sm">{selectedProcess.status}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-[#6E747D] uppercase font-semibold">Executable Path:</span>
                  <div className="p-1.5 bg-[#101113] rounded border border-[#30343A] text-[#E6E8EB] break-all select-text">
                    {selectedProcess.exe_path || 'Unavailable / System Process'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-[#6E747D] uppercase font-semibold">Command Line Arguments:</span>
                  <div className="p-1.5 bg-[#101113] rounded border border-[#30343A] text-[#9A9FA8] break-all select-text">
                    {selectedProcess.cmd.length > 0 ? selectedProcess.cmd.join(' ') : 'No CLI parameters recorded'}
                  </div>
                </div>
              </div>
            )}

            {inspectorTab === 'performance' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[#101113] p-3 rounded border border-[#30343A]">
                <div>
                  <span className="text-[10px] text-[#6E747D] block uppercase">Disk Read</span>
                  <span className="text-[#E6E8EB] font-bold text-sm">{formatBytes(selectedProcess.disk_read_bytes)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6E747D] block uppercase">Disk Written</span>
                  <span className="text-[#E6E8EB] font-bold text-sm">{formatBytes(selectedProcess.disk_written_bytes)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6E747D] block uppercase">Total Disk I/O</span>
                  <span className="text-[#35B879] font-bold text-sm">
                    {formatBytes(selectedProcess.disk_read_bytes + selectedProcess.disk_written_bytes)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6E747D] block uppercase">Memory Footprint</span>
                  <span className="text-[#2878D0] font-bold text-sm">{formatBytes(selectedProcess.memory_bytes)}</span>
                </div>
              </div>
            )}

            {inspectorTab === 'network' && (
              <div className="space-y-1">
                {processConnections.length > 0 ? (
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="text-[#6E747D] border-b border-[#30343A]">
                      <tr>
                        <th className="py-1">Protocol</th>
                        <th className="py-1">Local Address</th>
                        <th className="py-1">Remote Endpoint</th>
                        <th className="py-1">State</th>
                        <th className="py-1">Geo Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30343A]/30">
                      {processConnections.map((conn, idx) => {
                        const geo = getCachedIpGeo(conn.remote_addr)
                        return (
                          <tr key={`${conn.protocol}-${conn.local_addr}:${conn.local_port}-${conn.remote_addr}:${conn.remote_port}-${idx}`} className="py-1">
                            <td className="py-1 text-[#2878D0] font-bold">{conn.protocol}</td>
                            <td className="py-1 text-[#9A9FA8]">{conn.local_addr}:{conn.local_port}</td>
                            <td className="py-1 text-[#E6E8EB] font-semibold">{conn.remote_addr}:{conn.remote_port}</td>
                            <td className="py-1 text-[#6E747D]">{conn.state || '-'}</td>
                            <td className="py-1 text-[#9A9FA8]">
                              {geo ? `${geo.flag} ${geo.country}${geo.city ? `, ${geo.city}` : ''}` : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-3 text-center text-[#6E747D] font-mono text-xs">
                    No active network sockets open for PID {selectedProcess.pid}.
                  </div>
                )}
              </div>
            )}

            {inspectorTab === 'hierarchy' && (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-[#6E747D] block uppercase font-semibold mb-1">Parent Process:</span>
                  {parentProcess ? (
                    <div
                      onClick={() => setSelectedPid(parentProcess.pid)}
                      className="p-2 bg-[#101113] rounded border border-[#30343A] hover:border-[#2878D0] cursor-pointer flex justify-between items-center"
                    >
                      <span className="text-[#E6E8EB] font-bold">{parentProcess.name} (PID {parentProcess.pid})</span>
                      <span className="text-[#2878D0] text-[11px]">Click to inspect →</span>
                    </div>
                  ) : (
                    <div className="p-2 bg-[#101113] rounded border border-[#30343A] text-[#6E747D]">
                      None or System root process
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-[#6E747D] block uppercase font-semibold mb-1">
                    Spawned Child Processes ({childProcesses.length}):
                  </span>
                  {childProcesses.length > 0 ? (
                    <div className="space-y-1">
                      {childProcesses.map((child) => (
                        <div
                          key={child.pid}
                          onClick={() => setSelectedPid(child.pid)}
                          className="p-1.5 bg-[#101113] rounded border border-[#30343A] hover:border-[#2878D0] cursor-pointer flex justify-between items-center"
                        >
                          <span className="text-[#E6E8EB]">{child.name} (PID {child.pid})</span>
                          <span className="text-[#9A9FA8]">{formatBytes(child.memory_bytes)} • {child.cpu_usage.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2 bg-[#101113] rounded border border-[#30343A] text-[#6E747D]">
                      No active child processes.
                    </div>
                  )}
                </div>
              </div>
            )}

            {inspectorTab === 'files' && (
              <div className="space-y-1">
                {processFsEvents.length > 0 ? (
                  <div className="space-y-1">
                    {processFsEvents.slice(0, 20).map((ev) => (
                      <div key={ev.id} className="p-1.5 bg-[#101113] rounded border border-[#30343A] flex justify-between items-center text-xs">
                        <span className="text-[#E6E8EB] truncate max-w-[400px]">{ev.path}</span>
                        <span className="text-[#2878D0] font-bold uppercase text-[10px]">{ev.action}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-[#6E747D] font-mono text-xs">
                    No filesystem events attributed to this process in the telemetry buffer.
                  </div>
                )}
              </div>
            )}

            {inspectorTab === 'security' && (
              <div className="space-y-2 bg-[#101113] p-3 rounded border border-[#30343A]">
                <div className="flex justify-between items-center py-1 border-b border-[#30343A]/40">
                  <span className="text-[#6E747D]">Process Architecture:</span>
                  <span className="text-[#E6E8EB]">64-bit AMD64</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#30343A]/40">
                  <span className="text-[#6E747D]">Telemetry Classification:</span>
                  <span className={isUserApp(selectedProcess) ? 'text-[#35B879]' : 'text-[#6E747D]'}>
                    {isUserApp(selectedProcess) ? 'User Application' : 'Core Operating System'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#6E747D]">Redaction Status:</span>
                  <span className="text-[#35B879]">Tokens and passwords sanitized in memory</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal to Terminate Process */}
      <Modal
        isOpen={showKillModal}
        onClose={() => setShowKillModal(false)}
        title={selectedProcess ? `Terminate Process: ${selectedProcess.name}` : ''}
      >
        {selectedProcess && (
          <div className="space-y-3 font-mono text-xs text-[#E6E8EB]">
            <p className="text-[#9A9FA8]">
              Are you sure you want to terminate <strong className="text-[#E6E8EB]">{selectedProcess.name}</strong> (PID {selectedProcess.pid})?
            </p>
            <div className="p-2.5 rounded bg-[#D94B4B]/15 border border-[#D94B4B]/30 text-[#D94B4B] text-[11px]">
              Warning: Terminating a process forcefully may result in unsaved state loss. Protected core system processes cannot be terminated.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowKillModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleTerminate}
                disabled={isTerminating}
              >
                {isTerminating ? 'Terminating...' : 'Force Kill Process'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
