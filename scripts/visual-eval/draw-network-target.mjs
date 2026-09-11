/** Draw the network cases' `ideal.svg` — the targets the engine is aiming at.
 *
 * All of them reproduce the idiom of `visual-eval/exemplars/network/ideal.svg`
 * (itself promoted from `network-industrial-plant-ethernet`, which is why that
 * case is not redrawn here): one consistent line-art icon family, a bold name
 * under or beside each icon with the address on a lighter second line, link
 * type carried by weight and colour with the properties spelled out beside the
 * line on a white knock-out, security and addressing boundaries as nested
 * rounded frames, and orthogonal routing.
 *
 * A shared kit draws the parts; each case has its own layout, because a campus
 * tier stack, a Clos fabric and a two-site VPN want genuinely different
 * pictures and one router good enough for all of them would draw every one of
 * them worse than choosing the shape by hand.
 *
 * Text widths are measured in a real browser, and every drawing is checked
 * label-against-label, label-against-icon and label-against-canvas-edge before
 * it is written — a target that collides is worse than no target, because the
 * judge then scores the engine against it.
 *
 *   node scripts/visual-eval/draw-network-target.mjs            # all cases
 *   node scripts/visual-eval/draw-network-target.mjs office-branch
 */
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const FONT = "Verdana, sans-serif";

const INK = "#182b3b";
const MUTED = "#536979";
const EDGE = "#304b60";
const FIBER = "#087d92";
const SCREEN = "#e4edf2";
const POE = "#2f7d4f";
const VPN = "#6b3fa0";

const VLAN_TINTS = [
  { ink: "#1f6f8b", fill: "#e8f2f6" },
  { ink: "#985921", fill: "#fbf0e2" },
  { ink: "#4a7a3a", fill: "#edf5e9" },
  { ink: "#6b3fa0", fill: "#f0ebf8" },
  { ink: "#a34a4a", fill: "#fbecec" },
];

const FRAME = {
  site:   { stroke: "#47768c", fill: "#f5fafc", dash: "" },
  zone:   { stroke: "#47768c", fill: "#f5fafc", dash: "" },
  subnet: { stroke: "#47768c", fill: "#f5fafc", dash: '10 6' },
  dmz:    { stroke: "#b7853c", fill: "#fffaf1", dash: '10 6' },
  tier:   { stroke: "#cbd8e0", fill: "#f8fafc", dash: "" },
};

/** Icon half-extents, so links attach to an edge rather than a guessed point. */
const BOX = {
  switch: [56, 21], l3switch: [56, 21], poeswitch: [56, 21],
  router: [40, 40], firewall: [54, 30], server: [30, 38],
  pc: [45, 38], laptop: [48, 30], monitor: [48, 34], printer: [36, 32],
  ipphone: [32, 30], ap: [36, 26], internet: [100, 52],
  nvr: [52, 26], storage: [32, 40],
  "camera-dome": [32, 24], "camera-bullet": [38, 20], "camera-ptz": [30, 28],
};

