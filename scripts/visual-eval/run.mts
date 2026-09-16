/** Render every visual goal with the working-tree engine, alongside every
 * recorded snapshot, optionally grade each with the vision judge, and write the
 * report the review page reads.
 *
 *   node_modules/.bin/vite-node scripts/visual-eval/run.mts
 *   node_modules/.bin/vite-node scripts/visual-eval/run.mts -- --type logic --judge
 */
import { writeFile, mkdir, readFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  loadGoals, loadSnapshots, snapshotSvg, sourceOf, renderCase, rasterize,
  engineStamp, casesDir, outDir, splitOf,
} from "./lib.mts";
import { judge } from "./judge.mjs";

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const value = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const wantJudge = flag("judge");
const model = value("model");
const effort = value("effort") ?? "low";
const allGoals = await loadGoals({
  case: value("case"),
  type: value("type"),
  split: value("split") as "train" | "holdout" | "all" | undefined,
});

/** Take an evenly spread sample of at most `n` cases per diagram type.
 *
 * Grading the whole corpus costs hours, and most iterations only need to know
 * whether a change moved the needle — not the exact standing of all 155 cases.
 * Sampling per *type* rather than across the corpus keeps every family in the
 * measurement, so a change that breaks a small family still shows up. Spreading
 * the picks across each type's sorted list (rather than taking the first n)
 * keeps the sample stable between runs, so two sampled runs are comparable.
 */
function samplePerType(goals: typeof allGoals, n: number) {
  const byType = new Map<string, typeof allGoals>();
  for (const g of goals) byType.set(g.type, [...(byType.get(g.type) ?? []), g]);
  const picked = [];
  for (const list of byType.values()) {
    if (list.length <= n) { picked.push(...list); continue; }
    const step = list.length / n;
    for (let i = 0; i < n; i++) picked.push(list[Math.floor(i * step)]);
  }
  return picked.sort((a, b) => a.id.localeCompare(b.id));
}

const sample = value("sample") ? Number(value("sample")) : undefined;
const sampled = sample ? samplePerType(allGoals, sample) : allGoals;
if (sample) console.log(`Sampling up to ${sample} case(s) per type: ${sampled.length} of ${allGoals.length}.`);

/** `--shard 2/5` takes every 5th case starting at the 2nd.
 *
 * One process can only push so many judge calls before it is waiting on itself.
 * Several processes over disjoint slices go faster, but they cannot share one
 * report file — two writers would overwrite each other. So a shard writes its
 * own `report.shard-N.json`, and `merge-shards.mjs` folds them into the report
 * the page reads. Interleaving rather than blocking the corpus keeps each
 * shard's mix of diagram types (and so its cost) roughly even.
 */
/** Skip cases the previous report already covers.
 *
 * Rendering is instant; grading is the hour. When the report is missing cases
 * — after a rebuild, or once new cases land — the page can be made complete in
 * a couple of minutes by rendering only what is absent, and the grading of
 * those cases can follow separately instead of holding the page hostage.
 */
const onlyMissing = flag("only-missing");

const shard = value("shard");

const reportPath = new URL(shard ? `report.shard-${shard.split("/")[0]}.json` : "report.json", outDir);

// A missing report is normal on a first run; an unreadable one is a report that
// was being written when something killed the process. Both mean the same
// thing here — there is no history to merge — and neither should stop a run.
const previousCases: { id: string; versions?: unknown[] }[] = await readFile(reportPath, "utf8")
  .then((t) => JSON.parse(t).cases as { id: string; versions?: unknown[] }[])
  .catch(() => []);

const goals = (() => {
  const pool = onlyMissing
    ? sampled.filter((g) => !previousCases.some((c) => c.id === g.id))
    : sampled;
  if (onlyMissing) console.log(`Only cases missing from the report: ${pool.length} of ${sampled.length}.`);
  if (!shard) return pool;
  const [index, count] = shard.split("/").map(Number);
  if (!(index >= 1 && index <= count)) throw new Error(`Bad --shard ${shard}; use like --shard 2/5.`);
  const mine = pool.filter((_, i) => i % count === index - 1);
  console.log(`Shard ${index} of ${count}: ${mine.length} case(s).`);
  return mine;
})();

/** How many cases to render and grade at once. The judge is a network call, so
 *  the wall-clock cost of a run is almost entirely waiting. */
const concurrency = Number(value("concurrency") ?? (wantJudge ? 6 : 1));

