import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // MapLibre 6 loads its worker relative to its own module URL; prebundling breaks that.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  // Local Line's storefront API has no CORS headers; production uses the same rewrite in vercel.json.
  server: {
    proxy: {
      '/localline': {
        target: 'https://localline.ca',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/localline/, '/api/storefront/v2'),
      },
    },
  },
})
