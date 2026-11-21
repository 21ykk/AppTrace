import React, { useState, useEffect, useMemo } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { ScheduledTaskInfo } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  CalendarClock,
  Search,
  RefreshCw,
  Power,
  PowerOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCode,
} from 'lucide-react'
import { cn } from '../../utils/cn'

export const ScheduledTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<ScheduledTaskInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [togglingName, setTogglingName] = useState<string | null>(null)

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ManagementService.getScheduledTasks()
      setTasks(data)
    } catch (err: any) {
      setError(err?.toString() || 'Failed to enumerate scheduled tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleToggleTask = async (task: ScheduledTaskInfo) => {
    const isEnabled = task.state === 'Ready' || task.state === 'Running'
    setTogglingName(task.name)
    setError(null)

    try {
      await ManagementService.setScheduledTaskEnabled(task.path, task.name, !isEnabled)
      await ManagementService.recordOperation(
        'Task_Toggle',
        task.name,
        task.path,
        'Success',
        JSON.stringify({ enabled: !isEnabled, path: task.path })
      )
      setTasks((prev) =>
        prev.map((t) =>
          t.name === task.name && t.path === task.path
            ? { ...t, state: !isEnabled ? 'Ready' : 'Disabled' }
            : t
        )
      )
    } catch (err: any) {
      setError(`Failed to toggle scheduled task: ${err}`)
    } finally {
      setTogglingName(null)
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = search.toLowerCase()
      return (
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.path.toLowerCase().includes(q) ||
        t.action_summary.toLowerCase().includes(q) ||
        (t.author && t.author.toLowerCase().includes(q))
      )
    })
  }, [tasks, search])

  const activeCount = useMemo(() => {
    return tasks.filter((t) => t.state === 'Ready' || t.state === 'Running').length
  }, [tasks])

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              Scheduled Tasks & Timers
              <span className="text-[11px] font-mono px-2 py-0.5 bg-[#22262B] text-[#9A9FA8] rounded border border-[#30343A]">
                {tasks.length} Tasks
              </span>
            </h1>
            <p className="text-xs text-[#6E747D]">
              Inspect Windows Task Scheduler jobs, periodic system routines, and trigger criteria.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
            <span className="text-[#6E747D]">Active / Ready:</span>
            <span className="text-[#35B879] font-semibold">{activeCount}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadTasks}
            disabled={loading}
            className="flex items-center gap-1.5 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B]"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-3 rounded-lg">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6E747D]" />
          <input
            type="text"
            placeholder="Search task name, folder path, action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#101113] border border-[#30343A] rounded pl-9 pr-3 py-1.5 text-xs text-[#E6E8EB] focus:outline-none focus:border-[#2878D0]"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#D94B4B]/15 border border-[#D94B4B]/40 rounded text-xs text-[#D94B4B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <Card className="bg-[#17191C] border-[#30343A] overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#30343A] bg-[#121316] text-[#9A9FA8] font-mono uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 font-medium">Task Name</th>
                <th className="py-2.5 px-4 font-medium">Folder Path</th>
                <th className="py-2.5 px-4 font-medium">State</th>
                <th className="py-2.5 px-4 font-medium">Triggers</th>
                <th className="py-2.5 px-4 font-medium">Action Summary</th>
                <th className="py-2.5 px-4 font-medium">Author</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22262B] font-mono">
              {loading && tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6E747D]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#2878D0]" />
                      <span>Reading Task Scheduler database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#6E747D]">
                    No scheduled tasks found.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const isEnabled = t.state === 'Ready' || t.state === 'Running'
                  return (
                    <tr key={`${t.path}/${t.name}`} className="hover:bg-[#1D2024]/70 transition-colors">
                      <td className="py-2.5 px-4 font-sans font-medium text-[#E6E8EB] max-w-[200px] truncate" title={t.name}>
                        {t.name}
                      </td>
                      <td className="py-2.5 px-4 text-[#9A9FA8] max-w-[150px] truncate" title={t.path}>
                        {t.path}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-semibold border',
                            t.state === 'Running' && 'bg-emerald-950 text-emerald-400 border-emerald-800',
                            t.state === 'Ready' && 'bg-blue-950 text-blue-400 border-blue-800',
                            t.state === 'Disabled' && 'bg-[#22262B] text-[#6E747D] border-[#30343A]'
                          )}
                        >
                          {t.state}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#6E747D] max-w-[200px] truncate" title={t.trigger_summary}>
                        {t.trigger_summary}
                      </td>
                      <td className="py-2.5 px-4 text-[#6E747D] max-w-xs truncate" title={t.action_summary}>
                        {t.action_summary || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-[#9A9FA8] max-w-[120px] truncate">
                        {t.author || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant={isEnabled ? 'outline' : 'default'}
                          onClick={() => handleToggleTask(t)}
                          disabled={togglingName === t.name}
                          className={cn(
                            'h-7 px-2.5 text-xs',
                            isEnabled
                              ? 'text-[#D94B4B] hover:text-[#D94B4B] border-[#D94B4B]/30 hover:bg-[#D94B4B]/10'
                              : 'bg-[#2878D0] hover:bg-[#2878D0]/80 text-white'
                          )}
                        >
                          {togglingName === t.name ? (
                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                          ) : isEnabled ? (
                            <PowerOff className="w-3 h-3 mr-1" />
                          ) : (
                            <Power className="w-3 h-3 mr-1" />
                          )}
                          {isEnabled ? 'Disable' : 'Enable'}
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
