import React from 'react'
import { cn } from '../../utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'bg-[#17191C] border border-[#30343A] rounded-lg p-3.5 text-[#E6E8EB] transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
