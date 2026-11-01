import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, PluginOption } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [
    react(), 
    tailwindcss(),
  ];

  if (command === 'build') {
    try {
      const { VitePWA } = await import('vite-plugin-pwa');
      plugins.push(
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
          manifest: {
            id: '/',
            name: 'Solar.IOT - ESP32 Smart Solar Monitoring & Cleaning',
            short_name: 'Solar.IOT',
            description: 'Smart solar panel monitoring and cleaning dashboard with real-time ESP32 IoT telemetry, solar sizing & battery calculators, and automated cleaning controls.',
            theme_color: '#090d16',
            background_color: '#090d16',
            display: 'standalone',
            orientation: 'portrait-primary',
            start_url: '/',
            scope: '/',
            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/pwa-maskable-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          workbox: {
            maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          },
        })
      );
    } catch (err) {
      console.warn('VitePWA build note:', err);
    }
  }

  return {
    plugins,
    build: {
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('lucide-react')) return 'vendor-lucide';
              if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
