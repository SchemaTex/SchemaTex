/** Draw visual-eval/symbols/network/ — the network device icons in the network exemplar's style.
 *
 *   node scripts/visual-eval/symbols/draw-network.mjs
 *
 * Constants are lifted from visual-eval/exemplars/network/ideal.svg, so every icon keeps the
 * exemplar's scale (1 viewBox unit = 1 exemplar px) and its one icon family: a white body
 * outlined #304b60 at 2.5, inner panels (screens, drive bays, trays) filled #e4edf2 and outlined
 * #304b60 at 1.5, solid #304b60 port blocks, and a single teal #087d92 status dot or accent.
 * Firewalls alone use the warm brick palette. Symbols the exemplar does not contain are built
 * from the same parts at the same weights.
 *
 * Library-wide rules:
 * - An icon is recognisable in silhouette first. The body outline alone must say "switch",
 *   "server" or "database" before any inner detail is read; details only refine it.
 * - One accent per icon at most: a teal status dot, a teal wave or a teal arrowhead. Teal
 *   means "active / signal", never decoration, and an icon with nothing active carries none.
 * - Icons carry no lettering, except where the convention is lettering itself (NVR, DVR,
 *   PoE, GW). Device names belong to the diagram, below the icon.
 * - Rack-mounted equipment is wide and short (a 1U face); floor-standing and desk equipment is
 *   upright. Relative sizes follow the exemplar: switch 112 x 42, server 60 x 76, PC 90 x 71
 *   with its stand, firewall 108 x 60.
 *
 * Each file is drawn about its centre at the origin and cropped to its inked extent plus 8 units.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const FONT = "Verdana, sans-serif";
const EDGE = "#304b60";     // icon outline, port blocks, stands
const INK = "#182b3b";      // lettering that is part of an icon
const PANEL = "#e4edf2";    // screens, drive bays, trays
const TEAL = "#087d92";     // the one status accent
const BRICK_FILL = "#fff2df", BRICK = "#985921";
const W_BODY = 2.5, W_PANEL = 1.5, W_DETAIL = 2;
const PAD = 8;

const n2 = (v) => Math.round(v * 100) / 100;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** White icon body with the exemplar's outline. */
const body = (x, y, w, h, rx = 3) =>
  `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${rx}" fill="#ffffff" stroke="${EDGE}" stroke-width="${W_BODY}"/>`;
/** Inner panel: a screen, drive bay or tray. */
const panel = (x, y, w, h, stroke = true) =>
  `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="${PANEL}"${stroke ? ` stroke="${EDGE}" stroke-width="${W_PANEL}"` : ""}/>`;
const statusDot = (x, y, r = 2.5) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="${TEAL}"/>`;
const port = (x, y, s = 12) => `<rect x="${n2(x)}" y="${n2(y)}" width="${s}" height="${s}" fill="${EDGE}"/>`;
const stroke = (d, width = W_DETAIL, color = EDGE, cap = "round") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
const letter = (x, y, s, size = 12) =>
  `<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT}" font-size="${size}" font-weight="bold" fill="${INK}" text-anchor="middle">${esc(s)}</text>`;

