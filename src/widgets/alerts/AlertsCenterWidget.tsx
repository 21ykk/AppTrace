import React from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { formatTimestamp } from '../../utils/formatters'
import { AlertTriangle, CheckCircle, Bell } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export const AlertsCenterWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { alerts, acknowledgeAlert } = useTelemetryStore()

  const recentAlerts = alerts.slice(0, 10)

  return (
    <div className="flex flex-col h-full justify-between gap-2 p-1">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-1.5">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Bell className="w-3.5 h-3.5 text-rose-400" />
          Active Diagnostics & Threshold Alerts ({alerts.filter((a) => !a.acknowledged).length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-56">
        {recentAlerts.length > 0 ? (
          recentAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-2 rounded border text-xs font-mono transition-colors flex items-start justify-between gap-2 ${
                alt.acknowledged
                  ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                  : 'bg-rose-950/30 border-rose-800/60'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="font-bold text-slate-100">{alt.title}</span>
                  <span className="text-[10px] text-slate-500">{formatTimestamp(alt.timestamp_ns)}</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans pl-5">{alt.message}</p>
              </div>

              {!alt.acknowledged && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acknowledgeAlert(alt.id)}
                  className="text-[10px] py-0.5 px-2 h-auto shrink-0 border-rose-700 hover:bg-rose-900/50"
                >
                  Ack
                </Button>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-28 text-slate-500 text-xs font-mono">
            <CheckCircle className="w-5 h-5 text-emerald-500/60 mb-1" />
            Zero active alerts • All systems nominal
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/80 pt-1">
        Thresholds: CPU &gt; 92% • RAM &gt; 92% • Buffer Drops
      </div>
    </div>
  )
}
