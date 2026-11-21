import React from 'react'
import { cn } from '../../utils/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-[#22262B] text-[#9A9FA8] border-[#30343A]',
    success: 'bg-[#35B879]/15 text-[#35B879] border-[#35B879]/40',
    warning: 'bg-[#E4A83A]/15 text-[#E4A83A] border-[#E4A83A]/40',
    error: 'bg-[#D94B4B]/15 text-[#D94B4B] border-[#D94B4B]/40',
    info: 'bg-[#2878D0]/15 text-[#5aa1f2] border-[#2878D0]/40',
    purple: 'bg-[#22262B] text-[#E6E8EB] border-[#30343A]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border tracking-tight',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
