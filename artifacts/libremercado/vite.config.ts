import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = Number(process.env.PORT || "3000");
const basePath = process.env.BASE_PATH || "/";

/** En local, reenvía /api y /ws al backend (cookies de sesión en el mismo sitio que en dev unificado). */
const devApiProxy = process.env.DEV_API_PROXY?.trim();

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    ...(devApiProxy
      ? {
          proxy: {
            "/api": {
              target: devApiProxy,
              changeOrigin: true,
            },
            "/ws": {
              target: devApiProxy,
              changeOrigin: true,
              ws: true,
            },
          },
        }
      : {}),
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