const DEFS = `
<g id="switch"><rect class="device" x="-56" y="-21" width="112" height="42" rx="3"/><path d="M-43 -5h12v12h-12z m20 0h12v12h-12z m20 0h12v12H-3z m20 0h12v12H17z" fill="${EDGE}"/><circle cx="43" cy="1" r="4" fill="${FIBER}"/></g>
<g id="l3switch"><rect class="device" x="-56" y="-21" width="112" height="42" rx="3"/><path d="M-43 -5h12v12h-12z m20 0h12v12h-12z m20 0h12v12H-3z" fill="${EDGE}"/><rect x="23" y="-9" width="30" height="18" rx="4" fill="${SCREEN}" stroke="${EDGE}" stroke-width="1.5"/><text x="38" y="5" text-anchor="middle" font-size="13" font-weight="bold" fill="${EDGE}">L3</text></g>
<g id="poeswitch"><rect class="device" x="-56" y="-21" width="112" height="42" rx="3"/><path d="M-43 -5h12v12h-12z m20 0h12v12h-12z" fill="${EDGE}"/><rect x="1" y="-9" width="52" height="18" rx="4" fill="#eaf5ee" stroke="${POE}" stroke-width="1.5"/><text x="27" y="5" text-anchor="middle" font-size="13" font-weight="bold" fill="${POE}">PoE</text></g>
<g id="router"><circle class="device" cx="0" cy="0" r="38"/><path d="M-22 -9H14 M-14 9H22" stroke="${EDGE}" stroke-width="2.5" fill="none"/><path d="M14 -9l-8 -5 v10z M-14 9l8 5 v-10z" fill="${EDGE}"/><path d="M-9 -22V-4 M9 22V4" stroke="${EDGE}" stroke-width="2.5" fill="none"/><path d="M-9 -22l-5 8h10z M9 22l5 -8h-10z" fill="${EDGE}"/></g>
<g id="firewall"><rect x="-54" y="-30" width="108" height="60" rx="2" fill="#fff2df" stroke="#985921" stroke-width="2.5"/><path d="M-54 -10H54 M-54 10H54 M-18 -30v20 M18 -30v20 M-36 -10v20 M0 -10v20 M36 -10v20 M-18 10v20 M18 10v20" fill="none" stroke="#985921" stroke-width="2"/></g>
<g id="server"><rect class="device" x="-30" y="-38" width="60" height="76" rx="3"/><path d="M-21 -24h42v15h-42z M-21 -1h42v15h-42z" fill="${SCREEN}" stroke="${EDGE}" stroke-width="1.5"/><circle cx="16" cy="-17" r="2.5" fill="${FIBER}"/><circle cx="16" cy="6" r="2.5" fill="${FIBER}"/><path d="M-19 27h25" stroke="${EDGE}" stroke-width="2"/></g>
<g id="storage"><rect class="device" x="-32" y="-40" width="64" height="80" rx="3"/><path d="M-22 -30h44v16h-44z M-22 -8h44v16h-44z M-22 14h44v16h-44z" fill="${SCREEN}" stroke="${EDGE}" stroke-width="1.5"/><circle cx="16" cy="-22" r="2.5" fill="${FIBER}"/><circle cx="16" cy="0" r="2.5" fill="${FIBER}"/><circle cx="16" cy="22" r="2.5" fill="${FIBER}"/></g>
<g id="pc"><rect class="device" x="-45" y="-34" width="90" height="56" rx="3"/><rect x="-37" y="-26" width="74" height="40" fill="${SCREEN}"/><path d="M0 22v15 M-25 38h50" stroke="${EDGE}" stroke-width="3"/></g>
<g id="monitor"><rect class="device" x="-48" y="-32" width="96" height="54" rx="3"/><rect x="-40" y="-24" width="80" height="38" fill="${SCREEN}"/><path d="M-16 22h32 v10h-32z" fill="none" stroke="${EDGE}" stroke-width="2.5"/><path d="M-28 32h56" stroke="${EDGE}" stroke-width="3"/></g>
<g id="laptop"><path class="device" d="M-36 -26h72v42h-72z"/><rect x="-29" y="-19" width="58" height="28" fill="${SCREEN}"/><path class="device" d="M-48 16h96l-6 12h-84z"/></g>
<g id="printer"><rect class="device" x="-26" y="-30" width="52" height="16" rx="2"/><rect class="device" x="-36" y="-14" width="72" height="30" rx="3"/><rect x="-20" y="16" width="40" height="14" fill="${SCREEN}" stroke="${EDGE}" stroke-width="2"/><circle cx="24" cy="-6" r="3.5" fill="${FIBER}"/></g>
<g id="ipphone"><rect class="device" x="-32" y="-8" width="64" height="38" rx="4"/><rect x="-24" y="0" width="26" height="16" fill="${SCREEN}"/><path class="device" d="M-30 -26h60v14h-60z" /><path d="M8 6h18 M8 14h18" stroke="${EDGE}" stroke-width="2"/></g>
<g id="ap"><rect class="device" x="-30" y="0" width="60" height="20" rx="6"/><circle cx="0" cy="10" r="3" fill="${FIBER}"/><path d="M-14 -6a20 20 0 0 1 28 0 M-26 -18a37 37 0 0 1 52 0" fill="none" stroke="${EDGE}" stroke-width="2.5" stroke-linecap="round"/></g>
<g id="internet"><path class="device" d="M-58 22a30 30 0 0 1 4 -59 a38 38 0 0 1 70 -14 a32 32 0 0 1 42 30 a26 26 0 0 1 -6 43z"/></g>
<g id="nvr"><rect class="device" x="-52" y="-26" width="104" height="52" rx="3"/><path d="M-40 -12h44v10h-44z M-40 4h44v10h-44z" fill="${SCREEN}" stroke="${EDGE}" stroke-width="1.5"/><circle cx="32" cy="-6" r="7" fill="none" stroke="${EDGE}" stroke-width="2"/><circle cx="32" cy="12" r="3.5" fill="#a34a4a"/></g>
<g id="camera-dome"><path d="M-30 -18h60" stroke="${EDGE}" stroke-width="3" stroke-linecap="round"/><path class="device" d="M-24 -18a24 24 0 0 0 48 0z"/><circle cx="0" cy="-8" r="7" fill="${EDGE}"/><path d="M0 6v14" stroke="${EDGE}" stroke-width="2.5"/></g>
<g id="camera-bullet"><rect class="device" x="-30" y="-14" width="52" height="26" rx="12"/><rect class="device" x="22" y="-9" width="10" height="16" rx="2"/><circle cx="26" cy="-1" r="3" fill="${EDGE}"/><path d="M-16 -14v-6 h-12" fill="none" stroke="${EDGE}" stroke-width="3" stroke-linecap="round"/></g>
<g id="camera-ptz"><path d="M-26 -22h52" stroke="${EDGE}" stroke-width="3" stroke-linecap="round"/><path d="M0 -22v6" stroke="${EDGE}" stroke-width="3"/><circle class="device" cx="0" cy="0" r="16"/><circle cx="0" cy="0" r="7" fill="${EDGE}"/><path d="M-27 4a27 27 0 0 0 54 0" fill="none" stroke="${EDGE}" stroke-width="2" stroke-dasharray="4 4"/><path d="M-27 4l6 -6 M27 4l-6 -6" stroke="${EDGE}" stroke-width="2" stroke-linecap="round"/></g>
`;

const STYLE = `
text{font-family:${FONT};fill:${INK};font-size:18px}
.title{font-size:30px;font-weight:bold}
.deck{font-size:18px;fill:${MUTED}}
.zone{font-size:23px;font-weight:bold}
.name{font-size:18px;font-weight:bold}
.small{font-size:16px;fill:${MUTED}}
.link{font-size:17px}
.device{fill:white;stroke:${EDGE};stroke-width:2.5}
.wire{fill:none;stroke:${MUTED};stroke-width:3;stroke-linejoin:round}
.fiber{fill:none;stroke:${FIBER};stroke-width:5;stroke-linejoin:round}
.poe{fill:none;stroke:${POE};stroke-width:3.5;stroke-linejoin:round}
.wan{fill:none;stroke:${EDGE};stroke-width:4;stroke-linejoin:round}
.wireless{fill:none;stroke:${MUTED};stroke-width:4;stroke-linecap:round;stroke-dasharray:2 10}
.oob{fill:none;stroke:#9aa9b4;stroke-width:2.5;stroke-linejoin:round;stroke-dasharray:9 6}
.vpn{fill:none;stroke:${VPN};stroke-width:4;stroke-linejoin:round;stroke-dasharray:15 9}
.knock{stroke:none}
`;

// ---------------------------------------------------------------- browser

