export async onRequestGet(context: PagesFunction) {
  const { params } = context
  const username = params.username as string
  const type = context.request.url.includes('/followers') ? 'followers' : 'following'

  try {
    const res = await fetch(`https://api.github.com/users/${username}/${type}?per_page=100`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Cloudflare-Pages',
      },
    })

    if (!res.ok) {
      // Try with auth if public fails
      const ghToken = context.env.GH_TOKEN || ''
      const res2 = await fetch(`https://api.github.com/users/${username}/${type}?per_page=100`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${ghToken}`,
          'User-Agent': 'Cloudflare-Pages',
        },
      })
      const data = await res2.json()
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}