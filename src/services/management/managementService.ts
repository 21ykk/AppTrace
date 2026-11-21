import { invoke } from '@tauri-apps/api/core';
import type {
  AppDetails,
  CleanableCategory,
  CleanableItem,
  DiskUsageItem,
  DuplicateGroup,
  HealthCheckItem,
  HunterResult,
  InstalledApp,
  LeftoverItem,
  ManagementCapabilities,
  OperationHistoryEntry,
  OptimizationRecommendation,
  RegistryKeyNode,
  ScheduledTaskInfo,
  ServiceInfo,
  StartupEntry,
  SystemHealthReport,
  UninstallPlan,
} from '../../types/management';

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export class ManagementService {
  public static async getCapabilities(): Promise<ManagementCapabilities> {
    if (!isTauri()) {
      return {
        platform: 'windows',
        has_registry_manager: true,
        has_linux_config_manager: false,
        has_services_manager: true,
        has_scheduled_tasks_manager: true,
        has_startup_manager: true,
        has_uninstaller: true,
        has_cleaner: true,
        has_disk_analyzer: true,
        has_duplicate_finder: true,
        has_system_optimizer: true,
        has_health_center: true,
      };
    }
    return invoke<ManagementCapabilities>('get_management_capabilities');
  }

  // --- Applications & Uninstaller ---
  public static async getInstalledApps(): Promise<InstalledApp[]> {
    if (!isTauri()) return [];
    return invoke<InstalledApp[]>('get_installed_apps');
  }

  public static async getAppDetails(appId: string): Promise<AppDetails> {
    return invoke<AppDetails>('get_app_details', { appId });
  }

  public static async getUninstallPlan(appId: string): Promise<UninstallPlan> {
    return invoke<UninstallPlan>('get_uninstall_plan', { appId });
  }

  public static async executeUninstallPlan(
    appId: string,
    forceKillProcesses: boolean,
    runOriginalUninstaller: boolean,
    removeLeftovers: boolean
  ): Promise<string> {
    return invoke<string>('execute_uninstall_plan', {
      appId,
      forceKillProcesses,
      runOriginalUninstaller,
      removeLeftovers,
    });
  }

  public static async scanAppLeftovers(appId: string): Promise<LeftoverItem[]> {
    return invoke<LeftoverItem[]>('scan_app_leftovers', { appId });
  }

  public static async deleteLeftovers(items: LeftoverItem[]): Promise<[number, number]> {
    return invoke<[number, number]>('delete_leftovers', { items });
  }

  // --- Startup ---
  public static async getStartupEntries(): Promise<StartupEntry[]> {
    if (!isTauri()) return [];
    return invoke<StartupEntry[]>('get_startup_entries');
  }

  public static async setStartupEntryEnabled(entryId: string, enabled: boolean): Promise<void> {
    return invoke<void>('set_startup_entry_enabled', { entryId, enabled });
  }

  // --- Services ---
  public static async getSystemServices(): Promise<ServiceInfo[]> {
    if (!isTauri()) return [];
    return invoke<ServiceInfo[]>('get_system_services');
  }

  public static async startSystemService(serviceName: string): Promise<void> {
    return invoke<void>('start_system_service', { serviceName });
  }

  public static async stopSystemService(serviceName: string): Promise<void> {
    return invoke<void>('stop_system_service', { serviceName });
  }

  // --- Scheduled Tasks ---
  public static async getScheduledTasks(): Promise<ScheduledTaskInfo[]> {
    if (!isTauri()) return [];
    return invoke<ScheduledTaskInfo[]>('get_scheduled_tasks');
  }

  public static async setScheduledTaskEnabled(
    taskPath: string,
    taskName: string,
    enabled: boolean
  ): Promise<void> {
    return invoke<void>('set_scheduled_task_enabled', { taskPath, taskName, enabled });
  }

  // --- Registry & Config ---
  public static async getRegistryKeyNode(path: string): Promise<RegistryKeyNode> {
    if (!isTauri()) {
      return {
        key_path: path || 'HKEY_CURRENT_USER',
        name: path || 'HKCU',
        subkeys: ['Software', 'System', 'Environment'],
        values: [],
        can_write: false,
      };
    }
    return invoke<RegistryKeyNode>('get_registry_key_node', { path });
  }

  public static async searchRegistry(query: string, startPath?: string): Promise<string[]> {
    return invoke<string[]>('search_registry', { query, startPath });
  }

  public static async exportRegistryKey(keyPath: string): Promise<string> {
    return invoke<string>('export_registry_key', { keyPath });
  }

  public static async setRegistryValue(
    keyPath: string,
    valueName: string,
    valueData: string,
    valType: string
  ): Promise<void> {
    return invoke<void>('set_registry_value', {
      keyPath,
      valueName,
      valueData,
      valType,
    });
  }

  public static async deleteRegistryItem(keyPath: string, valueName?: string): Promise<void> {
    return invoke<void>('delete_registry_item', { keyPath, valueName });
  }

  // --- Cleaner ---
  public static async scanCleanableCategories(): Promise<CleanableCategory[]> {
    if (!isTauri()) return [];
    return invoke<CleanableCategory[]>('scan_cleanable_categories');
  }

  public static async executeCleaning(categoryIds: string[]): Promise<[number, number]> {
    return invoke<[number, number]>('execute_cleaning', { categoryIds });
  }

  // --- Disk Analyzer ---
  public static async analyzeDiskSpace(
    targetPath: string,
    maxDepth?: number
  ): Promise<DiskUsageItem> {
    return invoke<DiskUsageItem>('analyze_disk_space', { targetPath, maxDepth });
  }

  public static async getLargestFiles(
    targetPath: string,
    limit?: number
  ): Promise<CleanableItem[]> {
    return invoke<CleanableItem[]>('get_largest_files', { targetPath, limit });
  }

  // --- Duplicates ---
  public static async scanDuplicateFiles(
    targetPath: string,
    minSizeBytes?: number
  ): Promise<DuplicateGroup[]> {
    return invoke<DuplicateGroup[]>('scan_duplicate_files', { targetPath, minSizeBytes });
  }

  public static async deleteDuplicateFiles(filePaths: string[]): Promise<[number, number]> {
    return invoke<[number, number]>('delete_duplicate_files', { filePaths });
  }

  // --- Optimizer ---
  public static async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    if (!isTauri()) return [];
    return invoke<OptimizationRecommendation[]>('get_optimization_recommendations');
  }

  public static async executeOptimizationAction(actionId: string): Promise<string> {
    return invoke<string>('execute_optimization_action', { actionId });
  }

  // --- Health ---
  public static async getSystemHealthReport(): Promise<SystemHealthReport> {
    if (!isTauri()) {
      return {
        overall_score: 95,
        status: 'Healthy',
        timestamp_ns: Date.now() * 1000000,
        checks: [],
      };
    }
    return invoke<SystemHealthReport>('get_system_health_report');
  }

  // --- Hunter ---
  public static async huntSoftwareResources(query: string): Promise<HunterResult> {
    return invoke<HunterResult>('hunt_software_resources', { query });
  }

  // --- History ---
  public static async recordOperation(
    actionType: string,
    targetName: string,
    targetPath: string | null,
    status: 'Success' | 'Partial' | 'Failed',
    detailsJson: string,
    errorMessage?: string
  ): Promise<void> {
    if (!isTauri()) return;
    return invoke<void>('record_operation_history', {
      actionType,
      targetName,
      targetPath,
      status,
      detailsJson,
      errorMessage,
    });
  }

  public static async getOperationHistory(limit?: number): Promise<OperationHistoryEntry[]> {
    if (!isTauri()) return [];
    return invoke<OperationHistoryEntry[]>('get_operation_history', { limit });
  }
}
