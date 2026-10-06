import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    host: true,
    allowedHosts: [
      'health-one-portal-java-based-application.onrender.com',
      '.onrender.com',
    ],
  },
})
