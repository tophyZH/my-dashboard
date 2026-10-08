/// <reference types="vite/client" />

import { useState } from 'react'

interface Node {
  id: string
  label: string
  url: string
  platform: string
  color: string
  parentId?: string
}

interface Edge {
  source: string
  target: string
}

const PLATFORMS = ['twitter', 'douyin', 'bilibili', 'zhihu', 'github', 'nextcloud', 'personal', 'other']

interface AdminPanelProps {
  nodes: Node[]
  edges: Edge[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onUpdateNodes: (nodes: Node[]) => void
  onUpdateEdges: (edges: Edge[]) => void
}

export default function AdminPanel({ nodes, edges, selectedId, onSelect, onUpdateNodes, onUpdateEdges }: AdminPanelProps) {
  const [view, setView] = useState<'tree' | 'flat'>('tree')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editPlatform, setEditPlatform] = useState('personal')
  const [newLabel, setNewLabel] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newPlatform, setNewPlatform] = useState('personal')
  const [linkSource, setLinkSource] = useState('')
  const [linkTarget, setLinkTarget] = useState('')

  const selectedNode = nodes.find(n => n.id === selectedId)

  const addNode = () => {
    if (!newLabel.trim()) return
    const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']
    const node: Node = {
      id: Math.random().toString(36).slice(2, 8),
      label: newLabel,
      url: newUrl,
      platform: newPlatform,
      color: colors[nodes.length % colors.length],
    }
    onUpdateNodes([...nodes, node])
    setNewLabel('')
    setNewUrl('')
  }

  const updateNode = (id: string) => {
    onUpdateNodes(nodes.map(n => n.id === id ? { ...n, label: editLabel, url: editUrl, platform: editPlatform } : n))
    setEditingId(null)
  }

  const deleteNode = (id: string) => {
    onUpdateNodes(nodes.filter(n => n.id !== id))
    onUpdateEdges(edges.filter(e => e.source !== id && e.target !== id))
    if (selectedId === id) onSelect(null)
  }

  const addEdge = () => {
    if (!linkSource || !linkTarget || linkSource === linkTarget) return
    if (edges.find(e => (e.source === linkSource && e.target === linkTarget) || (e.source === linkTarget && e.target === linkSource))) return
    onUpdateEdges([...edges, { source: linkSource, target: linkTarget }])
    setLinkSource('')
    setLinkTarget('')
  }

  const deleteEdge = (idx: number) => {
    onUpdateEdges(edges.filter((_, i) => i !== idx))
  }

  // Build tree hierarchy
  const rootNodes = nodes.filter(n => !edges.find(e => e.target === n.id))
  const getChildren = (parentId: string) => nodes.filter(n => edges.find(e => e.source === parentId && e.target === n.id))
  const getParent = (nodeId: string) => {
    const edge = edges.find(e => e.target === nodeId)
    return edge ? nodes.find(n => n.id === edge.source) : null
  }

  const renderTree = (nodeId: string, depth: number) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return null
    const children = getChildren(nodeId)
    const parent = getParent(nodeId)

    return (
      <div key={nodeId} style={{ marginLeft: depth * 16 }}>
        <div
          onClick={() => onSelect(nodeId)}
          style={{
            padding: '6px 10px',
            cursor: 'pointer',
            background: selectedId === nodeId ? '#334155' : 'transparent',
            borderLeft: `3px solid ${node.color}`,
            borderRadius: 4,
            marginBottom: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#e2e8f0', fontSize: 13 }}>{node.label}</span>
          <span style={{ color: '#64748b', fontSize: 10 }}>{node.platform}</span>
        </div>
        {children.map(c => renderTree(c.id, depth + 1))}
      </div>
    )
  }

  return (
    <div style={{
      width: 300, background: '#0f172a', borderLeft: '1px solid #1e293b',
      padding: 16, overflowY: 'auto', color: 'white', fontSize: 13,
    }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>📊 管理后台</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setView('tree')} style={{ ...tabBtn, background: view === 'tree' ? '#334155' : 'transparent' }}>树状</button>
        <button onClick={() => setView('flat')} style={{ ...tabBtn, background: view === 'flat' ? '#334155' : 'transparent' }}>平铺</button>
      </div>

      {/* Add node */}
      <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>➕ 添加节点</h3>
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="名称" style={inputStyle} />
        <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="链接地址" style={{ ...inputStyle, marginTop: 4 }} />
        <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} style={{ ...inputStyle, marginTop: 4, width: '100%' }}>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={addNode} style={{ ...btnStyle, marginTop: 8, width: '100%' }}>添加</button>
      </div>

      {/* Add edge */}
      <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>🔗 建立关联</h3>
        <select value={linkSource} onChange={e => setLinkSource(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
          <option value="">源节点</option>
          {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
        </select>
        <select value={linkTarget} onChange={e => setLinkTarget(e.target.value)} style={{ ...inputStyle, marginTop: 4, width: '100%' }}>
          <option value="">目标节点</option>
          {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
        </select>
        <button onClick={addEdge} style={{ ...btnStyle, marginTop: 8, width: '100%' }}>关联</button>
      </div>

      {/* Tree view */}
      {view === 'tree' ? (
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>🌳 层级结构</h3>
          {rootNodes.map(n => renderTree(n.id, 0))}
          {nodes.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>暂无节点</div>}
        </div>
      ) : (
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>📋 平铺列表</h3>
          {nodes.map(n => (
            <div key={n.id} onClick={() => onSelect(n.id)} style={{
              padding: '6px 8px', cursor: 'pointer', borderLeft: `3px solid ${n.color}`,
              background: selectedId === n.id ? '#334155' : 'transparent',
              borderRadius: 4, marginBottom: 2, display: 'flex', justifyContent: 'space-between',
            }}>
              <span>{n.label}</span>
              <button onClick={e => { e.stopPropagation(); deleteNode(n.id) }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Edges list */}
      <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginTop: 12 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>🔗 关联列表</h3>
        {edges.map((e, i) => {
          const s = nodes.find(n => n.id === e.source)
          const t = nodes.find(n => n.id === e.target)
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 11 }}>
              <span style={{ color: '#94a3b8' }}>{s?.label || '?'} → {t?.label || '?'}</span>
              <button onClick={() => deleteEdge(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          )
        })}
      </div>

      {/* Selected node edit */}
      {selectedNode && (
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginTop: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>✏️ 编辑节点</h3>
          {editingId === selectedNode.id ? (
            <>
              <input value={editLabel} onChange={e => setEditLabel(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              <input value={editUrl} onChange={e => setEditUrl(e.target.value)} style={{ ...inputStyle, marginTop: 4, width: '100%' }} />
              <select value={editPlatform} onChange={e => setEditPlatform(e.target.value)} style={{ ...inputStyle, marginTop: 4, width: '100%' }}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={() => updateNode(selectedNode.id)} style={{ ...btnStyle, marginTop: 8, width: '100%' }}>保存</button>
            </>
          ) : (
            <>
              <div style={{ color: '#94a3b8', marginBottom: 4 }}>名称: {selectedNode.label}</div>
              <div style={{ color: '#94a3b8', marginBottom: 4, wordBreak: 'break-all' }}>链接: {selectedNode.url}</div>
              <div style={{ color: '#94a3b8', marginBottom: 8 }}>平台: {selectedNode.platform}</div>
              <button onClick={() => { setEditingId(selectedNode.id); setEditLabel(selectedNode.label); setEditUrl(selectedNode.url); setEditPlatform(selectedNode.platform) }} style={{ ...btnStyle, width: '100%', marginBottom: 6 }}>编辑</button>
              <button onClick={() => deleteNode(selectedNode.id)} style={{ ...btnStyle, width: '100%', background: '#ef4444' }}>删除</button>
            </>
          )}
        </div>
      )}

      {/* Social import */}
      <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginTop: 12 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>🔐 社交导入</h3>
        <p style={{ color: '#64748b', fontSize: 11, margin: '0 0 8px' }}>连接平台后导入 following/followed 列表</p>
        <button style={{ ...btnStyle, width: '100%', marginBottom: 6, background: '#1DA1F2' }}>🐦 Twitter/X 导入</button>
        <button style={{ ...btnStyle, width: '100%', marginBottom: 6, background: '#000000' }}>🎵 抖音导入</button>
        <button style={{ ...btnStyle, width: '100%', marginBottom: 6, background: '#FB7299' }}>📺 Bilibili 导入</button>
        <button style={{ ...btnStyle, width: '100%', background: '#0084FF' }}>❓ 知乎导入</button>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '8px 12px', border: 'none', borderRadius: 6,
  background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: 12,
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid #475569',
  background: '#0f172a', color: 'white', fontSize: 12, width: '100%',
  boxSizing: 'border-box' as const,
}

const tabBtn: React.CSSProperties = {
  padding: '4px 12px', border: 'none', borderRadius: 4,
  color: 'white', cursor: 'pointer', fontSize: 12,
}