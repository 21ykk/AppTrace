import React, { useState, useEffect } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { OptimizationRecommendation } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  Gauge,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  Rocket,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import { cn } from '../../utils/cn'

export const OptimizerPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ManagementService.getOptimizationRecommendations()
      setRecommendations(data)
    } catch (err: any) {
      setError(err?.toString() || 'Failed to analyze system recommendations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecommendations()
  }, [])

  const handleExecute = async (rec: OptimizationRecommendation) => {
    setExecutingId(rec.id)
    setError(null)
    setResultMsg(null)

    try {
      const msg = await ManagementService.executeOptimizationAction(rec.action_id)
      setResultMsg(msg)
      // Refresh recommendations
      loadRecommendations()
    } catch (err: any) {
      setError(`Failed to execute action: ${err}`)
    } finally {
      setExecutingId(null)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              Actionable System Optimizer
              <span className="text-[11px] font-mono px-2 py-0.5 bg-[#22262B] text-[#9A9FA8] rounded border border-[#30343A]">
                {recommendations.length} Actionable Items
              </span>
            </h1>
            <p className="text-xs text-[#6E747D]">
              Targeted system performance optimizations backed by measured telemetry and runtime resource metrics.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadRecommendations}
          disabled={loading}
          className="flex items-center gap-1.5 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B] font-mono text-xs"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Re-Analyze System
        </Button>
      </div>

      {resultMsg && (
        <div className="p-3 bg-[#35B879]/15 border border-[#35B879]/40 rounded text-xs text-[#35B879] flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{resultMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[#D94B4B]/15 border border-[#D94B4B]/40 rounded text-xs text-[#D94B4B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Recommendations Feed */}
      <div className="space-y-3">
        {loading ? (
          <Card className="bg-[#17191C] border-[#30343A] p-12 text-center text-[#6E747D]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2878D0] mx-auto mb-2" />
            <span>Analyzing system bottlenecks, memory pressure, and startup delay...</span>
          </Card>
        ) : recommendations.length === 0 ? (
          <Card className="bg-[#17191C] border-[#30343A] p-8 text-center text-[#6E747D]">
            <ShieldCheck className="w-8 h-8 text-[#35B879] mx-auto mb-2 opacity-80" />
            <span className="block text-sm text-[#E6E8EB] font-medium">System Operating at Optimal State</span>
            <span className="text-xs text-[#6E747D]">
              No runaway processes, disk capacity warnings, or critical startup bloat detected.
            </span>
          </Card>
        ) : (
          recommendations.map((rec) => (
            <Card key={rec.id} className="bg-[#17191C] border-[#30343A] p-4 space-y-3 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded bg-[#101113] border border-[#22262B] text-[#2878D0]">
                    {rec.category === 'Startup' && <Rocket className="w-4 h-4" />}
                    {rec.category === 'Disk' && <HardDrive className="w-4 h-4" />}
                    {rec.category === 'Memory' && <Cpu className="w-4 h-4" />}
                    {rec.category === 'Background' && <Gauge className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-[#E6E8EB]">{rec.title}</h2>
                      <span className={cn(
                        'text-[10px] font-mono px-1.5 py-0.2 rounded border',
                        rec.risk_level === 'None' && 'bg-emerald-950 text-emerald-400 border-emerald-800',
                        rec.risk_level === 'Low' && 'bg-blue-950 text-blue-400 border-blue-800',
                        rec.risk_level === 'Medium' && 'bg-amber-950 text-amber-400 border-amber-800'
                      )}>
                        {rec.risk_level} Risk
                      </span>
                    </div>
                    <p className="text-xs text-[#9A9FA8] mt-0.5">{rec.description}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  {rec.can_auto_execute ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleExecute(rec)}
                      disabled={executingId === rec.id}
                      className="bg-[#2878D0] hover:bg-[#2878D0]/80 text-white font-mono text-xs"
                    >
                      {executingId === rec.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                      )}
                      Optimize Now
                    </Button>
                  ) : (
                    <span className="text-[11px] font-mono text-[#6E747D] px-2 py-1 bg-[#101113] rounded border border-[#22262B]">
                      Review in {rec.category} Tab
                    </span>
                  )}
                </div>
              </div>

              {/* Evidence & Expected Effect Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-[#101113] border border-[#22262B] rounded">
                  <span className="text-[#6E747D] text-[10px] uppercase block mb-0.5">Telemetry Evidence:</span>
                  <span className="text-[#E6E8EB]">{rec.evidence}</span>
                </div>
                <div className="p-2.5 bg-[#101113] border border-[#22262B] rounded">
                  <span className="text-[#6E747D] text-[10px] uppercase block mb-0.5">Expected Effect:</span>
                  <span className="text-[#35B879]">{rec.expected_effect}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
