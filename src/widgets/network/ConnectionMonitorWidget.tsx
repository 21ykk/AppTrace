import React from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { getCachedIpGeo, resolveIpGeo } from '../../services/network/geoIpService'

export const ConnectionMonitorWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { connections } = useTelemetryStore()

  const list = connections.slice(0, 15)

  React.useEffect(() => {
    list.forEach((c) => {
      if (c.remote_addr && !getCachedIpGeo(c.remote_addr)) {
        resolveIpGeo(c.remote_addr).catch(() => {})
      }
    })
  }, [list])

  return (
    <div className="flex flex-col h-full justify-between gap-2 p-1">
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-64 rounded-xl border border-slate-800/80 bg-slate-950/40">
        <table className="w-full text-left text-xs font-mono table-fixed">
          <thead className="bg-[#0e1628] text-slate-300 sticky top-0 border-b border-slate-700/90 z-20 shadow-sm">
            <tr>
              <th className="py-2 px-2.5 w-14 font-semibold text-[11px] uppercase tracking-wider text-slate-400">Proto</th>
              <th className="py-2 px-2.5 w-[28%] font-semibold text-[11px] uppercase tracking-wider text-slate-400">Local</th>
              <th className="py-2 px-2.5 w-[34%] font-semibold text-[11px] uppercase tracking-wider text-slate-400">Remote &amp; Geo</th>
              <th className="py-2 px-2.5 w-24 font-semibold text-[11px] uppercase tracking-wider text-slate-400">State</th>
              <th className="py-2 px-2.5 font-semibold text-[11px] uppercase tracking-wider text-slate-400">Process</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {list.map((conn, i) => {
              const geo = getCachedIpGeo(conn.remote_addr)

              return (
                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-1.5 px-2.5 text-[#2878D0] font-bold text-[11px]">{conn.protocol}</td>
                  <td className="py-1.5 px-2.5 text-slate-300 truncate" title={`${conn.local_addr}:${conn.local_port}`}>
                    {conn.local_addr}:{conn.local_port}
                  </td>
                  <td className="py-1.5 px-2.5 text-sky-400 truncate" title={`${conn.remote_addr}:${conn.remote_port}`}>
                    <span className="mr-1.5">{geo?.flag || '🌐'}</span>
                    <span>{conn.remote_addr}:{conn.remote_port}</span>
                  </td>
                  <td className="py-1.5 px-2.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        conn.state === 'ESTABLISHED'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : conn.state === 'LISTEN'
                          ? 'bg-[#22262B] text-[#9A9FA8] border border-[#30343A]'
                          : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                      }`}
                    >
                      {conn.state}
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-200 font-sans truncate" title={conn.process_name || (conn.pid ? `PID ${conn.pid}` : '')}>
                    {conn.process_name || (conn.pid ? `PID ${conn.pid}` : '-')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans border-t border-slate-800/80 pt-1 px-0.5">
        <span>Displaying {list.length} of {connections.length} active sockets</span>
        <span className="font-mono text-slate-400">TCP/UDP Kernel Tables</span>
      </div>
    </div>
  )
}
