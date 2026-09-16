/** Draw the causal-loop cases' `ideal.svg` — the targets the engine is aiming at.
 *
 * One kit draws all five. The notation is Sterman's, per
 * `docs/reference/41-CAUSAL-LOOP-STANDARD.md`: variables are plain text, causal
 * links are curved arrows, each link carries a polarity `+` or `−` beside its
 * arrowhead, a slow link wears two hash marks, and every feedback loop gets a
 * circular arrow labelled `R` or `B` curling in the loop's own direction.
 *
 * The letter is *computed*, never copied: the engine's whole claim here is
 * Sterman's even/odd rule — count the negative links round the loop, an even
 * count (zero included) reinforces, an odd count balances. Where a case source
 * declares a letter that contradicts its own polarities, the drawing shows the
 * computed one and says so in the desc; that is the behaviour the standard
 * asks for.
 *
 *   node scripts/visual-eval/draw-causalloop-target.mjs            # all cases
 *   node scripts/visual-eval/draw-causalloop-target.mjs burnout
 */
import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SVG = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";

const INK = "#16202B";
const SLATE = "#63707F";
const RULE = "#C9D2DC";
const R_COL = "#B4462A";       // reinforcing
const B_COL = "#1F6F8B";       // balancing

const M = 46;
const FS_TITLE = 22, FS_SUB = 12.5, FS_VAR = 13.5, FS_SIGN = 15, FS_LOOP = 13, FS_CAP = 11;
const HEAD_L = 10, HEAD_W = 3.8;
const PAD_X = 14, PAD_Y = 9;   // clear air kept round a variable's text

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Math.round(v * 100) / 100;

