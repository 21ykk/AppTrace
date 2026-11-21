import { useEffect, useState } from 'react'
import { AppSettings } from '../types/system'
import { telemetryService } from '../services/telemetry/telemetryService'

const SETTINGS_KEY = 'apptrace_settings_v2'

export const defaultSettings: AppSettings = {
  start_minimized: false,
  minimize_to_tray: true,
  close_to_tray: true,
  autostart_enabled: false,
  auto_start_monitoring: true,
  confirm_exit: false,
  theme: 'dark',
  language: 'en',

  process_monitoring: true,
  network_monitoring: true,
  filesystem_monitoring: true,
  metrics_monitoring: true,
  polling_interval_ms: 1000,
  retention_days: 7,
  enable_redaction: true,
  fs_watch_path: '',
  high_cpu_threshold: 90,
  high_memory_threshold: 90,
  max_timeline_events: 200,
}

let currentSettings: AppSettings = { ...defaultSettings }

try {
  const saved = localStorage.getItem(SETTINGS_KEY)
  if (saved) {
    currentSettings = { ...defaultSettings, ...JSON.parse(saved) }
  }
} catch {
  // Use defaults
}

// Fetch from Tauri backend on initialization
telemetryService.getAppSettings().then((backendSettings) => {
  if (backendSettings) {
    currentSettings = { ...defaultSettings, ...backendSettings }
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings))
    } catch {}
    notify()
  }
})

const listeners = new Set<() => void>()
function notify() {
  listeners.forEach((l) => l())
}

export function updateSettings(partial: Partial<AppSettings>) {
  currentSettings = { ...currentSettings, ...partial }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings))
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e)
  }

  // Persist to backend AppData settings.json
  telemetryService.saveAppSettings(currentSettings).catch((err) => {
    console.warn('Failed to save settings to backend:', err)
  })

  notify()
}

export function useSettingsStore() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((t) => t + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return {
    settings: currentSettings,
    updateSettings,
  }
}
