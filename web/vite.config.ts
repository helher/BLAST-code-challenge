import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api to the Fastify backend in development.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      }
    }
  }
});
