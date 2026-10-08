/// <reference types="vite/client" />

import { useState, useCallback, useRef, useEffect } from 'react'

interface Node {
  id: string
  label: string
  x: number
  y: number
  color?: string
}

interface Edge {
  source: string
  target: string
}

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']

function uid() {
  return Math.random().toString(36).slice(2, 8)
}

export default function App() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'n1', label: '首页', x: 400, y: 150, color: COLORS[0] },
    { id: 'n2', label: 'Nextcloud', x: 250, y: 350, color: COLORS[1] },
    { id: 'n3', label: 'Workers', x: 550, y: 350, color: COLORS[2] },
  ])
  const [edges, setEdges] = useState<Edge[]>([
    { source: 'n1', target: 'n2' },
    { source: 'n1', target: 'n3' },
  ])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [linkMode, setLinkMode] = useState(false)
  const [linkStart, setLinkStart] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgSize, setSvgSize] = useState({ w: 900, h: 600 })

  useEffect(() => {
    const update = () => setSvgSize({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const getNode = useCallback((id: string) => nodes.find(n => n.id === id), [nodes])

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (linkMode && linkStart) {
      // try create edge
      if (linkStart !== nodeId) {
        setEdges(prev => {
          const exists = prev.find(
            edge => (edge.source === linkStart && edge.target === nodeId) ||
                    (edge.source === nodeId && edge.target === linkStart)
          )
          if (exists) return prev
          return [...prev, { source: linkStart, target: nodeId }]
        })
        setLinkStart(null)
        setLinkMode(false)
      }
      return
    }
    setDragging(nodeId)
    setSelectedNode(nodeId)
    const node = getNode(nodeId)
    setEditLabel(node?.label || '')
  }, [linkMode, linkStart, getNode])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setNodes(prev => prev.map(n => n.id === dragging ? { ...n, x, y } : n))
  }, [dragging])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  const addNode = () => {
    const color = COLORS[nodes.length % COLORS.length]
    setNodes(prev => [...prev, {
      id: uid(),
      label: '新节点',
      x: 100 + Math.random() * (svgSize.w - 200),
      y: 100 + Math.random() * (svgSize.h - 200),
      color,
    }])
  }

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id))
    setSelectedNode(null)
  }

  const deleteEdge = (idx: number) => {
    setEdges(prev => prev.filter((_, i) => i !== idx))
  }

  const saveLabel = (id: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, label: editLabel } : n))
    setEditLabel('')
  }

  const selectedNodeData = nodes.find(n => n.id === selectedNode)

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', overflow: 'hidden', position: 'relative' }}>
      <svg
        ref={svgRef}
        width={svgSize.w}
        height={svgSize.h}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ display: 'block' }}
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* edges */}
        {edges.map((edge, i) => {
          const s = getNode(edge.source)
          const t = getNode(edge.target)
          if (!s || !t) return null
          return (
            <g key={i}>
              <line
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)"
                className="edge"
                style={{ cursor: 'pointer' }}
                onClick={() => deleteEdge(i)}
              />
              {/* midpoint label */}
              <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 6} fill="#94a3b8" fontSize={11} textAnchor="middle" pointerEvents="none">
                {edge.source.slice(0,3)} → {edge.target.slice(0,3)}
              </text>
            </g>
          )
        }]}

        {/* nodes */}
        {nodes.map(node => (
          <g
            key={node.id}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            style={{ cursor: 'grab' }}
          >
            <circle
              cx={node.x} cy={node.y} r="36"
              fill={node.color || '#3b82f6'}
              opacity="0.2"
              stroke={node.color || '#3b82f6'}
              strokeWidth={selectedNode === node.id ? 3 : 1}
              filter={selectedNode === node.id ? 'url(#glow)' : undefined}
            />
            <text
              x={node.x} y={node.y + 4}
              fill="white" fontSize={13} textAnchor="middle" pointerEvents="none"
              fontWeight="bold"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      {/* toolbar */}
      <div style={{
        position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8, zIndex: 10,
      }}>
        <button onClick={addNode} style={btnStyle}>+ 节点</button>
        <button
          onClick={() => { setLinkMode(!linkMode); setLinkStart(null) }}
          style={{ ...btnStyle, background: linkMode ? '#ef4444' : '#3b82f6' }}
        >
          {linkMode ? '取消连线' : '连线模式'}
        </button>
        <button onClick={() => { setNodes([]); setEdges([]) }} style={delBtnStyle}>清空</button>
      </div>

      {/* side panel */}
      {selectedNodeData && (
        <div style={{
          position: 'absolute', right: 16, top: 16, background: '#1e293b', borderRadius: 12,
          padding: 16, width: 240, color: 'white', zIndex: 10, border: '1px solid #334155',
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>节点编辑</h3>
          <input
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveLabel(selectedNode!)}
            placeholder="标签"
            style={{ ...inputStyle, width: '100%' }}
          />
          <button onClick={() => saveLabel(selectedNode!)} style={{ ...btnStyle, marginTop: 8, width: '100%' }}>
            保存
          </button>
          <button onClick={() => deleteNode(selectedNode!)} style={{ ...btnStyle, marginTop: 8, width: '100%', background: '#ef4444' }}>
            删除节点
          </button>
          <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
            <p>• 拖拽移动节点</p>
            <p>• 点击连线模式后点两个节点建立连接</p>
            <p>• 点击边可删除</p>
          </div>
        </div>
      )}

      {/* title */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        color: 'white', fontSize: 20, fontWeight: 'bold', zIndex: 10, opacity: 0.8,
      }}>
        Knowledge Graph · 知识图谱引导页
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px', border: 'none', borderRadius: 8,
  background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: 13,
}

const delBtnStyle: React.CSSProperties = {
  ...btnStyle, background: '#ef4444',
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid #475569',
  background: '#0f172a', color: 'white', fontSize: 13,
}