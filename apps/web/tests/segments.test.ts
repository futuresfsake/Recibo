import { describe, expect, it } from "vitest";
import { toSegments, type ApiSignal } from "../src/segments";

const sig = (start: number, end: number, text: string): ApiSignal => ({
  rule_id: "S01",
  label: "x",
  quote: text.slice(start, end),
  start,
  end,
});

describe("highlighting quotes in the post", () => {
  const text = "Pay the fee now. Telegram only. Apply today.";

  it("FR-15 the segments always rebuild the exact post text", () => {
    const segs = toSegments(text, [sig(0, 15, text), sig(17, 30, text)]);
    expect(segs.map((s) => s.text).join("")).toBe(text);
  });

  it("FR-15 only the quoted stretches are flagged", () => {
    const segs = toSegments(text, [sig(17, 30, text)]);
    expect(segs.filter((s) => s.flagged).map((s) => s.text)).toEqual(["Telegram only"]);
  });

  it("FR-15 overlapping signals merge into one flagged stretch", () => {
    const segs = toSegments(text, [sig(0, 10, text), sig(5, 15, text)]);
    expect(segs.filter((s) => s.flagged)).toHaveLength(1);
    expect(segs[0]?.text).toBe("Pay the fee now");
  });

  it("FR-15 no signals gives one plain segment", () => {
    expect(toSegments(text, [])).toEqual([{ text, flagged: false }]);
  });

  it("FR-15 out-of-range offsets are clamped instead of throwing", () => {
    const segs = toSegments("abc", [{ rule_id: "S01", label: "x", quote: "", start: -5, end: 99 }]);
    expect(segs).toEqual([{ text: "abc", flagged: true }]);
  });
});
