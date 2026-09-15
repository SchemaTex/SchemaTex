/** Draft a target drawing for one case with Codex, following the variant's
 * exemplar.
 *
 *   node scripts/visual-eval/propose-target.mjs --case circuit-555-astable
 *   node scripts/visual-eval/propose-target.mjs --type phylo --variant slanted
 *
 * Codex writes an SVG target from the DSL source, the rubric, and the exemplar
 * for that type and variant — the drawing is *shown* the exemplar and *told* its
 * palette, type scale and idiom from the exemplar's own notes. That is what
 * makes a family's targets read as one drawing repeated rather than as a dozen
 * unrelated sketches, so a case whose variant has no exemplar yet is skipped
 * unless `--no-exemplar` says to draft it anyway.
 *
 * It deliberately never sees the engine's current output: a target drawn from
 * the engine's render inherits the engine's mistakes.
 *
 * `--imagegen` adds the older two-candidate route — Codex's image generator
 * draws the same subject as a picture, Codex looks at both and says which is the
 * better target, and when the picture wins a further pass redraws the SVG to
 * follow its composition and keeps the picture beside it as `look.png`. It is
 * off by default: across the 78 cases drafted that way the SVG won 71 times.
 *
 * The installed target is always the SVG, because a target has to be exact and
 * diffable — a generated raster cannot be. Either way the result lands with
 * `reviewed: false`: a person still has to look at it before it grades anything.
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
const useImagegen = argv.includes("--imagegen");

/** The exemplar for a case's variant: the drawing every target in it copies. */
const exemplarCache = new Map();
async function exemplarFor(type, variant) {
  const key = `${type}/${variant ?? ""}`;
  if (exemplarCache.has(key)) return exemplarCache.get(key);
  let found = null;
  for (const rel of [variant ? `${type}/${variant}/` : null, `${type}/`].filter(Boolean)) {
    const dir = new URL(`visual-eval/exemplars/${rel}`, root);
    const svg = new URL("ideal.svg", dir);
    if (!(await access(svg).then(() => true, () => false))) continue;
    const png = join(await mkdtemp(join(tmpdir(), "visual-eval-exemplar-")), "exemplar.png");
    await writeFile(png, new Resvg(await readFile(svg, "utf8"),
      { background: "white", fitTo: { mode: "width", value: 1600 } }).render().asPng());
    const notes = await readFile(new URL("notes.md", dir), "utf8").catch(() => "");
    found = { rel, png, notes };
    break;
  }
  exemplarCache.set(key, found);
  return found;
}

async function codex(prompt, { images = [], sandbox = "read-only", cwd } = {}) {
  const dir = cwd ?? (await mkdtemp(join(tmpdir(), "visual-eval-")));
  const { reply } = await codexRun(prompt, { dir, images, sandbox, model, effort });
  return { dir, reply };
}

