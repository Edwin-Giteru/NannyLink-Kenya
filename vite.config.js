import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'frontend',

  resolve: {
    alias: {
      '@assets': resolve(__dirname, 'frontend/assets'),
      '@styles': resolve(__dirname, 'frontend/assets/styles'),
      '@scripts': resolve(__dirname, 'frontend/assets/scripts'),
      '@views': resolve(__dirname, 'frontend/src/views'),
      '@Family': resolve(__dirname, 'frontend/src/Family'),
      '@nanny': resolve(__dirname, 'frontend/src/nanny'),
      '@admin': resolve(__dirname, 'frontend/src/admin'),
    },
  },

  server: {
    port: 5500,
    open: 'index.html',

    // Development-only proxy
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/password-reset': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/families': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/nannies': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/connections': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/contracts': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/payments': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/stats': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})