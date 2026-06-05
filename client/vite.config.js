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
        enabled: true
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
        start_url: '/pos', 
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
        maximumFileSizeToCacheInBytes: 5000000,
        navigateFallbackDenylist: [/^\/downloads\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/products/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'products-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
            }
          },
          {
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

  server: {
    host: true, // මේකෙන් Network එකට Open වෙනවා (192.168.x.x)
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // ඔයාගේ Backend එක දුවන තැන
        changeOrigin: true,
        secure: false,
      }
    }
  },
  
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // 🚀 CRITICAL FIX: Object එකක් වෙනුවට Function එකක් පාවිච්චි කිරීම
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Excel packages
            if (id.includes('xlsx')) return 'excelTools';
            
            // Barcode & Camera packages
            if (id.includes('html5-qrcode') || id.includes('jsbarcode')) return 'barcodeTools';
            
            // UI Components & Charts
            if (id.includes('lucide-react') || id.includes('sweetalert2') || id.includes('recharts')) return 'uiTools';
            
            // Core React stuff
            if (id.includes('react') || id.includes('zustand') || id.includes('react-router')) return 'vendor';
            
            // අනෙක් සියලුම 3rd party packages
            return 'dependencies'; 
          }
        }
      }
    }
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});