/** A target that will not rasterise is not a target. */
async function checkSvg(path) {
  const svg = await readFile(path, "utf8");
  // resvg — what the eval pipeline rasterises with — does not resolve CSS custom
  // properties, so `fill: var(--paper)` silently becomes black and
  // `stroke: var(--ink)` becomes none: filled blobs and vanished line work.
  if (/var\(\s*--/.test(svg)) {
    throw new Error("target uses CSS custom properties (var(--…)); the rasteriser cannot resolve them — write colours literally");
  }
  new Resvg(svg, { background: "white", fitTo: { mode: "width", value: 1400 } }).render();
  return svg;
}

/**
 * The three ways a draft has actually come back wrong, each cheap to spot and
 * expensive to miss: no `<title>`; the subject of some *other* case drawn under
 * this one's name; and a malformed path — usually an `A` arc given an absolute
 * endpoint meant to be relative — sweeping a stray line across the whole sheet.
 * Reported, never fatal: the drawing still lands for a person to judge.
 */
function suspicions(svg, source) {
  const notes = [];
  if (!/<title[\s>]/.test(svg)) notes.push("no <title>");

  // A draughtsman sets `<=` as `≤`; compare on a form where that is not a miss.
  const norm = (s) => s.replace(/&amp;/g, "&").replace(/<=/g, "≤").replace(/>=/g, "≥")
    .replace(/->/g, "→").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();
  const text = norm([...svg.matchAll(/>([^<>]+)</g)].map((m) => m[1]).join(" "));
  // Only labels that identify *this* subject count. Sign text is conventionally
  // set in capitals — EXIT, ASSEMBLY POINT, YOU ARE HERE — and appears on every
  // plan of its kind, so counting it let a hospital ward pass as a school wing.
  const labels = [...source.matchAll(/"([^"]{3,60})"/g), ...source.matchAll(/[“]([^”]{3,60})[”]/g)]
    .map((m) => m[1].trim())
    .filter((l) => /[A-Za-z一-鿿]/.test(l) && !/^\d[\d.\s*]*$/.test(l))
    .filter((l) => !(/[A-Z]/.test(l) && l === l.toUpperCase()));
  if (labels.length >= 4) {
    const hit = labels.filter((l) => text.includes(norm(l))).length;
    if (hit / labels.length < 0.5) {
      notes.push(`names only ${hit}/${labels.length} of the source's labels — check it drew this subject`);
    }
  }

  // An `A` whose radii cannot reach its endpoint. SVG scales such radii up
  // rather than failing, so one absolute endpoint written where a relative one
  // was meant sweeps a line across the whole sheet and still renders happily.
  // Long connectors are innocent here; only the radii-vs-chord mismatch is not.
  for (const m of svg.matchAll(/\sd="([^"]+)"/g)) {
    let at = [0, 0];
    for (const seg of m[1].matchAll(/([MmLlHhVvAaCcSsQqTtZz])([^A-DF-Za-df-z]*)/g)) {
      const cmd = seg[1];
      const n = seg[2].match(/-?\d*\.?\d+(?:e-?\d+)?/gi)?.map(Number) ?? [];
      if (cmd === "A" || cmd === "a") {
        for (let i = 0; i + 6 < n.length + 1; i += 7) {
          const [rx, ry, , , , ex, ey] = n.slice(i, i + 7);
          if (rx === undefined || ey === undefined) break;
          const to = cmd === "A" ? [ex, ey] : [at[0] + ex, at[1] + ey];
          const chord = Math.hypot(to[0] - at[0], to[1] - at[1]);
          if (chord > 2 * Math.max(Math.abs(rx), Math.abs(ry)) * 1.25) {
            notes.push(`an arc spans ${Math.round(chord)} with radii ${rx}x${ry} — an absolute endpoint where a relative one was meant`);
          }
          at = to;
        }
      } else if (cmd === "M" || cmd === "L") { if (n.length >= 2) at = [n[n.length - 2], n[n.length - 1]]; }
      else if (cmd === "m" || cmd === "l") { if (n.length >= 2) at = [at[0] + n[n.length - 2], at[1] + n[n.length - 1]]; }
      else if (cmd === "H") { if (n.length) at = [n[n.length - 1], at[1]]; }
      else if (cmd === "h") { if (n.length) at = [at[0] + n[n.length - 1], at[1]]; }
      else if (cmd === "V") { if (n.length) at = [at[0], n[n.length - 1]]; }
      else if (cmd === "v") { if (n.length) at = [at[0], at[1] + n[n.length - 1]]; }
      else if (cmd === "C" || cmd === "Q" || cmd === "S" || cmd === "T") { if (n.length >= 2) at = [n[n.length - 2], n[n.length - 1]]; }
      else if (cmd === "c" || cmd === "q" || cmd === "s" || cmd === "t") { if (n.length >= 2) at = [at[0] + n[n.length - 2], at[1] + n[n.length - 1]]; }
      if (notes.length > 3) break;
    }
    if (notes.length > 3) break;
  }
  return [...new Set(notes)];
}

