/**
 * Same-origin proxy to Local Line's storefront API, which sends no CORS headers.
 *
 * A plain vercel.json rewrite doesn't work: Vercel adds `X-Forwarded-Host: <our domain>`, and
 * Local Line resolves the store from that host, so every call comes back as
 * `{"redirect_url": "https://localline.ca"}`. This function makes a clean request instead,
 * forwarding only the headers the API needs. vercel.json rewrites /localline/<path> here as
 * ?path=<path>; in dev, vite.config.ts proxies /localline directly.
 */
const UPSTREAM = 'https://localline.ca/api/storefront/v2/'
const FORWARD = ['authorization', 'content-type', 'subdomain', 'accept']

async function proxy(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.searchParams.get('path') ?? ''
  // Only relative API paths; never let the caller pick another host.
  if (!/^[\w\-./]*$/.test(path) || path.includes('..')) return new Response('Bad path', { status: 400 })
  url.searchParams.delete('path')
  const target = `${UPSTREAM}${path.replace(/^\/+/, '')}${path.endsWith('/') || !path ? '' : '/'}${url.search}`

  const headers = new Headers()
  for (const h of FORWARD) {
    const v = request.headers.get(h)
    if (v) headers.set(h, v)
  }
  const res = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
  })
  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' },
  })
}

export const GET = proxy
export const POST = proxy
