import React, { useState } from 'react'
import { SystemTelemetryStatus } from '../../types/telemetry'
import { Play, Square, Search, Bell, AlertTriangle, Settings, Shield } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { cn } from '../../utils/cn'

interface HeaderProps {
  status: SystemTelemetryStatus | null
  isCollecting: boolean
  onToggleMonitoring: () => void
  onOpenSettings: () => void
  onOpenAlerts: () => void
  unacknowledgedAlerts: number
  searchQuery: string
  onSearchChange: (q: string) => void
}

function getCompactBackendName(backend?: string): string {
  if (!backend) return 'Probing...'
  if (backend.includes('Win32')) return 'Win32 + IP Helper'
  if (backend.includes('eBPF')) return 'Linux eBPF'
  if (backend.includes('Procfs')) return 'Linux Procfs'
  return backend.split('(')[0].trim()
}

export const Header: React.FC<HeaderProps> = ({
  status,
  isCollecting,
  onToggleMonitoring,
  onOpenSettings,
  onOpenAlerts,
  unacknowledgedAlerts,
  searchQuery,
  onSearchChange,
}) => {
  const [showCapabilityModal, setShowCapabilityModal] = useState(false)

  return (
    <header className="h-13 bg-[#17191C] border-b border-[#30343A] px-4 flex items-center justify-between select-none shrink-0 z-20">
      {/* Left: Telemetry Status & Environment */}
      <div className="flex items-center gap-2.5">
        {/* Play/Pause Monitoring Button */}
        <Button
          variant={isCollecting ? 'secondary' : 'primary'}
          size="sm"
          onClick={onToggleMonitoring}
          icon={isCollecting ? <Square className="w-3 h-3 fill-current text-[#D94B4B]" /> : <Play className="w-3 h-3 fill-current text-white" />}
          className={cn(
            'font-mono text-[11px] uppercase tracking-wider',
            isCollecting ? 'border-[#30343A] text-[#E6E8EB]' : ''
          )}
        >
          {isCollecting ? 'Stop Monitoring' : 'Start Monitoring'}
        </Button>

        {/* Dynamic Status Chip */}
        <div
          onClick={() => setShowCapabilityModal(true)}
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#101113] border border-[#30343A] cursor-pointer hover:border-[#2878D0] transition-colors"
          title={status?.active_backend || 'Click to view capability details'}
        >
          <span className={cn('w-2 h-2 rounded-full', isCollecting ? 'bg-[#35B879]' : 'bg-[#6E747D]')} />
          <span className="text-[11px] font-mono text-[#E6E8EB]">
            {status ? status.os_name : 'Detecting OS...'}
          </span>
          <span className="text-[10px] text-[#9A9FA8] font-mono border-l border-[#30343A] pl-2">
            {getCompactBackendName(status?.active_backend)}
          </span>
        </div>
      </div>

      {/* Middle: Global Quick Search */}
      <div className="flex items-center max-w-sm w-full mx-4">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-[#6E747D] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search processes, IPs, ports, files (Ctrl+F)..."
            className="w-full bg-[#101113] border border-[#30343A] rounded-md pl-8 pr-3 py-1 text-xs text-[#E6E8EB] placeholder:text-[#6E747D] focus:outline-none focus:border-[#2878D0] focus:ring-1 focus:ring-[#2878D0]/40 transition-colors font-mono"
          />
        </div>
      </div>

      {/* Right: Drops, Alerts, Settings */}
      <div className="flex items-center gap-2">
        {status && status.event_drop_count > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#E4A83A]/15 text-[#E4A83A] border border-[#E4A83A]/30 text-[11px] font-mono">
            <AlertTriangle className="w-3 h-3" />
            <span>Drops: {status.event_drop_count}</span>
          </div>
        )}

        <button
          onClick={onOpenAlerts}
          className="relative p-1.5 text-[#9A9FA8] hover:text-[#E6E8EB] hover:bg-[#22262B] transition-colors rounded"
          title="System Alerts"
        >
          <Bell className="w-4 h-4" />
          {unacknowledgedAlerts > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D94B4B] text-white text-[9px] font-bold flex items-center justify-center font-mono">
              {unacknowledgedAlerts}
            </span>
          )}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-[#9A9FA8] hover:text-[#E6E8EB] hover:bg-[#22262B] transition-colors rounded"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Backend & Capabilities Modal */}
      <Modal
        isOpen={showCapabilityModal}
        onClose={() => setShowCapabilityModal(false)}
        title="Telemetry Backend & Platform Capabilities"
      >
        {status ? (
          <div className="space-y-3 font-mono text-xs text-[#E6E8EB]">
            <div className="bg-[#101113] p-3 rounded border border-[#30343A] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#6E747D]">Operating System:</span>
                <span className="text-[#E6E8EB]">{status.os_name} ({status.architecture})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6E747D]">Active Backend:</span>
                <span className="text-[#2878D0] font-semibold">{status.active_backend}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6E747D]">Privilege Level:</span>
                <span className={status.is_elevated ? 'text-[#35B879]' : 'text-[#6E747D]'}>
                  {status.is_elevated ? 'Elevated (Administrator / Root)' : 'Standard User (Unprivileged)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6E747D]">Observed Filesystem:</span>
                <span className="text-[#E6E8EB] truncate max-w-[200px]">
                  {status.monitored_fs_path || 'Default Workspace'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#9A9FA8] uppercase tracking-wider block">
                Platform Domains & Features
              </span>
              <div className="space-y-1">
                {status.capabilities.map((cap, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-[#30343A]/50 text-[11px]">
                    <span className="text-[#9A9FA8]">{cap.category}:</span>
                    <span className={cap.level.status === 'Full' ? 'text-[#35B879]' : 'text-[#E4A83A]'}>
                      {cap.level.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#6E747D]">Connecting to native telemetry subsystem...</p>
        )}
      </Modal>
    </header>
  )
}
