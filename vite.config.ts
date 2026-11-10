import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = import.meta.dirname

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': `${root}/src`,
      '@shared': `${root}/shared`,
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
})
