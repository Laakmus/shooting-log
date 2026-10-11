import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The backend has no /api prefix, so every API path is proxied explicitly.
const BACKEND = "http://localhost:8001";
const API_PATHS = ["/weapons", "/training", "/stats", "/health", "/openapi.json"];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: Object.fromEntries(API_PATHS.map((path) => [path, BACKEND])),
  },
});
