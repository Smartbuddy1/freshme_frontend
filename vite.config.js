import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ base: '/freshme/', plugins: [react(), tailwindcss()], server: { proxy: { '/freshme/api': { target: 'http://15.207.50.26:3103', rewrite: path => path.replace(/^\/freshme/, '') }, '/healthz': 'http://15.207.50.26:3103' } }, build: { target: 'es2020', sourcemap: false } });
