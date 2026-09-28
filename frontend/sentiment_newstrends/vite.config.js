import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// VITE_BACKEND_URL and VITE_WS_URL are read from .env files at build time.
// Set them in .env.production before running: npm run build
export default defineConfig({
  plugins: [react()],
})
