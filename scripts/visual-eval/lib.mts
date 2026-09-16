/** Shared plumbing for the visual-eval loop: load cases, render, rasterize.
 *
 * A case has one or more *versions*: any number of recorded snapshots (each one
 * a real past release, frozen on disk) plus `next`, which is whatever the
 * working tree renders right now. The page compares any two of them.
 */
import { readFile, writeFile, mkdir, readdir, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { Resvg } from "@resvg/resvg-js";
import { renderResult } from "../../src/index";

export const repoRoot = new URL("../../", import.meta.url);
export const casesDir = new URL("visual-eval/cases/", repoRoot);
export const outDir = new URL("preview/visual-eval/", repoRoot);

export type Severity = "blocker" | "major" | "minor";
export type RubricItem = { id: string; severity: Severity; must: string };
export type Ideal = {
  /** SVG filename inside the case directory. */
  file: string;
  /** How the target was made — recorded so a weak target can be traced. */
  source: "hand-authored" | "model-svg" | "imagegen";
  /** Whether a human has looked at it and accepted it as the target. */
  reviewed: boolean;
  notes?: string;
};
/** Which half of the corpus a case belongs to.
 *
 * `train` is what the engine is tuned against: we look at these drawings, we
 * name them in the fix requests, we watch their scores move. `holdout` cases
 * are never named in a fix request and never rendered by a default run — they
 * exist so a round that only *appears* to have improved the engine can be told
 * from one that actually did. If train climbs and holdout does not, the round
 * fitted the training cases rather than the layout problem.
 */
export type Split = "train" | "holdout";

export type Goal = {
  id: string;
  type: string;
  title: string;
  goal: string;
  /** Absent means `train`: the corpus predates the split and is the tuned half. */
  split?: Split;
  /** Which drawing of its type this case is, for a type that declares variants
   *  in visual-eval/variants.json (a comparison is a T-chart or a decision
   *  matrix, never both). Absent for a type with only one way to draw it. */
  variant?: string;
  rubric: RubricItem[];
  ideal?: Ideal;
};

export type Variant = { id: string; label: string; about: string; default?: boolean };

export const loadVariants = async (): Promise<Record<string, Variant[]>> =>
  JSON.parse(await readFile(new URL("visual-eval/variants.json", repoRoot), "utf8"));

export const splitOf = (goal: Goal): Split => goal.split ?? "train";
export type SnapshotMeta = {
  label: string;
  version: string;
  commit: string;
  dirty: boolean;
  recordedAt: string;
};

const SEVERITIES: Severity[] = ["blocker", "major", "minor"];

export async function loadGoals(filter?: {
  case?: string;
  type?: string;
  /** Defaults to `train`. Pass "all" to include the held-out cases. */
  split?: Split | "all";
}): Promise<Goal[]> {
  const ids = (await readdir(casesDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const goals: Goal[] = [];
  const variants = await loadVariants();
  for (const id of ids) {
    const goal: Goal = JSON.parse(await readFile(new URL(`${id}/goal.json`, casesDir), "utf8"));
    if (goal.id !== id) throw new Error(`${id}/goal.json declares id "${goal.id}"`);
    if (!goal.rubric?.length) throw new Error(`${id} has an empty rubric`);
    const seen = new Set<string>();
    for (const item of goal.rubric) {
      if (!SEVERITIES.includes(item.severity))
        throw new Error(`${id}/${item.id}: unknown severity "${item.severity}"`);
      if (!item.must?.trim()) throw new Error(`${id}/${item.id} has no "must" text`);
      if (seen.size === seen.add(item.id).size)
        throw new Error(`${id} repeats rubric id "${item.id}"`);
    }
    if (goal.ideal && !goal.ideal.file)
      throw new Error(`${id}: ideal is declared without a file`);
    const declared = variants[goal.type];
    if (declared && !declared.some((v) => v.id === goal.variant))
      throw new Error(`${id}: a ${goal.type} case must set "variant" to one of ${declared.map((v) => v.id).join(", ")}`);
    if (!declared && goal.variant)
      throw new Error(`${id}: "variant" is set, but ${goal.type} declares no variants in visual-eval/variants.json`);
    goals.push(goal);
  }
  // A default run is a *training* run. Holdout cases stay unrendered unless
  // asked for by name, so an ordinary loop iteration cannot accidentally start
  // treating them as feedback.
  const wantSplit = filter?.split ?? (filter?.case ? "all" : "train");
  const picked = goals.filter(
    (g) =>
      (!filter?.case || g.id === filter.case) &&
      (!filter?.type || g.type === filter.type) &&
      (wantSplit === "all" || splitOf(g) === wantSplit),
  );
  if (!picked.length) throw new Error(`No cases matched ${JSON.stringify(filter)}`);
  // A target is an aid for the judge, not a precondition: the rubric is the
  // specification, and a case grades fine without one (measured: under 4 points
  // on the corpus mean). Say which cases lack one so their scores can be read
  // as the slightly generous numbers they are — but do not treat it as a fault.
  const missing = picked.filter((g) => !g.ideal).map((g) => g.id);
  if (missing.length)
    console.log(`Grading without a reference drawing (scores run slightly high): ${missing.join(", ")}`);
  const unreviewed = picked.filter((g) => g.ideal && !g.ideal.reviewed).map((g) => g.id);
  if (unreviewed.length)
    console.warn(`Target drawing not reviewed yet for: ${unreviewed.join(", ")}`);
  return picked;
}

export const sourceOf = (id: string) => readFile(new URL(`${id}/source.sx`, casesDir), "utf8");

export const renderCase = (goal: Goal, source: string) =>
  renderResult(source, { type: goal.type as never });

export async function rasterize(svg: string, target: URL, width = 1400) {
  await writeFile(
    target,
    new Resvg(svg, { background: "white", fitTo: { mode: "width", value: width } })
      .render()
      .asPng(),
  );
}

export async function exists(url: URL) {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
}

/** Recorded snapshots for a case, oldest first. */
export async function loadSnapshots(id: string): Promise<SnapshotMeta[]> {
  const dir = new URL(`${id}/snapshots/`, casesDir);
  if (!(await exists(dir))) return [];
  const labels = (await readdir(dir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const metas = await Promise.all(
    labels.map(
      async (label) =>
        JSON.parse(
          await readFile(new URL(`${id}/snapshots/${label}/meta.json`, casesDir), "utf8"),
        ) as SnapshotMeta,
    ),
  );
  return metas.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

export const snapshotSvg = (id: string, label: string) =>
  readFile(new URL(`${id}/snapshots/${label}/render.svg`, casesDir), "utf8");

export function engineStamp(paths = ["src"]) {
  const git = (args: string[]) =>
    execFileSync("git", args, { encoding: "utf8", cwd: repoRoot.pathname }).trim();
  return {
    version: JSON.parse(readFileSync_(new URL("package.json", repoRoot))).version as string,
    commit: git(["log", "-1", "--format=%h", "--", ...paths]),
    dirty: git(["status", "--porcelain", "--", ...paths]).length > 0,
  };
}

function readFileSync_(url: URL) {
  return execFileSync("cat", [url.pathname], { encoding: "utf8" });
}
