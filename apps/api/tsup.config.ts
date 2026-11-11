import { defineConfig } from "tsup";

// Bundle the workspace package so `node dist/server.js` runs without a monorepo install.
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node22",
  noExternal: ["@resibo/proof"],
  clean: true,
});
