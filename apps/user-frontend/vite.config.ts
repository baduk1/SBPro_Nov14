import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Allow external connections
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress MUI date picker warnings about missing @mui/material/version
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.message.includes('@mui/material/version')) {
          return;
        }
        warn(warning);
      },
    },
  },
})