const browser = await chromium.launch();
const page = await browser.newPage();      // holds the drawing under test
const ruler = await browser.newPage();     // keeps a canvas alive for text metrics
await ruler.setContent("<canvas id=c></canvas>");
const cache = new Map();
const measure = async (text, size, weight = "normal") => {
  const key = `${weight}|${size}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const w = await ruler.evaluate(
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

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n2 = (v) => Math.round(v * 10) / 10;

// ---------------------------------------------------------------- sheet

class Sheet {
  constructor(id, title, deck, w, h) {
    this.id = id;
    this.title = title;
    this.deck = deck;
    this.w = w;
    this.h = h;
    this.frames = [];
    this.wires = [];
    this.icons = [];
    this.labels = [];   // {x,y,w,h,s} in user space, for the collision pass
    this.body = [];     // emitted text and knock-outs, drawn last
    this.dev = {};
  }

  async frame(kind, x, y, w, h, heading) {
    const f = FRAME[kind];
    this.frames.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${f.fill}" stroke="${f.stroke}" stroke-width="2.5"${f.dash ? ` stroke-dasharray="${f.dash}"` : ""}/>`
    );
    if (heading) {
      this.frames.push({ heading, x: x + 24, y: y + 36 });
      this.labels.push({ x: x + 24, y: y + 36 - 19, w: await measure(heading, 23, "bold"), h: 26, s: heading });
    }
    return { x, y, w, h };
  }

  /** Place a device; returns a handle with edge helpers. */
  place(id, kind, x, y) {
    const [hw, hh] = BOX[kind];
    const use = kind.startsWith("camera-") ? kind : kind;
    this.icons.push({ kind: use, x, y, hw, hh });
    const d = {
      id, kind, x, y, hw, hh,
      top: [x, y - hh], bottom: [x, y + hh], left: [x - hw, y], right: [x + hw, y],
      at: (dx, dy) => [x + dx, y + dy],
    };
    this.dev[id] = d;
    return d;
  }

  /** Drop links from one device to several below it: each leaves its own port
   *  and gets its own lane, so no two runs are ever collinear. Returns the
   *  lane each child was given, for placing the link label. */
  fan(parent, children, baseY, step = 18) {
    const n = children.length;
    const span = Math.min(parent.hw * 1.4, 40 * (n - 1));
    const byX = [...children].sort((a, b) => a.x - b.x);
    byX.forEach((c, i) => { c.port = parent.x + (n === 1 ? 0 : -span / 2 + (span / (n - 1)) * i); });
    for (const side of [byX.filter((c) => c.x <= parent.x), byX.filter((c) => c.x > parent.x)]) {
      side.sort((a, b) => Math.abs(b.x - parent.x) - Math.abs(a.x - parent.x));
      side.forEach((c, i) => { c.lane = baseY + i * step; });
    }
    for (const c of children)
      this.wire([[c.port, parent.y + parent.hh], [c.port, c.lane], [c.x, c.lane], c.top], c.style);
    return children;
  }

  wire(points, style = "wire") {
    const d = points.map(([x, y], i) => `${i ? "L" : "M"} ${n2(x)} ${n2(y)}`).join(" ");
    this.wires.push(`<path class="${style}" d="${d}"/>`);
  }

  /** Text placed by its own anchor; `knock` paints white behind it first. */
  async text(x, y, s, { cls = "", size = 18, weight = "normal", anchor = "start", knock = false, fill = "", block = "" } = {}) {
    const w = await measure(s, size, weight);
    const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    if (knock)
      this.body.push(`<rect class="knock" x="${n2(left - 7)}" y="${n2(y - size * 0.82)}" width="${n2(w + 14)}" height="${n2(size * 1.16)}" fill="white"/>`);
    this.body.push(
      `<text x="${n2(x)}" y="${n2(y)}"${cls ? ` class="${cls}"` : ""}${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}${fill ? ` fill="${fill}"` : ""}>${esc(s)}</text>`
    );
    this.labels.push({ x: left, y: y - size * 0.8, w, h: size * 1.1, s, block });
  }

  /** Device caption: bold name, optional address, optional VLAN chip. */
  async caption(d, name, { ip = "", chip = null, side = "below", gap = 26, knock = false } = {}) {
    const block = `cap-${d.id}`;
    if (side === "below") {
      let y = d.y + d.hh + gap;
      await this.text(d.x, y, name, { cls: "name", size: 18, weight: "bold", anchor: "middle", block, knock });
      if (ip) { y += 24; await this.text(d.x, y, ip, { cls: "small", size: 16, anchor: "middle", block, knock }); }
      if (chip) await this.chip(d.x, y + 30, chip, block);
      return;
    }
    if (side === "above") {
      const y = d.y - d.hh - 26;
      await this.text(d.x, y, name, { cls: "name", size: 18, weight: "bold", anchor: "middle", block, knock });
      if (ip) await this.text(d.x, y - 24, ip, { cls: "small", size: 16, anchor: "middle", block, knock });
      return;
    }
    const dir = side === "right" ? 1 : -1;
    const anchor = side === "right" ? "start" : "end";
    const x = d.x + dir * (d.hw + 16);
    let y = d.y - (ip ? 6 : -6);
    await this.text(x, y, name, { cls: "name", size: 18, weight: "bold", anchor, block });
    if (ip) await this.text(x, y + 24, ip, { cls: "small", size: 16, anchor, block });
  }

  async chip(cx, cy, { text, tint }, block = "") {
    const t = VLAN_TINTS[tint % VLAN_TINTS.length];
    const w = (await measure(text, 15, "bold")) + 22;
    this.body.push(
      `<rect x="${n2(cx - w / 2)}" y="${n2(cy - 13)}" width="${n2(w)}" height="26" rx="13" fill="${t.fill}" stroke="${t.ink}" stroke-width="1.5"/>`
    );
    this.body.push(
      `<text x="${n2(cx)}" y="${n2(cy + 5)}" text-anchor="middle" font-size="15" font-weight="bold" fill="${t.ink}">${esc(text)}</text>`
    );
    this.labels.push({ x: cx - w / 2, y: cy - 13, w, h: 26, s: text, block });
  }

  /** A link label sitting on its line, on a white knock-out. */
  async onLine(x, y, s) { await this.text(x, y, s, { cls: "link", size: 17, anchor: "middle", knock: true }); }
  async besideLine(x, y, s) { await this.text(x, y, s, { cls: "link", size: 17, anchor: "start" }); }
  async besideLineEnd(x, y, s) { await this.text(x, y, s, { cls: "link", size: 17, anchor: "end" }); }

  async vlanKey(x, y, entries) {
    await this.text(x, y, "VLANs", { size: 16, weight: "bold", fill: MUTED });
    let cx = x + (await measure("VLANs", 16, "bold")) + 26;
    for (const e of entries) {
      const w = (await measure(e.text, 15, "bold")) + 22;
      await this.chip(cx + w / 2, y - 5, e);
      cx += w + 28;
    }
  }

  render() {
    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}">`);
    o.push(`<title>${esc(this.title)} — ${esc(this.deck)}</title>`);
    o.push(`<desc>${esc(this.desc || "")}</desc>`);
    o.push(`<defs><style>${STYLE}</style>${DEFS}</defs>`);
    o.push(`<rect width="${this.w}" height="${this.h}" fill="white"/>`);
    o.push(`<text x="55" y="54" class="title">${esc(this.title)}</text>`);
    o.push(`<text x="55" y="87" class="deck">${esc(this.deck)}</text>`);
    for (const f of this.frames)
      o.push(typeof f === "string" ? f : `<text x="${f.x}" y="${f.y}" class="zone">${esc(f.heading)}</text>`);
    o.push(...this.wires);
    for (const i of this.icons) o.push(`<use href="#${i.kind}" x="${n2(i.x)}" y="${n2(i.y)}"/>`);
    o.push(...this.body);
    o.push("</svg>");
    return o.join("\n") + "\n";
  }
}

