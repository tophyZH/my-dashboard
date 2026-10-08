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
  community: number
}

interface Edge {
  source: string
  target: string
}

const PLATFORM_COLORS: Record<string, string> = {
  github: '#ffffff', twitter: '#1DA1F2', douyin: '#ff0050',
  bilibili: '#FB7299', zhihu: '#0084FF', nextcloud: '#0082C9', personal: '#3B82F6', other: '#64748B',
}

function buildGraphFromGitHub(following: any[], followers: any[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const nodeMap = new Map<string, string>()

  // Add self node
  nodes.push({
    id: 'self', label: 'tophyZH', url: 'https://github.com/tophyZH',
    platform: 'github', color: PLATFORM_COLORS.github,
    x: 0, y: 0, vx: 0, vy: 0, radius: 28, pulsePhase: 0, community: 0,
  })
  nodeMap.set('tophyZH', 'self')

  // Add following nodes
  following.forEach((f, i) => {
    const id = `f_${f.id}`
    nodes.push({
      id, label: f.login, url: f.html_url,
      platform: 'github', color: PLATFORM_COLORS.github,
      x: 0, y: 0, vx: 0, vy: 0, radius: 12, pulsePhase: Math.random() * Math.PI * 2, community: 1,
    })
    nodeMap.set(f.login, id)
    // Connect to self
    edges.push({ source: 'self', target: id })
  })

  // Add followers
  followers.forEach((f, i) => {
    const id = `fl_${f.id}`
    if (nodeMap.has(f.login)) return // already exists (mutual follow)
    nodes.push({
      id, label: f.login, url: f.html_url,
      platform: 'github', color: '#64748B',
      x: 0, y: 0, vx: 0, vy: 0, radius: 10, pulsePhase: Math.random() * Math.PI * 2, community: 2,
    })
    nodeMap.set(f.login, id)
    edges.push({ source: id, target: 'self' })
  })

  // Auto-connect mutual follows (both following each other)
  const followingSet = new Set(following.map(f => f.login))
  followers.forEach(f => {
    if (followingSet.has(f.login)) {
      // Mutual follow - connect the two nodes
      const fid = nodeMap.get(f.login)
      if (fid) edges.push({ source: 'self', target: fid })
    }
  })

  return { nodes, edges }
}

export default function App() {
  const [page, setPage] = useState<'graph' | 'admin'>('graph')
  const [loading, setLoading] = useState(true)
  const [githubData, setGithubData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null)

  useEffect(() => {
    // Load GitHub data
    Promise.all([
      fetch('/api/following/tophyZH').then(r => r.json().catch(() => [])),
      fetch('/api/followers/tophyZH').then(r => r.json().catch(() => [])),
    ]).then(([following, followers]) => {
      if (following.length > 0 || followers.length > 0) {
        const graph = buildGraphFromGitHub(following, followers)
        setGithubData(graph)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const defaultNodes: Node[] = [
    { id: 'n1', label: 'tophyZH', url: '', platform: 'github', color: PLATFORM_COLORS.github, x: 0, y: 0, vx: 0, vy: 0, radius: 28, pulsePhase: 0, community: 0 },
    { id: 'n2', label: 'Nextcloud', url: '', platform: 'nextcloud', color: PLATFORM_COLORS.nextcloud, x: 0, y: 0, vx: 0, vy: 0, radius: 20, pulsePhase: 0.5, community: 0 },
    { id: 'n3', label: 'Twitter/X', url: '', platform: 'twitter', color: PLATFORM_COLORS.twitter, x: 0, y: 0, vx: 0, vy: 0, radius: 20, pulsePhase: 1, community: 0 },
    { id: 'n4', label: '抖音', url: '', platform: 'douyin', color: PLATFORM_COLORS.douyin, x: 0, y: 0, vx: 0, vy: 0, radius: 16, pulsePhase: 1.5, community: 0 },
    { id: 'n5', label: 'GitHub', url: '', platform: 'github', color: PLATFORM_COLORS.github, x: 0, y: 0, vx: 0, vy: 0, radius: 16, pulsePhase: 2, community: 0 },
  ]
  const defaultEdges: Edge[] = [
    { source: 'n1', target: 'n2' },
    { source: 'n1', target: 'n3' },
    { source: 'n1', target: 'n4' },
    { source: 'n1', target: 'n5' },
  ]

  const [nodes, setNodes] = useState<Node[]>(defaultNodes)
  const [edges, setEdges] = useState<Edge[]>(defaultEdges)
  const [selectedId, setSelectedId] = useState<string | null>('n1')
  const [size, setSize] = useState({ w: 900, h: 600 })

  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth - 300, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Load GitHub data when available
  useEffect(() => {
    if (githubData) {
      setNodes(githubData.nodes)
      setEdges(githubData.edges)
      setSelectedId('self')
    }
  }, [githubData])

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
        nodes={loading && !githubData ? defaultNodes : nodes}
        edges={loading && !githubData ? defaultEdges : edges}
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
        {loading && <p style={{ color: '#64748b', fontSize: 12 }}>加载 GitHub 数据...</p>}
        {githubData && (
          <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>🐦 GitHub 数据</h3>
            <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>
              关注: {githubData.nodes.filter(n => n.id.startsWith('f_')).length} 人<br />
              粉丝: {githubData.nodes.filter(n => n.id.startsWith('fl_')).length} 人<br />
              节点: {githubData.nodes.length} 个<br />
              连线: {githubData.edges.length} 条
            </p>
          </div>
        )}
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