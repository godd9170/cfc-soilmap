# Server endpoints

Anything the app loads at runtime from another service goes through an endpoint here rather
than being fetched from the browser. That keeps third-party tokens and response shapes out of
the client, sidesteps CORS, and lets Vercel's CDN cache the results.

- One file per endpoint: `api/<name>.ts` is served at `/api/<name>`. Export a handler per HTTP
  method (`export const GET = route(async (request) => …)`) using web `Request`/`Response`.
- Wrap handlers in `route()` from `_lib/http.ts`, return data with `json(data, { cache })` and
  reject bad input with `HttpError`. Upstream failures become a 502 with a short message.
- Put upstream clients and shared helpers in `api/_lib/` (Vercel doesn't turn `_`-prefixed
  paths into endpoints). Types and constants the browser also needs go in `src/lib/`.
- Import with `.js` extensions (`./_lib/http.js`): Vercel runs these as Node ES modules.
- `pnpm dev` serves the same files through the `apiRoutes` plugin in `vite.config.ts`, so
  there's nothing extra to run locally.

| Endpoint | Purpose |
|---|---|
| `GET /api/vendor-products?vendor=<Local Line vendor id>` | Live products and prices for one CFC vendor (`Product[]`), cached at the edge for 60 s |
