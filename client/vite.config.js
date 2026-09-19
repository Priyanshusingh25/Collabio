import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Realtime channel — must be proxied with ws:true or the client
      // WebSocket handshake 404s against the Vite dev server.
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Keep the initial payload small; route-level chunks are created by the
    // React.lazy() boundaries in src/App.jsx.
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
})
