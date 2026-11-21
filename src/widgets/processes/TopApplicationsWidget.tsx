import React, { useState } from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { formatBytes } from '../../utils/formatters'
import { BarChart } from '../../components/charts/BarChart'

export const TopApplicationsWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { processes } = useTelemetryStore()
  const [metric, setMetric] = useState<'cpu' | 'memory'>('cpu')

  const sorted = [...processes].sort((a, b) =>
    metric === 'cpu' ? b.cpu_usage - a.cpu_usage : b.memory_bytes - a.memory_bytes
  )

  const topItems = sorted.slice(0, 6).map((p) => {
    if (metric === 'cpu') {
      return {
        label: `${p.name} (${p.pid})`,
        value: p.cpu_usage,
        max: 100,
        sublabel: `${p.cpu_usage.toFixed(1)}%`,
        color: '#2878D0',
      }
    } else {
      const maxMem = sorted[0]?.memory_bytes || 1
      return {
        label: `${p.name} (${p.pid})`,
        value: p.memory_bytes,
        max: maxMem,
        sublabel: formatBytes(p.memory_bytes),
        color: '#35B879',
      }
    }
  })

  return (
    <div className="flex flex-col h-full justify-between gap-3 p-1">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
          Top Consumers
        </span>
        <div className="flex items-center rounded bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
          <button
            onClick={() => setMetric('cpu')}
            className={`px-2 py-0.5 rounded transition-colors ${
              metric === 'cpu' ? 'bg-[#2878D0] text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CPU
          </button>
          <button
            onClick={() => setMetric('memory')}
            className={`px-2 py-0.5 rounded transition-colors ${
              metric === 'memory' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RAM
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 py-1">
        <BarChart items={topItems} />
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/80 pt-1">
        Sampling frequency: 1000ms • Zero artificial extrapolation
      </div>
    </div>
  )
}
