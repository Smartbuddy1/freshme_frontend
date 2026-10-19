import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const base = process.env.VITE_BASE_PATH || '/';
const backendTarget = process.env.VITE_BACKEND_TARGET || 'http://127.0.0.1:3001';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/freshme/api': {
        target: backendTarget,
        rewrite: path => path.replace(/^\/freshme\/api/, '/api')
      },
      '/api': backendTarget,
      '/healthz': backendTarget
    }
  },
  build: {
    target: 'es2020',
    sourcemap: false
  }
});


