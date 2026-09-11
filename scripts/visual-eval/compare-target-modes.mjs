/** Does the reference drawing change the grade?
 *
 * The rubric is the specification; the target drawing is only an aid for the
 * judge. If that is true, grading with and without it should land in the same
 * place, and every new case can go straight into the corpus without waiting on
 * a target to be drafted and reviewed. If it is not true, the two modes are
 * different measurements and must not be mixed in one number. This measures it.
 *
 *   node scripts/visual-eval/compare-target-modes.mjs circuit-bridge-psu circuit-load-bank
 */
import { readFile } from "node:fs/promises";
import { judge } from "./judge.mjs";

const WEIGHT = { blocker: 4, major: 2, minor: 1 };
const ids = process.argv.slice(2);
if (!ids.length) throw new Error("Name at least one case id.");

const pct = (rubric, verdict) => {
  const got = new Map(verdict.items.map((i) => [i.id, i.verdict]));
  let earned = 0, total = 0;
  for (const rule of rubric) {
    total += WEIGHT[rule.severity];
    if (got.get(rule.id) === "pass") earned += WEIGHT[rule.severity];
  }
  return Math.round((earned / total) * 100);
};

const rows = [];
for (const id of ids) {
  const goal = JSON.parse(await readFile(new URL(`../../visual-eval/cases/${id}/goal.json`, import.meta.url), "utf8"));
  const dir = new URL(`../../preview/visual-eval/${id}/`, import.meta.url);
  const imagePath = new URL("next.png", dir).pathname;
  const idealPath = new URL("ideal.png", dir).pathname;
  const [withRef, without] = await Promise.all([
    judge({ imagePath, idealPath, rubric: goal.rubric, effort: "low" }),
    judge({ imagePath, rubric: goal.rubric, effort: "low" }),
  ]);
  const a = pct(goal.rubric, withRef), b = pct(goal.rubric, without);
  rows.push({ id, withTarget: a, withoutTarget: b, delta: b - a });
  console.log(`${id.padEnd(34)} with ${String(a).padStart(3)}%   without ${String(b).padStart(3)}%   delta ${b - a > 0 ? "+" : ""}${b - a}`);
}
const mean = (k) => rows.reduce((n, r) => n + r[k], 0) / rows.length;
const absMean = rows.reduce((n, r) => n + Math.abs(r.delta), 0) / rows.length;
console.log(`\nmean with target ${mean("withTarget").toFixed(0)}%, without ${mean("withoutTarget").toFixed(0)}%`);
console.log(`mean signed shift ${mean("delta") > 0 ? "+" : ""}${mean("delta").toFixed(1)} points, mean absolute spread ${absMean.toFixed(1)} points`);
