import React from 'react'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { formatDateTime } from '../../utils/formatters'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { AlertTriangle, CheckCircle, ShieldAlert, Check } from 'lucide-react'

export const AlertsPage: React.FC = () => {
  const { alerts, acknowledgeAlert } = useTelemetryStore()

  const unacknowledged = alerts.filter((a) => !a.acknowledged)

  const handleAckAll = () => {
    unacknowledged.forEach((a) => acknowledgeAlert(a.id))
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-xs text-slate-200 font-mono uppercase tracking-wider">
              Diagnostic Alerts Center
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Critical conditions, hardware load saturations, and drop signals
            </p>
          </div>
        </div>

        {unacknowledged.length > 0 && (
          <Button variant="primary" size="sm" onClick={handleAckAll} icon={<Check className="w-3.5 h-3.5" />}>
            Acknowledge All ({unacknowledged.length})
          </Button>
        )}
      </div>

      {/* Alerts List */}
      <div className="space-y-2">
        {alerts.length > 0 ? (
          alerts.map((alt) => (
            <Card
              key={alt.id}
              className={`p-4 transition-colors flex items-start justify-between gap-3 ${
                alt.acknowledged
                  ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                  : 'bg-rose-950/20 border-rose-800/80'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <AlertTriangle
                    className={`w-4 h-4 ${alt.acknowledged ? 'text-slate-500' : 'text-rose-400'}`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-slate-100">{alt.title}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold uppercase">
                      {alt.category}
                    </span>
                    <span className="text-slate-500 text-[10px]">{formatDateTime(alt.timestamp_ns)}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans">{alt.message}</p>
                  <span className="text-[10px] text-slate-500 font-mono block">Source: {alt.source}</span>
                </div>
              </div>

              {!alt.acknowledged && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acknowledgeAlert(alt.id)}
                  className="shrink-0 text-xs border-rose-800 hover:bg-rose-900/50"
                >
                  Acknowledge
                </Button>
              )}
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-16 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-500/60" />
            <h3 className="font-semibold text-slate-300 text-sm">No Active Alerts</h3>
            <p className="text-xs text-slate-500">
              Workstation metrics and telemetry queues are operating within normal tolerances.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
