import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    force: true        // ← always re-bundle on start
  },
  cacheDir: '.vite_cache'  // ← separate cache folder, easy to delete
})