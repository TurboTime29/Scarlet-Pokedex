import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the site under /<repo>/ ; override with VITE_BASE when needed.
const base = process.env.VITE_BASE ?? '/Scarlet-Pokedex/'

export default defineConfig({
  base,
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['data/*.json'],
      manifest: {
        name: 'Scarlet Pokédex',
        short_name: 'Scarlet Dex',
        description: 'Pokédex, counters and caught tracker for Pokémon Scarlet',
        theme_color: '#d9381e',
        background_color: '#fff7f3',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,png,svg,ico}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            // list thumbnails ship with the app but aren't precached (1,400+ files): cache as they're seen
            urlPattern: ({ url }: { url: URL }) => url.pathname.includes('/thumbs/'),
            handler: 'CacheFirst',
            options: { cacheName: 'thumbs', expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'artwork', expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0])
