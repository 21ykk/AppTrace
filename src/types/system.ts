export type NavigationTab =
  | 'overview'
  | 'live_monitor'
  | 'processes'
  | 'network'
  | 'filesystem'
  | 'dependency_graph'
  | 'timeline'
  | 'alerts'
  | 'analytics'
  | 'applications'
  | 'startup'
  | 'services'
  | 'scheduled_tasks'
  | 'registry'
  | 'cleaner'
  | 'disk_analyzer'
  | 'duplicates'
  | 'optimizer'
  | 'health'
  | 'hunter'
  | 'history'
  | 'settings'

export interface AppSettings {
  // General
  start_minimized: boolean
  minimize_to_tray: boolean
  close_to_tray: boolean
  autostart_enabled: boolean
  auto_start_monitoring: boolean
  confirm_exit: boolean
  theme: 'dark' | 'light' | 'system'
  language: string

  // Monitoring
  process_monitoring: boolean
  network_monitoring: boolean
  filesystem_monitoring: boolean
  metrics_monitoring: boolean
  polling_interval_ms: number
  retention_days: number
  enable_redaction: boolean
  fs_watch_path: string
  high_cpu_threshold: number
  high_memory_threshold: number
  max_timeline_events: number
}

export type SystemSettings = AppSettings

export interface AppPathsInfo {
  root_dir: string
  database_dir: string
  database_file: string
  logs_dir: string
  log_file: string
  cache_dir: string
  exports_dir: string
  backups_dir: string
  diagnostics_dir: string
  settings_file: string
}

export interface AutostartStatus {
  enabled: boolean
  registered_path: string | null
  current_executable: string
  path_mismatch: boolean
}

export interface BackupRecord {
  filename: string
  size_bytes: number
  created_at_secs: number
}
