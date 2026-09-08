import { defineConfig, loadEnv, type Plugin } from 'vite'
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
  '/keep-going': 'KeepGoingPage',
  '/get-feedback': 'GetFeedbackPage',
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

function sendJson(
  res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (chunk: string) => void },
  status: number,
  payload: unknown,
): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function feedbackApi(): Plugin {
  return {
    name: 'feedback-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== '/api/feedback') {
          next()
          return
        }
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' })
          return
        }
        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(Buffer.from(chunk))
          const raw = Buffer.concat(chunks).toString('utf8')
          let body: unknown = {}
          if (raw) {
            try {
              body = JSON.parse(raw) as unknown
            } catch {
              sendJson(res, 400, { error: 'Invalid JSON' })
              return
            }
          }
          const env = loadEnv(server.config.mode, process.cwd(), '')
          for (const key of ['KLAVIYO_API_KEY', 'MIXPANEL_TOKEN', 'INTERCOM_ACCESS_TOKEN'] as const) {
            const value = env[key]?.trim()
            if (value && value.length >= 20 && !value.startsWith('[')) {
              process.env[key] ??= value
            }
          }
          const { submitFeedback } = await import('./api/lib/submit-feedback.ts')
          const result = await submitFeedback(body)
          sendJson(
            res,
            result.ok ? 200 : result.status,
            result.ok ? { ok: true } : { error: result.error },
          )
        } catch (err) {
          console.error('feedback-api', err)
          sendJson(res, 500, { error: 'Server error' })
        }
      })
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
    feedbackApi(),
    react(),
    routePreload(),
  ],
})