// Seed round: four icons copied 1:1 from the exemplar, and two built from its parts to set how
// icons it does not contain are made. Order: by ChatDiagram usage.
const SYMBOLS = [
  {
    id: "server", title: "Server",
    engine: "server", dsl: ["server"],
    standard: "Cisco icon convention (tower / rack server with face slots); no formal standard",
    sourceUrl: "https://www.cisco.com/c/en/us/about/brand-center/network-topology-icons.html",
    inExemplar: true, tier: 1, usageUsers: 530,
    notes: "Copied from the exemplar: an upright 60 x 76 body, two drive bays each with a teal activity light, and a bezel line. The engine draws this form.",
    draw: () => [
      body(-30, -38, 60, 76),
      panel(-21, -24, 42, 15), panel(-21, -1, 42, 15),
      statusDot(16, -17), statusDot(16, 6),
      stroke("M -19 27 H 6"),
    ],
  },
  {
    id: "pc", title: "Desktop workstation",
    engine: "pc", dsl: ["pc", "workstation"],
    standard: "Cisco icon convention (monitor on a stand); no formal standard",
    sourceUrl: "https://www.cisco.com/c/en/us/about/brand-center/network-topology-icons.html",
    inExemplar: true, tier: 1, usageUsers: 408,
    notes: "Copied from the exemplar: a 90 x 56 monitor with an unframed screen panel, on a 3-unit stand and foot. No accent: a workstation has no status to show.",
    draw: () => [
      body(-45, -34, 90, 56),
      panel(-37, -26, 74, 40, false),
      stroke("M 0 22 V 37 M -25 38 H 25", 3, EDGE, "butt"),
    ],
  },
  {
    id: "switch", title: "Layer 2 switch",
    engine: "switch", dsl: ["switch"],
    standard: "Cisco icon convention (rack face with port sockets); no formal standard",
    sourceUrl: "https://www.cisco.com/c/en/us/about/brand-center/network-topology-icons.html",
    inExemplar: true, tier: 1, usageUsers: 388,
    notes: "Copied from the exemplar: a wide 112 x 42 1U face with four solid port blocks and a teal link light. The engine draws this form.",
    draw: () => [
      body(-56, -21, 112, 42),
      port(-43, -5), port(-23, -5), port(-3, -5), port(17, -5),
      statusDot(43, 1, 4),
    ],
  },
  {
    id: "firewall", title: "Firewall",
    engine: "firewall", dsl: ["firewall"],
    standard: "Cisco icon convention (brick wall); no formal standard",
    sourceUrl: "https://www.cisco.com/c/en/us/about/brand-center/network-topology-icons.html",
    inExemplar: true, tier: 1, usageUsers: 351,
    notes: "Copied from the exemplar: a 108 x 60 brick wall of three offset courses in the warm brick palette, the only icon allowed a colour other than slate and teal, so the security boundary is findable at a glance. The engine draws this form.",
    draw: () => [
      `<rect x="-54" y="-30" width="108" height="60" rx="2" fill="${BRICK_FILL}" stroke="${BRICK}" stroke-width="${W_BODY}"/>`,
      stroke("M -54 -10 H 54 M -54 10 H 54 M -18 -30 V -10 M 18 -30 V -10 M -36 -10 V 10 M 0 -10 V 10 M 36 -10 V 10 M -18 10 V 30 M 18 10 V 30", W_DETAIL, BRICK, "butt"),
    ],
  },
  {
    id: "router", title: "Router",
    engine: "router", dsl: ["router"],
    standard: "Cisco icon convention (puck with two arrows in and two arrows out); no formal standard",
    sourceUrl: "https://www.cisco.com/c/en/us/about/brand-center/network-topology-icons.html",
    inExemplar: false, tier: 1, usageUsers: 259,
    notes: "Not in the exemplar. The Cisco router puck seen from the front: an 84 x 48 rounded body the width of a PC, with the conventional crossed arrows, two pointing in and two out, in the slate 2 detail weight. Only the outbound heads are teal, the one accent: forwarding is what a router does. Rounded ends (rx 24) keep it from being mistaken for a switch face at a glance.",
    draw: () => {
      const head = (tx, ty, dx, dy, color) => {
        const l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, px = -uy, py = ux;
        return `<path d="M ${n2(tx)} ${n2(ty)} L ${n2(tx - ux * 8 + px * 5)} ${n2(ty - uy * 8 + py * 5)} L ${n2(tx - ux * 8 - px * 5)} ${n2(ty - uy * 8 - py * 5)} Z" fill="${color}"/>`;
      };
      return [
        body(-42, -24, 84, 48, 24),
        // inbound: from the outer corners toward the centre
        stroke("M -27 -13 L -9 -3 M 27 13 L 9 3"),
        head(-9, -3, 18, 10, EDGE), head(9, 3, -18, -10, EDGE),
        // outbound: from the centre toward the other corners
        stroke("M -6 4 L -24 13 M 6 -4 L 24 -13"),
        head(-27, 14.5, -21, 10.5, TEAL), head(27, -14.5, 21, -10.5, TEAL),
      ];
    },
  },
  {
    id: "database", title: "Database server",
    engine: "database", dsl: ["database", "db", "dbserver"],
    standard: "Flowchart and C4 convention (cylinder); ISO 5807 §9.2.2.2 direct-access storage is the same cylinder; no network-specific standard",
    sourceUrl: null,
    inExemplar: false, tier: 1, usageUsers: 146,
    notes: "A database server uses a 64 x 76 cylinder beside the 60 x 76 server, with a white body, two panel-weight disk rings and a teal activity dot. The engine draws this form; database, db and dbserver select it.",
    draw: () => [
      `<path d="M -32 -28 V 28 A 32 10 0 0 0 32 28 V -28" fill="#ffffff" stroke="${EDGE}" stroke-width="${W_BODY}"/>`,
      `<ellipse cx="0" cy="-28" rx="32" ry="10" fill="${PANEL}" stroke="${EDGE}" stroke-width="${W_BODY}"/>`,
      stroke("M -32 -8 A 32 10 0 0 0 32 -8 M -32 12 A 32 10 0 0 0 32 12", W_PANEL),
      statusDot(20, 24),
    ],
  },
  // Tier 1 — existing kinds, in observed usage order.
  {
    id: "internet", title: "Internet",
    engine: "internet", dsl: ["internet"],
    standard: "Network cloud convention with a globe for the public Internet; §2.4 / §3",
    sourceUrl: null, inExemplar: false, tier: 1, usageUsers: 434,
    notes: "A broad cloud contains a small globe, so the public network reads without lettering. The engine draws a globe above the device name inside the cloud.",
    draw: () => [cloudOutline(), ellipse(0, 2, 20, 20), ellipse(0, 2, 8, 20, "none", W_PANEL), stroke("M -20 2 H 20 M -17 -8 H 17 M -17 12 H 17", W_PANEL)],
  },
  {
    id: "l3switch", title: "Layer 3 switch",
    engine: "l3switch", dsl: ["l3switch", "multilayer"],
    standard: "Cisco convention: rack switch with routing arrows; §2.1 / §3",
    sourceUrl: "https://www.cisco.com/c/en/us/about/brand-center/network-topology-icons.html",
    inExemplar: false, tier: 1, usageUsers: 261,
    notes: "The seed switch face carries three sockets and opposing routing arrows. The engine draws this form.",
    draw: () => [body(-56, -21, 112, 42), port(-43, -5), port(-23, -5), port(-3, -5), stroke("M 20 -7 H 44 M 39 -12 L 44 -7 L 39 -2 M 44 9 H 20 M 25 4 L 20 9 L 25 14"), statusDot(-37, -13)],
  },
  {
    id: "cloud", title: "Cloud network",
    engine: "cloud", dsl: ["cloud"],
    standard: "Network cloud abstraction; §2.4 / §3",
    sourceUrl: null, inExemplar: false, tier: 1, usageUsers: 224,
    notes: "An unmarked cloud represents an unspecified provider or network. The engine draws a cloud with the device name inside it, using the theme cloud fill.",
    draw: () => [cloudOutline()],
  },
  {
    id: "ap", title: "Wireless access point",
    engine: "ap", dsl: ["ap", "wifi"],
    standard: "Cisco convention: access-point puck with radio arcs; §2.1 / §3",
    sourceUrl: "https://www.cisco.com/c/en/us/about/brand-center/network-topology-icons.html",
    inExemplar: false, tier: 1, usageUsers: 209,
    notes: "A low rounded access-point puck sits below two radio arcs. Only the outer transmitting arc is teal in the library. The engine draws this form.",
    draw: () => [body(-30, 1, 60, 24, 12), stroke("M -14 -5 Q 0 -20 14 -5"), stroke("M -25 -12 Q 0 -39 25 -12", W_DETAIL, TEAL), stroke("M -9 13 H 9", W_PANEL)],
  },
  {
    id: "storage", title: "Rack storage array",
    engine: "storage", dsl: ["storage"],
    standard: "Rack storage array convention; §2.2",
    sourceUrl: null, inExemplar: false, tier: 1, usageUsers: 168,
    notes: "A wide rack face holds four tall removable drive caddies with pull handles. The engine draws this form.",
    draw: () => [body(-56, -21, 112, 42), ...[-44, -22, 0, 22].flatMap(x => [panel(x, -13, 16, 26), stroke(`M ${x + 4} 6 H ${x + 12}`, W_PANEL)]), statusDot(48, 0)],
  },
  {
    id: "laptop", title: "Laptop",
    engine: "laptop", dsl: ["laptop"],
    standard: "Clamshell computer convention; §2.2",
    sourceUrl: null, inExemplar: false, tier: 1, usageUsers: 151,
    notes: "A screen hinges onto a flared keyboard deck, giving a clamshell outline smaller than the desktop PC. The engine draws this form.",
    draw: () => [body(-35, -30, 70, 43), panel(-29, -24, 58, 31, false), shape("M -35 13 H 35 L 45 29 H -45 Z"), stroke("M -27 18 H 27", W_PANEL), panel(-10, 22, 20, 4)],
  },
  {
    id: "camera-fixed", title: "Fixed box camera",
    engine: "camera", dsl: ["camera cam type: fixed"],
    standard: "Box camera silhouette; §2.3 / §3",
    sourceUrl: null, inExemplar: false, tier: 1, usageUsers: 115,
    notes: "A square-ended camera body projects a separate lens barrel and rests on a pedestal bracket. The engine draws this form. Usage is shared across the camera family.",
    draw: () => [stroke("M -8 12 V 28 H -27 M -27 24 V 32", W_BODY), body(17, -12, 18, 22, 1), panel(27, -7, 5, 12), body(-35, -21, 52, 36), stroke("M -26 -11 H -13", W_PANEL)],
  },
  {
    id: "camera-bullet", title: "Bullet camera",
    engine: "camera", dsl: ["camera cam type: bullet"],
    standard: "Weatherproof bullet camera silhouette; §2.3 / §3",
    sourceUrl: null, inExemplar: false, tier: 1, usageUsers: 115,
    notes: "A long angled barrel has a projecting sun hood and an articulated wall mount. The engine draws this form. Usage is shared across the camera family.",
    draw: () => [stroke("M -10 9 L -21 26 H -37 M -37 18 V 33", W_BODY), '<g transform="rotate(18)">', body(-34, -15, 66, 28, 13), ellipse(26, -1, 8, 13, PANEL, W_BODY), ellipse(27, -1, 3, 7, EDGE, W_PANEL), stroke("M -30 -20 H 38 L 41 -15", W_BODY), '</g>'],
  },
  {
    id: "camera-dome", title: "Dome camera",
    engine: "camera", dsl: ["camera cam type: dome"],
    standard: "Ceiling dome camera silhouette; §2.3 / §3",
    sourceUrl: null, inExemplar: false, tier: 1, usageUsers: 115,
    notes: "A shallow ceiling rim covers one smooth hemispherical bubble with a recessed lens. The engine draws this form. Usage is shared across the camera family.",
    draw: () => [shape("M -29 -8 H 29 C 29 30 -29 30 -29 -8 Z", PANEL), ellipse(0, 5, 9, 9), ellipse(0, 5, 4, 4, EDGE, W_PANEL), body(-34, -20, 68, 12)],
  },
  {
    id: "camera-ptz", title: "Pan-tilt-zoom camera",
    engine: "camera", dsl: ["camera cam type: ptz"],
    standard: "Pendant PTZ camera with wall arm; §2.3 / §3",
    sourceUrl: null, inExemplar: false, tier: 1, usageUsers: 115,
    notes: "A wall arm suspends a tall motor housing above a rounded moving camera head. The engine draws this form. Usage is shared across the camera family.",
    draw: () => [body(-38, -39, 8, 25, 1), shape("M -30 -35 H 7 V -17 H -1 V -27 H -30 Z"), body(-17, -17, 40, 24, 7), shape("M -17 7 H 23 V 14 C 23 42 -17 42 -17 14 Z", PANEL), ellipse(3, 20, 8, 8), ellipse(3, 20, 3, 3, EDGE, W_PANEL)],
  },
  {
    id: "camera-turret", title: "Turret camera",
    engine: "camera", dsl: ["camera cam type: turret"],
    standard: "Exposed eyeball turret camera silhouette; §2.3",
    sourceUrl: null, inExemplar: false, tier: 1, usageUsers: 115,
    notes: "An exposed spherical camera protrudes below a stepped socket mount, with its lens aimed off-center. The engine draws this form. Usage is shared across the camera family.",
    draw: () => [body(-31, -26, 62, 10), shape("M -26 -16 H 26 L 21 9 H -21 Z", PANEL), ellipse(3, 6, 20, 21, "#ffffff", W_BODY), ellipse(10, 11, 10, 11, PANEL), ellipse(12, 12, 4, 5, EDGE, W_PANEL)],
  },
  {
    id: "printer", title: "Network printer",
    engine: "printer", dsl: ["printer"],
    standard: "Printer body with paper and output tray; §2.2",
    sourceUrl: null, inExemplar: false, tier: 1, usageUsers: 113,
    notes: "Paper rises above the printer body and an output sheet projects below its dark tray. The engine draws this form.",
    draw: () => [body(-24, -37, 48, 29, 1), stroke("M -16 -28 H 16 M -16 -21 H 11", W_PANEL), body(-38, -12, 76, 43), panel(-27, 8, 54, 13), body(-23, 13, 46, 26, 1), stroke("M -15 22 H 15 M -15 29 H 8", W_PANEL), statusDot(27, -2)],
  },
  // Tier 2 — remaining existing kinds.
  {
    id: "ipphone", title: "IP desk phone",
    engine: "ipphone", dsl: ["ipphone", "voip"],
    standard: "Desk telephone with handset, display and keypad; §2.2",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 84,
    notes: "A sloping desk base carries a shaped handset, screen and keypad. The engine draws this form.",
    draw: () => [shape("M -25 -28 H 28 L 35 29 H -35 Z"), panel(-3, -19, 24, 14), handset(-24, -23), ...[3, 13, 23].flatMap(y => [2, 11, 20].map(x => port(x, y, 4)))],
  },
  {
    id: "gateway", title: "Network gateway",
    engine: "gateway", dsl: ["gateway"],
    standard: "Router puck with conventional GW tag; §2.1",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 78,
    notes: "The seed router puck carries a bold GW tag between small forwarding arrows. The engine draws this form.",
    draw: () => [body(-42, -24, 84, 48, 24), letter(0, 7, "GW", 18), stroke("M -32 0 H -23 M -27 -4 L -23 0 L -27 4 M 23 0 H 32 M 28 -4 L 32 0 L 28 4"), statusDot(0, 16)],
  },
  {
    id: "poeswitch", title: "Power-over-Ethernet switch",
    engine: "poeswitch", dsl: ["poeswitch"],
    standard: "Switch face with conventional PoE tag; §2.3",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 75,
    notes: "The seed switch face keeps three full-size sockets and a clear PoE tag. The engine draws this form.",
    draw: () => [body(-56, -21, 112, 42), port(-43, -5), port(-23, -5), port(-3, -5), letter(33, 5, "PoE"), statusDot(33, 13)],
  },
  {
    id: "loadbalancer", title: "Load balancer",
    engine: "loadbalancer", dsl: ["loadbalancer", "lb"],
    standard: "Appliance with traffic fan-out arrows; §2.1",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 74,
    notes: "A rack appliance splits one incoming path into three outgoing arrows. The engine draws this form.",
    draw: () => [body(-56, -21, 112, 42), port(-44, -5, 10), stroke("M -29 0 H -9 M -9 -12 V 12 M -9 -12 H 32 M -9 0 H 32 M -9 12 H 32 M 28 -16 L 32 -12 L 28 -8 M 28 -4 L 32 0 L 28 4 M 28 8 L 32 12 L 28 16"), statusDot(45, 0)],
  },
  {
    id: "monitor", title: "Security monitor",
    engine: "monitor", dsl: ["monitor", "videowall"],
    standard: "CCTV display with tiled feeds; §2.3",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 67,
    notes: "A desktop security monitor shows four separate feed panels on a broad pedestal. The engine draws this form.",
    draw: () => [shape("M -7 22 H 7 V 33 L 25 38 H -25 L -7 33 Z"), body(-45, -34, 90, 56), ...[-37, 3].flatMap(x => [-26, -4].map(y => panel(x, y, 34, 16, false)))],
  },
  {
    id: "nvr", title: "Network video recorder",
    engine: "nvr", dsl: ["nvr"],
    standard: "Recorder rack face with disk glyph and NVR tag; §2.3",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 66,
    notes: "A low recorder face carries a disk platter, NVR tag and one Ethernet socket. The engine draws this form.",
    draw: () => [body(-56, -21, 112, 42), ellipse(-34, 0, 12, 12, PANEL), ellipse(-34, 0, 3, 3, EDGE, W_PANEL), letter(4, 5, "NVR", 14), port(35, -5, 10), statusDot(41, 13)],
  },
  {
    id: "mobile", title: "Mobile phone",
    engine: "mobile", dsl: ["mobile", "phone"],
    standard: "Portrait smartphone silhouette; §2.2",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 61,
    notes: "A 30 by 54 handset with an inset screen is visibly smaller than the seed PC. The engine draws this form.",
    draw: () => [body(-15, -27, 30, 54, 5), panel(-10, -17, 20, 33, false), stroke("M -4 -22 H 4 M -4 22 H 4", W_PANEL)],
  },
  {
    id: "vpngw", title: "VPN gateway",
    engine: "vpngw", dsl: ["vpngw"],
    standard: "Router puck with tunnel lock; §2.1",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 51,
    notes: "A router puck encloses a padlock between two tunnel paths. The engine draws this form.",
    draw: () => [body(-42, -24, 84, 48, 24), stroke("M -32 0 H -18 M 18 0 H 32"), lock(0, 3), statusDot(29, 9)],
  },
  {
    id: "serverfarm", title: "Server farm",
    engine: "serverfarm", dsl: ["serverfarm", "servers"],
    standard: "Three offset server towers; §2.2 / §3",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 49,
    notes: "Three offset towers retain the exact seed server dimensions, drive bays and bezel line. The engine draws this form.",
    draw: () => [
      ...[[24, -12], [0, 0], [-24, 12]].flatMap(([x, y]) => [
        `<g transform="translate(${x} ${y})">`,
        ...SYMBOLS[0].draw().filter(fragment => !fragment.startsWith('<circle')),
        '</g>',
      ]), statusDot(-8, 18),
    ],
  },
  {
    id: "modem", title: "Modem",
    engine: "modem", dsl: ["modem"],
    standard: "Standalone modem with signal waveform; §2.1",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 34,
    notes: "A slim upright modem on a foot carries a waveform and one cable socket. The engine draws this form.",
    draw: () => [body(-24, 26, 48, 8, 2), body(-18, -34, 36, 60, 4), stroke("M -11 -7 Q -6 -21 0 -7 T 11 -7"), port(-5, 12, 10), statusDot(0, 3)],
  },
  {
    id: "wan", title: "Wide-area network",
    engine: "wan", dsl: ["wan"],
    standard: "Network cloud abstraction with connected remote sites; §2.4",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 21,
    notes: "A cloud contains three linked site nodes spread across its width. The engine draws three linked nodes above the device name inside the cloud.",
    draw: () => [cloudOutline(), stroke("M -30 13 L 0 -7 L 30 13 H -30"), panel(-36, 7, 12, 12), panel(-6, -13, 12, 12), panel(24, 7, 12, 12)],
  },
  {
    id: "wlc", title: "Wireless LAN controller",
    engine: "wlc", dsl: ["wlc"],
    standard: "Controller rack with AP and radio glyph; §2.1",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 20,
    notes: "A rack controller contains a miniature access-point puck under radio arcs, alongside two ports. The engine draws this form.",
    draw: () => [body(-56, -21, 112, 42), port(-43, -5), port(-23, -5), panel(10, 3, 30, 10), stroke("M 16 -1 Q 25 -11 34 -1"), stroke("M 9 -7 Q 25 -24 41 -7", W_DETAIL, TEAL)],
  },
  {
    id: "ids", title: "Intrusion detection appliance",
    engine: "ids", dsl: ["ids", "ips"],
    standard: "Security appliance with shield and eye; §2.1",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 20,
    notes: "A rack face holds a shield with a watching eye, expressing inspection and protection. The engine draws this form.",
    draw: () => [body(-56, -21, 112, 42), shape("M -17 -14 L 0 -18 L 17 -14 V 0 Q 17 10 0 17 Q -17 10 -17 0 Z", PANEL, W_PANEL), stroke("M -10 -2 Q 0 -12 10 -2 Q 0 8 -10 -2 Z", W_PANEL), ellipse(0, -2, 3, 3, EDGE, W_PANEL), port(-43, -5, 10), statusDot(42, 0)],
  },
  {
    id: "proxy", title: "Proxy appliance",
    engine: "proxy", dsl: ["proxy"],
    standard: "Intermediary appliance with bidirectional traffic; §2.1",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 17,
    notes: "Two opposing paths cross a pale intermediary panel inside a rack face. The engine draws this form.",
    draw: () => [body(-56, -21, 112, 42), panel(-9, -15, 18, 30), stroke("M -39 -6 H 37 M 31 -12 L 37 -6 L 31 0 M 39 7 H -37 M -31 1 L -37 7 L -31 13"), statusDot(46, 0)],
  },
  {
    id: "lan", title: "LAN segment",
    engine: "lan", dsl: ["lan", "segment"],
    standard: "Shared Ethernet bus bar with host drops; §2.4 / §3",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 10,
    notes: "A horizontal bus has three perpendicular drops ending in small host attachment ticks. The engine draws this form.",
    draw: () => [stroke("M -65 -12 H 65", 3), stroke("M -42 -12 V 19 M 0 -12 V 19 M 42 -12 V 19 M -48 19 H -36 M -6 19 H 6 M 36 19 H 48")],
  },
  {
    id: "dvr", title: "Digital video recorder",
    engine: "dvr", dsl: ["dvr"],
    standard: "Recorder with disk glyph, DVR tag and coax connectors; §2.3",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 5,
    notes: "A recorder face pairs a disk platter and DVR tag with two round coax sockets. The engine draws this form.",
    draw: () => [body(-56, -21, 112, 42), ellipse(-34, 0, 12, 12, PANEL), ellipse(-34, 0, 3, 3, EDGE, W_PANEL), letter(4, 5, "DVR", 14), ellipse(34, 0, 4, 4), ellipse(46, 0, 4, 4), statusDot(40, 13)],
  },
  {
    id: "encoder", title: "Video encoder",
    engine: "encoder", dsl: ["encoder", "decoder"],
    standard: "Video conversion box with play triangle; §2.3",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 5,
    notes: "A compact inline box converts a round coax socket to a square network port around a video triangle. The engine draws this form.",
    draw: () => [body(-35, -20, 70, 40), ellipse(-23, 0, 5, 5), shape("M -8 -10 L 9 0 L -8 10 Z", PANEL, W_PANEL), port(20, -5, 10), statusDot(25, 12)],
  },
  {
    id: "pstn", title: "Public telephone network",
    engine: "pstn", dsl: ["pstn"],
    standard: "Telephone network cloud with receiver; §2.4",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 4,
    notes: "A broad cloud encloses a telephone receiver, identifying the public voice network. The engine draws a receiver above the device name inside the cloud.",
    draw: () => [cloudOutline(), '<g transform="translate(19 -5) rotate(90)">', handset(0, 0), '</g>'],
  },
  // Tier 2 — proposed kinds; DSL descriptions identify today's borrowed kinds.
  {
    id: "hypervisor", title: "Hypervisor host",
    engine: "hypervisor", dsl: ["hypervisor"],
    standard: "Host enclosure carrying stacked virtual-machine tiles; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 66,
    notes: "An upright host enclosure carries three overlapping virtual-machine tiles above a physical drive bay. The combination reads as several guests on one host rather than three physical servers.",
    draw: () => [body(-30, -38, 60, 76), panel(-8, -29, 28, 20), panel(-14, -22, 28, 20), panel(-20, -15, 28, 20), panel(-21, 17, 42, 13), statusDot(15, 23)],
  },
  {
    id: "nas", title: "Desktop NAS",
    engine: "nas", dsl: ["nas"],
    standard: "Upright multi-bay desktop storage enclosure; proposed distinct NAS kind",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 56,
    notes: "A small upright enclosure holds three vertical drive caddies and two short feet. Its tower proportions and narrow bays separate it from the broad rack storage array and the connected SAN shelves.",
    draw: () => [stroke("M -21 32 V 36 M 21 32 V 36", W_BODY), body(-28, -32, 56, 64, 4), ...[-21, -6, 9].flatMap(x => [panel(x, -23, 12, 41), stroke(`M ${x + 3} 10 H ${x + 9}`, W_PANEL)]), statusDot(18, 25)],
  },
  {
    id: "wireless-bridge", title: "Point-to-point wireless bridge",
    engine: "wireless-bridge", dsl: ["wireless-bridge"],
    standard: "Mast-mounted directional panel radio; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 51,
    notes: "A tall directional panel is clamped to a mast and emits a narrow pair of side-facing radio arcs. The panel and mast distinguish a point-to-point radio from a ceiling access point or satellite dish.",
    draw: () => [stroke("M -24 -37 V 37 M -24 -14 H -12 M -24 14 H -12", W_BODY), body(-12, -29, 22, 58, 5), panel(-7, -22, 12, 44, false), stroke("M 20 -10 Q 30 0 20 10"), stroke("M 29 -19 Q 48 0 29 19", W_DETAIL, TEAL)],
  },
  {
    id: "container", title: "Software container",
    engine: "container", dsl: ["container"],
    standard: "Isometric ribbed container glyph; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 36,
    notes: "A compact isometric container has ribbed side panels and a closed lid. The crate silhouette represents an isolated software workload without adding another server tower or brand logo.",
    draw: () => [shape("M -31 -17 L 9 -29 L 31 -16 V 20 L -9 32 L -31 19 Z"), shape("M -31 -17 L -9 -4 L 31 -16 L 9 -29 Z", PANEL, W_PANEL), stroke("M -9 -4 V 32 M -31 -17 L -9 -4 L 31 -16", W_PANEL), stroke("M -23 -6 V 15 M -16 -2 V 19 M 0 0 V 23 M 10 -3 V 20 M 20 -6 V 17", W_PANEL)],
  },
  {
    id: "cellular-router", title: "Cellular router",
    engine: "cellular-router", dsl: ["cellular-router"],
    standard: "Router puck with antenna and cellular signal; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 34,
    notes: "A router puck carries an external whip antenna and ascending signal bars. The antenna and cellular reception glyph distinguish it from both the seed router and the access point.",
    draw: () => [stroke("M -27 -11 V -42", W_BODY), body(-42, -11, 84, 42, 21), stroke("M -25 8 H -5 M -10 3 L -5 8 L -10 13 M -5 20 H -25 M -20 15 L -25 20 L -20 25"), port(8, 16, 5), shape("M 17 10 H 22 V 21 H 17 Z", EDGE, W_PANEL), shape("M 26 3 H 31 V 21 H 26 Z", TEAL, W_PANEL)],
  },
  {
    id: "satellite-terminal", title: "Satellite terminal",
    engine: "satellite-terminal", dsl: ["satellite-terminal"],
    standard: "Parabolic dish with feed arm and pedestal; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 34,
    notes: "A tilted parabolic dish points toward a feed horn above a tripod-like pedestal. Its curved bowl and offset feed separate it from the flat directional wireless panel.",
    draw: () => [stroke("M -2 15 V 31 M -2 25 L -21 37 M -2 25 L 17 37", W_BODY), shape("M -31 -29 Q -35 31 30 25 Z", PANEL), stroke("M -9 4 L 23 -29 M 30 25 L 23 -29", W_DETAIL), body(19, -35, 9, 9, 1), stroke("M 30 -40 Q 40 -39 41 -29", W_DETAIL, TEAL)],
  },
  {
    id: "access-control", title: "Door access controller",
    engine: "access-control", dsl: ["access-control"],
    standard: "Door controller enclosure with separate card reader; §2.3 deferred role",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 27,
    notes: "An upright door controller is wired to a narrow card reader, with a card entering its slot. The two connected enclosures show access control rather than a generic server or handheld payment terminal.",
    draw: () => [stroke("M -5 18 H 9 V 5 H 16", W_PANEL), body(-39, -34, 34, 68), panel(-32, -25, 20, 37), stroke("M -29 -15 H -15 M -29 -8 H -15 M -29 -1 H -15", W_PANEL), ellipse(-13, 23, 2, 2, EDGE, W_PANEL), body(16, -21, 23, 47), panel(21, -15, 13, 13, false), statusDot(28, -8), stroke("M 20 6 H 35"), shape("M 24 10 L 41 15 L 36 31 L 19 26 Z", PANEL, W_PANEL)],
  },
  {
    id: "iot-sensor", title: "IoT sensor",
    engine: "iot-sensor", dsl: ["iot-sensor"],
    standard: "Small sensing enclosure with probe and radio signal; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 26,
    notes: "A small upright sensor has a projecting probe, vent slots and one radio wave. Its 32-unit body stays smaller than a phone or computer, fitting an endpoint rather than infrastructure equipment.",
    draw: () => [stroke("M 0 17 V 28", W_BODY), body(-16, -21, 32, 38, 5), stroke("M -8 -10 H 8 M -8 -4 H 8 M -8 2 H 8", W_PANEL), stroke("M 21 -22 Q 30 -15 23 -6", W_DETAIL, TEAL)],
  },
  {
    id: "display", title: "Wall display / TV",
    engine: "display", dsl: ["display"],
    standard: "Wide standless wall display; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 23,
    notes: "A 110 by 54 wall display has a thin bezel and no stand. It is wider and shallower than the seed PC, and lacks the mounting ears and thick industrial bezel of the HMI.",
    draw: () => [body(-55, -27, 110, 54, 2), panel(-50, -22, 100, 42, false), stroke("M -4 24 H 4", W_PANEL)],
  },
  {
    id: "san", title: "Storage area network",
    engine: "san", dsl: ["san"],
    standard: "Connected storage shelves and fabric backbone; proposed distinct SAN kind",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 21,
    notes: "Two shallow storage shelves connect to an external fabric backbone, making a network of arrays rather than one box. This is deliberately broader and more complex than the single storage rack face or desktop NAS.",
    draw: () => [stroke("M -50 -23 H -63 V 23 H -50 M -63 0 H -72", W_DETAIL), ...[-39, 7].flatMap(y => [body(-50, y, 104, 32), ...[-40, -19, 2, 23].map(x => panel(x, y + 7, 15, 18))]), statusDot(46, 23)],
  },
  {
    id: "olt", title: "Optical line terminal",
    engine: "olt", dsl: ["olt"],
    standard: "Rack optical headend with PON fan-out; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 18,
    notes: "A rack headend has mounting ears, paired narrow optical cages and a one-to-many optical distribution mark. The cages and rack ears separate it from the seed Ethernet switch and small upright ONT.",
    draw: () => [body(-64, -14, 8, 28, 1), body(56, -14, 8, 28, 1), body(-56, -21, 112, 42), ...[-45, -23, -1].flatMap(x => [panel(x, -12, 14, 24), port(x + 4, -8, 6), port(x + 4, 2, 6)]), stroke("M 22 0 H 29 M 29 -10 V 10 M 29 -10 H 44 M 29 0 H 44 M 29 10 H 44", W_PANEL), statusDot(20, 0)],
  },
  {
    id: "ont", title: "Optical network terminal",
    engine: "ont", dsl: ["ont"],
    standard: "Compact subscriber optical terminal; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 18,
    notes: "A small upright subscriber box pairs a round optical termination with one Ethernet port. Its narrow enclosure and optical jack distinguish it from the rack OLT, switch and waveform-bearing modem.",
    draw: () => [body(-21, -29, 42, 58, 5), ellipse(0, -11, 8, 8, PANEL), ellipse(0, -11, 3, 3, EDGE, W_PANEL), port(-6, 7), statusDot(12, 21), stroke("M -10 29 V 35 H -18", W_PANEL)],
  },
  {
    id: "pbx", title: "Private telephone exchange",
    engine: "pbx", dsl: ["pbx"],
    standard: "Telephone exchange rack with receiver and extension ports; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 15,
    notes: "A rack exchange carries a horizontal telephone receiver and three extension sockets. The handset identifies voice switching without a device-name label.",
    draw: () => [body(-56, -21, 112, 42), '<g transform="translate(-5 -7) rotate(90)">', handset(0, 0), '</g>', port(0, -5, 10), port(17, -5, 10), port(34, -5, 10), statusDot(47, 13)],
  },
  {
    id: "tablet", title: "Tablet",
    engine: "tablet", dsl: ["tablet"],
    standard: "Larger portrait touch slate; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 15,
    notes: "A broad portrait slate has a large inset screen and a small camera dot. It is larger than the narrow phone but smaller than the PC, with no stand or industrial mounting ears.",
    draw: () => [body(-25, -34, 50, 68, 5), panel(-19, -24, 38, 49, false), ellipse(0, -29, 1.5, 1.5, EDGE, W_PANEL), stroke("M -5 30 H 5", W_PANEL)],
  },
  {
    id: "plc", title: "DIN-rail PLC",
    engine: "plc", dsl: ["plc"],
    standard: "Industrial DIN-rail controller with ribbed I/O modules; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 13,
    notes: "A controller and two narrow ribbed I/O modules clip onto a visible DIN rail. Top and bottom terminal blocks and the modular silhouette distinguish it from rack switches and server towers.",
    draw: () => [panel(-53, -5, 106, 10), body(-43, -29, 39, 58, 1), panel(-36, -14, 25, 27), ...[0, 24].flatMap(x => [body(x, -29, 20, 58, 1), stroke(`M ${x + 6} -16 V 16 M ${x + 13} -16 V 16`, W_PANEL)]), ...[-35, -23, 5, 29].flatMap(x => [port(x, -25, 5), port(x, 20, 5)]), statusDot(-23, 1)],
  },
  {
    id: "ups", title: "Uninterruptible power supply",
    engine: "ups", dsl: ["ups"],
    standard: "Upright battery backup enclosure; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 12,
    notes: "An upright UPS carries a small status display, a horizontal battery with its terminal nub and a lightning bolt, and lower ventilation slots. The battery face distinguishes power equipment from a server's drive bays.",
    draw: () => [
      body(-26, -38, 52, 76), panel(-17, -28, 34, 13), statusDot(10, -21),
      panel(-16, -6, 28, 18), `<rect x="12" y="0" width="4" height="6" fill="${EDGE}"/>`,
      `<path d="M 1 -3 L -6 4 H -1 L -3 10 L 5 2 H 0 Z" fill="${EDGE}"/>`,
      stroke("M -15 25 H 15 M -15 30 H 15", W_PANEL),
    ],
  },
  {
    id: "hmi", title: "Industrial touch panel",
    engine: "hmi", dsl: ["hmi"],
    standard: "Panel-mount industrial touchscreen with mounting ears; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 9,
    notes: "A thick industrial bezel with side mounting ears encloses a touch screen and two physical keys. Its compact panel proportions and lack of a stand separate it from the PC, while the heavy bezel separates it from the thin wall display.",
    draw: () => [body(-47, -15, 7, 30, 1), body(40, -15, 7, 30, 1), body(-40, -30, 80, 60, 2), panel(-30, -20, 49, 40), panel(-24, -14, 16, 9, false), stroke("M -24 9 H -13 V 0 H 3 V 12 H 12", W_PANEL), port(27, 1, 5), port(27, 13, 5)],
  },
  {
    id: "media-converter", title: "Fiber media converter",
    engine: "media-converter", dsl: ["media-converter"],
    standard: "Small inline Ethernet-to-fiber conversion box; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 8,
    notes: "A small inline box has a large copper jack on one end and paired optical sockets on the other. A two-way arrow expresses media conversion and keeps it distinct from the video encoder.",
    draw: () => [body(-31, -16, 62, 32), port(-24, -6, 12), panel(14, -8, 6, 16), panel(23, -8, 5, 16), stroke("M -7 -4 H 9 M 5 -8 L 9 -4 L 5 0 M 9 5 H -7 M -3 1 L -7 5 L -3 9", W_PANEL)],
  },
  {
    id: "pos-terminal", title: "Point-of-sale terminal",
    engine: "pos-terminal", dsl: ["pos-terminal"],
    standard: "Payment keypad terminal with inserted card; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 8,
    notes: "A tapered payment terminal has a screen, keypad and a card projecting from the bottom slot. The card and wedge outline distinguish it from the mobile phone and separate door-access reader.",
    draw: () => [shape("M -17 -34 H 17 L 23 22 Q 23 27 18 27 H -18 Q -23 27 -23 22 Z"), panel(-13, -25, 26, 18), ...[0, 9, 18].flatMap(y => [-12, -2, 8].map(x => port(x, y, 4))), stroke("M -13 25 H 13"), body(-11, 28, 22, 14, 1), stroke("M -7 33 H 7", W_PANEL)],
  },
  {
    id: "patch-panel", title: "Passive patch panel",
    engine: "patch-panel", dsl: ["patch-panel"],
    standard: "Passive rack patch field with mounting ears and sockets; proposed library convention",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: 5,
    notes: "A particularly shallow rack strip has mounting ears and a continuous row of six sockets. It has no activity accent because it is passive, and its 26-unit height separates it from the powered switch.",
    draw: () => [body(-64, -9, 8, 18, 1), body(56, -9, 8, 18, 1), body(-56, -13, 112, 26, 1), ...[-46, -29, -12, 5, 22, 39].map(x => port(x, -5, 10))],
  },
  // Tier 3 — 120-unit link samples; engine is null because links are not device kinds.
  {
    id: "link-copper", title: "Copper Ethernet link",
    engine: null, dsl: ["a -- b : copper", "a -- b : ethernet"],
    standard: "Solid copper link; §2.6 / §3, exemplar .wire",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "A 120-unit solid slate wire joins two short end ticks. Its 3-unit weight and copper color are copied from the exemplar.",
    draw: () => [linkTicks(), stroke("M -60 0 H 60", 3, COPPER, "butt")],
  },
  {
    id: "link-fiber", title: "Optical fiber link",
    engine: null, dsl: ["a -- b : fiber"],
    standard: "Thicker optical fiber link; §2.6 / §3, exemplar .fiber",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "A 120-unit teal line joins two short slate end ticks. The exemplar's 5-unit optical-link weight distinguishes fiber from copper.",
    draw: () => [linkTicks(), stroke("M -60 0 H 60", 5, TEAL, "butt")],
  },
  {
    id: "link-wireless", title: "Wireless link",
    engine: null, dsl: ["a -- b : wireless"],
    standard: "Dashed radio link; §2.6 / §3",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "A 120-unit dashed path joins two short ticks. It uses the copper stroke weight, with open gaps identifying a radio connection.",
    draw: () => [linkTicks(), dashed("M -60 0 H 60")],
  },
  {
    id: "link-vpn", title: "VPN tunnel link",
    engine: null, dsl: ["a -- b : vpn"],
    standard: "Dashed encrypted tunnel with lock; §2.6 / §3, horizontal catalog sample",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Two dashed runs span 120 units around a small central padlock. The lock identifies a tunnel rather than wireless transport; the catalog sample stays horizontal instead of the standard's routed arc.",
    draw: () => [linkTicks(), dashed("M -60 0 H -16 M 16 0 H 60"), lock(0, 3)],
  },
  {
    id: "link-lag", title: "Aggregated link",
    engine: null, dsl: ["a -- b : lag", "a -- b : portchannel"],
    standard: "Double-line link aggregation; §2.6 / §3",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Two parallel copper-weight lines span the same 120 units between shared end ticks. The visible gap distinguishes link aggregation from the single heavy fiber stroke.",
    draw: () => [linkTicks(), stroke("M -60 -4 H 60 M -60 4 H 60", 3, COPPER, "butt")],
  },
  {
    id: "link-poe", title: "Power-over-Ethernet link",
    engine: null, dsl: ["a -- b : poe"],
    standard: "Copper link with power bolt; §2.6 / §3",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "A copper line spans 120 units with a small solid power bolt centered in a clear gap. The bolt distinguishes powered Ethernet without adding a second color or a text label.",
    draw: () => [linkTicks(), stroke("M -60 0 H -13 M 13 0 H 60", 3, COPPER, "butt"), shape("M 2 -13 L -8 2 H -1 L -4 13 L 8 -3 H 1 Z", EDGE, W_PANEL)],
  },
  {
    id: "link-serial", title: "Serial / leased circuit",
    engine: null, dsl: ["a -- b : serial", "a -- b : wan"],
    standard: "Serial circuit with zigzag tick; §2.6 / §3",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "A continuous 120-unit copper path bends through a small central zigzag. The open stroked zigzag stays distinct from the filled power bolt on the PoE link.",
    draw: () => [linkTicks(), stroke("M -60 0 H -14 L -7 -7 L 0 7 L 7 -7 L 14 0 H 60", 3, COPPER, "butt")],
  },
];

