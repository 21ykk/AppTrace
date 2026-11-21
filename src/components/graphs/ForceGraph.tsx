import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { ProcessInfo, NetworkConnection } from '../../types/telemetry'
import { ZoomIn, ZoomOut, RotateCcw, Filter, Pause, Play, Sparkles, MousePointer } from 'lucide-react'
import { isSystemProcess, isUserApp } from '../../utils/processClassifier'
import { resolveIpGeo, getCachedIpGeo, GeoIpInfo } from '../../services/network/geoIpService'

export interface GraphNode {
  id: string
  label: string
  type: 'process' | 'network_endpoint'
  isUserApp?: boolean
  hasNetwork?: boolean
  pid?: number
  cpu?: number
  memory?: number
  ip?: string
  port?: number
  state?: string
  geo?: GeoIpInfo
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  pinned?: boolean
}

export interface GraphLink {
  source: string
  target: string
  label?: string
}

export type GraphCategoryFilter = 'all' | 'user_apps' | 'network_active' | 'system' | 'high_usage'
export type GraphSpeedMode = 'slow' | 'normal' | 'paused'

interface ForceGraphProps {
  processes: ProcessInfo[]
  connections: NetworkConnection[]
  onSelectNode: (node: GraphNode | null) => void
  selectedNodeId?: string | null
  filterText?: string
  nodeTypeFilter?: 'all' | 'process' | 'network'
  categoryFilter?: GraphCategoryFilter
  maxNodesLimit?: number
  speedMode?: GraphSpeedMode
  onToggleSpeed?: () => void
}

