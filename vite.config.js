import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_SERVER_URL, // For local dev proxy if needed
        changeOrigin: true,
        secure: false
      }
    }
  }
})