// Nonrectangular bodies use the same seed palette and stroke weights.
const shape = (d, fill = "#ffffff", width = W_BODY) =>
  `<path d="${d}" fill="${fill}" stroke="${EDGE}" stroke-width="${width}" stroke-linejoin="round"/>`;
const ellipse = (x, y, rx, ry, fill = "#ffffff", width = W_PANEL) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${EDGE}" stroke-width="${width}"/>`;
const cloudOutline = () => shape("M -44 29 C -75 29 -79 -13 -49 -17 C -48 -45 -10 -49 5 -27 C 29 -43 52 -29 52 -10 C 77 -8 79 29 49 29 Z");
const handset = (x, y) => `<g transform="translate(${x} ${y})">${shape("M 5 0 H 13 Q 15 0 15 2 V 10 L 10 14 Q 7 19 10 24 L 15 28 V 36 Q 15 38 13 38 H 5 C -3 30 -3 8 5 0 Z", PANEL, W_PANEL)}</g>`;
const lock = (x, y) => `<g transform="translate(${x} ${y})">${stroke("M -6 -5 V -10 A 6 6 0 0 1 6 -10 V -5")}${body(-10, -5, 20, 17, 2)}${stroke("M 0 1 V 6", W_PANEL)}</g>`;
const COPPER = "#536979"; // Explicitly permitted exemplar .wire color, for link samples only.
const linkTicks = () => stroke("M -60 -8 V 8 M 60 -8 V 8", W_DETAIL, EDGE, "butt");
const dashed = (d) => stroke(d, 3, COPPER, "butt").replace('/>', ' stroke-dasharray="8 6"/>');

