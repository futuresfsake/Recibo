import cors from "cors";
import express from "express";
import type { Config } from "./config.js";
import { errorHandler, notFound } from "./errors.js";
import { healthRouter, type HealthDeps } from "./routes/health.js";

/** Build the Express app. Probes are injected so tests need no network or DB. */
export function createApp(config: Config, deps: HealthDeps): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "256kb" }));
  app.use(healthRouter(deps));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
