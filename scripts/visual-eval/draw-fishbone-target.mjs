/** Draw a fishbone case's `ideal.svg` — the target the engine is aiming at.
 *
 * The target set has to be *one* drawing repeated, not six drawings that drift,
 * so this reproduces the idiom of `visual-eval/exemplars/fishbone/ideal.svg`
 * exactly: line-art fish, one hue per category used on nothing but that
 * category's bone, cause rules, sub-cause twigs and name pill, everything else
 * neutral slate. The geometry constants below are lifted from that drawing.
 *
 * Text widths are measured in a real browser rather than estimated, and the
 * finished drawing is checked label-against-label, label-against-line and
 * label-against-canvas-edge before it is written — a target that collides is
 * worse than no target, because the judge then scores the engine against it.
 *
 *   node scripts/visual-eval/draw-fishbone-target.mjs \
 *     visual-eval/cases/fishbone-molding-defects "Ishikawa 6M analysis · Press shop"
 */
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SVG = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const HUES = ["#1E5FA8", "#0E7C6B", "#B25E12", "#6A3D9A", "#B02A37", "#3F7A28"];
const COT60 = 0.5773502691896258;

// Exemplar geometry.
const ROW0 = 76;            // first cause row, measured off the spine
const ROW_PITCH = 66;       // twig + label + 16px of air
const TIP_EXTRA = 58;       // last row -> bone tip
const PILL_H = 34;
const RULE_TO_BONE = 2;     // arrowhead stops just short of the bone
const TEXT_GAP = 36;        // rule end -> end-anchored cause label
const TWIG_DX = 16, TWIG_DY = 27.7128;   // 32px at 60 degrees
const TWIG_FOOT = 30;       // twig foot, measured back from the bone
const SUB_DX = -9.5, SUB_DY = 3.2;
const SUB_GAP = 20;         // clear air between neighbouring sub labels
const RULE_LEAD = 24;       // rule runs past its leftmost label
const WEDGE_CLEAR = 40;     // clear air between a label and the next bone
const SPINE_W = 4, BONE_W = 3, RULE_W = 1.6, TWIG_W = 1.2;

