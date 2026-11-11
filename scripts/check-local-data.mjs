/**
 * Fails if anything under a `local-data/` folder is tracked or staged in git.
 *
 * `local-data/` holds the owner's own resume (or ones shared with explicit consent)
 * for local-only checks. It is gitignored, but `git add -f` bypasses that, so this
 * is a hard gate (NFR-11, AGENTS.md #5).
 *
 * Usage: node scripts/check-local-data.mjs [repo-dir]
 */
import { spawnSync } from "node:child_process";

const cwd = process.argv[2] ?? process.cwd();
const res = spawnSync("git", ["ls-files", "--", ":(glob)**/local-data/**"], { cwd, encoding: "utf8" });

if (res.status !== 0) {
  console.error("check-local-data: git failed:", (res.stderr || "").trim());
  process.exit(2);
}

const tracked = res.stdout.split(/\r?\n/).filter(Boolean);
if (tracked.length > 0) {
  console.error("FAIL: files under local-data/ are tracked by git:");
  for (const f of tracked) console.error("  " + f);
  console.error("Remove them from git with: git rm -r --cached local-data");
  process.exit(1);
}

console.log("local-data check: nothing tracked");
