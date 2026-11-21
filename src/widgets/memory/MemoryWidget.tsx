import React from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { Gauge } from '../../components/charts/Gauge'
import { AreaChart } from '../../components/charts/AreaChart'
import { formatBytes } from '../../utils/formatters'
import { HardDrive, Server } from 'lucide-react'

export const MemoryWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { metrics, metricsHistory } = useTelemetryStore()

  const used = metrics?.memory_used_bytes ?? 0
  const total = metrics?.memory_total_bytes || 1
  const avail = metrics?.memory_available_bytes ?? 0
  const swapUsed = metrics?.swap_used_bytes ?? 0
  const swapTotal = metrics?.swap_total_bytes || 1

  const ramPct = (used / total) * 100
  const swapPct = (swapUsed / swapTotal) * 100

  const chartData = metricsHistory.map((m) => ({
    value: (m.ramUsed / (1024 * 1024 * 1024)), // in GiB
  }))

  return (
    <div className="flex flex-col h-full justify-between gap-3 p-1">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
        <div className="flex justify-center">
          <Gauge value={ramPct} label="RAM Allocated" color="#38bdf8" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center gap-2 text-xs mb-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
            <span className="font-semibold text-slate-200">Memory</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-950/70 p-2 rounded border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Physical Used</span>
              <span className="text-sky-300 font-bold text-sm">{formatBytes(used)}</span>
            </div>
            <div className="bg-slate-950/70 p-2 rounded border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Available</span>
              <span className="text-emerald-400 font-bold text-sm">{formatBytes(avail)}</span>
            </div>
          </div>
          <AreaChart
            data={chartData}
            height={85}
            color="#38bdf8"
            maxVal={total / (1024 * 1024 * 1024)}
            unit=" GiB"
          />
        </div>
      </div>

      <div className="bg-slate-900/40 p-2 rounded border border-slate-800/60 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <Server className="w-3.5 h-3.5 text-[#2878D0]" />
          <span className="font-bold text-slate-100">Total RAM: {formatBytes(total)}</span>
        </div>
        <div className="text-slate-400">
          Swap: <span className="font-bold text-slate-100">{formatBytes(swapUsed)}</span> / {formatBytes(swapTotal)}{' '}
          <span className="text-slate-500">({swapPct.toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  )
}
