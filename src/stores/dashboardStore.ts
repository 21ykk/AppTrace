import { useEffect, useState } from 'react'
import { databaseService } from '../services/database/databaseService'
import { DashboardConfig, WidgetConfig } from '../types/dashboard'

interface DashboardState {
  dashboards: DashboardConfig[]
  activeDashboardId: string
  activeDashboard: DashboardConfig | null
  isEditing: boolean
  isLoading: boolean
  error: string | null
}

const defaultDashboardPreset: DashboardConfig = {
  id: 'dash-default',
  name: 'Overview Dashboard',
  description: 'Standard system telemetry overview with CPU, memory, network, and event feed',
  is_default: true,
  created_at: Date.now(),
  updated_at: Date.now(),
  widgets: [
    { id: 'w-cpu', type_id: 'cpu_monitor', title: 'CPU Monitor', x: 0, y: 0, w: 4, h: 2, visible: true, settings: {} },
    { id: 'w-mem', type_id: 'memory_monitor', title: 'Memory Monitor', x: 4, y: 0, w: 4, h: 2, visible: true, settings: {} },
    { id: 'w-net-traffic', type_id: 'network_traffic', title: 'Network Traffic', x: 8, y: 0, w: 4, h: 2, visible: true, settings: {} },
    { id: 'w-sys-health', type_id: 'system_health', title: 'System Telemetry Health', x: 0, y: 2, w: 6, h: 2, visible: true, settings: {} },
    { id: 'w-storage', type_id: 'storage_monitor', title: 'Storage Volumes', x: 6, y: 2, w: 6, h: 2, visible: true, settings: {} },
    { id: 'w-proc-top', type_id: 'top_applications', title: 'Top Resource Consumers', x: 0, y: 4, w: 6, h: 3, visible: true, settings: {} },
    { id: 'w-conn', type_id: 'connection_monitor', title: 'Active Connections', x: 6, y: 4, w: 6, h: 3, visible: true, settings: {} },
    { id: 'w-timeline', type_id: 'event_timeline', title: 'Event Timeline Feed', x: 0, y: 7, w: 12, h: 3, visible: true, settings: {} },
  ],
}

let state: DashboardState = {
  dashboards: [defaultDashboardPreset],
  activeDashboardId: 'dash-default',
  activeDashboard: defaultDashboardPreset,
  isEditing: false,
  isLoading: false,
  error: null,
}

const listeners = new Set<() => void>()
function notify() {
  listeners.forEach((l) => l())
}

export async function loadSavedDashboards() {
  state = { ...state, isLoading: true }
  notify()

  try {
    const list = await databaseService.loadDashboards()
    if (list.length > 0) {
      const active = list.find((d) => d.is_default) || list[0]
      state = {
        ...state,
        dashboards: list,
        activeDashboardId: active.id,
        activeDashboard: active,
        isLoading: false,
      }
    } else {
      state = {
        ...state,
        dashboards: [defaultDashboardPreset],
        activeDashboardId: defaultDashboardPreset.id,
        activeDashboard: defaultDashboardPreset,
        isLoading: false,
      }
      await databaseService.persistDashboard(defaultDashboardPreset)
    }
  } catch (err) {
    state = {
      ...state,
      isLoading: false,
      error: String(err),
    }
  }
  notify()
}

export function setActiveDashboard(id: string) {
  const found = state.dashboards.find((d) => d.id === id)
  if (found) {
    state = {
      ...state,
      activeDashboardId: id,
      activeDashboard: found,
    }
    notify()
  }
}

export function setEditingMode(editing: boolean) {
  state = { ...state, isEditing: editing }
  notify()
}

export async function updateWidgetConfig(widgetId: string, partial: Partial<WidgetConfig>) {
  if (!state.activeDashboard) return

  const updatedWidgets = state.activeDashboard.widgets.map((w) =>
    w.id === widgetId ? { ...w, ...partial } : w
  )

  const updatedDashboard: DashboardConfig = {
    ...state.activeDashboard,
    widgets: updatedWidgets,
    updated_at: Date.now(),
  }

  state = {
    ...state,
    activeDashboard: updatedDashboard,
    dashboards: state.dashboards.map((d) => (d.id === updatedDashboard.id ? updatedDashboard : d)),
  }
  notify()
  await databaseService.persistDashboard(updatedDashboard)
}

export async function addWidgetToActive(typeId: string, title: string, defaultW = 6, defaultH = 3) {
  if (!state.activeDashboard) return

  const newWidget: WidgetConfig = {
    id: `w-${typeId}-${Date.now().toString(36)}`,
    type_id: typeId,
    title,
    x: 0,
    y: 999, // Append at bottom
    w: defaultW,
    h: defaultH,
    visible: true,
    settings: {},
  }

  const updatedDashboard: DashboardConfig = {
    ...state.activeDashboard,
    widgets: [...state.activeDashboard.widgets, newWidget],
    updated_at: Date.now(),
  }

  state = {
    ...state,
    activeDashboard: updatedDashboard,
    dashboards: state.dashboards.map((d) => (d.id === updatedDashboard.id ? updatedDashboard : d)),
  }
  notify()
  await databaseService.persistDashboard(updatedDashboard)
}

export async function removeWidgetFromActive(widgetId: string) {
  if (!state.activeDashboard) return

  const updatedDashboard: DashboardConfig = {
    ...state.activeDashboard,
    widgets: state.activeDashboard.widgets.filter((w) => w.id !== widgetId),
    updated_at: Date.now(),
  }

  state = {
    ...state,
    activeDashboard: updatedDashboard,
    dashboards: state.dashboards.map((d) => (d.id === updatedDashboard.id ? updatedDashboard : d)),
  }
  notify()
  await databaseService.persistDashboard(updatedDashboard)
}

export async function createNewDashboard(name: string, description: string) {
  const newDash: DashboardConfig = {
    id: `dash-${Date.now().toString(36)}`,
    name,
    description,
    is_default: false,
    created_at: Date.now(),
    updated_at: Date.now(),
    widgets: [],
  }

  state = {
    ...state,
    dashboards: [...state.dashboards, newDash],
    activeDashboardId: newDash.id,
    activeDashboard: newDash,
  }
  notify()
  await databaseService.persistDashboard(newDash)
}

export async function deleteDashboardById(id: string) {
  if (state.dashboards.length <= 1) return
  await databaseService.removeDashboard(id)
  const remaining = state.dashboards.filter((d) => d.id !== id)
  const nextActive = remaining[0]
  state = {
    ...state,
    dashboards: remaining,
    activeDashboardId: nextActive.id,
    activeDashboard: nextActive,
  }
  notify()
}

export async function importDashboardJson(json: string): Promise<boolean> {
  try {
    const imported = await databaseService.importJson(json)
    state = {
      ...state,
      dashboards: [...state.dashboards, imported],
      activeDashboardId: imported.id,
      activeDashboard: imported,
    }
    notify()
    return true
  } catch (err) {
    console.error('Import error:', err)
    return false
  }
}

export function useDashboardStore() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((t) => t + 1)
    listeners.add(listener)
    loadSavedDashboards()
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return {
    ...state,
    setActiveDashboard,
    setEditingMode,
    updateWidgetConfig,
    addWidget: addWidgetToActive,
    removeWidget: removeWidgetFromActive,
    createNewDashboard,
    deleteDashboard: deleteDashboardById,
    importDashboard: importDashboardJson,
  }
}
