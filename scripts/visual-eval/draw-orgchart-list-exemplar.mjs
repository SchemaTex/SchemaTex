/** Draw visual-eval/exemplars/orgchart/list/ideal.svg — the look the directory
 *  variant of the org chart engine is aiming at.
 *
 *   node scripts/visual-eval/draw-orgchart-list-exemplar.mjs [out.svg]
 *
 * Same company as the tree exemplar, but the whole of it. Forty-two people over
 * five levels would run past four thousand pixels wide as boxes and connectors;
 * as indented rows the same hierarchy fits one page you can read top to bottom.
 * That is the only reason the variant exists, so the drawing has to show it —
 * and it has to carry every convention the tree carries (assistant, vacancy,
 * dotted-line report, department colour) without any of the tree's connectors.
 *
 * The roster is parsed from the exemplar's own source.sx so the drawing and the
 * DSL cannot drift. Geometry is computed, not eyeballed: text is measured in a
 * real browser, column x positions are derived from the measured maxima, and
 * nothing is written until every text box has been checked against every other
 * text box, its own column boundary, the guide lines and the panel edge.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";

/* ---------- design tokens — the tree exemplar's palette, unchanged ---------- */
const C = {
  page: "#F7F8FA",
  panel: "#FFFFFF",
  ink: "#12161C",       // names, title
  slate: "#5C6672",     // job titles, department names, report counts
  muted: "#8B95A2",     // captions, column headers, locations
  hair: "#DDE2E9",      // panel border, section rules
  rule: "#F0F2F6",      // row rules
  guide: "#C9D1DB",     // indent trunks and ticks
  open: "#B08A2E",      // the one accent: the unfilled role
  openFill: "#FDF9EF",
};
const DEPT = {
  Executive: "#39435A",
  Product: "#613E98",
  Engineering: "#2D6EA3",
  Operations: "#31865E",
  Revenue: "#B4762F",
};
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const FS = { title: 22, caption: 12, head: 9.5, name: 13, role: 11.5, dept: 10, loc: 11.5, dot: 11, count: 11.5, legend: 11 };

/* geometry */
const INDENT = 20;          // one reporting level
const AVATAR = 10.5;        // disc radius
const ROW = 28;             // row pitch
const BAND = 30;            // department band above each section
const GUTTER = 28;          // between columns
const PANEL_X = 28, PANEL_PAD = 20;
const LEFT = PANEL_X + PANEL_PAD;

const n2 = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- roster, parsed from the exemplar's own DSL ---------- */
const srcUrl = new URL("../../visual-eval/exemplars/orgchart/list/source.sx", import.meta.url);
const source = await readFile(srcUrl, "utf8");
const rows = [];
for (const raw of source.split("\n")) {
  if (!raw.trim() || raw.trim().startsWith("#")) continue;
  if (/^(orgchart|config:)/.test(raw.trim())) continue;
  const m = /^(\s*)([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(raw);
  if (!m) continue;                       // the trailing `-.->` edge line
  const depth = m[1].length / 2;
  let rest = m[3];
  const props = /\[([^\]]*)\]\s*$/.exec(rest);
  if (props) rest = rest.slice(0, props.index);
  const [name, title, dept, loc] = rest.split("|").map((s) => s.trim().replace(/^"|"$/g, ""));
  rows.push({
    id: m[2], depth, name, title, dept, loc,
    open: /open\s*:\s*true/.test(props?.[1] ?? ""),
    assistant: /assistant-of/.test(props?.[1] ?? ""),
  });
}
/* subtree size: everyone below you, however deep */
for (let i = 0; i < rows.length; i++) {
  let n = 0;
  for (let j = i + 1; j < rows.length && rows[j].depth > rows[i].depth; j++) n++;
  rows[i].reports = n;
}
/* the one dotted-line relationship, read from the edge statement */
const edge = /^(\w+)\s*-\.->\s*(\w+)\s*\[label:\s*"([^"]+)"\]/m.exec(source);
const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
const dotted = edge
  ? { from: byId[edge[1]], to: byId[edge[2]], label: edge[3] }
  : null;