// ---------------------------------------------------------------- verify

const check = async (sheet, svgText) => {
  const boxes = sheet.icons.map((i) => ({ x: i.x - i.hw, y: i.y - i.hh, w: i.hw * 2, h: i.hh * 2, s: i.kind }));
  return page.evaluate(
    ([labels, icons, W, H]) => {
      const pad = 9;
      const hit = (a, c) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;
      const out = [];
      for (let i = 0; i < labels.length; i++) {
        const a = labels[i];
        if (a.x < 8 || a.y < 8 || a.x + a.w > W - 8 || a.y + a.h > H - 8) out.push(`canvas edge: "${a.s}"`);
        for (let j = i + 1; j < labels.length; j++) {
          if (a.block && a.block === labels[j].block) continue;   // one caption's own stack
          if (hit(a, labels[j])) out.push(`label/label: "${a.s}" x "${labels[j].s}"`);
        }
        for (const b of icons) if (hit(a, b)) out.push(`label/icon: "${a.s}" on ${b.s}`);
      }
      return [...new Set(out)];
    },
    [sheet.labels, boxes, sheet.w, sheet.h]
  );
};

// ---------------------------------------------------------------- cases

const CASES = {};

/* ------------------------------------------------ office branch */
CASES["office-branch"] = async () => {
  const s = new Sheet("network-office-branch", "North Harbor Branch Office",
    "ISP edge to user devices · four VLANs across two access switches", 1680, 1300);
  s.desc = "A branch-office network drawn top-down. The Internet, the ISP router, the NGFW and the core switch " +
    "are chained down the middle of the sheet; the core trunks to two access switches, which fan out to seven " +
    "endpoints along the foot: an IP phone, two desktop PCs, two Wi-Fi access points, a laptop and a finance MFP. " +
    "Every link carries its media and speed, uplinks carry the VLAN trunk list, PoE drops are drawn in green and " +
    "the wireless hop as a dotted line. Each endpoint wears a coloured chip naming the VLAN it belongs to, and a " +
    "key under the subtitle lists all four.";

  await s.vlanKey(55, 122, [
    { text: "VLAN 10 Staff", tint: 0 }, { text: "VLAN 20 Guest Wi-Fi", tint: 1 },
    { text: "VLAN 30 Services", tint: 2 }, { text: "VLAN 40 Voice", tint: 3 },
  ]);

  const X = 800;
  const inet = s.place("inet", "internet", X, 245);
  const r1 = s.place("r1", "router", X, 400);
  const fw = s.place("fw1", "firewall", X, 545);
  const core = s.place("core", "l3switch", X, 690);
  const sw1 = s.place("sw1", "switch", 460, 860);
  const sw2 = s.place("sw2", "switch", 1180, 860);

  s.wire([inet.bottom, r1.top], "wan");
  s.wire([r1.bottom, fw.top], "wire");
  s.wire([fw.bottom, core.top], "fiber");
  s.wire([core.bottom, [X, 790], [460, 790], sw1.top], "fiber");
  s.wire([core.bottom, [X, 790], [1180, 790], sw2.top], "fiber");

  await s.besideLine(X + 18, 330, "wan · ISP 500M");
  await s.besideLine(X + 18, 480, "copper · 1G");
  await s.besideLine(X + 18, 625, "fiber · 10G");
  await s.onLine(620, 790, "trunk · VLAN 10,20,30,40 · 1G");
  await s.onLine(1000, 790, "trunk · VLAN 10,20,30,40 · 1G");

  await s.caption(inet, "Internet", { side: "left" });
  await s.caption(r1, "ISP Router", { side: "left" });
  await s.caption(fw, "NGFW", { side: "left" });
  await s.caption(core, "Core Switch", { side: "left" });
  await s.caption(sw1, "Access Switch 1", { side: "left" });
  await s.caption(sw2, "Access Switch 2", { side: "right" });

  const ends = [
    { id: "ph1", kind: "ipphone", x: 200, up: sw1, name: "Reception Phone", ip: "10.20.40.21", style: "poe", label: "PoE · 1G", chip: { text: "VLAN 40 Voice", tint: 3 } },
    { id: "pc1", kind: "pc", x: 400, up: sw1, name: "Reception PC", ip: "10.20.10.21", style: "wire", label: "copper · 1G", chip: { text: "VLAN 10 Staff", tint: 0 } },
    { id: "pc2", kind: "pc", x: 620, up: sw1, name: "Finance PC", ip: "10.20.10.22", style: "wire", label: "copper · 1G", chip: { text: "VLAN 10 Staff", tint: 0 } },
    { id: "ap1", kind: "ap", x: 840, up: sw1, name: "Reception Wi-Fi AP", ip: "", style: "poe", label: "PoE · 1G", chip: { text: "VLAN 20 Guest Wi-Fi", tint: 1 } },
    { id: "ap2", kind: "ap", x: 1090, up: sw2, name: "Office Wi-Fi AP", ip: "", style: "poe", label: "PoE · 1G", chip: { text: "VLAN 20 Guest Wi-Fi", tint: 1 } },
    { id: "lt1", kind: "laptop", x: 1310, up: sw2, name: "Sales Laptop", ip: "10.20.20.31", style: "wireless", label: "wireless", chip: { text: "VLAN 10 Staff", tint: 0 } },
    { id: "pr1", kind: "printer", x: 1530, up: sw2, name: "Finance MFP", ip: "10.20.30.50", style: "wire", label: "copper · 1G", chip: { text: "VLAN 30 Services", tint: 2 } },
  ];
  for (const e of ends) {
    e.dev = s.place(e.id, e.kind, e.x, 1085);
    e.top = e.dev.top;
  }
  for (const up of [sw1, sw2]) {
    const kids = ends.filter((e) => e.up === up);
    s.fan(up, kids, 950);
    for (const e of kids) {
      const mid = (e.lane + e.top[1]) / 2 + 6;
      if (e.x > s.w - 280) await s.besideLineEnd(e.x - 12, mid, e.label);
      else await s.besideLine(e.x + 12, mid, e.label);
      await s.caption(e.dev, e.name, { ip: e.ip, chip: e.chip });
    }
  }
  return s;
};

