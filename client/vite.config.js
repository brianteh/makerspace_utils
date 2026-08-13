import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      '/status': 'http://localhost:3001',
      '/printers': 'http://localhost:3001',
      '/events': 'http://localhost:3001',
      '/api': 'http://localhost:3001',
    },
  },
})
