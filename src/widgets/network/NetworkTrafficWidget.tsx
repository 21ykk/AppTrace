import React from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { AreaChart } from '../../components/charts/AreaChart'
import { formatRate } from '../../utils/formatters'
import { ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react'

export const NetworkTrafficWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { metrics, metricsHistory } = useTelemetryStore()

  const rxRate = metrics?.net_bytes_rx_sec ?? 0
  const txRate = metrics?.net_bytes_tx_sec ?? 0

  const rxHistory = metricsHistory.map((m) => ({ value: m.netRx / 1024 }))
  const txHistory = metricsHistory.map((m) => ({ value: m.netTx / 1024 }))

  return (
    <div className="flex flex-col h-full justify-between gap-3 p-1">
      <div className="grid grid-cols-2 gap-3 font-mono">
        <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Inbound (RX)</span>
            <span className="text-sm font-bold text-emerald-400">{formatRate(rxRate)}</span>
          </div>
        </div>

        <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-sky-950/60 border border-sky-800 flex items-center justify-center text-sky-400">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Outbound (TX)</span>
            <span className="text-sm font-bold text-sky-400">{formatRate(txRate)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-[#2878D0]" />
            Live Network Throughput History (KiB/s)
          </span>
        </div>
        <AreaChart data={rxHistory} height={95} color="#10b981" unit=" KiB/s" />
      </div>
    </div>
  )
}
