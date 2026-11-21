import React, { useState, useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { formatBytes, formatRate } from '../../utils/formatters'
import { Card } from '../../components/ui/Card'
import { AreaChart } from '../../components/charts/AreaChart'
import { Network, Globe, Activity, Search, ShieldAlert, Wifi, MapPin, SlidersHorizontal } from 'lucide-react'
import { getCachedIpGeo, resolveIpGeo, GeoIpInfo } from '../../services/network/geoIpService'
import { cn } from '../../utils/cn'

export const NetworkPage: React.FC = () => {
  const { connections, metrics, metricsHistory } = useTelemetryStore()
  const [filter, setFilter] = useState('')
  const [protoFilter, setProtoFilter] = useState<'ALL' | 'TCP' | 'UDP'>('ALL')
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'PUBLIC' | 'LOCAL'>('ALL')
  const parentRef = useRef<HTMLDivElement>(null)

  const rxRate = metrics?.net_bytes_rx_sec ?? 0
  const txRate = metrics?.net_bytes_tx_sec ?? 0
  const rxHistory = metricsHistory.map((m) => ({ value: m.netRx / 1024 }))
  const interfaces = metrics?.interfaces ?? []

  // Pre-load GeoIP for visible unique remote IPs
  React.useEffect(() => {
    const uniqueIps = Array.from(new Set(connections.map((c) => c.remote_addr).filter(Boolean)))
    uniqueIps.slice(0, 30).forEach((ip) => {
      if (!getCachedIpGeo(ip)) {
        resolveIpGeo(ip).catch(() => {})
      }
    })
  }, [connections])

  const filteredConnections = useMemo(() => {
    return connections.filter((c) => {
      if (protoFilter !== 'ALL' && c.protocol !== protoFilter) return false

      if (scopeFilter !== 'ALL') {
        const geo = getCachedIpGeo(c.remote_addr)
        if (scopeFilter === 'LOCAL' && geo && !geo.isPrivate) return false
        if (scopeFilter === 'PUBLIC' && geo?.isPrivate) return false
      }

      if (filter) {
        const q = filter.toLowerCase()
        const geo = getCachedIpGeo(c.remote_addr)
        const geoMatch =
          geo &&
          (geo.country.toLowerCase().includes(q) ||
            geo.city?.toLowerCase().includes(q) ||
            geo.org?.toLowerCase().includes(q))

        return (
          c.local_addr.toLowerCase().includes(q) ||
          c.remote_addr.toLowerCase().includes(q) ||
          c.local_port.toString().includes(q) ||
          c.remote_port.toString().includes(q) ||
          (c.process_name && c.process_name.toLowerCase().includes(q)) ||
          geoMatch
        )
      }
      return true
    })
  }, [connections, protoFilter, scopeFilter, filter])

  const rowVirtualizer = useVirtualizer({
    count: filteredConnections.length,
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
    <div className="space-y-4 pb-8">
      {/* Network Traffic Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Card className="bg-[#17191C] border-[#30343A] space-y-1">
          <span className="text-[10px] text-[#6E747D] uppercase tracking-wider font-mono block">Inbound Throughput</span>
          <span className="text-xl font-bold font-mono text-[#38bdf8]">{formatRate(rxRate)}</span>
          <p className="text-[11px] text-[#9A9FA8] font-sans">Physical network adapters total</p>
        </Card>

        <Card className="bg-[#17191C] border-[#30343A] space-y-1">
          <span className="text-[10px] text-[#6E747D] uppercase tracking-wider font-mono block">Outbound Throughput</span>
          <span className="text-xl font-bold font-mono text-[#2878D0]">{formatRate(txRate)}</span>
          <p className="text-[11px] text-[#9A9FA8] font-sans">Physical network adapters total</p>
        </Card>

        <Card className="bg-[#17191C] border-[#30343A] space-y-1">
          <span className="text-[10px] text-[#6E747D] uppercase tracking-wider font-mono block">Active Sockets</span>
          <span className="text-xl font-bold font-mono text-[#E6E8EB]">{connections.length} Endpoints</span>
          <p className="text-[11px] text-[#9A9FA8] font-sans">IP Helper API / Live Netlink</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#17191C] border border-[#30343A] p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-3.5 h-3.5 text-[#6E747D] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search IP, port, process, country, ISP..."
            className="w-full bg-[#101113] border border-[#30343A] rounded-md pl-8 pr-3 py-1 text-xs text-[#E6E8EB] placeholder:text-[#6E747D] focus:outline-none focus:border-[#2878D0] font-mono transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Protocol filter */}
          <div className="flex items-center rounded-md bg-[#101113] border border-[#30343A] p-0.5">
            {(['ALL', 'TCP', 'UDP'] as const).map((proto) => (
              <button
                key={proto}
                onClick={() => setProtoFilter(proto)}
                className={cn(
                  'px-2.5 py-0.5 rounded text-[10px] font-semibold transition-colors',
                  protoFilter === proto ? 'bg-[#2878D0] text-white' : 'text-[#9A9FA8] hover:text-[#E6E8EB]'
                )}
              >
                {proto}
              </button>
            ))}
          </div>

          {/* Scope filter */}
          <div className="flex items-center rounded-md bg-[#101113] border border-[#30343A] p-0.5">
            {(['ALL', 'PUBLIC', 'LOCAL'] as const).map((scope) => (
              <button
                key={scope}
                onClick={() => setScopeFilter(scope)}
                className={cn(
                  'px-2.5 py-0.5 rounded text-[10px] font-semibold transition-colors',
                  scopeFilter === scope ? 'bg-[#2878D0] text-white' : 'text-[#9A9FA8] hover:text-[#E6E8EB]'
                )}
              >
                {scope}
              </button>
            ))}
          </div>

          <span className="text-[#6E747D] border-l border-[#30343A] pl-2 text-[11px]">
            {filteredConnections.length} of {connections.length}
          </span>
        </div>
      </div>

      {/* Sockets Table */}
      <div className="bg-[#17191C] border border-[#30343A] rounded-lg overflow-hidden">
        <div ref={parentRef} className="overflow-x-auto max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#30343A]">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-[#1D2024] text-[#9A9FA8] sticky top-0 border-b border-[#30343A] z-20">
              <tr>
                <th className="py-2 px-3 uppercase text-[10px] tracking-wider font-semibold">Protocol</th>
                <th className="py-2 px-3 uppercase text-[10px] tracking-wider font-semibold">Local Endpoint</th>
                <th className="py-2 px-3 uppercase text-[10px] tracking-wider font-semibold">Remote Endpoint</th>
                <th className="py-2 px-3 uppercase text-[10px] tracking-wider font-semibold">Location / Geo</th>
                <th className="py-2 px-3 uppercase text-[10px] tracking-wider font-semibold">State</th>
                <th className="py-2 px-3 uppercase text-[10px] tracking-wider font-semibold">Process</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30343A]/40 text-[#E6E8EB]">
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={6} />
                </tr>
              )}
              {virtualItems.map((virtualRow) => {
                const conn = filteredConnections[virtualRow.index]
                if (!conn) return null
                const geo = getCachedIpGeo(conn.remote_addr)

                return (
                  <tr key={`${conn.protocol}-${conn.local_addr}:${conn.local_port}-${conn.remote_addr}:${conn.remote_port}-${virtualRow.index}`} className="hover:bg-[#1D2024] transition-colors h-8 text-xs">
                    <td className="py-1 px-3 text-[#2878D0] font-bold">{conn.protocol}</td>
                    <td className="py-1 px-3 text-[#9A9FA8]">
                      {conn.local_addr}:{conn.local_port}
                    </td>
                    <td className="py-1 px-3 text-[#E6E8EB] font-medium">
                      {conn.remote_addr}:{conn.remote_port}
                    </td>
                    <td className="py-1 px-3 text-[#9A9FA8]">
                      {geo ? (
                        <span className="flex items-center gap-1.5 truncate max-w-[200px]" title={geo.org || geo.country}>
                          <span className="text-sm">{geo.flag}</span>
                          <span className="truncate">{geo.country}{geo.city ? `, ${geo.city}` : ''}</span>
                        </span>
                      ) : (
                        <span className="text-[#6E747D]">-</span>
                      )}
                    </td>
                    <td className="py-1 px-3">
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#22262B] text-[#35B879] border border-[#30343A]">
                        {conn.state || 'ESTABLISHED'}
                      </span>
                    </td>
                    <td className="py-1 px-3 text-[#9A9FA8]">
                      {conn.process_name ? (
                        <span className="text-[#E6E8EB] font-sans font-medium">
                          {conn.process_name} {conn.pid && <span className="text-[#6E747D] font-mono text-[10px]">({conn.pid})</span>}
                        </span>
                      ) : (
                        <span className="text-[#6E747D]">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={6} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
