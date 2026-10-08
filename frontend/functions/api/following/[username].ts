export async onRequestGet(context: PagesFunction) {
  const { params } = context
  const username = params.username as string

  try {
    const res = await fetch(`https://api.github.com/users/${username}/following?per_page=100`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Cloudflare-Pages',
      },
    })
    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}