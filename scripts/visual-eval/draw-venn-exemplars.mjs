/**
 * Hand-authored Venn and Euler exemplars. Run from any directory:
 *   node scripts/visual-eval/draw-venn-exemplars.mjs [png-dir]
 * Writes visual-eval/exemplars/venn/{venn,euler}/ideal.svg. Region labels are placed at the
 * point of each region farthest from every outline; set labels are placed in the clear
 * nearest a preferred anchor. Text is measured with resvg and every label is verified to
 * sit wholly inside its region (or wholly outside all sets) with a margin.
 */
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const INK = '#1F2933', MUTED = '#52606D', PAPER = '#FFFFFF';
const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const PNG_DIR = process.argv[2];

const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cache = new Map();
function measure(s, fs, weight, style = 'normal') {
  const key = `${s}|${fs}|${weight}|${style}`;
  if (!cache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="200"><text x="100" y="100" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" font-style="${style}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b) throw new Error(`Cannot measure ${s}`);
    cache.set(key, { x0: b.x - 100, y0: b.y - 100, x1: b.x + b.width - 100, y1: b.y + b.height - 100 });
  }
  return cache.get(key);
}

// A set is an ellipse; signed distance is negative inside (exact for circles).
const sd = (s, [x, y]) => (Math.sqrt(((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2) - 1) * Math.min(s.rx, s.ry);

function makeDrawing(width, height) {
  const g = [], placed = [];
  const block = (lines, cx, cy) => {
    // lines: [{ s, fs, weight, fill, style }], centred on (cx, cy)
    const ms = lines.map(l => measure(l.s, l.fs, l.weight, l.style));
    const lh = lines.map(l => l.fs * 1.3);
    const total = lh.reduce((a, b) => a + b, 0);
    let top = cy - total / 2;
    const rects = [];
    const out = [];
    lines.forEach((l, i) => {
      const m = ms[i], w = m.x1 - m.x0;
      const base = top + lh[i] / 2 + (-(m.y0 + m.y1) / 2);
      rects.push({ x0: cx - w / 2, y0: base + m.y0, x1: cx + w / 2, y1: base + m.y1 });
      out.push(`<text x="${cx}" y="${base.toFixed(1)}" font-size="${l.fs}" font-weight="${l.weight}"${l.style === 'italic' ? ' font-style="italic"' : ''} fill="${l.fill}" text-anchor="middle">${esc(l.s)}</text>`);
      top += lh[i];
    });
    const r = { x0: Math.min(...rects.map(q => q.x0)), y0: rects[0].y0, x1: Math.max(...rects.map(q => q.x1)), y1: rects[rects.length - 1].y1 };
    return { r, out };
  };
  const samples = r => {
    const pts = [];
    for (let x = r.x0; x <= r.x1 + 0.01; x += Math.max(2, (r.x1 - r.x0) / 12)) for (const y of [r.y0, (r.y0 + r.y1) / 2, r.y1]) pts.push([x, y]);
    return pts;
  };
  // Clearance of a rectangle from the outlines, given which sets it must be inside.
  const clearance = (r, sets, inside) => Math.min(...samples(r).map(p => Math.min(...sets.map(s => (inside.includes(s.id) ? -sd(s, p) : sd(s, p))))));
  const free = r => r.x0 > 16 && r.x1 < width - 16 && r.y0 > 90 && r.y1 < height - 40 && placed.every(q => r.x0 > q.x1 + 6 || r.x1 < q.x0 - 6 || r.y0 > q.y1 + 6 || r.y1 < q.y0 - 6);

  function place(lines, sets, inside, { anchor = null, margin = 8, bbox = [0, 0, width, height], name }) {
    let best = null;
    for (let x = bbox[0]; x <= bbox[2]; x += 4) for (let y = bbox[1]; y <= bbox[3]; y += 4) {
      const { r } = block(lines, x, y);
      if (!free(r)) continue;
      const c = clearance(r, sets, inside);
      if (c < margin) continue;
      const score = anchor ? -Math.hypot(x - anchor[0], y - anchor[1]) : c;
      if (!best || score > best.score) best = { x, y, score };
    }
    if (!best) throw new Error(`No room for label ${name}`);
    const { r, out } = block(lines, best.x, best.y);
    placed.push(r);
    g.push(...out);
    return r;
  }
  return { g, place, placed };
}

function wrap(width, height, title, desc, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">
<title>${esc(title)}</title>
<desc>${esc(desc)}</desc>
<rect width="${width}" height="${height}" fill="${PAPER}"/>
${body}
</svg>
`;
}
const heading = (d, title, subtitle) => {
  d.g.push(`<text x="40" y="46" font-size="22" font-weight="600" fill="${INK}">${esc(title)}</text>`);
  d.g.push(`<text x="40" y="70" font-size="13" fill="${MUTED}">${esc(subtitle)}</text>`);
  const m1 = measure(title, 22, 600), m2 = measure(subtitle, 13, 400);
  d.placed.push({ x0: 40, y0: 46 + m1.y0, x1: 40 + m1.x1, y1: 46 + m1.y1 }, { x0: 40, y0: 70 + m2.y0, x1: 40 + m2.x1, y1: 70 + m2.y1 });
};

// ---------- Venn: every region of three sets ----------
function drawVenn() {
  const width = 1000, height = 800;
  const d = makeDrawing(width, height);
  const r = 200, side = 222, cx = 500, base = 540;
  const sets = [
    { id: 'email', cx: cx - side / 2, cy: base, rx: r, ry: r, color: '#2B6CB0', name: 'Email subscribers', total: '15,810' },
    { id: 'paid', cx: cx + side / 2, cy: base, rx: r, ry: r, color: '#C05621', name: 'Paid users', total: '7,790' },
    { id: 'mobile', cx, cy: base - side * Math.sqrt(3) / 2, rx: r, ry: r, color: '#2F855A', name: 'Mobile app users', total: '12,370' },
  ];
  heading(d, 'Customer Segments — Q3 2025', 'Three-set Venn diagram · each number counts users in exactly that combination of segments · 29,810 users');
  for (const s of sets) d.g.push(`<circle cx="${s.cx}" cy="${s.cy.toFixed(1)}" r="${r}" fill="${s.color}" fill-opacity="0.14"/>`);
  for (const s of sets) d.g.push(`<circle cx="${s.cx}" cy="${s.cy.toFixed(1)}" r="${r}" fill="none" stroke="${s.color}" stroke-width="2.2"/>`);
  const regions = [
    [['email'], '12,400'], [['paid'], '3,200'], [['mobile'], '8,700'],
    [['email', 'paid'], '1,840'], [['email', 'mobile'], '920'], [['paid', 'mobile'], '2,100'],
    [['email', 'paid', 'mobile'], '650'],
  ];
  for (const [inside, n] of regions) {
    d.place([{ s: n, fs: inside.length === 1 ? 20 : 17, weight: 600, fill: INK }], sets, inside, { margin: 10, bbox: [260, 150, 740, 760], name: n });
  }
  const labelFor = s => [{ s: s.name, fs: 15, weight: 600, fill: s.color }, { s: `${s.total} users`, fs: 12.5, weight: 400, fill: MUTED }];
  d.place(labelFor(sets[2]), sets, [], { anchor: [500, 126], margin: 12, name: 'mobile' });
  d.place(labelFor(sets[0]), sets, [], { anchor: [180, 760], margin: 12, name: 'email' });
  d.place(labelFor(sets[1]), sets, [], { anchor: [820, 760], margin: 12, name: 'paid' });
  return wrap(width, height, 'Customer Segments — Q3 2025',
    'Three-set Venn diagram of email subscribers, paid users and mobile app users with a count in every one of the seven regions.', d.g.join('\n'));
}

// ---------- Euler: only the relations that exist ----------
function drawEuler() {
  const width = 880, height = 800;
  const OX = -100, OY = -80; // shapes and anchors below are authored in one frame, then shifted onto the tight canvas
  const d = makeDrawing(width, height);
  const sets = [
    { id: 'animals', cx: 545, cy: 505, rx: 390, ry: 300, color: '#5F6B7A', fill: 0.05, name: 'Animals' },
    { id: 'vertebrates', cx: 480, cy: 520, rx: 245, ry: 245, color: '#2B6CB0', fill: 0.08, name: 'Vertebrates' },
    { id: 'mammals', cx: 365, cy: 468, rx: 98, ry: 98, color: '#B7791F', fill: 0.16, name: 'Mammals' },
    { id: 'birds', cx: 598, cy: 484, rx: 102, ry: 102, color: '#2F855A', fill: 0.16, name: 'Birds' },
    { id: 'fish', cx: 480, cy: 668, rx: 78, ry: 78, color: '#2C7A7B', fill: 0.16, name: 'Fish' },
    { id: 'flight', cx: 575, cy: 362, rx: 278, ry: 108, color: '#6B46C1', fill: 0.10, name: 'Powered flight', dash: '8 5' },
  ];
  for (const s of sets) { s.cx += OX; s.cy += OY; }
  const S = Object.fromEntries(sets.map(s => [s.id, s]));
  // Verify the drawn relations match the source: containment, disjointness, partial overlap.
  const pts = []; for (let x = 0; x <= width; x += 4) for (let y = 80; y <= height; y += 4) pts.push([x, y]);
  const inS = (s, p) => sd(s, p) < 0;
  const subset = (a, b) => pts.every(p => !inS(S[a], p) || sd(S[b], p) < -4);
  const disjoint = (a, b) => pts.every(p => !(sd(S[a], p) < 4 && sd(S[b], p) < 4));
  const overlap = (a, b) => pts.some(p => sd(S[a], p) < -12 && sd(S[b], p) < -12) && pts.some(p => sd(S[a], p) < -20 && sd(S[b], p) > 20) && pts.some(p => sd(S[b], p) < -20 && sd(S[a], p) > 20);
  const checks = [
    subset('vertebrates', 'animals'), subset('mammals', 'vertebrates'), subset('birds', 'vertebrates'), subset('fish', 'vertebrates'), subset('flight', 'animals'),
    disjoint('mammals', 'birds'), disjoint('mammals', 'fish'), disjoint('birds', 'fish'), disjoint('flight', 'fish'),
    overlap('flight', 'vertebrates'), overlap('flight', 'mammals'), overlap('flight', 'birds'),
  ];
  if (checks.includes(false)) throw new Error(`Euler relation check failed: ${checks}`);

  heading(d, 'Animals, vertebrate classes and powered flight', 'Euler diagram · nested outlines are subsets, separate outlines share no members, crossing outlines partly overlap');
  for (const s of sets) d.g.push(`<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="${s.color}" fill-opacity="${s.fill}"/>`);
  // A flying vertebrate is always a mammal or a bird, so vertebrates ∩ flight outside mammals and birds
  // has no members. No closed curve can reach Mammals and Birds from outside Vertebrates without crossing
  // that zone, so it is shaded with Venn's hatching for an empty region.
  const E = s => `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}"/>`;
  d.g.push(`<defs><pattern id="empty-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#4A5563" stroke-width="1.3"/></pattern>
<clipPath id="clip-vert">${E(S.vertebrates)}</clipPath><clipPath id="clip-flight">${E(S.flight)}</clipPath>
<mask id="not-mammal-bird"><rect width="${width}" height="${height}" fill="#fff"/><circle cx="${S.mammals.cx}" cy="${S.mammals.cy}" r="${S.mammals.rx}" fill="#000"/><circle cx="${S.birds.cx}" cy="${S.birds.cy}" r="${S.birds.rx}" fill="#000"/></mask></defs>`);
  d.g.push(`<g clip-path="url(#clip-vert)"><g clip-path="url(#clip-flight)"><rect width="${width}" height="${height}" fill="url(#empty-hatch)" fill-opacity="0.55" mask="url(#not-mammal-bird)"/></g></g>`);
  for (const s of sets) d.g.push(`<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="none" stroke="${s.color}" stroke-width="2"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`);
  // Key for the hatching, registered as an obstacle before any label is placed.
  const keyY = height - 30, keyText = 'Hatched area has no members: every vertebrate capable of powered flight is a mammal or a bird';
  d.g.push(`<rect x="40" y="${keyY - 12}" width="28" height="16" fill="url(#empty-hatch)" fill-opacity="0.55" stroke="#4A5563" stroke-width="1"/>`);
  d.g.push(`<text x="80" y="${keyY + 1}" font-size="12.5" fill="${MUTED}">${esc(keyText)}</text>`);
  const km = measure(keyText, 12.5, 400);
  if (80 + km.x1 > width - 16) throw new Error('Key text clipped');
  d.placed.push({ x0: 40, y0: keyY - 12, x1: 80 + km.x1, y1: keyY + 4 });
  const at = a => [a[0] + OX, a[1] + OY];
  const setLabel = (s, inside, anchor) => d.place([{ s: s.name, fs: 15, weight: 600, fill: s.color }], sets, inside, { anchor: at(anchor), margin: 7, name: s.id });
  const example = (s, inside, anchor) => d.place([{ s, fs: 13, weight: 400, fill: MUTED, style: 'italic' }], sets, inside, { anchor: at(anchor), margin: 7, name: s });
  setLabel(S.animals, ['animals'], [190, 330]);
  setLabel(S.vertebrates, ['animals', 'vertebrates'], [330, 700]);
  setLabel(S.flight, ['animals', 'flight'], [800, 300]);
  setLabel(S.mammals, ['animals', 'vertebrates', 'mammals'], [330, 520]);
  setLabel(S.birds, ['animals', 'vertebrates', 'birds'], [598, 500]);
  setLabel(S.fish, ['animals', 'vertebrates', 'fish'], [480, 650]);
  example('Insects', ['animals', 'flight'], [800, 330]);
  example('Bats', ['animals', 'vertebrates', 'mammals', 'flight'], [390, 420]);
  example('Most birds', ['animals', 'vertebrates', 'birds', 'flight'], [598, 405]);
  example('Penguins, ostriches', ['animals', 'vertebrates', 'birds'], [598, 520]);
  return wrap(width, height, 'Animals, vertebrate classes and powered flight',
    'Euler diagram: vertebrates inside animals; mammals, birds and fish inside vertebrates and apart from each other; powered flight inside animals, partly overlapping vertebrates, mammals and birds, and apart from fish.', d.g.join('\n'));
}

for (const [name, fn] of [['venn', drawVenn], ['euler', drawEuler]]) {
  const svg = fn();
  await writeFile(new URL(`../../visual-eval/exemplars/venn/${name}/ideal.svg`, import.meta.url), svg);
  if (PNG_DIR) await writeFile(`${PNG_DIR}/venn-${name}.png`, new Resvg(svg, { font, fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
  console.log(`venn/${name} ok`);
}
