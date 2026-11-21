import React, { useState, useEffect } from 'react'
import { ManagementService } from '../../services/management/managementService'
import type { RegistryKeyNode, RegistryValueItem } from '../../types/management'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import {
  FileCode,
  Search,
  RefreshCw,
  Folder,
  FolderOpen,
  Download,
  Trash2,
  Plus,
  AlertTriangle,
  ChevronRight,
  ArrowUp,
  FileText,
  Key,
} from 'lucide-react'
import { cn } from '../../utils/cn'

export const RegistryPage: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('HKEY_CURRENT_USER')
  const [pathInput, setPathInput] = useState('HKEY_CURRENT_USER')
  const [currentNode, setCurrentNode] = useState<RegistryKeyNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Add / Edit Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [valName, setValName] = useState('')
  const [valType, setValType] = useState('REG_SZ')
  const [valData, setValData] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadKeyNode = async (path: string) => {
    try {
      setLoading(true)
      setError(null)
      const node = await ManagementService.getRegistryKeyNode(path)
      setCurrentNode(node)
      setCurrentPath(node.key_path || path)
      setPathInput(node.key_path || path)
    } catch (err: any) {
      setError(err?.toString() || `Failed to read key: ${path}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeyNode(currentPath)
  }, [])

  const handleNavigateSubkey = (subkeyName: string) => {
    const nextPath = currentPath
      ? `${currentPath}\\${subkeyName}`
      : subkeyName
    loadKeyNode(nextPath)
  }

  const handleNavigateUp = () => {
    if (!currentPath || currentPath === 'ROOT') return
    const idx = currentPath.lastIndexOf('\\')
    if (idx !== -1) {
      const parent = currentPath.substring(0, idx)
      loadKeyNode(parent)
    } else {
      loadKeyNode('ROOT')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setError(null)
    try {
      const results = await ManagementService.searchRegistry(searchQuery, currentPath)
      setSearchResults(results)
    } catch (err: any) {
      setError(`Search failed: ${err}`)
    } finally {
      setIsSearching(false)
    }
  }

  const handleExportReg = async () => {
    try {
      const content = await ManagementService.exportRegistryKey(currentPath)
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registry_export_${Date.now()}.reg`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(`Export failed: ${err}`)
    }
  }

  const handleSaveValue = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await ManagementService.setRegistryValue(currentPath, valName, valData, valType)
      await ManagementService.recordOperation(
        'Registry_Edit',
        valName || '(Default)',
        currentPath,
        'Success',
        JSON.stringify({ type: valType, data_preview: valData.substring(0, 100) })
      )
      setShowEditModal(false)
      loadKeyNode(currentPath)
    } catch (err: any) {
      setError(`Failed to save value: ${err}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteValue = async (name: string) => {
    if (!confirm(`Are you sure you want to delete value "${name || '(Default)'}"?`)) return
    try {
      await ManagementService.deleteRegistryItem(currentPath, name)
      loadKeyNode(currentPath)
    } catch (err: any) {
      setError(`Failed to delete value: ${err}`)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto text-[#E6E8EB] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#17191C] border border-[#30343A] p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1D2024] border border-[#30343A] rounded-md text-[#2878D0]">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E6E8EB] tracking-wide flex items-center gap-2">
              Windows Registry & Configuration Manager
            </h1>
            <p className="text-xs text-[#6E747D]">
              Explore system hives, safely inspect values, search configuration trees, and export registration files.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportReg}
            className="flex items-center gap-1.5 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B] text-xs font-mono"
          >
            <Download className="w-3.5 h-3.5" />
            Export .reg
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              setValName('')
              setValData('')
              setValType('REG_SZ')
              setShowEditModal(true)
            }}
            className="flex items-center gap-1.5 bg-[#2878D0] hover:bg-[#2878D0]/80 text-white text-xs font-mono"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Value
          </Button>
        </div>
      </div>

      {/* Path Bar & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 flex items-center gap-2 bg-[#17191C] border border-[#30343A] p-2 rounded-lg">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleNavigateUp}
            className="h-8 px-2 text-[#9A9FA8] hover:text-[#E6E8EB]"
            title="Navigate to parent key"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadKeyNode(pathInput)}
            className="flex-1 bg-[#101113] border border-[#30343A] rounded px-3 py-1.5 text-xs font-mono text-[#E6E8EB] focus:outline-none focus:border-[#2878D0]"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadKeyNode(pathInput)}
            disabled={loading}
            className="h-8 px-3 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B]"
          >
            Go
          </Button>
        </div>

        <div className="flex items-center gap-2 bg-[#17191C] border border-[#30343A] p-2 rounded-lg">
          <input
            type="text"
            placeholder="Search key in branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-[#101113] border border-[#30343A] rounded px-3 py-1.5 text-xs text-[#E6E8EB] focus:outline-none focus:border-[#2878D0]"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSearch}
            disabled={isSearching}
            className="h-8 px-3 border-[#30343A] bg-[#1D2024] hover:bg-[#22262B]"
          >
            <Search className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#D94B4B]/15 border border-[#D94B4B]/40 rounded text-xs text-[#D94B4B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search results banner if any */}
      {searchResults.length > 0 && (
        <Card className="bg-[#17191C] border-[#30343A] p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#E6E8EB]">Search Results ({searchResults.length})</span>
            <button
              onClick={() => setSearchResults([])}
              className="text-[#6E747D] hover:text-[#9A9FA8]"
            >
              Clear
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {searchResults.map((res, i) => (
              <div
                key={i}
                onClick={() => {
                  loadKeyNode(res)
                  setSearchResults([])
                }}
                className="p-1.5 bg-[#101113] hover:bg-[#1D2024] rounded border border-[#30343A] font-mono text-xs text-[#2878D0] cursor-pointer truncate"
              >
                {res}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Registry Explorer Grid: Left Subkeys Tree, Right Values Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Subkeys Column */}
        <Card className="bg-[#17191C] border-[#30343A] p-3 space-y-2 h-[550px] flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-[#30343A] text-xs font-semibold text-[#9A9FA8]">
            <span>SUBKEYS ({currentNode?.subkeys.length || 0})</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => loadKeyNode(currentPath)}
              disabled={loading}
              className="h-6 w-6 p-0 text-[#6E747D]"
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
            {loading && !currentNode ? (
              <div className="py-8 text-center text-[#6E747D]">Loading subkeys...</div>
            ) : currentNode?.subkeys.length === 0 ? (
              <div className="py-8 text-center text-[#6E747D]">No subkeys in this node.</div>
            ) : (
              currentNode?.subkeys.map((sub) => (
                <div
                  key={sub}
                  onClick={() => handleNavigateSubkey(sub)}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-[#1D2024] cursor-pointer text-[#E6E8EB] transition-colors group"
                >
                  <Folder className="w-3.5 h-3.5 text-[#2878D0] shrink-0" />
                  <span className="truncate group-hover:text-white">{sub}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Right Values Column */}
        <Card className="md:col-span-2 bg-[#17191C] border-[#30343A] p-0 h-[550px] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[#30343A] bg-[#121316] flex items-center justify-between text-xs font-semibold text-[#9A9FA8]">
            <span>REGISTRY VALUES ({currentNode?.values.length || 0})</span>
            <span className="font-mono text-[11px] text-[#6E747D] truncate max-w-sm">{currentPath}</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#30343A] bg-[#101113] text-[#9A9FA8] font-mono uppercase text-[11px]">
                  <th className="py-2 px-3 font-medium">Name</th>
                  <th className="py-2 px-3 font-medium">Type</th>
                  <th className="py-2 px-3 font-medium">Data</th>
                  <th className="py-2 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22262B] font-mono">
                {loading && !currentNode ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[#6E747D]">
                      Reading values...
                    </td>
                  </tr>
                ) : currentNode?.values.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-[#6E747D]">
                      (Default) value not set. No additional values.
                    </td>
                  </tr>
                ) : (
                  currentNode?.values.map((v) => (
                    <tr key={v.name} className="hover:bg-[#1D2024]/70 transition-colors">
                      <td className="py-2 px-3 font-semibold text-[#E6E8EB] max-w-[140px] truncate">
                        {v.name}
                      </td>
                      <td className="py-2 px-3 text-[#9A9FA8]">
                        <span className="px-1 py-0.5 rounded text-[10px] bg-[#22262B] border border-[#30343A]">
                          {v.val_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#E6E8EB] max-w-xs truncate" title={v.data_preview}>
                        {v.data_preview}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteValue(v.name)}
                          className="h-6 w-6 p-0 text-[#D94B4B] hover:bg-[#D94B4B]/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add / Edit Value Modal */}
      {showEditModal && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Set Registry Value in ${currentPath}`}
          className="max-w-md"
        >
          <div className="space-y-3 text-xs font-sans">
            <div>
              <label className="block text-[11px] text-[#9A9FA8] mb-1">Value Name (Leave blank for Default)</label>
              <input
                type="text"
                placeholder="(Default)"
                value={valName}
                onChange={(e) => setValName(e.target.value)}
                className="w-full bg-[#101113] border border-[#30343A] rounded px-3 py-1.5 text-xs text-[#E6E8EB] font-mono focus:outline-none focus:border-[#2878D0]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#9A9FA8] mb-1">Value Type</label>
              <select
                value={valType}
                onChange={(e) => setValType(e.target.value)}
                className="w-full bg-[#101113] border border-[#30343A] rounded px-3 py-1.5 text-xs text-[#E6E8EB] font-mono focus:outline-none focus:border-[#2878D0]"
              >
                <option value="REG_SZ">REG_SZ (String)</option>
                <option value="REG_DWORD">REG_DWORD (32-bit Integer)</option>
                <option value="REG_QWORD">REG_QWORD (64-bit Integer)</option>
                <option value="REG_EXPAND_SZ">REG_EXPAND_SZ (Expandable String)</option>
                <option value="REG_MULTI_SZ">REG_MULTI_SZ (Multi-String)</option>
                <option value="REG_BINARY">REG_BINARY (Binary Data)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#9A9FA8] mb-1">Value Data</label>
              <textarea
                rows={3}
                value={valData}
                onChange={(e) => setValData(e.target.value)}
                placeholder="Enter string, integer, or hex data..."
                className="w-full bg-[#101113] border border-[#30343A] rounded px-3 py-1.5 text-xs text-[#E6E8EB] font-mono focus:outline-none focus:border-[#2878D0]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#30343A]">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleSaveValue} disabled={isSaving}>
                Save Value
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