/** Inked extent of a fragment (strokes included), rounded outward to whole units. */
function extent(fragment) {
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 400 400" width="400" height="400">${fragment}</svg>`;
  // getBBox applies group transforms; innerBBox clips rotated cameras and offset servers.
  const b = new Resvg(probe, { font: { loadSystemFonts: fragment.includes("<text") } }).getBBox();
  if (!b) throw new Error("empty symbol");
  let x0 = b.x, y0 = b.y, x1 = b.x + b.width, y1 = b.y + b.height;
  // Text is not reliably measured without the exemplar's fonts, so each label adds an estimated box.
  for (const m of fragment.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
    const attr = (name) => new RegExp(`\\b${name}="([^"]*)"`).exec(m[1])?.[1];
    const size = Number(attr("font-size") ?? 12), w = m[2].length * size * 0.66;
    const tx = Number(attr("x") ?? 0), ty = Number(attr("y") ?? 0);
    x0 = Math.min(x0, tx - w / 2); x1 = Math.max(x1, tx + w / 2);
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

export { SYMBOLS, body, panel, statusDot, port, stroke, letter, EDGE, INK, PANEL, TEAL, BRICK, BRICK_FILL, W_BODY, W_PANEL, W_DETAIL };

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = new URL("../../../visual-eval/symbols/network/", import.meta.url);
  await mkdir(dir, { recursive: true });
  const manifestUrl = new URL("manifest.json", dir);
  const manifest = existsSync(manifestUrl)
    ? JSON.parse(await readFile(manifestUrl, "utf8"))
    : {
        type: "network", variant: null, exemplar: "network",
        style: "Every device is a white body outlined #304b60 at 2.5 with 3-unit corners; screens, drive bays and trays are #e4edf2 panels outlined #304b60 at 1.5; ports are solid #304b60 blocks and detail lines are #304b60 at 2 with round caps. Each icon carries at most one teal #087d92 accent (a status dot, wave or arrowhead) and only when it shows activity. Firewalls alone are brick: #fff2df fill, #985921 outline and courses. Icons have no lettering except conventional tags (NVR, DVR, PoE, GW) in bold Verdana #182b3b. Sizes follow the exemplar 1:1 — switch 112 x 42, server 60 x 76, PC 90 x 71, firewall 108 x 60 — rack equipment wide and short, standalone equipment upright.",
        symbols: [],
      };
  for (const s of SYMBOLS) {
    const svg = symbolSvg(s);
    await writeFile(new URL(`${s.id}.svg`, dir), svg);
    console.log(`${s.id}: viewBox ${svg.match(/viewBox="([^"]+)"/)[1]}`);
    const { draw, title, ...metadata } = s;
    const entry = { id: s.id, label: title, file: `${s.id}.svg`, ...metadata };
    const index = manifest.symbols.findIndex((item) => item.id === s.id);
    if (index < 0) manifest.symbols.push(entry);
    else manifest.symbols[index] = entry;
  }
  await writeFile(manifestUrl, JSON.stringify(manifest, null, 2) + "\n");
}
