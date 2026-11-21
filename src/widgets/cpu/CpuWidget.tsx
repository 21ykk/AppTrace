import React from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { AreaChart } from '../../components/charts/AreaChart'
import { Gauge } from '../../components/charts/Gauge'
import { BarChart } from '../../components/charts/BarChart'
import { Cpu, Layers } from 'lucide-react'

export const CpuWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { metrics, metricsHistory } = useTelemetryStore()

  const cpuPct = metrics?.cpu_usage_pct ?? 0
  const perCore = metrics?.per_core_cpu ?? []
  const chartData = metricsHistory.map((m) => ({ value: m.cpu }))

  const coreBarItems = perCore.slice(0, 8).map((usage, idx) => ({
    label: `Core #${idx}`,
    value: usage,
    max: 100,
    sublabel: `${usage.toFixed(1)}%`,
  }))

  return (
    <div className="flex flex-col h-full justify-between gap-3 p-1">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
        <div className="flex justify-center">
          <Gauge value={cpuPct} label="Total CPU Load" color="#2878D0" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[#2878D0] shrink-0" />
            <span className="font-semibold text-slate-200">CPU</span>
            <Cpu className="w-3.5 h-3.5 text-[#2878D0]" />
            <span className="font-bold text-slate-100">Active Cores: {perCore.length}</span>
            <span className="text-slate-600">•</span>
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-bold text-slate-100">Processes: {metrics?.total_processes ?? 0}</span>
          </div>
          <AreaChart data={chartData} height={85} color="#2878D0" unit="%" />
        </div>
      </div>

      {perCore.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider">
            Per-Core Distribution
          </span>
          <div className="max-h-36 overflow-y-auto pr-1">
            <BarChart items={coreBarItems} />
          </div>
        </div>
      )}
    </div>
  )
}
