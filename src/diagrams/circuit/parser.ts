import type {
  CircuitAST,
  CircuitComponent,
  CircuitComponentType,
  CircuitDirection,
  CircuitNet,
} from "../../core/types";
import { parseNetlist } from "./netlist";

export class CircuitParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitParseError";
  }
}

const COMPONENT_TYPES = new Set<CircuitComponentType>([
  "resistor", "potentiometer", "rheostat", "thermistor_ntc", "thermistor_ptc",
  "ldr", "varistor", "fuse", "fuse_slow",
  "capacitor", "electrolytic_cap", "variable_cap",
  "inductor", "inductor_iron", "inductor_ferrite", "variable_inductor",
  "ferrite_bead", "crystal", "transformer",
  "diode", "zener", "schottky", "led", "photodiode", "varactor", "tvs_diode", "bridge_rectifier",
  "npn", "pnp", "darlington_npn", "darlington_pnp",
  "nmos", "pmos", "nmos_depletion", "jfet_n", "jfet_p",
  "igbt", "scr", "triac", "diac",
  "phototransistor", "optocoupler",
  "opamp", "comparator", "schmitt_buffer", "tri_state_buffer", "instrumentation_amp",
  "generic_ic", "voltage_regulator", "dc_dc_converter", "555_timer",
  "voltage_source", "current_source", "ac_source", "battery", "vcc",
  "ground", "gnd_signal", "gnd_chassis", "gnd_digital",
  "switch_spst", "switch_spdt", "switch_dpdt", "push_no", "push_nc",
  "relay_coil", "relay_no", "relay_nc",
  "motor", "speaker", "microphone", "buzzer",
  "ammeter", "voltmeter", "wattmeter", "oscilloscope",
  "wire", "dot", "label", "port", "test_point", "no_connect", "antenna",
]);

// Aliases for convenience — DSL uses short names
const ALIASES: Record<string, CircuitComponentType> = {
  vsource: "voltage_source",
  isource: "current_source",
  acsource: "ac_source",
  ecap: "electrolytic_cap",
  pot: "potentiometer",
  xtal: "crystal",
  xfmr: "transformer",
  transistor: "npn",
  bjt_npn: "npn",
  bjt_pnp: "pnp",
  mosfet_n: "nmos",
  mosfet_p: "pmos",
  gnd: "ground",
  ic: "generic_ic",
  reg: "voltage_regulator",
  timer555: "555_timer",
  therm: "thermistor_ntc",
  ntc: "thermistor_ntc",
  ptc: "thermistor_ptc",
  ths: "thermistor_ntc",
};

/** Component types that exist as symbols but aren't listed in CircuitComponentType. */
const EXTRA_TYPES = new Set<string>(["lamp"]);

function normalizeType(raw: string): CircuitComponentType | null {
  const lower = raw.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  if (COMPONENT_TYPES.has(lower as CircuitComponentType)) {
    return lower as CircuitComponentType;
  }
  if (EXTRA_TYPES.has(lower)) {
    // Cast through unknown — symbol lookup handles string; type system happy.
    return lower as unknown as CircuitComponentType;
  }
  return null;
}

const DIRECTIONS = new Set(["right", "left", "up", "down"]);