/* ------------------------------------------------ campus three tier */
CASES["campus-three-tier"] = async () => {
  const s = new Sheet("network-campus-three-tier", "University Campus Three-Tier Network",
    "WAN edge · core · distribution · access, with three user VLANs", 1520, 1400);
  s.desc = "A campus network drawn as four labelled tier bands stacked down the sheet — edge, core, " +
    "distribution and access — with the research and Internet WAN above them and the user endpoints below. " +
    "The campus edge router and the perimeter firewall sit in the edge band, the core switch pair in the core " +
    "band, the science and library distribution switches in the distribution band, and the two access switches " +
    "plus the campus Wi-Fi access point in the access band. Every link is annotated with media, speed and either " +
    "its VLAN trunk list or its access VLAN, and each endpoint wears a chip naming its VLAN.";

  await s.vlanKey(55, 122, [
    { text: "VLAN 10 Science", tint: 0 }, { text: "VLAN 20 Staff", tint: 1 }, { text: "VLAN 30 Wireless", tint: 2 },
  ]);

  const bandX = 55, bandW = 1410;
  await s.frame("tier", bandX, 300, bandW, 170, "Edge");
  await s.frame("tier", bandX, 510, bandW, 170, "Core");
  await s.frame("tier", bandX, 720, bandW, 170, "Distribution");
  await s.frame("tier", bandX, 930, bandW, 180, "Access");

  const inet = s.place("inet", "internet", 760, 196);
  const edge = s.place("edge", "router", 620, 400);
  const fw = s.place("fw", "firewall", 900, 400);
  const core = s.place("core", "l3switch", 760, 610);
  const dista = s.place("dista", "l3switch", 520, 820);
  const distb = s.place("distb", "l3switch", 1080, 820);
  const acca = s.place("acca", "switch", 420, 1030);
  const ap = s.place("ap", "ap", 720, 1035);
  const accb = s.place("accb", "switch", 1080, 1030);

  s.wire([inet.bottom, [760, 282], [620, 282], edge.top], "wan");
  s.wire([edge.right, fw.left], "fiber");
  s.wire([fw.bottom, [900, 500], [760, 500], core.top], "fiber");
  s.wire([core.bottom, [760, 700], [520, 700], dista.top], "fiber");
  s.wire([core.bottom, [760, 700], [1080, 700], distb.top], "fiber");
  s.wire([dista.bottom, [520, 910], [420, 910], acca.top], "wire");
  s.wire([distb.bottom, [1080, 910], accb.top], "wire");
  s.wire([acca.right, [720, 1030], ap.at(0, 20)], "poe");

  await s.onLine(690, 282, "wan · 10G");
  await s.onLine(760, 393, "fiber · 10G");
  await s.besideLine(915, 470, "fiber · 10G");
  await s.onLine(640, 700, "trunk · VLAN 10,20,30 · 10G");
  await s.onLine(950, 700, "trunk · VLAN 10,20,30 · 10G");
  await s.onLine(470, 902, "trunk · VLAN 10,30 · 1G");
  await s.besideLine(1095, 910, "trunk · VLAN 20,30 · 1G");
  await s.onLine(580, 1024, "PoE · VLAN 30");

  const lab = s.place("lab", "pc", 420, 1230);
  const student = s.place("student", "laptop", 720, 1240);
  const staffpc = s.place("staffpc", "pc", 1080, 1230);
  s.wire([acca.bottom, [420, 1140], lab.top], "wire");
  s.wire([ap.at(0, 20), [720, 1150], student.top], "wireless");
  s.wire([accb.bottom, [1080, 1140], staffpc.top], "wire");
  await s.besideLine(435, 1170, "access · 1G");
  await s.besideLine(735, 1180, "wireless");
  await s.besideLine(1095, 1170, "access · 1G");

  await s.caption(edge, "Campus edge router", { side: "left" });
  await s.caption(fw, "Perimeter firewall", { side: "right" });
  await s.caption(core, "Core switch pair", { side: "right" });
  await s.caption(dista, "Science distribution", { side: "left" });
  await s.caption(distb, "Library distribution", { side: "right" });
  await s.caption(acca, "Science access switch", { side: "left" });
  await s.caption(accb, "Library access switch", { side: "right" });
  await s.caption(ap, "Campus Wi-Fi AP", { side: "right", gap: 0 });
  await s.caption(inet, "Research and Internet WAN", { side: "left" });
  await s.caption(lab, "Science lab workstation", { ip: "10.10.10.21", chip: { text: "VLAN 10 Science", tint: 0 } });
  await s.caption(student, "Student laptop", { ip: "10.10.30.21", chip: { text: "VLAN 30 Wireless", tint: 2 } });
  await s.caption(staffpc, "Library staff workstation", { ip: "10.10.20.21", chip: { text: "VLAN 20 Staff", tint: 1 } });
  return s;
};