async function proposeFor(caseId) {
  const caseDir = new URL(`visual-eval/cases/${caseId}/`, root);
  const goal = JSON.parse(await readFile(new URL("goal.json", caseDir), "utf8"));
  const source = await readFile(new URL("source.sx", caseDir), "utf8");
  const rubricText = goal.rubric.map((r, i) => `${i + 1}. [${r.severity}] ${r.must}`).join("\n");
  const exemplar = await exemplarFor(goal.type, goal.variant);

  const houseStyle = exemplar
    ? `\nThe attached image is the **exemplar** for this diagram variant: the agreed look every target in the family copies. Copy its palette, its type scale, its stroke weights, its symbol shapes, its legend style and its spacing idiom exactly. Whatever the exemplar sets around the drawing — a legend, a north point, a scale bar, an instruction panel, a title block, a footnote — the target carries the same things in the same places, filled in for this subject. Do not copy its subject — the subject is the DSL above. Its vocabulary is part of that subject, not of its style: its categories, classes, severity bands, legend entries and colour keys belong to the thing it happens to draw. Draw only the categories this source declares, and if it declares none the drawing has none — inventing a classification the author did not supply is a defect even when the exemplar has one. If the exemplar and your own instinct disagree about how something is drawn, the exemplar wins.

The exemplar's own design notes, which state those choices in words:
${exemplar.notes.slice(0, 6000)}
`
    : "";

  const drawBrief = (extra = "") => `You are drawing the *target* for an automated drawing engine: what its output should look like when it is right.

Subject, written in the engine's own DSL:
${source}

The drawing must satisfy every rule below. These are the rules it will be graded on:
${rubricText}

Goal in one line: ${goal.goal}
${houseStyle}${extra}
Write a single self-contained SVG file to ./target.svg in this directory. Plain SVG, no external references, no scripts, white background, a viewBox, and a <title>. Write every colour as a literal value: CSS custom properties such as "var(--ink)" are not resolved by the rasteriser and turn fills black and strokes invisible. Draw it as a draughtsman would: conventional symbols, orthogonal connections, text large enough to read, nothing overlapping. Invent no components that the DSL above does not contain, and leave none of them out. Every connection the DSL declares is drawn end to end, reaching the thing it names: nothing the source connects may be left floating with no line arriving at it.
Reply with the single line DONE when the file is written.`;

  const svgPass = await codex(drawBrief(), {
    sandbox: "workspace-write",
    images: exemplar ? [exemplar.png] : [],
  });
  const svgPath = join(svgPass.dir, "target.svg");
  await checkSvg(svgPath);
  const svgPreview = join(svgPass.dir, "svg.png");
  await writeFile(svgPreview, new Resvg(await readFile(svgPath, "utf8"),
    { background: "white", fitTo: { mode: "width", value: 1400 } }).render().asPng());

  if (!useImagegen) {
    const flags = suspicions(await readFile(svgPath, "utf8"), source);
    await copyFile(svgPath, new URL("ideal.svg", caseDir).pathname);
    goal.ideal = {
      file: "ideal.svg",
      source: "model-svg",
      reviewed: false,
      notes: exemplar
        ? `Drafted by Codex from the source, the rubric and the ${exemplar.rel.replace(/\/$/, "")} exemplar, without seeing the engine's own output.`
        : "Drafted by Codex from the source and the rubric alone — this variant has no exemplar, so the drawing follows no agreed house style.",
    };
    await writeFile(new URL("goal.json", caseDir), JSON.stringify(goal, null, 2) + "\n");
    await rm(svgPass.dir, { recursive: true, force: true });
    return `${caseId}: model-svg${exemplar ? ` (after ${exemplar.rel.replace(/\/$/, "")})` : " (no exemplar)"}` +
      (flags.length ? `\n    ⚠ ${flags.join("; ")}` : "");
  }

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
      drawBrief("\nThe last attached image is a picture of what this drawing should look like. Follow its composition, spacing and proportions, but keep every component from the DSL above and none that it lacks.\n"),
      { images: exemplar ? [exemplar.png, lookPath] : [lookPath], sandbox: "workspace-write" },
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
  const onlyVariant = value("variant");
  const picked = [];
  const skipped = [];
  for (const id of ids) {
    const goal = JSON.parse(await readFile(new URL(`${id}/goal.json`, dir), "utf8"));
    if (onlyType && goal.type !== onlyType) continue;
    if (onlyVariant && goal.variant !== onlyVariant) continue;
    if (goal.ideal?.source === "hand-authored") continue;
    if (goal.ideal && !argv.includes("--redraw")) continue;
    // A target's job is to repeat its exemplar on a new subject. With no
    // exemplar there is nothing to repeat, and the draft would set the house
    // style by accident rather than follow it.
    if (!argv.includes("--no-exemplar") && !(await exemplarFor(goal.type, goal.variant))) {
      skipped.push(`${id} (${goal.type}${goal.variant ? `/${goal.variant}` : ""})`);
      continue;
    }
    picked.push(id);
  }
  if (skipped.length) {
    console.log(`Skipping ${skipped.length} cases whose variant has no exemplar yet — draw the exemplar first, or pass --no-exemplar:`);
    for (const s of skipped) console.log(`  ${s}`);
    console.log("");
  }
  return picked;
}

const cases = await pickCases();
if (argv.includes("--list")) {
  for (const id of cases) console.log(id);
  console.log(`\n${cases.length} cases would be drafted.`);
  process.exit(0);
}
const limit = Number(value("concurrency") ?? 4);
console.log(`Drafting targets for ${cases.length} cases, ${limit} at a time${useImagegen ? ", with the imagegen candidate" : ""}.`);

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
