import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Проксируем /api на наш Express, чтобы не возиться с CORS в dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
