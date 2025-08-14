import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No proxy here; frontend talks directly to Render using VITE_SERVER_URL
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' }
});
