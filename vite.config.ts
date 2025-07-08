import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['d3-selection', 'd3-transition', 'd3-zoom'],
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 3000
  }
})
