/**
 * Domain symbol catalogs — the real symbols an engine uses *inside* a diagram
 * (circuit components, SLD apparatus, P&ID equipment, flowchart node icons),
 * each rendered standalone for the /icons showcase. This is distinct from the
 * per-type representative glyph (assets/icons/*.svg).
 *
 * Each entry's `svg` is a complete, self-styled <svg> so consumers can drop it
 * straight into the page.
 */
import type { DiagramType, SLDNodeType, LogicGateType } from "./core/types";
import { SYMBOLS } from "./diagrams/circuit/symbols";
import { renderSymbol as sldRenderSymbol, geometryFor } from "./diagrams/sld/symbols";
import { renderEquip, GEOMETRY as PID_GEOMETRY } from "./diagrams/pid/symbols";
import { iconNames, renderIcon } from "./diagrams/flowchart/icons";
import { getGateGeometry } from "./diagrams/logic/symbols";
import { drawDeviceIcon, iconSize } from "./diagrams/network/symbols";
import { FLOORPLAN_SYMBOLS } from "./diagrams/floorplan/catalog";

export interface SymbolCatalogEntry {
  id: string;
  label: string;
  svg: string;
}

export interface SymbolCatalog {
  type: DiagramType;
  /** Human label for the catalog section, e.g. "Circuit components". */
  label: string;
  /** Short description of what the symbols are. */
  note: string;
  entries: SymbolCatalogEntry[];
}

