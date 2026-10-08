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
}

type Edge = { source: string; target: string }

const DEFAULT_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']

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
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [targetZoom, setTargetZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [targetPan, setTargetPan] = useState({ x: 0, y: 0 })

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

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const wx = (mx - pan.x) / zoom
    const wy = (my - pan.y) / zoom

    for (const node of nodes) {
      const dx = wx - node.x
      const dy = wy - node.y
      const hitR = (node.radius || 16) * zoom + 8
      if (Math.sqrt(dx*dx + dy*dy) < hitR) {
        onSelect(node.id)
        setTargetZoom(1.8)
        setTargetPan({ x: width/2 - node.x * 1.8, y: height/2 - node.y * 1.8 })
        return
      }
    }
    onSelect(null)
    setTargetZoom(1)
    setTargetPan({ x: 0, y: 0 })
  }, [nodes, zoom, pan, onSelect, width, height])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      isDraggingRef.current = true
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y })
    }
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const wx = (mx - pan.x) / zoom
    const wy = (my - pan.y) / zoom
    let found = null as string | null
    nodes.forEach(node => {
      const dx = wx - node.x
      const dy = wy - node.y
      if (Math.sqrt(dx*dx + dy*dy) < (node.radius || 16) + 8) found = node.id
    })
    hoverRef.current = found
  }, [nodes, zoom, pan])

  const handleMouseUp = useCallback(() => { isDraggingRef.current = false }, [])

  const layout = useCallback(() => {
    if (nodes.length === 0) return
    const cx = width / 2
    const cy = height / 2
    const centerNode = selectedId ? nodes.find(n => n.id === selectedId) : nodes[0]
    if (!centerNode) return
    const connected = edges.filter(e => e.source === centerNode.id || e.target === centerNode.id)
    const others = nodes.filter(n => n.id !== centerNode.id)
    centerNode.x = cx; centerNode.y = cy; centerNode.radius = 28
    const orbitRadius = Math.min(width, height) * 0.25
    connected.forEach((edge, i) => {
      const otherId = edge.source === centerNode.id ? edge.target : edge.source
      const other = nodes.find(n => n.id === otherId)
      if (!other) return
      const angle = (i / connected.length) * Math.PI * 2 - Math.PI / 2
      other.x = cx + Math.cos(angle) * orbitRadius
      other.y = cy + Math.sin(angle) * orbitRadius
      other.radius = 20
    })
    const outerNodes = others.filter(n => !connected.find(e => e.source === n.id || e.target === n.id))
    const outerRadius = Math.min(width, height) * 0.42
    outerNodes.forEach((node, i) => {
      const angle = (i / Math.max(outerNodes.length, 1)) * Math.PI * 2
      node.x = cx + Math.cos(angle) * outerRadius
      node.y = cy + Math.sin(angle) * outerRadius
      node.radius = 14
    })
  }, [nodes, edges, selectedId, width, height])

  useEffect(() => { layout() }, [layout])

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

    const animate = () => {
      timeRef.current += 0.02
      currentZoom += (targetZoom - currentZoom) * 0.08
      currentPanX += (targetPan.x - currentPanX) * 0.08
      currentPanY += (targetPan.y - currentPanY) * 0.08

      ctx.clearRect(0, 0, width, height)

      // Nebula background
      const grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width * 0.7)
      grad.addColorStop(0, '#1a1a2e')
      grad.addColorStop(0.5, '#0f0f1a')
      grad.addColorStop(1, '#050510')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      // Stars
      for (let i = 0; i < 80; i++) {
        const sx = (Math.sin(i * 127.1 + 311.7) * 0.5 + 0.5) * width
        const sy = (Math.sin(i * 269.5 + 183.3) * 0.5 + 0.5) * height
        const bright = 0.05 + Math.sin(timeRef.current * 0.5 + i * 0.7) * 0.03
        ctx.beginPath()
        ctx.arc(sx, sy, 0.8 + Math.sin(timeRef.current + i) * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${bright})`
        ctx.fill()
      }

      ctx.save()
      ctx.translate(currentPanX, currentPanY)
      ctx.scale(currentZoom, currentZoom)

      // Edges
      edges.forEach(edge => {
        const s = nodes.find(n => n.id === edge.source)
        const t = nodes.find(n => n.id === edge.target)
        if (!s || !t) return
        const isHL = selectedId && (edge.source === selectedId || edge.target === selectedId)
        const isHov = hoverRef.current && (edge.source === hoverRef.current || edge.target === hoverRef.current)
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(t.x, t.y)
        ctx.strokeStyle = (isHL || isHov) ? '#38bdf8' : '#334155'
        ctx.lineWidth = (isHL || isHov) ? 3 : 1.5
        if (isHL || isHov) { ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12 }
        ctx.setLineDash([8, 6])
        ctx.lineDashOffset = -timeRef.current * 30
        ctx.stroke()
        ctx.setLineDash([]); ctx.shadowBlur = 0
      })

      // Nodes
      nodes.forEach(node => {
        const isSel = node.id === selectedId
        const isHov = node.id === hoverRef.current
        const color = node.color || '#3b82f6'
        const r = node.radius || 16
        const pulse = Math.sin(timeRef.current * 2 + node.pulsePhase) * 0.15 + 1
        const drawR = r * pulse

        if (isSel || isHov || zoom > 1.3) {
          const glow = ctx.createRadialGradient(node.x, node.y, drawR * 0.5, node.x, node.y, drawR * 3)
          glow.addColorStop(0, color + '40')
          glow.addColorStop(1, color + '00')
          ctx.beginPath(); ctx.arc(node.x, node.y, drawR * 3, 0, Math.PI * 2)
          ctx.fillStyle = glow; ctx.fill()
        }

        ctx.beginPath(); ctx.arc(node.x, node.y, drawR, 0, Math.PI * 2)
        ctx.fillStyle = color + '50'; ctx.fill()
        ctx.strokeStyle = color; ctx.lineWidth = (isSel ? 3 : 2)
        ctx.stroke()

        ctx.fillStyle = '#e2e8f0'
        ctx.font = `${isSel ? 14 : 12}px system-ui`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(node.label, node.x, node.y)
      })

      ctx.restore()
      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [nodes, edges, selectedId, zoom, targetZoom, pan, targetPan, width, height])

  return (
    <canvas
      ref={canvasRef} width={width} height={height}
      onMouseMove={handleMouseMove} onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      style={{ width, height, display: 'block', cursor: 'grab' }}
    />
  )
}