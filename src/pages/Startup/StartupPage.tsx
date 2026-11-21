import React, { useState, useEffect, useMemo } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { StartupEntry } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  Rocket,
  Search,
  RefreshCw,
  Power,
  PowerOff,
  AlertTriangle,
  FolderOpen,
  Info,
  CheckCircle2,
  Shield,
} from 'lucide-react'
import { cn } from '../../utils/cn'

export const StartupPage: React.FC = () => {
  const [entries, setEntries] = useState<StartupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadEntries = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ManagementService.getStartupEntries()
      setEntries(data)
    } catch (err: any) {
      setError(err?.toString() || 'Failed to enumerate startup items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  const handleToggle = async (entry: StartupEntry) => {
    setTogglingId(entry.id)
    try {
      await ManagementService.setStartupEntryEnabled(entry.id, !entry.enabled)
      await ManagementService.recordOperation(
        'Startup_Toggle',
        entry.name,
        entry.command,
        'Success',
        JSON.stringify({ enabled: !entry.enabled, location: entry.location })
      )
      // Optimistic update
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, enabled: !entry.enabled } : e))
      )
    } catch (err: any) {
      setError(`Failed to toggle startup entry: ${err}`)
    } finally {
      setTogglingId(null)
    }
  }

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const q = search.toLowerCase()
      return (
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.command.toLowerCase().includes(q) ||
        (e.publisher && e.publisher.toLowerCase().includes(q))
      )
    })
  }, [entries, search])

  const highImpactCount = useMemo(() => {
    return entries.filter((e) => e.enabled && e.impact === 'High').length
  }, [entries])

  const enabledCount = useMemo(() => {
    return entries.filter((e) => e.enabled).length
  }, [entries])

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              Startup Applications Manager
              <span className="text-[11px] font-mono px-2 py-0.5 bg-[#22262B] text-[#9A9FA8] rounded border border-[#30343A]">
                {entries.length} Entries
              </span>
            </h1>
            <p className="text-xs text-[#6E747D]">
              Manage programs and services configured to launch automatically when Windows boots or user logs in.
            </p>
          </div>
        </div>

        {/* Impact stats */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
            <span className="text-[#6E747D]">Enabled at Boot:</span>
            <span className="text-[#E6E8EB] font-semibold">{enabledCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
            <span className="text-[#6E747D]">High Impact:</span>
            <span className={cn('font-semibold', highImpactCount > 0 ? 'text-[#E4A83A]' : 'text-[#35B879]')}>
              {highImpactCount}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadEntries}
            disabled={loading}
            className="flex items-center gap-1.5 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B]"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="flex items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-3 rounded-lg">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6E747D]" />
          <input
            type="text"
            placeholder="Search startup name, command line, publisher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#101113] border border-[#30343A] rounded pl-9 pr-3 py-1.5 text-xs text-[#E6E8EB] focus:outline-none focus:border-[#2878D0]"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#D94B4B]/15 border border-[#D94B4B]/40 rounded text-xs text-[#D94B4B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <Card className="bg-[#17191C] border-[#30343A] overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#30343A] bg-[#121316] text-[#9A9FA8] font-mono uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 font-medium">Application Name</th>
                <th className="py-2.5 px-4 font-medium">Publisher</th>
                <th className="py-2.5 px-4 font-medium">Location</th>
                <th className="py-2.5 px-4 font-medium">Command Line</th>
                <th className="py-2.5 px-4 font-medium">Startup Impact</th>
                <th className="py-2.5 px-4 font-medium text-center">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22262B] font-mono">
              {loading && entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6E747D]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#2878D0]" />
                      <span>Reading registry Run keys and startup directories...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#6E747D]">
                    No startup entries found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1D2024]/70 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-medium text-[#E6E8EB] max-w-[200px] truncate">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-4 text-[#9A9FA8] max-w-[150px] truncate">
                      {item.publisher || '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#22262B] text-[#9A9FA8] border border-[#30343A]">
                        {item.location}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[#6E747D] max-w-xs truncate" title={item.command}>
                      {item.command}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-semibold border',
                          item.impact === 'High' && 'bg-[#D94B4B]/15 text-[#D94B4B] border-[#D94B4B]/30',
                          item.impact === 'Medium' && 'bg-[#E4A83A]/15 text-[#E4A83A] border-[#E4A83A]/30',
                          item.impact === 'Low' && 'bg-[#35B879]/15 text-[#35B879] border-[#35B879]/30',
                          item.impact === 'Unknown' && 'bg-[#22262B] text-[#9A9FA8] border-[#30343A]'
                        )}
                      >
                        {item.impact}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {item.enabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#35B879]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Enabled
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#6E747D]">Disabled</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant={item.enabled ? 'outline' : 'default'}
                        onClick={() => handleToggle(item)}
                        disabled={togglingId === item.id}
                        className={cn(
                          'h-7 px-2.5 text-xs',
                          item.enabled
                            ? 'text-[#D94B4B] hover:text-[#D94B4B] border-[#D94B4B]/30 hover:bg-[#D94B4B]/10'
                            : 'bg-[#2878D0] hover:bg-[#2878D0]/80 text-white'
                        )}
                      >
                        {togglingId === item.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                        ) : item.enabled ? (
                          <PowerOff className="w-3 h-3 mr-1" />
                        ) : (
                          <Power className="w-3 h-3 mr-1" />
                        )}
                        {item.enabled ? 'Disable' : 'Enable'}
                      </Button>
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
