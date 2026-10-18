import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  // 🆕 Tailwind CSS v4 (plugin chính thức)
  plugins: [react(), tailwindcss()],

  // ══════════════════════════════════════════════════════════════
  // 🆕 FIX: SockJS dùng `global` (Node.js) — map sang `globalThis` (Browser)
  // Nếu thiếu dòng này → lỗi "Uncaught ReferenceError: global is not defined"
  // ══════════════════════════════════════════════════════════════
  define: {
    global: 'globalThis',
  },

  // ══════════════════════════════════════════════════════════════
  // PATH ALIAS — @/ → ./src
  // ══════════════════════════════════════════════════════════════
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // ══════════════════════════════════════════════════════════════
  // DEV SERVER
  // ══════════════════════════════════════════════════════════════
  server: {
    port: 5173,

    proxy: {
      // ── Forward /api/** → Spring Boot ──
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // 🆕 Bỏ Domain attribute khỏi Set-Cookie header
        // → browser tự gán domain theo host hiện tại (localhost:5173)
        cookieDomainRewrite: '',
        // 🆕 Force path = /
        cookiePathRewrite: '/',
      },

      // ── Forward /uploads/** → Spring Boot ──
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
      },

      // ── Forward /ws (WebSocket) → Spring Boot ──
      // SockJS: cần proxy cả HTTP fallback + WS upgrade
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
      },
    },
  },
});