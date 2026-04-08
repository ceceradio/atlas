import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@atlas/api': path.resolve(__dirname, '../api/src'),
    },
  },
  server: {
    port: 3004,
    host: true,
    allowedHosts: ['chocolate.local'],
  },
})
