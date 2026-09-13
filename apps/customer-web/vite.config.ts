import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/customer/',
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
});
