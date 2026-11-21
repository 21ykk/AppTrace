import React, { useId } from 'react'

interface AreaChartProps {
  data: Array<{ label?: string; value: number }>
  color?: string
  height?: number
  maxVal?: number
  unit?: string
}

function smoothSvgPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`
  }

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const tension = 0.2
    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  color = '#2878D0',
  height = 140,
  maxVal,
  unit = '%',
}) => {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const gradientId = `area-grad-${rawId}`

  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-[#6E747D] font-mono">
        Waiting for telemetry samples...
      </div>
    )
  }

  const values = data.map((d) => d.value)
  const effectiveMax = maxVal ?? Math.max(10, ...values)
  const width = 600

  const points = data.map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width
    const clamped = Math.max(0, Math.min(effectiveMax, d.value))
    const y = height - (clamped / effectiveMax) * (height - 18) - 10
    return { x, y }
  })

  const linePath = smoothSvgPath(points)
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`
  const latestValue = values[values.length - 1] ?? 0

  return (
    <div className="relative w-full overflow-hidden">
      <div className="absolute top-1 right-2 z-10 flex items-center gap-1.5 font-mono text-[11px] text-[#9A9FA8]">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-semibold text-[#E6E8EB]">{latestValue.toFixed(1)}</span>
        <span>{unit}</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Subtle grid lines */}
        <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#30343A" strokeDasharray="3 3" strokeWidth="0.8" />
        <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#30343A" strokeDasharray="3 3" strokeWidth="0.8" />
        <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#30343A" strokeDasharray="3 3" strokeWidth="0.8" />

        {/* Filled gradient area */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Main curve */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* Latest point indicator */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="3"
            fill={color}
            stroke="#17191C"
            strokeWidth="1.5"
          />
        )}
      </svg>
    </div>
  )
}
