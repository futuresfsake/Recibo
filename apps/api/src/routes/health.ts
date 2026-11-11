import { Router } from "express";
import type { Check } from "../checks/types.js";

export interface HealthDeps {
  checkDb: Check;
  checkOllama: Check;
}

/** FR-13: report DB (if configured) and LLM provider status. */
export function healthRouter({ checkDb, checkOllama }: HealthDeps): Router {
  const router = Router();
  router.get("/health", async (_req, res) => {
    const [database, ollama] = await Promise.all([checkDb(), checkOllama()]);
    res.json({
      status: database.ok && ollama.ok ? "ok" : "degraded",
      database,
      ollama,
    });
  });
  return router;
}
