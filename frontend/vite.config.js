import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://backend:3000',
      '/socket.io': {
        target: 'http://backend:3000',
        ws: true,
      },
    },
  },
})
