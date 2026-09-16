/**
 * Hand-authored timeline exemplars: swimlane, gantt and lollipop share one set of tokens.
 *   node scripts/visual-eval/draw-timeline-exemplars.mjs [png-dir]
 * Writes visual-eval/exemplars/timeline/<variant>/ideal.svg. Text bounds come from resvg
 * shaping with Helvetica Neue; every text box is checked against every other text box,
 * every shape and the canvas edge before anything is written. Grid and milestone lines
 * run behind the shapes and are cut around text, so no line crosses a label.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const C = {
  ink: '#1F2933', muted: '#5F6B76', rule: '#D5DAE0', grid: '#E3E7EB',
  band: '#F5F7F9', paper: '#FFFFFF', axis: '#2B3440', milestone: '#B42318',
};
// One hue per track or category, used as a stroke over its own pale tint.
const HUE = [
  { name: 'blue', stroke: '#2F6DB5', fill: '#DDE8F5' },
  { name: 'teal', stroke: '#2A8475', fill: '#D9EEEA' },
  { name: 'amber', stroke: '#A86A12', fill: '#F5E6CB' },
  { name: 'plum', stroke: '#76559F', fill: '#E8E1F2' },
];
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const FS = { title: 22, subtitle: 13, header: 13, label: 12, small: 11 };
const PNG_DIR = process.argv[2];
const OUT = new URL('../../visual-eval/exemplars/timeline/', import.meta.url);

const localFont = '/System/Library/Fonts/HelveticaNeue.ttc';
const font = existsSync(localFont)
  ? { loadSystemFonts: false, fontFiles: [localFont], defaultFontFamily: 'Helvetica Neue' }
  : { loadSystemFonts: true };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cache = new Map();
function measure(s, fs, weight = 400, anchor = 'start') {
  const key = JSON.stringify([s, fs, weight, anchor]);
  if (!cache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="256"><text x="2048" y="128" font-family="${FONT}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text></svg>`;
    const b = new Resvg(svg, { font }).innerBBox();
    if (!b) throw new Error(`Cannot measure ${s}`);
    cache.set(key, { x0: b.x - 2048, y0: b.y - 128, x1: b.x + b.width - 2048, y1: b.y + b.height - 128 });
  }
  return cache.get(key);
}
const width = (s, fs = FS.label, w = 400) => { if (!s) return 0; const m = measure(s, fs, w); return m.x1 - m.x0; };

// ---- dates ------------------------------------------------------------------------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function dayNum(iso) { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; }
function fmt(iso, year = false) { const [y, m, d] = iso.split('-').map(Number); return `${MON[m - 1]} ${d}${year ? `, ${y}` : ''}`; }
function workdays(a, b) { let n = 0; for (let t = dayNum(a); t <= dayNum(b); t++) { const wd = new Date(t * 864e5).getUTCDay(); if (wd && wd < 6) n++; } return n; }

// ---- drawing with checks ----------------------------------------------------------
function Sheet(W, title, subtitle) {
  const els = [], back = [], texts = [], shapes = [], cuts = [];
  const s = {
    W, els, back,
    text(str, x, y, { fs = FS.label, weight = 400, fill = C.ink, anchor = 'start', owner } = {}) {
      const m = measure(str, fs, weight, anchor);
      const r = { x0: x + m.x0, y0: y + m.y0, x1: x + m.x1, y1: y + m.y1, s: str, owner };
      texts.push(r);
      els.push(`<text x="${x}" y="${y}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${esc(str)}</text>`);
      return r;
    },
    rect(x, y, w, h, { fill = 'none', stroke = 'none', sw = 1, rx = 0, owner, obstacle = true, layer = els } = {}) {
      if (obstacle) shapes.push({ x0: x, y0: y, x1: x + w, y1: y + h, owner, kind: 'rect' });
      layer.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
    },
    line(x1, y1, x2, y2, { stroke = C.ink, sw = 1, dash, owner, obstacle = true } = {}) {
      if (obstacle) shapes.push({ x0: Math.min(x1, x2) - sw / 2, y0: Math.min(y1, y2) - sw / 2, x1: Math.max(x1, x2) + sw / 2, y1: Math.max(y1, y2) + sw / 2, owner, kind: 'line' });
      els.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
    },
    diamond(cx, cy, r, { fill = C.ink, stroke = C.paper, sw = 1.5, owner } = {}) {
      shapes.push({ x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r, owner, kind: 'diamond' });
      els.push(`<path d="M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
    },
    circle(cx, cy, r, { fill = C.paper, stroke = C.ink, sw = 2, owner } = {}) {
      shapes.push({ x0: cx - r - sw / 2, y0: cy - r - sw / 2, x1: cx + r + sw / 2, y1: cy + r + sw / 2, owner, kind: 'circle' });
      els.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
    },
    // A vertical line drawn behind everything and cut wherever a text box sits on it.
    vcut(x, y0, y1, { stroke = C.grid, sw = 1, dash } = {}) { cuts.push({ x, y0, y1, stroke, sw, dash }); },
    finish(H, desc) {
      for (const c of cuts) {
        const gaps = texts.filter(t => t.x0 - 3 < c.x && t.x1 + 3 > c.x && t.y1 + 3 > c.y0 && t.y0 - 3 < c.y1)
          .map(t => [t.y0 - 4, t.y1 + 4]).sort((a, b) => a[0] - b[0]);
        let y = c.y0;
        for (const [g0, g1] of [...gaps, [c.y1, c.y1]]) {
          if (g0 > y + 1) back.push(`<line x1="${c.x}" y1="${y}" x2="${c.x}" y2="${Math.min(g0, c.y1)}" stroke="${c.stroke}" stroke-width="${c.sw}"${c.dash ? ` stroke-dasharray="${c.dash}"` : ''}/>`);
          y = Math.max(y, g1);
        }
      }
      const errs = [];
      const hit = (a, b, p = 1) => a.x0 < b.x1 + p && a.x1 + p > b.x0 && a.y0 < b.y1 + p && a.y1 + p > b.y0;
      texts.forEach((t, i) => {
        if (t.x0 < 8 || t.y0 < 8 || t.x1 > W - 8 || t.y1 > H - 8) errs.push(`off canvas: ${t.s}`);
        if (t.y1 - t.y0 < 7) errs.push(`too small: ${t.s}`);
        texts.slice(i + 1).forEach(u => { if (hit(t, u, 2)) errs.push(`text/text: ${t.s} | ${u.s}`); });
        shapes.forEach(sh => {
          if (sh.owner !== undefined && sh.owner === t.owner) return;
          if (hit(t, sh, 2)) errs.push(`text/${sh.kind}: ${t.s} (${sh.owner ?? '-'})`);
        });
      });
      if (errs.length) throw new Error(`${title}\n  ${errs.join('\n  ')}`);
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}">\n<title>${esc(title)}</title>\n<desc>${esc(desc)}</desc>\n<rect width="${W}" height="${H}" fill="${C.paper}"/>\n${s.bg.join('\n')}\n${back.join('\n')}\n${els.join('\n')}\n</svg>\n`;
    },
  };
  // Background shapes go before the cut lines; they are stored separately.
  s.bg = [];
  s.text(title, 40, 50, { fs: FS.title, weight: 600 });
  s.text(subtitle, 40, 74, { fs: FS.subtitle, fill: C.muted });
  return s;
}
const assemble = (sheet, H, desc) => sheet.finish(H, desc);

// Month axis header shared by swimlane and gantt: year band, month row, optional week row.
function monthHeader(sh, { x0, x1, d0, d1, top, labelCol, weeks = false }) {
  const X = iso => x0 + (dayNum(iso) - dayNum(d0)) / (dayNum(d1) - dayNum(d0)) * (x1 - x0);
  sh.rect(40, top, x1 - 40, 24, { fill: C.band, layer: sh.bg, obstacle: false });
  const y0 = d0.slice(0, 4);
  sh.text(y0, x0 + 8, top + 17, { fs: FS.label, weight: 600 });
  if (labelCol) sh.text(labelCol, 52, top + 17, { fs: FS.label, weight: 600, fill: C.muted });
  const [yy, mm] = d0.split('-').map(Number);
  const months = [];
  for (let k = 0; ; k++) {
    const m = (mm - 1 + k) % 12, y = yy + Math.floor((mm - 1 + k) / 12);
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    if (dayNum(start) >= dayNum(d1)) break;
    const nm = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);
    months.push({ m, a: Math.max(X(start), x0), b: Math.min(X(nm), x1), start });
  }
  for (const mo of months) {
    const label = mo.b - mo.a > width(MONTH[mo.m]) + 16 ? MONTH[mo.m] : MON[mo.m];
    sh.text(label, (mo.a + mo.b) / 2, top + 42, { anchor: 'middle', fill: C.ink });
    if (mo.a > x0 + 0.5) sh.line(mo.a, top + 26, mo.a, top + 48, { stroke: C.rule, obstacle: false });
  }
  let bottom = top + 50;
  const weekXs = [];
  if (weeks) {
    for (let t = dayNum(d0); t < dayNum(d1); t += 7) {
      const iso = new Date(t * 864e5).toISOString().slice(0, 10);
      const x = X(iso); weekXs.push(x);
      sh.text(String(Number(iso.slice(8))), x + 4, top + 66, { fs: FS.small, fill: C.muted });
    }
    bottom = top + 74;
  }
  sh.line(40, bottom, x1, bottom, { stroke: C.axis, sw: 1, obstacle: false });
  return { X, months, bottom, weekXs };
}

// =====================================================================================
// Swimlane
// =====================================================================================
function swimlane() {
  const W = 1280, x0 = 236, x1 = 1240, d0 = '2026-01-01', d1 = '2026-07-01';
  const sh = Sheet(W, 'Platform v2 Launch Program', 'Four workstreams on one calendar, January – June 2026 · diamonds mark program milestones');
  const { X, months, bottom } = monthHeader(sh, { x0, x1, d0, d1, top: 96, labelCol: 'Workstream' });
  // Phase (era) row.
  let y = bottom + 8;
  sh.text('Phase', 52, y + 16);
  const eras = [['2026-01-05', '2026-03-31', 'Build'], ['2026-04-01', '2026-06-30', 'Launch']];
  eras.forEach(([a, b, n], i) => {
    const xa = X(a), xb = X(b) + (X('2026-01-02') - X('2026-01-01'));
    sh.rect(xa, y, xb - xa - 2, 24, { fill: i ? '#EEF1F4' : '#F4F1EC', stroke: C.rule, rx: 3, owner: `era${i}` });
    sh.text(n, xa + 10, y + 16, { weight: 600, owner: `era${i}` });
    sh.text(`${fmt(a)} – ${fmt(b)}`, xa + 16 + width(n, FS.label, 600), y + 16, { fill: C.muted, owner: `era${i}` });
  });
  y += 32;
  // Milestone strip.
  const milestones = [['2026-03-13', 'Feature freeze'], ['2026-04-30', 'Public launch']];
  sh.text('Milestones', 52, y + 19);
  milestones.forEach(([d, n], i) => {
    const x = X(d);
    sh.diamond(x, y + 15, 8, { fill: C.milestone, owner: `ms${i}` });
    sh.text(n, x + 14, y + 19, { weight: 600, owner: `ms${i}` });
    sh.text(fmt(d), x + 20 + width(n, FS.label, 600), y + 19, { fill: C.muted, owner: `ms${i}` });
  });
  const msY = y + 24;
  y += 34;
  sh.line(40, y, x1, y, { stroke: C.rule, obstacle: false });

  const tracks = [
    ['Engineering', [['2026-01-05', '2026-03-13', 'Core API rebuild'], ['2026-03-16', '2026-04-24', 'QA hardening']]],
    ['Design', [['2026-01-19', '2026-02-27', 'Design system v2'], ['2026-03-02', '2026-03-27', 'Onboarding flows']]],
    ['Marketing', [['2026-02-16', '2026-04-10', 'Launch collateral'], ['2026-04-13', '2026-05-22', 'Paid campaign']]],
    ['Customer Success', [['2026-03-23', '2026-04-17', 'Beta customer program'], ['2026-04-20', null, 'Help center live'], ['2026-05-04', '2026-06-26', 'Migration office hours']]],
  ];
  const day = X('2026-01-02') - X('2026-01-01');
  const lanesTop = y;
  tracks.forEach(([name, items], ti) => {
    const hue = HUE[ti];
    const rows = [];
    const placed = items.map(([a, b, n], k) => {
      const owner = `t${ti}i${k}`;
      const xa = X(a), xb = b ? X(b) + day : xa;
      const tw = width(n);
      const inside = b && xb - xa >= tw + 20;
      const span = b ? [xa, inside ? xb : xb + 8 + tw] : [xa - 7, xa + 12 + tw];
      let r = rows.findIndex(rw => rw.every(([p, q]) => span[0] > q + 12 || span[1] < p - 12));
      if (r < 0) { rows.push([]); r = rows.length - 1; }
      rows[r].push(span);
      return { xa, xb, n, b, inside, r, owner };
    });
    const laneH = 16 + rows.length * 34;
    if (ti % 2 === 1) sh.rect(40, y, x1 - 40, laneH, { fill: C.band, obstacle: false, layer: sh.bg });
    sh.rect(52, y + 16 + 6, 10, 10, { fill: hue.stroke, rx: 2, owner: `lane${ti}` });
    sh.text(name, 70, y + 16 + 15, { fs: FS.header, weight: 600, owner: `lane${ti}` });
    for (const it of placed) {
      const cy = y + 8 + it.r * 34 + 17;
      if (it.b) {
        sh.rect(it.xa, cy - 11, it.xb - it.xa, 22, { fill: hue.fill, stroke: hue.stroke, sw: 1.25, rx: 4, owner: it.owner });
        sh.text(it.n, it.inside ? it.xa + 10 : it.xb + 8, cy + 4, { owner: it.owner });
      } else {
        sh.circle(it.xa, cy, 5, { stroke: hue.stroke, owner: it.owner });
        sh.text(it.n, it.xa + 12, cy + 4, { owner: it.owner });
      }
    }
    y += laneH;
    sh.line(40, y, x1, y, { stroke: C.rule, obstacle: false });
  });
  for (const mo of months) if (mo.a > x0 + 0.5) sh.vcut(mo.a, lanesTop, y);
  for (const [d] of milestones) sh.vcut(X(d), msY, y, { stroke: C.milestone, sw: 1, dash: '4 3' });
  sh.line(x0, bottom, x0, y, { stroke: C.rule, obstacle: false });
  // Legend.
  y += 34;
  let lx = 52;
  sh.rect(lx, y - 12, 34, 16, { fill: C.band, stroke: C.muted, sw: 1.25, rx: 3, owner: 'lg' }); lx += 44;
  lx = sh.text('Work span, start to end date', lx, y, { fill: C.muted, owner: 'lg' }).x1 + 28;
  sh.circle(lx + 5, y - 4, 5, { stroke: C.muted, owner: 'lg' }); lx += 18;
  lx = sh.text('One-day event', lx, y, { fill: C.muted, owner: 'lg' }).x1 + 28;
  sh.diamond(lx + 8, y - 4, 8, { fill: C.milestone, owner: 'lg' }); lx += 22;
  lx = sh.text('Program milestone (dashed line runs through every lane)', lx, y, { fill: C.muted, owner: 'lg' }).x1;
  return assemble(sh, y + 28, 'Swimlane timeline: four workstream lanes on a shared month axis with two phases and two program milestones.');
}

// =====================================================================================
// Gantt
// =====================================================================================
function gantt() {
  const W = 1320, x0 = 452, x1 = 1280, d0 = '2026-01-05', d1 = '2026-06-08';
  const sh = Sheet(W, 'Riverside Clinic EHR Rollout', 'Planned schedule, one bar per task · weeks start on Monday · durations in working days');
  const { X, months, bottom, weekXs } = monthHeader(sh, { x0, x1, d0, d1, top: 96, weeks: true });
  sh.text('Task', 52, bottom - 8, { weight: 600, fill: C.muted });
  sh.text('Dates', 312, bottom - 8, { weight: 600, fill: C.muted });
  const day = X('2026-01-06') - X('2026-01-05');
  const groups = [
    ['Planning', [['Workflow assessment', '2026-01-05', '2026-01-30'], ['Vendor configuration', '2026-01-26', '2026-02-13'], ['Build sign-off', '2026-02-13']]],
    ['Build', [['Data migration', '2026-02-16', '2026-03-20'], ['Lab and pharmacy interfaces', '2026-02-23', '2026-03-27'], ['Order sets and templates', '2026-03-16', '2026-04-03']]],
    ['Training', [['Super-user training', '2026-03-23', '2026-04-17'], ['All-staff training', '2026-04-06', '2026-04-24']]],
    ['Go-live', [['Dress rehearsal', '2026-04-20', '2026-04-24'], ['Go-live', '2026-04-27'], ['At-the-elbow support', '2026-04-27', '2026-05-22'], ['Legacy system retired', '2026-05-29']]],
  ];
  const RH = 30;
  let y = bottom;
  const top = y;
  let row = 0;
  groups.forEach(([g, tasks], gi) => {
    const hue = HUE[gi];
    const a = tasks.map(t => t[1]).sort()[0];
    const b = tasks.map(t => t[2] ?? t[1]).sort().at(-1);
    // Group summary row.
    const cy = y + RH / 2;
    sh.rect(40, y, x1 - 40, RH, { fill: C.band, obstacle: false, layer: sh.bg });
    sh.text(g, 52, cy + 5, { fs: FS.header, weight: 600 });
    sh.text(`${fmt(a)} – ${fmt(b)}`, 312, cy + 5, { fill: C.muted });
    const xa = X(a), xb = X(b) + day, own = `g${gi}`;
    sh.rect(xa, cy - 4, xb - xa, 7, { fill: C.axis, owner: own });
    els(sh, `<path d="M${xa} ${cy + 3}l0 6l7 -6zM${xb} ${cy + 3}l0 6l-7 -6z" fill="${C.axis}"/>`);
    y += RH; row++;
    tasks.forEach(([n, ta, tb], k) => {
      const cy2 = y + RH / 2, owner = `g${gi}t${k}`;
      sh.text(n, 68, cy2 + 4);
      if (tb) {
        sh.text(`${fmt(ta)} – ${fmt(tb)}`, 312, cy2 + 4, { fill: C.muted });
        const p = X(ta), q = X(tb) + day;
        sh.rect(p, cy2 - 8, q - p, 16, { fill: hue.fill, stroke: hue.stroke, sw: 1.25, rx: 3, owner });
        sh.text(`${workdays(ta, tb)} d`, q + 7, cy2 + 4, { fs: FS.small, fill: C.muted, owner });
      } else {
        sh.text(fmt(ta), 312, cy2 + 4, { fill: C.muted });
        const p = X(ta) + day / 2;
        sh.diamond(p, cy2, 8, { fill: C.ink, owner });
        sh.text(fmt(ta), p + 13, cy2 + 4, { fs: FS.small, weight: 600, owner });
      }
      sh.line(40, y + RH, x1, y + RH, { stroke: C.grid, obstacle: false });
      y += RH; row++;
    });
    sh.line(40, y, x1, y, { stroke: C.rule, obstacle: false });
  });
  weekXs.forEach(x => { if (x > x0 + 0.5) sh.vcut(x, top, y, { stroke: C.grid }); });
  sh.line(x0, 96 + 24, x0, y, { stroke: C.rule, obstacle: false });
  sh.line(300, bottom, 300, y, { stroke: C.rule, obstacle: false });
  y += 34;
  let lx = 52;
  sh.rect(lx, y - 11, 34, 14, { fill: HUE[0].fill, stroke: HUE[0].stroke, sw: 1.25, rx: 3, owner: 'lg' }); lx += 44;
  lx = sh.text('Task, with working days', lx, y, { fill: C.muted, owner: 'lg' }).x1 + 28;
  sh.rect(lx, y - 8, 40, 7, { fill: C.axis, owner: 'lg' });
  els(sh, `<path d="M${lx} ${y - 1}l0 6l7 -6zM${lx + 40} ${y - 1}l0 6l-7 -6z" fill="${C.axis}"/>`); lx += 50;
  lx = sh.text('Phase summary', lx, y, { fill: C.muted, owner: 'lg' }).x1 + 28;
  sh.diamond(lx + 8, y - 4, 8, { fill: C.ink, owner: 'lg' }); lx += 22;
  sh.text('Milestone, zero duration', lx, y, { fill: C.muted, owner: 'lg' });
  return assemble(sh, y + 28, 'Gantt chart: eleven tasks and three milestones in four phases on a week grid, January to May 2026.');
}
function els(sh, s) { sh.els.push(s); }

// =====================================================================================
// Lollipop
// =====================================================================================
function lollipop() {
  const W = 1320, x0 = 70, x1 = 1250, yr0 = 1955, yr1 = 2025;
  const sh = Sheet(W, 'Milestones of Human Spaceflight', 'Twelve firsts, 1957 – 2020, on a proportional year scale · red marks the four turning points');
  const events = [
    ['1957-10-04', 'Sputnik 1, first artificial satellite'],
    ['1961-04-12', 'Yuri Gagarin, first human in orbit', true],
    ['1963-06-16', 'Valentina Tereshkova, first woman in space'],
    ['1965-03-18', 'Alexei Leonov, first spacewalk'],
    ['1969-07-20', 'Apollo 11, first crewed Moon landing', true],
    ['1971-04-19', 'Salyut 1, first space station'],
    ['1981-04-12', 'STS-1, first Space Shuttle flight'],
    ['1990-04-24', 'Hubble Space Telescope launched'],
    ['1998-11-20', 'First ISS module, Zarya', true],
    ['2003-10-15', "Yang Liwei, China's first astronaut"],
    ['2012-05-25', 'Dragon, first commercial ISS berthing'],
    ['2020-05-30', 'Crew Dragon Demo-2, commercial crew', true],
  ];
  const X = iso => { const [y, m, d] = iso.split('-').map(Number); return x0 + ((y + (m - 1) / 12 + (d - 1) / 365) - yr0) / (yr1 - yr0) * (x1 - x0); };
  const MAXW = 176, LH = 16, PAD = 14;
  // Wrap "Name, what" into a bold name line and wrapped description lines.
  const blocks = events.map(([d, label, key], i) => {
    const [name, ...rest] = label.split(', ');
    const lines = [];
    let cur = '';
    for (const w of rest.join(', ').split(' ')) {
      const t = cur ? `${cur} ${w}` : w;
      if (width(t) > MAXW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    const date = fmt(d, true);
    const bw = Math.max(width(date, FS.small, 600), width(name, FS.label, 600), ...lines.map(l => width(l)));
    return { i, d, x: X(d), key, name, lines, date, bw, bh: LH * (2 + lines.length) };
  });
  const TIER = 76, STEM0 = 30, AX = 20; // tier step, first stem length, half axis band height
  // Place in reverse order: a block may overhang later stems only if those stems are shorter.
  const placed = [];
  for (const b of [...blocks].reverse()) {
    let best;
    for (const side of [-1, 1]) {
      const left = b.x + 10 + b.bw > x1 + 50;
      const span = left ? [b.x - 10 - b.bw, b.x] : [b.x, b.x + 10 + b.bw];
      let lo = 0, hi = 9;
      for (const p of placed.filter(p => p.side === side)) {
        if (p.x > span[0] - PAD && p.x < span[1] + PAD) lo = Math.max(lo, p.tier + 1);
        if (b.x > p.span[0] - PAD && b.x < p.span[1] + PAD) hi = Math.min(hi, p.tier - 1);
      }
      if (lo <= hi && (!best || lo < best.tier || (lo === best.tier && side !== (placed[0]?.side ?? 1) && b.i % 2 === (side < 0 ? 0 : 1)))) best = { side, tier: lo, span, left };
    }
    if (!best) throw new Error(`No lollipop slot for ${b.name}`);
    placed.push(Object.assign(b, best));
  }
  const maxT = side => Math.max(0, ...placed.filter(p => p.side === side).map(p => p.tier));
  const heightFor = t => STEM0 + t * TIER;
  const aboveH = heightFor(maxT(-1)) + blocks[0].bh + 20;
  const axisY = 110 + aboveH;
  // Axis band with decade labels inside it.
  sh.rect(x0 - 30, axisY - AX, x1 - x0 + 60, AX * 2, { fill: C.axis, rx: 3, owner: 'axis' });
  for (let yr = 1960; yr <= 2020; yr += 10) {
    const x = X(`${yr}-01-01`);
    sh.text(String(yr), x, axisY + 5, { fs: FS.label, weight: 600, fill: C.paper, anchor: 'middle', owner: 'axis' });
  }
  for (const b of placed) {
    const hue = b.key ? C.milestone : C.axis;
    const edge = axisY + b.side * AX;
    const len = heightFor(b.tier);
    const tipY = edge + b.side * len;
    const own = `e${b.i}`;
    sh.line(b.x, edge, b.x, tipY, { stroke: hue, sw: b.key ? 2 : 1.25, owner: own });
    sh.circle(b.x, tipY, b.key ? 6 : 4.5, { fill: b.key ? C.milestone : C.paper, stroke: hue, sw: 2, owner: own });
    // Text block beside the tip: top of block at the dot for above-axis blocks reversed.
    const tx = b.left ? b.x - 12 : b.x + 12;
    const anchor = b.left ? 'end' : 'start';
    const firstBase = b.side < 0 ? tipY - b.bh + 16 : tipY + 4;
    const ys = [firstBase, firstBase + LH, ...b.lines.map((_, k) => firstBase + LH * (2 + k))];
    // Keep the whole block on the outer side of the dot so the stem never enters it.
    const shift = b.side < 0 ? Math.min(0, (tipY + 4) - (ys.at(-1) + 4)) : 0;
    sh.text(b.date, tx, ys[0] + shift, { fs: FS.small, weight: 600, fill: b.key ? C.milestone : C.muted, owner: own, anchor });
    sh.text(b.name, tx, ys[1] + shift, { fs: FS.label, weight: 600, owner: own, anchor });
    b.lines.forEach((l, k) => sh.text(l, tx, ys[2 + k] + shift, { owner: own, anchor }));
    // A text block must not cross another event's stem.
  }
  const belowH = heightFor(maxT(1)) + blocks[0].bh + 10;
  const H = axisY + AX + belowH + 40;
  return assemble(sh, H, 'Lollipop timeline of twelve human spaceflight firsts with stems alternating above and below a decade axis.');
}

const jobs = { swimlane, gantt, lollipop };
for (const [name, fn] of Object.entries(jobs)) {
  const svg = fn();
  const dir = new URL(`${name}/`, OUT);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('ideal.svg', dir), svg);
  if (PNG_DIR) {
    const png = new Resvg(svg, { font, fitTo: { mode: 'zoom', value: 2 } }).render().asPng();
    await writeFile(`${PNG_DIR}/timeline-${name}.png`, png);
  }
  console.log(`timeline/${name}: ok`);
}
