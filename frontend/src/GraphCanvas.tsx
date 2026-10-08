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

const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  douyin: '#000000',
  bilibili: '#FB7299',
  zhihu: '#0084FF',
  github: '#FFFFFF',
  nextcloud: '#0082C9',
  personal: '#3B82F6',
  other: '#64748B',
}

const DEFAULT_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']

function uid() { return Math.random().toString(36).slice(2, 8) }

function platformColor(p: string) {
  return PLATFORM_COLORS[p.toLowerCase()] || '#64748B'
}

interface GraphCanvasProps {
  nodes: Node[]
  edges: Edge[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  width: number
  height: number
}

export default function GraphCanvas({ nodes, edges, selectedId, onSelect, onMove, width, height }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timeRef = useRef(0)
  const hoverRef = useRef<string | null>(null)

  // Starburst layout: center selected node, orbit connected nodes
  const layout = useCallback(() => {
    if (nodes.length === 0) return
    const cx = width / 2
    const cy = height / 2
    const centerNode = selectedId ? nodes.find(n => n.id === selectedId) : nodes[0]
    if (!centerNode) return

    const connected = edges.filter(e => e.source === centerNode.id || e.target === centerNode.id)
    const others = nodes.filter(n => n.id !== centerNode.id)

    // Position center node
    centerNode.x = cx
    centerNode.y = cy
    centerNode.radius = 28

    // Position connected nodes in a circle
    const orbitRadius = Math.min(width, height) * 0.28
    connected.forEach((edge, i) => {
      const otherId = edge.source === centerNode.id ? edge.target : edge.source
      const other = nodes.find(n => n.id === otherId)
      if (!other) return
      const angle = (i / connected.length) * Math.PI * 2 - Math.PI / 2
      other.x = cx + Math.cos(angle) * orbitRadius
      other.y = cy + Math.sin(angle) * orbitRadius
      other.radius = 20
    })

    // Position remaining nodes in outer ring
    const outerNodes = others.filter(n => !connected.find(e => e.source === n.id || e.target === n.id))
    const outerRadius = Math.min(width, height) * 0.45
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

    const animate = () => {
      timeRef.current += 0.02
      ctx.clearRect(0, 0, width, height)

      // Draw edges with pulse
      edges.forEach(edge => {
        const s = nodes.find(n => n.id === edge.source)
        const t = nodes.find(n => n.id === edge.target)
        if (!s || !t) return

        const isHighlighted = selectedId && (edge.source === selectedId || edge.target === selectedId)
        const isHover = hoverRef.current && (edge.source === hoverRef.current || edge.target === hoverRef.current)

        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(t.x, t.y)

        if (isHighlighted || isHover) {
          ctx.strokeStyle = '#38bdf8'
          ctx.lineWidth = 3
          ctx.shadowColor = '#38bdf8'
          ctx.shadowBlur = 12
        } else {
          ctx.strokeStyle = '#334155'
          ctx.lineWidth = 1.5
          ctx.shadowBlur = 0
        }

        // Dashed animated line
        const dashOffset = timeRef.current * 30
        ctx.setLineDash([8, 6])
        ctx.lineDashOffset = -dashOffset
        ctx.stroke()
        ctx.setLineDash([])
        ctx.shadowBlur = 0
      })

      // Draw nodes
      nodes.forEach(node => {
        const isSelected = node.id === selectedId
        const isHover = node.id === hoverRef.current
        const color = node.color || '#3b82f6'
        const r = node.radius || 16

        // Pulse effect
        const pulse = Math.sin(timeRef.current * 2 + node.pulsePhase) * 0.15 + 1
        const drawR = r * pulse

        // Glow
        if (isSelected || isHover) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, drawR + 8, 0, Math.PI * 2)
          ctx.fillStyle = color + '30'
          ctx.fill()
        }

        // Node circle
        ctx.beginPath()
        ctx.arc(node.x, node.y, drawR, 0, Math.PI * 2)
        ctx.fillStyle = color + '40'
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = isSelected ? 3 : 2
        ctx.stroke()

        // Label
        ctx.fillStyle = '#e2e8f0'
        ctx.font = `${isSelected ? 'bold 14' : '12'}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.label, node.x, node.y)
      })

      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [nodes, edges, selectedId, width, height])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    let found = null as string | null
    nodes.forEach(node => {
      const dx = mx - node.x
      const dy = my - node.y
      if (Math.sqrt(dx*dx + dy*dy) < (node.radius || 16) + 8) {
        found = node.id
      }
    })
    hoverRef.current = found
    if (canvasRef.current) canvasRef.current.style.cursor = found ? 'pointer' : 'default'
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    for (const node of nodes) {
      const dx = mx - node.x
      const dy = my - node.y
      if (Math.sqrt(dx*dx + dy*dy) < (node.radius || 16) + 8) {
        onSelect(node.id)
        return
      }
    }
    onSelect(null)
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{ width, height, display: 'block' }}
    />
  )
}