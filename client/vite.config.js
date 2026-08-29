import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      '/status': 'http://localhost:5000',
      '/printers': 'http://localhost:5000',
      '/events': 'http://localhost:5000',
      '/api': 'http://localhost:5000',
    },
  },
})
