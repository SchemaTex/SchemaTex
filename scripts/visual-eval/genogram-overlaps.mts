import { readFile, readdir, writeFile } from 'node:fs/promises';
import { estimateTextWidth } from '../../src/core/text-metrics';
import { labelOverlap, type LabelBox } from '../../src/core/label-placement';

type Box = LabelBox & { id: string };
const decode = (text: string) => text.replace(/&#x([\da-f]+);|&#(\d+);|&(amp|lt|gt|quot|apos);/gi,
  (_, hex, decimal, named) => hex ? String.fromCodePoint(parseInt(hex, 16)) : decimal ? String.fromCodePoint(Number(decimal)) :
    ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[named] ?? named));

/** Count collisions in the emitted chart, including all ancestor translations.
 * Text boxes use the engine's estimator with two pixels of reading clearance.
 * Age numerals, titles and legends are excluded; person and relationship captions
 * participate. Each symbol pair is counted once, including index outlines. */
export function genogramOverlaps(svg: string) {
  const symbols = new Map<string, Box>();
  const labels: Box[] = [];
  const fontSize = Number(svg.match(/\.schematex-genogram-label\s*\{[^}]*font-size:\s*([\d.]+)px/)?.[1] ?? 12);
  const frames: Array<{ x: number; y: number; node?: string }> = [{ x: 0, y: 0 }];
  let caption: { attrs: Record<string, string>; frame: typeof frames[number]; text: string } | undefined;
  for (const token of svg.match(/<[^>]+>|[^<]+/g) ?? []) {
    if (!token.startsWith('<')) { if (caption) caption.text += token; continue; }
    if (token.startsWith('</')) {
      if (token === '</text>' && caption) {
        const { attrs, frame } = caption;
        const size = Number(attrs['font-size'] ?? (attrs.class.endsWith('-label') ? fontSize : Math.max(9, fontSize - 1)));
        const width = estimateTextWidth(decode(caption.text), size);
        const x = Number(attrs.x) + frame.x, y = Number(attrs.y) + frame.y;
        labels.push({ id: decode(caption.text), x: x - width / 2 - 2, y: y - size - 2, width: width + 4, height: size * 1.25 + 4 });
        caption = undefined;
      }
      frames.pop(); continue;
    }
    if (token.startsWith('<?') || token.startsWith('<!')) continue;
    const tag = token.match(/^<(\w+)/)![1];
    const attrs = Object.fromEntries([...token.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const parent = frames.at(-1)!;
    const translation = attrs.transform?.match(/translate\(([^)]+)\)/)?.[1].split(/[,\s]+/).map(Number) ?? [0, 0];
    const frame = { x: parent.x + translation[0], y: parent.y + (translation[1] ?? 0), node: attrs['data-individual-id'] ?? parent.node };
    if (frame.node && /\bschematex-genogram-(shape|index-border)\b/.test(attrs.class ?? '')) {
      let box: LabelBox;
      if (tag === 'circle') {
        const r = Number(attrs.r); box = { x: Number(attrs.cx) - r, y: Number(attrs.cy) - r, width: 2 * r, height: 2 * r };
      } else if (tag === 'polygon') {
        const values = (attrs.points.match(/-?[\d.]+/g) ?? []).map(Number);
        const xs = values.filter((_, i) => i % 2 === 0), ys = values.filter((_, i) => i % 2 === 1);
        box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
      } else {
        box = { x: Number(attrs.x), y: Number(attrs.y), width: Number(attrs.width), height: Number(attrs.height) };
      }
      box.x += frame.x; box.y += frame.y;
      const previous = symbols.get(frame.node);
      if (!previous || box.width * box.height > previous.width * previous.height) symbols.set(frame.node, { ...box, id: frame.node });
    }
    if (tag === 'text' && /^schematex-genogram-(label|vitals|note|annotation|edge-label)$/.test(attrs.class ?? '')) caption = { attrs, frame, text: '' };
    if (!token.endsWith('/>')) frames.push(frame);
  }
  const people = [...symbols.values()];
  const pairs = (a: Box[], b: Box[], same: boolean) => a.flatMap((left, i) => b.slice(same ? i + 1 : 0)
    .filter(right => labelOverlap(left, right) > 0.001).map(right => [left.id, right.id]));
  const details = { symbolSymbol: pairs(people, people, true), labelLabel: pairs(labels, labels, true), labelSymbol: pairs(labels, people, false) };
  return { counts: { symbolSymbol: details.symbolSymbol.length, labelLabel: details.labelLabel.length, labelSymbol: details.labelSymbol.length }, details };
}

// Run: npx vite-node scripts/visual-eval/genogram-overlaps.mts -- --check
if (process.argv.includes('--check')) {
  const cases = [];
  for (const id of (await readdir('visual-eval/cases')).sort()) {
    const goal = JSON.parse(await readFile(`visual-eval/cases/${id}/goal.json`, 'utf8'));
    if (goal.type !== 'genogram') continue;
    const before = genogramOverlaps(await readFile(`visual-eval/cases/${id}/snapshots/v1.1.0/render.svg`, 'utf8'));
    const after = genogramOverlaps(await readFile(`preview/visual-eval/${id}/next.svg`, 'utf8'));
    cases.push({ id, before, after });
    console.log(id, JSON.stringify(before.counts), '→', JSON.stringify(after.counts));
  }
  await writeFile('preview/visual-eval/genogram-overlaps.json', JSON.stringify(cases, null, 2) + '\n');
  if (cases.some(c => Object.keys(c.before.counts).some(key => c.after.counts[key] > c.before.counts[key]))) process.exitCode = 1;
}
