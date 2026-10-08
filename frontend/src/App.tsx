/// <reference types="vite/client" />

import { useState, useEffect, useCallback } from 'react'
import GraphCanvas from './GraphCanvas'
import AdminPanel from './AdminPanel'

interface Node {
  id: string
  label: string
  url: string
  platform: string
  color: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  pulsePhase: number
}

interface Edge {
  source: string
  target: string
}

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']

function uid() { return Math.random().toString(36).slice(2, 8) }

export default function App() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'n1', label: '首页', url: '', platform: 'personal', color: COLORS[0], x: 0, y: 0, vx: 0, vy: 0, radius: 28, pulsePhase: 0 },
    { id: 'n2', label: 'Nextcloud', url: '', platform: 'nextcloud', color: COLORS[1], x: 0, y: 0, vx: 0, vy: 0, radius: 20, pulsePhase: 0.5 },
    { id: 'n3', label: 'Twitter', url: '', platform: 'twitter', color: COLORS[2], x: 0, y: 0, vx: 0, vy: 0, radius: 20, pulsePhase: 1 },
    { id: 'n4', label: '抖音', url: '', platform: 'douyin', color: COLORS[3], x: 0, y: 0, vx: 0, vy: 0, radius: 16, pulsePhase: 1.5 },
    { id: 'n5', label: 'GitHub', url: '', platform: 'github', color: COLORS[4], x: 0, y: 0, vx: 0, vy: 0, radius: 16, pulsePhase: 2 },
  ])
  const [edges, setEdges] = useState<Edge[]>([
    { source: 'n1', target: 'n2' },
    { source: 'n1', target: 'n3' },
    { source: 'n1', target: 'n4' },
    { source: 'n1', target: 'n5' },
    { source: 'n3', target: 'n5' },
  ])
  const [selectedId, setSelectedId] = useState<string | null>('n1')
  const [size, setSize] = useState({ w: 900, h: 600 })

  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth - 300, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n))
  }, [])

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0f172a' }}>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMove={handleMove}
        width={size.w}
        height={size.h}
      />
      <AdminPanel
        nodes={nodes}
        edges={edges}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onUpdateNodes={setNodes}
        onUpdateEdges={setEdges}
      />
    </div>
  )
}