/** Which versions to spend judge time on.
 *
 * A recorded snapshot never changes, so its verdict only has to be earned once;
 * during an iteration round the only thing that has moved is `next`. Grading
 * both doubles every run for no new information, so the default is to grade the
 * working tree only and let a baseline run (`--versions all`) fill in history.
 */
const judgeVersions = value("versions") ?? "next";
const shouldJudge = (key: string) => judgeVersions === "all" || key === "next";
/** Lets the review tool tell "these two versions draw the same picture" from
 *  "these two versions differ", without re-reading the SVGs in the browser. */
const hash = (svg: string) => createHash("sha256").update(svg).digest("hex").slice(0, 12);
const stamp = engineStamp();
await mkdir(outDir, { recursive: true });

const cases: Record<string, unknown>[] = [];
let writeSeq = 0;

/** A filtered run must not throw away the cases it did not touch: merge into
 *  whatever the last full run wrote, so the review tool keeps the whole corpus. */
async function writeReport() {
  // Other render or judge runs may have updated unrelated cases since startup.
  const latestCases = shard ? [] : await readFile(reportPath, "utf8")
    .then((text) => JSON.parse(text).cases as typeof previousCases)
    .catch(() => previousCases);
  const merged = (shard ? [...cases] : [...latestCases.filter((c) => !cases.some((n) => n.id === c.id)), ...cases])
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  // Write-then-rename. `writeFile` truncates first, so a run killed inside that
  // window leaves a zero-byte report — which is exactly how an hour of finished
  // verdicts was lost once. Rename is atomic: the reader sees the old file or
  // the new one, never a half-written one.
  // A unique temp name per write: several cases finish at once and all call
  // this, and a shared temp file means one writer renames the file another is
  // still writing — which showed up as a storm of ENOENT renames.
  const temp = new URL(`${reportPath.pathname.split("/").pop()}.${process.pid}.${writeSeq++}.tmp`, outDir);
  await writeFile(
    temp,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), judged: wantJudge, engine: stamp, cases: merged },
      null, 2,
    ) + "\n",
  );
  await rename(temp, reportPath);
  return merged;
}

async function processCase(goal: (typeof goals)[number]) {
  const dir = new URL(`${goal.id}/`, outDir);
  await mkdir(dir, { recursive: true });
  const targetSvg = goal.ideal
    ? await readFile(new URL(`${goal.id}/${goal.ideal.file}`, casesDir), "utf8")
    : null;
  const targetHash = targetSvg === null ? null : hash(targetSvg);
  const rubricHash = hash(JSON.stringify(goal.rubric));

  // A drawing that has not changed does not need grading again — and grading it
  // again would only add the judge's own run-to-run noise to the comparison.
  const priorJudged = new Map(
    (previousCases.find((c) => c.id === goal.id)?.versions ?? [])
      .filter((v: { judged?: { targetHash?: string | null; rubricHash?: string; model?: string; effort?: string }; svgHash?: string }) =>
        v.judged?.targetHash === targetHash && v.judged?.rubricHash === rubricHash && v.svgHash
        && (!wantJudge || (v.judged.model === model && v.judged.effort === effort)))
      .map((v: { svgHash: string; judged: unknown }) => [v.svgHash, v.judged]),
  );
  const grade = async (key: string, hasIdeal: boolean, svgHash?: string) => {
    if (svgHash && priorJudged.has(svgHash)) {
      console.log(`  reused verdict for ${goal.id}/${key} (unchanged drawing)`);
      return priorJudged.get(svgHash);
    }
    if (!wantJudge || !shouldJudge(key)) return null;
    // Measured across eight cases: grading without the reference drawing shifts
    // the corpus mean by under 4 points, but individual cases move as much as
    // 30 — always upward, because a judge with nothing to compare against
    // accepts drawings a reference exposes. So a target-free score is sound in
    // aggregate and worth having immediately for a new case, while a case is
    // only *settled* once a reviewed target has confirmed it.
    const verdict = await judge({
      imagePath: new URL(`${key}.png`, dir).pathname,
      idealPath: hasIdeal ? new URL("ideal.png", dir).pathname : undefined,
      rubric: goal.rubric,
      model,
      effort,
    });
    console.log(`  judged ${goal.id}/${key} in ${verdict.seconds}s${hasIdeal ? "" : " (no target)"}`);
    return verdict ? { ...verdict, model, effort, targetHash, rubricHash, againstTarget: hasIdeal } : null;
  };

  // The reference drawing, if this goal has one.
  let hasIdeal = false;
  if (targetSvg !== null) {
    const svg = targetSvg;
    await writeFile(new URL("ideal.svg", dir), svg);
    await rasterize(svg, new URL("ideal.png", dir));
    hasIdeal = true;
  }

  const versions = [];
  for (const meta of await loadSnapshots(goal.id)) {
    const key = `snapshot-${meta.label}`;
    const svg = await snapshotSvg(goal.id, meta.label);
    await writeFile(new URL(`${key}.svg`, dir), svg);
    await rasterize(svg, new URL(`${key}.png`, dir));
    const snapHash = hash(svg);
    versions.push({ key, kind: "snapshot", ...meta, svgHash: snapHash, judged: await grade(key, hasIdeal, snapHash) });
  }

  const source = await sourceOf(goal.id);
  const rendered = renderCase(goal, source);
  const nextHash = hash(rendered.svg);
  await writeFile(new URL("next.svg", dir), rendered.svg);
  await rasterize(rendered.svg, new URL("next.png", dir));
  console.log(`rendered ${goal.id}: ${rendered.status}`);
  versions.push({
    key: "next",
    kind: "next",
    label: stamp.dirty ? "next (working tree)" : `next (${stamp.commit})`,
    ...stamp,
    svgHash: nextHash,
    status: rendered.status,
    diagnostics: rendered.diagnostics,
    judged: await grade("next", hasIdeal, nextHash),
  });

  // The source travels with the case: when a drawing looks wrong the first
  // question is whether the DSL or the engine is at fault, and that cannot be
  // answered from the pictures alone.
  cases.push({ ...goal, split: splitOf(goal), hasIdeal, source, versions });
  // Judging a corpus takes hours. Write after every case so a crash near the end
  // costs one case, not the whole run.
  await writeReport();
}

