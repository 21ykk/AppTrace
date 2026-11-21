import React, { useState } from 'react'
import { useDashboardStore } from '../../stores/dashboardStore'
import { WIDGET_REGISTRY } from '../../widgets/registry'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Plus, Edit2, Check, Download, Upload, Trash2, Layout, Sliders, X } from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const {
    dashboards,
    activeDashboard,
    activeDashboardId,
    setActiveDashboard,
    isEditing,
    setEditingMode,
    addWidget,
    removeWidget,
    createNewDashboard,
    deleteDashboard,
    importDashboard,
  } = useDashboardStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showNewDashModal, setShowNewDashModal] = useState(false)
  const [newDashName, setNewDashName] = useState('')
  const [newDashDesc, setNewDashDesc] = useState('')
  const [importJsonText, setImportJsonText] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)

  const handleExport = () => {
    if (!activeDashboard) return
    const blob = new Blob([JSON.stringify(activeDashboard, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `apptrace-dashboard-${activeDashboard.id}.json`
    a.click()
  }

  const handleCreateDash = async () => {
    if (!newDashName.trim()) return
    await createNewDashboard(newDashName, newDashDesc)
    setNewDashName('')
    setNewDashDesc('')
    setShowNewDashModal(false)
  }

  const handleImport = async () => {
    if (!importJsonText.trim()) return
    const success = await importDashboard(importJsonText)
    if (success) {
      setImportJsonText('')
      setShowImportModal(false)
    } else {
      alert('Failed to import dashboard: Invalid JSON schema.')
    }
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Dashboard Top Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#17191C] p-2.5 rounded-lg border border-[#30343A]">
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-[#2878D0]" />
          <select
            value={activeDashboardId}
            onChange={(e) => setActiveDashboard(e.target.value)}
            className="bg-[#101113] border border-[#30343A] rounded px-2.5 py-1 text-xs font-mono text-[#E6E8EB] focus:outline-none focus:border-[#2878D0]"
          >
            {dashboards.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.is_default ? '(Default)' : ''}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewDashModal(true)}
            className="text-xs text-[#9A9FA8] hover:text-white"
          >
            + New
          </Button>
          {dashboards.length > 1 && !activeDashboard?.is_default && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteDashboard(activeDashboardId)}
              className="text-xs text-[#D94B4B] hover:text-[#ff6b6b]"
              title="Delete this dashboard"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isEditing ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setEditingMode(!isEditing)}
            icon={isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
          >
            {isEditing ? 'Done Editing' : 'Customize Layout'}
          </Button>

          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
              icon={<Plus className="w-3.5 h-3.5 text-[#2878D0]" />}
            >
              Add Widget
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={handleExport} title="Export Dashboard JSON">
            <Download className="w-3.5 h-3.5 text-[#9A9FA8]" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)} title="Import Dashboard JSON">
            <Upload className="w-3.5 h-3.5 text-[#9A9FA8]" />
          </Button>
        </div>
      </div>

      {/* Widgets Grid Container */}
      {activeDashboard && activeDashboard.widgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5">
          {activeDashboard.widgets.map((w) => {
            const entry = WIDGET_REGISTRY[w.type_id]
            if (!entry) return null
            const WidgetComponent = entry.component

            const colSpanClass =
              w.w === 12
                ? 'lg:col-span-12'
                : w.w === 8
                ? 'lg:col-span-8'
                : w.w === 6
                ? 'lg:col-span-6'
                : w.w === 4
                ? 'lg:col-span-4'
                : 'lg:col-span-6'

            return (
              <div key={w.id} className={colSpanClass}>
                <Card className="h-full flex flex-col justify-between border-[#30343A] bg-[#17191C] relative group p-3">
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#30343A]/60">
                    <span className="font-semibold text-xs tracking-wide text-[#E6E8EB] font-mono flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2878D0]" />
                      {w.title || entry.title}
                    </span>

                    {isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeWidget(w.id)}
                          className="p-1 text-[#6E747D] hover:text-[#D94B4B] rounded transition-colors"
                          title="Remove widget"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <WidgetComponent widget={w} isEditing={isEditing} />
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-14 rounded-lg border border-dashed border-[#30343A] bg-[#17191C]/50 text-center space-y-3">
          <Sliders className="w-8 h-8 text-[#6E747D]" />
          <h3 className="font-semibold text-[#E6E8EB] text-sm">Dashboard is Empty</h3>
          <p className="text-xs text-[#9A9FA8] max-w-sm">
            Add observability widgets from the library to build your custom telemetry view.
          </p>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            Add Widget
          </Button>
        </div>
      )}

      {/* Add Widget Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Observability Widget Library">
        <div className="space-y-3">
          <p className="text-xs text-[#9A9FA8]">Select an enterprise telemetry widget to add to your dashboard:</p>
          <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
            {Object.values(WIDGET_REGISTRY).map((entry) => (
              <div
                key={entry.type_id}
                className="p-3 rounded-lg bg-[#101113] border border-[#30343A] hover:border-[#2878D0] transition-colors flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#E6E8EB] font-mono">{entry.title}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#22262B] text-[#9A9FA8] border border-[#30343A] font-mono uppercase">
                      {entry.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9A9FA8] mt-1">{entry.description}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    addWidget(entry.type_id, entry.title, entry.default_w, entry.default_h)
                    setShowAddModal(false)
                  }}
                  className="shrink-0"
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* New Dashboard Modal */}
      <Modal isOpen={showNewDashModal} onClose={() => setShowNewDashModal(false)} title="Create New Dashboard">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-[#9A9FA8] font-medium">Dashboard Name</label>
            <input
              type="text"
              value={newDashName}
              onChange={(e) => setNewDashName(e.target.value)}
              placeholder="e.g., Performance Diagnostics"
              className="w-full bg-[#101113] border border-[#30343A] rounded px-3 py-1.5 text-xs text-[#E6E8EB] focus:outline-none focus:border-[#2878D0] font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#9A9FA8] font-medium">Description</label>
            <textarea
              value={newDashDesc}
              onChange={(e) => setNewDashDesc(e.target.value)}
              placeholder="Dashboard purpose or telemetry focus..."
              rows={2}
              className="w-full bg-[#101113] border border-[#30343A] rounded px-3 py-1.5 text-xs text-[#E6E8EB] focus:outline-none focus:border-[#2878D0] font-mono"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowNewDashModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateDash}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Dashboard JSON">
        <div className="space-y-3">
          <p className="text-xs text-[#9A9FA8]">Paste raw dashboard JSON configuration to import:</p>
          <textarea
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            rows={8}
            placeholder="{ ... }"
            className="w-full bg-[#101113] border border-[#30343A] rounded p-2.5 text-xs font-mono text-[#E6E8EB] focus:outline-none focus:border-[#2878D0]"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleImport}>
              Import Dashboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
