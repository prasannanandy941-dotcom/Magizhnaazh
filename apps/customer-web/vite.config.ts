import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/customer/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Libraries go in their own files. They rarely change, so browsers keep
        // them cached across our deploys and only re-download our app code.
        manualChunks: {
          react: ['react', 'react-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
