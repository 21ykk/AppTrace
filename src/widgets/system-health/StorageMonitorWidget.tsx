import React from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { formatBytes } from '../../utils/formatters'
import { HardDrive } from 'lucide-react'

export const StorageMonitorWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { metrics } = useTelemetryStore()

  const disks = metrics?.disks ?? []

  return (
    <div className="flex flex-col h-full justify-between gap-3 p-1">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-1.5">
        <span className="flex items-center gap-1.5 text-slate-300">
          <HardDrive className="w-3.5 h-3.5 text-[#2878D0]" />
          Mounted Filesystem Volumes ({disks.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 py-1 pr-0.5">
        {disks.length > 0 ? (
          disks.map((d, i) => {
            const used = d.total_bytes - d.available_bytes
            const pct = Math.min(100, Math.max(0, (used / (d.total_bytes || 1)) * 100))
            const gradientClass =
              pct >= 90
                ? 'bg-[#D94B4B]'
                : pct >= 75
                ? 'bg-[#E4A83A]'
                : 'bg-[#2878D0]'

            return (
              <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-100 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2878D0]" />
                    {d.mount_point}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">
                      {formatBytes(used)} / {formatBytes(d.total_bytes)}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        pct >= 90
                          ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          : pct >= 75
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                          : 'bg-[#22262B] text-[#5aa1f2] border border-[#30343A]'
                      }`}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/80 p-[1px]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${gradientClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Drive: {d.name || d.mount_point}</span>
                  <span className={pct >= 90 ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                    {formatBytes(d.available_bytes)} free
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex items-center justify-center h-28 text-slate-500 text-xs font-mono">
            No mounted volumes detected
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/80 pt-1">
        Automatic capacity protection: Telemetry suspends if free disk space &lt; 500 MB
      </div>
    </div>
  )
}
