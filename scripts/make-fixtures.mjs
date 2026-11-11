/**
 * Regenerates the synthetic resume fixtures in packages/proof/tests/fixtures/.
 *
 * Every fixture is fictional (NFR-11). Run: node scripts/make-fixtures.mjs
 * The generated files are committed so tests do not depend on generator libraries.
 */
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, crc32 } from "node:zlib";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "packages", "proof", "tests", "fixtures");
mkdirSync(OUT, { recursive: true });

const BANNER = "SYNTHETIC TEST RESUME - FICTIONAL PERSON";

const finish = (doc, path) =>
  new Promise((res) => {
    doc.pipe(createWriteStream(path)).on("finish", res);
    doc.end();
  });

// ---- 1. two-column PDF: narrow sidebar + main column
{
  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: "synthetic two-column resume" } });
  doc.fontSize(8).text(BANNER, 40, 20);
  doc.fontSize(18).text("MARIA SAMPLE SANTOS", 40, 40);
  // left sidebar, written first
  const side = (title, lines, y) => {
    doc.fontSize(11).text(title, 40, y, { width: 150 });
    doc.fontSize(9.5);
    lines.forEach((l) => doc.text(l, 40, doc.y + 2, { width: 150 }));
    return doc.y + 14;
  };
  let y = 90;
  y = side("SKILLS", ["TypeScript, JavaScript, Python", "React, Node.js, Express", "SQL, Git, Figma"], y);
  y = side("CERTIFICATIONS", ["TESDA NC II Computer Systems Servicing", "Civil Service Sub-Professional eligibility"], y);
  side("LANGUAGES", ["Filipino, English, Cebuano"], y);
  // right main column, written second
  const main = (title, bullets, startY) => {
    doc.fontSize(11).text(title, 230, startY, { width: 320 });
    doc.fontSize(9.5);
    bullets.forEach((b) => doc.text(b, 230, doc.y + 3, { width: 320 }));
    return doc.y + 14;
  };
  let ym = 90;
  ym = main("EXPERIENCE", [
    "OJT Web Developer, Sample Tech Corp, Jun 2025 to Aug 2025",
    "- Built an inventory dashboard using React and Node.js that reduced manual stock encoding time by 40% for the warehouse team.",
    "- Wrote REST endpoints with Express and added unit tests with Vitest for the billing module, raising coverage from 35 percent to 80 percent.",
  ], ym);
  ym = main("EDUCATION", ["BS Information Technology, Sample State University, cum laude, 2026"], ym);
  main("PROJECTS", ["- Queue app for a barangay health center handling about 1,200 patients per month."], ym);
  await finish(doc, join(OUT, "two-column.pdf"));
}

// ---- 1b. two-column PDF, content written row by row (left line, right line, next row).
// Some PDF exporters do this; it is the harder case for reading order.
{
  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: "synthetic two-column resume, row-interleaved" } });
  doc.fontSize(8).text(BANNER, 40, 20);
  doc.fontSize(18).text("MARIA SAMPLE SANTOS", 40, 40);
  const rows = [
    ["SKILLS", "EXPERIENCE"],
    ["TypeScript, Python", "OJT Web Developer, Sample Tech Corp, 2025"],
    ["React, Node.js", "- Built an inventory dashboard using React and"],
    ["SQL, Git, Figma", "Node.js that reduced manual stock encoding"],
    ["", "time by 40% for the warehouse team."],
    ["CERTIFICATIONS", "- Wrote REST endpoints with Express and added"],
    ["TESDA NC II", "unit tests with Vitest for the billing module."],
    ["Civil Service", "EDUCATION"],
    ["Sub-Professional", "BS Information Technology, cum laude, 2026"],
  ];
  rows.forEach(([left, right], i) => {
    const y = 90 + i * 16;
    doc.fontSize(9.5);
    if (left) doc.text(left, 40, y, { width: 170, lineBreak: false });
    if (right) doc.text(right, 230, y, { width: 320, lineBreak: false });
  });
  await finish(doc, join(OUT, "two-column-interleaved.pdf"));
}

// ---- 2. table-heavy DOCX: layout built from tables
{
  const cell = (text, bold = false, width = 3000) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text, bold })] })],
    });
  const row = (...cells) => new TableRow({ children: cells });
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun({ text: BANNER, size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: "MARIA SAMPLE SANTOS", bold: true, size: 32 })] }),
          new Table({
            rows: [
              row(cell("Period", true, 1800), cell("Role", true, 2600), cell("Details", true, 5000)),
              row(
                cell("Jun 2025 - Aug 2025", false, 1800),
                cell("OJT Web Developer, Sample Tech Corp", false, 2600),
                cell("Built an inventory dashboard using React and Node.js that reduced manual stock encoding time by 40% for the warehouse team.", false, 5000),
              ),
              row(
                cell("2024 - 2025", false, 1800),
                cell("Student Assistant, Sample State University", false, 2600),
                cell("Maintained the department help desk and resolved about 25 tickets per week.", false, 5000),
              ),
            ],
          }),
          new Paragraph({ children: [new TextRun("")] }),
          new Table({
            rows: [
              row(cell("Skill area", true, 2600), cell("Tools", true, 7000)),
              row(cell("Web", false, 2600), cell("TypeScript, React, Node.js, Express", false, 7000)),
              row(cell("Data", false, 2600), cell("SQL, Excel, basic pandas", false, 7000)),
            ],
          }),
        ],
      },
    ],
  });
  writeFileSync(join(OUT, "table-heavy.docx"), await Packer.toBuffer(doc));
}

// ---- 3. image-only PDF: a scan stand-in with no text layer
{
  const W = 300;
  const H = 160;
  const raw = Buffer.alloc((W + 1) * H, 255);
  for (let y = 0; y < H; y++) {
    raw[y * (W + 1)] = 0; // PNG filter byte: none
    const barRow = y % 16 < 8 && y > 12 && y < H - 12;
    if (barRow) for (let x = 20 + ((y >> 4) % 3) * 10; x < W - 30 - ((y >> 4) % 4) * 25; x++) raw[y * (W + 1) + 1 + x] = 40;
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: "synthetic image-only resume (scan stand-in)" } });
  doc.image(png, 40, 40, { width: 500 }); // image only: no text operators on the page
  await finish(doc, join(OUT, "image-only.pdf"));
}

console.log("fixtures written to", OUT);