/* ------------------------------------------------ hospital */
CASES["hospital-segmented-clinical"] = async () => {
  const s = new Sheet("network-hospital-segmented-clinical", "Hospital Segmented Clinical Network",
    "One NGFW, one clinical core, four separated segments", 1620, 1260);
  s.desc = "A hospital network drawn as three labelled tier bands — edge, core and access — with the Internet " +
    "and health-exchange WAN above and representative endpoints below. A single healthcare next-generation " +
    "firewall sits in the edge band and the clinical core switch in the core band; the clinical, biomedical and " +
    "administrative access switches and the patient guest Wi-Fi access point sit in the access band. Each " +
    "downlink is annotated with its VLAN and speed, and each endpoint wears a chip naming the segment it " +
    "belongs to, so clinical, biomedical, administrative and guest traffic can be told apart at a glance.";

  await s.vlanKey(55, 122, [
    { text: "VLAN 10 Clinical", tint: 0 }, { text: "VLAN 20 Biomedical", tint: 1 },
    { text: "VLAN 30 Administration", tint: 2 }, { text: "VLAN 40 Guest", tint: 3 },
  ]);

  await s.frame("tier", 55, 300, 1510, 160, "Edge");
  await s.frame("tier", 55, 500, 1510, 160, "Core");
  await s.frame("tier", 55, 700, 1510, 200, "Access");

  const inet = s.place("inet", "internet", 720, 196);
  const fw = s.place("fw", "firewall", 720, 380);
  const core = s.place("core", "l3switch", 720, 580);
  const clinical = s.place("clinical", "switch", 300, 790);
  const biomed = s.place("biomed", "switch", 700, 790);
  const admin = s.place("admin", "switch", 1100, 790);
  const guest = s.place("guest", "ap", 1430, 785);

  s.wire([inet.bottom, fw.top], "wan");
  s.wire([fw.bottom, core.top], "fiber");
  s.fan(core, [
    { x: 300, top: clinical.top, style: "wire" },
    { x: 700, top: biomed.top, style: "wire" },
    { x: 1100, top: admin.top, style: "wire" },
  ], 668);
  s.wire([admin.right, [1394, 790]], "poe");

  await s.besideLine(735, 300, "wan · 1G");
  await s.besideLine(735, 490, "fiber · 10G");
  await s.onLine(470, 668, "trunk · VLAN 10 · 1G");
  await s.besideLine(715, 740, "trunk · VLAN 20 · 1G");
  await s.onLine(930, 668, "trunk · VLAN 30,40 · 1G");
  await s.onLine(1275, 782, "PoE · VLAN 40 · 1G");

  const ehr = s.place("ehr", "pc", 300, 1020);
  const mon = s.place("monitorgw", "pc", 700, 1020);
  const billing = s.place("billing", "pc", 1100, 1020);
  const visitor = s.place("visitor", "laptop", 1430, 1030);
  s.wire([clinical.bottom, ehr.top], "wire");
  s.wire([biomed.bottom, mon.top], "wire");
  s.wire([admin.bottom, billing.top], "wire");
  s.wire([[1430, 805], visitor.top], "wireless");
  await s.besideLine(315, 940, "access · 1G");
  await s.besideLine(715, 940, "access · 1G");
  await s.besideLine(1115, 940, "access · 1G");
  await s.besideLine(1445, 945, "wireless");

  await s.caption(inet, "Internet and health exchange", { side: "left" });
  await s.caption(fw, "Healthcare NGFW", { side: "right" });
  await s.caption(core, "Clinical core switch", { side: "right" });
  await s.caption(clinical, "Clinical access switch", { gap: 26, knock: true });
  await s.caption(biomed, "Biomedical access switch", { gap: 26, knock: true });
  await s.caption(admin, "Administrative access switch", { gap: 26, knock: true });
  await s.caption(guest, "Patient guest Wi-Fi", { gap: 32, knock: true });
  await s.caption(ehr, "EHR workstation", { ip: "10.60.10.15", chip: { text: "VLAN 10 Clinical", tint: 0 } });
  await s.caption(mon, "Patient monitor gateway", { ip: "10.60.20.15", chip: { text: "VLAN 20 Biomedical", tint: 1 } });
  await s.caption(billing, "Billing workstation", { ip: "10.60.30.15", chip: { text: "VLAN 30 Administration", tint: 2 } });
  await s.caption(visitor, "Visitor device", { ip: "10.60.40.15", chip: { text: "VLAN 40 Guest", tint: 3 } });
  return s;
};

/* ------------------------------------------------ retail chain */
CASES["retail-store-chain"] = async () => {
  const s = new Sheet("network-retail-store-chain", "Retail Store Chain Network",
    "Three stores on managed SD-WAN into one central service hub", 1520, 1160);
  s.desc = "A retail chain drawn from the managed SD-WAN cloud at the top. The HQ security gateway and the " +
    "retail service hub hang to the left of the cloud on an MPLS link; the north, south and west store routers " +
    "hang below it on separate SD-WAN links. The north store is expanded to show its POS switch trunking three " +
    "VLANs down to a POS terminal, a manager laptop and a guest Wi-Fi access point, each wearing a chip naming " +
    "its VLAN, so payment, management and guest traffic are visibly separated.";

  await s.vlanKey(55, 122, [
    { text: "VLAN 10 Payment", tint: 0 }, { text: "VLAN 20 Management", tint: 1 }, { text: "VLAN 30 Guest Wi-Fi", tint: 2 },
  ]);

  const wan = s.place("wan", "internet", 820, 250);
  const hqfw = s.place("hqfw", "firewall", 300, 250);
  const hub = s.place("hub", "router", 300, 450);
  const north = s.place("north", "router", 600, 470);
  const south = s.place("south", "router", 940, 470);
  const west = s.place("west", "router", 1280, 470);

  s.wire([wan.left, hqfw.right], "wan");
  s.wire([hqfw.bottom, hub.top], "fiber");
  s.fan(wan, [
    { x: 600, top: north.top, style: "wan" },
    { x: 940, top: south.top, style: "wan" },
    { x: 1280, top: west.top, style: "wan" },
  ], 360);

  await s.onLine(520, 250, "wan · MPLS");
  await s.besideLine(315, 370, "fiber · 10G");
  await s.onLine(700, 360, "wan · SD-WAN");
  await s.onLine(880, 378, "wan · SD-WAN");
  await s.onLine(1070, 360, "wan · SD-WAN");

  const pos = s.place("pos", "switch", 600, 680);
  s.wire([north.bottom, pos.top], "wire");
  await s.besideLine(615, 585, "trunk · VLAN 10,20,30 · 1G");

  const till = s.place("till", "pc", 330, 890);
  const manager = s.place("manager", "laptop", 600, 900);
  const guest = s.place("guest", "ap", 850, 900);
  s.wire([pos.bottom, [600, 790], [330, 790], till.top], "wire");
  s.wire([pos.bottom, [600, 790], manager.top], "wire");
  s.wire([pos.bottom, [600, 790], [850, 790], guest.at(0, -6)], "poe");
  await s.besideLine(345, 822, "access · 1G");
  await s.besideLine(615, 826, "access · 1G");
  await s.besideLine(865, 826, "PoE · 1G");

  await s.caption(wan, "Managed SD-WAN", { side: "right" });
  await s.caption(hqfw, "HQ security gateway", { side: "left" });
  await s.caption(hub, "Retail service hub", { side: "left" });
  await s.caption(north, "North store router", { side: "left" });
  await s.caption(south, "South store router", { gap: 24 });
  await s.caption(west, "West store router", { gap: 24 });
  await s.caption(pos, "North POS switch", { side: "left" });
  await s.caption(till, "North POS terminal", { ip: "10.50.10.11", chip: { text: "VLAN 10 Payment", tint: 0 } });
  await s.caption(manager, "North manager laptop", { ip: "10.50.20.11", chip: { text: "VLAN 20 Management", tint: 1 } });
  await s.caption(guest, "North guest Wi-Fi", { chip: { text: "VLAN 30 Guest Wi-Fi", tint: 2 }, gap: 34 });
  return s;
};

