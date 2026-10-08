/// <reference types="vite/client" />

const FUNNEL_URL = 'https://omarchy.tail44a97.ts.net'

import { useState, useEffect } from 'react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api'

interface HealthResult {
  status: string
  timestamp: number
  worker?: string
}

interface NextcloudStatus {
  version?: string
  system_status?: string[]
  needs_upgrade?: boolean
  maintenance?: boolean
}

function App() {
  const [health, setHealth] = useState<HealthResult | null>(null)
  const [ncStatus, setNcStatus] = useState<NextcloudStatus | null>(null)
  const [loading, setLoading] = useState('idle')
  const [error, setError] = useState('')

  const fetchJson = async (url: string, opts?: RequestInit) => {
    setLoading('loading')
    setError('')
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      setLoading('done')
      return data
    } catch (e: unknown) {
      setError(String(e))
      setLoading('error')
      return null
    }
  }

  const checkHealth = async () => {
    const data = await fetchJson(`${API_BASE}/health`)
    if (data) setHealth(data)
  }

  const checkNextcloud = async () => {
    const data = await fetchJson(`${FUNNEL_URL}/status.php`)
    if (data) setNcStatus(data)
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const statusColor = (s: string) =>
    s === 'ok' ? 'green' : s === 'error' ? 'red' : 'orange'

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', fontFamily: 'system-ui, sans-serif', padding: '0 1rem' }}>
      <h1>Nextcloud Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <Card title="Worker 健康" status={health?.status || 'unknown'} onCheck={checkHealth} />
        <Card title="Nextcloud 状态" status={ncStatus ? 'ok' : 'unknown'} onCheck={checkNextcloud} />
      </div>

      {loading === 'loading' && <p style={{ color: '#888' }}>检测中...</p>}
      {error && <pre style={{ background: '#fee', padding: 12, borderRadius: 8 }}>{error}</pre>}

      <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto' }}>
        <h3>原始数据</h3>
        <pre style={{ fontSize: 13 }}>
          {JSON.stringify({ health, ncStatus }, null, 2)}
        </pre>
      </div>
    </div>
  )
}

function Card({ title, status, onCheck }: { title: string; status: string; onCheck: () => void }) {
  const color = status === 'ok' ? '#22c55e' : status === 'error' ? '#ef4444' : '#f59e0b'
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 20, textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 16, color: '#555' }}>{title}</h2>
      <div style={{ fontSize: 32, fontWeight: 'bold', color: color }}>{status}</div>
      <button
        onClick={onCheck}
        style={{
          marginTop: 12,
          padding: '8px 24px',
          border: 'none',
          borderRadius: 8,
          background: '#2563eb',
          color: 'white',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        检测
      </button>
    </div>
  )
}

export default App