export interface InstalledApp {
  id: string;
  name: string;
  publisher?: string;
  version?: string;
  install_date?: string;
  install_location?: string;
  uninstall_string?: string;
  quiet_uninstall_string?: string;
  estimated_size_bytes?: number;
  scope: 'User' | 'Machine';
  source: 'Registry' | 'Package' | 'Store' | 'Discovered';
  architecture: 'x86_64' | 'x86' | 'arm64';
  icon_path?: string;
  is_running: boolean;
  running_pids: number[];
}

export interface AppRelationship {
  resource_type: 'Process' | 'Service' | 'Startup' | 'Task' | 'File' | 'Registry';
  identifier: string;
  details: string;
  confidence: 'Confirmed' | 'High' | 'Probable' | 'Possible';
}

export interface AppDetails {
  app: InstalledApp;
  relationships: AppRelationship[];
  related_processes: number[];
  related_services: string[];
  related_startup_entries: string[];
  related_directories: string[];
  related_registry_keys: string[];
}

export interface LeftoverItem {
  id: string;
  item_type: 'Directory' | 'File' | 'RegistryKey' | 'RegistryValue' | 'Service' | 'Startup';
  path: string;
  size_bytes?: number;
  confidence: 'Verified' | 'Likely' | 'Uncertain' | 'SystemProtected';
  is_shared: boolean;
  is_safe_to_delete: boolean;
  selected: boolean;
}

export interface UninstallPlan {
  app_id: string;
  app_name: string;
  uninstall_command?: string;
  is_quiet_supported: boolean;
  processes_to_kill: number[];
  potential_leftovers: LeftoverItem[];
  safety_level: 'Safe' | 'Warning' | 'Blocked';
  warnings: string[];
}

export interface StartupEntry {
  id: string;
  name: string;
  command: string;
  location: string;
  enabled: boolean;
  publisher?: string;
  exe_path?: string;
  arguments?: string;
  impact: 'Low' | 'Medium' | 'High' | 'Unknown';
}

export interface ServiceInfo {
  name: string;
  display_name: string;
  status: 'Running' | 'Stopped' | 'Paused' | 'Unknown';
  startup_type: 'Automatic' | 'Manual' | 'Disabled' | 'Unknown';
  bin_path?: string;
  account?: string;
  can_control: boolean;
}

export interface ScheduledTaskInfo {
  name: string;
  path: string;
  state: string;
  trigger_summary: string;
  action_summary: string;
  next_run_time?: string;
  author?: string;
}

export interface RegistryValueItem {
  name: string;
  val_type: string;
  data_preview: string;
  size_bytes: number;
}

export interface RegistryKeyNode {
  key_path: string;
  name: string;
  subkeys: string[];
  values: RegistryValueItem[];
  can_write: boolean;
}

export interface CleanableItem {
  path: string;
  size_bytes: number;
  description: string;
}

export interface CleanableCategory {
  id: string;
  title: string;
  description: string;
  detected_bytes: number;
  file_count: number;
  items: CleanableItem[];
  is_safe_by_default: boolean;
}

export interface DiskUsageItem {
  path: string;
  name: string;
  is_dir: boolean;
  size_bytes: number;
  item_count: number;
  children: DiskUsageItem[];
}

export interface DuplicateGroup {
  id: string;
  file_size: number;
  sha256_hash: string;
  original_path: string;
  duplicate_paths: string[];
}

export interface OptimizationRecommendation {
  id: string;
  title: string;
  category: 'Startup' | 'Memory' | 'Disk' | 'Background' | 'Health';
  description: string;
  evidence: string;
  expected_effect: string;
  risk_level: 'None' | 'Low' | 'Medium';
  action_id: string;
  can_auto_execute: boolean;
}

export interface HealthCheckItem {
  id: string;
  title: string;
  category: 'Storage' | 'Memory' | 'Service' | 'Process' | 'Security';
  status: 'Pass' | 'Warn' | 'Fail';
  details: string;
  actionable: boolean;
}

export interface SystemHealthReport {
  overall_score: number;
  status: 'Healthy' | 'Attention' | 'Degraded';
  timestamp_ns: number;
  checks: HealthCheckItem[];
}

export interface OperationHistoryEntry {
  operation_id: string;
  timestamp_ns: number;
  action_type: string;
  target_name: string;
  target_path?: string;
  status: 'Success' | 'Partial' | 'Failed';
  details_json: string;
  error_message?: string;
}

export interface HunterResult {
  query: string;
  installed_matches: InstalledApp[];
  running_matches: number[];
  filesystem_matches: string[];
  registry_matches: string[];
  service_matches: string[];
  startup_matches: string[];
}

export interface ManagementCapabilities {
  platform: 'windows' | 'linux';
  has_registry_manager: boolean;
  has_linux_config_manager: boolean;
  has_services_manager: boolean;
  has_scheduled_tasks_manager: boolean;
  has_startup_manager: boolean;
  has_uninstaller: boolean;
  has_cleaner: boolean;
  has_disk_analyzer: boolean;
  has_duplicate_finder: boolean;
  has_system_optimizer: boolean;
  has_health_center: boolean;
}
