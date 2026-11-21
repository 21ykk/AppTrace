import React from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { Globe, MapPin } from 'lucide-react'
import { getCachedIpGeo, resolveIpGeo } from '../../services/network/geoIpService'

export const NetworkHostsWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { connections } = useTelemetryStore()

  // Aggregate remote hosts by connection frequency
  const hostMap = new Map<string, { count: number; protocol: string; state: string }>()
  connections.forEach((c) => {
    if (c.remote_addr && c.remote_addr !== '*' && c.remote_addr !== '0.0.0.0') {
      const prev = hostMap.get(c.remote_addr)
      if (prev) {
        prev.count += 1
      } else {
        hostMap.set(c.remote_addr, { count: 1, protocol: c.protocol, state: c.state })
      }
    }
  })

  const topHosts = Array.from(hostMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)

  React.useEffect(() => {
    topHosts.forEach(([host]) => {
      if (!getCachedIpGeo(host)) {
        resolveIpGeo(host).catch(() => {})
      }
    })
  }, [topHosts])

  return (
    <div className="flex flex-col h-full justify-between gap-2 p-1">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-1.5">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#2878D0]" />
          Active Remote Endpoints ({topHosts.length})
        </span>
        <span>Sockets</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {topHosts.length > 0 ? (
          topHosts.map(([host, info], idx) => {
            const geo = getCachedIpGeo(host)

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm shrink-0" title={geo ? `${geo.country} (${geo.city || ''})` : 'Remote IP'}>
                    {geo?.flag || '🌐'}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium truncate max-w-[170px]" title={host}>
                      {host}
                    </span>
                    {geo && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[170px]">
                        {geo.country}{geo.city ? ` • ${geo.city}` : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400 font-mono ml-1">
                    {info.protocol}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#22262B] text-[#5aa1f2] border border-[#30343A] font-bold text-xs font-mono">
                  {info.count}
                </span>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-28 text-slate-500 text-xs font-mono">
            No external remote endpoints active
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 font-sans italic border-t border-slate-800/80 pt-1">
        Provenance: IP Helper API socket diagnostic table &amp; GeoIP
      </div>
    </div>
  )
}
