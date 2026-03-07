import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Serve /previews/* static HTML before SPA fallback kicks in
    {
      name: 'serve-previews',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/previews/') && req.url.endsWith('.html')) {
            const filePath = resolve(__dirname, 'public', req.url.slice(1))
            if (existsSync(filePath)) {
              res.setHeader('Content-Type', 'text/html')
              res.end(readFileSync(filePath, 'utf-8'))
              return
            }
          }
          next()
        })
      }
    },
    react(),
  ],
})
