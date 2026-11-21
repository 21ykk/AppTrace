import React, { useEffect, useState } from 'react'
import { GraphNode } from './ForceGraph'
import { formatBytes } from '../../utils/formatters'
import {
  X,
  Activity,
  Globe,
  MapPin,
  Building,
  Copy,
  Check,
  Shield,
  Wifi,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { resolveIpGeo, GeoIpInfo } from '../../services/network/geoIpService'

interface NodeDetailsPanelProps {
  node: GraphNode | null
  onClose: () => void
}

export const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ node, onClose }) => {
  const [geo, setGeo] = useState<GeoIpInfo | null>(node?.geo || null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!node) return
    if (node.type === 'network_endpoint' && node.ip) {
      if (node.geo) {
        setGeo(node.geo)
      } else {
        resolveIpGeo(node.ip).then(setGeo)
      }
    } else {
      setGeo(null)
    }
  }, [node])

  if (!node) return null

  const isProcess = node.type === 'process'

  const handleCopyIp = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-[#17191C] border border-[#30343A] rounded-lg p-3.5 shadow-2xl shadow-black flex flex-col gap-3 min-w-[300px] max-w-[360px] animate-in fade-in duration-100 font-mono text-xs">
      {/* Title Bar */}
      <div className="flex items-start justify-between border-b border-[#30343A] pb-2">
        <div className="flex items-center gap-2">
          {isProcess ? (
            <div className="w-7 h-7 rounded bg-[#2878D0]/15 border border-[#2878D0]/30 flex items-center justify-center text-[#2878D0]">
              <Activity className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded bg-[#35B879]/15 border border-[#35B879]/30 flex items-center justify-center text-[#35B879]">
              <Globe className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="truncate">
            <span className="font-semibold text-xs text-[#E6E8EB] truncate block max-w-[210px] font-sans">
              {node.label}
            </span>
            <span className="text-[10px] text-[#9A9FA8]">
              {isProcess ? `PID ${node.pid}` : 'Network Socket'}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-[#6E747D] hover:text-[#E6E8EB] hover:bg-[#22262B] rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metrics breakdown */}
      {isProcess ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 bg-[#101113] p-2.5 rounded border border-[#30343A]">
            <div>
              <span className="text-[10px] text-[#6E747D] block uppercase">CPU Load</span>
              <span className="text-[#2878D0] font-bold text-sm">{(node.cpu ?? 0).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[10px] text-[#6E747D] block uppercase">Working Set</span>
              <span className="text-[#E6E8EB] font-bold text-sm">{formatBytes(node.memory ?? 0)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] p-2 bg-[#101113] rounded border border-[#30343A]">
            <span className="text-[#9A9FA8]">Classification:</span>
            <Badge variant={node.isUserApp ? 'success' : 'default'}>
              {node.isUserApp ? 'User Application' : 'System Service'}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-[#101113] p-2.5 rounded border border-[#30343A] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#6E747D] uppercase">Remote IP:</span>
              <div className="flex items-center gap-1.5 font-bold text-[#E6E8EB]">
                <span>{node.ip}</span>
                <button
                  onClick={() => node.ip && handleCopyIp(node.ip)}
                  className="p-0.5 text-[#6E747D] hover:text-white rounded"
                  title="Copy IP"
                >
                  {copied ? <Check className="w-3 h-3 text-[#35B879]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#6E747D] uppercase">Remote Port:</span>
              <span className="text-[#2878D0] font-semibold">{node.port || '-'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#6E747D] uppercase">TCP State:</span>
              <span className="text-[#35B879]">{node.state || 'ESTABLISHED'}</span>
            </div>
          </div>

          {/* GeoIP Details */}
          {geo && (
            <div className="p-2.5 bg-[#101113] rounded border border-[#30343A] space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-[#E6E8EB] font-semibold">
                <span className="text-sm">{geo.flag}</span>
                <span>{geo.country}{geo.city ? `, ${geo.city}` : ''}</span>
              </div>
              {geo.org && (
                <div className="flex items-center gap-1.5 text-[#9A9FA8] text-[10px]">
                  <Building className="w-3 h-3 text-[#6E747D] shrink-0" />
                  <span className="truncate">{geo.org}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
