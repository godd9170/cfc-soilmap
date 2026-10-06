/** Shared plumbing for the endpoints in api/. */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

interface JsonOptions {
  status?: number
  /** Seconds Vercel's CDN may serve the response before revalidating; omit for no caching. */
  cache?: number
}

export function json(data: unknown, { status = 200, cache }: JsonOptions = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      // Browsers always revalidate; the CDN shares a response for `cache` seconds and keeps
      // serving it for a while after while it refreshes in the background.
      'cache-control': cache ? `public, max-age=0, s-maxage=${cache}, stale-while-revalidate=${cache * 5}` : 'no-store',
    },
  })
}

/** Turns thrown errors into JSON responses: `HttpError`s keep their status, anything else is a 502. */
export function route(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, { status: e.status })
      console.error(e)
      return json({ error: 'Upstream request failed' }, { status: 502 })
    }
  }
}

/** A required positive-integer query parameter. */
export function intParam(request: Request, name: string): number {
  const v = Number(new URL(request.url).searchParams.get(name))
  if (!Number.isInteger(v) || v <= 0) throw new HttpError(400, `Missing or invalid "${name}"`)
  return v
}
