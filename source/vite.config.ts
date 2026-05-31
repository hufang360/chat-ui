import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'path'

const isCrx = process.env.MODE === 'crx'

export default defineConfig({
  base: isCrx ? './' : '/',
  plugins: [
    react(),
    ...(!isCrx ? [viteSingleFile()] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    cssCodeSplit: false,
    ...(!isCrx && {
      assetsInlineLimit: 100000000,
      chunkSizeWarningLimit: 100000000,
      brotliSize: false,
    }),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