function humanize(id: string): string {
  return id
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function svgDoc(viewBox: string, css: string, inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="lt-symbol">` +
    `<style>${css}</style>${inner}</svg>`;
}

// ── Circuit (IEEE 315) ─────────────────────────────────────────────
const CIRCUIT_CSS =
  ".schematex-circuit-body{stroke:#0f172a;stroke-width:1.75;fill:none;stroke-linejoin:round;stroke-linecap:round}" +
  ".schematex-circuit-fill{stroke:#0f172a;stroke-width:1.5;fill:#0f172a}" +
  ".schematex-circuit-wire{stroke:#0f172a;stroke-width:1.75;fill:none;stroke-linecap:square}";

function circuitCatalog(): SymbolCatalogEntry[] {
  const symbols = SYMBOLS as Record<string, { length: number; svg: () => string }>;
  const out: SymbolCatalogEntry[] = [];
  for (const [id, def] of Object.entries(symbols)) {
    if (!def) continue;
    const L = def.length || 40;
    const inner = def.svg();
    out.push({ id, label: humanize(id), svg: svgDoc(`-10 -24 ${L + 20} 48`, CIRCUIT_CSS, inner) });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

// ── SLD (IEEE 315 / IEC 60617) ─────────────────────────────────────
const SLD_CSS =
  ".lt-sld-stroke{stroke:#0f172a;stroke-width:1.8;fill:none}" +
  ".lt-sld-stroke-thick{stroke:#0f172a;stroke-width:2.4;fill:none;stroke-linecap:round}" +
  ".lt-sld-fill{fill:#ffffff;stroke:#0f172a;stroke-width:2}" +
  ".lt-sld-fill-dark{fill:#0f172a;stroke:#0f172a;stroke-width:1}" +
  ".lt-sld-dot{fill:#0f172a;stroke:none}" +
  ".lt-sld-wire{stroke:#0f172a;stroke-width:2;fill:none}" +
  ".lt-sld-bus{stroke:#0f172a;stroke-width:6;stroke-linecap:square}" +
  ".lt-sld-symbol-text{font:11px sans-serif;fill:#0f172a;dominant-baseline:middle}" +
  ".lt-sld-wdg{font:bold 10px sans-serif;fill:#0f172a;dominant-baseline:middle}";

const SLD_TYPES: SLDNodeType[] = [
  "utility", "generator", "solar", "wind", "ups", "transformer", "transformer_dy",
  "transformer_yd", "transformer_yy", "transformer_dd", "autotransformer",
  "transformer_3winding", "breaker", "breaker_vacuum", "recloser", "switch",
  "switch_load", "ground_switch", "sectionalizer", "fuse", "fuse_cl", "motor",
  "load", "capacitor_bank", "harmonic_filter", "vfd", "ats", "ct", "pt", "relay",
  "surge_arrester", "watthour_meter", "demand_meter", "ground_fault", "bus",
  "bus_tie", "hub",
];

function sldCatalog(): SymbolCatalogEntry[] {
  const out: SymbolCatalogEntry[] = [];
  for (const type of SLD_TYPES) {
    let inner: string;
    try {
      inner = sldRenderSymbol(type);
    } catch {
      continue;
    }
    const g = geometryFor(type);
    const w = Math.max(g.halfWidth, 18) + 12;
    const top = Math.min(g.topY, -22) - 8;
    const bot = Math.max(g.bottomY, 22) + 8;
    out.push({
      id: type,
      label: humanize(type),
      svg: svgDoc(`${-w} ${top} ${2 * w} ${bot - top}`, SLD_CSS, inner),
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

// ── P&ID (ISA-5.1) equipment ───────────────────────────────────────
const PID_CSS =
  ".lt-pid-equip{fill:#ffffff;stroke:#1d1d1d;stroke-width:1.6}" +
  ".lt-pid-equip-tag{font:600 11px system-ui,sans-serif;fill:#1d1d1d}" +
  ".lt-pid-process{stroke:#1d1d1d;stroke-width:2.6;fill:none}" +
  ".lt-pid-process-min{stroke:#1d1d1d;stroke-width:1.5;fill:none}";

function pidCatalog(): SymbolCatalogEntry[] {
  const out: SymbolCatalogEntry[] = [];
  const pad = 12;
  for (const [id, g] of Object.entries(PID_GEOMETRY)) {
    let inner: string;
    try {
      inner = renderEquip(id as Parameters<typeof renderEquip>[0], "");
    } catch {
      continue;
    }
    out.push({
      id,
      label: humanize(id),
      svg: svgDoc(
        `${-g.width / 2 - pad} ${-g.height / 2 - pad} ${g.width + 2 * pad} ${g.height + 2 * pad}`,
        PID_CSS,
        inner,
      ),
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

// ── Flowchart node icons ───────────────────────────────────────────
const FC_ICON_CSS =
  ".sx-fc-icon{stroke:#0f172a;fill:none}.sx-fc-icon-fill{fill:#0f172a}";

function flowchartIconCatalog(): SymbolCatalogEntry[] {
  return iconNames()
    .map((name) => ({
      id: name,
      label: humanize(name),
      svg: svgDoc("-13 -13 26 26", FC_ICON_CSS, renderIcon(name)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// ── Logic gates (IEEE 91) ──────────────────────────────────────────
const LOGIC_CSS =
  ".schematex-logic-gate-body{fill:none;stroke:#0f172a;stroke-width:1.75;stroke-linejoin:round}" +
  ".schematex-logic-bubble{fill:#ffffff;stroke:#0f172a;stroke-width:1.5}" +
  ".schematex-logic-wire{stroke:#0f172a;stroke-width:1.5;fill:none;stroke-linecap:square}" +
  ".schematex-logic-gate-iec-label{font:bold 13px sans-serif;fill:#0f172a}";

const LOGIC_TYPES: LogicGateType[] = [
  "AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR", "BUF", "TRISTATE_BUF",
  "OPEN_DRAIN", "SCHMITT", "DFF", "JKFF", "SRFF", "TFF", "LATCH_D", "LATCH_SR",
  "MUX", "DEMUX", "DECODER", "ENCODER", "COUNTER", "SHIFT_REG",
];
const SINGLE_INPUT = new Set<LogicGateType>(["NOT", "BUF", "SCHMITT", "TRISTATE_BUF", "TRISTATE_INV", "OPEN_DRAIN", "DFF", "TFF"]);

function logicCatalog(): SymbolCatalogEntry[] {
  const out: SymbolCatalogEntry[] = [];
  for (const type of LOGIC_TYPES) {
    let g;
    try {
      g = getGateGeometry(type, SINGLE_INPUT.has(type) ? 1 : 2);
    } catch {
      continue;
    }
    const parts = [`<path d="${g.ansiPath}" class="schematex-logic-gate-body"/>`];
    for (const p of g.inputPins) parts.push(`<line x1="${p.x - 10}" y1="${p.y}" x2="${p.x}" y2="${p.y}" class="schematex-logic-wire"/>`);
    for (const p of g.outputPins) {
      const bub = p.bubble || g.outputBubble;
      const ox = bub ? p.x + 6 : p.x;
      if (bub) parts.push(`<circle cx="${p.x + 3}" cy="${p.y}" r="3" class="schematex-logic-bubble"/>`);
      parts.push(`<line x1="${ox}" y1="${p.y}" x2="${ox + 10}" y2="${p.y}" class="schematex-logic-wire"/>`);
    }
    out.push({
      id: type,
      label: humanize(type),
      svg: svgDoc(`-14 -6 ${g.width + 28} ${g.height + 12}`, LOGIC_CSS, parts.join("")),
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

// ── Network devices (Cisco-convention icons) ───────────────────────
const NETWORK_CSS =
  ".sx-net-body{fill:#ffffff;stroke:#0f172a;stroke-width:2}" +
  ".sx-net-detail{fill:none;stroke:#0f172a;stroke-width:1}" +
  ".sx-net-glyph{fill:#2563eb;stroke:none}" +
  ".sx-net-glyph-line{fill:none;stroke:#2563eb;stroke-width:1.4}" +
  ".sx-net-icontext{font:700 8px sans-serif;fill:#2563eb}" +
  ".sx-net-cloud-body{fill:#f1f5f9;stroke:#0f172a;stroke-width:2}" +
  ".sx-net-cloudtext{font:600 13px sans-serif;fill:#0f172a}" +
  ".sx-net-bus{stroke:#0f172a;stroke-width:4;stroke-linecap:round}";

const NETWORK_KINDS = [
  "router", "switch", "l3switch", "poeswitch", "firewall", "loadbalancer", "ap",
  "wlc", "gateway", "modem", "ids", "proxy", "vpngw", "server", "serverfarm",
  "pc", "laptop", "mobile", "ipphone", "printer", "storage", "camera", "nvr",
  "dvr", "encoder", "monitor", "internet", "cloud",
] as const;

function networkCatalog(): SymbolCatalogEntry[] {
  const out: SymbolCatalogEntry[] = [];
  for (const kind of NETWORK_KINDS) {
    const { w, h } = iconSize(kind as Parameters<typeof iconSize>[0]);
    const device = { id: kind, kind, label: humanize(kind), groups: [] } as Parameters<typeof drawDeviceIcon>[0];
    let inner: string;
    try {
      inner = drawDeviceIcon(device, { x: 0, y: 0, w, h });
    } catch {
      continue;
    }
    out.push({
      id: kind,
      label: humanize(kind),
      svg: svgDoc(`-6 -6 ${w + 12} ${h + 12}`, NETWORK_CSS, inner),
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

// ── Floor plan furniture & fixtures (AGS plan view) ────────────────
const FLOORPLAN_CSS =
  ".sx-fp-furn{fill:#ffffff;stroke:#475569;stroke-width:1.2}" +
  ".sx-fp-furn-nofill{fill:none;stroke:#475569;stroke-width:1.2}" +
  ".sx-fp-furn-line{fill:none;stroke:#475569;stroke-width:1}" +
  ".sx-fp-furn-dash{fill:none;stroke:#475569;stroke-width:1;stroke-dasharray:4 3}" +
  ".sx-fp-furn-dot{fill:#475569;stroke:none}" +
  ".sx-fp-furn-solid{fill:#334155;stroke:none}" +
  ".sx-fp-board-inner{fill:#ffffff;stroke:none}" +
  ".sx-fp-chair{fill:#f1f5f9;stroke:#475569;stroke-width:1}" +
  ".sx-fp-rug{fill:none;stroke:#94a3b8;stroke-width:1.2;stroke-dasharray:5 4}" +
  ".sx-fp-hatch{fill:none;stroke:#cbd5e1;stroke-width:1}" +
  ".sx-fp-furn-text{font-weight:600;font-family:sans-serif;fill:#475569}";

function floorplanCatalog(): SymbolCatalogEntry[] {
  const scale = 40; // px per meter for the standalone sheet
  const px = (m: number): number => Math.round(m * scale * 100) / 100;
  const out: SymbolCatalogEntry[] = [];
  const dualStandardTypes = new Set([
    "outlet",
    "duplex-outlet",
    "gfci-outlet",
    "outlet-240v",
    "weatherproof-outlet",
    "switch",
    "switch-3way",
    "switch-4way",
    "switch-dimmer",
  ]);
  for (const [id, def] of Object.entries(FLOORPLAN_SYMBOLS)) {
    const [mt, mr, mb, ml] = def.envelope ?? [0, 0, 0, 0];
    const pad = 5;
    const x0 = -px(ml) - pad;
    const y0 = -px(mt) - pad;
    const w = px(def.w + ml + mr) + 2 * pad;
    const h = px(def.h + mt + mb) + 2 * pad;
    const svgFor = (symbols: "nec" | "iec"): string => svgDoc(
      `${x0} ${y0} ${w} ${h}`,
      FLOORPLAN_CSS,
      def.draw({ w: def.w, h: def.h, px, symbols }),
    );
    const hasTwoStandards = dualStandardTypes.has(id);
    const label = humanize(id)
      .replace(/^Gfci\b/, "GFCI")
      .replace(/240v\b/i, "240 V");
    out.push({
      id,
      label: `${label}${hasTwoStandards ? " (NEC)" : ""}`,
      svg: svgFor("nec"),
    });
    if (hasTwoStandards) {
      out.push({
        id: `${id}-iec`,
        label: id === "gfci-outlet" ? "RCD Outlet (IEC)" : `${label} (IEC)`,
        svg: svgFor("iec"),
      });
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

const CATALOGS: Partial<Record<DiagramType, () => SymbolCatalog>> = {
  circuit: () => ({
    type: "circuit",
    label: "Circuit components",
    note: "IEEE 315 / ANSI Y32.2 schematic symbols the netlist/positional engine draws.",
    entries: circuitCatalog(),
  }),
  sld: () => ({
    type: "sld",
    label: "Single-line apparatus",
    note: "IEEE 315 power-apparatus symbols — sources, transformers, switching, protection, loads.",
    entries: sldCatalog(),
  }),
  pid: () => ({
    type: "pid",
    label: "P&ID equipment",
    note: "ANSI/ISA-5.1 process equipment — tanks, columns, exchangers, pumps, and more.",
    entries: pidCatalog(),
  }),
  logic: () => ({
    type: "logic",
    label: "Logic gates",
    note: "IEEE 91 ANSI gate bodies — combinational gates, flip-flops, latches, MUX/decoder, counters.",
    entries: logicCatalog(),
  }),
  network: () => ({
    type: "network",
    label: "Network devices",
    note: "Cisco-convention topology icons — routers, switches, firewalls, servers, cameras, clouds.",
    entries: networkCatalog(),
  }),
  flowchart: () => ({
    type: "flowchart",
    label: "Node icons",
    note: "Inline node icons (servers, databases, cloud, gear…) usable on any flowchart node.",
    entries: flowchartIconCatalog(),
  }),
  floorplan: () => ({
    type: "floorplan",
    label: "Floor plan furniture & fixtures",
    note: "Architectural plan-view symbols, including distinct NEC and IEC outlet/switch forms, auto-seated tables, and residential, commercial, classroom, and event fixtures.",
    entries: floorplanCatalog(),
  }),
};

/** Diagram types that ship a renderable domain symbol catalog. */
export const SYMBOL_CATALOG_TYPES = Object.keys(CATALOGS) as DiagramType[];

export function getSymbolCatalog(type: string): SymbolCatalog | null {
  const factory = CATALOGS[type as DiagramType];
  return factory ? factory() : null;
}
