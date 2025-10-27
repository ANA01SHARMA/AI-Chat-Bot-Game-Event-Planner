import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The specific ngrok host from the error message
const ngrokHost = 'ad5c-2405-201-a40c-7a94-d83-29fb-94cf-8347.ngrok-free.app';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true,             // bind to all interfaces
    port: 5173,             // use this port
    strictPort: true,       // fail if port is taken

    // Add this section to allow the ngrok host
    allowedHosts: [
      ngrokHost,
      // You can add other hosts here if needed
    ],

    proxy: {
      '/plan-event': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    }
  }
});