/* ---------- measure ---------- */
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<canvas id=c></canvas>");
const cache = new Map();
const measure = async (s, fs, weight = 400, tracking = 0) => {
  const key = `${s}|${fs}|${weight}|${tracking}`;
  if (cache.has(key)) return cache.get(key);
  const w = await page.evaluate(
    ([text, size, wt]) => {
      const ctx = document.getElementById("c").getContext("2d");
      ctx.font = `${wt} ${size}px Inter, Helvetica Neue, Helvetica, Arial, sans-serif`;
      return ctx.measureText(text).width;
    },
    [s, fs, weight]
  );
  const out = w + tracking * Math.max(0, s.length - 1);
  cache.set(key, out);
  return out;
};

const indentX = (d) => LEFT + d * INDENT;      // avatar left edge
const nameX = (d) => indentX(d) + AVATAR * 2 + 8;

/* Sections: one per executive, plus the chief executive's own. The department
   is written once on a band above each, so no row has to repeat it — under
   Engineering that word would otherwise appear seventeen times. */
const sectionAt = new Map();
for (let i = 0; i < rows.length; i++) {
  if (i === 0 || (rows[i].depth === 1 && !rows[i].assistant)) sectionAt.set(i, rows[i].dept);
}
const bandsBefore = (i) => [...sectionAt.keys()].filter((k) => k <= i).length;

/* column x positions derived from the measured maxima */
let nameEnd = 0;
for (const r of rows) nameEnd = Math.max(nameEnd, nameX(r.depth) + (await measure(r.name, FS.name, 600)));
let titleW = 0;
for (const r of rows) titleW = Math.max(titleW, await measure(r.title, FS.role));
let locW = 0;
for (const r of rows) locW = Math.max(locW, await measure(r.loc, FS.loc));

const COL = {};
COL.title = Math.ceil(nameEnd + GUTTER);
COL.loc = Math.ceil(COL.title + titleW + GUTTER);
COL.dotted = Math.ceil(COL.loc + locW + GUTTER);

const dottedTexts = dotted
  ? [`${dotted.label} · ${dotted.to.name}`, `${dotted.label} · ${dotted.from.name}`]
  : [];
let dottedW = 0;
for (const t of dottedTexts) dottedW = Math.max(dottedW, 30 + (await measure(t, FS.dot)));
/* column headers must fit their own columns too */
const headTitles = { title: "TITLE", loc: "LOCATION", dotted: "DOTTED-LINE REPORT" };
const headW = {};
for (const [k, v] of Object.entries(headTitles)) headW[k] = await measure(v, FS.head, 600, 0.7);
dottedW = Math.max(dottedW, headW.dotted);

const countW = Math.max(await measure("41", FS.count), await measure("ASSISTANT", FS.head, 600, 0.7), await measure("REPORTS", FS.head, 600, 0.7));
const countRight = Math.ceil(COL.dotted + dottedW + GUTTER + countW);
const PANEL_W = countRight + PANEL_PAD - PANEL_X;
const W = Math.ceil(PANEL_X * 2 + PANEL_W);

/* vertical rhythm */
const TITLE_Y = 50, CAP_Y = 72;
const PANEL_Y = 96;
const HEAD_Y = PANEL_Y + 26;                 // column-header baseline
const HEAD_RULE = PANEL_Y + 36;
const rowY = (i) => HEAD_RULE + 16 + i * ROW + bandsBefore(i) * BAND;
const bandY = (i) => rowY(i) - 14 - BAND;    // top of the band that opens row i's section
const PANEL_H = rowY(rows.length - 1) + 14 + 12 - PANEL_Y;
const LEG_Y = PANEL_Y + PANEL_H + 28;
const LEG_H = 150;
const H = Math.ceil(LEG_Y + LEG_H + 28);

