import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Hostinger deploy uses `backend/` as app root — keep built SPA next to the server
  build: {
    outDir: "../backend/public/app",
    emptyOutDir: true
  }
})
