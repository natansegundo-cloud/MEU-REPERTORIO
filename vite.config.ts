import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string };

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'brand/icon.svg',
        'brand/icon-192.png',
        'brand/icon-512.png',
        'brand/maskable-512.png',
      ],
      manifest: {
        id: '/',
        name: 'Meu Repertório',
        short_name: 'Repertório',
        description:
          'Repertórios, músicas e cifras para violão, com transposição e funcionamento offline.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0d0e10',
        theme_color: '#0d0e10',
        icons: [
          {
            src: 'brand/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'brand/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'brand/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/assets/pdf-*.js', '**/assets/pdf.worker*.mjs'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/pdf(?:\.worker(?:\.min)?)?-[^/]+\.(?:js|mjs)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'meu-repertorio-pdf-runtime',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/react')) return 'react';
          if (id.includes('node_modules/dexie')) return 'dexie';
          if (id.includes('/src/features/show-mode/')) return 'show-mode';
          if (id.includes('/src/features/transpose/')) return 'music-engine';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    // Os testes de integração resetam um IndexedDB fake compartilhado.
    // A execução serial evita concorrência entre ciclos de abertura e limpeza.
    fileParallelism: false,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts', 'src/test/**', 'src/**/*.d.ts'],
    },
  },
});
