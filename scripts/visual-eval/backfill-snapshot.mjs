/** Render the whole case corpus with an *older* engine and record the result
 * as a named snapshot, so every case has a "current release" to compare
 * against — not just the ones that existed when that release shipped.
 *
 * `record-snapshot.mts` freezes whatever is checked out. That is right at a
 * release commit and useless afterwards: cases added since then have no
 * baseline, and the review page shows them with an empty "current" column.
 * This checks the old engine out into a throwaway worktree, copies today's
 * cases and eval scripts in, renders there, and copies the snapshots back —
 * without touching the working tree, which usually has uncommitted work in it.
 *
 *   node scripts/visual-eval/backfill-snapshot.mjs --commit ba43c7a --label v1.0.14
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, cpSync, rmSync, existsSync, mkdirSync, readdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const commit = value("commit");
const label = value("label");
if (!commit || !label) throw new Error("Need --commit <sha> and --label <name>.");

const repo = fileURLToPath(new URL("../../", import.meta.url));
const git = (args, cwd = repo) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const worktree = join(mkdtempSync(join(tmpdir(), "visual-eval-backfill-")), "engine");

try {
  git(["worktree", "add", "--detach", worktree, commit]);
  // The old checkout has the old engine but not today's cases or eval scripts,
  // and node_modules is heavy enough to be worth sharing rather than copying.
  symlinkSync(join(repo, "node_modules"), join(worktree, "node_modules"));
  for (const dir of ["visual-eval", "scripts/visual-eval"]) {
    rmSync(join(worktree, dir), { recursive: true, force: true });
    mkdirSync(join(worktree, dir), { recursive: true });
    cpSync(join(repo, dir), join(worktree, dir), { recursive: true });
  }

  execFileSync(
    join(repo, "node_modules/.bin/vite-node"),
    // A single case is worth backfilling on its own when its source changes:
    // re-rendering all 372 to refresh one is minutes of work for nothing.
    ["scripts/visual-eval/record-snapshot.mts", "--", "--label", label, "--allow-dirty",
      ...(value("case") ? ["--case", value("case")] : []),
      ...(value("type") ? ["--type", value("type")] : [])],
    { cwd: worktree, stdio: "inherit" },
  );

  let copied = 0;
  for (const id of readdirSync(join(worktree, "visual-eval/cases"))) {
    const from = join(worktree, "visual-eval/cases", id, "snapshots", label);
    if (!existsSync(from)) continue;
    cpSync(from, join(repo, "visual-eval/cases", id, "snapshots", label), { recursive: true });
    copied++;
  }
  console.log(`\nBackfilled ${label} (${commit}) into ${copied} cases.`);
} finally {
  try { git(["worktree", "remove", "--force", worktree]); } catch { /* already gone */ }
  rmSync(join(worktree, ".."), { recursive: true, force: true });
}
