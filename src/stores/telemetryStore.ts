import { useEffect, useState } from 'react'
import { telemetryService } from '../services/telemetry/telemetryService'
import {
  AlertRecord,
  FilesystemEventRecord,
  NetworkConnection,
  NormalizedEvent,
  ProcessInfo,
  SystemMetrics,
  SystemTelemetryStatus,
} from '../types/telemetry'

export interface MetricsDataPoint {
  timestamp: number
  cpu: number
  ramUsed: number
  netRx: number
  netTx: number
}

interface TelemetryState {
  status: SystemTelemetryStatus | null
  metrics: SystemMetrics | null
  processes: ProcessInfo[]
  connections: NetworkConnection[]
  fsEvents: FilesystemEventRecord[]
  timelineEvents: NormalizedEvent[]
  alerts: AlertRecord[]
  metricsHistory: MetricsDataPoint[]
  isCollecting: boolean
  lastUpdated: number
  connectionError: string | null
}

let state: TelemetryState = {
  status: null,
  metrics: null,
  processes: [],
  connections: [],
  fsEvents: [],
  timelineEvents: [],
  alerts: [],
  metricsHistory: [],
  isCollecting: true,
  lastUpdated: Date.now(),
  connectionError: null,
}

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

let pollingIntervalId: ReturnType<typeof setInterval> | null = null

async function pollTelemetry() {
  try {
    const [status, metrics, processes, connections, fsEvents, timelineEvents, alerts] =
      await Promise.all([
        telemetryService.getStatus(),
        telemetryService.getMetrics(),
        telemetryService.getProcesses(),
        telemetryService.getConnections(),
        telemetryService.getFilesystemEvents(50),
        telemetryService.getTimeline(100),
        telemetryService.getAlerts(),
      ])

    const now = Date.now()
    let updatedHistory = state.metricsHistory

    if (metrics) {
      const dataPoint: MetricsDataPoint = {
        timestamp: now,
        cpu: metrics.cpu_usage_pct,
        ramUsed: metrics.memory_used_bytes,
        netRx: metrics.net_bytes_rx_sec,
        netTx: metrics.net_bytes_tx_sec,
      }
      updatedHistory = [...state.metricsHistory, dataPoint].slice(-60) // Keep last 60 seconds
    }

    state = {
      ...state,
      status,
      metrics,
      processes,
      connections,
      fsEvents,
      timelineEvents,
      alerts,
      metricsHistory: updatedHistory,
      isCollecting: status.collection_active,
      lastUpdated: now,
      connectionError: null,
    }
  } catch (err) {
    state = {
      ...state,
      connectionError: String(err),
    }
  }

  notify()
}

export function startTelemetryPolling(intervalMs = 1000) {
  if (pollingIntervalId) clearInterval(pollingIntervalId)
  pollTelemetry()
  pollingIntervalId = setInterval(pollTelemetry, intervalMs)
}

export function stopTelemetryPolling() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId)
    pollingIntervalId = null
  }
}

export async function toggleMonitoringState(active: boolean) {
  if (active) {
    await telemetryService.startMonitoring()
  } else {
    await telemetryService.stopMonitoring()
  }
  await pollTelemetry()
}

export async function ackAlert(alertId: string) {
  await telemetryService.acknowledgeAlert(alertId)
  state = {
    ...state,
    alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
  }
  notify()
}

export function useTelemetryStore() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((t) => t + 1)
    listeners.add(listener)
    if (!pollingIntervalId) {
      startTelemetryPolling(1000)
    }
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return {
    ...state,
    toggleMonitoring: () => toggleMonitoringState(!state.isCollecting),
    acknowledgeAlert: ackAlert,
    refresh: pollTelemetry,
  }
}