const cache = new Map();
const measure = async (text, size, weight = 400, style = "normal") => {
  const key = `${style}|${weight}|${size}|${text}`;
  if (!cache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="100"><text x="10" y="50" font-family="Helvetica" font-size="${size}" font-weight="${weight}" font-style="${style}">${esc(text)}</text></svg>`;
    cache.set(key, new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: ["/System/Library/Fonts/Helvetica.ttc"] } }).getBBox()?.width ?? 0);
  }
  return cache.get(key);
};

// ---------------------------------------------------------------- parse

const parse = (src) => {
  const doc = { title: "", deck: "", vars: new Map(), links: [], declared: [] };
  const add = (name) => {
    if (!doc.vars.has(name)) doc.vars.set(name, { name, id: `v${doc.vars.size}` });
    return doc.vars.get(name);
  };
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) { if (!doc.deck) doc.deck = line.replace(/^#\s*/, "").replace(/^Scenario:\s*/i, "").replace(/\.$/, ""); continue; }
    let m;
    if ((m = /^causalloop\s+"(.*)"/.exec(line))) { doc.title = m[1]; continue; }
    if ((m = /^loop\s+(\w+)\s+"(.*)"/.exec(line))) { doc.declared.push({ id: m[1], name: m[2] }); continue; }
    if ((m = /^"([^"]+)"\s*->\s*"([^"]+)"\s*:\s*([+-])\s*(delay)?/.exec(line))) {
      doc.links.push({ from: add(m[1]).name, to: add(m[2]).name, sign: m[3], delay: Boolean(m[4]) });
      continue;
    }
  }
  return doc;
};

/** Every simple cycle, and Sterman's even/odd verdict for each. */
const cycles = (doc) => {
  const names = [...doc.vars.keys()];
  const out = new Map(names.map((n) => [n, doc.links.filter((l) => l.from === n)]));
  const found = [];
  const seen = new Set();
  const walk = (start, node, path) => {
    for (const l of out.get(node)) {
      if (l.to === start && path.length >= 2) {
        const ring = [...path];
        const key = [...ring].sort().join("|");
        if (!seen.has(key)) { seen.add(key); found.push(ring); }
      } else if (!path.includes(l.to) && names.indexOf(l.to) > names.indexOf(start)) {
        walk(start, l.to, [...path, l.to]);
      }
    }
  };
  for (const n of names) walk(n, n, [n]);
  return found.map((ring) => {
    const edges = ring.map((n, i) => doc.links.find((l) => l.from === n && l.to === ring[(i + 1) % ring.length]));
    const negatives = edges.filter((e) => e.sign === "-").length;
    return { ring, edges, negatives, kind: negatives % 2 === 0 ? "R" : "B" };
  }).sort((a, b) => b.ring.length - a.ring.length);
};

// ---------------------------------------------------------------- sheet

class Sheet {
  constructor(title, deck) {
    Object.assign(this, { title, deck });
    this.arcs = []; this.shapes = []; this.texts = [];
    this.labels = [];
    this.minX = Infinity; this.maxX = -Infinity; this.minY = Infinity; this.maxY = -Infinity;
  }
  grow(x, y, w = 0, h = 0) {
    this.minX = Math.min(this.minX, x); this.maxX = Math.max(this.maxX, x + w);
    this.minY = Math.min(this.minY, y); this.maxY = Math.max(this.maxY, y + h);
  }
  async at(x, y, s, { size = FS_VAR, weight = 400, fill = INK, anchor = "middle", style = "normal", block = "" } = {}) {
    const w = await measure(s, size, weight, style);
    const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    this.texts.push(
      `<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT_SVG}" font-size="${size}"` +
      (weight !== 400 ? ` font-weight="${weight}"` : "") +
      (style !== "normal" ? ` font-style="${style}"` : "") +
      ` fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}>${esc(s)}</text>`
    );
    this.labels.push({ x: left, y: y - size * 0.8, w, h: size * 1.12, s, block });
    this.grow(left, y - size * 0.8, w, size * 1.12);
  }
  occupied(box, pad = 5) {
    const hit = (a, c) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;
    return this.labels.some((l) => hit(box, l));
  }
  async tryAt(cands, text, opts = {}) {
    const size = opts.size ?? FS_VAR;
    const w = await measure(text, size, opts.weight ?? 400, opts.style ?? "normal");
    for (const [x, y] of cands)
      if (!this.occupied({ x: x - w / 2, y: y - size * 0.8, w, h: size * 1.12 }))
        return this.at(x, y, text, opts);
    const [x, y] = cands[cands.length - 1];
    return this.at(x, y, text, opts);
  }

  path(d, { stroke = INK, width = 1.6, dash = "", fill = "none" } = {}) {
    this.arcs.push(`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""} stroke-linecap="round"/>`);
  }
  head(x, y, ux, uy, stroke = INK) {
    const px = -uy, py = ux, bx = x - ux * HEAD_L, by = y - uy * HEAD_L;
    this.shapes.push(`<path d="M ${n2(x)} ${n2(y)} L ${n2(bx + px * HEAD_W)} ${n2(by + py * HEAD_W)} L ${n2(bx - px * HEAD_W)} ${n2(by - py * HEAD_W)} Z" fill="${stroke}"/>`);
  }
  render() {
    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" role="img">`);
    o.push(`<title>${esc(this.title)}</title>`);
    o.push(`<desc>${esc(this.desc || "")}</desc>`);
    o.push(`<rect x="0" y="0" width="${this.w}" height="${this.h}" fill="#ffffff"/>`);
    o.push(`<text x="${M}" y="48" font-family="${FONT_SVG}" font-size="${FS_TITLE}" font-weight="600" fill="${INK}">${esc(this.title)}</text>`);
    o.push(`<text x="${M}" y="70" font-family="${FONT_SVG}" font-size="${FS_SUB}" fill="${SLATE}">${esc(this.deck)}</text>`);
    o.push(`<line x1="${M}" y1="84" x2="${this.w - M}" y2="84" stroke="${RULE}" stroke-width="1"/>`);
    o.push(`<g transform="translate(${n2(this.dx)} ${n2(this.dy)})">`);
    o.push(...this.arcs, ...this.shapes, ...this.texts);
    o.push("</g>");
    o.push(...(this.foot ?? []));
    o.push("</svg>");
    return o.join("\n") + "\n";
  }
}

// ---------------------------------------------------------------- build

