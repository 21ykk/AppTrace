import React, { useState, useEffect } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { SystemHealthReport } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  Activity,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HardDrive,
  Cpu,
  Server,
  Lock,
} from 'lucide-react'
import { cn } from '../../utils/cn'

export const HealthPage: React.FC = () => {
  const [report, setReport] = useState<SystemHealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHealthReport = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ManagementService.getSystemHealthReport()
      setReport(data)
    } catch (err: any) {
      setError(err?.toString() || 'Failed to generate system health report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealthReport()
  }, [])

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              System Health & Diagnostics Center
            </h1>
            <p className="text-xs text-[#6E747D]">
              Real-time hardware saturation diagnostics, disk capacity thresholds, and service integrity verification.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadHealthReport}
          disabled={loading}
          className="flex items-center gap-1.5 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B] font-mono text-xs"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Run Diagnostics
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-[#D94B4B]/15 border border-[#D94B4B]/40 rounded text-xs text-[#D94B4B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Score Card & Summary */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Health Score Gauge Card */}
          <Card className="bg-[#17191C] border-[#30343A] p-6 flex flex-col items-center justify-center text-center space-y-2">
            <span className="text-xs font-mono text-[#9A9FA8] uppercase tracking-wider">Overall Health Score</span>
            <div className="text-5xl font-black font-mono tracking-tight text-[#E6E8EB]">
              <span className={cn(
                report.overall_score >= 85 ? 'text-[#35B879]' : report.overall_score >= 65 ? 'text-[#E4A83A]' : 'text-[#D94B4B]'
              )}>
                {report.overall_score}
              </span>
              <span className="text-xl text-[#6E747D]">/100</span>
            </div>
            <span className={cn(
              'px-3 py-1 rounded text-xs font-bold font-mono uppercase tracking-wide border',
              report.status === 'Healthy' && 'bg-emerald-950 text-emerald-400 border-emerald-800',
              report.status === 'Attention' && 'bg-amber-950 text-amber-400 border-amber-800',
              report.status === 'Degraded' && 'bg-rose-950 text-rose-400 border-rose-800'
            )}>
              {report.status}
            </span>
          </Card>

          {/* Category Summary Cards */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-[#17191C] border-[#30343A] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9A9FA8]">
                <span className="font-semibold flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-[#2878D0]" /> Storage Health
                </span>
                <CheckCircle2 className="w-4 h-4 text-[#35B879]" />
              </div>
              <p className="text-xs text-[#6E747D]">
                Partitions monitored for capacity exhaust and free space safety margins.
              </p>
            </Card>

            <Card className="bg-[#17191C] border-[#30343A] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9A9FA8]">
                <span className="font-semibold flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#35B879]" /> Memory & CPU
                </span>
                <CheckCircle2 className="w-4 h-4 text-[#35B879]" />
              </div>
              <p className="text-xs text-[#6E747D]">
                Kernel commit limits, physical RAM usage, and runaway process spikes.
              </p>
            </Card>

            <Card className="bg-[#17191C] border-[#30343A] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9A9FA8]">
                <span className="font-semibold flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-[#E4A83A]" /> Services & Security
                </span>
                <CheckCircle2 className="w-4 h-4 text-[#35B879]" />
              </div>
              <p className="text-xs text-[#6E747D]">
                Automatic OS service status and application execution privilege levels.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Diagnostics Checklist Table */}
      <Card className="bg-[#17191C] border-[#30343A] p-0 overflow-hidden">
        <div className="p-3 border-b border-[#30343A] bg-[#121316] flex items-center justify-between text-xs font-semibold text-[#9A9FA8]">
          <span>DIAGNOSTIC CHECKS & VERIFICATION ITEMS</span>
          <span className="font-mono text-[11px] text-[#6E747D]">
            {report?.checks.length || 0} Evaluated Parameters
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#30343A] bg-[#101113] text-[#9A9FA8] font-mono uppercase text-[11px]">
                <th className="py-2.5 px-4 font-medium">Diagnostic Check</th>
                <th className="py-2.5 px-4 font-medium">Domain</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Evidence & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22262B] font-mono">
              {loading && !report ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#6E747D]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#2878D0]" />
                      <span>Running diagnostics...</span>
                    </div>
                  </td>
                </tr>
              ) : !report || report.checks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[#6E747D]">
                    No diagnostics available.
                  </td>
                </tr>
              ) : (
                report.checks.map((chk) => (
                  <tr key={chk.id} className="hover:bg-[#1D2024]/70 transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-[#E6E8EB] max-w-[220px]">
                      {chk.title}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#22262B] text-[#9A9FA8] border border-[#30343A]">
                        {chk.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {chk.status === 'Pass' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#35B879]/15 text-[#35B879] border border-[#35B879]/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Pass
                        </span>
                      )}
                      {chk.status === 'Warn' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#E4A83A]/15 text-[#E4A83A] border border-[#E4A83A]/30">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Warning
                        </span>
                      )}
                      {chk.status === 'Fail' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#D94B4B]/15 text-[#D94B4B] border border-[#D94B4B]/30">
                          <XCircle className="w-3.5 h-3.5" />
                          Critical
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#9A9FA8] max-w-xl">
                      {chk.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
