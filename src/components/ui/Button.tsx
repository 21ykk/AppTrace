import React from 'react'
import { cn } from '../../utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'default' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'default'
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2878D0] disabled:opacity-40 disabled:pointer-events-none rounded-md cursor-pointer'

  const variants = {
    primary:
      'bg-[#2878D0] hover:bg-[#2066b5] text-white border border-[#3788e0]',
    default:
      'bg-[#2878D0] hover:bg-[#2066b5] text-white border border-[#3788e0]',
    secondary:
      'bg-[#22262B] hover:bg-[#2a2f36] text-[#E6E8EB] border border-[#30343A]',
    danger:
      'bg-[#D94B4B] hover:bg-[#c23d3d] text-white border border-[#e55c5c]',
    destructive:
      'bg-[#D94B4B] hover:bg-[#c23d3d] text-white border border-[#e55c5c]',
    ghost:
      'hover:bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB]',
    outline:
      'border border-[#30343A] text-[#E6E8EB] hover:bg-[#22262B]',
  }

  const sizes = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3.5 py-1.5 gap-2',
    default: 'text-xs px-3.5 py-1.5 gap-2',
    lg: 'text-sm px-4 py-2 gap-2.5',
  }

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
