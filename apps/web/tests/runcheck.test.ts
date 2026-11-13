import { afterEach, describe, expect, it, vi } from "vitest";
import { runCheck } from "../src/PostCheck";

const POST = "Pay the P500 registration fee via GCash. Telegram only.";
const signal = new AbortController().signal;

afterEach(() => vi.unstubAllGlobals());

describe("Post Check in the browser", () => {
  it("FR-18 falls back to the local rules when no server is reachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    const r = await runCheck(POST, signal);
    expect(r.ranIn).toBe("browser");
    expect(r.signals.map((s) => s.rule_id)).toContain("S01");
    for (const s of r.signals) expect(POST.slice(s.start, s.end)).toBe(s.quote);
  });

  it("FR-18 treats a static host's 404 page as no server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Not found</html>", { status: 404 })));
    const r = await runCheck(POST, signal);
    expect(r.ranIn).toBe("browser");
    expect(r.signals.length).toBeGreaterThan(0);
  });

  it("FR-17 uses the server result when the API answers", async () => {
    const body = { signals: [{ rule_id: "S03", label: "x", quote: "Telegram only", start: 40, end: 53 }], rules_run: 7 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));
    const r = await runCheck(POST, signal);
    expect(r.ranIn).toBe("server");
    expect(r.signals).toHaveLength(1);
  });

  it("NFR-04 shows the API's own error message instead of falling back", async () => {
    const err = { error: { code: "post_too_long", message: "That is more than we can check at once." } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(err), { status: 413 })));
    await expect(runCheck(POST, signal)).rejects.toThrow("more than we can check");
  });
});
