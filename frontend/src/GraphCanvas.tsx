/// <reference types="vite/client" />

import { useRef, useEffect, useState, useCallback } from 'react'

interface Node {
  id: string
  label: string
  url: string
  platform: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  pulsePhase: number
  community: number
}

type Edge = { source: string; target: string }

const PLATFORM_COLORS: Record<string, string> = {
  github: '#ffffff', twitter: '#1DA1F2', douyin: '#ff0050',
  bilibili: '#FB7299', zhihu: '#0084FF', nextcloud: '#0082C9', personal: '#3B82F6', other: '#64748B',
}

const COMMUNITY_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1']

function uid() { return Math.random().toString(36).slice(2, 8) }

// Detect communities via connected components
function detectCommunities(nodes: Node[], edges: Edge[]): Map<string, number> {
  const adj = new Map<string, string[]>()
  nodes.forEach(n => adj.set(n.id, []))
  edges.forEach(e => {
    adj.get(e.source)?.push(e.target)
    adj.get(e.target)?.push(e.source)
  })

  const visited = new Set<string>()
  const communities = new Map<string, number>()
  let commId = 0

  nodes.forEach(node => {
    if (visited.has(node.id)) return
    const queue = [node.id]
    visited.add(node.id)
    while (queue.length > 0) {
      const curr = queue.shift()!
      communities.set(curr, commId)
      for (const neighbor of adj.get(curr) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }
    commId++
  })
  return communities
}

// Force-directed simulation step
function simulateForce(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number,
  draggedId: string | null
) {
  const cx = width / 2
  const cy = height / 2
  const k = Math.min(width, height) * 0.003 // spring constant
  const repulsion = 5000
  const damping = 0.9
  const centerForce = 0.01

  // Reset forces
  const fx: Record<string, number> = {}
  const fy: Record<string, number> = {}
  nodes.forEach(n => { fx[n.id] = 0; fy[n.id] = 0 })

  // Repulsion between all pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x
      const dy = nodes[j].y - nodes[i].y
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const force = repulsion / (dist * dist)
      const fx_i = (dx / dist) * force
      const fy_i = (dy / dist) * force
      fx[nodes[i].id] -= fx_i
      fy[nodes[i].id] -= fx_i
      fx[nodes[j].id] += fx_i
      fy[nodes[j].id] += fx_i
    }
  }

  // Attraction along edges
  edges.forEach(e => {
    const s = nodes.find(n => n.id === e.source)
    const t = nodes.find(n => n.id === e.target)
    if (!s || !t) return
    const dx = t.x - s.x
    const dy = t.y - s.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const force = k * dist
    const fx_s = (dx / Math.max(dist, 1)) * force
    const fy_s = (dy / Math.max(dist, 1)) * force
    fx[s.id] += fx_s
    fy[s.id] += fy_s
    fx[t.id] -= fx_s
    fy[t.id] -= fy_s
  })

  // Centering force
  nodes.forEach(n => {
    fx[n.id] += (cx - n.x) * centerForce
    fy[n.id] += (cy - n.y) * centerForce
  })

  // Update velocities and positions
  nodes.forEach(n => {
    if (n.id === draggedId) return
    n.vx = (n.vx + fx[n.id]) * damping
    n.vy = (n.vy + fy[n.id]) * damping
    n.x += n.vx
    n.y += n.vy
    // Clamp to view
    n.x = Math.max(n.radius, Math.min(width - n.radius, n.x))
    n.y = Math.max(n.radius, Math.min(height - n.radius, n.y))
  })
}

