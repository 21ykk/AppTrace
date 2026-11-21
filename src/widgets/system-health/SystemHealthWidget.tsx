import React from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { StatusPill } from '../../components/tables/StatusPill'
import { ShieldCheck, ShieldAlert, Database } from 'lucide-react'

export const SystemHealthWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { status, isCollecting } = useTelemetryStore()

  if (!status) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-slate-500">
        Querying capability status...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full justify-between gap-3 p-1">
      {/* Section title */}
      <div className="flex items-center gap-2 mb-0.5">
        <span className="w-2 h-2 rounded-full bg-[#2878D0] shrink-0" />
        <span className="font-semibold text-slate-200 text-xs uppercase tracking-wider">System Health</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
        <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Engine State</span>
          <div className="flex items-center gap-1.5 font-bold">
            <span className={`w-2 h-2 rounded-full ${isCollecting ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className={`font-bold font-mono ${isCollecting ? 'text-emerald-400' : 'text-slate-400'}`}>
              {isCollecting ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Privilege Token</span>
          <div className="flex items-center gap-1 font-bold">
            {status.is_elevated ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className={`font-bold font-mono ${status.is_elevated ? 'text-emerald-400' : 'text-slate-400'}`}>
              {status.is_elevated ? 'ELEVATED' : 'STANDARD'}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Ring Buffer Drops</span>
          <span className={`font-bold font-mono ${status.event_drop_count > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
            {status.event_drop_count}
          </span>
        </div>

        <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Storage Mode</span>
          <div className="flex items-center gap-1 text-slate-100">
            <Database className="w-3.5 h-3.5 text-[#2878D0]" />
            <span className="font-bold font-mono">SQLite WAL</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
          Domain Capability Verification
        </span>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {status.capabilities.map((cap, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60 text-xs font-mono gap-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-semibold text-slate-200 shrink-0">{cap.category}</span>
                <span className="text-slate-700 shrink-0">•</span>
                <span className="text-slate-400 text-[11px] truncate" title={cap.collection_mechanism}>
                  {cap.collection_mechanism}
                </span>
              </div>
              <div className="shrink-0">
                <StatusPill level={cap.level} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