/* ---------- scene ---------- */
const g = [];
const labels = [];        // {x, y, w, h, what} every painted text box
const text = (x, y, s, { size = FS.role, weight = 400, fill = C.slate, anchor = "start", tracking = 0, w }) => {
  const attrs = [
    `x="${n2(x)}"`, `y="${n2(y)}"`, `font-size="${size}"`,
    weight !== 400 ? `font-weight="${weight}"` : "",
    `fill="${fill}"`,
    anchor !== "start" ? `text-anchor="${anchor}"` : "",
    tracking ? `letter-spacing="${tracking}"` : "",
  ].filter(Boolean).join(" ");
  g.push(`<text ${attrs}>${esc(s)}</text>`);
  const left = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
  labels.push({ x: left, y: y - size * 0.78, w, h: size * 1.0, what: s });
};

/* header — title, caption and the NAME column share one left edge */
text(LEFT, TITLE_Y, "Lumen Health · Company Directory, Q3 2026", {
  size: FS.title, weight: 600, fill: C.ink,
  w: await measure("Lumen Health · Company Directory, Q3 2026", FS.title, 600),
});
const caption = `${rows.length} people · five reporting levels · five departments · one open role`;
text(LEFT, CAP_Y, caption, { size: FS.caption, fill: C.muted, w: await measure(caption, FS.caption) });

/* panel */
g.push(`<rect x="${PANEL_X}" y="${PANEL_Y}" width="${n2(PANEL_W)}" height="${n2(PANEL_H)}" rx="10" fill="${C.panel}" stroke="${C.hair}" stroke-width="1"/>`);

/* column headers */
const headOpts = { size: FS.head, weight: 600, fill: C.muted, tracking: 0.7 };
text(LEFT, HEAD_Y, "NAME", { ...headOpts, w: await measure("NAME", FS.head, 600, 0.7) });
text(COL.title, HEAD_Y, headTitles.title, { ...headOpts, w: headW.title });
text(COL.loc, HEAD_Y, headTitles.loc, { ...headOpts, w: headW.loc });
text(COL.dotted, HEAD_Y, headTitles.dotted, { ...headOpts, w: headW.dotted });
text(countRight, HEAD_Y, "REPORTS", { ...headOpts, anchor: "end", w: await measure("REPORTS", FS.head, 600, 0.7) });
g.push(`<path d="M ${LEFT} ${HEAD_RULE} H ${n2(countRight)}" stroke="${C.hair}" stroke-width="1"/>`);

/* Row tints go down before the guides, so the tick into an unfilled role still
   arrives at its disc instead of stopping at the edge of the tint. */
for (let i = 0; i < rows.length; i++) {
  if (!rows[i].open) continue;
  g.push(`<rect x="${PANEL_X + 8}" y="${n2(rowY(i) - 13)}" width="${n2(PANEL_W - 16)}" height="26" rx="5" fill="${C.openFill}"/>`);
}

/* indent guides: one trunk per manager, one tick per direct report */
const guides = [];
for (let i = 0; i < rows.length; i++) {
  const kids = [];
  for (let j = i + 1; j < rows.length && rows[j].depth > rows[i].depth; j++) {
    if (rows[j].depth === rows[i].depth + 1) kids.push(j);
  }
  if (!kids.length) continue;
  const tx = indentX(rows[i].depth) + AVATAR;
  const y0 = rowY(i) + AVATAR + 3;
  const y1 = rowY(kids[kids.length - 1]);
  g.push(`<path d="M ${n2(tx)} ${n2(y0)} V ${n2(y1)}" stroke="${C.guide}" stroke-width="1" fill="none"/>`);
  guides.push({ x: tx, y0, y1 });
  for (const k of kids) {
    const y = rowY(k);
    g.push(`<path d="M ${n2(tx)} ${n2(y)} H ${n2(tx + 8)}" stroke="${C.guide}" stroke-width="1" fill="none"/>`);
    /* an assistant is not a rung of the ladder: its tick ends in a bar rather
       than at the disc, the glyph the tree exemplar's legend already uses for
       a side-hung assistant, drawn in the darker line so it reads as different
       rather than as a short tick */
    if (rows[k].assistant) {
      g.push(`<path d="M ${n2(tx)} ${n2(y)} H ${n2(tx + 6)} M ${n2(tx + 6)} ${n2(y - 7)} V ${n2(y + 7)}" stroke="${C.slate}" stroke-width="1.2" fill="none"/>`);
    }
  }
}

