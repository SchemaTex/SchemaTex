/** Shared plumbing for the symbol-set scripts: crop each symbol to its ink and write the set.
 *
 * A set script declares its constants and a SYMBOLS array — each entry { id, title, draw, and
 * the manifest fields } with draw() returning SVG fragments centred on the origin — then calls
 * writeSet(). Every file is cropped to its inked extent plus PAD units, so a type's symbols can
 * be laid side by side at their true relative size.
 */
import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const PAD = 8;

export const n2 = (v) => Math.round(v * 100) / 100;
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Inked extent of a fragment (strokes included), rounded outward to whole units. */
function extent(fragment) {
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-300 -300 600 600" width="600" height="600">${fragment}</svg>`;
  const b = new Resvg(probe).innerBBox();
  if (!b) throw new Error("empty symbol");
  let x0 = b.x, y0 = b.y, x1 = b.x + b.width, y1 = b.y + b.height;
  // Text is not measured reliably without the exemplar's fonts, so each label adds an estimated
  // box: 0.62 em per character, placed by its text-anchor.
  for (const m of fragment.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
    const attr = (name) => new RegExp(`\\b${name}="([^"]*)"`).exec(m[1])?.[1];
    const size = Number(attr("font-size") ?? 12), w = m[2].length * size * 0.62;
    const tx = Number(attr("x") ?? 0), ty = Number(attr("y") ?? 0), anchor = attr("text-anchor") ?? "start";
    const left = anchor === "end" ? tx - w : anchor === "middle" ? tx - w / 2 : tx;
    x0 = Math.min(x0, left); x1 = Math.max(x1, left + w);
    y0 = Math.min(y0, ty - size * 0.8); y1 = Math.max(y1, ty + size * 0.25);
  }
  return { x0: Math.floor(x0), y0: Math.floor(y0), x1: Math.ceil(x1), y1: Math.ceil(y1) };
}

export function symbolSvg(s) {
  const fragment = s.draw().join("\n");
  const e = extent(fragment);
  const vx = e.x0 - PAD, vy = e.y0 - PAD, vw = e.x1 - e.x0 + 2 * PAD, vh = e.y1 - e.y0 + 2 * PAD;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw}" height="${vh}" role="img">\n<title>${esc(s.title)}</title>\n${fragment}\n</svg>\n`;
}

/** Write every symbol's SVG into visual-eval/symbols/<type>/ and rebuild manifest.json from the
 *  list, so a symbol removed from the script also leaves the manifest and its SVG file. */
export async function writeSet({ type, variant = null, exemplar, style }, symbols) {
  const dir = new URL(`../../../visual-eval/symbols/${type}/`, import.meta.url);
  await mkdir(dir, { recursive: true });
  const entries = [];
  for (const s of symbols) {
    const svg = symbolSvg(s);
    await writeFile(new URL(`${s.id}.svg`, dir), svg);
    console.log(`${s.id}: viewBox ${svg.match(/viewBox="([^"]+)"/)[1]}`);
    const { draw, title, ...metadata } = s;
    entries.push({ id: s.id, label: title, file: `${s.id}.svg`, ...metadata });
  }
  const keep = new Set(entries.map((e) => e.file));
  for (const name of await readdir(dir)) {
    if (name.endsWith(".svg") && !keep.has(name)) {
      await unlink(new URL(name, dir));
      console.log(`${name}: removed, no longer in the set`);
    }
  }
  await writeFile(new URL("manifest.json", dir), JSON.stringify({ type, variant, exemplar, style, symbols: entries }, null, 2) + "\n");
}
