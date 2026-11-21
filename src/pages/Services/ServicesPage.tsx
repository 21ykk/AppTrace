import React, { useState, useEffect, useMemo } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { ServiceInfo } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  Server,
  Search,
  RefreshCw,
  Play,
  Square,
  AlertTriangle,
  Lock,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '../../utils/cn'

type ServiceFilter = 'all' | 'running' | 'stopped' | 'automatic'

export const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<ServiceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ServiceFilter>('all')
  const [operatingName, setOperatingName] = useState<string | null>(null)

  const loadServices = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ManagementService.getSystemServices()
      setServices(data)
    } catch (err: any) {
      setError(err?.toString() || 'Failed to enumerate services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [])

  const handleToggleService = async (service: ServiceInfo) => {
    if (!service.can_control) return
    setOperatingName(service.name)
    setError(null)

    const isRunning = service.status === 'Running'
    try {
      if (isRunning) {
        await ManagementService.stopSystemService(service.name)
      } else {
        await ManagementService.startSystemService(service.name)
      }

      await ManagementService.recordOperation(
        'Service_Control',
        service.display_name,
        service.bin_path || null,
        'Success',
        JSON.stringify({ action: isRunning ? 'Stop' : 'Start', name: service.name })
      )

      // Update state
      setServices((prev) =>
        prev.map((s) =>
          s.name === service.name
            ? { ...s, status: isRunning ? 'Stopped' : 'Running' }
            : s
        )
      )
    } catch (err: any) {
      setError(`Failed to ${isRunning ? 'stop' : 'start'} service: ${err}`)
    } finally {
      setOperatingName(null)
    }
  }

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.display_name.toLowerCase().includes(q) ||
        (s.bin_path && s.bin_path.toLowerCase().includes(q))

      if (!matchSearch) return false

      if (filter === 'running') return s.status === 'Running'
      if (filter === 'stopped') return s.status !== 'Running'
      if (filter === 'automatic') return s.startup_type === 'Automatic'
      return true
    })
  }, [services, search, filter])

  const runningCount = useMemo(() => {
    return services.filter((s) => s.status === 'Running').length
  }, [services])

  const autoStoppedCount = useMemo(() => {
    return services.filter((s) => s.startup_type === 'Automatic' && s.status !== 'Running').length
  }, [services])

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              System Services Manager
              <span className="text-[11px] font-mono px-2 py-0.5 bg-[#22262B] text-[#9A9FA8] rounded border border-[#30343A]">
                {services.length} Services
              </span>
            </h1>
            <p className="text-xs text-[#6E747D]">
              Inspect, start, and stop Windows Services and background daemons with safety protection for OS subsystems.
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
            <span className="text-[#6E747D]">Running:</span>
            <span className="text-[#35B879] font-semibold">{runningCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
            <span className="text-[#6E747D]">Stopped Auto:</span>
            <span className={cn('font-semibold', autoStoppedCount > 0 ? 'text-[#E4A83A]' : 'text-[#6E747D]')}>
              {autoStoppedCount}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadServices}
            disabled={loading}
            className="flex items-center gap-1.5 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B]"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-3 rounded-lg">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6E747D]" />
          <input
            type="text"
            placeholder="Search service name, display title, executable..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#101113] border border-[#30343A] rounded pl-9 pr-3 py-1.5 text-xs text-[#E6E8EB] focus:outline-none focus:border-[#2878D0]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'running', 'stopped', 'automatic'] as ServiceFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors border capitalize',
                filter === f
                  ? 'bg-[#2878D0] text-white border-[#2878D0]'
                  : 'bg-[#1D2024] text-[#9A9FA8] border-[#30343A] hover:bg-[#22262B]'
              )}
            >
              {f === 'all'
                ? 'All Services'
                : f === 'running'
                ? `Running (${runningCount})`
                : f === 'stopped'
                ? 'Stopped'
                : 'Automatic'}
            </button>
          ))}
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
                <th className="py-2.5 px-4 font-medium">Display Name</th>
                <th className="py-2.5 px-4 font-medium">Service Name</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Startup Type</th>
                <th className="py-2.5 px-4 font-medium">Account / Context</th>
                <th className="py-2.5 px-4 font-medium">Executable Path</th>
                <th className="py-2.5 px-4 font-medium text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22262B] font-mono">
              {loading && services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6E747D]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#2878D0]" />
                      <span>Querying Service Control Manager...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#6E747D]">
                    No matching services found.
                  </td>
                </tr>
              ) : (
                filteredServices.map((svc) => (
                  <tr key={svc.name} className="hover:bg-[#1D2024]/70 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-medium text-[#E6E8EB] max-w-[220px] truncate" title={svc.display_name}>
                      {svc.display_name}
                    </td>
                    <td className="py-2.5 px-4 text-[#9A9FA8] max-w-[140px] truncate">
                      {svc.name}
                    </td>
                    <td className="py-2.5 px-4">
                      {svc.status === 'Running' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#35B879]/15 text-[#35B879] border border-[#35B879]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#35B879] animate-pulse" />
                          Running
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#6E747D]">Stopped</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#22262B] text-[#9A9FA8] border border-[#30343A]">
                        {svc.startup_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[#6E747D] max-w-[140px] truncate">
                      {svc.account || 'LocalSystem'}
                    </td>
                    <td className="py-2.5 px-4 text-[#6E747D] max-w-xs truncate" title={svc.bin_path}>
                      {svc.bin_path || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {!svc.can_control ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#6E747D]" title="Core system service locked for OS stability">
                          <Lock className="w-3.5 h-3.5" />
                          Protected
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant={svc.status === 'Running' ? 'outline' : 'default'}
                          onClick={() => handleToggleService(svc)}
                          disabled={operatingName === svc.name}
                          className={cn(
                            'h-7 px-2.5 text-xs',
                            svc.status === 'Running'
                              ? 'text-[#D94B4B] hover:text-[#D94B4B] border-[#D94B4B]/30 hover:bg-[#D94B4B]/10'
                              : 'bg-[#35B879] hover:bg-[#35B879]/80 text-white'
                          )}
                        >
                          {operatingName === svc.name ? (
                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                          ) : svc.status === 'Running' ? (
                            <Square className="w-3 h-3 mr-1" />
                          ) : (
                            <Play className="w-3 h-3 mr-1" />
                          )}
                          {svc.status === 'Running' ? 'Stop' : 'Start'}
                        </Button>
                      )}
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