/* rows */
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const y = rowY(i);
  const ax = indentX(r.depth) + AVATAR;
  const colour = DEPT[r.dept] ?? C.slate;

  if (sectionAt.has(i)) {
    /* Department band: the word is written once here instead of forty-one times
       down a column. Set clear of the chief executive's trunk, which runs the
       whole height of the page and must not look like part of the band. */
    const by = bandY(i);
    const label = r.dept.toUpperCase();
    const lw = await measure(label, FS.dept, 600, 0.8);
    text(LEFT + 22, by + 20, label, { size: FS.dept, weight: 600, fill: colour, tracking: 0.8, w: lw });
    g.push(`<path d="M ${n2(LEFT + 32 + lw)} ${n2(by + 16)} H ${n2(countRight)}" stroke="${C.hair}" stroke-width="1"/>`);
  } else if (i > 0) {
    g.push(`<path d="M ${n2(nameX(r.depth))} ${n2(y - 14)} H ${n2(countRight)}" stroke="${C.rule}" stroke-width="1"/>`);
  }

  if (r.open) {
    g.push(`<circle cx="${n2(ax)}" cy="${n2(y)}" r="${AVATAR}" fill="${C.openFill}" stroke="${C.open}" stroke-width="1.1" stroke-dasharray="4 3"/>`);
    g.push(`<path d="M ${n2(ax - 4.5)} ${n2(y)} H ${n2(ax + 4.5)} M ${n2(ax)} ${n2(y - 4.5)} V ${n2(y + 4.5)}" stroke="${C.open}" stroke-width="1.4" stroke-linecap="round"/>`);
  } else {
    g.push(`<circle cx="${n2(ax)}" cy="${n2(y)}" r="${AVATAR}" fill="${colour}"/>`);
    const ini = r.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    g.push(`<text x="${n2(ax)}" y="${n2(y + 3.4)}" font-size="9.5" font-weight="600" fill="#FFFFFF" text-anchor="middle">${ini}</text>`);
  }

  text(nameX(r.depth), y + 4, r.name, {
    size: FS.name, weight: 600, fill: r.open ? C.open : C.ink,
    w: await measure(r.name, FS.name, 600),
  });
  text(COL.title, y + 4, r.title, { size: FS.role, fill: C.slate, w: await measure(r.title, FS.role) });
  text(COL.loc, y + 4, r.loc, { size: FS.loc, fill: C.muted, w: await measure(r.loc, FS.loc) });

  if (r.assistant) {
    text(countRight, y + 3, "ASSISTANT", {
      size: FS.head, weight: 600, fill: C.muted, anchor: "end", tracking: 0.7,
      w: await measure("ASSISTANT", FS.head, 600, 0.7),
    });
  } else if (r.reports > 0) {
    text(countRight, y + 4, String(r.reports), {
      size: FS.count, fill: C.slate, anchor: "end", w: await measure(String(r.reports), FS.count),
    });
  }
}

/* the dotted-line report, written on both of its ends */
if (dotted) {
  const violet = DEPT.Product;
  const put = async (r, label, outgoing) => {
    const i = rows.indexOf(r);
    const y = rowY(i);
    const x = COL.dotted;
    if (outgoing) {
      g.push(`<path d="M ${x} ${n2(y - 1)} H ${n2(x + 17)}" stroke="${violet}" stroke-width="1.3" stroke-dasharray="4 3" stroke-linecap="round" fill="none"/>`);
      g.push(`<path d="M ${n2(x + 17)} ${n2(y - 5)} L ${n2(x + 23)} ${n2(y - 1)} L ${n2(x + 17)} ${n2(y + 3)} Z" fill="${violet}"/>`);
    } else {
      g.push(`<path d="M ${n2(x + 6)} ${n2(y - 1)} H ${n2(x + 23)}" stroke="${violet}" stroke-width="1.3" stroke-dasharray="4 3" stroke-linecap="round" fill="none"/>`);
      g.push(`<path d="M ${n2(x + 6)} ${n2(y - 5)} L ${n2(x)} ${n2(y - 1)} L ${n2(x + 6)} ${n2(y + 3)} Z" fill="${violet}"/>`);
    }
    text(x + 30, y + 3, label, { size: FS.dot, fill: violet, w: await measure(label, FS.dot) });
  };
  await put(dotted.from, `${dotted.label} · ${dotted.to.name}`, true);
  await put(dotted.to, `${dotted.label} · ${dotted.from.name}`, false);
}

