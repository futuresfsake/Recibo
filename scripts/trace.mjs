/**
 * Requirement traceability check.
 *
 * Reads docs/REQUIREMENTS.md (source of truth) and scans test files for
 * requirement IDs written in test titles, e.g.
 *   it("FR-07 exact quote is verified", ...)  ->  FR-07
 *
 * Reports covered / uncovered / orphaned. Exit code 1 if there are orphans
 * (a test referencing an ID that does not exist). With --strict, uncovered
 * IDs also fail.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REQ_FILE = join(ROOT, "docs", "REQUIREMENTS.md");
const TEST_FILE = /\.(test|spec|eval)\.(ts|tsx|mjs|js)$/;
const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

const REQ_ROW = /^\|\s*(N?FR)-(\d{2})\s*\|/;
// A test/it/describe title string that carries an ID.
const TITLE = /\b(?:it|test|describe)(?:\.\w+)?\(\s*(["'`])((?:(?!\1).)*?\b(N?FR)-(\d{2})\b(?:(?!\1).)*?)\1/g;

function loadRequirements() {
  const ids = new Set();
  for (const line of readFileSync(REQ_FILE, "utf8").split(/\r?\n/)) {
    const m = REQ_ROW.exec(line);
    if (m) ids.add(`${m[1]}-${m[2]}`);
  }
  return ids;
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (TEST_FILE.test(name)) yield p;
  }
}

function loadTestIds() {
  const found = new Map();
  for (const top of ["apps", "packages", "evals", "scripts"]) {
    for (const file of walk(join(ROOT, top))) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(TITLE)) {
        const id = `${m[3]}-${m[4]}`;
        found.set(id, [...(found.get(id) ?? []), m[2]]);
      }
    }
  }
  return found;
}

const strict = process.argv.includes("--strict");
const reqs = loadRequirements();
const tests = loadTestIds();

const covered = [...reqs].filter((r) => tests.has(r)).sort();
const uncovered = [...reqs].filter((r) => !tests.has(r)).sort();
const orphaned = [...tests.keys()].filter((r) => !reqs.has(r)).sort();

console.log(
  `Requirements: ${reqs.size} | covered: ${covered.length} | uncovered: ${uncovered.length} | orphaned: ${orphaned.length}`,
);
if (uncovered.length) console.log("Uncovered:", uncovered.join(", "));
if (orphaned.length) console.log("ORPHANED test IDs (no matching requirement):", orphaned.join(", "));

process.exit(orphaned.length || (strict && uncovered.length) ? 1 : 0);
