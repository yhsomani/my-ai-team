import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'talentsphere_host',
      filename: 'remoteEntry.js',
      exposes: {
        './AuthComponents': './src/pages/auth/LoginPage.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^7.0.0' },
        '@reduxjs/toolkit': { singleton: true, requiredVersion: '^2.0.0' },
      },
    }),
  ],
  optimizeDeps: {
    include: ['socket.io-client'],
  },
  build: {
    target: 'esnext',
  },
  server: {
    port: 3001,
    proxy: {
      // Proxy all /api/* calls to the API gateway
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.warn('[Vite Proxy] API gateway unreachable:', err.message);
          });
        },
      },
    },
  },
})