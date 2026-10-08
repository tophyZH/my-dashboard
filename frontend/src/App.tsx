/// <reference types="vite/client" />

import { useState, useEffect, useCallback } from 'react'
import GraphCanvas from './GraphCanvas'
import AdminPage from './AdminPage'

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

export default function App() {
  const [page, setPage] = useState<'graph' | 'admin'>('graph')
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'n1', label: '首页', url: '', platform: 'personal', color: COLORS[0], x: 0, y: 0, vx: 0, vy: 0, radius: 28, pulsePhase: 0 },
    { id: 'n2', label: 'Nextcloud', url: '', platform: 'nextcloud', color: COLORS[1], x: 0, y: 0, vx: 0, vy: 0, radius: 20, pulsePhase: 0.5 },
    { id: 'n3', label: 'Twitter/X', url: '', platform: 'twitter', color: COLORS[2], x: 0, y: 0, vx: 0, vy: 0, radius: 20, pulsePhase: 1 },
    { id: 'n4', label: '抖音', url: '', platform: 'douyin', color: COLORS[3], x: 0, y: 0, vx: 0, vy: 0, radius: 16, pulsePhase: 1.5 },
    { id: 'n5', label: 'GitHub', url: '', platform: 'github', color: COLORS[4], x: 0, y: 0, vx: 0, vy: 0, radius: 16, pulsePhase: 2 },
    { id: 'n6', label: 'Bilibili', url: '', platform: 'bilibili', color: COLORS[5], x: 0, y: 0, vx: 0, vy: 0, radius: 16, pulsePhase: 2.5 },
    { id: 'n7', label: '知乎', url: '', platform: 'zhihu', color: COLORS[6], x: 0, y: 0, vx: 0, vy: 0, radius: 16, pulsePhase: 3 },
  ])
  const [edges, setEdges] = useState<Edge[]>([
    { source: 'n1', target: 'n2' },
    { source: 'n1', target: 'n3' },
    { source: 'n1', target: 'n4' },
    { source: 'n1', target: 'n5' },
    { source: 'n1', target: 'n6' },
    { source: 'n1', target: 'n7' },
    { source: 'n3', target: 'n5' },
    { source: 'n5', target: 'n1' },
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

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as 'graph' | 'admin'
    if (hash === 'admin' || hash === 'graph') setPage(hash)
  }, [])

  const navigate = (p: 'graph' | 'admin') => {
    setPage(p)
    window.location.hash = p
  }

  if (page === 'admin') {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0f172a' }}>
        <button onClick={() => navigate('graph')} style={{
          position: 'absolute', top: 16, left: 16, zIndex: 20,
          padding: '10px 20px', background: '#3b82f6', color: 'white',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
        }}>← 返回图谱</button>
        <AdminPage />
      </div>
    )
  }

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
      <div style={{ width: 300, background: '#0f172a', borderLeft: '1px solid #1e293b', padding: 16, overflowY: 'auto', color: 'white' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => navigate('admin')} style={{ ...tabBtn, background: '#334155' }}>📊 管理</button>
          <button onClick={() => navigate('graph')} style={tabBtn}>🌌 图谱</button>
        </div>
        <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 12px' }}>滚轮缩放 | 中键拖拽平移 | 点击节点聚焦</p>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>📋 节点列表</h3>
          {nodes.map(n => (
            <div key={n.id} onClick={() => setSelectedId(n.id)} style={{
              padding: '6px 8px', cursor: 'pointer', borderLeft: `3px solid ${n.color}`,
              background: selectedId === n.id ? '#334155' : 'transparent',
              borderRadius: 4, marginBottom: 2, display: 'flex', justifyContent: 'space-between',
            }}>
              <span>{n.label}</span>
              <span style={{ color: '#64748b', fontSize: 10 }}>{n.platform}</span>
            </div>
          ))}
        </div>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginTop: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>🔗 关联列表</h3>
          {edges.map((e, i) => {
            const s = nodes.find(nd => nd.id === e.source)
            const t = nodes.find(nd => nd.id === e.target)
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 11 }}>
                <span style={{ color: '#94a3b8' }}>{s?.label || '?'} → {t?.label || '?'}</span>
                <button onClick={() => setEdges(edges.filter((_, j) => j !== i))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>✕</button>
              </div>
            )
          })}
        </div>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginTop: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>🔐 社交导入</h3>
          <button onClick={() => navigate('admin')} style={{ ...btnStyle, width: '100%', marginBottom: 6 }}>管理账号</button>
          <p style={{ color: '#64748b', fontSize: 11, margin: '8px 0 0' }}>连接平台后导入 following/followed 列表，跨平台关联社交关系</p>
        </div>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '8px 12px', border: 'none', borderRadius: 6,
  background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: 12,
}

const tabBtn: React.CSSProperties = {
  padding: '4px 12px', border: 'none', borderRadius: 4,
  color: 'white', cursor: 'pointer', fontSize: 12, background: 'transparent',
}