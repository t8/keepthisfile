import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Note: When using `vercel dev`, API routes are automatically handled by Vercel
  // No proxy needed - Vercel dev serves both frontend and API routes
  // If running Vite standalone (npm run dev), you'll need to run `vercel dev --listen 3000` separately
  server: {
    // Proxy only needed if running Vite standalone without vercel dev
    // When using vercel dev, remove this proxy config
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3000',
    //     changeOrigin: true,
    //   },
    // },
  },
})
