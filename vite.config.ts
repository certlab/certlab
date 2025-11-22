import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  // Base path for GitHub Pages deployment
  // Set VITE_BASE_PATH environment variable to override (e.g., for forks or different repo names)
  // Default production path assumes repository name is 'certlab'
  // For root domain deployment (e.g., custom domain), set VITE_BASE_PATH='/'
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/certlab/' : '/'),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
