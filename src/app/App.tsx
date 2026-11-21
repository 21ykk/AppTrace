import React, { useState, useEffect } from 'react'
import { NavigationTab } from '../types/system'
import { MainLayout } from '../components/layout/MainLayout'
import { AppRouter } from './router'
import { AppProviders } from './providers'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview')

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '')
      if (hash && ['overview', 'live_monitor', 'processes', 'network', 'filesystem', 'dependency_graph', 'timeline', 'alerts', 'analytics', 'settings'].includes(hash)) {
        setActiveTab(hash as NavigationTab)
      }
    }

    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  return (
    <AppProviders>
      <ErrorBoundary fallbackTitle="Application Shell Error">
        <MainLayout activeTab={activeTab} onSelectTab={setActiveTab}>
          <ErrorBoundary fallbackTitle="Page View Error">
            <AppRouter activeTab={activeTab} />
          </ErrorBoundary>
        </MainLayout>
      </ErrorBoundary>
    </AppProviders>
  )
}

export default App
