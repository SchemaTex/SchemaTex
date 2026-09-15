/** Draw visual-eval/exemplars/umlclass/ideal.svg — the look the UML class engine is aiming at.
 *
 *   node scripts/visual-eval/draw-umlclass-exemplar.mjs [out.svg]
 *
 * Subject is the domain model every web developer has written: an online store
 * where customers place orders made of order lines, products sit in categories,
 * and each order is settled by payments that go through a pluggable gateway.
 * It is small enough to read in one look and still needs every piece of the
 * notation — all six relationship kinds, an interface, an abstract class with a
 * merged inheritance tree, an enumeration, static / derived / abstract members,
 * role names, multiplicities and two packages.
 *
 * Geometry is computed, not eyeballed: text is measured in a real browser, every
 * relationship end is asserted to land on a box edge, and nothing is written
 * until every label has been checked against every other label, box, line,
 * adornment, package frame and the canvas edge, every connector against every
 * box, and every pair of connectors for crossings.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";

/* ---------- design tokens ---------- */
const C = {
  paper: "#FFFFFF",
  ink: "#0F172A",      // class names, member names, multiplicities, title
  line: "#334155",     // box outlines, compartment rules, relationship lines, adornments
  muted: "#475569",    // types, role names, association names
  faint: "#64748B",    // visibility glyphs, property strings, subtitle, legend captions
  frame: "#94A3B8",    // package frame outline, header rules
  header: "#EEF2F7",   // name compartment tint
  pkg: "#F8FAFC",      // package body
  accent: "#2563EB",   // «interface» / «enumeration» keywords only
};
const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const FS = { title: 20, sub: 11, pkg: 12, name: 13.5, keyword: 11, member: 12, mult: 12, role: 11.5, assoc: 12, legend: 11.5 };
const SW = { box: 1.5, rule: 1, rel: 1.4, frame: 1.25 };
const DASH = "6 4";
const TRI = { h: 15, w: 18 };          // generalization / realization head
const DIA = { l: 24, w: 13 };          // aggregation / composition diamond
const ARR = { l: 12, s: 6 };           // open arrowhead (navigability, dependency)
const PAD_X = 12, ROW = 19, COMP_PAD = 7, EMPTY_H = 10;

/* ---------- scene records ---------- */
const g = [];          // graphics in paint order
const boxes = {};      // classifier id -> {x, y, w, h}
const conns = [];      // {rel, a:[x,y], b:[x,y]} every connector segment
const frames = [];     // package frame segments
const adorn = [];      // adornment bounding rects
const labels = [];     // edge / legend labels to check
const ends = [];       // {rel, box, p} relationship ends that must sit on a box edge

const n2 = (v) => Number(v.toFixed(2));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pts = (p) => p.map(([x, y]) => `${n2(x)},${n2(y)}`).join(" ");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<canvas id=c></canvas>");
const cache = new Map();
const measure = async (s, fs, weight = 400, italic = false) => {
  const f = `${italic ? "italic " : ""}${weight} ${fs}px ${FONT}`;
  const key = `${f}|${s}`;
  if (!cache.has(key)) cache.set(key, await page.evaluate(([t, font]) => {
    const ctx = document.getElementById("c").getContext("2d");
    ctx.font = font;
    return ctx.measureText(t).width;
  }, [s, f]));
  return cache.get(key);
};

/* ---------- the model (mirrors source.sx) ---------- */
const MODEL = {
  OrderStatus: { keyword: "«enumeration»", attrs: ["PENDING", "PAID", "SHIPPED", "CANCELLED"], ops: [] },
  Customer: { attrs: ["- id: UUID", "- email: String"], ops: ["+ placeOrder(): Order"] },
  Category: { attrs: ["- name: String", "- slug: String"], ops: [] },
  Order: {
    attrs: ["- id: UUID", "- placedAt: Instant", "- status: OrderStatus", "+ /total: Money"],
    ops: ["+ addLine(product: Product, qty: int): void", "+ checkout(): Payment"],
  },
  Product: { attrs: ["- sku: String", "- name: String", "- price: Money"], ops: ["+ isAvailable(): boolean"] },
  OrderLine: {
    attrs: [{ s: "+ MAX_QUANTITY: int = 99", static: true }, "- quantity: int", "- unitPrice: Money"],
    ops: ["+ subtotal(): Money"],
  },
  PaymentGateway: { keyword: "«interface»", attrs: [], ops: ["+ authorize(amount: Money): AuthResult", "+ capture(authId: String): void"] },
  Payment: {
    abstract: true, attrs: ["- amount: Money", "- paidAt: Instant [0..1]"],
    ops: ["+ process(gateway: PaymentGateway): boolean", { s: "+ refund(): void", abstract: true }],
  },
  StripeGateway: { attrs: ["- apiKey: String"], ops: ["+ authorize(amount: Money): AuthResult", "+ capture(authId: String): void"] },
  CardPayment: { attrs: ["- cardLast4: String", "- expiry: YearMonth"], ops: [] },
  WalletPayment: { attrs: ["- walletId: String"], ops: [] },
  BankTransfer: { attrs: ["- iban: String", "- reference: String"], ops: [] },
};
const norm = (m) => (typeof m === "string" ? { s: m } : m);

