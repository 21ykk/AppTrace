import React from 'react'
import { SupportLevel } from '../../types/telemetry'
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react'

interface StatusPillProps {
  level: SupportLevel
  label?: string
}

export const StatusPill: React.FC<StatusPillProps> = ({ level, label }) => {
  if (level.status === 'Full') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#35B879]/15 text-[#35B879] border border-[#35B879]/30">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#35B879]" />
        {label ? `${label}: Full` : 'Full'}
      </span>
    )
  }

  if (level.status === 'Degraded') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#E4A83A]/15 text-[#E4A83A] border border-[#E4A83A]/30"
        title={level.details.reason}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-[#E4A83A]" />
        {label ? `${label}: Degraded` : 'Degraded'}
      </span>
    )
  }

  if (level.status === 'PermissionRequired') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#D94B4B]/15 text-[#D94B4B] border border-[#D94B4B]/30"
        title={`Missing: ${level.details.missing_permission}`}
      >
        <ShieldAlert className="w-3.5 h-3.5 text-[#D94B4B]" />
        {label ? `${label}: Permission Required` : 'Permission Required'}
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#22262B] text-[#9A9FA8] border border-[#30343A]"
      title={level.details.reason}
    >
      <XCircle className="w-3.5 h-3.5 text-[#6E747D]" />
      {label ? `${label}: Unavailable` : 'Unavailable'}
    </span>
  )
}
