import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

const up = async () => ({ ok: true, detail: "ok" });
// Every LLM and database dependency is down: Post Check must still work (FR-18).
const down = async () => ({ ok: false, detail: "down" });
const app = createApp(loadConfig({}), { checkDb: down, checkOllama: down });

const POST = "To secure your slot, pay the P500 registration fee via GCash. Message us on Telegram only.";

describe("POST /post-check", () => {
  it("FR-17 returns signals with exact quotes and their offsets", async () => {
    const res = await request(app).post("/post-check").send({ post: POST });
    expect(res.status).toBe(200);
    expect(res.body.signals.length).toBeGreaterThanOrEqual(2);
    for (const s of res.body.signals) {
      expect(POST.slice(s.start, s.end)).toBe(s.quote);
    }
    expect(res.body.rules_run).toBeGreaterThan(0);
  });

  it("FR-18 works with the database and every LLM provider down", async () => {
    const res = await request(app).post("/post-check").send({ post: POST });
    expect(res.status).toBe(200);
    expect(res.body.signals[0].rule_id).toMatch(/^S\d\d$/);
  });

  it("FR-17 a clean post returns an empty list, not an error", async () => {
    const res = await request(app).post("/post-check").send({ post: "Junior developer, onsite in Cebu. Two interview rounds." });
    expect(res.status).toBe(200);
    expect(res.body.signals).toEqual([]);
  });

  it("NFR-04 an empty post is a 400 with a plain message", async () => {
    const res = await request(app).post("/post-check").send({ post: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("empty_post");
  });

  it("NFR-04 a body without a post string is a 400", async () => {
    const res = await request(app).post("/post-check").send({ text: "hi" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_request");
  });

  it("NFR-04 an oversized body is a 413", async () => {
    const res = await request(app).post("/post-check").send({ post: "a".repeat(300_000) });
    expect(res.status).toBe(413);
  });

  it("NFR-10 neither the post text nor its quotes are written to the logs", async () => {
    const spies = [vi.spyOn(console, "log"), vi.spyOn(console, "error"), vi.spyOn(console, "warn"), vi.spyOn(console, "info")];
    await request(app).post("/post-check").send({ post: POST });
    await request(app).post("/post-check").send({ post: 42 });
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("registration fee");
      spy.mockRestore();
    }
  });

  it("NFR-04 error responses never echo the submitted text", async () => {
    const res = await request(app).post("/post-check").send({ post: "   ", secret: "do-not-echo-me" });
    expect(JSON.stringify(res.body)).not.toContain("do-not-echo-me");
  });

  it("FR-13 /health still works alongside it", async () => {
    const ok = createApp(loadConfig({}), { checkDb: up, checkOllama: up });
    expect((await request(ok).get("/health")).body.status).toBe("ok");
  });
});
