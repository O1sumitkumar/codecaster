import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.TOY_WEB_PORT) || 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.TOY_API_PORT || 3000}`,
        changeOrigin: true,
      },
    },
  },
});
