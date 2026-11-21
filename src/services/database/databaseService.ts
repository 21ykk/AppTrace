import { DashboardConfig } from '../../types/dashboard'
import { telemetryService } from '../telemetry/telemetryService'

export const databaseService = {
  async loadDashboards(): Promise<DashboardConfig[]> {
    return await telemetryService.getDashboards()
  },

  async persistDashboard(dash: DashboardConfig): Promise<void> {
    await telemetryService.saveDashboard(dash)
  },

  async removeDashboard(id: string): Promise<void> {
    await telemetryService.deleteDashboard(id)
  },

  async exportJson(id: string): Promise<string> {
    return await telemetryService.exportDashboard(id)
  },

  async importJson(json: string): Promise<DashboardConfig> {
    return await telemetryService.importDashboard(json)
  },
}
