import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Centre-MP'
const base = process.env.GITHUB_ACTIONS === 'true' ? `/${repoName}/` : '/'

/** Charge .env dans process.env pour le proxy Groq (GROQ_API_KEY). */
function applyEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
}

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

async function readRequestBody(req: any): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

function aiChatApiPlugin() {
  const handler = async (req: any, res: any, next: any) => {
    const url = req.url || ''
    if (!url.startsWith('/api/ai-chat')) {
      next()
      return
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.end()
      return
    }

    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' }))
      return
    }

    try {
      const raw = await readRequestBody(req)
      const body = JSON.parse(raw || '{}') as {
        messages?: Array<{ role: string; content: string }>
        model?: string
        temperature?: number
        max_tokens?: number
      }

      const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY
      if (!apiKey) {
        res.statusCode = 501
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(
          JSON.stringify({
            error:
              'Clé Groq absente. Définissez GROQ_API_KEY (recommandé) ou VITE_GROQ_API_KEY dans .env, puis redémarrez npm run dev.',
          }),
        )
        return
      }

      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: 'Messages manquants.' }))
        return
      }

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: body.model || process.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: body.messages,
          temperature: typeof body.temperature === 'number' ? body.temperature : 0.5,
          max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 900,
        }),
      })

      const payload = await groqResponse.json()
      if (!groqResponse.ok) {
        res.statusCode = groqResponse.status
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(
          JSON.stringify({
            error: payload?.error?.message || `Erreur Groq (${groqResponse.status})`,
          }),
        )
        return
      }

      const content = payload?.choices?.[0]?.message?.content?.trim() || ''
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify({ content }))
    } catch (error) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(
        JSON.stringify({
          error: 'Impossible de joindre Groq.',
          details: String(error),
        }),
      )
    }
  }

  return {
    name: 'ai-chat-api',
    configureServer(server: any) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(handler)
    },
  }
}

function officialStudyApiPlugin() {
  const handler = async (req: any, res: any, next: any) => {
    const url = req.url || ''

    if (url.startsWith('/api/gosho-du-jour')) {
      try {
        const { fetchOfficialDailyWisdom } = await import('./src/services/officialGosho.ts')
        const payload = await fetchOfficialDailyWisdom()
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(payload))
      } catch (error) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(
          JSON.stringify({
            error: 'Impossible de récupérer le Gosho officiel SGI-USA',
            details: String(error),
            sourceUrl: 'https://cms.sgi-usa.org/dw/',
          }),
        )
      }
      return
    }

    if (url.startsWith('/api/encouragement-du-jour')) {
      try {
        const { fetchOfficialDailyEncouragement } = await import(
          './src/services/officialEncouragement.ts'
        )
        const payload = await fetchOfficialDailyEncouragement()
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(payload))
      } catch (error) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(
          JSON.stringify({
            error: 'Impossible de récupérer le Daily Encouragement officiel',
            details: String(error),
            sourceUrl: 'https://www.sokaglobal.org/resources/daily-encouragement/',
          }),
        )
      }
      return
    }

    next()
  }

  return {
    name: 'official-study-api',
    configureServer(server: any) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig(({ mode }) => {
  applyEnv(mode)

  return {
  base,
  plugins: [
    figmaAssetResolver(),
    aiChatApiPlugin(),
    officialStudyApiPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Centre Miroir Parfait — SGI Côte d’Ivoire',
        short_name: 'Centre MP',
        description:
          'Tableau de bord et espace communautaire du Centre Miroir Parfait, Soka Gakkai International Côte d’Ivoire.',
        theme_color: '#0a2f52',
        background_color: '#f3f6fa',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'fr',
        categories: ['lifestyle', 'social'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/assets\//, /\/[^/?]+\.[a-zA-Z0-9]+$/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'unsplash-images',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
