export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', timestamp: Date.now() })
    }

    // Proxy to upstream (Nextcloud / Ollama / Laya)
    if (url.pathname === '/api/proxy') {
      const body = (await request.json().catch(() => ({}))) as { path?: string }
      const upstream = env.UPSTREAM_URL || 'http://localhost:8080'
      const target = `${upstream}${body.path || ''}`

      return fetch(target, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response('Not found', { status: 404 })
  }
} satisfies ExportedHandler<Env>

interface Env {
  UPSTREAM_URL: string
}