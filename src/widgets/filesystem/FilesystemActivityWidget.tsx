import React from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { formatTimestamp } from '../../utils/formatters'
import { FolderTree, FilePlus, FileEdit, Trash2, ShieldAlert } from 'lucide-react'

export const FilesystemActivityWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { fsEvents, status } = useTelemetryStore()

  const list = fsEvents.slice(0, 15)

  return (
    <div className="flex flex-col h-full justify-between gap-2 p-1">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-[#2878D0]" />
          <span className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
            Monitored Directory
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]" title={status?.monitored_fs_path || ''}>
          {status?.monitored_fs_path ? status.monitored_fs_path : 'Default Workspace'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-56">
        {list.length > 0 ? (
          list.map((ev) => {
            const isCreate = ev.action === 'CREATE'
            const isModify = ev.action === 'MODIFY'
            const isDelete = ev.action === 'DELETE'

            return (
              <div
                key={ev.id}
                className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 text-xs font-mono hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isCreate ? (
                    <FilePlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : isModify ? (
                    <FileEdit className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : isDelete ? (
                    <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : (
                    <FolderTree className="w-3.5 h-3.5 text-[#2878D0] shrink-0" />
                  )}
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                      isCreate
                        ? 'bg-emerald-950 text-emerald-400'
                        : isModify
                        ? 'bg-amber-950 text-amber-400'
                        : 'bg-rose-950 text-rose-400'
                    }`}
                  >
                    {ev.action}
                  </span>
                  <span className="text-slate-300 truncate max-w-[240px]" title={ev.path}>
                    {ev.path}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">{formatTimestamp(ev.timestamp_ns)}</span>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-28 text-slate-500 text-xs font-mono">
            No filesystem modifications observed yet
          </div>
        )}
      </div>

      <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-[#2878D0] shrink-0" />
          Recursive notify I/O watcher active
        </span>
        <span className="font-mono text-slate-500">Live events: {fsEvents.length}</span>
      </div>
    </div>
  )
}
