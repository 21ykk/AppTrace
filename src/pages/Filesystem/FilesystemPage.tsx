import React, { useState } from 'react'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { formatTimestamp } from '../../utils/formatters'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { telemetryService } from '../../services/telemetry/telemetryService'
import { FolderTree, FilePlus, FileEdit, Trash2, Search, Check, FolderInput } from 'lucide-react'

export const FilesystemPage: React.FC = () => {
  const { fsEvents, status, refresh } = useTelemetryStore()
  const [newPathInput, setNewPathInput] = useState('')
  const [isChangingPath, setIsChangingPath] = useState(false)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState<string>('ALL')

  const handleUpdateWatchPath = async () => {
    if (!newPathInput.trim()) return
    try {
      await telemetryService.setWatchPath(newPathInput.trim())
      setIsChangingPath(false)
      setNewPathInput('')
      await refresh()
    } catch (e) {
      alert(`Failed to set directory: ${e}`)
    }
  }

  const filtered = fsEvents.filter((ev) => {
    if (filterAction !== 'ALL' && ev.action !== filterAction) return false
    if (search) {
      return ev.path.toLowerCase().includes(search.toLowerCase())
    }
    return true
  })

  return (
    <div className="space-y-5 pb-8">
      {/* Path Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#17191C] p-3.5 rounded-lg border border-[#30343A]">
        <div className="flex items-center gap-3">
          <FolderTree className="w-5 h-5 text-[#2878D0] shrink-0" />
          <div>
            <span className="text-[10px] text-[#9A9FA8] uppercase tracking-wider block font-mono">
              Observed Filesystem Directory
            </span>
            <span className="text-xs font-mono font-bold text-[#E6E8EB] break-all">
              {status?.monitored_fs_path || 'Default Workspace'}
            </span>
          </div>
        </div>

        <div>
          {isChangingPath ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPathInput}
                onChange={(e) => setNewPathInput(e.target.value)}
                placeholder="Absolute directory path..."
                className="bg-[#101113] border border-[#30343A] rounded px-3 py-1 text-xs text-[#E6E8EB] focus:outline-none focus:border-[#2878D0] font-mono w-72"
              />
              <Button variant="primary" size="sm" onClick={handleUpdateWatchPath} icon={<Check className="w-3.5 h-3.5" />}>
                Apply
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsChangingPath(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNewPathInput(status?.monitored_fs_path || '')
                setIsChangingPath(true)
              }}
              icon={<FolderInput className="w-3.5 h-3.5 text-[#2878D0]" />}
            >
              Change Monitored Path
            </Button>
          )}
        </div>
      </div>

      {/* Event Filter & Counts */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#17191C] p-3 rounded-lg border border-[#30343A]">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-[#6E747D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search path or filename..."
            className="w-full bg-[#101113] border border-[#30343A] rounded px-3 pl-9 py-1.5 text-xs text-[#E6E8EB] placeholder:text-[#6E747D] focus:outline-none focus:border-[#2878D0] font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          {(['ALL', 'CREATE', 'MODIFY', 'DELETE'] as const).map((action) => (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              className={`px-2.5 py-1 rounded uppercase font-bold transition-colors ${
                filterAction === action
                  ? 'bg-[#2878D0] text-white'
                  : 'bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB]'
              }`}
            >
              {action}
            </button>
          ))}
          <span className="text-[#6E747D] border-l border-[#30343A] pl-3">
            {filtered.length} Observed Events
          </span>
        </div>
      </div>

      {/* Main Filesystem Event Log */}
      <Card className="p-0 overflow-hidden border-slate-800">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
              <tr>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Path</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((ev) => {
                const isCreate = ev.action === 'CREATE'
                const isModify = ev.action === 'MODIFY'
                const isDelete = ev.action === 'DELETE'

                return (
                  <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCreate
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : isModify
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                            : isDelete
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isCreate ? (
                          <FilePlus className="w-3 h-3" />
                        ) : isModify ? (
                          <FileEdit className="w-3 h-3" />
                        ) : isDelete ? (
                          <Trash2 className="w-3 h-3" />
                        ) : null}
                        {ev.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-200 font-mono break-all max-w-md">
                      {ev.path}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {ev.is_directory ? 'Directory' : 'File'}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{formatTimestamp(ev.timestamp_ns)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
