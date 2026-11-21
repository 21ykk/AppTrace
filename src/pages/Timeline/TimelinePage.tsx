import React, { useState, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { telemetryService } from '../../services/telemetry/telemetryService'
import { formatDateTime } from '../../utils/formatters'
import { Card } from '../../components/ui/Card'
import { Search, Download, Clock, Check } from 'lucide-react'

export const TimelinePage: React.FC = () => {
  const { timelineEvents } = useTelemetryStore()
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState(false)
  const parentRef = useRef<HTMLDivElement>(null)

  const filtered = timelineEvents.filter((ev) => {
    if (categoryFilter !== 'ALL' && ev.category.toUpperCase() !== categoryFilter) return false
    if (search) {
      return (
        ev.summary.toLowerCase().includes(search.toLowerCase()) ||
        (ev.process_name && ev.process_name.toLowerCase().includes(search.toLowerCase())) ||
        (ev.pid && ev.pid.toString().includes(search))
      )
    }
    return true
  })

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 37,
    overscan: 10,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0

  const handleExportCsv = async () => {
    try {
      setIsExporting(true)
      const cat = categoryFilter === 'ALL' ? undefined : categoryFilter.toLowerCase()
      const csv = await telemetryService.exportCsv(cat, 5000)
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `apptrace_evidence_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportNotice(true)
      setTimeout(() => setExportNotice(false), 3000)
    } catch (err) {
      console.error('Failed to export CSV:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Timeline Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#17191C] p-3 rounded-lg border border-[#30343A]">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-[#6E747D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event summaries, PIDs, processes..."
            className="w-full bg-[#101113] border border-[#30343A] rounded px-3 pl-9 py-1.5 text-xs text-[#E6E8EB] placeholder:text-[#6E747D] focus:outline-none focus:border-[#2878D0] font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {(['ALL', 'PROCESS', 'FILESYSTEM', 'NETWORK', 'SYSTEM'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 rounded uppercase font-bold transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#2878D0] text-white'
                    : 'bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#22262B] hover:bg-[#2c3239] text-[#E6E8EB] border border-[#30343A] rounded text-xs font-mono font-bold transition-colors disabled:opacity-50"
          >
            {exportNotice ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#35B879]" />
                <span className="text-[#35B879]">Exported</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-[#2878D0]" />
                <span>Export CSV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chronological Stream */}
      <Card className="p-0 overflow-hidden border-slate-800">
        <div ref={parentRef} className="overflow-x-auto max-h-[75vh] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Process / Origin</th>
                <th className="py-2.5 px-3">Event Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={5} />
                </tr>
              )}
              {virtualItems.map((virtualRow) => {
                const ev = filtered[virtualRow.index]
                if (!ev) return null
                return (
                  <tr key={ev.event_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                      {formatDateTime(ev.timestamp_ns)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#22262B] text-[#5aa1f2] border border-[#30343A]">
                        {ev.category}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ev.severity === 'error'
                            ? 'bg-rose-950 text-rose-400'
                            : ev.severity === 'warning'
                            ? 'bg-amber-950 text-amber-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {ev.severity}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300 font-sans font-medium whitespace-nowrap">
                      {ev.process_name || (ev.pid ? `PID ${ev.pid}` : 'System Kernel')}
                    </td>
                    <td className="py-2 px-3 text-slate-200 font-sans break-all">
                      {ev.summary}
                    </td>
                  </tr>
                )
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={5} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
