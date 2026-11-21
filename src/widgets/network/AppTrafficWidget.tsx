import React from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { BarChart } from '../../components/charts/BarChart'
import { Activity, ShieldAlert } from 'lucide-react'

export const AppTrafficWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { connections } = useTelemetryStore()

  // Group sockets by process
  const procCounts = new Map<string, number>()
  connections.forEach((c) => {
    const key = c.process_name || (c.pid ? `PID ${c.pid}` : 'System Kernel')
    procCounts.set(key, (procCounts.get(key) || 0) + 1)
  })

  const sorted = Array.from(procCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const maxVal = Math.max(1, ...sorted.map((s) => s[1]))

  const barItems = sorted.map(([name, count]) => ({
    label: name,
    value: count,
    max: maxVal,
    sublabel: `${count} sockets`,
    color: '#38bdf8',
  }))

  return (
    <div className="flex flex-col h-full justify-between gap-2 p-1">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-1.5">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          Network Attribution by Process
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 py-1">
        {barItems.length > 0 ? (
          <BarChart items={barItems} />
        ) : (
          <div className="flex items-center justify-center h-28 text-slate-500 text-xs font-mono">
            No active network connections with PID attribution
          </div>
        )}
      </div>

      <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60 flex items-start gap-1.5 text-[11px] text-slate-400">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>
          Byte attribution per process requires elevated driver/eBPF probes. Baseline shows verified socket counts.
        </span>
      </div>
    </div>
  )
}
