export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    // CORS headers
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', timestamp: Date.now(), worker: 'dashboard' }, { headers: cors })
    }

    // Proxy to upstream (Nextcloud / Ollama / Laya)
    if (url.pathname === '/api/proxy') {
      try {
        const body = (await request.json().catch(() => ({}))) as { path?: string; method?: string; body?: unknown }
        const upstream = env.UPSTREAM_URL || 'https://omarchy.tail44a97.ts.net'
        const target = `${upstream}${body.path || ''}`

        const proxyRes = await fetch(target, {
          method: body.method || 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: body.body ? JSON.stringify(body.body) : undefined,
        })

        const data = await proxyRes.json().catch(() => ({}))
        return Response.json(data, { headers: cors })
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 502, headers: cors })
      }
    }

    // Nextcloud status
    if (url.pathname === '/api/nextcloud/status') {
      try {
        const upstream = env.UPSTREAM_URL || 'https://omarchy.tail44a97.ts.net'
        const res = await fetch(`${upstream}/status.php`, { headers: { 'Content-Type': 'application/json' } })
        const data = await res.json()
        return Response.json(data, { headers: cors })
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 502, headers: cors })
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
  }
} satisfies ExportedHandler<Env>

interface Env {
  UPSTREAM_URL: string
}// deploy 2026年 10月 08日 星期四 15:10:03 CST
