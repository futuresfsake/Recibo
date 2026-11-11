import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

const up = async () => ({ ok: true, detail: "ok" });
const app = createApp(loadConfig({}), { checkDb: up, checkOllama: up });

describe("REST error contract", () => {
  it("NFR-04 unknown route returns 404 with a JSON error body", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.error.code).toBe("not_found");
  });

  it("NFR-04 malformed JSON returns 400 and does not echo the input", async () => {
    const res = await request(app)
      .post("/health")
      .set("Content-Type", "application/json")
      .send('{"resume": "secret text"');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("bad_request");
    expect(JSON.stringify(res.body)).not.toContain("secret text");
  });

  it("NFR-04 oversized body returns 413", async () => {
    const res = await request(app)
      .post("/health")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ text: "x".repeat(300_000) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("payload_too_large");
  });
});
