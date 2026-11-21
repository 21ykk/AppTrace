import React, { useState, useEffect, useMemo } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { CleanableCategory } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import {
  Sparkles,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  HardDrive,
} from 'lucide-react'
import { formatBytes } from '../../utils/formatters'
import { cn } from '../../utils/cn'

export const CleanerPage: React.FC = () => {
  const [categories, setCategories] = useState<CleanableCategory[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const scanCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      setResultMessage(null)
      const data = await ManagementService.scanCleanableCategories()
      setCategories(data)

      // Default select safe categories
      const safe = new Set<string>()
      data.forEach((c) => {
        if (c.is_safe_by_default && c.detected_bytes > 0) {
          safe.add(c.id)
        }
      })
      setSelectedIds(safe)
    } catch (err: any) {
      setError(err?.toString() || 'Failed to scan cleanable categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    scanCategories()
  }, [])

  const totalDetectedBytes = useMemo(() => {
    return categories.reduce((sum, c) => sum + c.detected_bytes, 0)
  }, [categories])

  const selectedBytes = useMemo(() => {
    return categories
      .filter((c) => selectedIds.has(c.id))
      .reduce((sum, c) => sum + c.detected_bytes, 0)
  }, [categories, selectedIds])

  const toggleSelectCategory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleExpand = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExecuteClean = async () => {
    setShowConfirmModal(false)
    setCleaning(true)
    setError(null)
    setResultMessage(null)

    try {
      const ids = Array.from(selectedIds)
      const [reclaimedBytes, count] = await ManagementService.executeCleaning(ids)

      await ManagementService.recordOperation(
        'Clean',
        'System & Browser Cache Cleaner',
        null,
        'Success',
        JSON.stringify({
          categories: ids,
          reclaimed_bytes: reclaimedBytes,
          files_deleted: count,
        })
      )

      setResultMessage(
        `Successfully deleted ${count} obsolete temporary files, reclaiming ${formatBytes(reclaimedBytes)} of disk space!`
      )
      scanCategories()
    } catch (err: any) {
      setError(`Cleaning failed: ${err}`)
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              Deep System & Storage Cleaner
            </h1>
            <p className="text-xs text-[#6E747D]">
              Safely reclaim gigabytes of disk space from application caches, crash dumps, and temporary working files.
            </p>
          </div>
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
            <span className="text-[#6E747D]">Total Cleanable:</span>
            <span className="text-[#E6E8EB] font-semibold">{formatBytes(totalDetectedBytes)}</span>
          </div>
          <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
            <span className="text-[#6E747D]">Selected:</span>
            <span className="text-[#35B879] font-semibold">{formatBytes(selectedBytes)}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={scanCategories}
            disabled={loading || cleaning}
            className="flex items-center gap-1.5 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B]"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Scan
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowConfirmModal(true)}
            disabled={cleaning || selectedBytes === 0}
            className="flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clean Selected ({formatBytes(selectedBytes)})
          </Button>
        </div>
      </div>

      {resultMessage && (
        <div className="p-3 bg-[#35B879]/15 border border-[#35B879]/40 rounded text-xs text-[#35B879] flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{resultMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[#D94B4B]/15 border border-[#D94B4B]/40 rounded text-xs text-[#D94B4B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Category List */}
      <div className="space-y-3">
        {loading && categories.length === 0 ? (
          <Card className="bg-[#17191C] border-[#30343A] p-12 text-center text-[#6E747D]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2878D0] mx-auto mb-2" />
            <span>Scanning storage locations for temporary and cached files...</span>
          </Card>
        ) : (
          categories.map((cat) => {
            const isSelected = selectedIds.has(cat.id)
            const isExpanded = expandedCats.has(cat.id)

            return (
              <Card
                key={cat.id}
                className={cn(
                  'bg-[#17191C] border transition-all p-0 overflow-hidden',
                  isSelected ? 'border-[#2878D0]/50' : 'border-[#30343A]'
                )}
              >
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectCategory(cat.id)}
                      className="w-4 h-4 rounded bg-[#101113] border-[#30343A] text-[#2878D0] focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-[#E6E8EB]">{cat.title}</h2>
                        {cat.is_safe_by_default && (
                          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            <ShieldCheck className="w-3 h-3" />
                            Safe by Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6E747D] mt-0.5">{cat.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                    <div className="text-right">
                      <div className="text-[#E6E8EB] font-bold text-sm">
                        {formatBytes(cat.detected_bytes)}
                      </div>
                      <div className="text-[#6E747D] text-[11px]">{cat.file_count} files</div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpand(cat.id)}
                      className="h-8 px-2 text-[#9A9FA8] hover:text-[#E6E8EB]"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded item details */}
                {isExpanded && (
                  <div className="p-3 bg-[#101113] border-t border-[#30343A] space-y-1 text-xs font-mono">
                    <span className="text-[11px] text-[#6E747D] block mb-1">
                      Detected Files Sample (up to 25 items):
                    </span>
                    {cat.items.length === 0 ? (
                      <div className="text-[#6E747D] py-2">No files currently in this category.</div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {cat.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-3 p-1.5 rounded bg-[#17191C] border border-[#22262B]"
                          >
                            <span className="truncate text-[#9A9FA8]" title={item.path}>
                              {item.path}
                            </span>
                            <span className="text-[#E6E8EB] shrink-0 font-semibold">
                              {formatBytes(item.size_bytes)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirm Deep Cleaning"
          className="max-w-md"
        >
          <div className="space-y-4 text-xs font-sans">
            <p className="text-[#9A9FA8]">
              Are you sure you want to clean the selected categories? This will permanently delete temporary working files, error reports, and web caches totaling:
            </p>

            <div className="p-3 bg-[#101113] border border-[#30343A] rounded text-center">
              <span className="text-xl font-bold font-mono text-[#35B879]">
                {formatBytes(selectedBytes)}
              </span>
              <span className="block text-[#6E747D] text-[11px] mt-1">
                across {selectedIds.size} selected categories
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#30343A]">
              <Button variant="ghost" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleExecuteClean}>
                Confirm & Clean
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