/* ---------- legend: the tree exemplar's two groups, adapted to rows ---------- */
const LEG_X = PANEL_X, LEG_W = Math.ceil(PANEL_W);
g.push(`<rect x="${LEG_X}" y="${LEG_Y}" width="${LEG_W}" height="${LEG_H}" rx="10" fill="${C.panel}" stroke="${C.hair}" stroke-width="1"/>`);
const legHeadY = LEG_Y + 26;
const dx = LEFT, nx = LEG_X + Math.round(LEG_W * 0.36);
text(dx, legHeadY, "DEPARTMENTS", { size: FS.head, weight: 600, fill: C.muted, tracking: 0.8, w: await measure("DEPARTMENTS", FS.head, 600, 0.8) });
text(nx, legHeadY, "NOTATION", { size: FS.head, weight: 600, fill: C.muted, tracking: 0.8, w: await measure("NOTATION", FS.head, 600, 0.8) });
const legRow = (k) => legHeadY + 24 + k * 21;
const depts = ["Executive", "Product", "Engineering", "Operations", "Revenue"];
for (let k = 0; k < depts.length; k++) {
  const y = legRow(k);
  g.push(`<circle cx="${dx + 5.5}" cy="${n2(y - 4)}" r="5.5" fill="${DEPT[depts[k]]}"/>`);
  text(dx + 19, y, depts[k], { size: FS.legend, weight: 500, fill: C.slate, w: await measure(depts[k], FS.legend, 500) });
}
const notation = [
  ["Reporting depth — one indent per level", (y) =>
    `<path d="M ${nx + 3} ${n2(y - 17)} V ${n2(y - 2)}" stroke="${C.guide}" stroke-width="1" fill="none"/>` +
    `<path d="M ${nx + 3} ${n2(y - 11)} H ${nx + 12} M ${nx + 3} ${n2(y - 2)} H ${nx + 12}" stroke="${C.guide}" stroke-width="1" fill="none"/>` +
    `<circle cx="${nx + 17}" cy="${n2(y - 11)}" r="3.2" fill="${C.guide}"/><circle cx="${nx + 17}" cy="${n2(y - 2)}" r="3.2" fill="${C.guide}"/>`],
  ["Dotted-line report", (y) =>
    `<path d="M ${nx} ${n2(y - 5)} h 18" stroke="${DEPT.Product}" stroke-width="1.3" stroke-dasharray="4 3"/>` +
    `<path d="M ${nx + 18} ${n2(y - 9)} L ${nx + 24} ${n2(y - 5)} L ${nx + 18} ${n2(y - 1)} Z" fill="${DEPT.Product}"/>`],
  ["Assistant — beside the chain, not on it", (y) =>
    `<path d="M ${nx + 3} ${n2(y - 17)} V ${n2(y - 2)}" stroke="${C.guide}" stroke-width="1" fill="none"/>` +
    `<path d="M ${nx + 3} ${n2(y - 11)} H ${nx + 11} M ${nx + 11} ${n2(y - 18)} V ${n2(y - 4)}" stroke="${C.slate}" stroke-width="1.2" fill="none"/>` +
    `<circle cx="${nx + 18}" cy="${n2(y - 11)}" r="3.2" fill="${C.guide}"/>`],
  ["Open position", (y) =>
    `<rect x="${nx}" y="${n2(y - 12)}" width="24" height="16" rx="4" fill="${C.openFill}" stroke="${C.open}" stroke-width="1" stroke-dasharray="4 3"/>` +
    `<path d="M ${nx + 8} ${n2(y - 4)} H ${nx + 16} M ${nx + 12} ${n2(y - 8)} V ${n2(y)}" stroke="${C.open}" stroke-width="1.2" stroke-linecap="round"/>`],
];
for (let k = 0; k < notation.length; k++) {
  const y = legRow(k);
  g.push(notation[k][1](y));
  text(nx + 40, y, notation[k][0], { size: FS.legend, weight: 500, fill: C.slate, w: await measure(notation[k][0], FS.legend, 500) });
}

