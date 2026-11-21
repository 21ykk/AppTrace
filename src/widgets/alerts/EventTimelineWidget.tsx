import React, { useState } from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { formatTimestamp } from '../../utils/formatters'
import { Clock, Filter } from 'lucide-react'

export const EventTimelineWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { timelineEvents } = useTelemetryStore()
  const [filterCat, setFilterCat] = useState<string>('all')

  const filtered = timelineEvents.filter((ev) =>
    filterCat === 'all' ? true : ev.category.toLowerCase() === filterCat.toLowerCase()
  )

  const list = filtered.slice(0, 20)

  return (
    <div className="flex flex-col h-full justify-between gap-2 p-1">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-[#2878D0]" />
          <span className="font-semibold uppercase tracking-wider">Chronological Telemetry Feed</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <Filter className="w-3 h-3 text-slate-500" />
          {['all', 'process', 'network', 'filesystem'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-1.5 py-0.5 rounded uppercase text-[10px] transition-colors ${
                filterCat === cat
                  ? 'bg-[#2878D0] text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-56">
        {list.length > 0 ? (
          list.map((ev) => (
            <div
              key={ev.event_id}
              className="flex items-start justify-between p-2 rounded bg-slate-900/60 border border-slate-800 text-xs font-mono hover:border-slate-700 transition-colors gap-2"
            >
              <div className="flex items-start gap-2">
                <span className="text-[10px] px-1 py-0.5 rounded font-bold uppercase tracking-wider bg-[#22262B] text-[#5aa1f2] border border-[#30343A] shrink-0">
                  {ev.category}
                </span>
                <span className="text-slate-200">{ev.summary}</span>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0">{formatTimestamp(ev.timestamp_ns)}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-28 text-slate-500 text-xs font-mono">
            No events recorded for selected filter
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/80 pt-1 flex justify-between">
        <span>SQLite WAL Persistent Event Stream</span>
        <span>Showing {list.length} events</span>
      </div>
    </div>
  )
}
