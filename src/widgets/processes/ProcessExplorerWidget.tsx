import React, { useState } from 'react'
import { WidgetConfig } from '../../types/dashboard'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { formatBytes } from '../../utils/formatters'
import { Search } from 'lucide-react'

export const ProcessExplorerWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const { processes } = useTelemetryStore()
  const [filter, setFilter] = useState('')

  const filtered = processes
    .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()) || p.pid.toString().includes(filter))
    .slice(0, 20)

  return (
    <div className="flex flex-col h-full justify-between gap-2 p-1">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter processes..."
            className="w-full bg-[#101113] border border-[#30343A] rounded px-2.5 pl-8 py-1 text-xs text-[#E6E8EB] placeholder:text-[#6E747D] focus:outline-none focus:border-[#2878D0] font-mono"
          />
        </div>
        <span className="text-xs font-mono text-slate-400 shrink-0">Total: {processes.length}</span>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-64">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800">
            <tr>
              <th className="py-1 px-2">PID</th>
              <th className="py-1 px-2">Name</th>
              <th className="py-1 px-2">CPU</th>
              <th className="py-1 px-2">RAM</th>
              <th className="py-1 px-2">PPID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((p) => (
              <tr key={p.pid} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-1 px-2 text-slate-400 font-bold">{p.pid}</td>
                <td className="py-1 px-2 text-slate-200 font-sans font-medium truncate max-w-[140px]" title={p.exe_path}>
                  {p.name}
                </td>
                <td className="py-1 px-2 text-[#2878D0]">{p.cpu_usage.toFixed(1)}%</td>
                <td className="py-1 px-2 text-sky-300">{formatBytes(p.memory_bytes)}</td>
                <td className="py-1 px-2 text-slate-500">{p.ppid ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/80 pt-1 flex justify-between">
        <span>Toolhelp32 / /proc Snapshot</span>
        <span>Redaction: Sensitive CLI scrubbed</span>
      </div>
    </div>
  )
}
