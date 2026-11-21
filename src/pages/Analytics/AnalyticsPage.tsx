import React from 'react'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { formatBytes } from '../../utils/formatters'
import { Card } from '../../components/ui/Card'
import { AreaChart } from '../../components/charts/AreaChart'
import { BarChart3, Cpu, Server, Network } from 'lucide-react'

export const AnalyticsPage: React.FC = () => {
  const { metricsHistory, processes } = useTelemetryStore()

  const cpuData = metricsHistory.map((m) => ({ value: m.cpu }))
  const ramData = metricsHistory.map((m) => ({ value: m.ramUsed / (1024 * 1024 * 1024) }))
  const netData = metricsHistory.map((m) => ({ value: (m.netRx + m.netTx) / 1024 }))

  // Count processes by status
  const statusMap = new Map<string, number>()
  processes.forEach((p) => {
    statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1)
  })

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-3 bg-[#17191C] p-3.5 rounded-lg border border-[#30343A]">
        <div className="w-8 h-8 rounded-lg bg-[#22262B] border border-[#30343A] flex items-center justify-center text-[#2878D0]">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-semibold text-xs text-[#E6E8EB] font-mono uppercase tracking-wider">
            Telemetry Aggregate Analytics
          </h2>
          <p className="text-[11px] text-[#9A9FA8] font-sans">
            Workstation resource trend lines and process lifecycle distributions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-2">
          <div className="flex items-center gap-2 border-b border-[#30343A] pb-2">
            <Cpu className="w-4 h-4 text-[#2878D0]" />
            <div>
              <span className="text-xs font-mono font-semibold text-[#E6E8EB] uppercase block">
                Processor Workload Trend
              </span>
              <span className="text-[10px] text-[#9A9FA8] uppercase tracking-wide font-mono">CPU % over time</span>
            </div>
          </div>
          <AreaChart data={cpuData} height={120} color="#2878D0" unit="%" />
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center gap-2 border-b border-[#30343A] pb-2">
            <Server className="w-4 h-4 text-[#2878D0]" />
            <div>
              <span className="text-xs font-mono font-semibold text-[#E6E8EB] uppercase block">
                Physical Memory Demand Trend
              </span>
              <span className="text-[10px] text-[#9A9FA8] uppercase tracking-wide font-mono">RAM usage in GiB</span>
            </div>
          </div>
          <AreaChart data={ramData} height={120} color="#35B879" unit=" GiB" />
        </Card>

        <Card className="space-y-2 md:col-span-2">
          <div className="flex items-center gap-2 border-b border-[#30343A] pb-2">
            <Network className="w-4 h-4 text-[#35B879]" />
            <div>
              <span className="text-xs font-mono font-semibold text-[#E6E8EB] uppercase block">
                Total Network Bandwidth Trend (RX + TX)
              </span>
              <span className="text-[10px] text-[#9A9FA8] uppercase tracking-wide font-mono">Combined throughput KiB/s</span>
            </div>
          </div>
          <AreaChart data={netData} height={130} color="#2878D0" unit=" KiB/s" />
        </Card>
      </div>

      {/* Process Status Breakdown */}
      {statusMap.size > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from(statusMap.entries()).map(([st, count]) => (
            <div key={st} className="bg-[#17191C] border border-[#30343A] rounded-xl p-4">
              <span className="text-[10px] text-[#9A9FA8] uppercase tracking-wide font-mono block">{st}</span>
              <span className="text-2xl font-bold font-mono text-[#E6E8EB]">{count}</span>
              <span className="text-xs text-[#6E747D] font-sans">processes</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