export const ForceGraph: React.FC<ForceGraphProps> = ({
  processes,
  connections,
  onSelectNode,
  selectedNodeId,
  filterText = '',
  nodeTypeFilter = 'all',
  categoryFilter = 'all',
  maxNodesLimit = 35,
  speedMode = 'slow',
  onToggleSpeed,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Camera transform: x, y, scale
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const [, setTransformState] = useState({ x: 0, y: 0, scale: 1 })

  // Persistent nodes & links across telemetry updates
  const nodesMapRef = useRef<Map<string, GraphNode>>(new Map())
  const linksRef = useRef<GraphLink[]>([])

  // Interaction refs (0ms lag, no React re-render on mouse movement)
  const draggingNodeRef = useRef<GraphNode | null>(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const hoveredNodeRef = useRef<GraphNode | null>(null)
  const didDragRef = useRef(false)

  // Animation & simulation
  const animFrameRef = useRef<number | null>(null)
  const dashOffsetRef = useRef(0)

  // 1. Reconcile telemetry data into persistent node map
  useEffect(() => {
    const existing = nodesMapRef.current
    const linkList: GraphLink[] = []

    const procWithNetwork = new Set<number>()
    connections.forEach((c) => {
      if (c.pid) procWithNetwork.add(c.pid)
    })

    // Filter candidate processes
    let candidates = processes.filter((p) => {
      if (categoryFilter === 'user_apps') return isUserApp(p)
      if (categoryFilter === 'system') return isSystemProcess(p)
      if (categoryFilter === 'network_active') return procWithNetwork.has(p.pid)
      if (categoryFilter === 'high_usage') {
        return p.cpu_usage > 1.0 || p.memory_bytes > 100 * 1024 * 1024
      }
      return true
    })

    // Sort: prioritize active network, CPU, RAM
    candidates.sort((a, b) => {
      const aNet = procWithNetwork.has(a.pid) ? 1 : 0
      const bNet = procWithNetwork.has(b.pid) ? 1 : 0
      if (bNet !== aNet) return bNet - aNet
      if (b.cpu_usage !== a.cpu_usage) return b.cpu_usage - a.cpu_usage
      return b.memory_bytes - a.memory_bytes
    })

    const activeProcs = candidates.slice(0, maxNodesLimit)
    const activeProcIds = new Set<string>()

    activeProcs.forEach((p, idx) => {
      const id = `proc-${p.pid}`
      activeProcIds.add(id)

      if (existing.has(id)) {
        const node = existing.get(id)!
        node.cpu = p.cpu_usage
        node.memory = p.memory_bytes
        node.label = p.name
        node.isUserApp = isUserApp(p)
        node.hasNetwork = procWithNetwork.has(p.pid)
      } else {
        const angle = (idx / Math.max(1, activeProcs.length)) * 2 * Math.PI
        const radius = 130 + (idx % 4) * 45
        existing.set(id, {
          id,
          label: p.name,
          type: 'process',
          isUserApp: isUserApp(p),
          hasNetwork: procWithNetwork.has(p.pid),
          pid: p.pid,
          cpu: p.cpu_usage,
          memory: p.memory_bytes,
          x: 450 + Math.cos(angle) * radius,
          y: 320 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          radius: 20,
        })
      }

      if (p.ppid && activeProcIds.has(`proc-${p.ppid}`)) {
        linkList.push({
          source: `proc-${p.ppid}`,
          target: id,
          label: 'spawns',
        })
      }
    })

    // Reconcile network endpoints
    const activeNetIds = new Set<string>()
    connections.slice(0, 30).forEach((c, idx) => {
      if (c.pid && activeProcIds.has(`proc-${c.pid}`)) {
        const endpointId = `net-${c.remote_addr}:${c.remote_port}`
        activeNetIds.add(endpointId)

        const cachedGeo = getCachedIpGeo(c.remote_addr)

        if (existing.has(endpointId)) {
          const node = existing.get(endpointId)!
          node.state = c.state
          if (cachedGeo && !node.geo) node.geo = cachedGeo
        } else {
          const parentNode = existing.get(`proc-${c.pid}`)
          const parentX = parentNode ? parentNode.x : 450
          const parentY = parentNode ? parentNode.y : 320
          const angle = (idx / 30) * 2 * Math.PI

          const node: GraphNode = {
            id: endpointId,
            label: `${c.remote_addr}:${c.remote_port}`,
            type: 'network_endpoint',
            ip: c.remote_addr,
            port: c.remote_port,
            state: c.state,
            geo: cachedGeo || undefined,
            x: parentX + Math.cos(angle) * 85,
            y: parentY + Math.sin(angle) * 85,
            vx: 0,
            vy: 0,
            radius: 16,
          }
          existing.set(endpointId, node)

          if (!cachedGeo && c.remote_addr) {
            resolveIpGeo(c.remote_addr).then((resolved) => {
              if (existing.has(endpointId)) {
                existing.get(endpointId)!.geo = resolved
              }
            })
          }
        }

        linkList.push({
          source: `proc-${c.pid}`,
          target: endpointId,
          label: `${c.protocol} ${c.state}`,
        })
      }
    })

    // Prune obsolete nodes
    for (const key of Array.from(existing.keys())) {
      if (!activeProcIds.has(key) && !activeNetIds.has(key)) {
        existing.delete(key)
      }
    }

    linksRef.current = linkList
  }, [processes, connections, categoryFilter, maxNodesLimit])

  // Visible nodes filtered by search & type
  const getVisibleNodes = useCallback(() => {
    const list = Array.from(nodesMapRef.current.values())
    const q = filterText.toLowerCase().trim()

    return list.filter((n) => {
      if (nodeTypeFilter === 'process' && n.type !== 'process') return false
      if (nodeTypeFilter === 'network' && n.type !== 'network_endpoint') return false
      if (q) {
        const matchLabel = n.label.toLowerCase().includes(q)
        const matchPid = n.pid && n.pid.toString().includes(q)
        const matchGeo =
          n.geo &&
          (n.geo.country.toLowerCase().includes(q) ||
            n.geo.city?.toLowerCase().includes(q) ||
            n.geo.org?.toLowerCase().includes(q))
        return matchLabel || matchPid || matchGeo
      }
      return true
    })
  }, [filterText, nodeTypeFilter])

  // Count visible nodes for footer
  const visibleNodesCount = useMemo(() => {
    return getVisibleNodes().length
  }, [getVisibleNodes, processes, connections])

  // 2. High-Performance Hardware-Accelerated Canvas Rendering & Physics
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let isRunning = true

    const dt = speedMode === 'slow' ? 0.35 : 0.8
    const damping = speedMode === 'slow' ? 0.82 : 0.88
    const maxSpeed = speedMode === 'slow' ? 2.5 : 5.0
    const centerX = 450
    const centerY = 320

    const renderFrame = () => {
      if (!isRunning) return

      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const dpr = window.devicePixelRatio || 1

      // Auto resize canvas buffer to match physical CSS pixels
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr)
        canvas.height = Math.floor(height * dpr)
      }

      // Physics integration (only if not paused)
      const visibleNodes = getVisibleNodes()
      const n = visibleNodes.length
      const visibleSet = new Set(visibleNodes.map((vn) => vn.id))

      if (speedMode !== 'paused' && n > 0) {
        // Center gravity
        for (let i = 0; i < n; i++) {
          const node = visibleNodes[i]
          if (node.pinned) continue
          node.vx += (centerX - node.x) * 0.0006 * dt
          node.vy += (centerY - node.y) * 0.0006 * dt
        }

        // Coulomb repulsion
        for (let i = 0; i < n; i++) {
          const n1 = visibleNodes[i]
          for (let j = i + 1; j < n; j++) {
            const n2 = visibleNodes[j]
            const dx = n2.x - n1.x
            const dy = n2.y - n1.y
            const distSq = dx * dx + dy * dy + 400
            const dist = Math.sqrt(distSq)

            const repStrength = n1.type === 'process' && n2.type === 'process' ? 3200 : 1800
            const force = (repStrength / distSq) * dt

            const fx = (dx / dist) * force
            const fy = (dy / dist) * force

            if (!n1.pinned) {
              n1.vx -= fx
              n1.vy -= fy
            }
            if (!n2.pinned) {
              n2.vx += fx
              n2.vy += fy
            }
          }
        }

        // Link spring attraction
        const nodeMap = nodesMapRef.current
        const links = linksRef.current
        for (let i = 0; i < links.length; i++) {
          const link = links[i]
          if (!visibleSet.has(link.source) || !visibleSet.has(link.target)) continue
          const source = nodeMap.get(link.source)
          const target = nodeMap.get(link.target)
          if (!source || !target) continue

          const dx = target.x - source.x
          const dy = target.y - source.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const desiredDist = target.type === 'network_endpoint' ? 95 : 135
          const delta = (dist - desiredDist) * 0.02 * dt

          const fx = (dx / dist) * delta
          const fy = (dy / dist) * delta

          if (!source.pinned) {
            source.vx += fx
            source.vy += fy
          }
          if (!target.pinned) {
            target.vx -= fx
            target.vy -= fy
          }
        }

        // Velocity damping & movement
        for (let i = 0; i < n; i++) {
          const node = visibleNodes[i]
          if (node.pinned) {
            node.vx = 0
            node.vy = 0
            continue
          }

          node.vx *= damping
          node.vy *= damping

          const spd = Math.hypot(node.vx, node.vy)
          if (spd > maxSpeed) {
            node.vx = (node.vx / spd) * maxSpeed
            node.vy = (node.vy / spd) * maxSpeed
          }

          node.x += node.vx
          node.y += node.vy
        }
      }

      // Animate dash offset for active socket links
      dashOffsetRef.current = (dashOffsetRef.current - 0.4) % 16

      // Canvas Drawing
      ctx.save()
      ctx.scale(dpr, dpr)

      // Background
      ctx.fillStyle = '#101113'
      ctx.fillRect(0, 0, width, height)

      // Apply Camera Transform
      const { x: tx, y: ty, scale } = transformRef.current
      ctx.save()
      ctx.translate(tx, ty)
      ctx.scale(scale, scale)

      // Draw Grid Dots
      ctx.fillStyle = 'rgba(230, 232, 235, 0.04)'
      const gridSize = 40
      const startX = Math.floor((-tx / scale) / gridSize) * gridSize
      const endX = startX + (width / scale) + gridSize * 2
      const startY = Math.floor((-ty / scale) / gridSize) * gridSize
      const endY = startY + (height / scale) + gridSize * 2
      for (let gx = startX; gx < endX; gx += gridSize) {
        for (let gy = startY; gy < endY; gy += gridSize) {
          ctx.fillRect(gx, gy, 1.2, 1.2)
        }
      }

      // Draw Links
      const nodeMap = nodesMapRef.current
      const links = linksRef.current
      for (let i = 0; i < links.length; i++) {
        const link = links[i]
        if (!visibleSet.has(link.source) || !visibleSet.has(link.target)) continue
        const source = nodeMap.get(link.source)
        const target = nodeMap.get(link.target)
        if (!source || !target) continue

        const isHighlighted = selectedNodeId === source.id || selectedNodeId === target.id
        const isSocket = target.type === 'network_endpoint'

        const dx = target.x - source.x
        const dy = target.y - source.y
        const cx = (source.x + target.x) / 2 - dy * 0.12
        const cy = (source.y + target.y) / 2 + dx * 0.12

        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.quadraticCurveTo(cx, cy, target.x, target.y)

        if (isSocket) {
          ctx.strokeStyle = isHighlighted ? '#2878D0' : '#1e3a5f'
          ctx.lineWidth = isHighlighted ? 2.2 : 1.2
          ctx.setLineDash([4, 3])
          ctx.lineDashOffset = dashOffsetRef.current
        } else {
          ctx.strokeStyle = isHighlighted ? '#2878D0' : '#30343A'
          ctx.lineWidth = isHighlighted ? 2.2 : 1.0
          ctx.setLineDash([])
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw Nodes
      for (let i = 0; i < n; i++) {
        const node = visibleNodes[i]
        const isSelected = selectedNodeId === node.id
        const isHovered = hoveredNodeRef.current?.id === node.id
        const isProcess = node.type === 'process'
        const isHeavy = isProcess && ((node.cpu ?? 0) > 2.0 || (node.memory ?? 0) > 250 * 1024 * 1024)

        const r = node.radius + (isSelected ? 4 : isHovered ? 2 : 0)

        // Outer Glow Halo
        if (isSelected || isHovered || isHeavy || node.isUserApp) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2)
          if (isSelected) {
            ctx.fillStyle = 'rgba(40, 120, 208, 0.35)'
          } else if (isHeavy) {
            ctx.fillStyle = 'rgba(228, 168, 58, 0.3)'
          } else if (isProcess && node.isUserApp) {
            ctx.fillStyle = 'rgba(53, 184, 121, 0.2)'
          } else {
            ctx.fillStyle = 'rgba(40, 120, 208, 0.2)'
          }
          ctx.fill()
          ctx.restore()
        }

        // Node Circle Body
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)

        if (isProcess) {
          if (isSelected) {
            ctx.fillStyle = '#2878D0'
            ctx.strokeStyle = '#5aa1f2'
          } else if (isHeavy) {
            ctx.fillStyle = '#452a0a'
            ctx.strokeStyle = '#E4A83A'
          } else if (node.isUserApp) {
            ctx.fillStyle = '#1D2024'
            ctx.strokeStyle = '#35B879'
          } else {
            ctx.fillStyle = '#17191C'
            ctx.strokeStyle = '#475569'
          }
        } else {
          // Socket
          if (isSelected) {
            ctx.fillStyle = '#2878D0'
            ctx.strokeStyle = '#5aa1f2'
          } else {
            ctx.fillStyle = '#17191C'
            ctx.strokeStyle = '#2878D0'
          }
        }

        ctx.lineWidth = isSelected ? 2.5 : 1.5
        ctx.fill()
        ctx.stroke()

        // Center Badge / Flag
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        if (isProcess) {
          ctx.font = 'bold 9px monospace'
          ctx.fillStyle = isSelected
            ? '#ffffff'
            : isHeavy
            ? '#fbbf24'
            : node.isUserApp
            ? '#35B879'
            : '#94a3b8'
          ctx.fillText(node.isUserApp ? 'APP' : 'SYS', node.x, node.y + 0.5)
        } else {
          // Show country flag or 'NET'
          const flag = node.geo?.flag
          if (flag) {
            ctx.font = '12px system-ui, sans-serif'
            ctx.fillText(flag, node.x, node.y + 1)
          } else {
            ctx.font = 'bold 8px monospace'
            ctx.fillStyle = '#38bdf8'
            ctx.fillText('NET', node.x, node.y + 0.5)
          }
        }

        // Label Pill underneath node
        const labelText =
          node.label.length > 22 ? `${node.label.slice(0, 20)}...` : node.label
        const flagPrefix = !isProcess && node.geo?.flag ? `${node.geo.flag} ` : ''
        const fullDisplay = flagPrefix + labelText

        ctx.font = isSelected
          ? '600 10px system-ui, sans-serif'
          : 'normal 10px system-ui, sans-serif'
        const textMetrics = ctx.measureText(fullDisplay)
        const pillWidth = textMetrics.width + 12
        const pillHeight = 16
        const pillX = node.x - pillWidth / 2
        const pillY = node.y + r + 5

        // Pill background
        ctx.fillStyle = 'rgba(5, 8, 17, 0.88)'
        ctx.beginPath()
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 8)
        ctx.fill()

        // Pill border
        ctx.strokeStyle = isSelected ? '#a855f7' : 'rgba(30, 41, 59, 0.9)'
        ctx.lineWidth = 1
        ctx.stroke()

        // Pill text
        ctx.fillStyle = isSelected
          ? '#f8fafc'
          : isHeavy
          ? '#fde68a'
          : '#cbd5e1'
        ctx.fillText(fullDisplay, node.x, pillY + pillHeight / 2 + 0.5)
      }

      ctx.restore()
      ctx.restore()

      animFrameRef.current = requestAnimationFrame(renderFrame)
    }

    animFrameRef.current = requestAnimationFrame(renderFrame)

    return () => {
      isRunning = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [speedMode, getVisibleNodes, selectedNodeId])

  // 3. Mouse Wheel Zoom (Fast, smooth, hardware-accelerated zoom to cursor)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const zoomFactor = e.deltaY < 0 ? 1.14 : 0.88
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const t = transformRef.current
      const newScale = Math.min(3.8, Math.max(0.25, t.scale * zoomFactor))
      const scaleRatio = newScale / t.scale

      t.x = mouseX - (mouseX - t.x) * scaleRatio
      t.y = mouseY - (mouseY - t.y) * scaleRatio
      t.scale = newScale

      setTransformState({ ...t })
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [])

  // 4. Mouse Coordinates helper (Screen -> World)
  const getWorldCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const t = transformRef.current
    const screenX = clientX - rect.left
    const screenY = clientY - rect.top
    return {
      x: (screenX - t.x) / t.scale,
      y: (screenY - t.y) / t.scale,
    }
  }, [])

  // Find node under mouse
  const getNodeAt = useCallback(
    (clientX: number, clientY: number) => {
      const { x: wx, y: wy } = getWorldCoords(clientX, clientY)
      const visible = getVisibleNodes()

      // Reverse order so top-drawn nodes get hit first
      for (let i = visible.length - 1; i >= 0; i--) {
        const node = visible[i]
        const dist = Math.hypot(node.x - wx, node.y - wy)
        if (dist <= node.radius + 6) {
          return node
        }
      }
      return null
    },
    [getWorldCoords, getVisibleNodes]
  )

  // 5. Zero-Lag Direct Mouse Drag & Pan Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return

    const targetNode = getNodeAt(e.clientX, e.clientY)
    didDragRef.current = false

    if (targetNode) {
      draggingNodeRef.current = targetNode
      targetNode.pinned = true
      targetNode.vx = 0
      targetNode.vy = 0
    } else {
      isPanningRef.current = true
      panStartRef.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      }
    }
    lastMousePosRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const dx = Math.abs(e.clientX - lastMousePosRef.current.x)
    const dy = Math.abs(e.clientY - lastMousePosRef.current.y)
    if (dx > 2 || dy > 2) {
      didDragRef.current = true
    }

    if (draggingNodeRef.current) {
      // Direct instant position update with zero React re-render lag!
      const { x: wx, y: wy } = getWorldCoords(e.clientX, e.clientY)
      const node = draggingNodeRef.current
      node.x = wx
      node.y = wy
      node.vx = 0
      node.vy = 0
      node.pinned = true
    } else if (isPanningRef.current) {
      const t = transformRef.current
      t.x = e.clientX - panStartRef.current.x
      t.y = e.clientY - panStartRef.current.y
    } else {
      // Update cursor and hover state
      const hovered = getNodeAt(e.clientX, e.clientY)
      hoveredNodeRef.current = hovered
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hovered ? 'pointer' : 'grab'
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingNodeRef.current) {
      draggingNodeRef.current.pinned = false // unpin to allow gentle settling
      draggingNodeRef.current = null
    }

    if (!didDragRef.current) {
      // It was a click!
      const clicked = getNodeAt(e.clientX, e.clientY)
      onSelectNode(clicked)
    }

    isPanningRef.current = false
    if (canvasRef.current) {
      canvasRef.current.style.cursor = hoveredNodeRef.current ? 'pointer' : 'grab'
    }
  }

  // Double click centers and zooms directly to the node
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const node = getNodeAt(e.clientX, e.clientY)
    if (node && canvasRef.current) {
      const width = canvasRef.current.clientWidth
      const height = canvasRef.current.clientHeight
      const targetScale = 1.6
      const t = transformRef.current
      t.scale = targetScale
      t.x = width / 2 - node.x * targetScale
      t.y = height / 2 - node.y * targetScale
      setTransformState({ ...t })
      onSelectNode(node)
    }
  }

  const handleZoomBtn = (delta: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const t = transformRef.current
    const newScale = Math.min(3.8, Math.max(0.25, t.scale + delta))
    const scaleRatio = newScale / t.scale
    t.x = width / 2 - (width / 2 - t.x) * scaleRatio
    t.y = height / 2 - (height / 2 - t.y) * scaleRatio
    t.scale = newScale
    setTransformState({ ...t })
  }

  const handleReset = () => {
    const t = transformRef.current
    t.x = 0
    t.y = 0
    t.scale = 1
    nodesMapRef.current.forEach((n) => {
      n.vx = 0
      n.vy = 0
      n.pinned = false
    })
    setTransformState({ ...t })
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] bg-[#101113] border border-[#30343A] rounded-xl overflow-hidden select-none"
    >
      {/* High-Performance Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Floating Toolbar Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-[#17191C]/90 border border-[#30343A] rounded-xl p-1.5 shadow-xl backdrop-blur-md">
        {onToggleSpeed && (
          <button
            onClick={onToggleSpeed}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
              speedMode === 'slow'
                ? 'bg-[#2878D0]/20 text-[#5aa1f2] border border-[#2878D0]/40'
                : speedMode === 'paused'
                ? 'bg-[#E4A83A]/20 text-[#E4A83A] border border-[#E4A83A]/40'
                : 'bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB]'
            }`}
            title="Toggle physics speed (Slow / Normal / Frozen)"
          >
            {speedMode === 'paused' ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Frozen</span>
              </>
            ) : speedMode === 'slow' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#2878D0]" />
                <span>Slow Motion</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Normal</span>
              </>
            )}
          </button>
        )}

        <div className="h-4 w-[1px] bg-[#30343A]" />

        <button
          onClick={() => handleZoomBtn(0.3)}
          className="p-1.5 hover:bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB] rounded-lg transition-colors"
          title="Zoom In (Scroll Up)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoomBtn(-0.3)}
          className="p-1.5 hover:bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB] rounded-lg transition-colors"
          title="Zoom Out (Scroll Down)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-[#22262B] text-[#9A9FA8] hover:text-[#E6E8EB] rounded-lg transition-colors"
          title="Reset position & unpin all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Legend & Info Footer */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-3 bg-[#17191C]/90 border border-[#30343A] rounded-xl px-3.5 py-2 text-xs font-mono text-[#9A9FA8] backdrop-blur-md shadow-lg pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#35B879] border border-[#35B879]" />
          <span className="text-[#E6E8EB]">User App</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#30343A] border border-[#6E747D]" />
          <span className="text-[#9A9FA8]">System Svc</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2878D0] border border-[#2878D0]" />
          <span className="text-[#5aa1f2]">Socket (GeoIP)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#9A9FA8] border-l border-[#30343A] pl-3">
          <MousePointer className="w-3.5 h-3.5 text-[#2878D0]" />
          <span>
            {visibleNodesCount} nodes • 0ms Drag • Scroll Zoom • 2x-click to Center
          </span>
        </div>
      </div>
    </div>
  )
}
