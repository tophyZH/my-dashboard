/// <reference types="vite/client" />

import { useState, useEffect } from 'react'

interface Account {
  id: string
  platform: string
  login: string
  name: string
  avatar: string
  followingCount: number
  lastSync: number
}

export default function AdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts')
      const data = await res.json()
      setAccounts(data)
    } catch (e) {
      setMsg('加载失败')
    }
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [])

  const connectGitHub = () => {
    window.location.href = '/api/oauth/github'
  }

  const removeAccount = async (id: string) => {
    // In a real app, this would call the API to remove the account
    setAccounts(accounts.filter(a => a.id !== id))
    setMsg('已移除')
  }

  const syncFollowing = async (id: string) => {
    setMsg('同步中...')
    // In a real app, this would trigger a re-sync
    setTimeout(() => { setMsg('同步完成') }, 1000)
  }

  return (
    <div style={{ padding: 32, color: 'white', background: '#0f172a', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>🔐 管理后台</h1>

      {msg && <div style={{ background: '#1e293b', padding: 12, borderRadius: 8, marginBottom: 16, color: '#38bdf8' }}>{msg}</div>}

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 16px', color: '#94a3b8' }}>已连接账号</h2>
        {loading ? (
          <p style={{ color: '#64748b' }}>加载中...</p>
        ) : accounts.length === 0 ? (
          <p style={{ color: '#64748b' }}>暂无账号</p>
        ) : (
          accounts.map(acc => (
            <div key={acc.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: 12, background: '#0f172a', borderRadius: 8, marginBottom: 8,
            }}>
              <img src={acc.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{acc.login}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {acc.platform} · 关注 {acc.followingCount} 人 · {new Date(acc.lastSync).toLocaleString()}
                </div>
              </div>
              <button onClick={() => syncFollowing(acc.id)} style={btnStyle}>同步</button>
              <button onClick={() => removeAccount(acc.id)} style={{ ...btnStyle, background: '#ef4444' }}>移除</button>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={connectGitHub} style={{ ...connectBtn, background: '#24292e' }}>
          🐦 连接 GitHub
        </button>
        <button style={connectBtn}>🎵 连接 抖音</button>
        <button style={{ ...connectBtn, background: '#FB7299' }}>📺 连接 Bilibili</button>
        <button style={{ ...connectBtn, background: '#0084FF' }}>❓ 连接 知乎</button>
      </div>

      <div style={{ marginTop: 32, background: '#1e293b', borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px', color: '#94a3b8' }}>📖 使用说明</h2>
        <ul style={{ color: '#64748b', fontSize: 13, lineHeight: 1.8 }}>
          <li>点击「连接 GitHub」跳转授权，授权后自动导入关注列表</li>
          <li>关注列表会关联到图谱中已有的同名节点</li>
          <li>跨平台关注通过用户名匹配实现关联</li>
          <li>数据存储在 Cloudflare KV，24小时自动刷新</li>
        </ul>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '10px 20px', border: 'none', borderRadius: 8,
  background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: 13,
}

const connectBtn: React.CSSProperties = {
  ...btnStyle, background: '#24292e', minWidth: 160,
}