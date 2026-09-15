/** The symbol sheets: each type's symbols drawn in its exemplar's style, shown beside the
 *  engine's own catalog drawing of the same symbol. Collects every
 *  visual-eval/symbols/<type>/manifest.json into the manifest the eval page reads.
 *
 *   node_modules/.bin/vite-node scripts/visual-eval/symbols.mts
 *
 * A symbol set names the exemplar whose style it copies. Each symbol is its own SVG,
 * drawn at the scale it has in that exemplar, so a type's symbols can be laid side by
 * side at their true relative size.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { renderResult } from "../../src/index";
import type { DiagramType } from "../../src/core/types";
import { getSymbolCatalog } from "../../src/symbols-catalog";
import { repoRoot } from "./lib.mts";

type Declared = {
  id: string; label: string; file: string; engine: string | null; source?: string; previewGroup?: string;
  dsl?: string[]; standard: string; sourceUrl?: string | null; inExemplar: boolean; notes: string;
  /** 1 must, 2 should, 3 later — from real usage and the standard's core vocabulary. */
  tier?: 1 | 2 | 3;
  /** Distinct ChatDiagram users whose diagrams of this type use the symbol (90 days). */
  usageUsers?: number | null;
};
type DeclaredSet = { type: string; variant: string | null; exemplar: string; style: string; symbols: Declared[] };

/** Crop a live diagram to its symbol layer, preserving its real CSS and surroundings. */
function sourcePreview(source: string, type: string, groupClass?: string): string {
  const result = renderResult(source, { type: type as DiagramType });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  if (!groupClass) return result.svg;
  const start = result.svg.indexOf(`<g class="${groupClass}">`);
  if (start < 0) throw new Error(`Missing symbol layer ${groupClass}`);
  const tags = /<g\b[^>]*>|<\/g>/g;
  tags.lastIndex = start;
  let depth = 0, end = start;
  for (let match = tags.exec(result.svg); match; match = tags.exec(result.svg)) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (!depth) { end = tags.lastIndex; break; }
  }
  const css = result.svg.match(/<style>[\s\S]*?<\/style>/)?.[0] ?? "";
  const ancestors: string[] = [];
  for (const match of result.svg.slice(0, start).matchAll(/<g\b[^>]*>|<\/g>/g)) {
    if (match[0].startsWith("</")) ancestors.pop(); else ancestors.push(match[0]);
  }
  const isolated = `<svg xmlns="http://www.w3.org/2000/svg" width="10000" height="10000">${css}${ancestors.join("")}${result.svg.slice(start, end)}${"</g>".repeat(ancestors.length)}</svg>`;
  const renderer = new Resvg(isolated, { font: { loadSystemFonts: false, fontFiles: [new URL("website/app/(home)/examples/[slug]/_assets/noto-sans-regular.ttf", repoRoot).pathname], defaultFontFamily: "Noto Sans" } });
  const box = renderer.getBBox();
  if (!box) throw new Error("Symbol layer has no visible geometry");
  const pad = 12, x = box.x - pad, y = box.y - pad, width = box.width + 2 * pad, height = box.height + 2 * pad;
  return result.svg.replace(/<svg\b[^>]*>/, (root) => root.replace(/width="[^"]*"/, `width="${width}"`).replace(/height="[^"]*"/, `height="${height}"`).replace(/viewBox="[^"]*"/, `viewBox="${x} ${y} ${width} ${height}"`));
}

/** Review order: the types with the most symbols and the highest willingness to pay first. */
const ORDER = ["floorplan", "sld", "circuit", "pid", "genogram", "network", "ladder", "pedigree", "bpmn", "logic", "evacuation", "breadboard"];
const rank = (name: string) => (ORDER.includes(name) ? ORDER.indexOf(name) : ORDER.length);

const root = new URL("visual-eval/symbols/", repoRoot);
const sizeOf = (svg: string) => {
  const m = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(svg);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
};

const dirents = existsSync(root) ? await readdir(root, { withFileTypes: true }) : [];
const sets = [];
for (const dirent of dirents.filter((d) => d.isDirectory()).sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))) {
  const dir = new URL(`${dirent.name}/`, root);
  if (!existsSync(new URL("manifest.json", dir))) continue;
  const declared = JSON.parse(await readFile(new URL("manifest.json", dir), "utf8")) as DeclaredSet;
  const problems: string[] = [];
  const catalog = getSymbolCatalog(declared.type);
  const symbols = [];
  for (const s of declared.symbols) {
    if (!existsSync(new URL(s.file, dir))) { problems.push(`${s.id}: ${s.file} is missing`); continue; }
    const size = sizeOf(await readFile(new URL(s.file, dir), "utf8"));
    if (!size) problems.push(`${s.id}: ${s.file} has no viewBox, so it cannot be shown at its true size`);
    // The page joins dsl as a list; a bare string there would blank the whole Symbols page.
    if (s.dsl !== undefined && !Array.isArray(s.dsl)) problems.push(`${s.id}: dsl must be a list of DSL names, not ${JSON.stringify(s.dsl)}`);
    const entry = s.engine ? catalog?.entries.find((e) => e.id === s.engine) : undefined;
    if (s.engine && !entry) problems.push(`${s.id}: "${s.engine}" is not an id in the engine's ${declared.type} catalog`);
    let engineSvg = entry?.svg ?? null;
    if (s.source) {
      try { engineSvg = sourcePreview(s.source, declared.type, s.previewGroup); }
      catch (error) { problems.push(`${s.id}: ${String(error)}`); }
    }
    symbols.push({
      id: s.id, label: s.label, url: `/visual-eval/symbols/${dirent.name}/${s.file}`,
      width: size?.width ?? 80, height: size?.height ?? 80,
      engine: s.engine, engineSvg, engineUrl: null,
      dsl: Array.isArray(s.dsl) ? s.dsl : s.dsl ? [String(s.dsl)] : [], standard: s.standard, sourceUrl: s.sourceUrl ?? null, inExemplar: s.inExemplar, notes: s.notes,
      tier: s.tier ?? null, usageUsers: s.usageUsers ?? null,
    });
  }
  if (!existsSync(new URL(`visual-eval/exemplars/${declared.exemplar}/ideal.svg`, repoRoot)))
    problems.push(`the exemplar "${declared.exemplar}" it copies does not exist`);
  const inventory = existsSync(new URL("inventory.md", dir)) ? await readFile(new URL("inventory.md", dir), "utf8") : null;
  sets.push({ type: declared.type, variant: declared.variant, exemplar: declared.exemplar, style: declared.style, symbols, problems, inventory });
  console.log(`${dirent.name}: ${symbols.length} symbols${problems.length ? `, ${problems.length} problems:\n  ${problems.join("\n  ")}` : ""}`);
}

await writeFile(new URL("preview/visual-eval/symbols.json", repoRoot), JSON.stringify({ generatedAt: new Date().toISOString(), sets }, null, 2) + "\n");
console.log(`Wrote preview/visual-eval/symbols.json — ${sets.length} sets`);
