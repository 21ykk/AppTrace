import React, { useState } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { HunterResult } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  Crosshair,
  Search,
  RefreshCw,
  Package,
  Cpu,
  Folder,
  Key,
  Server,
  Rocket,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../../utils/cn'

export const HunterPage: React.FC = () => {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<HunterResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleHunt = async (searchTarget?: string) => {
    const q = (searchTarget !== undefined ? searchTarget : query).trim()
    if (!q) return
    setQuery(q)
    setLoading(true)
    setError(null)

    try {
      const data = await ManagementService.huntSoftwareResources(q)
      setResult(data)
    } catch (err: any) {
      setError(err?.toString() || 'Search query failed')
    } finally {
      setLoading(false)
    }
  }

  const sampleQueries = ['chrome', 'discord', 'steam', 'code', 'edge', 'spotify', 'nvidia']

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              Universal Software & Resource Hunter
            </h1>
            <p className="text-xs text-[#6E747D]">
              Cross-correlate any software keyword across installed registries, running processes, filesystem trees, services, and startup items simultaneously.
            </p>
          </div>
        </div>
      </div>

      {/* Universal Search Bar */}
      <Card className="bg-[#17191C] border-[#30343A] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#6E747D]" />
            <input
              type="text"
              placeholder="Hunt application name, executable, publisher, or vendor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleHunt()}
              className="w-full bg-[#101113] border border-[#30343A] rounded pl-10 pr-3 py-2 text-sm text-[#E6E8EB] focus:outline-none focus:border-[#2878D0]"
            />
          </div>
          <Button
            size="default"
            variant="default"
            onClick={() => handleHunt()}
            disabled={loading}
            className="bg-[#2878D0] hover:bg-[#2878D0]/80 text-white font-mono w-full sm:w-auto h-10 px-6"
          >
            <Crosshair className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Hunt Resources
          </Button>
        </div>

        {/* Quick sample chips */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-[#6E747D]">Quick hunt:</span>
          {sampleQueries.map((s) => (
            <button
              key={s}
              onClick={() => handleHunt(s)}
              className="px-2 py-0.5 rounded bg-[#101113] border border-[#30343A] text-[#9A9FA8] hover:text-[#E6E8EB] hover:border-[#2878D0] transition-colors font-mono text-[11px]"
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      {error && (
        <div className="p-3 bg-[#D94B4B]/15 border border-[#D94B4B]/40 rounded text-xs text-[#D94B4B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hunt Results Display */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Installed Applications */}
          <Card className="bg-[#17191C] border-[#30343A] p-4 space-y-2 flex flex-col h-80">
            <div className="flex items-center justify-between pb-2 border-b border-[#30343A] text-xs font-semibold text-[#9A9FA8]">
              <span className="flex items-center gap-1.5 text-[#E6E8EB]">
                <Package className="w-4 h-4 text-[#2878D0]" /> Installed Software ({result.installed_matches.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {result.installed_matches.length === 0 ? (
                <div className="py-8 text-center text-[#6E747D]">No installed software matched.</div>
              ) : (
                result.installed_matches.map((app) => (
                  <div key={app.id} className="p-2 rounded bg-[#101113] border border-[#22262B]">
                    <span className="text-[#E6E8EB] font-bold block truncate">{app.name}</span>
                    <span className="text-[#6E747D] text-[11px] block truncate">{app.publisher || 'Unknown Publisher'}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* 2. Running Processes */}
          <Card className="bg-[#17191C] border-[#30343A] p-4 space-y-2 flex flex-col h-80">
            <div className="flex items-center justify-between pb-2 border-b border-[#30343A] text-xs font-semibold text-[#9A9FA8]">
              <span className="flex items-center gap-1.5 text-[#E6E8EB]">
                <Cpu className="w-4 h-4 text-[#35B879]" /> Running Processes ({result.running_matches.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {result.running_matches.length === 0 ? (
                <div className="py-8 text-center text-[#6E747D]">No running processes matched.</div>
              ) : (
                result.running_matches.map((pid) => (
                  <div key={pid} className="p-2 rounded bg-[#101113] border border-[#22262B] flex items-center justify-between">
                    <span className="text-[#35B879] font-bold">PID {pid}</span>
                    <span className="text-[10px] text-[#9A9FA8]">Active Process</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* 3. Filesystem Roots */}
          <Card className="bg-[#17191C] border-[#30343A] p-4 space-y-2 flex flex-col h-80">
            <div className="flex items-center justify-between pb-2 border-b border-[#30343A] text-xs font-semibold text-[#9A9FA8]">
              <span className="flex items-center gap-1.5 text-[#E6E8EB]">
                <Folder className="w-4 h-4 text-[#E4A83A]" /> Filesystem Locations ({result.filesystem_matches.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {result.filesystem_matches.length === 0 ? (
                <div className="py-8 text-center text-[#6E747D]">No filesystem folders matched.</div>
              ) : (
                result.filesystem_matches.map((path, i) => (
                  <div key={i} className="p-2 rounded bg-[#101113] border border-[#22262B] truncate" title={path}>
                    <span className="text-[#E6E8EB] truncate block">{path}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* 4. Registry Keys */}
          <Card className="bg-[#17191C] border-[#30343A] p-4 space-y-2 flex flex-col h-80">
            <div className="flex items-center justify-between pb-2 border-b border-[#30343A] text-xs font-semibold text-[#9A9FA8]">
              <span className="flex items-center gap-1.5 text-[#E6E8EB]">
                <Key className="w-4 h-4 text-[#2878D0]" /> Registry Branches ({result.registry_matches.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {result.registry_matches.length === 0 ? (
                <div className="py-8 text-center text-[#6E747D]">No registry keys matched.</div>
              ) : (
                result.registry_matches.map((key, i) => (
                  <div key={i} className="p-2 rounded bg-[#101113] border border-[#22262B] truncate" title={key}>
                    <span className="text-[#2878D0] truncate block">{key}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* 5. System Services */}
          <Card className="bg-[#17191C] border-[#30343A] p-4 space-y-2 flex flex-col h-80">
            <div className="flex items-center justify-between pb-2 border-b border-[#30343A] text-xs font-semibold text-[#9A9FA8]">
              <span className="flex items-center gap-1.5 text-[#E6E8EB]">
                <Server className="w-4 h-4 text-[#35B879]" /> System Services ({result.service_matches.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {result.service_matches.length === 0 ? (
                <div className="py-8 text-center text-[#6E747D]">No services matched.</div>
              ) : (
                result.service_matches.map((svc, i) => (
                  <div key={i} className="p-2 rounded bg-[#101113] border border-[#22262B]">
                    <span className="text-[#E6E8EB] truncate block">{svc}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* 6. Startup Items */}
          <Card className="bg-[#17191C] border-[#30343A] p-4 space-y-2 flex flex-col h-80">
            <div className="flex items-center justify-between pb-2 border-b border-[#30343A] text-xs font-semibold text-[#9A9FA8]">
              <span className="flex items-center gap-1.5 text-[#E6E8EB]">
                <Rocket className="w-4 h-4 text-[#D94B4B]" /> Startup Items ({result.startup_matches.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {result.startup_matches.length === 0 ? (
                <div className="py-8 text-center text-[#6E747D]">No startup entries matched.</div>
              ) : (
                result.startup_matches.map((st, i) => (
                  <div key={i} className="p-2 rounded bg-[#101113] border border-[#22262B]">
                    <span className="text-[#E6E8EB] truncate block">{st}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
