import React from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-medium text-[#9A9FA8]">{label}</label>}
      <input
        className={cn(
          'bg-[#101113] border border-[#30343A] rounded-md px-3 py-1.5 text-xs text-[#E6E8EB] placeholder:text-[#6E747D] focus:outline-none focus:border-[#2878D0] focus:ring-1 focus:ring-[#2878D0]/50 transition-colors font-mono',
          error && 'border-[#D94B4B] focus:border-[#D94B4B] focus:ring-[#D94B4B]/50',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-[#D94B4B]">{error}</span>}
    </div>
  )
}
