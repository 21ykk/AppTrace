import React, { useId } from 'react'

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  width?: number
  min?: number
  max?: number
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#2878D0',
  height = 28,
  width = 100,
  min,
  max,
}) => {
  const uid = useId()
  const gradId = `spark-grad-${uid.replace(/:/g, '')}`

  if (!data || data.length < 2) {
    return <div style={{ height, width }} className="flex items-center justify-center text-[10px] text-[#6E747D] font-mono">--</div>
  }

  const effectiveMin = min ?? Math.min(...data)
  const effectiveMax = max ?? Math.max(...data, effectiveMin + 1)
  const range = effectiveMax - effectiveMin || 1

  const pts = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width
    const y = height - ((val - effectiveMin) / range) * (height - 4) - 2
    return { x, y }
  })

  // Build line path
  const pathParts: string[] = [`M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`]
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cpX = (prev.x + curr.x) / 2
    pathParts.push(`C ${cpX.toFixed(1)},${prev.y.toFixed(1)} ${cpX.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`)
  }
  const pathD = pathParts.join(' ')
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`

  return (
    <svg width={width} height={height} className="overflow-hidden shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
