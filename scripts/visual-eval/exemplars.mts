/** The exemplar set: one hand-drawn drawing per diagram variant — the look the
 *  engine is aiming at, and the look every case target in that variant copies.
 *  Renders each exemplar's source through the working tree so the eval page can
 *  put "what we want" beside "what we draw", and writes the manifest the page reads.
 *
 *   node_modules/.bin/vite-node scripts/visual-eval/exemplars.mts [--type comparison]
 *
 * A type with one way to draw it keeps its exemplar in exemplars/<type>/. A type
 * that declares variants in visual-eval/variants.json keeps one per variant, in
 * exemplars/<type>/<variant>/.
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { renderResult } from "../../src/index";
import { rasterize, repoRoot, engineStamp, loadVariants } from "./lib.mts";

const exemplarDir = new URL("visual-eval/exemplars/", repoRoot);
const outDir = new URL("preview/visual-eval/exemplars/", repoRoot);
const argv = process.argv.slice(2);
const only = argv.includes("--type") ? argv[argv.indexOf("--type") + 1] : undefined;

type Entry = {
  type: string; variant?: string; title: string; notes: string; status: string;
  diagnostics: { severity: string; message: string; line?: number }[];
};
const entries: Entry[] = [];
const stamp = engineStamp();
const variants = await loadVariants();

for (const dirent of (await readdir(exemplarDir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
  const type = dirent.name;
  if (!dirent.isDirectory() || (only && type !== only)) continue;
  const declared = variants[type];
  // A drawing left at the type root of a type with variants would silently
  // stand for none of them.
  if (declared && existsSync(new URL(`${type}/ideal.svg`, exemplarDir)))
    throw new Error(`exemplars/${type}/ideal.svg: ${type} has variants, so its exemplars live in exemplars/${type}/<variant>/`);
  for (const variant of declared ? declared.map((v) => v.id) : [undefined]) {
    const rel = variant ? `${type}/${variant}/` : `${type}/`;
    const dir = new URL(rel, exemplarDir);
    if (!existsSync(new URL("ideal.svg", dir)) || !existsSync(new URL("source.sx", dir))) continue;
    const source = await readFile(new URL("source.sx", dir), "utf8");
    const ideal = await readFile(new URL("ideal.svg", dir), "utf8");
    const notes = existsSync(new URL("notes.md", dir)) ? await readFile(new URL("notes.md", dir), "utf8") : "";
    const result = renderResult(source, { type: type as never });
    const out = new URL(rel, outDir);
    await mkdir(out, { recursive: true });
    await writeFile(new URL("current.svg", out), result.svg);
    await rasterize(ideal, new URL("ideal.png", out));
    await rasterize(result.svg, new URL("current.png", out));
    const title = /<title>([^<]*)<\/title>/.exec(ideal)?.[1] ?? type;
    entries.push({
      type, variant, title, notes, status: result.status,
      diagnostics: result.diagnostics.map((d) => ({ severity: d.severity, message: d.message, line: d.line })),
    });
    console.log(`${rel}: ${result.status}${result.diagnostics.length ? ` (${result.diagnostics.length} diagnostics)` : ""}`);
  }
}

// A partial run (--type) must not drop the other types from the manifest; a
// full run is the authority, so a removed exemplar disappears with it.
const key = (e: Entry) => `${e.type}/${e.variant ?? ""}`;
const manifestUrl = new URL("preview/visual-eval/exemplars.json", repoRoot);
const previous: Entry[] = only && existsSync(manifestUrl) ? JSON.parse(await readFile(manifestUrl, "utf8")).entries ?? [] : [];
const merged = [...previous.filter((p) => !entries.some((e) => key(e) === key(p))), ...entries]
  .sort((a, b) => key(a).localeCompare(key(b)));
await writeFile(manifestUrl, JSON.stringify({ generatedAt: new Date().toISOString(), engine: stamp, entries: merged }, null, 2) + "\n");
