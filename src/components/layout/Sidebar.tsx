import React, { useState } from 'react'
import { NavigationTab } from '../../types/system'
import {
  LayoutDashboard,
  Activity,
  Cpu,
  Network,
  FolderTree,
  Share2,
  Clock,
  AlertTriangle,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Package,
  Rocket,
  Server,
  CalendarClock,
  Key,
  Sparkles,
  PieChart,
  Copy,
  Gauge,
  Crosshair,
  History,
} from 'lucide-react'
import { cn } from '../../utils/cn'

interface SidebarProps {
  activeTab: NavigationTab
  onSelectTab: (tab: NavigationTab) => void
  isElevated?: boolean
  alertsCount?: number
}

interface NavItem {
  id: NavigationTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

const navSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'MONITORING',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'processes', label: 'Processes', icon: Cpu },
      { id: 'live_monitor', label: 'Performance', icon: Activity },
      { id: 'network', label: 'Network', icon: Network },
      { id: 'filesystem', label: 'Filesystem', icon: FolderTree },
    ],
  },
  {
    title: 'APPLICATIONS & OS',
    items: [
      { id: 'applications', label: 'Applications', icon: Package },
      { id: 'hunter', label: 'Resource Hunter', icon: Crosshair },
      { id: 'startup', label: 'Startup Manager', icon: Rocket },
      { id: 'services', label: 'Services', icon: Server },
      { id: 'scheduled_tasks', label: 'Scheduled Tasks', icon: CalendarClock },
      { id: 'registry', label: 'Registry / Config', icon: Key },
    ],
  },
  {
    title: 'CLEANING & STORAGE',
    items: [
      { id: 'cleaner', label: 'System Cleaner', icon: Sparkles },
      { id: 'disk_analyzer', label: 'Disk Analyzer', icon: PieChart },
      { id: 'duplicates', label: 'Duplicate Finder', icon: Copy },
    ],
  },
  {
    title: 'HEALTH & OPTIMIZATION',
    items: [
      { id: 'health', label: 'System Health', icon: Shield },
      { id: 'optimizer', label: 'Optimizer', icon: Gauge },
      { id: 'timeline', label: 'Timeline', icon: Clock },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'dependency_graph', label: 'Dependency Graph', icon: Share2 },
      { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
      { id: 'history', label: 'Operation History', icon: History },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
]

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isElevated = false,
  alertsCount = 0,
}) => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'bg-[#0B0C0E] border-r border-[#30343A] flex flex-col justify-between select-none shrink-0 h-screen transition-all duration-200 z-30',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Brand Header */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="h-13 px-3 flex items-center justify-between border-b border-[#30343A] bg-[#0E0F12] shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="/branding/logo.png"
              onError={(e) => {
                // fallback to svg if needed
                (e.currentTarget as HTMLImageElement).src = '/branding/logo.svg'
              }}
              alt="AppTrace"
              className="w-8 h-8 rounded-md object-contain shrink-0"
            />
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-semibold text-xs tracking-wider text-[#E6E8EB] flex items-center gap-1.5 font-sans">
                  AppTrace
                  <span className="text-[9px] px-1 py-0.2 bg-[#22262B] text-[#9A9FA8] font-mono border border-[#30343A] rounded">
                    v1.0
                  </span>
                </span>
                <span className="text-[10px] text-[#6E747D] font-mono truncate">Enterprise Suite</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-[#6E747D] hover:text-[#E6E8EB] hover:bg-[#1D2024] rounded transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="px-2 py-3 space-y-4 overflow-y-auto flex-1 min-h-0">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-0.5">
              {!collapsed && (
                <span className="px-2.5 text-[10px] font-mono font-semibold tracking-wider text-[#6E747D] uppercase block mb-1">
                  {sec.title}
                </span>
              )}
              {collapsed && idx > 0 && <div className="border-t border-[#30343A] my-2" />}
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  const hasBadge = item.id === 'alerts' && alertsCount > 0

                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium transition-colors rounded',
                        isActive
                          ? 'border-l-2 border-[#2878D0] bg-[#1D2024] text-[#E6E8EB] font-semibold pl-2'
                          : 'text-[#9A9FA8] hover:text-[#E6E8EB] hover:bg-[#17191C] border-l-2 border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#2878D0]' : 'text-[#6E747D]')} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!collapsed && hasBadge && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#D94B4B]/20 text-[#D94B4B] border border-[#D94B4B]/40">
                          {alertsCount}
                        </span>
                      )}
                      {collapsed && hasBadge && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D94B4B] shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Privilege Badge in Footer */}
      <div className="p-2 border-t border-[#30343A] bg-[#0E0F12] shrink-0">
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded bg-[#17191C] border border-[#30343A]',
            collapsed && 'justify-center p-2'
          )}
          title={isElevated ? 'Elevated Mode (Kernel Tracing Active)' : 'Standard User Mode (Unprivileged Baseline)'}
        >
          <Shield className={cn('w-3.5 h-3.5 shrink-0', isElevated ? 'text-[#35B879]' : 'text-[#6E747D]')} />
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-[10px] font-medium text-[#E6E8EB] truncate">
                {isElevated ? 'Elevated Administrator' : 'Standard User'}
              </span>
              <span className="text-[9px] text-[#6E747D] font-mono truncate">
                {isElevated ? 'Kernel Access Active' : 'Userland Scope'}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
