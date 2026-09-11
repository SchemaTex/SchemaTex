/** Draft a target drawing for one case, using Codex twice over and letting it
 * pick between its own two attempts.
 *
 *   node scripts/visual-eval/propose-target.mjs --case circuit-555-astable
 *
 * Three passes:
 *   1. Codex writes an SVG target from the DSL source and the rubric alone.
 *   2. Codex's image generator draws the same subject as a picture.
 *   3. Codex looks at both and says which is the better target, and why.
 *
 * The installed target is always the SVG, because a target has to be exact and
 * diffable — a generated raster cannot be. When the picture wins, a fourth pass
 * redraws the SVG to follow the picture's composition, and the picture is kept
 * beside it as `look.png`. Either way the result lands with `reviewed: false`:
 * a person still has to look at it before it grades anything.
 */
import { mkdtemp, readFile, writeFile, rm, copyFile, access, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { codexRun, extractJson } from "./codex-run.mjs";

const root = new URL("../../", import.meta.url);
const argv = process.argv.slice(2);
const value = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const effort = value("effort") ?? "medium";
const model = value("model");

async function codex(prompt, { images = [], sandbox = "read-only", cwd } = {}) {
  const dir = cwd ?? (await mkdtemp(join(tmpdir(), "visual-eval-")));
  const { reply } = await codexRun(prompt, { dir, images, sandbox, model, effort });
  return { dir, reply };
}

/** A target that will not rasterise is not a target. */
async function checkSvg(path) {
  const svg = await readFile(path, "utf8");
  new Resvg(svg, { background: "white", fitTo: { mode: "width", value: 1400 } }).render();
  return svg;
}

async function proposeFor(caseId) {
  const caseDir = new URL(`visual-eval/cases/${caseId}/`, root);
  const goal = JSON.parse(await readFile(new URL("goal.json", caseDir), "utf8"));
  const source = await readFile(new URL("source.sx", caseDir), "utf8");
  const rubricText = goal.rubric.map((r, i) => `${i + 1}. [${r.severity}] ${r.must}`).join("\n");

  const drawBrief = (extra = "") => `You are drawing the *target* for an automated drawing engine: what its output should look like when it is right.

Subject, written in the engine's own DSL:
${source}

The drawing must satisfy every rule below. These are the rules it will be graded on:
${rubricText}

Goal in one line: ${goal.goal}
${extra}
Write a single self-contained SVG file to ./target.svg in this directory. Plain SVG, no external references, no scripts, white background, a viewBox, and a <title>. Draw it as a draughtsman would: conventional symbols, orthogonal connections, text large enough to read, nothing overlapping. Invent no components that the DSL above does not contain, and leave none of them out.
Reply with the single line DONE when the file is written.`;

  const svgPass = await codex(drawBrief(), { sandbox: "workspace-write" });
  const svgPath = join(svgPass.dir, "target.svg");
  await checkSvg(svgPath);
  const svgPreview = join(svgPass.dir, "svg.png");
  await writeFile(svgPreview, new Resvg(await readFile(svgPath, "utf8"),
    { background: "white", fitTo: { mode: "width", value: 1400 } }).render().asPng());

  const lookDir = await mkdtemp(join(tmpdir(), "visual-eval-look-"));
  const lookPath = join(lookDir, "look.png");
  await codex(
    `Use your image generation tool to create a landscape image at ./look.png in this directory.\n` +
    `Subject: a clean, professional ${goal.type} drawing — ${goal.title}. ${goal.goal}\n` +
    `Textbook style: black line art on white, conventional symbols, generous spacing, readable labels, no photographic effects, no perspective, no colour fills.\n` +
    `Reply with the single line DONE when the file is written.`,
    { sandbox: "workspace-write", cwd: lookDir },
  ).catch(() => {});
  const haveLook = await access(lookPath).then(() => true, () => false);

  const verdict = extractJson((await codex(
    `Two candidate target drawings for the same subject. Image 1 is drawn as SVG; image 2 is a generated picture.\n` +
    `Which is the better *target* — the one an engine should be made to match? Judge against these rules:\n${rubricText}\n\n` +
    `Reply with raw JSON only, no prose or fences: {"winner":"svg"|"picture","why":"<one sentence>","svg_defects":["…"],"picture_defects":["…"]}`,
    { images: haveLook ? [svgPreview, lookPath] : [svgPreview] },
  )).reply);

  let finalSvg = svgPath;
  let sourceLabel = "model-svg";
  if (verdict.winner === "picture" && haveLook) {
    const redraw = await codex(
      drawBrief("\nThe attached image is a picture of what this drawing should look like. Follow its composition, spacing and proportions, but keep every component from the DSL above and none that it lacks.\n"),
      { images: [lookPath], sandbox: "workspace-write" },
    );
    finalSvg = join(redraw.dir, "target.svg");
    await checkSvg(finalSvg);
    sourceLabel = "model-svg (imagegen-guided)";
    await copyFile(lookPath, new URL("look.png", caseDir).pathname);
  }

  await copyFile(finalSvg, new URL("ideal.svg", caseDir).pathname);
  goal.ideal = {
    file: "ideal.svg",
    source: sourceLabel,
    reviewed: false,
    notes: `Drafted by Codex from the source and the rubric, without seeing the engine's own output. It preferred the ${verdict.winner}: ${verdict.why}`,
  };
  await writeFile(new URL("goal.json", caseDir), JSON.stringify(goal, null, 2) + "\n");
  await rm(svgPass.dir, { recursive: true, force: true });
  await rm(lookDir, { recursive: true, force: true });
  return `${caseId}: ${sourceLabel} (codex preferred the ${verdict.winner})`;
}

/** Which cases to draft for. Hand-authored targets are never overwritten. */
async function pickCases() {
  if (value("case")) return [value("case")];
  const dir = new URL("visual-eval/cases/", root);
  const ids = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const onlyType = value("type");
  const picked = [];
  for (const id of ids) {
    const goal = JSON.parse(await readFile(new URL(`${id}/goal.json`, dir), "utf8"));
    if (onlyType && goal.type !== onlyType) continue;
    if (goal.ideal?.source === "hand-authored") continue;
    if (goal.ideal && !argv.includes("--redraw")) continue;
    picked.push(id);
  }
  return picked;
}

const cases = await pickCases();
const limit = Number(value("concurrency") ?? 4);
console.log(`Drafting targets for ${cases.length} cases, ${limit} at a time.`);

let cursor = 0, done = 0;
const failures = [];
await Promise.all(Array.from({ length: Math.min(limit, cases.length) }, async () => {
  while (cursor < cases.length) {
    const id = cases[cursor++];
    try {
      const line = await proposeFor(id);
      console.log(`[${++done}/${cases.length}] ${line}`);
    } catch (e) {
      failures.push(id);
      console.error(`[${++done}/${cases.length}] ${id} FAILED: ${e.message.slice(0, 200)}`);
    }
  }
}));

console.log(`\nDone. ${cases.length - failures.length} drafted, ${failures.length} failed${failures.length ? ": " + failures.join(", ") : ""}.`);
console.log("Every target lands with reviewed: false. Review before it grades anything.");
