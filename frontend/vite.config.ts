import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registra el service worker también en `pnpm dev`, para poder probar el
      // prompt de instalación en localhost (por defecto solo se activa en build).
      devOptions: { enabled: true },
      manifest: {
        name: 'Recorte Bingo',
        short_name: 'Recorte Bingo',
        description: 'Venta de cartones de bingo',
        lang: 'es',
        theme_color: '#0D1B2A',
        background_color: '#0D1B2A',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Imágenes de cartón: cache-first (no cambian una vez generadas)
            urlPattern: /\/api\/cartones\/\d+\/imagen/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cartones-img',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api', networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5180,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