function parseAttrs(rest: string): { direction?: CircuitDirection; attrs: Record<string, string>; label?: string; value?: string; at?: string; length?: string } {
  const out: {
    direction?: CircuitDirection;
    attrs: Record<string, string>;
    label?: string;
    value?: string;
    at?: string;
    length?: string;
  } = { attrs: {} };

  // Tokenize respecting quoted strings and key=value pairs
  const tokens: string[] = [];
  let i = 0;
  while (i < rest.length) {
    const ch = rest[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    // quoted
    if (ch === '"') {
      const end = rest.indexOf('"', i + 1);
      const tok = rest.slice(i, end < 0 ? rest.length : end + 1);
      tokens.push(tok);
      i = end < 0 ? rest.length : end + 1;
      continue;
    }
    // key=value possibly with quoted value
    let j = i;
    while (j < rest.length && rest[j] !== " " && rest[j] !== "\t") {
      if (rest[j] === "=" && rest[j + 1] === '"') {
        const end = rest.indexOf('"', j + 2);
        j = end < 0 ? rest.length : end + 1;
        break;
      }
      j++;
    }
    tokens.push(rest.slice(i, j));
    i = j;
  }

  for (const tok of tokens) {
    if (!tok) continue;
    if (DIRECTIONS.has(tok.toLowerCase())) {
      out.direction = tok.toLowerCase() as CircuitDirection;
      continue;
    }
    const eq = tok.indexOf("=");
    if (eq > 0) {
      const key = tok.slice(0, eq).trim();
      let val = tok.slice(eq + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (key === "label") out.label = val;
      else if (key === "value") out.value = val;
      else if (key === "at") out.at = val;
      else if (key === "length") out.length = val;
      else out.attrs[key] = val;
      continue;
    }
    // bare attribute flags
    out.attrs[tok] = "true";
  }
  return out;
}

/**
 * Top-level circuit parser. Detects two DSL modes:
 *
 *   1. Positional (Schemdraw-style):   header `circuit "name"`, body uses
 *      direction chains, `wire`, `at:`, bare component types with direction.
 *
 *   2. Netlist (SPICE-style):          header `circuit "name" netlist`, body
 *      uses `<ID> <net1> <net2> [value]` lines. Auto-layout engine computes
 *      positions.
 */
export function parseCircuit(text: string): CircuitAST {
  const rawLines = text.split("\n");
  const firstMeaningful = rawLines
    .map((l) => l.replace(/#.*$/, "").trim())
    .find((l) => l.length > 0) ?? "";

  if (/^circuit\b.*\bnetlist\s*$/i.test(firstMeaningful)) {
    const titleMatch = firstMeaningful.match(/"([^"]*)"/);
    let headerIdx = -1;
    for (let i = 0; i < rawLines.length; i++) {
      const s = rawLines[i].replace(/#.*$/, "").trim();
      if (s.length > 0) {
        headerIdx = i;
        break;
      }
    }
    const body = rawLines.slice(headerIdx + 1).join("\n");
    return parseNetlist(body, titleMatch?.[1]);
  }

  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  let title: string | undefined;
  const components: CircuitComponent[] = [];
  const nets: CircuitNet[] = [];
  const netByName = new Map<string, CircuitNet>();
  let autoId = 0;
  let pendingAt: string | undefined;

  const mkId = (prefix: string) => `${prefix}_${autoId++}`;

  for (const rawLine of lines) {
    const stripped = rawLine.replace(/#.*$/, "").trim();
    if (!stripped) continue;

    // header
    if (/^circuit\b/i.test(stripped)) {
      const t = stripped.match(/"([^"]*)"/);
      if (t) title = t[1];
      continue;
    }

    // at: <anchor>
    const atMatch = stripped.match(/^at:\s*(.+)$/i);
    if (atMatch) {
      pendingAt = atMatch[1].trim();
      continue;
    }

    // net NAME
    const netDecl = stripped.match(/^net\s+([a-zA-Z_][\w]*)\s*$/i);
    if (netDecl) {
      const name = netDecl[1];
      if (!netByName.has(name)) {
        const n: CircuitNet = { id: name, anchors: [] };
        netByName.set(name, n);
        nets.push(n);
      }
      continue;
    }

    // net NAME: dot  (declare net AND place a dot+remember anchor)
    const netDotMatch = stripped.match(/^net\s+([a-zA-Z_][\w]*)\s*:\s*dot\s*$/i);
    if (netDotMatch) {
      const name = netDotMatch[1];
      let n = netByName.get(name);
      if (!n) {
        n = { id: name, anchors: [] };
        netByName.set(name, n);
        nets.push(n);
      }
      const id = mkId("dot");
      components.push({
        id,
        componentType: "dot",
        direction: "right",
        at: pendingAt,
        attrs: { net: name },
      });
      n.anchors.push(`${id}.end`);
      pendingAt = `${id}.end`;
      continue;
    }

    // label "text" direction?
    const labelMatch = stripped.match(/^label\s+"([^"]*)"(?:\s+(right|left|up|down))?\s*$/i);
    if (labelMatch) {
      const id = mkId("lbl");
      components.push({
        id,
        componentType: "label",
        direction: (labelMatch[2]?.toLowerCase() as CircuitDirection) ?? "right",
        at: pendingAt,
        label: labelMatch[1],
      });
      // labels don't advance cursor
      continue;
    }

    // wire <direction> [N px]
    const wireMatch = stripped.match(/^wire(?:\s+(right|left|up|down))?(?:\s+(\d+)(?:px)?)?\s*$/i);
    if (wireMatch) {
      const id = mkId("w");
      components.push({
        id,
        componentType: "wire",
        direction: (wireMatch[1]?.toLowerCase() as CircuitDirection) ?? "right",
        at: pendingAt,
        attrs: wireMatch[2] ? { length: wireMatch[2] } : {},
      });
      pendingAt = `${id}.end`;
      continue;
    }

    // bare type (dot, ground, etc.) with optional direction + attrs
    const bareMatch = stripped.match(/^([a-zA-Z_][\w]*)(\s+.*)?$/);
    const colonMatch = stripped.match(/^([a-zA-Z_][\w]*)\s*:\s*([a-zA-Z_][\w]*)(\s+.*)?$/);

    if (colonMatch) {
      const id = colonMatch[1];
      const typeStr = colonMatch[2];
      const norm = normalizeType(typeStr);
      if (!norm) {
        throw new CircuitParseError(`Unknown component type: ${typeStr}`);
      }
      const rest = colonMatch[3] ?? "";
      const parsed = parseAttrs(rest);
      const comp: CircuitComponent = {
        id,
        componentType: norm,
        direction: parsed.direction ?? "right",
        at: parsed.at ?? pendingAt,
        label: parsed.label,
        value: parsed.value,
        attrs: parsed.attrs,
      };
      if (parsed.length) {
        comp.attrs = { ...comp.attrs, length: parsed.length };
      }
      components.push(comp);
      pendingAt = `${id}.end`;
      continue;
    }

    if (bareMatch) {
      const typeStr = bareMatch[1];
      const norm = normalizeType(typeStr);
      if (!norm) {
        // ignore unknown bare tokens rather than throwing — keeps DSL forgiving
        continue;
      }
      const rest = bareMatch[2] ?? "";
      const parsed = parseAttrs(rest);
      const id = mkId(norm);
      const comp: CircuitComponent = {
        id,
        componentType: norm,
        direction: parsed.direction ?? "right",
        at: parsed.at ?? pendingAt,
        label: parsed.label,
        value: parsed.value,
        attrs: parsed.attrs,
      };
      components.push(comp);
      pendingAt = `${id}.end`;
      continue;
    }
  }

  return {
    type: "circuit",
    title,
    components,
    nets,
    mode: "positional",
  };
}
