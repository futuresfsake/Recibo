import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "check-local-data.mjs");
const dirs = [];

function git(cwd, ...args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
}

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "resibo-localdata-"));
  dirs.push(dir);
  git(dir, "init", "-q");
  git(dir, "config", "user.email", "test@example.invalid");
  git(dir, "config", "user.name", "test");
  writeFileSync(join(dir, ".gitignore"), "local-data/\n");
  mkdirSync(join(dir, "local-data"));
  return dir;
}

const run = (cwd) => spawnSync("node", [SCRIPT, cwd], { encoding: "utf8" });

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
});

describe("local-data guard", () => {
  it("NFR-11 passes when local-data/ files exist but are ignored and untracked", () => {
    const dir = makeRepo();
    writeFileSync(join(dir, "local-data", "my-resume.txt"), "synthetic placeholder");
    git(dir, "add", "-A");
    expect(run(dir).status).toBe(0);
  });

  it("NFR-11 fails when a local-data/ file is force-added to the index", () => {
    const dir = makeRepo();
    writeFileSync(join(dir, "local-data", "my-resume.txt"), "synthetic placeholder");
    git(dir, "add", "-f", "local-data/my-resume.txt");
    const res = run(dir);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("local-data/my-resume.txt");
  });

  it("NFR-11 fails when a nested local-data/ file is tracked after commit", () => {
    const dir = makeRepo();
    mkdirSync(join(dir, "apps", "x", "local-data"), { recursive: true });
    writeFileSync(join(dir, "apps", "x", "local-data", "r.txt"), "synthetic placeholder");
    git(dir, "add", "-f", "apps/x/local-data/r.txt");
    git(dir, "commit", "-q", "-m", "x");
    expect(run(dir).status).toBe(1);
  });
});
