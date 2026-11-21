import React, { useState, useEffect, useMemo } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { DiskUsageItem, CleanableItem } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  PieChart,
  HardDrive,
  Folder,
  File,
  RefreshCw,
  ArrowUp,
  FolderOpen,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { formatBytes } from '../../utils/formatters'
import { cn } from '../../utils/cn'

export const DiskAnalyzerPage: React.FC = () => {
  const [targetPath, setTargetPath] = useState('C:\\')
  const [pathInput, setPathInput] = useState('C:\\')
  const [rootItem, setRootItem] = useState<DiskUsageItem | null>(null)
  const [largestFiles, setLargestFiles] = useState<CleanableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const analyze = async (path: string) => {
    try {
      setLoading(true)
      setError(null)
      const [usage, largest] = await Promise.all([
        ManagementService.analyzeDiskSpace(path, 2),
        ManagementService.getLargestFiles(path, 50),
      ])
      setRootItem(usage)
      setLargestFiles(largest)
      setTargetPath(usage.path)
      setPathInput(usage.path)
    } catch (err: any) {
      setError(err?.toString() || `Failed to analyze path: ${path}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    analyze(targetPath)
  }, [])

  const handleNavigateUp = () => {
    const idx = targetPath.lastIndexOf('\\')
    if (idx !== -1 && idx > 2) {
      const parent = targetPath.substring(0, idx)
      analyze(parent)
    } else if (targetPath.length > 3) {
      analyze('C:\\')
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              Disk Space & Directory Size Analyzer
            </h1>
            <p className="text-xs text-[#6E747D]">
              Visualize physical storage allocation, navigate directory trees, and locate multi-gigabyte files.
            </p>
          </div>
        </div>

        {rootItem && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
              <span className="text-[#6E747D]">Scanned Footprint:</span>
              <span className="text-[#E6E8EB] font-semibold">{formatBytes(rootItem.size_bytes)}</span>
            </div>
            <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
              <span className="text-[#6E747D]">Items Counted:</span>
              <span className="text-[#2878D0] font-semibold">{rootItem.item_count.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Path bar */}
      <div className="flex items-center gap-2 bg-[#17191C] border border-[#30343A] p-2 rounded-lg">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleNavigateUp}
          className="h-8 px-2 text-[#9A9FA8] hover:text-[#E6E8EB]"
          title="Parent folder"
        >
          <ArrowUp className="w-4 h-4" />
        </Button>
        <input
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && analyze(pathInput)}
          className="flex-1 bg-[#101113] border border-[#30343A] rounded px-3 py-1.5 text-xs font-mono text-[#E6E8EB] focus:outline-none focus:border-[#2878D0]"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => analyze(pathInput)}
          disabled={loading}
          className="h-8 px-3 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B]"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
          Analyze
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-[#D94B4B]/15 border border-[#D94B4B]/40 rounded text-xs text-[#D94B4B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left Directory Breakdown, Right Largest Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Directory breakdown */}
        <Card className="bg-[#17191C] border-[#30343A] p-0 overflow-hidden flex flex-col h-[600px]">
          <div className="p-3 border-b border-[#30343A] bg-[#121316] flex items-center justify-between text-xs font-semibold text-[#9A9FA8]">
            <span>SUBDIRECTORY BREAKDOWN</span>
            <span className="font-mono text-[11px] text-[#6E747D] truncate max-w-xs">{targetPath}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="py-12 text-center text-[#6E747D] flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#2878D0]" />
                <span>Scanning directory structures...</span>
              </div>
            ) : !rootItem || rootItem.children.length === 0 ? (
              <div className="py-10 text-center text-[#6E747D]">No child directories detected.</div>
            ) : (
              rootItem.children.map((child) => {
                const pct = rootItem.size_bytes > 0
                  ? (child.size_bytes / rootItem.size_bytes) * 100
                  : 0

                return (
                  <div
                    key={child.path}
                    onClick={() => child.is_dir && analyze(child.path)}
                    className={cn(
                      'p-2.5 rounded bg-[#101113] border border-[#22262B] space-y-1.5 transition-colors',
                      child.is_dir ? 'hover:border-[#2878D0]/50 cursor-pointer' : ''
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        {child.is_dir ? (
                          <Folder className="w-4 h-4 text-[#2878D0] shrink-0" />
                        ) : (
                          <File className="w-4 h-4 text-[#9A9FA8] shrink-0" />
                        )}
                        <span className="font-medium text-[#E6E8EB] truncate">{child.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                        <span className="text-[#E6E8EB] font-bold">{formatBytes(child.size_bytes)}</span>
                        <span className="text-[#6E747D] text-[11px]">({pct.toFixed(1)}%)</span>
                        {child.is_dir && <ChevronRight className="w-3.5 h-3.5 text-[#6E747D]" />}
                      </div>
                    </div>

                    {/* Usage progress bar */}
                    <div className="w-full bg-[#1D2024] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#2878D0] h-full rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Right Column: Top 50 Largest Files */}
        <Card className="bg-[#17191C] border-[#30343A] p-0 overflow-hidden flex flex-col h-[600px]">
          <div className="p-3 border-b border-[#30343A] bg-[#121316] flex items-center justify-between text-xs font-semibold text-[#9A9FA8]">
            <span>TOP LARGEST FILES ({largestFiles.length})</span>
            <span className="text-[11px] font-mono text-[#6E747D]">&gt; 10 MB</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#30343A] bg-[#101113] text-[#9A9FA8] font-mono uppercase text-[11px]">
                  <th className="py-2 px-3 font-medium">File Name & Path</th>
                  <th className="py-2 px-3 font-medium text-right">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22262B] font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-[#6E747D]">
                      Locating largest files...
                    </td>
                  </tr>
                ) : largestFiles.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-10 text-center text-[#6E747D]">
                      No large files (&gt;10MB) detected in this branch.
                    </td>
                  </tr>
                ) : (
                  largestFiles.map((file, i) => (
                    <tr key={i} className="hover:bg-[#1D2024]/70 transition-colors">
                      <td className="py-2 px-3 max-w-sm truncate" title={file.path}>
                        <span className="font-sans font-medium text-[#E6E8EB] block truncate">
                          {file.description}
                        </span>
                        <span className="text-[11px] text-[#6E747D] block truncate">
                          {file.path}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#E6E8EB] shrink-0">
                        {formatBytes(file.size_bytes)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
