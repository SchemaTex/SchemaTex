import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { renderResult } from '../dist/index.js';
import { getExamples } from '../dist/ai/index.js';
import { Resvg } from '@resvg/resvg-js';

const base = new URL('../preview/engineering-review/', import.meta.url);
const baselineExists = await access(new URL('results.json', base)).then(() => true, () => false);
if (baselineExists) throw Error('Baseline is frozen. Use generate-engineering-review-after.ts for candidate renders.');
await mkdir(base, { recursive: true });
const fixtures = [
  ['logic', 'logic', 'logic-full-adder'],
  ['pullup', 'circuit', 'circuit-pullup-orientation-hint'],
  ['transistor', 'circuit', 'circuit-ce-amplifier'],
  ['opamp-example', 'circuit', 'circuit-opamp-inverting-amplifier'],
  ['sld', 'sld', 'sld-residential-iec-60364-consumer-unit'],
  ['arduino', 'breadboard', 'breadboard-blink-led'],
  ['user-opamp', 'circuit'], ['user-555', 'circuit'], ['user-hc32', 'breadboard'],
  ['pid', 'pid'], ['breadboard', 'breadboard'], ['floorplan', 'floorplan'], ['linked-sld', 'sld'],
];
const version = JSON.parse(await readFile(new URL('../package.json', import.meta.url))).version;
const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const results = [];
for (const [id, type, slug] of fixtures) {
  let source;
  if (slug) {
    source = getExamples(type, { limit: 100 }).examples.find(e => e.slug === slug)?.dsl;
    if (!source) throw Error(`Missing published example ${slug}`);
    await writeFile(new URL(`${id}.sx`, base), source);
  } else if (id === 'pid') {
    source = await readFile(new URL('../preview/professional-visual-contract/pid-water-treatment-symbols.sx', import.meta.url), 'utf8');
    await writeFile(new URL(`${id}.sx`, base), source);
  } else source = await readFile(new URL(`${id}.sx`, base), 'utf8');
  const result = renderResult(source, { type });
  await writeFile(new URL(`${id}.svg`, base), result.svg);
  await writeFile(new URL(`${id}.png`, base), new Resvg(result.svg, { background: 'white', fitTo: { mode: 'width', value: 1600 } }).render().asPng());
  results.push({ id, type, slug, version, commit, status: result.status, diagnostics: result.diagnostics, viewBox: result.svg.match(/viewBox="([^"]+)"/)?.[1] });
}
await writeFile(new URL('results.json', base), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.map(({ id, status, diagnostics, viewBox }) => ({ id, status, diagnostics, viewBox })), null, 2));
