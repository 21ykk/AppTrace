import { invoke } from '@tauri-apps/api/core'
import { DashboardConfig } from '../../types/dashboard'
import {
  AlertRecord,
  FilesystemEventRecord,
  NetworkConnection,
  NormalizedEvent,
  ProcessInfo,
  SystemMetrics,
  SystemTelemetryStatus,
} from '../../types/telemetry'

// Safe invoke wrapper for Tauri 2
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      return await invoke<T>(cmd, args)
    }
  } catch (err) {
    console.warn(`[Tauri invoke error on ${cmd}]`, err)
  }

  throw new Error(`Tauri core is unavailable or command ${cmd} failed.`)
}

export const telemetryService = {
  async getStatus(): Promise<SystemTelemetryStatus> {
    try {
      return await safeInvoke<SystemTelemetryStatus>('get_telemetry_status')
    } catch {
      // Return clear unavailable state if running outside Tauri
      return {
        os_name: 'Native Environment (Probing...)',
        os_version: 'Unknown',
        kernel_version: null,
        architecture: 'x86_64',
        is_elevated: false,
        active_backend: 'Connecting to Tauri Telemetry Engine...',
        capabilities: [],
        event_drop_count: 0,
        buffer_utilization_pct: 0,
        collection_active: false,
        monitored_fs_path: null,
      }
    }
  },

  async getMetrics(): Promise<SystemMetrics | null> {
    try {
      return await safeInvoke<SystemMetrics>('get_system_metrics')
    } catch {
      return null
    }
  },

  async getProcesses(): Promise<ProcessInfo[]> {
    try {
      return await safeInvoke<ProcessInfo[]>('get_processes')
    } catch {
      return []
    }
  },

  async getConnections(): Promise<NetworkConnection[]> {
    try {
      return await safeInvoke<NetworkConnection[]>('get_network_connections')
    } catch {
      return []
    }
  },

  async getFilesystemEvents(limit = 100): Promise<FilesystemEventRecord[]> {
    try {
      return await safeInvoke<FilesystemEventRecord[]>('get_filesystem_events', { limit })
    } catch {
      return []
    }
  },

  async getTimeline(limit = 100, offset = 0, category?: string): Promise<NormalizedEvent[]> {
    try {
      return await safeInvoke<NormalizedEvent[]>('get_event_timeline', { limit, offset, category })
    } catch {
      return []
    }
  },

  async getAlerts(): Promise<AlertRecord[]> {
    try {
      return await safeInvoke<AlertRecord[]>('get_alerts')
    } catch {
      return []
    }
  },

  async acknowledgeAlert(alertId: string): Promise<void> {
    await safeInvoke('acknowledge_alert', { alertId })
  },

  async startMonitoring(): Promise<boolean> {
    return await safeInvoke<boolean>('start_monitoring')
  },

  async stopMonitoring(): Promise<boolean> {
    return await safeInvoke<boolean>('stop_monitoring')
  },

  async isMonitoringActive(): Promise<boolean> {
    return await safeInvoke<boolean>('is_monitoring_active')
  },

  async setWatchPath(path: string): Promise<void> {
    await safeInvoke('set_fs_watch_path', { path })
  },

  async getDashboards(): Promise<DashboardConfig[]> {
    try {
      return await safeInvoke<DashboardConfig[]>('get_dashboards')
    } catch {
      return []
    }
  },

  async saveDashboard(config: DashboardConfig): Promise<void> {
    await safeInvoke('save_dashboard', { config })
  },

  async deleteDashboard(id: string): Promise<void> {
    await safeInvoke('delete_dashboard', { id })
  },

  async exportDashboard(id: string): Promise<string> {
    return await safeInvoke<string>('export_dashboard', { id })
  },

  async importDashboard(json: string): Promise<DashboardConfig> {
    return await safeInvoke<DashboardConfig>('import_dashboard', { json })
  },

  async getDiagnostics(): Promise<import('../../types/telemetry').SystemDiagnostics | null> {
    try {
      return await safeInvoke<import('../../types/telemetry').SystemDiagnostics>('get_system_diagnostics')
    } catch {
      return null
    }
  },

  async exportCsv(category?: string, limit?: number): Promise<string> {
    return await safeInvoke<string>('export_telemetry_csv', { category, limit: limit ?? 5000 })
  },

  async purgeRetention(maxAgeDays?: number): Promise<{ deleted_events: number; deleted_snapshots: number }> {
    const hours = (maxAgeDays ?? 7) * 24
    const res = await safeInvoke<any>('purge_retention_data', {
      maxAgeHours: hours,
    })
    if (Array.isArray(res)) {
      return { deleted_events: res[0] ?? 0, deleted_snapshots: res[1] ?? 0 }
    }
    return { deleted_events: res?.deleted_events ?? 0, deleted_snapshots: res?.deleted_snapshots ?? 0 }
  },

  async getAppSettings(): Promise<import('../../types/system').AppSettings | null> {
    try {
      return await safeInvoke<import('../../types/system').AppSettings>('get_app_settings')
    } catch {
      return null
    }
  },

  async saveAppSettings(settings: import('../../types/system').AppSettings): Promise<void> {
    await safeInvoke('save_app_settings', { settings })
  },

  async getAppPaths(): Promise<import('../../types/system').AppPathsInfo | null> {
    try {
      return await safeInvoke<import('../../types/system').AppPathsInfo>('get_app_paths')
    } catch {
      return null
    }
  },

  async getAutostartInfo(): Promise<import('../../types/system').AutostartStatus | null> {
    try {
      return await safeInvoke<import('../../types/system').AutostartStatus>('get_autostart_info')
    } catch {
      return null
    }
  },

  async setAutostartEnabled(enable: boolean): Promise<void> {
    await safeInvoke('set_autostart_enabled', { enable })
  },

  async createBackup(): Promise<string> {
    return await safeInvoke<string>('create_database_backup')
  },

  async restoreBackup(backupFilename: string): Promise<void> {
    await safeInvoke('restore_database_backup', { backupFilename })
  },

  async listBackups(): Promise<import('../../types/system').BackupRecord[]> {
    try {
      return await safeInvoke<import('../../types/system').BackupRecord[]>('list_database_backups')
    } catch {
      return []
    }
  },

  async clearCache(): Promise<number> {
    try {
      return await safeInvoke<number>('clear_cache_data')
    } catch {
      return 0
    }
  },

  async clearHistory(): Promise<{ deleted_events: number; deleted_snapshots: number }> {
    const res = await safeInvoke<any>('clear_telemetry_history')
    if (Array.isArray(res)) {
      return { deleted_events: res[0] ?? 0, deleted_snapshots: res[1] ?? 0 }
    }
    return { deleted_events: res?.deleted_events ?? 0, deleted_snapshots: res?.deleted_snapshots ?? 0 }
  },

  async checkWebViewRuntime(): Promise<string> {
    try {
      return await safeInvoke<string>('check_webview_runtime')
    } catch (e: any) {
      return e?.message || 'WebView2 runtime check failed'
    }
  },

  async terminateProcess(pid: number): Promise<void> {
    await safeInvoke('terminate_process', { pid })
  },

  async openProcessDirectory(exePath: string): Promise<void> {
    await safeInvoke('open_process_directory', { exePath })
  },
}
