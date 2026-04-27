import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Serve from the frontend directory
  root: 'frontend',
  
  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@assets': resolve(__dirname, 'frontend/assets'),
      '@styles': resolve(__dirname, 'frontend/assets/styles'),
      '@scripts': resolve(__dirname, 'frontend/assets/scripts'),
      '@views': resolve(__dirname, 'frontend/views'),
      '@Family': resolve(__dirname, 'frontend/Family'),
      '@nanny': resolve(__dirname, 'frontend/nanny'),
      '@admin': resolve(__dirname, 'frontend/admin'),
    }
  },
  
  // Development server configuration
  server: {
    port: 5500,
    open: '/views/login.html',
    // Proxy API requests to your FastAPI backend
    proxy: {
      '/auth': {
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
      '/login': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/nanny': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/family': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    }
  },
  
  // Build configuration
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  
  // Ensure assets are served correctly
  publicDir: 'assets',
})