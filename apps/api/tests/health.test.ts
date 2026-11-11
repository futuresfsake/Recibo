import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createOllamaCheck } from "../src/checks/ollama.js";
import { loadConfig } from "../src/config.js";

const config = loadConfig({});
const up = async () => ({ ok: true, detail: "ok" });

describe("GET /health", () => {
  it("FR-13 health is ok when all dependencies are up", async () => {
    const app = createApp(config, { checkDb: up, checkOllama: up });
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("FR-13 health is degraded when ollama is down", async () => {
    const app = createApp(config, {
      checkDb: up,
      checkOllama: async () => ({ ok: false, detail: "ollama unreachable" }),
    });
    const res = await request(app).get("/health");
    expect(res.body.status).toBe("degraded");
    expect(res.body.ollama.ok).toBe(false);
  });
});

describe("ollama check", () => {
  it("NFR-04 reports a missing model with the fix", async () => {
    const check = createOllamaCheck(config, async () => ({
      ok: true,
      json: async () => ({ models: [{ name: "nomic-embed-text:latest" }] }),
    }));
    const result = await check();
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("model not pulled");
  });

  it("NFR-04 reports an unreachable ollama instead of throwing", async () => {
    const check = createOllamaCheck(config, async () => {
      throw new TypeError("fetch failed");
    });
    const result = await check();
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("ollama unreachable");
  });
});