/* ------------------------------------------------ CCTV */
CASES["cctv-installation"] = async () => {
  const s = new Sheet("network-cctv-installation", "Warehouse CCTV Installation",
    "PoE cameras on one subnet, recording and viewing on another", 1700, 1020);
  s.desc = "A warehouse surveillance network split across two labelled addressing boundaries. The video " +
    "boundary, 192.168.60.0/24, holds the two PoE access switches and four cameras drawn as three " +
    "distinguishable types: two ceiling domes, a bullet and a pan-tilt-zoom. Every camera drop is a green PoE " +
    "link carrying its own cable type. The recording boundary, 192.168.50.0/24, holds the NVR, which feeds the " +
    "video storage array over fiber and drives both a guard desk monitor and a guard workstation over copper. A " +
    "security firewall and the security core switch above the two boundaries form the hierarchy into them.";

  await s.frame("subnet", 55, 400, 885, 560, "Video · 192.168.60.0/24");
  await s.frame("subnet", 985, 186, 660, 544, "Recording · 192.168.50.0/24");

  const fw = s.place("fw1", "firewall", 400, 180);
  const core = s.place("core", "l3switch", 400, 330);
  s.wire([fw.bottom, core.top], "fiber");
  await s.besideLine(415, 265, "fiber · 10G");
  await s.caption(fw, "Security Firewall", { side: "right" });
  await s.caption(core, "Security Core", { side: "left" });

  const poe1 = s.place("poe1", "poeswitch", 260, 560);
  const poe2 = s.place("poe2", "poeswitch", 705, 560);
  s.fan(core, [{ x: 260, top: poe1.top, style: "wire" }, { x: 705, top: poe2.top, style: "wire" }], 470);
  await s.onLine(320, 470, "trunk · VLAN 60 · 1G");
  await s.onLine(565, 470, "trunk · VLAN 60 · 1G");
  await s.caption(poe1, "PoE Switch East", { side: "above" });
  await s.caption(poe2, "PoE Switch West", { side: "above" });

  const cams = [
    { id: "cam1", kind: "camera-dome", x: 130, up: poe1, name: "Lobby Dome", ip: "192.168.60.11", label: "PoE · Cat6" },
    { id: "cam2", kind: "camera-dome", x: 390, up: poe1, name: "Aisle Dome", ip: "192.168.60.14", label: "PoE · Cat6" },
    { id: "cam3", kind: "camera-bullet", x: 590, up: poe2, name: "Loading Bay Bullet", ip: "192.168.60.12", label: "PoE · Cat6A" },
    { id: "cam4", kind: "camera-ptz", x: 820, up: poe2, name: "Yard PTZ", ip: "192.168.60.13", label: "PoE · Outdoor Cat6" },
  ];
  for (const c of cams) { c.dev = s.place(c.id, c.kind, c.x, 820); c.top = c.dev.top; c.style = "poe"; }
  for (const up of [poe1, poe2]) {
    const kids = cams.filter((c) => c.up === up);
    s.fan(up, kids, 660);
    for (const [i, c] of kids.entries()) {
      const mid = c.lane + (i % 2 ? 92 : 52);   // stagger, so neighbouring drop labels never meet
      if (c.x > 700) await s.besideLineEnd(c.x - 12, mid, c.label);
      else await s.besideLine(c.x + 12, mid, c.label);
      await s.caption(c.dev, c.name, { ip: c.ip, gap: 32 });
    }
  }

  const nvr = s.place("nvr1", "nvr", 1140, 350);
  const nas = s.place("nas1", "storage", 1520, 350);
  s.wire([core.right, nvr.left], "wire");
  await s.onLine(830, 342, "access · VLAN 50 · 10G");
  s.wire([nvr.right, nas.left], "fiber");
  await s.onLine(1332, 342, "fiber · 10G");
  await s.caption(nvr, "NVR-01", { ip: "192.168.50.10", side: "above" });
  await s.caption(nas, "Video Storage Array", { ip: "192.168.50.11", side: "above" });

  const mon = s.place("mon1", "monitor", 1140, 600);
  const desk = s.place("desk1", "pc", 1500, 600);
  s.fan(nvr, [{ x: 1140, top: mon.top, style: "wire" }, { x: 1500, top: desk.top, style: "wire" }], 480);
  await s.besideLine(1154, 536, "copper · 1G");
  await s.besideLine(1514, 536, "copper · 1G");
  await s.caption(mon, "Guard Desk Monitor", { gap: 32 });
  await s.caption(desk, "Guard Workstation", { ip: "192.168.50.20", gap: 32 });
  return s;
};

/* ------------------------------------------------ spine leaf */
CASES["datacentre-spine-leaf"] = async () => {
  const s = new Sheet("network-datacentre-spine-leaf", "DC1 Spine-Leaf Fabric",
    "Two spines, four leaves, a complete Clos mesh and a separate out-of-band management path", 1760, 1300);
  s.desc = "A two-spine, four-leaf Clos fabric. Both spine switches sit in one row above the four leaf " +
    "switches, and every leaf carries an uplink to each spine, so the eight fabric links form a complete " +
    "two-by-four mesh — the only crossings in the drawing, and the ones the topology requires. One named " +
    "server hangs below each leaf on a 25G link: three compute nodes and one storage node. The out-of-band " +
    "management path is drawn apart from the fabric as a thin dashed grey bus along the foot, with a riser to " +
    "every spine and every leaf, an OOB management switch sitting on the bus and the management gateway below it.";

  const SPY = 260, LFY = 560, SRVY = 840, BUS = 1030;
  const spines = [{ id: "sp1", x: 520, name: "Spine 1" }, { id: "sp2", x: 1060, name: "Spine 2" }];
  const leaves = [
    { id: "lf1", x: 300, name: "Leaf 1", srv: { id: "srv1", name: "Compute 01", kind: "server" }, riser: 460 },
    { id: "lf2", x: 640, name: "Leaf 2", srv: { id: "srv2", name: "Compute 02", kind: "server" }, riser: 800 },
    { id: "lf3", x: 980, name: "Leaf 3", srv: { id: "srv3", name: "Compute 03", kind: "server" }, riser: 1140 },
    { id: "lf4", x: 1320, name: "Leaf 4", srv: { id: "srv4", name: "Storage 01", kind: "storage" }, riser: 1480 },
  ];

  // Out-of-band management first, so the fabric is drawn over it.
  s.wire([[180, BUS], [1560, BUS]], "oob");
  s.wire([[180, BUS], [180, SPY], [spines[0].x - 56, SPY]], "oob");
  s.wire([[1560, BUS], [1560, SPY], [spines[1].x + 56, SPY]], "oob");
  for (const lf of leaves)
    s.wire([[lf.riser, BUS], [lf.riser, LFY], [lf.x + 56, LFY]], "oob");
  for (const x of [180, 1560, ...leaves.map((l) => l.riser)])
    s.wires.push(`<circle cx="${x}" cy="${BUS}" r="4.5" fill="#9aa9b4"/>`);

  for (const sp of spines) { const d = s.place(sp.id, "switch", sp.x, SPY); await s.caption(d, sp.name, { side: "above" }); }
  for (const lf of leaves) { lf.dev = s.place(lf.id, "switch", lf.x, LFY); }

  for (const sp of spines)
    for (const lf of leaves)
      s.wire([[sp.x, SPY + 21], [lf.x, LFY - 21]], "fiber");
  await s.text(790, 430, "every leaf uplinks to both spines", { cls: "link", size: 17, anchor: "middle", knock: true });

  for (const lf of leaves) {
    await s.caption(lf.dev, lf.name, { gap: 30, knock: true });
    const d = s.place(lf.srv.id, lf.srv.kind, lf.x, SRVY);
    s.wire([[lf.x, LFY + 21], d.top], "fiber");
    await s.besideLine(lf.x + 14, 700, "25G");
    await s.caption(d, lf.srv.name, { gap: 30 });
  }

  const oob = s.place("oob", "switch", 790, BUS);
  const mgmt = s.place("mgmt", "router", 790, 1190);
  s.wire([oob.bottom, mgmt.top], "oob");
  await s.besideLine(805, 1120, "copper · 1G");
  await s.caption(oob, "OOB Management Switch", { side: "above", knock: true });
  await s.caption(mgmt, "Management Gateway", { side: "right" });
  await s.text(180, BUS + 42, "out-of-band management", { cls: "small", size: 16, anchor: "start" });
  return s;
};

