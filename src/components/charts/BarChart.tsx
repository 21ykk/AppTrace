import React from 'react'

interface BarItem {
  label: string
  value: number
  max: number
  sublabel?: string
  color?: string
}

interface BarChartProps {
  items: BarItem[]
}

export const BarChart: React.FC<BarChartProps> = ({ items }) => {
  return (
    <div className="space-y-2.5 w-full">
      {items.map((item, idx) => {
        const pct = Math.min(100, Math.max(0, (item.value / (item.max || 1)) * 100))
        const barColor = item.color || (pct > 90 ? '#f43f5e' : pct > 75 ? '#fbbf24' : '#a855f7')

        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300 font-medium truncate max-w-[200px]">{item.label}</span>
              <span className="text-slate-400">
                {item.sublabel ? item.sublabel : `${item.value.toFixed(1)} / ${item.max.toFixed(0)}`}
              </span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/50">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
