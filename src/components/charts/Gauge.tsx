import React from 'react'

interface GaugeProps {
  value: number
  max?: number
  label: string
  unit?: string
  color?: string
  size?: number
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  max = 100,
  label,
  unit = '%',
  color = '#2878D0',
  size = 120,
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference

  const effectiveColor = pct > 90 ? '#D94B4B' : pct > 75 ? '#E4A83A' : color

  return (
    <div className="flex flex-col items-center justify-center p-1">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#22262B"
            strokeWidth="7"
            fill="transparent"
          />
          {/* Colored arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={effectiveColor}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-300 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold font-mono text-[#E6E8EB] tracking-tight leading-none">
            {value.toFixed(0)}
            <span className="text-xs text-[#9A9FA8] font-normal ml-0.5">{unit}</span>
          </span>
        </div>
      </div>
      <span className="text-[11px] font-medium mt-1 text-center font-mono text-[#9A9FA8]">
        {label}
      </span>
    </div>
  )
}