/* ------------------------------------------------ site to site VPN */
CASES["site-to-site-vpn"] = async () => {
  const s = new Sheet("network-site-to-site-vpn", "HQ to Branch Site-to-Site VPN",
    "Two independently segmented sites joined by an IPsec tunnel over the public Internet", 1780, 1100);
  s.desc = "Two site boundaries drawn side by side with the public Internet between them. Each site holds the " +
    "same chain read bottom to top: analyst workstation, LAN switch, firewall, edge router, then out to the " +
    "Internet on its own ISP link; the branch also has a printer. Inside each site a dashed boundary marks the " +
    "local subnet, 10.10.0.0/24 at headquarters and 10.20.0.0/24 at the branch, around the switch and the " +
    "devices behind it. The two firewalls are joined by a violet dashed IPsec tunnel that runs up out of each " +
    "site and across the gap under the Internet cloud, so the encrypted path is visibly separate from the two " +
    "plain ISP links.";

  await s.frame("site", 55, 240, 640, 800, "Headquarters");
  await s.frame("site", 1085, 240, 640, 800, "Branch Office");
  await s.frame("subnet", 130, 620, 490, 380, "10.10.0.0/24");
  await s.frame("subnet", 1160, 620, 490, 380, "10.20.0.0/24");

  const inet = s.place("inet", "internet", 890, 190);
  await s.caption(inet, "Public Internet", { gap: 34 });

  const hqr = s.place("hqr", "router", 300, 350);
  const hqfw = s.place("hqfw", "firewall", 300, 510);
  const hqsw = s.place("hqsw", "switch", 300, 700);
  const hqpc = s.place("hqpc", "pc", 300, 900);
  const brr = s.place("brr", "router", 1480, 350);
  const brfw = s.place("brfw", "firewall", 1480, 510);
  const brsw = s.place("brsw", "switch", 1480, 700);
  const brpc = s.place("brpc", "pc", 1330, 900);
  const brpr = s.place("brpr", "printer", 1620, 900);

  s.wire([hqpc.top, hqsw.bottom], "wire");
  s.wire([hqsw.top, hqfw.bottom], "wire");
  s.wire([hqfw.top, hqr.bottom], "wire");
  s.wire([hqr.top, [300, 190], inet.left], "wan");
  s.fan(brsw, [{ x: 1330, top: brpc.top, style: "wire" }, { x: 1620, top: brpr.top, style: "wire" }], 790);
  s.wire([brsw.top, brfw.bottom], "wire");
  s.wire([brfw.top, brr.bottom], "wire");
  s.wire([brr.top, [1480, 190], inet.right], "wan");

  s.wire([hqfw.right, [700, 510], [700, 330], [1080, 330], [1080, 510], brfw.left], "vpn");
  await s.onLine(890, 337, "vpn · IPsec AES-256");

  await s.besideLine(315, 810, "access · VLAN 10");
  await s.besideLine(315, 615, "trunk · VLAN 10 · 1G");
  await s.besideLine(315, 452, "copper · 1G");
  await s.besideLine(315, 275, "wan · HQ ISP");
  await s.besideLineEnd(1465, 615, "trunk · VLAN 20 · 1G");
  await s.besideLineEnd(1465, 452, "copper · 1G");
  await s.besideLineEnd(1465, 275, "wan · Branch ISP");
  await s.besideLineEnd(1318, 836, "access · VLAN 20");
  await s.besideLineEnd(1608, 836, "access · VLAN 20");

  await s.caption(hqr, "HQ Edge Router", { side: "right" });
  await s.caption(hqfw, "HQ Firewall", { side: "left" });
  await s.caption(hqsw, "HQ LAN Switch", { side: "right" });
  await s.caption(hqpc, "HQ Analyst", { gap: 30 });
  await s.caption(brr, "Branch Edge Router", { side: "left" });
  await s.caption(brfw, "Branch Firewall", { side: "right" });
  await s.caption(brsw, "Branch LAN Switch", { side: "left" });
  await s.caption(brpc, "Branch Analyst", { gap: 30 });
  await s.caption(brpr, "Branch Printer", { gap: 30 });
  return s;
};

// ---------------------------------------------------------------- run

const want = process.argv.slice(2);
const names = want.length ? want : Object.keys(CASES);
let failed = 0;
for (const name of names) {
  if (!CASES[name]) throw new Error(`no layout for ${name}`);
  const sheet = await CASES[name]();
  const svgText = sheet.render();
  await page.setContent(`<style>html,body{margin:0}</style>${svgText}`);
  const found = await check(sheet, svgText);
  if (found.length) {
    failed++;
    console.error(`network-${name} collides, not written:\n  ${found.join("\n  ")}`);
    continue;
  }
  await writeFile(`visual-eval/cases/network-${name}/ideal.svg`, svgText);
  console.log(`network-${name}: ${sheet.w}x${sheet.h}, ${sheet.icons.length} devices, ${sheet.wires.length} links, 0 collisions`);
}
await browser.close();
if (failed) process.exit(1);
