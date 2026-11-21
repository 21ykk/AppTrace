import React, { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { NavigationTab } from '../../types/system'
import { useTelemetryStore } from '../../stores/telemetryStore'

interface MainLayoutProps {
  activeTab: NavigationTab
  onSelectTab: (tab: NavigationTab) => void
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ activeTab, onSelectTab, children }) => {
  const { status, isCollecting, toggleMonitoring, alerts } = useTelemetryStore()
  const [searchQuery, setSearchQuery] = useState('')

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#101113] text-[#E6E8EB]">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isElevated={status?.is_elevated ?? false}
        alertsCount={unacknowledgedAlerts}
      />
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <Header
          status={status}
          isCollecting={isCollecting}
          onToggleMonitoring={toggleMonitoring}
          onOpenSettings={() => onSelectTab('settings')}
          onOpenAlerts={() => onSelectTab('alerts')}
          unacknowledgedAlerts={unacknowledgedAlerts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <main className="flex-1 overflow-y-auto p-4 bg-[#101113] text-[#E6E8EB] scrollbar-thin scrollbar-thumb-[#30343A] scrollbar-track-transparent">
          {children}
        </main>
      </div>
    </div>
  )
}
