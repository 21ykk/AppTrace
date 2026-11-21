import React, { useState } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { DuplicateGroup } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import {
  Copy,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  CheckSquare,
  Square,
  FileCheck,
} from 'lucide-react'
import { formatBytes } from '../../utils/formatters'
import { cn } from '../../utils/cn'

export const DuplicatesPage: React.FC = () => {
  const [targetPath, setTargetPath] = useState('')
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const scanDuplicates = async () => {
    try {
      setLoading(true)
      setError(null)
      setResultMsg(null)
      setSelectedPaths(new Set())
      const data = await ManagementService.scanDuplicateFiles(targetPath, 1024)
      setGroups(data)

      // Auto-select duplicate copies by default (keep originals safe)
      const initialSelected = new Set<string>()
      data.forEach((g) => {
        g.duplicate_paths.forEach((p) => initialSelected.add(p))
      })
      setSelectedPaths(initialSelected)
    } catch (err: any) {
      setError(err?.toString() || 'Duplicate scan failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectPath = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleSelectAllDuplicates = () => {
    const s = new Set<string>()
    groups.forEach((g) => {
      g.duplicate_paths.forEach((p) => s.add(p))
    })
    setSelectedPaths(s)
  }

  const handleDeselectAll = () => {
    setSelectedPaths(new Set())
  }

  const totalDuplicateBytes = groups.reduce((sum, g) => {
    return sum + g.file_size * g.duplicate_paths.length
  }, 0)

  const selectedReclaimableBytes = groups.reduce((sum, g) => {
    const selectedCount = g.duplicate_paths.filter((p) => selectedPaths.has(p)).length
    return sum + g.file_size * selectedCount
  }, 0)

  const handleDeleteSelected = async () => {
    setShowConfirmModal(false)
    setDeleting(true)
    setError(null)

    try {
      const pathsToDelete = Array.from(selectedPaths)
      const [reclaimedBytes, count] = await ManagementService.deleteDuplicateFiles(pathsToDelete)

      await ManagementService.recordOperation(
        'Duplicate_Delete',
        'Duplicate File Cleaner',
        targetPath || null,
        'Success',
        JSON.stringify({
          files_deleted: count,
          reclaimed_bytes: reclaimedBytes,
        })
      )

      setResultMsg(
        `Deleted ${count} duplicate files, reclaiming ${formatBytes(reclaimedBytes)} of wasted storage!`
      )
      // Refresh list
      scanDuplicates()
    } catch (err: any) {
      setError(`Deletion failed: ${err}`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <Copy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              Duplicate File Finder (3-Stage Verification)
            </h1>
            <p className="text-xs text-[#6E747D]">
              Exact byte-for-byte duplicate verification using size grouping, 4KB header checks, and SHA-256 cryptographic hashing.
            </p>
          </div>
        </div>

        {groups.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
              <span className="text-[#6E747D]">Duplicate Groups:</span>
              <span className="text-[#E6E8EB] font-semibold">{groups.length}</span>
            </div>
            <div className="px-3 py-1.5 bg-[#1D2024] border border-[#30343A] rounded text-[#9A9FA8] flex items-center gap-2">
              <span className="text-[#6E747D]">Reclaimable:</span>
              <span className="text-[#35B879] font-semibold">{formatBytes(selectedReclaimableBytes)}</span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowConfirmModal(true)}
              disabled={deleting || selectedPaths.size === 0}
              className="flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedPaths.size})
            </Button>
          </div>
        )}
      </div>

      {/* Target path search bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 bg-[#17191C] border border-[#30343A] p-3 rounded-lg">
        <div className="relative flex-1 w-full">
          <FolderOpen className="absolute left-3 top-2.5 w-4 h-4 text-[#6E747D]" />
          <input
            type="text"
            placeholder="Target directory path (e.g. C:\Users\Username\Downloads)... leave empty for user profile"
            value={targetPath}
            onChange={(e) => setTargetPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && scanDuplicates()}
            className="w-full bg-[#101113] border border-[#30343A] rounded pl-9 pr-3 py-1.5 text-xs font-mono text-[#E6E8EB] focus:outline-none focus:border-[#2878D0]"
          />
        </div>
        <Button
          size="sm"
          variant="default"
          onClick={scanDuplicates}
          disabled={loading}
          className="bg-[#2878D0] hover:bg-[#2878D0]/80 text-white font-mono text-xs w-full sm:w-auto"
        >
          <Search className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
          Scan Duplicates
        </Button>
      </div>

      {resultMsg && (
        <div className="p-3 bg-[#35B879]/15 border border-[#35B879]/40 rounded text-xs text-[#35B879] flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{resultMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[#D94B4B]/15 border border-[#D94B4B]/40 rounded text-xs text-[#D94B4B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Controls bar */}
      {groups.length > 0 && (
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAllDuplicates}
              className="h-7 px-2 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B] text-xs"
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1 text-[#35B879]" />
              Select All Copies (Keep Originals)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeselectAll}
              className="h-7 px-2 text-[#9A9FA8] hover:text-[#E6E8EB] text-xs"
            >
              <Square className="w-3.5 h-3.5 mr-1" />
              Deselect All
            </Button>
          </div>
          <span className="text-[#6E747D] font-mono">
            {selectedPaths.size} file(s) selected for deletion
          </span>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="bg-[#17191C] border-[#30343A] p-12 text-center text-[#6E747D]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2878D0] mx-auto mb-2" />
            <div className="space-y-1">
              <span className="font-semibold text-[#E6E8EB] block text-sm">
                Running 3-Stage Duplicate Pipeline...
              </span>
              <span className="text-xs text-[#6E747D] block">
                Stage 1: Size hashing → Stage 2: 4KB Header sampling → Stage 3: SHA-256 verification
              </span>
            </div>
          </Card>
        ) : groups.length === 0 ? (
          <Card className="bg-[#17191C] border-[#30343A] p-8 text-center text-[#6E747D]">
            <FileCheck className="w-8 h-8 text-[#35B879] mx-auto mb-2 opacity-80" />
            <span className="block text-sm text-[#E6E8EB] font-medium">No duplicate files detected</span>
            <span className="text-xs text-[#6E747D]">
              Target folder contains only unique file assets or is clean.
            </span>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.id} className="bg-[#17191C] border-[#30343A] p-3 space-y-2 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#22262B]">
                <div className="truncate">
                  <span className="text-[#6E747D] mr-2">ORIGINAL FILE:</span>
                  <span className="text-[#E6E8EB] font-semibold">{group.original_path}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded bg-[#22262B] text-[#9A9FA8] border border-[#30343A]">
                    {formatBytes(group.file_size)} each
                  </span>
                  <span className="text-[10px] text-[#6E747D] truncate max-w-[120px]" title={group.sha256_hash}>
                    SHA: {group.sha256_hash.substring(0, 10)}...
                  </span>
                </div>
              </div>

              {/* Duplicate copies */}
              <div className="space-y-1.5 pl-2">
                {group.duplicate_paths.map((dupPath) => {
                  const isChecked = selectedPaths.has(dupPath)
                  return (
                    <label
                      key={dupPath}
                      className={cn(
                        'flex items-center gap-2.5 p-1.5 rounded border cursor-pointer transition-colors',
                        isChecked
                          ? 'bg-[#1D2024] border-[#D94B4B]/40 text-[#E6E8EB]'
                          : 'bg-[#121316] border-[#22262B] text-[#9A9FA8]'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectPath(dupPath)}
                        className="rounded bg-[#101113] border-[#30343A] text-[#D94B4B] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[10px] font-sans px-1 py-0.2 rounded bg-[#D94B4B]/15 text-[#D94B4B]">
                        DUPLICATE
                      </span>
                      <span className="truncate">{dupPath}</span>
                    </label>
                  )
                })}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirm Duplicate Deletion"
          className="max-w-md"
        >
          <div className="space-y-4 text-xs font-sans">
            <p className="text-[#9A9FA8]">
              Are you sure you want to permanently delete the selected duplicate files? Originals are preserved and will not be touched.
            </p>

            <div className="p-3 bg-[#101113] border border-[#30343A] rounded text-center">
              <span className="text-xl font-bold font-mono text-[#D94B4B]">
                {selectedPaths.size} Files ({formatBytes(selectedReclaimableBytes)})
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#30343A]">
              <Button variant="ghost" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteSelected}>
                Confirm Deletion
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
