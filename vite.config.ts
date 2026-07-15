import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 8033 },
  build: {
    rollupOptions: {
      input: {
        // 독서앱 BookBloom (기본)
        main: resolve(__dirname, 'index.html'),
        // 감각 친화 AAC 도구 (독립 모듈) — /aac.html
        aac: resolve(__dirname, 'aac.html'),
      },
    },
  },
})
