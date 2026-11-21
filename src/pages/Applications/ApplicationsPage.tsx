import React, { useState, useEffect, useMemo } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { InstalledApp, AppDetails, UninstallPlan, LeftoverItem } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import {
  Package,
  Search,
  RefreshCw,
  Trash2,
  Info,
  ShieldAlert,
  FolderOpen,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react'
import { formatBytes } from '../../utils/formatters'
import { cn } from '../../utils/cn'

type ScopeFilter = 'all' | 'User' | 'Machine' | 'running'

export const ApplicationsPage: React.FC = () => {
  const [apps, setApps] = useState<InstalledApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')

  // Details Modal
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null)
  const [appDetails, setAppDetails] = useState<AppDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Uninstall Wizard Modal
  const [uninstallApp, setUninstallApp] = useState<InstalledApp | null>(null)
  const [uninstallPlan, setUninstallPlan] = useState<UninstallPlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [leftovers, setLeftovers] = useState<LeftoverItem[]>([])
  const [wizardStep, setWizardStep] = useState<'plan' | 'executing' | 'leftovers' | 'done'>('plan')
  const [uninstallStatusText, setUninstallStatusText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const loadApps = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ManagementService.getInstalledApps()
      setApps(data)
    } catch (err: any) {
      setError(err?.toString() || 'Failed to enumerate installed applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApps()
  }, [])

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        app.name.toLowerCase().includes(q) ||
        (app.publisher && app.publisher.toLowerCase().includes(q))

      if (!matchSearch) return false

      if (scopeFilter === 'User') return app.scope === 'User'
      if (scopeFilter === 'Machine') return app.scope === 'Machine'
      if (scopeFilter === 'running') return app.is_running
      return true
    })
  }, [apps, search, scopeFilter])

  const totalSize = useMemo(() => {
    return apps.reduce((sum, a) => sum + (a.estimated_size_bytes || 0), 0)
  }, [apps])

  const runningCount = useMemo(() => {
    return apps.filter((a) => a.is_running).length
  }, [apps])

  // Open Details Modal
  const handleViewDetails = async (app: InstalledApp) => {
    setSelectedApp(app)
    setLoadingDetails(true)
    try {
      const details = await ManagementService.getAppDetails(app.id)
      setAppDetails(details)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoadingDetails(false)
    }
  }

  // Start Uninstall Wizard
  const handleStartUninstall = async (app: InstalledApp) => {
    setUninstallApp(app)
    setWizardStep('plan')
    setUninstallStatusText('')
    setLoadingPlan(true)
    try {
      const plan = await ManagementService.getUninstallPlan(app.id)
      setUninstallPlan(plan)
      setLeftovers(plan.potential_leftovers)
    } catch (err: any) {
      setError(err?.toString() || 'Failed to build uninstall plan')
    } finally {
      setLoadingPlan(false)
    }
  }

  // Execute Uninstallation
  const handleExecuteUninstall = async (runOfficial: boolean) => {
    if (!uninstallApp) return
    setIsProcessing(true)
    setWizardStep('executing')
    setUninstallStatusText('Stopping related processes and launching uninstaller...')

    try {
      await ManagementService.executeUninstallPlan(
        uninstallApp.id,
        true, // force kill running processes
        runOfficial,
        false // leftovers cleaned in next step
      )

      setUninstallStatusText('Deep scanning filesystem and registry for leftovers...')
      const scannedLeftovers = await ManagementService.scanAppLeftovers(uninstallApp.id)
      setLeftovers(scannedLeftovers)
      setWizardStep('leftovers')
    } catch (err: any) {
      setUninstallStatusText(`Uninstaller error: ${err}`)
      setWizardStep('leftovers')
    } finally {
      setIsProcessing(false)
    }
  }

  // Clean Leftovers
  const handleCleanLeftovers = async () => {
    setIsProcessing(true)
    try {
      const selectedItems = leftovers.filter((l) => l.selected)
      const [reclaimedBytes, count] = await ManagementService.deleteLeftovers(selectedItems)

      await ManagementService.recordOperation(
        'Uninstall',
        uninstallApp?.name || 'Unknown',
        uninstallApp?.install_location || null,
        'Success',
        JSON.stringify({
          cleaned_items_count: count,
          reclaimed_bytes: reclaimedBytes,
        })
      )

      setUninstallStatusText(`Cleaned ${count} items. Reclaimed ${formatBytes(reclaimedBytes)}.`)
      setWizardStep('done')
      loadApps()
    } catch (err: any) {
      setUninstallStatusText(`Cleanup error: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              Application Intelligence & Uninstaller
              <span className="text-[11px] font-mono px-2 py-0.5 bg-[#22262B] text-[#9A9FA8] rounded border border-[#30343A]">
                {apps.length} Applications
              </span>
            </h1>
            <p className="text-xs text-[#6E747D]">
              Complete software registry discovery, dependency mapping, process correlation, and leftover cleaning.
            </p>
          </div>
        </div>

        {/* Global stats pills */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
            <span className="text-[#6E747D]">Footprint:</span>
            <span className="text-[#E6E8EB] font-semibold">{formatBytes(totalSize)}</span>
          </div>
          <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
            <span className="text-[#6E747D]">Active Running:</span>
            <span className={cn('font-semibold', runningCount > 0 ? 'text-[#35B879]' : 'text-[#9A9FA8]')}>
              {runningCount}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadApps}
            disabled={loading}
            className="flex items-center gap-1.5 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B]"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-3 rounded-lg">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6E747D]" />
          <input
            type="text"
            placeholder="Search application, publisher, version..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#101113] border border-[#30343A] rounded pl-9 pr-3 py-1.5 text-xs text-[#E6E8EB] focus:outline-none focus:border-[#2878D0]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'User', 'Machine', 'running'] as ScopeFilter[]).map((scope) => (
            <button
              key={scope}
              onClick={() => setScopeFilter(scope)}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors border',
                scopeFilter === scope
                  ? 'bg-[#2878D0] text-white border-[#2878D0]'
                  : 'bg-[#1D2024] text-[#9A9FA8] border-[#30343A] hover:bg-[#22262B]'
              )}
            >
              {scope === 'all'
                ? 'All'
                : scope === 'User'
                ? 'User Scope'
                : scope === 'Machine'
                ? 'System Scope'
                : `Running (${runningCount})`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#D94B4B]/15 border border-[#D94B4B]/40 rounded text-xs text-[#D94B4B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Apps Table */}
      <Card className="bg-[#17191C] border-[#30343A] overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#30343A] bg-[#121316] text-[#9A9FA8] font-mono uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 font-medium">Application Name</th>
                <th className="py-2.5 px-4 font-medium">Publisher</th>
                <th className="py-2.5 px-4 font-medium">Version</th>
                <th className="py-2.5 px-4 font-medium">Install Date</th>
                <th className="py-2.5 px-4 font-medium">Size</th>
                <th className="py-2.5 px-4 font-medium">Scope</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22262B] font-mono">
              {loading && apps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6E747D]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#2878D0]" />
                      <span>Scanning installed software registry...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#6E747D]">
                    No applications matched your search criteria.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-[#1D2024]/70 transition-colors group cursor-pointer"
                    onClick={() => handleViewDetails(app)}
                  >
                    <td className="py-2.5 px-4 font-sans font-medium text-[#E6E8EB] max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#6E747D] shrink-0 group-hover:text-[#2878D0] transition-colors" />
                        <span className="truncate">{app.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-[#9A9FA8] max-w-[200px] truncate">
                      {app.publisher || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-[#9A9FA8] max-w-[120px] truncate">
                      {app.version || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-[#6E747D]">
                      {app.install_date || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-[#9A9FA8]">
                      {app.estimated_size_bytes ? formatBytes(app.estimated_size_bytes) : '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#22262B] text-[#9A9FA8] border border-[#30343A]">
                        {app.scope} / {app.architecture}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {app.is_running ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#35B879]/15 text-[#35B879] border border-[#35B879]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#35B879] animate-pulse" />
                          Running ({app.running_pids.length})
                        </span>
                      ) : (
                        <span className="text-[#6E747D] text-[11px]">Idle</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(app)}
                          className="h-7 px-2 text-[#9A9FA8] hover:text-[#E6E8EB] hover:bg-[#22262B]"
                        >
                          <Info className="w-3.5 h-3.5 mr-1" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartUninstall(app)}
                          className="h-7 px-2 text-[#D94B4B] hover:text-[#D94B4B] border-[#D94B4B]/30 hover:bg-[#D94B4B]/10"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Uninstall
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Details Modal */}
      {selectedApp && (
        <Modal
          isOpen={!!selectedApp}
          onClose={() => {
            setSelectedApp(null)
            setAppDetails(null)
          }}
          title={`Application Details: ${selectedApp.name}`}
          className="max-w-3xl"
        >
          <div className="space-y-4 text-xs font-sans">
            {loadingDetails ? (
              <div className="py-10 text-center text-[#6E747D] flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#2878D0]" />
                <span>Correlating processes, file paths, and registry entries...</span>
              </div>
            ) : appDetails ? (
              <>
                {/* Meta summary grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#121316] p-3 rounded border border-[#30343A] font-mono">
                  <div>
                    <span className="text-[#6E747D] block text-[10px]">PUBLISHER</span>
                    <span className="text-[#E6E8EB] truncate block">{selectedApp.publisher || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-[#6E747D] block text-[10px]">VERSION</span>
                    <span className="text-[#E6E8EB] truncate block">{selectedApp.version || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-[#6E747D] block text-[10px]">INSTALL DATE</span>
                    <span className="text-[#E6E8EB] truncate block">{selectedApp.install_date || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-[#6E747D] block text-[10px]">SIZE</span>
                    <span className="text-[#E6E8EB] truncate block">
                      {selectedApp.estimated_size_bytes ? formatBytes(selectedApp.estimated_size_bytes) : 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Installation location */}
                {selectedApp.install_location && (
                  <div className="bg-[#1D2024] p-2.5 rounded border border-[#30343A] flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-[#2878D0] shrink-0" />
                    <span className="text-[#9A9FA8] font-mono truncate">{selectedApp.install_location}</span>
                  </div>
                )}

                {/* Running processes */}
                {appDetails.related_processes.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-xs text-[#E6E8EB] flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#35B879]" />
                      Correlated Active Processes ({appDetails.related_processes.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {appDetails.related_processes.map((pid) => (
                        <span key={pid} className="px-2 py-1 bg-[#1D2024] border border-[#35B879]/40 text-[#35B879] rounded font-mono text-[11px]">
                          PID {pid}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relationships list */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-xs text-[#E6E8EB] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#2878D0]" />
                    OS Relationships & Linked Resources ({appDetails.relationships.length})
                  </h3>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {appDetails.relationships.map((rel, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[#101113] border border-[#30343A] rounded flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-mono border uppercase shrink-0',
                            rel.resource_type === 'File' && 'bg-blue-900/30 text-blue-400 border-blue-800',
                            rel.resource_type === 'Registry' && 'bg-amber-900/30 text-amber-400 border-amber-800',
                            rel.resource_type === 'Process' && 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
                            rel.resource_type === 'Service' && 'bg-purple-900/30 text-purple-400 border-purple-800',
                          )}>
                            {rel.resource_type}
                          </span>
                          <span className="text-[#E6E8EB] font-mono truncate">{rel.identifier}</span>
                        </div>
                        <span className="text-[11px] text-[#6E747D] shrink-0">{rel.confidence}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#30343A]">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedApp(null)
                      setAppDetails(null)
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const a = selectedApp
                      setSelectedApp(null)
                      setAppDetails(null)
                      if (a) handleStartUninstall(a)
                    }}
                  >
                    Proceed to Uninstall
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </Modal>
      )}

      {/* Uninstall Wizard Modal */}
      {uninstallApp && (
        <Modal
          isOpen={!!uninstallApp}
          onClose={() => {
            if (!isProcessing) {
              setUninstallApp(null)
              setUninstallPlan(null)
            }
          }}
          title={`Uninstall Wizard — ${uninstallApp.name}`}
          className="max-w-2xl"
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Step 1: Pre-uninstall plan */}
            {wizardStep === 'plan' && (
              <>
                <div className="p-3 bg-[#1D2024] border border-[#30343A] rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#E6E8EB]">Uninstaller Command</span>
                    <span className="text-[10px] font-mono text-[#9A9FA8]">
                      {uninstallPlan?.is_quiet_supported ? 'Quiet Mode Available' : 'Interactive GUI'}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-[#9A9FA8] bg-[#101113] p-2 rounded border border-[#30343A] break-all">
                    {uninstallPlan?.uninstall_command || 'No registered uninstaller command. Force cleanup recommended.'}
                  </p>
                </div>

                {uninstallPlan?.warnings && uninstallPlan.warnings.length > 0 && (
                  <div className="p-3 bg-[#E4A83A]/10 border border-[#E4A83A]/30 rounded space-y-1">
                    <div className="flex items-center gap-1.5 text-[#E4A83A] font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Pre-Uninstall Warnings</span>
                    </div>
                    <ul className="list-disc pl-5 text-[11px] text-[#E4A83A]/90 space-y-0.5">
                      {uninstallPlan.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[#30343A]">
                  <Button
                    variant="ghost"
                    onClick={() => setUninstallApp(null)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExecuteUninstall(false)}
                      disabled={isProcessing}
                      className="border-[#30343A] hover:bg-[#22262B]"
                    >
                      Skip Uninstaller & Force Scan
                    </Button>
                    {uninstallPlan?.uninstall_command && (
                      <Button
                        variant="destructive"
                        onClick={() => handleExecuteUninstall(true)}
                        disabled={isProcessing}
                      >
                        Run Uninstaller & Clean Leftovers
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Executing */}
            {wizardStep === 'executing' && (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#2878D0] mx-auto" />
                <h3 className="font-semibold text-sm text-[#E6E8EB]">Uninstalling Application</h3>
                <p className="text-xs text-[#9A9FA8] max-w-md mx-auto">{uninstallStatusText}</p>
              </div>
            )}

            {/* Step 3: Leftover review & cleanup */}
            {wizardStep === 'leftovers' && (
              <>
                <div className="space-y-1">
                  <h3 className="font-semibold text-xs text-[#E6E8EB] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#2878D0]" />
                    Detected Residual Leftovers ({leftovers.length})
                  </h3>
                  <p className="text-[11px] text-[#6E747D]">
                    AppTrace scanned filesystem roots and registry hives for abandoned items linked to {uninstallApp.name}.
                  </p>
                </div>

                {leftovers.length === 0 ? (
                  <div className="py-8 text-center bg-[#101113] border border-[#30343A] rounded">
                    <CheckCircle2 className="w-6 h-6 text-[#35B879] mx-auto mb-1" />
                    <span className="text-xs text-[#E6E8EB]">No residual files or registry keys detected!</span>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 border border-[#30343A] rounded p-2 bg-[#101113]">
                    {leftovers.map((item, idx) => (
                      <label
                        key={item.id || idx}
                        className={cn(
                          'flex items-center justify-between gap-3 p-2 rounded border cursor-pointer transition-colors',
                          item.selected
                            ? 'bg-[#1D2024] border-[#2878D0]/50'
                            : 'bg-[#141619] border-[#22262B] opacity-75'
                        )}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={!item.is_safe_to_delete}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setLeftovers((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, selected: checked } : l))
                              )
                            }}
                            className="rounded bg-[#101113] border-[#30343A] text-[#2878D0] focus:ring-0"
                          />
                          <span className="text-[10px] font-mono px-1 py-0.5 bg-[#22262B] text-[#9A9FA8] rounded">
                            {item.item_type}
                          </span>
                          <span className="font-mono text-xs text-[#E6E8EB] truncate">{item.path}</span>
                        </div>
                        <span className={cn(
                          'text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded',
                          item.confidence === 'Verified' && 'bg-emerald-950 text-emerald-400 border border-emerald-800',
                          item.confidence === 'Likely' && 'bg-blue-950 text-blue-400 border border-blue-800',
                          item.confidence === 'SystemProtected' && 'bg-rose-950 text-rose-400 border border-rose-800'
                        )}>
                          {item.confidence}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[#30343A]">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setUninstallApp(null)
                      loadApps()
                    }}
                  >
                    Skip Cleaning
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCleanLeftovers}
                    disabled={isProcessing || leftovers.filter((l) => l.selected).length === 0}
                  >
                    Delete Selected Leftovers ({leftovers.filter((l) => l.selected).length})
                  </Button>
                </div>
              </>
            )}

            {/* Step 4: Done */}
            {wizardStep === 'done' && (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#35B879] mx-auto" />
                <h3 className="font-semibold text-sm text-[#E6E8EB]">Uninstallation Complete</h3>
                <p className="text-xs text-[#9A9FA8]">{uninstallStatusText}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUninstallApp(null)
                    loadApps()
                  }}
                  className="mt-2 border-[#30343A]"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
