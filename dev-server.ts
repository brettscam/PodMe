/**
 * Local dev server that bridges Vite (frontend) with Vercel-style API handlers.
 * Run with: npx tsx dev-server.ts
 */
import express from 'express'
import { createServer as createViteServer } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: '.env.local' })

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Map of route patterns to handler file paths
const apiRoutes: Array<{ pattern: RegExp; handler: string; paramNames?: string[] }> = [
  { pattern: /^\/api\/health$/, handler: './api/health.ts' },
  { pattern: /^\/api\/topics$/, handler: './api/topics.ts' },
  { pattern: /^\/api\/user-topics$/, handler: './api/user-topics.ts' },
  { pattern: /^\/api\/preferences$/, handler: './api/preferences.ts' },
  { pattern: /^\/api\/episodes\/today$/, handler: './api/episodes/today.ts' },
  { pattern: /^\/api\/episodes\/([^/]+)$/, handler: './api/episodes/[id].ts', paramNames: ['id'] },
  { pattern: /^\/api\/episodes$/, handler: './api/episodes/index.ts' },
  { pattern: /^\/api\/generate\/status\/([^/]+)$/, handler: './api/generate/status/[id].ts', paramNames: ['id'] },
  { pattern: /^\/api\/generate\/script$/, handler: './api/generate/script.ts' },
  { pattern: /^\/api\/generate\/audio$/, handler: './api/generate/audio.ts' },
  { pattern: /^\/api\/generate$/, handler: './api/generate/index.ts' },
]

async function start() {
  const app = express()
  app.use(express.json())

  // API routes - adapt Vercel handlers to Express
  for (const route of apiRoutes) {
    app.all(route.pattern, async (req, res) => {
      try {
        const mod = await import(path.resolve(__dirname, route.handler))
        const handler = mod.default

        // Build query object with path params merged in
        const query: Record<string, string> = {}
        for (const [k, v] of Object.entries(req.query)) {
          query[k] = String(v)
        }
        const match = req.path.match(route.pattern)
        if (match && route.paramNames) {
          for (let i = 0; i < route.paramNames.length; i++) {
            query[route.paramNames[i]] = match[i + 1]
          }
        }

        // Create a proxy over req that overrides .query
        const vercelReq = new Proxy(req, {
          get(target, prop) {
            if (prop === 'query') return query
            return (target as any)[prop]
          },
        })

        // Express res is already compatible with VercelResponse
        // (has .status(), .json(), .send() with chaining)
        await handler(vercelReq, res)
      } catch (err) {
        console.error(`API error [${req.method} ${req.path}]:`, err)
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', detail: String(err) })
        }
      }
    })
  }

  // Vite dev server for frontend
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)

  const port = 3000
  app.listen(port, () => {
    console.log(`\n  PodMe dev server running at http://localhost:${port}\n`)
    console.log(`  Frontend: Vite (HMR enabled)`)
    console.log(`  API:      Express adapter for Vercel handlers\n`)
  })
}

start().catch(console.error)