const build = async (name) => {
  const dir = `visual-eval/cases/causalloop-${name}`;
  const doc = parse(await readFile(`${dir}/source.sx`, "utf8"));
  const rings = cycles(doc);
  const s = new Sheet(doc.title, doc.deck);

  // Size every variable from its own text.
  for (const v of doc.vars.values()) {
    v.lines = v.name.length > 16 && v.name.includes(" ")
      ? (() => { const w = v.name.split(" "); const k = Math.ceil(w.length / 2); return [w.slice(0, k).join(" "), w.slice(k).join(" ")]; })()
      : [v.name];
    let widest = 0;
    for (const l of v.lines) widest = Math.max(widest, await measure(l, FS_VAR, 500));
    v.hw = widest / 2 + PAD_X;
    v.hh = (v.lines.length * 17) / 2 + PAD_Y;
  }

  // The longest cycle goes on a ring; everything else hangs off it.
  const main = rings[0];
  const ringNames = main ? main.ring : [...doc.vars.keys()];
  const n = ringNames.length;
  let R = 200;
  for (;;) {
    const pts = ringNames.map((_, i) => (2 * Math.PI * i) / n - Math.PI / 2);
    const boxes = ringNames.map((nm, i) => {
      const v = doc.vars.get(nm);
      return { x: R * Math.cos(pts[i]) - v.hw, y: R * Math.sin(pts[i]) - v.hh, w: v.hw * 2, h: v.hh * 2 };
    });
    let clash = false;
    for (let i = 0; i < boxes.length && !clash; i++)
      for (let j = i + 1; j < boxes.length && !clash; j++) {
        const a = boxes[i], b = boxes[j], pad = 26;
        if (a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad) clash = true;
      }
    if (!clash || R > 460) break;
    R += 16;
  }
  ringNames.forEach((nm, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    const v = doc.vars.get(nm);
    v.cx = R * Math.cos(a); v.cy = R * Math.sin(a); v.ang = a; v.onRing = true;
  });

  // Anything not on the ring sits further out, on the radius of a neighbour.
  for (const v of doc.vars.values()) {
    if (v.onRing) continue;
    const nb = doc.links.find((l) => l.from === v.name && doc.vars.get(l.to)?.onRing)?.to
            ?? doc.links.find((l) => l.to === v.name && doc.vars.get(l.from)?.onRing)?.from;
    const anchor = doc.vars.get(nb);
    const a = anchor ? anchor.ang : -Math.PI / 2;
    v.cx = (R + 168) * Math.cos(a); v.cy = (R + 168) * Math.sin(a); v.ang = a;
  }

  /** Where a link leaves / meets a variable's box. */
  const edgePoint = (v, tx, ty) => {
    const dx = tx - v.cx, dy = ty - v.cy;
    const sx = dx === 0 ? Infinity : v.hw / Math.abs(dx), sy = dy === 0 ? Infinity : v.hh / Math.abs(dy);
    const t = Math.min(sx, sy);
    return [v.cx + dx * t, v.cy + dy * t];
  };

  // ---- links
  for (const l of doc.links) {
    const a = doc.vars.get(l.from), b = doc.vars.get(l.to);
    const both = a.onRing && b.onRing;
    const mx = (a.cx + b.cx) / 2, my = (a.cy + b.cy) / 2;
    // Ring links bow outward, which is what makes the loop read as a loop.
    const outward = Math.hypot(mx, my) || 1;
    const bow = both ? 0.20 : 0.30;   // a two-variable pair needs the lens opened up
    const chord = Math.hypot(b.cx - a.cx, b.cy - a.cy);
    const cxp = both ? mx + (mx / outward) * chord * bow : mx + (-(b.cy - a.cy) / chord) * chord * bow;
    const cyp = both ? my + (my / outward) * chord * bow : my + ((b.cx - a.cx) / chord) * chord * bow;
    const [sx, sy] = edgePoint(a, cxp, cyp);
    const [ex, ey] = edgePoint(b, cxp, cyp);
    // Pull the arrow tip back off the text and aim it along the curve.
    const ux = ex - cxp, uy = ey - cyp, ul = Math.hypot(ux, uy) || 1;
    const tipX = ex, tipY = ey;
    const baseX = tipX - (ux / ul) * HEAD_L, baseY = tipY - (uy / ul) * HEAD_L;
    s.path(`M ${n2(sx)} ${n2(sy)} Q ${n2(cxp)} ${n2(cyp)} ${n2(baseX)} ${n2(baseY)}`);
    s.head(tipX, tipY, ux / ul, uy / ul);

    // Polarity beside the arrowhead, pushed off the curve.
    const px = -uy / ul, py = ux / ul;
    const off = 15;
    await s.at(baseX - (ux / ul) * 10 + px * off, baseY - (uy / ul) * 10 + py * off + 5,
      l.sign === "-" ? "−" : "+", { size: FS_SIGN, weight: 700, fill: INK, block: `sign-${l.from}-${l.to}` });

    if (l.delay) {
      // Two hash marks across the link: the standard "this takes time" mark.
      const hx = 0.25 * sx + 0.5 * cxp + 0.25 * baseX;
      const hy = 0.25 * sy + 0.5 * cyp + 0.25 * baseY;
      const dx2 = baseX - sx, dy2 = baseY - sy, dl = Math.hypot(dx2, dy2) || 1;
      const nx = -dy2 / dl, ny = dx2 / dl, tx2 = dx2 / dl, ty2 = dy2 / dl;
      for (const d of [-4, 4])
        s.path(`M ${n2(hx + tx2 * d - nx * 8)} ${n2(hy + ty2 * d - ny * 8)} L ${n2(hx + tx2 * d + nx * 8)} ${n2(hy + ty2 * d + ny * 8)}`, { width: 2 });
      await s.at(hx + nx * 26, hy + ny * 26 + 4, "delay", { size: FS_CAP, fill: SLATE, style: "italic", block: `delay-${l.from}-${l.to}` });
    }
  }

  // ---- variables
  for (const v of doc.vars.values()) {
    const k = v.lines.length;
    for (const [i, line] of v.lines.entries()) {
      const y = v.cy + 5 - ((k - 1) * 17) / 2 + i * 17;
      s.shapes.push(`<rect x="${n2(v.cx - v.hw + 4)}" y="${n2(y - 12)}" width="${n2(v.hw * 2 - 8)}" height="17" fill="#ffffff"/>`);
      await s.at(v.cx, y, line, { size: FS_VAR, weight: 500, fill: INK, block: `v-${v.name}` });
    }
  }

  // ---- loop glyphs, one per detected cycle, with the computed letter
  const named = [...doc.declared];
  const verdicts = [];
  for (const [i, ring] of rings.entries()) {
    let cx = ring.ring.reduce((t, nm) => t + doc.vars.get(nm).cx, 0) / ring.ring.length;
    let cy = ring.ring.reduce((t, nm) => t + doc.vars.get(nm).cy, 0) / ring.ring.length;
    // A two-variable loop's centroid sits right on top of its own variables;
    // slide the glyph off to one side until it has room.
    const clear = (x, y) => !s.occupied({ x: x - 34, y: y - 26, w: 68, h: 92 }, 6);
    if (!clear(cx, cy)) {
      const a0 = doc.vars.get(ring.ring[0]), a1 = doc.vars.get(ring.ring[1] ?? ring.ring[0]);
      const dx0 = a1.cx - a0.cx, dy0 = a1.cy - a0.cy, dl = Math.hypot(dx0, dy0) || 1;
      const px0 = -dy0 / dl, py0 = dx0 / dl;
      outer: for (const k of [56, 88, 120, 152]) for (const sgn of [1, -1]) {
        if (clear(cx + px0 * k * sgn, cy + py0 * k * sgn)) { cx += px0 * k * sgn; cy += py0 * k * sgn; break outer; }
      }
    }
    // Circulation: signed area of the ring polygon about its own centroid.
    let area = 0;
    ring.ring.forEach((nm, j) => {
      const p = doc.vars.get(nm), q = doc.vars.get(ring.ring[(j + 1) % ring.ring.length]);
      area += (p.cx - cx) * (q.cy - cy) - (q.cx - cx) * (p.cy - cy);
    });
    const cw = area > 0;
    const colour = ring.kind === "R" ? R_COL : B_COL;
    const rr = 22;
    const sweep = cw ? 1 : 0;
    const a0 = cw ? -2.2 : -0.94, a1 = cw ? 1.9 : 3.14;
    const x0 = cx + rr * Math.cos(a0), y0 = cy + rr * Math.sin(a0);
    const x1 = cx + rr * Math.cos(a1), y1 = cy + rr * Math.sin(a1);
    s.path(`M ${n2(x0)} ${n2(y0)} A ${rr} ${rr} 0 1 ${sweep} ${n2(x1)} ${n2(y1)}`, { stroke: colour, width: 1.8 });
    const tang = cw ? [-Math.sin(a1), Math.cos(a1)] : [Math.sin(a1), -Math.cos(a1)];
    s.head(x1, y1, tang[0], tang[1], colour);
    const namedIndex = named.findIndex((label) => label.id.startsWith(ring.kind));
    const declaration = namedIndex < 0 ? undefined : named.splice(namedIndex, 1)[0];
    ring.label = declaration?.id ?? `${ring.kind}${i + 1}`;
    ring.title = declaration?.name ?? "";
    ring.cx = cx; ring.cy = cy;
    verdicts.push(ring);
    await s.at(ring.cx, ring.cy + 5, ring.label, { size: FS_LOOP, weight: 700, fill: colour, block: `loop-${ring.label}` });
    if (ring.title)
      await s.tryAt([44, 60, -40, 76, -56, 92].map((d) => [ring.cx, ring.cy + d]), ring.title,
        { size: FS_CAP, fill: colour, style: "italic", block: `loop-${ring.label}` });
  }

  // ---- frame and footer
  s.dx = M + 20 - s.minX;
  s.dy = 132 - s.minY;
  const bodyBottom = s.maxY + s.dy;
  s.w = Math.ceil(Math.max(s.maxX - s.minX + 2 * M + 40, 900));
  s.dx = (s.w - (s.maxX - s.minX)) / 2 - s.minX;
  const foot = [];
  let fy = bodyBottom + 54;
  const lines = ["+  same direction     −  opposite direction     ||  delay     R  reinforcing loop     B  balancing loop", ...named.map((label) => `Source declaration ${label.id} (${label.name}) does not match a computed loop polarity.`)];
  for (const [i, t] of lines.entries())
    foot.push(`<text x="${M}" y="${n2(fy + i * 18)}" font-family="${FONT_SVG}" font-size="${FS_CAP}" fill="${SLATE}">${esc(t)}</text>`);
  s.foot = foot;
  s.h = Math.ceil(fy + lines.length * 18 + M);
  for (const [i, t] of lines.entries()) s.labels.push({ x: M, y: fy + i * 18 - 9, w: await measure(t, FS_CAP), h: 13, s: t, foot: true });

  s.desc =
    `A causal-loop diagram of ${doc.title}. ${doc.vars.size} variables are joined by ${doc.links.length} causal links, each carrying its polarity beside the arrowhead. ` +
    `The engine's job here is to find the feedback loops and classify them by Sterman's even/odd rule, and this drawing shows that answer: ` +
    verdicts.map((v) => `${v.label} runs ${v.ring.join(" → ")} → ${v.ring[0]} with ${v.negatives} negative link${v.negatives === 1 ? "" : "s"}, so it ${v.kind === "R" ? "reinforces" : "balances"}`).join("; ") + ". " +
    (doc.links.some((l) => l.delay) ? "The slow link wears two hash marks. " : "") +
    `Each loop glyph is a circular arrow curling in the loop's own direction, labelled with the computed letter and the loop's name.`;
  return s;
};

