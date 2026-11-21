import React from 'react'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { Card } from '../../components/ui/Card'
import { Gauge } from '../../components/charts/Gauge'
import { AreaChart } from '../../components/charts/AreaChart'
import { formatBytes, formatRate } from '../../utils/formatters'
import { Activity, Cpu, Server, Network, Shield } from 'lucide-react'

export const LiveMonitorPage: React.FC = () => {
  const { metrics, metricsHistory, status, isCollecting, processes, connections, fsEvents } = useTelemetryStore()

  const cpuPct = metrics?.cpu_usage_pct ?? 0
  const ramUsed = metrics?.memory_used_bytes ?? 0
  const ramTotal = metrics?.memory_total_bytes || 1
  const ramPct = (ramUsed / ramTotal) * 100
  const rxRate = metrics?.net_bytes_rx_sec ?? 0
  const txRate = metrics?.net_bytes_tx_sec ?? 0

  const cpuHistory = metricsHistory.map((m) => ({ value: m.cpu }))
  const rxHistory = metricsHistory.map((m) => ({ value: m.netRx / 1024 }))

  return (
    <div className="space-y-4 pb-8">
      {/* Live Stream Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#17191C] rounded-lg border border-[#30343A]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#2878D0]/15 border border-[#2878D0]/30 flex items-center justify-center text-[#2878D0]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#E6E8EB] font-sans">Hardware Performance Monitor</h2>
            <p className="text-xs text-[#9A9FA8] font-mono flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${isCollecting ? 'bg-[#35B879]' : 'bg-[#6E747D]'}`} />
              Telemetry Interval: 1000ms • Collector: {isCollecting ? 'ACTIVE' : 'PAUSED'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="text-right">
            <span className="text-[10px] text-[#6E747D] block uppercase">Processes</span>
            <span className="text-[#E6E8EB] font-bold">{processes.length}</span>
          </div>
          <div className="text-right border-l border-[#30343A] pl-3">
            <span className="text-[10px] text-[#6E747D] block uppercase">Sockets</span>
            <span className="text-[#2878D0] font-bold">{connections.length}</span>
          </div>
          <div className="text-right border-l border-[#30343A] pl-3">
            <span className="text-[10px] text-[#6E747D] block uppercase">FS Events</span>
            <span className="text-[#35B879] font-bold">{fsEvents.length}</span>
          </div>
        </div>
      </div>

      {/* Main Realtime Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* CPU Realtime */}
        <Card className="space-y-2 bg-[#17191C] border-[#30343A]">
          <div className="flex items-center gap-2 border-b border-[#30343A] pb-2">
            <Cpu className="w-4 h-4 text-[#2878D0]" />
            <span className="text-xs font-mono font-semibold text-[#E6E8EB] uppercase">Processor Utilization</span>
          </div>
          <div className="flex justify-center rounded-lg overflow-hidden py-1">
            <Gauge value={cpuPct} label="Total Processor Load" color="#2878D0" size={120} />
          </div>
          <div className="rounded-lg overflow-hidden">
            <AreaChart data={cpuHistory} height={85} color="#2878D0" unit="%" />
          </div>
        </Card>

        {/* RAM Realtime */}
        <Card className="space-y-2 bg-[#17191C] border-[#30343A]">
          <div className="flex items-center gap-2 border-b border-[#30343A] pb-2">
            <Server className="w-4 h-4 text-[#35B879]" />
            <span className="text-xs font-mono font-semibold text-[#E6E8EB] uppercase">Physical Memory</span>
          </div>
          <div className="flex justify-center rounded-lg overflow-hidden py-1">
            <Gauge value={ramPct} label="RAM Allocation" color="#35B879" size={120} />
          </div>
          <div className="flex justify-between text-xs font-mono bg-[#101113] p-2.5 rounded border border-[#30343A]">
            <span className="text-[#9A9FA8]">Used: <strong className="text-[#35B879]">{formatBytes(ramUsed)}</strong></span>
            <span className="text-[#9A9FA8]">Total: <strong className="text-[#E6E8EB]">{formatBytes(ramTotal)}</strong></span>
          </div>
        </Card>

        {/* Network Realtime */}
        <Card className="space-y-2 bg-[#17191C] border-[#30343A]">
          <div className="flex items-center gap-2 border-b border-[#30343A] pb-2">
            <Network className="w-4 h-4 text-[#38bdf8]" />
            <span className="text-xs font-mono font-semibold text-[#E6E8EB] uppercase">Network Throughput</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
            <div className="bg-[#101113] p-2.5 rounded border border-[#30343A]">
              <span className="text-[10px] text-[#6E747D] block uppercase">RX Inbound</span>
              <span className="text-[#38bdf8] font-bold text-sm">{formatRate(rxRate)}</span>
            </div>
            <div className="bg-[#101113] p-2.5 rounded border border-[#30343A]">
              <span className="text-[10px] text-[#6E747D] block uppercase">TX Outbound</span>
              <span className="text-[#2878D0] font-bold text-sm">{formatRate(txRate)}</span>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden pt-1">
            <AreaChart data={rxHistory} height={85} color="#38bdf8" unit="KB/s" />
          </div>
        </Card>
      </div>

      {/* Network Interfaces breakdown */}
      {metrics?.interfaces && metrics.interfaces.length > 0 && (
        <Card className="bg-[#17191C] border-[#30343A] space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#30343A] pb-2">
            <span className="text-xs font-mono font-semibold text-[#E6E8EB] uppercase">
              Monitored Network Adapters ({metrics.interfaces.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-mono">
            {metrics.interfaces.map((iface) => (
              <div key={iface.name} className="p-2.5 bg-[#101113] rounded border border-[#30343A] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#E6E8EB] truncate max-w-[180px]">{iface.name}</span>
                  <span className="text-[10px] text-[#35B879] uppercase">ONLINE</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#9A9FA8]">
                  <span>RX: {formatBytes(iface.total_rx_bytes)}</span>
                  <span>TX: {formatBytes(iface.total_tx_bytes)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
