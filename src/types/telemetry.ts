export type CollectorCategory =
  | 'Process'
  | 'Network'
  | 'Filesystem'
  | 'SystemMetrics'
  | 'Health'

export type SupportLevel =
  | { status: 'Full' }
  | { status: 'Degraded'; details: { reason: string } }
  | { status: 'PermissionRequired'; details: { missing_permission: string } }
  | { status: 'Unavailable'; details: { reason: string } }

export interface CapabilityStatus {
  category: CollectorCategory
  level: SupportLevel
  collection_mechanism: string
  is_elevated: boolean
  limitations: string[]
}

export interface SystemTelemetryStatus {
  os_name: string
  os_version: string
  kernel_version: string | null
  architecture: string
  is_elevated: boolean
  active_backend: string
  capabilities: CapabilityStatus[]
  event_drop_count: number
  buffer_utilization_pct: number
  collection_active: boolean
  monitored_fs_path: string | null
}

export interface DiskMetric {
  name: string
  mount_point: string
  total_bytes: number
  available_bytes: number
  is_removable: boolean
}

export interface NetworkInterfaceMetric {
  name: string
  mac_address: string
  rx_bytes_sec: number
  tx_bytes_sec: number
  total_rx_bytes: number
  total_tx_bytes: number
}

export interface DatabaseStats {
  file_size_bytes: number
  total_events: number
  total_snapshots: number
  total_alerts: number
  db_path: string
}

export interface SystemDiagnostics {
  db_stats: DatabaseStats
  database?: DatabaseStats
  db_integrity_status: string
  dispatcher_queue_capacity: number
  dispatcher_drop_count: number
  event_drop_count?: number
  buffer_utilization_pct?: number
  app_memory_rss_bytes: number
  active_threads_count?: number
  uptime_seconds: number
  persistence_failures_count?: number
}

export interface SystemMetrics {
  timestamp_ns: number
  cpu_usage_pct: number
  per_core_cpu: number[]
  memory_used_bytes: number
  memory_total_bytes: number
  memory_available_bytes: number
  swap_used_bytes: number
  swap_total_bytes: number
  disks: DiskMetric[]
  interfaces?: NetworkInterfaceMetric[]
  net_bytes_rx_sec: number
  net_bytes_tx_sec: number
  total_processes: number
}

export interface ProcessInfo {
  pid: number
  ppid: number | null
  name: string
  exe_path: string
  cmd: string[]
  cpu_usage: number
  memory_bytes: number
  virtual_memory_bytes: number
  status: string
  start_time: number
  user_id: string | null
  disk_read_bytes: number
  disk_written_bytes: number
}

export interface NetworkConnection {
  protocol: string
  local_addr: string
  local_port: number
  remote_addr: string
  remote_port: number
  state: string
  pid: number | null
  process_name: string | null
}

export interface FilesystemEventRecord {
  id: string
  timestamp_ns: number
  path: string
  action: 'CREATE' | 'MODIFY' | 'DELETE' | 'RENAME' | 'OTHER' | string
  is_directory: boolean
  details: string | null
}

export interface NormalizedEvent {
  event_id: string
  timestamp_ns: number
  category: string
  severity: string
  pid: number | null
  process_name: string | null
  summary: string
  payload_json: string
}

export interface AlertRecord {
  id: string
  timestamp_ns: number
  severity: 'info' | 'warning' | 'critical'
  category: string
  title: string
  message: string
  source: string
  acknowledged: boolean
}