/** Split a member string into coloured runs: glyph faint, names ink, types muted, {props} faint. */
function runs(member, literal) {
  if (literal) return [[member, C.ink]];
  const out = [];
  let s = member;
  if (/^[+\-#~] /.test(s)) { out.push([s.slice(0, 2), C.faint]); s = s.slice(2); }
  // tokens: ": Type" (muted) until , ) = [ { or end; "[..]" muted; "{..}" faint; rest ink
  let i = 0, buf = "";
  const flush = (col) => { if (buf) out.push([buf, col]); buf = ""; };
  while (i < s.length) {
    const ch = s[i];
    if (ch === ":") {
      flush(C.ink);
      let j = i + 1;
      while (j < s.length && !",)=[{".includes(s[j])) j++;
      // keep the trailing space before = [ { with the type run
      out.push([s.slice(i, j), C.muted]);
      i = j;
    } else if (ch === "[" || ch === "{") {
      flush(C.ink);
      const close = ch === "[" ? "]" : "}";
      const j = s.indexOf(close, i) + 1;
      out.push([s.slice(i, j), ch === "[" ? C.muted : C.faint]);
      i = j;
    } else { buf += ch; i++; }
  }
  flush(C.ink);
  return out;
}

/* ---------- classifier sizing ---------- */
const SIZE = {};
for (const [id, spec] of Object.entries(MODEL)) {
  const literal = spec.keyword === "«enumeration»";
  let w = await measure(id, FS.name, 600, !!spec.abstract);
  if (spec.keyword) w = Math.max(w, await measure(spec.keyword, FS.keyword));
  for (const m of [...spec.attrs, ...spec.ops].map(norm))
    w = Math.max(w, await measure(m.s, FS.member, 400, !!m.abstract));
  const nameH = spec.keyword || spec.abstract ? 50 : 34;
  const comp = (n) => (n ? COMP_PAD * 2 + ROW * n : EMPTY_H);
  SIZE[id] = { w: Math.ceil(w + PAD_X * 2), nameH, attrsH: comp(spec.attrs.length), opsH: comp(spec.ops.length), literal };
  SIZE[id].h = nameH + SIZE[id].attrsH + SIZE[id].opsH;
}
const colW = (...ids) => Math.max(160, ...ids.map((i) => SIZE[i].w));
const rowH = (...ids) => Math.max(...ids.map((i) => SIZE[i].h));

/* ---------- layout ---------- */
const M = 44;
const PKG_TOP = 112, TAB_H = 24, PKG_PAD = 30, PKG_PAD_TOP = 30, PKG_GAP = 64;
const GAP_X = 128;                    // ordering: between the two columns (OrderLine -> Product labels live here)
const GAP_Y0 = 88, GAP_Y1 = 100;      // row gaps
const SUB_GAP = 30, GAP_PS = 84;      // payments: between subclasses; Payment -> StripeGateway

const W1 = colW("OrderStatus", "Category", "Product");
const W2 = colW("Customer", "Order", "OrderLine");
const WG = colW("PaymentGateway", "StripeGateway");
const WS = colW("CardPayment", "WalletPayment", "BankTransfer");
const WP = colW("Payment");

const y0 = PKG_TOP + TAB_H + PKG_PAD_TOP;
const y1 = y0 + rowH("OrderStatus", "Customer", "PaymentGateway") + GAP_Y0;
const y2 = y1 + rowH("Category", "Order", "Payment", "StripeGateway") + GAP_Y1;
const rowBottom = y2 + rowH("OrderLine", "Product", "CardPayment", "WalletPayment", "BankTransfer");

const oFx = M;
const c1 = oFx + PKG_PAD, c2 = c1 + W1 + GAP_X;
const oFr = c2 + W2 + PKG_PAD;
const pFx = oFr + PKG_GAP, p0 = pFx + PKG_PAD;
const subX = [p0, p0 + WS + SUB_GAP, p0 + 2 * (WS + SUB_GAP)];
const payX = subX[1] + WS / 2 - WP / 2;
const gwX = payX + WP + GAP_PS;
const pFr = Math.max(gwX + WG, subX[2] + WS) + PKG_PAD;
const pkgBottom = rowBottom + PKG_PAD;

const W = pFr + M;
const LEGEND_RULE = pkgBottom + 34, LEGEND_Y = LEGEND_RULE + 34;
const H = LEGEND_Y + 30;

const place = { OrderStatus: [c1, y0, W1], Customer: [c2, y0, W2], Category: [c1, y1, W1], Order: [c2, y1, W2],
  Product: [c1, y2, W1], OrderLine: [c2, y2, W2], PaymentGateway: [gwX, y0, WG], Payment: [payX, y1, WP],
  StripeGateway: [gwX, y1, WG], CardPayment: [subX[0], y2, WS], WalletPayment: [subX[1], y2, WS], BankTransfer: [subX[2], y2, WS] };

/* ---------- package frames (UML tabbed folder, name in the tab) ---------- */
async function pkgFrame(name, x0, x1) {
  const tabW = Math.ceil((await measure(name, FS.pkg, 600)) + 22);
  const top = PKG_TOP + TAB_H;
  g.push(`<rect x="${x0}" y="${PKG_TOP}" width="${tabW}" height="${TAB_H}" fill="${C.pkg}" stroke="${C.frame}" stroke-width="${SW.frame}"/>`);
  g.push(`<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${pkgBottom - top}" fill="${C.pkg}" stroke="${C.frame}" stroke-width="${SW.frame}"/>`);
  g.push(`<text x="${x0 + 11}" y="${PKG_TOP + 16.5}" font-size="${FS.pkg}" font-weight="600" fill="${C.line}">${esc(name)}</text>`);
  for (const s of [[[x0, top], [x1, top]], [[x1, top], [x1, pkgBottom]], [[x1, pkgBottom], [x0, pkgBottom]],
    [[x0, pkgBottom], [x0, PKG_TOP]], [[x0, PKG_TOP], [x0 + tabW, PKG_TOP]], [[x0 + tabW, PKG_TOP], [x0 + tabW, top]]])
    frames.push({ name, a: s[0], b: s[1] });
  return { name, x0, x1, y0: PKG_TOP, y1: pkgBottom };
}

/* ---------- classifier boxes ---------- */
async function classBox(id) {
  const spec = MODEL[id], sz = SIZE[id];
  const [x, y, w] = place[id];
  const h = sz.h;
  boxes[id] = { x, y, w, h };
  const out = [];
  out.push(`<g class="classifier" data-id="${id}">`);
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.paper}"/>`);
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${sz.nameH}" fill="${C.header}"/>`);
  const cx = x + w / 2;
  if (spec.keyword) {
    out.push(`<text x="${n2(cx)}" y="${y + 19}" font-size="${FS.keyword}" fill="${C.accent}" text-anchor="middle">${esc(spec.keyword)}</text>`);
    out.push(`<text x="${n2(cx)}" y="${y + 37}" font-size="${FS.name}" font-weight="600" fill="${C.ink}" text-anchor="middle">${esc(id)}</text>`);
  } else if (spec.abstract) {
    out.push(`<text x="${n2(cx)}" y="${y + 23}" font-size="${FS.name}" font-weight="600" font-style="italic" fill="${C.ink}" text-anchor="middle">${esc(id)}</text>`);
    out.push(`<text x="${n2(cx)}" y="${y + 40}" font-size="${FS.keyword}" fill="${C.faint}" text-anchor="middle">{abstract}</text>`);
  } else {
    out.push(`<text x="${n2(cx)}" y="${y + 22}" font-size="${FS.name}" font-weight="600" fill="${C.ink}" text-anchor="middle">${esc(id)}</text>`);
  }
  const rows = async (list, top) => {
    let i = 0;
    for (const m of list.map(norm)) {
      const by = top + COMP_PAD + 13.5 + i * ROW;
      const spans = runs(m.s, sz.literal).map(([t, col]) => `<tspan fill="${col}">${esc(t)}</tspan>`).join("");
      out.push(`<text x="${x + PAD_X}" y="${n2(by)}" font-size="${FS.member}"${m.abstract ? ' font-style="italic"' : ""} xml:space="preserve">${spans}</text>`);
      if (m.static) {
        const gw = await measure(m.s.slice(0, 2), FS.member);
        const tw = await measure(m.s, FS.member);
        out.push(`<line x1="${n2(x + PAD_X + gw)}" y1="${n2(by + 2.5)}" x2="${n2(x + PAD_X + tw)}" y2="${n2(by + 2.5)}" stroke="${C.ink}" stroke-width="0.9"/>`);
      }
      i++;
    }
  };
  await rows(spec.attrs, y + sz.nameH);
  await rows(spec.ops, y + sz.nameH + sz.attrsH);
  out.push(`<line x1="${x}" y1="${y + sz.nameH}" x2="${x + w}" y2="${y + sz.nameH}" stroke="${C.line}" stroke-width="${SW.rule}"/>`);
  out.push(`<line x1="${x}" y1="${y + sz.nameH + sz.attrsH}" x2="${x + w}" y2="${y + sz.nameH + sz.attrsH}" stroke="${C.line}" stroke-width="${SW.rule}"/>`);
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${C.line}" stroke-width="${SW.box}"/>`);
  out.push(`</g>`);
  g.push(out.join("\n"));
}

/* ---------- connectors and adornments ---------- */
// `dir` is the unit vector pointing INTO the box the adornment sits on; the tip is on the box edge.
const perp = ([dx, dy]) => [-dy, dx];
const at = ([x, y], [dx, dy], k) => [x + dx * k, y + dy * k];
function wire(rel, p, dashed = false) {
  for (let i = 0; i + 1 < p.length; i++) conns.push({ rel, a: p[i], b: p[i + 1] });
  g.push(`<polyline points="${pts(p)}" fill="none" stroke="${C.line}" stroke-width="${SW.rel}"${dashed ? ` stroke-dasharray="${DASH}"` : ""} stroke-linejoin="miter"/>`);
}
const bbox = (p) => ({ x0: Math.min(...p.map((q) => q[0])), y0: Math.min(...p.map((q) => q[1])), x1: Math.max(...p.map((q) => q[0])), y1: Math.max(...p.map((q) => q[1])) });
function triangle(tip, dir, record = true) {
  const base = at(tip, dir, -TRI.h), n = perp(dir);
  const p = [tip, at(base, n, TRI.w / 2), at(base, n, -TRI.w / 2)];
  g.push(`<polygon points="${pts(p)}" fill="${C.paper}" stroke="${C.line}" stroke-width="${SW.rel}" stroke-linejoin="miter"/>`);
  if (record) adorn.push(bbox(p));
  return base;
}
function diamond(tip, dir, filled, record = true) {
  const mid = at(tip, dir, -DIA.l / 2), n = perp(dir), far = at(tip, dir, -DIA.l);
  const p = [tip, at(mid, n, DIA.w / 2), far, at(mid, n, -DIA.w / 2)];
  g.push(`<polygon points="${pts(p)}" fill="${filled ? C.line : C.paper}" stroke="${C.line}" stroke-width="${SW.rel}" stroke-linejoin="miter"/>`);
  if (record) adorn.push(bbox(p));
  return far;
}
function openArrow(tip, dir, record = true) {
  const back = at(tip, dir, -ARR.l), n = perp(dir);
  const p = [at(back, n, ARR.s), tip, at(back, n, -ARR.s)];
  g.push(`<polyline points="${pts(p)}" fill="none" stroke="${C.line}" stroke-width="${SW.rel}" stroke-linejoin="miter"/>`);
  if (record) adorn.push(bbox(p));
}
function label(s, x, y, o = {}) {
  labels.push({ s, x, y, fs: o.fs ?? FS.mult, weight: o.weight ?? 400, italic: !!o.italic, anchor: o.anchor ?? "start", fill: o.fill ?? C.ink, tri: o.tri });
}
const mult = (s, x, y, anchor = "start") => label(s, x, y, { fs: FS.mult, weight: 500, fill: C.ink, anchor });
const role = (s, x, y, anchor = "start") => label(s, x, y, { fs: FS.role, fill: C.muted, anchor });
const B = (id) => boxes[id];
const cxOf = (id) => B(id).x + B(id).w / 2;
const DOWN = [0, 1], UP = [0, -1], LEFT = [-1, 0], RIGHT = [1, 0];

/* ---------- header ---------- */
const TITLE = "Online store — ordering and payments";
g.push(`<text x="${M}" y="48" font-size="${FS.title}" font-weight="600" fill="${C.ink}">${esc(TITLE)}</text>`);
g.push(`<text x="${M}" y="72" font-size="${FS.sub}" fill="${C.faint}" letter-spacing="0.6">UML 2.5.1 CLASS DIAGRAM · 12 CLASSIFIERS · 10 RELATIONSHIPS · 2 PACKAGES</text>`);
g.push(`<line x1="${M}" y1="88" x2="${W - M}" y2="88" stroke="${C.frame}" stroke-width="1"/>`);

const pkgs = [await pkgFrame("ordering", oFx, oFr), await pkgFrame("payments", pFx, pFr)];
for (const id of Object.keys(MODEL)) await classBox(id);

/* 1. Customer "1" -- "0..*" Order : places  (plain association, reading direction toward Order) */
{
  const x = cxOf("Customer");
  const a = [x, B("Customer").y + B("Customer").h], b = [x, B("Order").y];
  wire("places", [a, b]);
  ends.push({ rel: "places", box: "Customer", p: a }, { rel: "places", box: "Order", p: b });
  mult("1", x + 8, a[1] + 17);
  mult("0..*", x + 8, b[1] - 8);
  const my = (a[1] + b[1]) / 2 + 4;
  label("places", x - 26, my, { fs: FS.assoc, italic: true, fill: C.muted, anchor: "end", tri: { cx: x - 16, cy: my - 4, dir: DOWN } });
}
/* 2. Order "1" *-- "1..*" lines OrderLine  (composition, filled diamond at the whole) */
{
  const x = cxOf("Order");
  const tip = [x, B("Order").y + B("Order").h], b = [x, B("OrderLine").y];
  const far = diamond(tip, UP, true);
  wire("lines", [far, b]);
  ends.push({ rel: "lines", box: "Order", p: tip }, { rel: "lines", box: "OrderLine", p: b });
  mult("1", x + 13, tip[1] + 20);
  mult("1..*", x + 8, b[1] - 8);
  role("lines", x - 8, b[1] - 8, "end");
}
/* 3. OrderLine "0..*" --> "1" product Product  (navigable association, open arrow at Product) */
{
  const y = B("OrderLine").y + 52;
  const a = [B("OrderLine").x, y], tip = [B("Product").x + B("Product").w, y];
  wire("product", [a, tip]);
  openArrow(tip, LEFT);
  ends.push({ rel: "product", box: "OrderLine", p: a }, { rel: "product", box: "Product", p: tip });
  mult("0..*", a[0] - 9, y - 9, "end");
  mult("1", tip[0] + 16, y - 9);
  role("product", tip[0] + 16, y + 19);
}
/* 4. Category "1..*" o-- "0..*" products Product  (shared aggregation, hollow diamond at the whole) */
{
  const x = cxOf("Category");
  const tip = [x, B("Category").y + B("Category").h], b = [x, B("Product").y];
  const far = diamond(tip, UP, false);
  wire("products", [far, b]);
  ends.push({ rel: "products", box: "Category", p: tip }, { rel: "products", box: "Product", p: b });
  mult("1..*", x + 13, tip[1] + 20);
  mult("0..*", x + 8, b[1] - 8);
  role("products", x - 8, b[1] - 8, "end");
}
/* 5. Order "1" -- "0..*" payments Payment  (plain association across the package boundary) */
{
  const y = B("Payment").y + 74;
  const a = [B("Order").x + B("Order").w, y], b = [B("Payment").x, y];
  wire("payments", [a, b]);
  ends.push({ rel: "payments", box: "Order", p: a }, { rel: "payments", box: "Payment", p: b });
  mult("1", a[0] + 9, y - 9);
  mult("0..*", b[0] - 9, y - 9, "end");
  role("payments", b[0] - 9, y + 19, "end");
}
/* 6. Payment <|-- CardPayment, WalletPayment, BankTransfer  (one shared triangle, merged tree) */
{
  const x = cxOf("Payment");
  const tip = [x, B("Payment").y + B("Payment").h];
  const base = triangle(tip, UP);
  const barY = B("CardPayment").y - 38;
  const kids = ["CardPayment", "WalletPayment", "BankTransfer"].map(cxOf);
  wire("gen", [base, [x, barY]]);
  wire("gen", [[Math.min(...kids), barY], [Math.max(...kids), barY]]);
  for (const k of ["CardPayment", "WalletPayment", "BankTransfer"]) {
    const kx = cxOf(k), top = [kx, B(k).y];
    wire("gen", [[kx, barY], top]);
    ends.push({ rel: `gen:${k}`, box: k, p: top });
  }
  ends.push({ rel: "gen", box: "Payment", p: tip });
}
/* 7. PaymentGateway <|.. StripeGateway  (realization: dashed line, hollow triangle at the interface) */
{
  const x = cxOf("PaymentGateway");
  const tip = [x, B("PaymentGateway").y + B("PaymentGateway").h], b = [x, B("StripeGateway").y];
  const base = triangle(tip, UP);
  wire("real", [base, b], true);
  ends.push({ rel: "real", box: "PaymentGateway", p: tip }, { rel: "real", box: "StripeGateway", p: b });
}
/* 8. Payment ..> PaymentGateway : «use»  (dependency: dashed line, open arrow at the supplier) */
{
  const x = B("Payment").x + B("Payment").w - 46;
  const y = B("PaymentGateway").y + SIZE.PaymentGateway.nameH / 2;
  const a = [x, B("Payment").y], tip = [B("PaymentGateway").x, y];
  wire("use", [a, [x, y], tip], true);
  openArrow(tip, RIGHT);
  ends.push({ rel: "use", box: "Payment", p: a }, { rel: "use", box: "PaymentGateway", p: tip });
  label("«use»", (x + tip[0]) / 2, y - 9, { fs: FS.assoc, fill: C.muted, anchor: "middle" });
}

/* ---------- legend ---------- */
g.push(`<line x1="${M}" y1="${LEGEND_RULE}" x2="${W - M}" y2="${LEGEND_RULE}" stroke="${C.frame}" stroke-width="1"/>`);
{
  const items = [
    ["association", "plain"], ["navigable association", "arrow"], ["aggregation", "odiamond"], ["composition", "fdiamond"],
    ["generalization", "tri"], ["realization", "dtri"], ["dependency", "darrow"],
  ];
  let lx = M;
  const y = LEGEND_Y - 4;
  for (const [cap, kind] of items) {
    const stubL = lx, edge = lx + 50;
    g.push(`<line x1="${edge}" y1="${y - 9}" x2="${edge}" y2="${y + 9}" stroke="${C.line}" stroke-width="${SW.box}"/>`);
    const dashed = kind === "dtri" || kind === "darrow";
    let end = [edge, y];
    if (kind === "odiamond" || kind === "fdiamond") end = diamond([edge, y], RIGHT, kind === "fdiamond", false);
    if (kind === "tri" || kind === "dtri") end = triangle([edge, y], RIGHT, false);
    g.push(`<line x1="${stubL}" y1="${y}" x2="${n2(end[0])}" y2="${y}" stroke="${C.line}" stroke-width="${SW.rel}"${dashed ? ` stroke-dasharray="${DASH}"` : ""}/>`);
    if (kind === "arrow" || kind === "darrow") openArrow([edge, y], RIGHT, false);
    label(cap, edge + 12, y + 4, { fs: FS.legend, fill: C.muted });
    lx = edge + 12 + (await measure(cap, FS.legend)) + 40;
  }
}

/* ---------- verification ---------- */
const bad = [];
const counts = {};
// (a) every relationship end sits on its box edge
for (const e of ends) {
  const b = B(e.box), [x, y] = e.p, eps = 0.01;
  const onV = (Math.abs(x - b.x) < eps || Math.abs(x - b.x - b.w) < eps) && y >= b.y - eps && y <= b.y + b.h + eps;
  const onH = (Math.abs(y - b.y) < eps || Math.abs(y - b.y - b.h) < eps) && x >= b.x - eps && x <= b.x + b.w + eps;
  if (!onV && !onH) bad.push(`end of ${e.rel} is not on the edge of ${e.box}`);
}
counts.endsOnEdge = ends.length;
// (b) no connector segment passes through the inside of a box
const segInRect = ([ax, ay], [bx, by], r, inset) => {
  const x0 = r.x0 + inset, x1 = r.x1 - inset, y0 = r.y0 + inset, y1 = r.y1 - inset;
  if (ay === by) return ay > y0 && ay < y1 && Math.min(ax, bx) < x1 && Math.max(ax, bx) > x0;
  if (ax === bx) return ax > x0 && ax < x1 && Math.min(ay, by) < y1 && Math.max(ay, by) > y0;
  throw new Error("non-orthogonal segment");
};
const R = (b) => ({ x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h });
counts.connectorThroughBox = 0;
for (const s of conns) for (const [id, b] of Object.entries(boxes))
  if (segInRect(s.a, s.b, R(b), 0.5)) { counts.connectorThroughBox++; bad.push(`${s.rel} passes through ${id}`); }
// (c) connector crossings (different relationships)
const cross = (p, q) => {
  const ph = p.a[1] === p.b[1], qh = q.a[1] === q.b[1];
  if (ph === qh) { // parallel: overlap on the same line
    if (ph && p.a[1] === q.a[1]) return Math.min(Math.max(p.a[0], p.b[0]), Math.max(q.a[0], q.b[0])) > Math.max(Math.min(p.a[0], p.b[0]), Math.min(q.a[0], q.b[0]));
    if (!ph && p.a[0] === q.a[0]) return Math.min(Math.max(p.a[1], p.b[1]), Math.max(q.a[1], q.b[1])) > Math.max(Math.min(p.a[1], p.b[1]), Math.min(q.a[1], q.b[1]));
    return false;
  }
  const [h, v] = ph ? [p, q] : [q, p];
  const y = h.a[1], x = v.a[0];
  return x >= Math.min(h.a[0], h.b[0]) && x <= Math.max(h.a[0], h.b[0]) && y >= Math.min(v.a[1], v.b[1]) && y <= Math.max(v.a[1], v.b[1]);
};
counts.connectorCrossings = 0;
for (let i = 0; i < conns.length; i++) for (let j = i + 1; j < conns.length; j++)
  if (conns[i].rel !== conns[j].rel && cross(conns[i], conns[j])) { counts.connectorCrossings++; bad.push(`${conns[i].rel} crosses ${conns[j].rel}`); }
// (d) package frames: boxes wholly inside their frame; count connectors crossing a frame edge
const PKG_OF = { ordering: ["OrderStatus", "Customer", "Category", "Order", "Product", "OrderLine"],
  payments: ["PaymentGateway", "Payment", "StripeGateway", "CardPayment", "WalletPayment", "BankTransfer"] };
for (const p of pkgs) for (const id of PKG_OF[p.name]) {
  const b = B(id);
  if (b.x < p.x0 + 12 || b.x + b.w > p.x1 - 12 || b.y < PKG_TOP + TAB_H + 12 || b.y + b.h > p.y1 - 12) bad.push(`${id} not inside package ${p.name}`);
}
counts.frameEdgeCrossings = 0;
for (const s of conns) for (const f of frames) if (cross(s, f)) counts.frameEdgeCrossings++;
// (e) labels: against labels, boxes, connectors, adornments, frames, canvas
const laid = [];
for (const L of labels) {
  const w = await measure(L.s, L.fs, L.weight, L.italic);
  const x0 = L.anchor === "end" ? L.x - w : L.anchor === "middle" ? L.x - w / 2 : L.x;
  const r = { x0, y0: L.y - L.fs * 0.76, x1: x0 + w, y1: L.y + L.fs * 0.22 };
  if (L.tri) { r.x0 = Math.min(r.x0, L.tri.cx - 5); r.x1 = Math.max(r.x1, L.tri.cx + 5); }
  laid.push({ L, r });
}
const grow = (r, p) => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });
const hit = (p, q) => !(p.x1 <= q.x0 || p.x0 >= q.x1 || p.y1 <= q.y0 || p.y0 >= q.y1);
const segHit = (s, r) => !(Math.max(s.a[0], s.b[0]) < r.x0 || Math.min(s.a[0], s.b[0]) > r.x1 || Math.max(s.a[1], s.b[1]) < r.y0 || Math.min(s.a[1], s.b[1]) > r.y1);
counts.labelCollisions = 0;
const fail = (m) => { counts.labelCollisions++; bad.push(m); };
for (const { L, r } of laid) {
  const b = grow(r, 2.5);
  if (b.x0 < 10 || b.y0 < 10 || b.x1 > W - 10 || b.y1 > H - 10) fail(`"${L.s}" off the sheet`);
  for (const o of laid) if (o.L !== L && hit(b, grow(o.r, 2.5))) fail(`"${L.s}" over "${o.L.s}"`);
  for (const [id, bx] of Object.entries(boxes)) if (hit(b, R(bx))) fail(`"${L.s}" over box ${id}`);
  for (const s of conns) if (segHit(s, b)) fail(`"${L.s}" over the ${s.rel} line`);
  for (const a of adorn) if (hit(b, a)) fail(`"${L.s}" over an adornment`);
  for (const f of frames) if (segHit(f, b)) fail(`"${L.s}" over the ${f.name} frame`);
}
counts.labels = laid.length;
// (f) member text fits its box
for (const [id, spec] of Object.entries(MODEL)) for (const m of [...spec.attrs, ...spec.ops].map(norm))
  if ((await measure(m.s, FS.member, 400, !!m.abstract)) > B(id).w - 2 * PAD_X + 0.5) bad.push(`member "${m.s}" overflows ${id}`);

