import { defineConfig, loadEnv, type Plugin } from 'vite';
import { bridge } from './server/bridge.mjs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
  const backendBridge: Plugin = {
    name: 'fexpo-backend-bridge',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        req.url = '/api' + req.url;
        void bridge(req, res, env);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api', (req, res) => {
        req.url = '/api' + req.url;
        void bridge(req, res, env);
      });
    },
  };
  return {
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    plugins: [
      backendBridge,
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        manifest: {
          id: '/',
          name: 'Fexpo',
          short_name: 'Fexpo',
          lang: 'es',
          description: 'Tu feria, a tu ritmo. Descubre stands y registra tu recorrido con Fexpo.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#f6f8fc',
          theme_color: '#087ec2',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            { name: 'Explorar el mapa', url: '/map' },
            { name: 'Mi código QR', url: '/my-qr' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,otf,ttf,png,jpg,svg,webp,mp3}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          // Public illustrations have stable names; they must receive content revisions.
          dontCacheBustURLsMatching: /^assets\/.*-[\w-]{8}\.(?:js|css)$/,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
        },
        devOptions: { enabled: false },
      }),
    ],
    server: { port: 5174, strictPort: true },
    preview: { port: 4174, strictPort: true },
  };
});
