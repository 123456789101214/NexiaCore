import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // 💡 මෙන්න මේක දැම්මම Dev mode එකෙත් PWA එක වැඩ කරන්න ගන්නවා
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'NexiaCore POS',
        short_name: 'NexiaCore',
        description: 'Smart POS for Sri Lankan Businesses',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/pos',  // 💡 Start directly at POS on launch
        icons: [
          {
            src: '/icons/launchericon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/launchericon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // 🚀 1. FIX: Vercel PWA Error එක හදන්න Cache Limit එක 5MB කරනවා
        maximumFileSizeToCacheInBytes: 5000000,
        
        navigateFallbackDenylist: [/^\/downloads\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache API: products list (for offline search)
            urlPattern: /^https:\/\/.*\/api\/products/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'products-cache',
              networkTimeoutSeconds: 5,
              // Products cache (Removed duplicate expiration key for safety):
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
            }
          },
          {
            // Cache API: customers (for credit lookup)
            urlPattern: /^https:\/\/.*\/api\/customers/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'customers-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 4 }
            }
          }
        ]
      }
    })
  ],
  
  // 🚀 2. PRO FIX: ලොකු 2.1MB ෆයිල් එක කෑලි වලට කඩනවා (Code Splitting)
  build: {
    chunkSizeWarningLimit: 1500, // Warning limit එක ටිකක් වැඩි කළා
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          barcodeTools: ['html5-qrcode', 'jsbarcode'],
          excelTools: ['xlsx'],
          ui: ['lucide-react', 'sweetalert2', 'recharts']
        }
      }
    }
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // ⚠️ ඔයාගේ Node.js Backend එක දුවන Port එක (උදා: 5000 හෝ 8000) මෙතනට දෙන්න
        changeOrigin: true,
        secure: false,
      }
    }
  }
});