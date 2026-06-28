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
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'frontend/index.html'),
        login: resolve(__dirname, 'frontend/src/views/login.html'),
        signup: resolve(__dirname, 'frontend/src/views/signup.html'),
        resetPassword: resolve(__dirname, 'frontend/src/views/reset-password.html'),
        terms: resolve(__dirname, 'frontend/src/views/terms.html'),
        privacy: resolve(__dirname, 'frontend/src/views/privacy.html'),
        contact: resolve(__dirname, 'frontend/src/views/contact.html'),
        familyDashboard: resolve(__dirname, 'frontend/src/Family/familydashboard.html'),
        familyCreateProfile: resolve(__dirname, 'frontend/src/Family/createprofile.html'),
        familyProfile: resolve(__dirname, 'frontend/src/Family/familyprofile.html'),
        familyEditProfile: resolve(__dirname, 'frontend/src/Family/edit-profile.html'),
        familyConnections: resolve(__dirname, 'frontend/src/Family/connections.html'),
        familyContracts: resolve(__dirname, 'frontend/src/Family/contracts.html'),
        nannyProfileCreation: resolve(__dirname, 'frontend/src/nanny/profilecreation.html'),
        nannyEditProfile: resolve(__dirname, 'frontend/src/nanny/edit-profile.html'),
        nannyConnections: resolve(__dirname, 'frontend/src/nanny/connections.html'),
        nannyContracts: resolve(__dirname, 'frontend/src/nanny/contracts.html'),
        nannyDashboard: resolve(__dirname, 'frontend/src/nanny/nannydashboard.html'),
        adminStatsOverview: resolve(__dirname, 'frontend/src/admin/statsoverview.html'),
        adminMatchOversight: resolve(__dirname, 'frontend/src/admin/matchoversight.html'),
        adminUserManagement: resolve(__dirname, 'frontend/src/admin/usermanagement.html'),
        adminAuditPayments: resolve(__dirname, 'frontend/src/admin/auditpayments.html'),
        adminReports: resolve(__dirname, 'frontend/src/admin/reports.html'),
      },
    },
  },
})
