import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The browser only ever talks to the Express API (AGENTS.md #8). In dev the
// proxy keeps that a single origin; in production set VITE_API_URL.
// GitHub Pages serves the site under /Recibo/, so the Pages workflow sets
// VITE_BASE; local dev and any other host keep "/".
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": { target: "http://localhost:8000", rewrite: (p) => p.replace(/^\/api/, "") } } },
});
