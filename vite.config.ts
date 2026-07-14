import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'

// Every route is a lazy page chunk, so without hints the browser discovers it
// only after the main bundle executes, and the hero image only after the page
// renders — two extra round trips on the LCP path. This plugin injects an
// inline script that preloads the matched route's chunks and hero image
// directly from the HTML.
const ROUTE_PAGES: Record<string, string> = {
  '/': 'LandingPage',
  '/solo': 'SoloPage',
  '/sample-subscribe': 'SampleSubscribePage',
  '/welcome-back': 'ReactivationPage',
  '/subscribe-offer': 'SubscribePage',
  '/subscribe-ingredients': 'SubscribeIngredientsPage',
  '/wholesale': 'WholesalePage',
}
// Routes whose above-the-fold hero shows /kibble/1.jpg.
const HERO_IMAGE_ROUTES = ['/', '/solo', '/sample-subscribe', '/wholesale']

function routePreload(): Plugin {
  return {
    name: 'route-preload',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return // dev server: modules are served on demand
        const chunks = Object.values(bundle).filter((c) => c.type === 'chunk')
        const routeFiles: Record<string, string[]> = {}
        for (const [route, page] of Object.entries(ROUTE_PAGES)) {
          const entry = chunks.find((c) =>
            c.facadeModuleId?.endsWith(`/components/${page}.tsx`),
          )
          if (!entry) continue
          const files: string[] = []
          const walk = (fileName: string) => {
            if (files.includes(fileName)) return
            files.push(fileName)
            const chunk = bundle[fileName]
            if (chunk?.type === 'chunk') chunk.imports.forEach(walk)
          }
          walk(entry.fileName)
          // The entry <script> already loads the index chunk; don't re-hint it.
          routeFiles[route] = files.filter((f) => !f.startsWith('assets/index-'))
        }
        const script =
          `(function(){var m=${JSON.stringify(routeFiles)};` +
          `var h=${JSON.stringify(HERO_IMAGE_ROUTES)};` +
          `var p=location.pathname.replace(/\\/+$/,'')||'/';` +
          `(m[p]||m['/']).forEach(function(f){` +
          `var l=document.createElement('link');l.rel='modulepreload';l.href='/'+f;` +
          `document.head.appendChild(l)});` +
          `if(h.indexOf(p)>-1){` +
          `var i=document.createElement('link');i.rel='preload';i.as='image';` +
          `i.href='/kibble/1.jpg';i.setAttribute('fetchpriority','high');` +
          `document.head.appendChild(i)}})();`
        return [{ tag: 'script', children: script, injectTo: 'head' }]
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
  },
  build: {
    // Target modern browsers so esbuild skips legacy down-level transforms
    // (avoids shipping unnecessary helpers flagged by Lighthouse).
    target: 'es2020',
  },
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
    routePreload(),
  ],
})
