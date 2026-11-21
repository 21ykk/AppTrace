import { telemetryService } from '../telemetry/telemetryService'

export const systemService = {
  async setWatchDirectory(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      await telemetryService.setWatchPath(path)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async toggleMonitoring(enable: boolean): Promise<boolean> {
    if (enable) {
      return await telemetryService.startMonitoring()
    } else {
      return await telemetryService.stopMonitoring()
    }
  },
}
