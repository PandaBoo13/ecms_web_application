import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { global: 'globalThis' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true, secure: false, cookieDomainRewrite: '', cookiePathRewrite: '/' },
      '/uploads': { target: 'http://localhost:8080', changeOrigin: true, secure: false, cookieDomainRewrite: '' },
      '/ws': { target: 'http://localhost:8080', ws: true, changeOrigin: true, secure: false, cookieDomainRewrite: '' },
    },
  },
})