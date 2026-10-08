export async function onRequestGet(context: PagesFunction) {
  const url = new URL(context.request.url)
  const path = url.searchParams.get('path') || '/status.php'
  const upstream = 'https://omarchy.tail44a97.ts.net'

  try {
    const res = await fetch(`${upstream}${path}`, {
      headers: { 'Accept': 'application/json' },
    })
    const data = await res.text()
    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 })
  }
}

export async function onRequestOptions(context: PagesFunction) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}