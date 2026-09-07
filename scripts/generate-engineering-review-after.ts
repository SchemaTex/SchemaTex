/** Candidate renders only. Never overwrites the immutable 1.0.14 baseline. */
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { renderResult } from "../src/index";
import { Resvg } from "@resvg/resvg-js";
import { parseBreadboard } from "../src/diagrams/breadboard/parser";
import { layoutBreadboard, breadboardCoordXY } from "../src/diagrams/breadboard/layout";
const root = new URL("../preview/engineering-review/", import.meta.url);
const after = new URL("after/", root);
await mkdir(after, { recursive: true });
const cases = JSON.parse(await readFile(new URL("results.json", root), "utf8"));
cases.push({id:"opamp-corrected",type:"circuit"});
const version = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version;
const base = execFileSync("git", ["log", "-1", "--format=%h", "--", "src"], { encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain", "--", "src"], { encoding: "utf8" }).trim();
const results = [];
for (const c of cases) {
  const source = await readFile(new URL(`${c.id}.sx`, root), "utf8");
  const start = performance.now();
  const result = renderResult(source, { type: c.type });
  const elapsedMs = Math.round(performance.now() - start);
  await writeFile(new URL(`${c.id}.svg`, after), result.svg);
  await writeFile(new URL(`${c.id}.png`, after), new Resvg(result.svg, { background: "white", fitTo: { mode: "width", value: 1400 }, font: { loadSystemFonts: false, fontFiles: [new URL("../website/app/(home)/examples/[slug]/_assets/noto-sans-regular.ttf", import.meta.url).pathname], defaultFontFamily: "Noto Sans" } }).render().asPng());
  results.push({ id: c.id, type: c.type, version, commit: `${base}${dirty ? " + uncommitted engine changes" : ""}`, sourceHash: createHash("sha256").update(source).digest("hex"), status: result.status, diagnostics: result.diagnostics, changed: c.id === "opamp-corrected" || result.svg !== await readFile(new URL(`${c.id}.svg`, root), "utf8"), elapsedMs });
}
const layout = layoutBreadboard(parseBreadboard(await readFile(new URL("breadboard.sx", root), "utf8")));
const mapping = Object.entries(layout.parts[0]!.pins).filter(([pin]) => /^\d+$/.test(pin)).map(([pin, point]) => {
  let hole: string | undefined;
  for (const row of ["e", "f"] as const) for (let col = 1; col <= layout.substrate.cols; col++) {
    const p = breadboardCoordXY(layout.substrate, { kind: "hole", col, row });
    if (p.x === point.x && p.y === point.y) hole = `${col}${row}`;
  }
  if (!hole) throw Error(`Pin ${pin} does not land on a real hole`);
  return { pin, hole };
});
for (const [name, value] of [["breadboard-mapping.json", mapping], ["results.json", results]] as const) {
  const temporary = new URL(`${name}.tmp`, after);
  await writeFile(temporary, JSON.stringify(value, null, 2));
  await rename(temporary, new URL(name, after));
}
console.log(results.map(({ id, status, changed, elapsedMs }) => ({ id, status, changed, elapsedMs })));
