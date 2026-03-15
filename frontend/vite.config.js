import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true, 
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000", 
        changeOrigin: true,
      },
      "/rank": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      // Local-dev proxy to avoid CORS when calling the deployed AI service from localhost.
      // In the browser, set VITE_AI_LAYER_URL=/ai and call /ai/chat, /ai/explain-top-3, etc.
      "/ai": {
        target: "https://smart-cd-ai-ai-explanation-service.onrender.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/ai/, ""),
      },
    },
  },
});
