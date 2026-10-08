import { Env } from './env'

// GitHub OAuth endpoints
const GITHUB_CLIENT_ID = 'a7d86c1a6e764c4ab3'
const GITHUB_CLIENT_SECRET = '***' // set via secret
const GITHUB_REDIRECT_URI = 'https://dashboard-arh.pages.dev/api/oauth/github/callback'

export interface GithubUser {
  login: string
  id: number
  avatar_url: string
  html_url: string
  name: string | null
}

export interface GithubFollowing {
  login: string
  id: number
  avatar_url: string
  html_url: string
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    // Step 1: Redirect to GitHub auth
    if (path === '/api/oauth/github') {
      const state = crypto.randomUUID()
      // Store state in KV for validation
      await env.GRAPH_KV.put(`oauth_state:${state}`, 'pending', { expirationTtl: 600 })

      const authUrl = new URL('https://github.com/login/oauth/authorize')
      authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', GITHUB_REDIRECT_URI)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('scope', 'read:user user:email followers following')

      return Response.redirect(authUrl.toString(), 302)
    }

    // Step 2: Callback
    if (path === '/api/oauth/github/callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      if (error || !code) {
        return new Response(`OAuth error: ${error || 'no code'}`, { status: 400 })
      }

      // Validate state
      const stateKey = `oauth_state:${state}`
      const stateVal = await env.GRAPH_KV.get(stateKey)
      if (!stateVal) {
        return new Response('Invalid state', { status: 400 })
      }
      await env.GRAPH_KV.delete(stateKey)

      // Exchange code for token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: GITHUB_REDIRECT_URI,
        }),
      })

      const tokenData = await tokenRes.json()
      const accessToken = tokenData.access_token

      if (!accessToken) {
        return new Response('Failed to get access token', { status: 400 })
      }

      // Get user info
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      })
      const user: GithubUser = await userRes.json()

      // Get following (paginated)
      const following: GithubFollowing[] = []
      let page = 1
      while (true) {
        const followingRes = await fetch(
          `https://api.github.com/user/following?per_page=100&page=${page}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
            },
          }
        )
        const data: GithubFollowing[] = await followingRes.json()
        if (!Array.isArray(data) || data.length === 0) break
        following.push(...data)
        page++
        if (data.length < 100) break
      }

      // Store in KV
      const accountId = `github_${user.id}`
      await env.GRAPH_KV.put(`account:${accountId}`, JSON.stringify({
        id: accountId,
        platform: 'github',
        login: user.login,
        name: user.name,
        avatar: user.avatar_url,
        url: user.html_url,
        accessToken,
        followingCount: following.length,
        lastSync: Date.now(),
      }))

      // Store following list
      await env.GRAPH_KV.put(`following:${accountId}`, JSON.stringify(following), {
        expirationTtl: 86400, // 24h cache
      })

      // Redirect back to admin
      return Response.redirect('https://dashboard-arh.pages.dev/admin', 302)
    }

    // Get account info
    if (path.match(/^\/api\/account\/.+$/)) {
      const accountId = path.replace('/api/account/', '')
      const data = await env.GRAPH_KV.get(`account:${accountId}`)
      if (!data) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...cors } })
      }
      return new Response(data, { headers: { 'Content-Type': 'application/json', ...cors } })
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

    // Get following list
    if (path.match(/^\/api\/following\/.+$/)) {
      const accountId = path.replace('/api/following/', '')
      const data = await env.GRAPH_KV.get(`following:${accountId}`)
      if (!data) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...cors } })
      }
      return new Response(data, { headers: { 'Content-Type': 'application/json', ...cors } })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...cors } })
  }
} satisfies ExportedHandler<Env>