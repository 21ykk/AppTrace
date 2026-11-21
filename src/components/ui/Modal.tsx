import React from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-100">
      <div className={cn("bg-[#17191C] border border-[#30343A] rounded-lg shadow-2xl shadow-black max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]", className)}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30343A]">
          <h3 className="font-semibold text-[#E6E8EB] text-sm border-l-2 border-[#2878D0] pl-2.5 font-sans">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[#9A9FA8] hover:text-white hover:bg-[#22262B] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-3">{children}</div>
      </div>
    </div>
  )
}
