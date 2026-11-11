import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";

// Regression tests for the provisional parsing libraries (Q-17, DECISIONS #25).
// All fixtures are synthetic and fictional (NFR-11); regenerate with scripts/make-fixtures.mjs.

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

async function pdfText(name: string): Promise<string> {
  const bytes = new Uint8Array(readFileSync(join(FIXTURES, name)));
  const { text } = await extractText(await getDocumentProxy(bytes), { mergePages: true });
  return text;
}

async function docxText(name: string): Promise<string> {
  return (await mammoth.extractRawText({ buffer: readFileSync(join(FIXTURES, name)) })).value;
}

const BULLET =
  "Built an inventory dashboard using React and Node.js that reduced manual stock encoding time by 40% for the warehouse team.";

describe("resume extraction fixtures", () => {
  it("FR-01 two-column PDF (column by column) keeps each bullet sentence intact", async () => {
    const text = flat(await pdfText("two-column.pdf"));
    expect(text).toContain(BULLET);
    expect(text).toContain("raising coverage from 35 percent to 80 percent");
  });

  it("FR-01 table-heavy DOCX extracts every table cell and keeps the bullet intact", async () => {
    const text = flat(await docxText("table-heavy.docx"));
    expect(text).toContain(BULLET);
    expect(text).toContain("resolved about 25 tickets per week");
    expect(text).toContain("SQL, Excel, basic pandas");
  });

  it("FR-01 row-interleaved two-column PDF loses no text", async () => {
    const text = flat(await pdfText("two-column-interleaved.pdf"));
    for (const fragment of [
      "TypeScript, Python",
      "Built an inventory dashboard using React and",
      "Node.js that reduced manual stock encoding",
      "time by 40% for the warehouse team.",
      "BS Information Technology, cum laude, 2026",
    ]) {
      expect(text).toContain(fragment);
    }
  });

  // KNOWN GAP (see docs/research/Q17_LIBRARY_SPIKE.md): unpdf merges the columns line by
  // line, so a wrapped bullet is split by the other column's text. The full-bullet quote then
  // scores about 84 and is rejected (fail-safe: lower recall, never a false verification).
  // `it.fails` passes while the gap exists and starts failing when column-aware extraction
  // is added, which is the cue to turn it into a normal test.
  it.fails("FR-01 row-interleaved two-column PDF keeps the bullet sentence intact (known gap)", async () => {
    const text = flat(await pdfText("two-column-interleaved.pdf"));
    expect(text).toContain(
      "Built an inventory dashboard using React and Node.js that reduced manual stock encoding time by 40% for the warehouse team.",
    );
  });

  it("NFR-04 image-only PDF extracts no text, the signal for the 'can't read this file' error", async () => {
    const text = await pdfText("image-only.pdf");
    expect(text.trim()).toBe("");
  });
});