const parse = (src) => {
  const doc = { title: "", effect: "", cats: [] };
  let cur = null;
  for (const raw of src.split("\n")) {
    const line = raw.replace(/#.*$/, "").trimEnd();
    if (!line.trim()) continue;
    let m;
    if ((m = /^fishbone\s+"(.*)"/.exec(line))) doc.title = m[1];
    else if ((m = /^effect\s+"(.*)"/.exec(line))) doc.effect = m[1];
    else if ((m = /^category\s+(\S+)\s+"(.*)"/.exec(line)))
      doc.cats.push({ id: m[1], name: m[2], causes: [] });
    else if ((m = /^\s*-\s+"(.*)"/.exec(line))) cur.subs.push(m[1]);
    else if ((m = /^(\S+):\s+"(.*)"/.exec(line))) {
      const cat = doc.cats.find((c) => c.id === m[1]);
      cur = { text: m[2], subs: [] };
      cat.causes.push(cur);
    }
  }
  return doc;
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<canvas id=c></canvas>");
const cache = new Map();
const measure = async (text, size, weight) => {
  const key = `${weight}|${size}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const w = await page.evaluate(
    ([t, s, wt, f]) => {
      const ctx = document.getElementById("c").getContext("2d");
      ctx.font = `${wt} ${s}px ${f}`;
      return ctx.measureText(t).width;
    },
    [text, size, weight, FONT]
  );
  cache.set(key, w);
  return w;
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const [caseDir, deckArg] = process.argv.slice(2);
const doc = parse(await readFile(`${caseDir}/source.sx`, "utf8"));
// Re-running with no deck keeps the one already drawn, so the six targets stay
// reproducible without a table of editorial strings living inside this tool.
const previous = await readFile(`${caseDir}/ideal.svg`, "utf8").catch(() => "");
const deck = deckArg ?? /font-size="12.5"[^>]*>([^<]*)</.exec(previous)?.[1];
if (!deck) throw new Error(`${caseDir}: no deck line given and none to reuse`);

// ---- effect statement: wrap to the head's inner width -------------------
const EFFECT_MAX = 210;
// Balanced wrap: pick the line count first, then fill to an even width, so a
// three-word tail like "Model X housings" never gets orphaned on its own line.
const words = doc.effect.split(" ");
const full = await measure(doc.effect, 15.5, 600);
const count = Math.max(1, Math.ceil(full / EFFECT_MAX));
let widest = 0;
for (const w of words) widest = Math.max(widest, await measure(w, 15.5, 600));
const wrap = async (limit) => {
  const out = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (line && (await measure(trial, 15.5, 600)) > limit) { out.push(line); line = w; }
    else line = trial;
  }
  if (line) out.push(line);
  return out;
};
// Even line lengths, but never more lines than the width alone requires.
let limit = Math.max(widest, full / count);
let lines = await wrap(limit);
while (lines.length > count && limit < EFFECT_MAX * 1.3) {
  limit *= 1.05;
  lines = await wrap(limit);
}
let effectMax = 0;
for (const l of lines) effectMax = Math.max(effectMax, await measure(l, 15.5, 600));

// ---- lay each category out in its own frame (junction at x=0) -----------
const half = Math.ceil(doc.cats.length / 2);
for (const [i, cat] of doc.cats.entries()) {
  cat.hue = HUES[i % HUES.length];
  cat.top = i < half;
  cat.slot = cat.top ? i : i - half;
  cat.sign = cat.top ? -1 : 1;           // y direction away from the spine
  cat.pillW = Math.max(104, (await measure(cat.name, 14, 600)) + 48);
  cat.rows = [];
  for (const [k, cause] of cat.causes.entries()) {
    const off = ROW0 + ROW_PITCH * k;    // distance from the spine
    const boneX = -off * COT60;          // bone x at this row, junction at 0
    const ruleEnd = boneX - RULE_TO_BONE;
    const textEnd = ruleEnd - TEXT_GAP;
    const width = await measure(cause.text, 13, 500);
    const row = { off, boneX, ruleEnd, textEnd, text: cause.text, width, subs: [] };
    let foot = boneX - TWIG_FOOT;
    for (const s of cause.subs) {
      const w = await measure(s, 12, 400);
      row.subs.push({ foot, text: s, width: w });
      foot = foot - w - SUB_GAP;
    }
    const leftmost = Math.min(
      textEnd - width,
      ...row.subs.map((s) => s.foot + TWIG_DX + SUB_DX - s.width)
    );
    row.ruleStart = leftmost - RULE_LEAD;
    cat.rows.push(row);
  }
}

// Every bone runs to the same length, so the six pills sit on two clean lines
// however unevenly the causes are spread between categories.
const tipOff =
  ROW0 + ROW_PITCH * (Math.max(...doc.cats.map((c) => c.causes.length)) - 1) + TIP_EXTRA;
for (const cat of doc.cats) cat.tipOff = tipOff;

// Bones are parallel, so one number keeps every label out of its neighbour's
// wedge: the widest horizontal reach from a bone back to that row's leftmost ink.
let reach = 0;
for (const cat of doc.cats)
  for (const r of cat.rows) reach = Math.max(reach, r.boneX - r.ruleStart);
const pitch = Math.ceil(reach + WEDGE_CLEAR);

// ---- place the frames on a spine ---------------------------------------
const spineY = 0;
for (const cat of doc.cats) cat.jx = cat.slot * pitch;
const lastJx = (Math.ceil(doc.cats.length / 2) - 1) * pitch;
const spineL = -242, spineR = lastJx + 96;

const headW = Math.max(274, effectMax + 150);
const headH = Math.max(232, lines.length * 22 + 120);
const HL = spineR + 2, HR = HL + headW, HT = -headH / 2, HB = headH / 2;
const headCX = HL + headW * 0.525;

let minX = spineL - 120;
for (const cat of doc.cats)
  for (const r of cat.rows) minX = Math.min(minX, cat.jx + r.ruleStart);
let minY = Math.min(HT, ...doc.cats.map((c) => (c.top ? -c.tipOff - PILL_H / 2 : Infinity)));
let maxY = Math.max(HB, ...doc.cats.map((c) => (c.top ? -Infinity : c.tipOff + PILL_H / 2)));

const OX = 40 - minX;               // left margin
const OY = 88 - minY;               // room for title + deck
const W = Math.ceil(HR + OX + 40);
const H = Math.ceil(maxY + OY + 40);
const X = (v) => +(v + OX).toFixed(2);
const Y = (v) => +(v + OY).toFixed(2);

// ---- draw ---------------------------------------------------------------
const o = [];
o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT_SVG}">`);
o.push(`<title>${esc(doc.title)}</title>`);
const desc = `Ishikawa (fishbone) cause-and-effect diagram drawn as a fish in outline. A forked tail at the far left starts a straight horizontal spine that runs right and ends in an arrowhead entering the fish head: a single closed outline with a curved back tapering to a blunt nose, drawn in dark slate on a near-white fill, with one hairline gill curve and no eye or mouth. The head carries the effect statement "${doc.effect}" under a small letterspaced EFFECT label. ${doc.cats.length} category bones leave the spine at 60 degrees in ${Math.ceil(doc.cats.length / 2)} mirrored pairs that meet the spine at shared V junctions: ${doc.cats.filter((c) => c.top).map((c) => c.name).join(", ")} above and ${doc.cats.filter((c) => !c.top).map((c) => c.name).join(", ")} below. Each category owns one colour, used for its bone, its cause rules and its sub-cause twigs, with the category name in white on a solid pill of that colour at the bone tip. ${doc.cats.reduce((n, c) => n + c.causes.length, 0)} causes are horizontal rules that underline their text and end in an arrowhead touching the bone. ${doc.cats.reduce((n, c) => n + c.causes.reduce((m, x) => m + x.subs.length, 0), 0)} sub-causes hang off those rules as short twigs slanted at the same 60 degrees as the bone, pointing back toward the spine, each with its label sitting at the free end. Colour appears only on the bones, rules and twigs; the fish, the effect statement and all cause text are neutral slate.`;
o.push(`<desc>${esc(desc)}</desc>`);
o.push(`<rect width="${W}" height="${H}" fill="#FFFFFF"/>`);
o.push("<defs>");
doc.cats.forEach((c, i) =>
  o.push(`<marker id="ca${i}" viewBox="0 0 9 7" refX="9" refY="3.5" markerWidth="9" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L9 3.5 L0 7 Z" fill="${c.hue}"/></marker>`)
);
o.push("</defs>");
const T = (x, y, size, weight, fill, text, anchor, extra = "") =>
  `<text x="${X(x)}" y="${Y(y)}" font-family="${FONT_SVG}" font-size="${size}" font-weight="${weight}" fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ""}${extra}>${esc(text)}</text>`;
o.push(`<text x="40" y="44" font-family="${FONT_SVG}" font-size="22" font-weight="600" fill="#0f172a">${esc(doc.title)}</text>`);
o.push(`<text x="40" y="66" font-family="${FONT_SVG}" font-size="12.5" font-weight="400" fill="#64748b">${esc(deck)}</text>`);

// tail
const SX = spineL, CY = spineY;
o.push(`<path d="M ${X(SX - 2)} ${Y(CY - 13)} C ${X(SX - 42)} ${Y(CY - 32)}, ${X(SX - 86)} ${Y(CY - 49)}, ${X(SX - 120)} ${Y(CY - 58)} C ${X(SX - 112)} ${Y(CY - 40)}, ${X(SX - 100)} ${Y(CY - 18)}, ${X(SX - 86)} ${Y(CY)} C ${X(SX - 100)} ${Y(CY + 18)}, ${X(SX - 112)} ${Y(CY + 40)}, ${X(SX - 120)} ${Y(CY + 58)} C ${X(SX - 86)} ${Y(CY + 49)}, ${X(SX - 42)} ${Y(CY + 32)}, ${X(SX - 2)} ${Y(CY + 13)} C ${X(SX + 5)} ${Y(CY + 7)}, ${X(SX + 5)} ${Y(CY - 7)}, ${X(SX - 2)} ${Y(CY - 13)} Z" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" stroke-linejoin="round"/>`);
// head
o.push(`<path d="M ${X(HR)} ${Y(0)} C ${X(HR)} ${Y(-0.164 * headH)}, ${X(HR - 0.299 * headW)} ${Y(HT)}, ${X(HL + 0.248 * headW)} ${Y(HT)} C ${X(HL + 0.058 * headW)} ${Y(HT)}, ${X(HL)} ${Y(HT + 0.155 * headH)}, ${X(HL)} ${Y(0)} C ${X(HL)} ${Y(HB - 0.155 * headH)}, ${X(HL + 0.058 * headW)} ${Y(HB)}, ${X(HL + 0.248 * headW)} ${Y(HB)} C ${X(HR - 0.299 * headW)} ${Y(HB)}, ${X(HR)} ${Y(0.164 * headH)}, ${X(HR)} ${Y(0)} Z" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" stroke-linejoin="round"/>`);
// The gill starts and ends *on* the head outline, so evaluate the outline's
// own top-left cubic rather than guessing a point near it.
const edge = (t) => {
  const P = [[HL + 0.248 * headW, HT], [HL + 0.058 * headW, HT], [HL, HT + 0.155 * headH], [HL, 0]];
  const u = 1 - t, b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [P.reduce((a, p, i) => a + p[0] * b[i], 0), P.reduce((a, p, i) => a + p[1] * b[i], 0)];
};
const [gx, gy] = edge(0.35);
o.push(`<path d="M ${X(gx)} ${Y(gy)} C ${X(HL + 0.248 * headW)} ${Y(gy * 0.45)}, ${X(HL + 0.248 * headW)} ${Y(-gy * 0.45)}, ${X(gx)} ${Y(-gy)}" fill="none" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/>`);
// spine + arrowhead into the head
o.push(`<line x1="${X(SX)}" y1="${Y(CY)}" x2="${X(spineR)}" y2="${Y(CY)}" stroke="#1e293b" stroke-width="${SPINE_W}"/>`);
o.push(`<path d="M ${X(spineR - 4)} ${Y(-12)} L ${X(spineR + 38)} ${Y(0)} L ${X(spineR - 4)} ${Y(12)} Z" fill="#1e293b"/>`);
// effect statement
const first = 10 - ((lines.length - 1) / 2) * 22;
o.push(T(headCX, first - 30, 10, 600, "#64748b", "EFFECT", "middle", ' letter-spacing="1.8"'));
lines.forEach((l, i) => o.push(T(headCX, first + i * 22, 15.5, 600, "#0f172a", l, "middle")));

for (const [i, cat] of doc.cats.entries()) {
  const tipX = cat.jx - cat.tipOff * COT60, tipY = cat.sign * cat.tipOff;
  o.push(`<line x1="${X(cat.jx)}" y1="${Y(CY)}" x2="${X(tipX)}" y2="${Y(tipY)}" stroke="${cat.hue}" stroke-width="${BONE_W}" stroke-linecap="round"/>`);
  o.push(`<rect x="${X(tipX - cat.pillW / 2)}" y="${Y(tipY - PILL_H / 2)}" width="${+cat.pillW.toFixed(2)}" height="${PILL_H}" rx="${PILL_H / 2}" fill="${cat.hue}"/>`);
  o.push(T(tipX, tipY + 5, 14, 600, "#FFFFFF", cat.name, "middle"));
  for (const r of cat.rows) {
    const y = cat.sign * r.off;
    o.push(`<line x1="${X(cat.jx + r.ruleStart)}" y1="${Y(y)}" x2="${X(cat.jx + r.ruleEnd)}" y2="${Y(y)}" stroke="${cat.hue}" stroke-width="${RULE_W}" marker-end="url(#ca${i})"/>`);
    o.push(T(cat.jx + r.textEnd, y + (cat.top ? -6 : 16.14), 13, 500, "#334155", r.text, "end"));
    for (const s of r.subs) {
      const fx = cat.jx + s.foot, ex = fx + TWIG_DX, ey = y - cat.sign * TWIG_DY;
      o.push(`<line x1="${X(fx)}" y1="${Y(y)}" x2="${X(ex)}" y2="${Y(ey)}" stroke="${cat.hue}" stroke-width="${TWIG_W}" stroke-linecap="round"/>`);
      o.push(T(ex + SUB_DX, ey + SUB_DY, 12, 400, "#475569", s.text, "end"));
    }
  }
  if (cat.top) o.push(`<circle cx="${X(cat.jx)}" cy="${Y(CY)}" r="4" fill="#1e293b"/>`);
}
o.push("</svg>");
const svgText = o.join("\n") + "\n";

/** Every label box against every other label, every line and the canvas edge. */
const collisions = async () => {
  await page.setContent(`<style>html,body{margin:0}</style>${svgText}`);
  return page.evaluate(() => {
    const svg = document.querySelector("svg");
    const W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
    const pad = 1.5;
    const texts = [...svg.querySelectorAll("text")].map((t) => {
      const r = t.getBBox();
      return { s: t.textContent, x: r.x, y: r.y, w: r.width, h: r.height, pill: t.getAttribute("fill") === "#FFFFFF" };
    });
    const hit = (a, c) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;
    const out = [];
    for (let i = 0; i < texts.length; i++) {
      const a = texts[i];
      if (a.x < -0.5 || a.y < -0.5 || a.x + a.w > W + 0.5 || a.y + a.h > H + 0.5) out.push(`canvas edge: "${a.s}"`);
      for (let j = i + 1; j < texts.length; j++) if (hit(a, texts[j])) out.push(`label/label: "${a.s}" x "${texts[j].s}"`);
    }
    const segs = [...svg.querySelectorAll("line")].map((l) => [l.x1.baseVal.value, l.y1.baseVal.value, l.x2.baseVal.value, l.y2.baseVal.value]);
    const near = (px, py, [x1, y1, x2, y2]) => {
      const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L)) : 0;
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    };
    for (const a of texts) {
      if (a.pill) continue;   // a category name rides its own pill, which its bone ends inside
      for (const s of segs) {
        let touch = false;
        for (let u = 0; u <= 1.0001 && !touch; u += 0.05)
          for (const [px, py] of [[a.x + u * a.w, a.y], [a.x + u * a.w, a.y + a.h], [a.x, a.y + u * a.h], [a.x + a.w, a.y + u * a.h]])
            if (near(px, py, s) < 1) { touch = true; break; }
        if (touch) out.push(`label/line: "${a.s}"`);
      }
    }
    return [...new Set(out)];
  });
};

const found = await collisions();
if (found.length) {
  await browser.close();
  throw new Error(`${caseDir.split("/").pop()} collides, not written:\n  ${found.join("\n  ")}`);
}

await writeFile(`${caseDir}/ideal.svg`, svgText);
await browser.close();
console.log(`${caseDir.split("/").pop()}: ${W}x${H}, pitch ${pitch}, ${doc.cats.length} categories`);