// ---------------------------------------------------------------- verify

const duplicateAttributes = (svgText) => {
  const out = [];
  for (const el of svgText.match(/<[a-zA-Z]+\s[^>]*>/g) ?? []) {
    const names = [...el.matchAll(/([a-zA-Z-]+)="/g)].map((m) => m[1]);
    const dup = [...new Set(names.filter((nm) => names.filter((m2) => m2 === nm).length > 1))];
    if (dup.length) out.push(`duplicate ${dup.join(", ")} on ${el.slice(0, 60)}…`);
  }
  return [...new Set(out)];
};

const check = (sheet) =>
  (([labels, dx, dy, W, H]) => {
      const pad = 4;
      const box = (l) => (l.foot ? l : { ...l, x: l.x + dx, y: l.y + dy });
      const hit = (a, c) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;
      const out = [];
      for (let i = 0; i < labels.length; i++) {
        const a = box(labels[i]);
        if (a.x < 6 || a.y < 6 || a.x + a.w > W - 6 || a.y + a.h > H - 6) out.push(`canvas edge: "${labels[i].s}"`);
        for (let j = i + 1; j < labels.length; j++) {
          if (labels[i].block && labels[i].block === labels[j].block) continue;
          if (hit(a, box(labels[j]))) out.push(`label/label: "${labels[i].s}" x "${labels[j].s}"`);
        }
      }
      return [...new Set(out)];
    })([sheet.labels, sheet.dx, sheet.dy, sheet.w, sheet.h]);

// ---------------------------------------------------------------- run

const ALL = ["burnout", "customer-growth", "induced-demand", "inventory-oscillation", "technical-debt"];
const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
let failed = 0;
for (const nm of names) {
  const sheet = await build(nm);
  const svgText = sheet.render();
  const found = [...duplicateAttributes(svgText), ...(await check(sheet))];
  if (found.length) {
    failed++;
    console.error(`causalloop-${nm} collides, not written:\n  ${found.join("\n  ")}`);
    continue;
  }
  await writeFile(`visual-eval/cases/causalloop-${nm}/ideal.svg`, svgText);
  console.log(`causalloop-${nm}: ${sheet.w}x${sheet.h}, 0 collisions`);
}
if (failed) process.exit(1);
