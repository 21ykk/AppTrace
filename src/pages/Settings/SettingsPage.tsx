import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTelemetryStore } from '../../stores/telemetryStore'
import { telemetryService } from '../../services/telemetry/telemetryService'
import { formatBytes } from '../../utils/formatters'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { ErrorBoundary } from '../../components/ui/ErrorBoundary'
import {
  Settings,
  Shield,
  Database,
  Check,
  Trash2,
  RefreshCw,
  Power,
  Activity,
  FolderArchive,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react'
import { AppPathsInfo, AutostartStatus, BackupRecord } from '../../types/system'
import { SystemDiagnostics } from '../../types/telemetry'

// Styled toggle switch
interface ToggleProps {
  value: boolean
  onChange: (val: boolean) => void
}
const Toggle: React.FC<ToggleProps> = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-150 focus:outline-none ${value ? 'bg-[#2878D0]' : 'bg-[#22262B] border border-[#30343A]'}`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transform transition-transform duration-150 ${value ? 'translate-x-4' : 'translate-x-0.5'} mt-0.5`}
    />
  </button>
)

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore()
  const { status } = useTelemetryStore()
  const [savedNotice, setSavedNotice] = useState(false)
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null)
  const [paths, setPaths] = useState<AppPathsInfo | null>(null)
  const [autostart, setAutostart] = useState<AutostartStatus | null>(null)
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [webviewStatus, setWebviewStatus] = useState<string>('Checking...')

  // Action status messages
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [confirmClearHistory, setConfirmClearHistory] = useState(false)

  const refreshAll = async () => {
    try {
      const [diag, p, auto, b, wv] = await Promise.all([
        telemetryService.getDiagnostics(),
        telemetryService.getAppPaths(),
        telemetryService.getAutostartInfo(),
        telemetryService.listBackups(),
        telemetryService.checkWebViewRuntime(),
      ])
      if (diag) setDiagnostics(diag)
      if (p) setPaths(p)
      if (auto) setAutostart(auto)
      setBackups(b)
      setWebviewStatus(wv)
    } catch (err) {
      console.warn('Failed to refresh settings info:', err)
    }
  }

  useEffect(() => {
    refreshAll()
    const timer = setInterval(refreshAll, 6000)
    return () => clearInterval(timer)
  }, [])

  const triggerSaveNotice = (msg?: string) => {
    setSavedNotice(true)
    if (msg) setActionNotice(msg)
    setTimeout(() => {
      setSavedNotice(false)
      if (msg) setActionNotice(null)
    }, 3000)
  }

  const handleToggleAutostart = async (enable: boolean) => {
    try {
      await telemetryService.setAutostartEnabled(enable)
      updateSettings({ autostart_enabled: enable })
      await refreshAll()
      triggerSaveNotice(enable ? 'Enabled Windows startup launch' : 'Disabled Windows startup launch')
    } catch (err: any) {
      setActionNotice(`Autostart error: ${err?.message || err}`)
    }
  }

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true)
      const filename = await telemetryService.createBackup()
      await refreshAll()
      triggerSaveNotice(`Created database backup: ${filename}`)
    } catch (err: any) {
      setActionNotice(`Backup failed: ${err?.message || err}`)
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to restore "${filename}"? Current telemetry will be replaced by the backup snapshot.`)) {
      return
    }
    try {
      setIsRestoring(true)
      await telemetryService.restoreBackup(filename)
      await refreshAll()
      triggerSaveNotice(`Database restored from ${filename}`)
    } catch (err: any) {
      setActionNotice(`Restore failed: ${err?.message || err}`)
    } finally {
      setIsRestoring(false)
    }
  }

  const handleClearCache = async () => {
    try {
      setIsClearingCache(true)
      const freed = await telemetryService.clearCache()
      await refreshAll()
      triggerSaveNotice(`Cache cleared (${formatBytes(freed)} freed)`)
    } catch (err: any) {
      setActionNotice(`Clear cache error: ${err?.message || err}`)
    } finally {
      setIsClearingCache(false)
    }
  }

  const handleClearHistory = async () => {
    try {
      const res = await telemetryService.clearHistory()
      setConfirmClearHistory(false)
      await refreshAll()
      triggerSaveNotice(`Deleted ${res.deleted_events} events and ${res.deleted_snapshots} snapshots.`)
    } catch (err: any) {
      setActionNotice(`Purge error: ${err?.message || err}`)
    }
  }

  return (
    <ErrorBoundary fallbackTitle="Settings Error">
      <div className="space-y-4 max-w-4xl pb-10">
        {/* Settings Header Bar */}
        <div className="flex items-center justify-between bg-[#17191C] p-3 rounded-lg border border-[#30343A]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#2878D0]/15 border border-[#2878D0]/30 flex items-center justify-center text-[#2878D0]">
              <Settings className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-semibold text-xs text-[#E6E8EB] font-mono uppercase tracking-wider">
                System &amp; Telemetry Configuration
              </h2>
              <p className="text-[11px] text-[#9A9FA8] font-sans">
                All settings and telemetry are stored in AppData with zero cloud dependencies
              </p>
            </div>
          </div>

          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#35B879] font-mono">
              <Check className="w-3.5 h-3.5" />
              Settings Saved
            </span>
          )}
        </div>

        {actionNotice && (
          <div className="p-2.5 rounded-lg bg-[#2878D0]/15 border border-[#2878D0]/30 text-xs text-[#E6E8EB] font-mono flex items-center gap-2">
            <Check className="w-4 h-4 text-[#35B879] shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Startup Path Mismatch Alert */}
        {autostart?.path_mismatch && (
          <div className="p-3 rounded-lg bg-[#E4A83A]/15 border border-[#E4A83A]/40 text-xs font-mono text-[#E4A83A] space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Portable App Location Changed</span>
            </div>
            <p className="text-[11px] text-[#E6E8EB] font-sans">
              The Windows autostart registry entry currently points to an older location:{' '}
              <code className="text-[#E4A83A] bg-[#101113] px-1 py-0.5 rounded break-all">{autostart.registered_path}</code>
            </p>
            <button
              onClick={() => handleToggleAutostart(true)}
              className="px-3 py-1 bg-[#E4A83A] text-black font-bold rounded text-xs transition-colors"
            >
              Update Startup Path to Current Executable
            </button>
          </div>
        )}

        {/* 1. GENERAL APPLICATION SETTINGS */}
        <Card className="bg-[#17191C] border-[#30343A] space-y-3">
          <h3 className="text-xs font-mono font-semibold text-[#E6E8EB] uppercase tracking-wider flex items-center gap-2 border-b border-[#30343A] pb-2">
            <span className="border-l-2 border-[#2878D0] pl-2.5 flex items-center gap-2">
              <Power className="w-3.5 h-3.5 text-[#2878D0]" />
              General &amp; Desktop Lifecycle
            </span>
          </h3>

          <div className="space-y-0 text-xs font-mono">
            {/* Windows Startup */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#30343A]/40">
              <div>
                <span className="text-xs text-[#E6E8EB] font-medium block">Run at Windows Startup</span>
                <span className="text-[11px] text-[#9A9FA8] mt-0.5 font-sans block">
                  Launches AppTrace automatically when user logs in (HKCU Run registry, zero admin needed)
                </span>
                <span className="text-[10px] text-[#6E747D] uppercase mt-0.5 block">
                  {autostart?.enabled ? 'Active (HKCU)' : 'Disabled'}
                </span>
              </div>
              <Toggle value={Boolean(autostart?.enabled)} onChange={handleToggleAutostart} />
            </div>

            {/* Start Minimized */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#30343A]/40">
              <div>
                <span className="text-xs text-[#E6E8EB] font-medium block">Start Minimized</span>
                <span className="text-[11px] text-[#9A9FA8] mt-0.5 font-sans block">
                  Launch directly to the system tray without displaying the main window
                </span>
              </div>
              <Toggle
                value={settings.start_minimized}
                onChange={(v) => { updateSettings({ start_minimized: v }); triggerSaveNotice() }}
              />
            </div>

            {/* Minimize to Tray */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#30343A]/40">
              <div>
                <span className="text-xs text-[#E6E8EB] font-medium block">Minimize to System Tray</span>
                <span className="text-[11px] text-[#9A9FA8] mt-0.5 font-sans block">
                  Send window to system tray when the minimize button is clicked
                </span>
              </div>
              <Toggle
                value={settings.minimize_to_tray}
                onChange={(v) => { updateSettings({ minimize_to_tray: v }); triggerSaveNotice() }}
              />
            </div>

            {/* Close to Tray */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#30343A]/40">
              <div>
                <span className="text-xs text-[#E6E8EB] font-medium block">Close to System Tray</span>
                <span className="text-[11px] text-[#9A9FA8] mt-0.5 font-sans block">
                  Keep AppTrace monitoring in the background when the window close button is pressed
                </span>
              </div>
              <Toggle
                value={settings.close_to_tray}
                onChange={(v) => { updateSettings({ close_to_tray: v }); triggerSaveNotice() }}
              />
            </div>

            {/* Theme & Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2.5">
              <div className="space-y-1">
                <span className="text-xs text-[#E6E8EB] font-medium block">Application Theme</span>
                <select
                  value={settings.theme}
                  onChange={(e) => {
                    updateSettings({ theme: e.target.value as any })
                    triggerSaveNotice()
                  }}
                  className="w-full bg-[#101113] border border-[#30343A] rounded-md px-2.5 py-1 text-xs text-[#E6E8EB] focus:border-[#2878D0] focus:outline-none"
                >
                  <option value="dark">Dark Graphite (Enterprise)</option>
                  <option value="system">System Default Theme</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[#E6E8EB] font-medium block">Language</span>
                <select
                  value={settings.language}
                  onChange={(e) => {
                    updateSettings({ language: e.target.value })
                    triggerSaveNotice()
                  }}
                  className="w-full bg-[#101113] border border-[#30343A] rounded-md px-2.5 py-1 text-xs text-[#E6E8EB] focus:border-[#2878D0] focus:outline-none"
                >
                  <option value="en">English (US)</option>
                  <option value="pl">Polski (PL)</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* 2. MONITORING COLLECTORS CONFIGURATION */}
        <Card className="bg-[#17191C] border-[#30343A] space-y-3">
          <h3 className="text-xs font-mono font-semibold text-[#E6E8EB] uppercase tracking-wider flex items-center gap-2 border-b border-[#30343A] pb-2">
            <span className="border-l-2 border-[#2878D0] pl-2.5 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#35B879]" />
              Telemetry Engine &amp; Collectors
            </span>
          </h3>

          <div className="space-y-0 text-xs font-mono">
            {/* Auto-start monitoring */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#30343A]/40">
              <div>
                <span className="text-xs text-[#E6E8EB] font-medium block">Auto-start Monitoring on Launch</span>
                <span className="text-[11px] text-[#9A9FA8] mt-0.5 font-sans block">
                  Begin telemetry sampling immediately when the app starts
                </span>
              </div>
              <Toggle
                value={settings.auto_start_monitoring}
                onChange={(v) => { updateSettings({ auto_start_monitoring: v }); triggerSaveNotice() }}
              />
            </div>

            {/* Collectors Toggles */}
            <div className="py-2.5 border-b border-[#30343A]/40">
              <span className="text-xs text-[#E6E8EB] font-medium block mb-2">Active Telemetry Collectors</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center justify-between p-2 rounded bg-[#101113] border border-[#30343A] cursor-pointer">
                  <span className="text-xs text-[#E6E8EB] font-medium">Process Hierarchy Collector</span>
                  <Toggle
                    value={settings.process_monitoring}
                    onChange={(v) => { updateSettings({ process_monitoring: v }); triggerSaveNotice() }}
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded bg-[#101113] border border-[#30343A] cursor-pointer">
                  <span className="text-xs text-[#E6E8EB] font-medium">Network Sockets (IP Helper)</span>
                  <Toggle
                    value={settings.network_monitoring}
                    onChange={(v) => { updateSettings({ network_monitoring: v }); triggerSaveNotice() }}
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded bg-[#101113] border border-[#30343A] cursor-pointer">
                  <span className="text-xs text-[#E6E8EB] font-medium">Filesystem Tree Watcher</span>
                  <Toggle
                    value={settings.filesystem_monitoring}
                    onChange={(v) => { updateSettings({ filesystem_monitoring: v }); triggerSaveNotice() }}
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded bg-[#101113] border border-[#30343A] cursor-pointer">
                  <span className="text-xs text-[#E6E8EB] font-medium">Hardware &amp; System Metrics</span>
                  <Toggle
                    value={settings.metrics_monitoring}
                    onChange={(v) => { updateSettings({ metrics_monitoring: v }); triggerSaveNotice() }}
                  />
                </label>
              </div>
            </div>

            {/* Polling Interval & Retention */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2.5 border-b border-[#30343A]/40">
              <div className="space-y-1">
                <span className="text-xs text-[#E6E8EB] font-medium block">Telemetry Sampling Interval</span>
                <select
                  value={settings.polling_interval_ms}
                  onChange={(e) => {
                    updateSettings({ polling_interval_ms: Number(e.target.value) })
                    triggerSaveNotice()
                  }}
                  className="w-full bg-[#101113] border border-[#30343A] rounded-md px-2.5 py-1 text-xs text-[#E6E8EB] focus:border-[#2878D0] focus:outline-none"
                >
                  <option value={500}>500 ms (High Precision)</option>
                  <option value={1000}>1000 ms (Balanced - Recommended)</option>
                  <option value={2000}>2000 ms (Low Overhead)</option>
                  <option value={5000}>5000 ms (Minimal Resource Usage)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[#E6E8EB] font-medium block">Data Retention Window</span>
                <select
                  value={settings.retention_days}
                  onChange={(e) => {
                    updateSettings({ retention_days: Number(e.target.value) })
                    triggerSaveNotice()
                  }}
                  className="w-full bg-[#101113] border border-[#30343A] rounded-md px-2.5 py-1 text-xs text-[#E6E8EB] focus:border-[#2878D0] focus:outline-none"
                >
                  <option value={3}>3 Days (Compact)</option>
                  <option value={7}>7 Days (Standard)</option>
                  <option value={14}>14 Days (Extended)</option>
                  <option value={30}>30 Days (Maximum)</option>
                </select>
              </div>
            </div>

            {/* Redaction */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#30343A]/40">
              <div>
                <span className="text-xs text-[#E6E8EB] font-medium block">Sensitive Parameter Redaction</span>
                <span className="text-[11px] text-[#9A9FA8] mt-0.5 font-sans block">
                  Automatically mask passwords, private tokens, and keys in memory before persistence
                </span>
              </div>
              <Toggle
                value={settings.enable_redaction}
                onChange={(v) => { updateSettings({ enable_redaction: v }); triggerSaveNotice() }}
              />
            </div>

            {/* Alert Thresholds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2.5">
              <div className="space-y-1">
                <span className="text-xs text-[#E6E8EB] font-medium block">High CPU Alert Threshold</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="50"
                    max="98"
                    value={settings.high_cpu_threshold}
                    onChange={(e) => updateSettings({ high_cpu_threshold: Number(e.target.value) })}
                    className="w-full accent-[#2878D0]"
                  />
                  <span className="text-[#2878D0] font-bold w-10 text-right">{settings.high_cpu_threshold}%</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[#E6E8EB] font-medium block">High Memory Alert Threshold</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="50"
                    max="98"
                    value={settings.high_memory_threshold}
                    onChange={(e) => updateSettings({ high_memory_threshold: Number(e.target.value) })}
                    className="w-full accent-[#2878D0]"
                  />
                  <span className="text-[#38bdf8] font-bold w-10 text-right">{settings.high_memory_threshold}%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 3. LOCAL APPDATA STORAGE & DATABASE ENGINE */}
        <Card className="bg-[#17191C] border-[#30343A] space-y-3">
          <div className="flex items-center justify-between border-b border-[#30343A] pb-2">
            <h3 className="text-xs font-mono font-semibold text-[#E6E8EB] uppercase tracking-wider flex items-center gap-2">
              <span className="border-l-2 border-[#2878D0] pl-2.5 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-[#2878D0]" />
                AppData Storage &amp; SQLite Persistence
              </span>
            </h3>
            <button
              onClick={refreshAll}
              className="text-[#9A9FA8] hover:text-[#E6E8EB] text-xs font-mono flex items-center gap-1 hover:bg-[#22262B] rounded p-1 transition-colors"
              title="Refresh database metrics"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Directory Locations */}
          {paths && (
            <div className="space-y-1.5 text-xs font-mono bg-[#101113] p-2.5 rounded border border-[#30343A]">
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#6E747D] uppercase block">SQLite Database File (%LOCALAPPDATA%):</span>
                <code className="text-[#E6E8EB] break-all text-[11px] block">{paths.database_file}</code>
              </div>
              <div className="space-y-0.5 pt-1 border-t border-[#30343A]/50">
                <span className="text-[10px] text-[#6E747D] uppercase block">User Configuration JSON:</span>
                <code className="text-[#9A9FA8] break-all text-[11px] block">{paths.settings_file}</code>
              </div>
              <div className="space-y-0.5 pt-1 border-t border-[#30343A]/50">
                <span className="text-[10px] text-[#6E747D] uppercase block">Backups Directory:</span>
                <code className="text-[#6E747D] break-all text-[11px] block">{paths.backups_dir}</code>
              </div>
            </div>
          )}

          {/* Live Storage Metrics */}
          {diagnostics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-[#101113] border border-[#30343A]">
                <span className="text-[10px] text-[#6E747D] block uppercase">DB Size</span>
                <span className="font-bold text-[#E6E8EB]">
                  {formatBytes((diagnostics.db_stats || diagnostics.database)?.file_size_bytes ?? 0)}
                </span>
              </div>
              <div className="p-2 rounded bg-[#101113] border border-[#30343A]">
                <span className="text-[10px] text-[#6E747D] block uppercase">Stored Events</span>
                <span className="font-bold text-[#2878D0]">
                  {((diagnostics.db_stats || diagnostics.database)?.total_events ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="p-2 rounded bg-[#101113] border border-[#30343A]">
                <span className="text-[10px] text-[#6E747D] block uppercase">Queue Drops</span>
                <span className="font-bold text-[#35B879]">
                  {diagnostics.dispatcher_drop_count ?? diagnostics.event_drop_count ?? 0}
                </span>
              </div>
              <div className="p-2 rounded bg-[#101113] border border-[#30343A]">
                <span className="text-[10px] text-[#6E747D] block uppercase">Process RSS</span>
                <span className="font-bold text-[#38bdf8]">
                  {formatBytes(diagnostics.app_memory_rss_bytes ?? 0)}
                </span>
              </div>
            </div>
          )}

          {/* Database Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#30343A]/50">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              icon={<FolderArchive className="w-3 h-3 text-[#2878D0]" />}
            >
              {isBackingUp ? 'Creating Backup...' : 'Create Backup'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearCache}
              disabled={isClearingCache}
              icon={<Trash2 className="w-3 h-3 text-[#9A9FA8]" />}
            >
              {isClearingCache ? 'Clearing Cache...' : 'Clear Temp Cache'}
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmClearHistory(true)}
              icon={<Trash2 className="w-3 h-3" />}
              className="ml-auto"
            >
              Clear History
            </Button>
          </div>

          {/* Backups List */}
          {backups.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-[#30343A]/50">
              <span className="text-xs text-[#E6E8EB] font-medium block">
                Saved Database Snapshots ({backups.length})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {backups.map((b) => (
                  <div
                    key={b.filename}
                    className="flex items-center justify-between p-1.5 rounded bg-[#101113] border border-[#30343A] text-xs font-mono"
                  >
                    <div>
                      <span className="text-[#E6E8EB] block font-semibold">{b.filename}</span>
                      <span className="text-[10px] text-[#6E747D]">
                        {formatBytes(b.size_bytes)} • {new Date(b.created_at_secs * 1000).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRestoreBackup(b.filename)}
                      disabled={isRestoring}
                      icon={<RotateCcw className="w-3 h-3 text-[#2878D0]" />}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* 4. RUNTIME ENVIRONMENT */}
        <Card className="bg-[#17191C] border-[#30343A] space-y-2.5">
          <h3 className="text-xs font-mono font-semibold text-[#E6E8EB] uppercase tracking-wider flex items-center gap-2 border-b border-[#30343A] pb-2">
            <span className="border-l-2 border-[#2878D0] pl-2.5 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#2878D0]" />
              Runtime Environment &amp; Security
            </span>
          </h3>

          <div className="space-y-1.5 text-xs font-mono bg-[#101113] p-2.5 rounded border border-[#30343A]">
            <div className="flex justify-between">
              <span className="text-[#6E747D]">Operating System:</span>
              <span className="text-[#E6E8EB]">
                {status?.os_name} {status?.os_version} ({status?.architecture})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E747D]">WebView2 Runtime:</span>
              <span className="text-[#35B879] font-mono text-[11px]">{webviewStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E747D]">Persistence Engine:</span>
              <span className="text-[#E6E8EB]">Embedded SQLite 3 (WAL mode, PRAGMA synchronous = NORMAL)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6E747D]">Privilege Level:</span>
              <span className="text-[#E6E8EB]">
                {status?.is_elevated ? 'Elevated (Administrator)' : 'Standard User (Unprivileged - Recommended)'}
              </span>
            </div>
          </div>
        </Card>

        {/* Confirmation Modal for Clearing History */}
        <Modal
          isOpen={confirmClearHistory}
          onClose={() => setConfirmClearHistory(false)}
          title="Confirm Historical Telemetry Purge"
        >
          <div className="space-y-3 text-xs font-mono">
            <p className="text-[#E6E8EB] font-sans">
              This will permanently erase all captured event records and metrics snapshots from the local SQLite
              database in AppData.
            </p>
            <p className="text-[#E4A83A] font-sans">
              Your saved dashboards, custom widget layouts, and application settings will be preserved intact.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmClearHistory(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleClearHistory}>
                Confirm &amp; Purge Telemetry
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ErrorBoundary>
  )
}
