import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()], server: { proxy: { '/api': 'http://15.207.50.26:3103', '/healthz': 'http://15.207.50.26:3103' } }, build: { target: 'es2020', sourcemap: false } });
