/** Freeze the current engine output as a named version, so later runs can
 * compare against it. Run this at a release commit:
 *
 *   node_modules/.bin/vite-node scripts/visual-eval/record-snapshot.mts -- --label v1.0.14
 */
import { writeFile, mkdir } from "node:fs/promises";
import { loadGoals, sourceOf, renderCase, engineStamp, casesDir } from "./lib.mts";

const argv = process.argv.slice(2);
const value = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const stamp = engineStamp();
const label = value("label") ?? `v${stamp.version}`;
if (!/^[\w.@-]+$/.test(label)) throw new Error(`Unusable snapshot label: ${label}`);
if (stamp.dirty && !argv.includes("--allow-dirty"))
  throw new Error("src/ has uncommitted changes — commit first, or pass --allow-dirty.");

// A baseline is worth having for every case, held-out ones included: what the
// released engine does with a circuit it was never tuned on is exactly the
// comparison the holdout split exists to make.
for (const goal of await loadGoals({
  case: value("case"),
  type: value("type"),
  split: (value("split") ?? "all") as "train" | "holdout" | "all",
})) {
  const svg = renderCase(goal, await sourceOf(goal.id)).svg;
  const dir = new URL(`${goal.id}/snapshots/${label}/`, casesDir);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL("render.svg", dir), svg);
  await writeFile(
    new URL("meta.json", dir),
    JSON.stringify({ label, ...stamp, recordedAt: new Date().toISOString() }, null, 2) + "\n",
  );
  console.log(`snapshot ${label}: ${goal.id} @ ${stamp.commit}`);
}
