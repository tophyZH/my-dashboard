import { useState } from 'react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api'

function App() {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('')

  const proxy = async (path: string, body?: unknown) => {
    setStatus('loading')
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      })
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
      setStatus('done')
    } catch (e) {
      setResult(String(e))
      setStatus('error')
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>Nextcloud Dashboard</h1>
      <p>Status: {status}</p>
      <button onClick={() => proxy('/health')}>Health Check</button>
      <button onClick={() => proxy('/proxy', { path: '/status.php' })}>
        Nextcloud Status
      </button>
      <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
        {result}
      </pre>
    </div>
  )
}

export default App