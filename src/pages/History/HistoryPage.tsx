import React, { useState, useEffect } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { OperationHistoryEntry } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  History,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
} from 'lucide-react'
import { cn } from '../../utils/cn'

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<OperationHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ManagementService.getOperationHistory(100)
      setHistory(data)
    } catch (err: any) {
      setError(err?.toString() || 'Failed to load operation history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const formatTimestamp = (ns: number) => {
    const ms = ns / 1_000_000
    const d = new Date(ms)
    return isNaN(d.getTime()) ? '—' : d.toLocaleString()
  }

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              System Operations Audit Log
              <span className="text-[11px] font-mono px-2 py-0.5 bg-[#22262B] text-[#9A9FA8] rounded border border-[#30343A]">
                {history.length} Logged Actions
              </span>
            </h1>
            <p className="text-xs text-[#6E747D]">
              Persistent SQLite audit record of all uninstallation operations, file cleanups, service modifications, and registry edits.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadHistory}
          disabled={loading}
          className="flex items-center gap-1.5 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B] font-mono text-xs"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh Audit Log
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-[#D94B4B]/15 border border-[#D94B4B]/40 rounded text-xs text-[#D94B4B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* History Table */}
      <Card className="bg-[#17191C] border-[#30343A] p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#30343A] bg-[#101113] text-[#9A9FA8] font-mono uppercase text-[11px]">
                <th className="py-2.5 px-4 font-medium">Timestamp</th>
                <th className="py-2.5 px-4 font-medium">Action Type</th>
                <th className="py-2.5 px-4 font-medium">Target Resource</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Operation Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22262B] font-mono">
              {loading && history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#6E747D]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#2878D0]" />
                      <span>Reading persistent operation history...</span>
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#6E747D]">
                    No operations have been recorded yet. Perform an uninstallation or cleaning action to populate the audit log.
                  </td>
                </tr>
              ) : (
                history.map((entry) => (
                  <tr key={entry.operation_id} className="hover:bg-[#1D2024]/70 transition-colors">
                    <td className="py-2.5 px-4 text-[#9A9FA8] shrink-0 whitespace-nowrap">
                      {formatTimestamp(entry.timestamp_ns)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-semibold border uppercase',
                        entry.action_type === 'Uninstall' && 'bg-rose-950 text-rose-400 border-rose-800',
                        entry.action_type === 'Clean' && 'bg-emerald-950 text-emerald-400 border-emerald-800',
                        entry.action_type === 'Startup_Toggle' && 'bg-amber-950 text-amber-400 border-amber-800',
                        entry.action_type === 'Service_Control' && 'bg-blue-950 text-blue-400 border-blue-800',
                        entry.action_type === 'Registry_Edit' && 'bg-purple-950 text-purple-400 border-purple-800',
                        entry.action_type === 'Duplicate_Delete' && 'bg-rose-950 text-rose-400 border-rose-800'
                      )}>
                        {entry.action_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[#E6E8EB] max-w-[200px] truncate" title={entry.target_name}>
                      <span className="font-semibold block truncate">{entry.target_name}</span>
                      {entry.target_path && (
                        <span className="text-[10px] text-[#6E747D] block truncate">{entry.target_path}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {entry.status === 'Success' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#35B879]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Success
                        </span>
                      )}
                      {entry.status === 'Partial' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#E4A83A]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Partial
                        </span>
                      )}
                      {entry.status === 'Failed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#D94B4B]">
                          <XCircle className="w-3.5 h-3.5" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[#9A9FA8] max-w-md truncate" title={entry.details_json}>
                      {entry.details_json}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
