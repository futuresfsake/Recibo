import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The browser only ever talks to the Express API (AGENTS.md #8). In dev the
// proxy keeps that a single origin; in production set VITE_API_URL.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": { target: "http://localhost:8000", rewrite: (p) => p.replace(/^\/api/, "") } } },
});