// A judged run over a large corpus can take hours, and the only thing worse
// than a slow run is a slow run that says nothing until it finishes. Report a
// projection as it goes, so it is obvious early whether to let it finish, cut
// the corpus down with --sample, or stop competing with something else.
const startedAt = Date.now();
let finished = 0;
const progress = () => {
  finished++;
  const elapsed = (Date.now() - startedAt) / 1000;
  const projected = (elapsed / finished) * goals.length;
  if (finished % 10 === 0 || finished === goals.length)
    console.log(
      `  [${finished}/${goals.length}] ${(elapsed / 60).toFixed(0)}m elapsed, ` +
        `~${(projected / 60).toFixed(0)}m total at this rate`,
    );
};

const queue = [...goals];
await Promise.all(
  Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    for (let goal = queue.shift(); goal; goal = queue.shift()) {
      // One case that will not grade must not cost the other two hundred.
      try {
        await processCase(goal);
        progress();
      } catch (error) {
        console.error(`FAILED ${goal.id}: ${String((error as Error).message).slice(0, 160)}`);
      }
    }
  }),
);

const merged = await writeReport();
// The number that matters is not the training score on its own — it is the gap
// between the cases the engine was tuned on and the ones it has never seen.
// A round that lifts `train` while `holdout` sits still fitted the cases.
if (wantJudge) {
  const WEIGHT = { blocker: 4, major: 2, minor: 1 } as const;
  const summarise = (which: string) => {
    const rows = cases.filter((c) => c.split === which);
    const scored = rows.flatMap((c) => {
      const v = c.versions.find((x) => x.key === "next");
      const items: { id: string; verdict: string }[] = v?.judged?.items ?? [];
      if (!items.length) return [];
      const got = new Map(items.map((i) => [i.id, i.verdict]));
      let earned = 0, total = 0, blockers = 0;
      for (const rule of c.rubric) {
        total += WEIGHT[rule.severity];
        if (got.get(rule.id) === "pass") earned += WEIGHT[rule.severity];
        if (got.get(rule.id) === "fail" && rule.severity === "blocker") blockers++;
      }
      return [{ pct: (earned / total) * 100, blockers }];
    });
    if (!scored.length) return null;
    const mean = scored.reduce((n, s) => n + s.pct, 0) / scored.length;
    const blockers = scored.reduce((n, s) => n + s.blockers, 0);
    return `${which}: ${mean.toFixed(0)}% over ${scored.length} cases, ${blockers} blockers`;
  };
  for (const which of ["train", "holdout"]) {
    const line = summarise(which);
    if (line) console.log(line);
  }
}
console.log(`\nWrote preview/visual-eval/report.json — ${cases.length} of ${merged.length} cases refreshed, judge ${wantJudge ? "on" : "off"}`);
console.log("Read it at http://127.0.0.1:3031/eval/ (npx vite --port 3031 --config vite.preview.config.ts .)");
