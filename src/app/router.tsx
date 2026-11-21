import React from 'react'
import { NavigationTab } from '../types/system'
import { DashboardPage } from '../pages/Dashboard/DashboardPage'
import { LiveMonitorPage } from '../pages/LiveMonitor/LiveMonitorPage'
import { ProcessesPage } from '../pages/Processes/ProcessesPage'
import { NetworkPage } from '../pages/Network/NetworkPage'
import { FilesystemPage } from '../pages/Filesystem/FilesystemPage'
import { DependencyGraphPage } from '../pages/DependencyGraph/DependencyGraphPage'
import { TimelinePage } from '../pages/Timeline/TimelinePage'
import { AlertsPage } from '../pages/Alerts/AlertsPage'
import { AnalyticsPage } from '../pages/Analytics/AnalyticsPage'
import { SettingsPage } from '../pages/Settings/SettingsPage'
import { ApplicationsPage } from '../pages/Applications/ApplicationsPage'
import { StartupPage } from '../pages/Startup/StartupPage'
import { ServicesPage } from '../pages/Services/ServicesPage'
import { ScheduledTasksPage } from '../pages/ScheduledTasks/ScheduledTasksPage'
import { RegistryPage } from '../pages/Registry/RegistryPage'
import { CleanerPage } from '../pages/Cleaner/CleanerPage'
import { DiskAnalyzerPage } from '../pages/DiskAnalyzer/DiskAnalyzerPage'
import { DuplicatesPage } from '../pages/Duplicates/DuplicatesPage'
import { OptimizerPage } from '../pages/Optimizer/OptimizerPage'
import { HealthPage } from '../pages/Health/HealthPage'
import { HunterPage } from '../pages/Hunter/HunterPage'
import { HistoryPage } from '../pages/History/HistoryPage'

interface RouterProps {
  activeTab: NavigationTab
}

export const AppRouter: React.FC<RouterProps> = ({ activeTab }) => {
  switch (activeTab) {
    case 'overview':
      return <DashboardPage />
    case 'live_monitor':
      return <LiveMonitorPage />
    case 'processes':
      return <ProcessesPage />
    case 'network':
      return <NetworkPage />
    case 'filesystem':
      return <FilesystemPage />
    case 'dependency_graph':
      return <DependencyGraphPage />
    case 'timeline':
      return <TimelinePage />
    case 'alerts':
      return <AlertsPage />
    case 'analytics':
      return <AnalyticsPage />
    case 'applications':
      return <ApplicationsPage />
    case 'startup':
      return <StartupPage />
    case 'services':
      return <ServicesPage />
    case 'scheduled_tasks':
      return <ScheduledTasksPage />
    case 'registry':
      return <RegistryPage />
    case 'cleaner':
      return <CleanerPage />
    case 'disk_analyzer':
      return <DiskAnalyzerPage />
    case 'duplicates':
      return <DuplicatesPage />
    case 'optimizer':
      return <OptimizerPage />
    case 'health':
      return <HealthPage />
    case 'hunter':
      return <HunterPage />
    case 'history':
      return <HistoryPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <DashboardPage />
  }
}