/* ---------- checks ---------- */
const fail = [];
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
for (let i = 0; i < labels.length; i++) {
  for (let j = i + 1; j < labels.length; j++) {
    if (hit(labels[i], labels[j])) fail.push(`text overlaps text: "${labels[i].what}" / "${labels[j].what}"`);
  }
  const l = labels[i];
  if (l.x < 0 || l.x + l.w > W || l.y < 0 || l.y + l.h > H) fail.push(`text off canvas: "${l.what}"`);
}
/* every row's text must stay inside its own column */
const bounds = [
  [LEFT, COL.title - 4],
  [COL.title, COL.loc - 4],
  [COL.loc, COL.dotted - 4],
  [COL.dotted, countRight - countW - 4],
];
for (const l of labels) {
  if (l.y < PANEL_Y || l.y > PANEL_Y + PANEL_H) continue;   // header / legend text
  const col = bounds.find(([a, b]) => l.x >= a - 0.5 && l.x < b);
  if (col && l.x + l.w > col[1]) fail.push(`"${l.what}" runs past its column (${n2(l.x + l.w)} > ${col[1]})`);
}
/* no name may sit on top of an indent guide */
for (const l of labels) {
  for (const gd of guides) {
    if (gd.x >= l.x && gd.x <= l.x + l.w && gd.y0 <= l.y + l.h && gd.y1 >= l.y) {
      fail.push(`indent guide crosses "${l.what}"`);
    }
  }
}
if (fail.length) {
  await browser.close();
  throw new Error(`orgchart list exemplar collisions:\n  ${fail.join("\n  ")}`);
}

/* ---------- write ---------- */
const TITLE = "Lumen Health · Company Directory, Q3 2026";
const desc =
  `A company directory drawn as an indented list: all ${rows.length} people at Lumen Health, five reporting levels deep, one row each. ` +
  "Depth is shown by indentation and thin grey trunk-and-tick guides rather than by connector lines, so the whole company fits a single page that reads top to bottom. " +
  "Every row carries the same columns — name with a department-coloured initials disc, job title, department, office location, dotted-line report and a count of everyone below that person — and the columns are aligned all the way down so any one of them can be scanned on its own. " +
  "Amara Osei, the chief executive, is the first row; Rowan Vale, her chief of staff, is the row below it, marked as an assistant by a capped tick and the word ASSISTANT where a report count would be, because a chief of staff is not a rung of the ladder. " +
  "Four executives follow, each starting a section separated by a darker rule: engineering, product, revenue, and finance and operations. " +
  "One row is filled cream with a dashed amber disc and a plus sign in place of initials — the unfilled mobile platform lead, the only coloured row on the page. " +
  "A violet dashed marker appears on exactly two rows, the head of design and the web engineering lead, naming the design-system accountability that runs between them across departments; the arrow points away from the head of design and into the web lead. " +
  "A legend below the table names the five department colours and the four notation conventions.";
const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" font-family="${FONT}">`);
out.push(`  <title>${esc(TITLE)}</title>`);
out.push(`  <desc>${esc(desc)}</desc>`);
out.push(`  <rect x="0" y="0" width="${W}" height="${H}" fill="${C.page}"/>`);
for (const line of g) out.push(`  ${line}`);
out.push("</svg>");

const target = process.argv[2]
  ? new URL(`file://${process.argv[2]}`)
  : new URL("../../visual-eval/exemplars/orgchart/list/ideal.svg", import.meta.url);
await mkdir(new URL("./", target), { recursive: true });
await writeFile(target, out.join("\n") + "\n");
await browser.close();
console.log(`orgchart list exemplar: ${W}x${H}, ${rows.length} rows, columns at`, COL, `reports right ${countRight}`);
