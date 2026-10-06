import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Serves api/<name>.ts at /api/<name> in dev, the way Vercel does in production, so `pnpm dev`
 * runs the real endpoints (see api/README.md). Handlers are reloaded on change.
 */
function apiRoutes(): Plugin {
  return {
    name: 'api-routes',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\/+|\/+$/g, '')
        if (!/^[\w-]+$/.test(name)) return next()
        let mod: Record<string, unknown>
        try {
          mod = await server.ssrLoadModule(`/api/${name}.ts`)
        } catch {
          return next()
        }
        const method = req.method ?? 'GET'
        const handler = mod[method] as ((r: Request) => Promise<Response>) | undefined
        if (!handler) {
          res.statusCode = 405
          return res.end()
        }
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const headers = new Headers()
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
        const response = await handler(
          new Request(new URL(req.originalUrl ?? req.url ?? '/', `http://${req.headers.host}`), {
            method,
            headers,
            body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks),
          }),
        )
        res.statusCode = response.status
        response.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(new Uint8Array(await response.arrayBuffer()))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiRoutes()],
  // MapLibre 6 loads its worker relative to its own module URL; prebundling breaks that.
  optimizeDeps: { exclude: ['maplibre-gl'] },
})
