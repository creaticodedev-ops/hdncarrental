import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': path.resolve(repoRoot, 'shared'),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/src/assets/**/logo (1).svg', '**/logo (1).svg'],
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 900,
    // Do NOT manually split react/motion — that caused runtime TDZ:
    // "Cannot access 'm' before initialization" (circular chunk graph).
    // Route-level React.lazy() already code-splits the app safely.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Safe isolation: phone stack is only needed on reservation pages
          if (id.includes('react-phone-number-input') || id.includes('libphonenumber-js')) {
            return 'phone'
          }
        },
      },
    },
  },
})
