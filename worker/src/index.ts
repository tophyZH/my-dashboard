export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const path = url.pathname

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    // Health check
    if (path === '/api/health') {
      return Response.json({ status: 'ok', timestamp: Date.now(), worker: 'dashboard' }, { headers: cors })
    }

    // GitHub OAuth - redirect to auth
    if (path === '/api/oauth/github') {
      const state = crypto.randomUUID()
      await env.GRAPH_KV.put(`oauth_state:${state}`, 'pending', { expirationTtl: 600 })
      const authUrl = new URL('https://github.com/login/oauth/authorize')
      authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', GITHUB_REDIRECT_URI)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('scope', 'read:user user:email followers following')
      return Response.redirect(authUrl.toString(), 302)
    }

    // GitHub OAuth callback
    if (path === '/api/oauth/github/callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      if (error || !code) {
        return new Response(`OAuth error: ${error || 'no code'}`, { status: 400 })
      }

      const stateVal = await env.GRAPH_KV.get(`oauth_state:${state}`)
      if (!stateVal) {
        return new Response('Invalid state', { status: 400 })
      }
      await env.GRAPH_KV.delete(`oauth_state:${state}`)

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: GITHUB_REDIRECT_URI,
        }),
      })
      const tokenData = await tokenRes.json()
      const accessToken = tokenData.access_token

      if (!accessToken) {
        return new Response('Failed to get token', { status: 400 })
      }

      const userRes = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
      })
      const user = await userRes.json()

      // Get following
      const following = []
      let page = 1
      while (true) {
        const fRes = await fetch(`https://api.github.com/user/following?per_page=100&page=${page}`, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
        })
        const data = await fRes.json()
        if (!Array.isArray(data) || data.length === 0) break
        following.push(...data)
        page++
        if (data.length < 100) break
      }

      const accountId = `github_${user.id}`
      await env.GRAPH_KV.put(`account:${accountId}`, JSON.stringify({
        id: accountId, platform: 'github', login: user.login,
        name: user.name, avatar: user.avatar_url, url: user.html_url,
        accessToken, followingCount: following.length, lastSync: Date.now(),
      }))
      await env.GRAPH_KV.put(`following:${accountId}`, JSON.stringify(following), {
        expirationTtl: 86400,
      })

      return Response.redirect('https://dashboard-arh.pages.dev/admin', 302)
    }

    // List accounts
    if (path === '/api/accounts') {
      const accounts = []
      const list = await env.GRAPH_KV.list({ prefix: 'account:' })
      for (const key of list.keys) {
        const data = await env.GRAPH_KV.get(key.name)
        if (data) accounts.push(JSON.parse(data))
      }
      return new Response(JSON.stringify(accounts), { headers: { 'Content-Type': 'application/json', ...cors } })
    }

    // Get account
    if (path.match(/^\/api\/account\/.+$/)) {
      const accountId = path.replace('/api/account/', '')
      const data = await env.GRAPH_KV.get(`account:${accountId}`)
      if (!data) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...cors } })
      return new Response(data, { headers: { 'Content-Type': 'application/json', ...cors } })
    }

    // Get following
    if (path.match(/^\/api\/following\/.+$/)) {
      const accountId = path.replace('/api/following/', '')
      const data = await env.GRAPH_KV.get(`following:${accountId}`)
      if (!data) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...cors } })
      return new Response(data, { headers: { 'Content-Type': 'application/json', ...cors } })
    }

    // Proxy to upstream
    if (path === '/api/proxy') {
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

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
  }
} satisfies ExportedHandler<Env>

const GITHUB_CLIENT_ID = 'a7d86c1a6e764c4ab3'
const GITHUB_REDIRECT_URI = 'https://dashboard-arh.pages.dev/api/oauth/github/callback'

interface Env {
  UPSTREAM_URL: string
  GITHUB_CLIENT_SECRET: string
  GRAPH_KV: KVNamespace
}

// deploy 2026年 10月 08日 星期四 15:10:03 CST