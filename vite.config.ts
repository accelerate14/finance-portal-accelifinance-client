import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'path': 'path-browserify',
      // Force a single version of React (Fixes the White Screen/Hook error)
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    // Include UiPath SDK and OpenSign
    include: ['@uipath/uipath-typescript', '@opensign/react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Group all UiPath SDK subpath imports into one chunk
          if (id.includes('@uipath/uipath-typescript')) {
            return 'uipath-sdk';
          }
          // Split charting library
          if (id.includes('recharts')) {
            return 'recharts';
          }
          // Split React Router
          if (id.includes('react-router')) {
            return 'react-router';
          }
          // Split other node_modules into vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          // Return undefined for application code (stays in main chunk)
          return undefined;
        },
      },
    },
    // Increase chunk size warning limit to 1000 KB
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/accelirateuipcl': {
        target: 'https://cloud.uipath.com',
        changeOrigin: true,
        secure: true,
      },
    },
  }
})