if (bad.length) { await browser.close(); throw new Error("layout check failed:\n  " + [...new Set(bad)].join("\n  ")); }

/* ---------- write ---------- */
for (const t of labels) {
  g.push(`<text x="${n2(t.x)}" y="${n2(t.y)}" font-size="${t.fs}"${t.weight !== 400 ? ` font-weight="${t.weight}"` : ""}${t.italic ? ' font-style="italic"' : ""} fill="${t.fill}" text-anchor="${t.anchor}">${esc(t.s)}</text>`);
  if (t.tri) { // UML reading-direction triangle beside the association name
    const { cx, cy } = t.tri;
    g.push(`<polygon points="${pts([[cx - 4.5, cy - 3.5], [cx + 4.5, cy - 3.5], [cx, cy + 4]])}" fill="${C.muted}"/>`);
  }
}
const desc = "UML 2.5.1 class diagram of an online store's ordering and payment domain, in two packages drawn as tabbed folders. " +
  "Package ordering holds the enumeration OrderStatus (PENDING, PAID, SHIPPED, CANCELLED), Customer, Category, Order, Product and OrderLine. " +
  "A Customer places zero or more Orders (plain association named places, reading downward, multiplicity 1 at Customer and 0..* at Order). " +
  "An Order is composed of one or more OrderLines under the role lines (filled diamond at Order). Each OrderLine navigates to exactly one Product under the role product (open arrowhead at Product, 0..* at OrderLine). " +
  "A Category aggregates zero or more Products under the role products (hollow diamond at Category, 1..* at Category). " +
  "OrderLine has the static constant MAX_QUANTITY (underlined) and Order the derived attribute /total. " +
  "An Order is linked to zero or more Payments across the package boundary under the role payments. " +
  "Package payments holds the abstract class Payment (italic name, {abstract}, italic abstract operation refund), whose subclasses CardPayment, WalletPayment and BankTransfer meet in one shared hollow triangle; " +
  "the interface PaymentGateway is realised by StripeGateway (dashed line, hollow triangle), and Payment has a «use» dependency on PaymentGateway (dashed line, open arrowhead). " +
  "Classes are three-compartment boxes with a tinted name compartment; member names are dark and types are grey; a legend along the bottom repeats the seven line ends.";
const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}">`);
out.push(`<title>${esc(TITLE)}</title>`);
out.push(`<desc>${esc(desc)}</desc>`);
out.push(`<rect width="${W}" height="${H}" fill="${C.paper}"/>`);
out.push(...g);
out.push(`</svg>`);
const target = process.argv[2]
  ? new URL(`file://${process.argv[2]}`)
  : new URL("../../visual-eval/exemplars/umlclass/ideal.svg", import.meta.url);
await mkdir(new URL("./", target), { recursive: true });
await writeFile(target, out.join("\n") + "\n");
await browser.close();
console.log(`umlclass exemplar: ${W}x${H}`, JSON.stringify(counts));