export default function GraphCanvas({ nodes, edges, selectedId, onSelect, onMove, width, height }: {
  nodes: Node[]
  edges: Edge[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  width: number
  height: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timeRef = useRef(0)
  const hoverRef = useRef<string | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null)
  const panStartRef = useRef<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [targetZoom, setTargetZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [targetPan, setTargetPan] = useState({ x: 0, y: 0 })
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)

  // Keep refs in sync
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  // Mouse wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setTargetZoom(prev => Math.max(0.3, Math.min(3, prev + delta)))
    }
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [])

  // Hover neighbors for highlight
  const getNeighbors = useCallback((nodeId: string) => {
    const neighbors = new Set<string>()
    edgesRef.current.forEach(e => {
      if (e.source === nodeId) neighbors.add(e.target)
      if (e.target === nodeId) neighbors.add(e.source)
    })
    return neighbors
  }, [])

  // Click to select/focus
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const wx = (mx - pan.x) / zoom
    const wy = (my - pan.y) / zoom

    for (const node of nodesRef.current) {
      const dx = wx - node.x
      const dy = wy - node.y
      const hitR = (node.radius || 16) * zoom + 8
      if (Math.sqrt(dx * dx + dy * dy) < hitR) {
        onSelect(node.id)
        setTargetZoom(2)
        setTargetPan({ x: width / 2 - node.x * 2, y: height / 2 - node.y * 2 })
        return
      }
    }
    onSelect(null)
    setTargetZoom(1)
    setTargetPan({ x: 0, y: 0 })
  }, [onSelect, pan, zoom, width, height])

  // Mouse down - start drag or pan
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const wx = (mx - pan.x) / zoom
    const wy = (my - pan.y) / zoom

    // Check if clicking on a node
    for (const node of nodesRef.current) {
      const dx = wx - node.x
      const dy = wy - node.y
      const hitR = (node.radius || 16) + 4
      if (Math.sqrt(dx * dx + dy * dy) < hitR) {
        dragRef.current = { id: node.id, startX: mx, startY: my, nodeX: node.x, nodeY: node.y }
        return
      }
    }

    // Middle button or space+left = pan
    if (e.button === 1 || e.nativeEvent?.button === 1) {
      panStartRef.current = { x: mx - pan.x, y: my - pan.y }
    }
  }, [pan, zoom])

  // Mouse move - drag node or pan
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Pan
    if (panStartRef.current) {
      setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y })
      return
    }

    // Drag node
    if (dragRef.current) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const wx = (mx - pan.x) / zoom
      const wy = (my - pan.y) / zoom
      const d = dragRef.current
      const dx = wx - d.nodeX
      const dy = wy - d.nodeY
      onMove(d.id, d.nodeX + dx, d.nodeY + dy)
      return
    }

    // Hover detection
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const wx = (mx - pan.x) / zoom
    const wy = (my - pan.y) / zoom

    let found = null as string | null
    nodesRef.current.forEach(node => {
      const dx = wx - node.x
      const dy = wy - node.y
      if (Math.sqrt(dx * dx + dy * dy) < (node.radius || 16) + 8) found = node.id
    })
    hoverRef.current = found
  }, [pan, zoom, onMove])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
    panStartRef.current = null
  }, [])

  // Force-directed layout animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width * window.devicePixelRatio
    canvas.height = height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    let currentZoom = zoom
    let currentPanX = pan.x
    let currentPanY = pan.y
    let animTime = 0

    const animate = () => {
      animTime += 0.016
      timeRef.current = animTime

      // Smooth zoom/pan interpolation
      currentZoom += (targetZoom - currentZoom) * 0.08
      currentPanX += (targetPan.x - currentPanX) * 0.08
      currentPanY += (targetPan.y - currentPanY) * 0.08

      // Force-directed simulation
      simulateForce(nodesRef.current, edgesRef.current, width, height, dragRef.current?.id || null)

      ctx.clearRect(0, 0, width, height)

      // Nebula background
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.8)
      bgGrad.addColorStop(0, '#1a1a2e')
      bgGrad.addColorStop(0.6, '#0f0f1a')
      bgGrad.addColorStop(1, '#050510')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Subtle stars
      for (let i = 0; i < 100; i++) {
        const sx = (Math.sin(i * 127.1 + 311.7) * 0.5 + 0.5) * width
        const sy = (Math.sin(i * 269.5 + 183.3) * 0.5 + 0.5) * height
        const bright = 0.03 + Math.sin(animTime * 0.3 + i) * 0.02
        ctx.beginPath()
        ctx.arc(sx, sy, 0.5 + Math.sin(animTime + i * 0.5) * 0.2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${bright})`
        ctx.fill()
      }

      ctx.save()
      ctx.translate(currentPanX, currentPanY)
      ctx.scale(currentZoom, currentZoom)

      const hovId = hoverRef.current
      const selId = selectedId
      const neighbors = hovId ? getNeighbors(hovId) : new Set<string>()

      // Draw edges (curved bezier)
      edges.forEach(edge => {
        const s = nodesRef.current.find(n => n.id === edge.source)
        const t = nodesRef.current.find(n => n.id === edge.target)
        if (!s || !t) return

        const isHL = selId && (edge.source === selId || edge.target === selId)
        const isHov = hovId && (edge.source === hovId || edge.target === hovId)
        const isDim = hovId && !isHL && !isHov

        // Curved control point
        const mx = (s.x + t.x) / 2
        const my = (s.y + t.y) / 2
        const dx = t.x - s.x
        const dy = t.y - s.y
        const perpX = -dy * 0.1
        const perpY = dx * 0.1
        const cpX = mx + perpX
        const cpY = my + perpY

        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.quadraticCurveTo(cpX, cpY, t.x, t.y)

        if (isDim) {
          ctx.strokeStyle = '#1e293b'
          ctx.lineWidth = 1
        } else if (isHL || isHov) {
          ctx.strokeStyle = '#38bdf8'
          ctx.lineWidth = 2.5
          ctx.shadowColor = '#38bdf8'
          ctx.shadowBlur = 15
        } else {
          ctx.strokeStyle = '#334155'
          ctx.lineWidth = 1.5
        }

        ctx.setLineDash([6 / currentZoom, 4 / currentZoom])
        ctx.lineDashOffset = -animTime * 40 / currentZoom
        ctx.stroke()
        ctx.setLineDash([])
        ctx.shadowBlur = 0
      })

      // Draw nodes
      nodesRef.current.forEach(node => {
        const isSel = node.id === selId
        const isHov = node.id === hovId
        const isNeighbor = neighbors.has(node.id)
        const color = node.color || PLATFORM_COLORS[node.platform] || '#3b82f6'
        const r = (node.radius || 16) * (isSel ? 1.3 : 1)
        const pulse = Math.sin(animTime * 2 + node.pulsePhase) * 0.1 + 1
        const drawR = r * pulse

        // Dim non-connected nodes when hovering
        if (hovId && !isSel && !isHov && !isNeighbor) {
          ctx.globalAlpha = 0.3
        }

        // Glow
        if (isSel || isHov || zoom > 1.3) {
          const glow = ctx.createRadialGradient(node.x, node.y, drawR * 0.3, node.x, node.y, drawR * 4)
          glow.addColorStop(0, color + '50')
          glow.addColorStop(0.5, color + '20')
          glow.addColorStop(1, color + '00')
          ctx.beginPath()
          ctx.arc(node.x, node.y, drawR * 4, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()
        }

        // Node circle
        ctx.beginPath()
        ctx.arc(node.x, node.y, drawR, 0, Math.PI * 2)
        ctx.fillStyle = color + (isDim ? '30' : '60')
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = (isSel ? 3 : isHov ? 2.5 : 2) / currentZoom
        ctx.stroke()

        // Label
        ctx.fillStyle = isDim ? '#475569' : '#e2e8f0'
        ctx.font = `${(isSel ? 14 : 12) / currentZoom}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.label, node.x, node.y + drawR + 14 / currentZoom)

        ctx.globalAlpha = 1
      })

      ctx.restore()
      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [selectedId, zoom, targetZoom, pan, targetPan, width, height, getNeighbors])

  return (
    <canvas
      ref={canvasRef} width={width} height={height}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      style={{ width, height, display: 'block', cursor: 'grab' }}
    />
  )
}