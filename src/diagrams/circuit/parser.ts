import type {
  CircuitAST,
  CircuitComponent,
  CircuitComponentType,
  CircuitDirection,
  CircuitNet,
} from "../../core/types";
import { parseNetlist } from "./netlist";
import { getSymbol } from "./symbols";
import { matchQuotedTitle } from "../../core/quotes";
import { createSourceLocator, findFirstQuotedRange } from "../../core/source-range";
import type { SourceRange } from "../../core/types";

export class CircuitParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitParseError";
  }
}

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
  terminal: "terminal_block",
  tb: "terminal_block",
  junction_box: "terminal_block",
  jbox: "terminal_block",
  cabinet: "enclosure",
  panel: "enclosure",
  backplate: "enclosure",
  dinrail: "din_rail",
  "din-rail": "din_rail",
  duct: "wire_duct",
  wireduct: "wire_duct",
  trunking: "wire_duct",
  controller: "plc",
  indicator: "pilot_light",
  pilot: "pilot_light",
  selector: "selector_switch",
  estop: "emergency_stop",
  e_stop: "emergency_stop",
  "e-stop": "emergency_stop",
  therm: "thermistor_ntc",
  ntc: "thermistor_ntc",
  ptc: "thermistor_ptc",
  ths: "thermistor_ntc",
  // Industrial control aliases (IEC letter codes)
  coil: "relay_coil",
  relay: "relay_coil",
  km: "contactor",
  solenoid: "solenoid_valve",
  ev: "solenoid_valve",
  overload: "thermal_overload",
  thermal: "thermal_overload",
  disconnect: "disconnect_switch",
  isolator: "disconnect_switch",
  light: "lamp",
  bulb: "lamp",
  flasher: "automotive_flasher_3pin",
  automotive_flasher: "automotive_flasher_3pin",
  selector_center_off: "switch_spdt_center_off",
  switch_center_off: "switch_spdt_center_off",
};

function normalizeType(raw: string): CircuitComponentType | null {
  const lower = raw.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  // The symbol registry is the capability source of truth: if a type can be
  // parsed, it must have a renderer definition in the same build.
  if (getSymbol(lower)) {
    return lower as CircuitComponentType;
  }
  return null;
}

const DIRECTIONS = new Set(["right", "left", "up", "down"]);

function assignedValueRange(
  rest: string,
  key: string,
  absoluteStart: number,
  locator: ReturnType<typeof createSourceLocator>
): SourceRange | undefined {
  const match = new RegExp(`(?:^|\\s)${key}=("[^"]*"|\\S+)`).exec(rest);
  if (!match) return undefined;
  const token = match[1]!;
  const start = match.index + match[0].lastIndexOf(token);
  return locator.range(absoluteStart + start, absoluteStart + start + token.length);
}

function parseAttrs(
  rest: string,
  absoluteStart: number,
  locator: ReturnType<typeof createSourceLocator>
): { direction?: CircuitDirection; attrs: Record<string, string>; label?: string; value?: string; at?: string; length?: string; labelSourceRange?: SourceRange; valueSourceRange?: SourceRange } {
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
  return {
    ...out,
    labelSourceRange: assignedValueRange(rest, "label", absoluteStart, locator),
    valueSourceRange: assignedValueRange(rest, "value", absoluteStart, locator),
  };
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
  const locator = createSourceLocator(text);
  const rawLines = text.split("\n");
  const firstMeaningful = rawLines
    .map((l) => l.replace(/[#;].*$/, "").trim())
    .find((l) => l.length > 0) ?? "";

  if (/^circuit\b.*\bnetlist\s*$/i.test(firstMeaningful)) {
    const netlistTitle = matchQuotedTitle(firstMeaningful);
    let headerIdx = -1;
    for (let i = 0; i < rawLines.length; i++) {
      const s = rawLines[i].replace(/[#;].*$/, "").trim();
      if (s.length > 0) {
        headerIdx = i;
        break;
      }
    }
    const body = rawLines.slice(headerIdx + 1).join("\n");
    const ast = parseNetlist(body, netlistTitle);
    const header = rawLines[headerIdx]!.replace(/\r$/, "");
    const token = findFirstQuotedRange(header);
    if (token) {
      const headerStart = rawLines.slice(0, headerIdx).reduce((sum, line) => sum + line.length + 1, 0);
      ast.titleSourceRange = locator.range(headerStart + token.start, headerStart + token.end);
    }
    let sourceOffset = rawLines.slice(0, headerIdx + 1).reduce((sum, line) => sum + line.length + 1, 0);
    for (const line of rawLines.slice(headerIdx + 1)) {
      const id = /^\s*([a-zA-Z_][\w]*)/.exec(line)?.[1];
      const component = id ? ast.components.find((candidate) => candidate.id === id) : undefined;
      if (component) {
        for (const key of ["label", "value"] as const) {
          const match = new RegExp(`(?:^|\\s)${key}=("[^"]*"|\\S+)`).exec(line);
          if (!match) continue;
          const valueToken = match[1]!;
          const valueStart = match.index + match[0].lastIndexOf(valueToken);
          component[key === "label" ? "labelSourceRange" : "valueSourceRange"] = locator.range(
            sourceOffset + valueStart,
            sourceOffset + valueStart + valueToken.length
          );
        }
      }
      sourceOffset += line.length + 1;
    }
    return ast;
  }

  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  let title: string | undefined;
  let titleSourceRange: SourceRange | undefined;
  const components: CircuitComponent[] = [];
  const nets: CircuitNet[] = [];
  const netByName = new Map<string, CircuitNet>();
  let autoId = 0;
  let pendingAt: string | undefined;

  const mkId = (prefix: string) => `${prefix}_${autoId++}`;

  let lineStart = 0;
  for (const rawLine of lines) {
    const stripped = rawLine.replace(/[#;].*$/, "").trim();
    const absoluteStrippedStart = lineStart + Math.max(0, rawLine.indexOf(stripped));
    lineStart += rawLine.length + 1;
    if (!stripped) continue;

    // header
    if (/^circuit\b/i.test(stripped)) {
      const t = matchQuotedTitle(stripped);
      if (t !== undefined) {
        title = t;
        const token = findFirstQuotedRange(stripped);
        if (token) titleSourceRange = locator.range(absoluteStrippedStart + token.start, absoluteStrippedStart + token.end);
      }
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
        stableId: false,
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
        stableId: false,
        componentType: "label",
        direction: (labelMatch[2]?.toLowerCase() as CircuitDirection) ?? "right",
        at: pendingAt,
        label: labelMatch[1],
        labelSourceRange: (() => {
          const token = findFirstQuotedRange(stripped);
          return token ? locator.range(absoluteStrippedStart + token.start, absoluteStrippedStart + token.end) : undefined;
        })(),
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
        stableId: false,
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
      const parsed = parseAttrs(rest, absoluteStrippedStart + stripped.length - rest.length, locator);
      const comp: CircuitComponent = {
        id,
        stableId: true,
        componentType: norm,
        direction: parsed.direction ?? "right",
        at: parsed.at ?? pendingAt,
        label: parsed.label,
        labelSourceRange: parsed.labelSourceRange,
        value: parsed.value,
        valueSourceRange: parsed.valueSourceRange,
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
        // An identifier-led line whose head is not a known component type is
        // almost always a botched declaration — a typo'd type, or (the common
        // one) netlist-style connectivity written WITHOUT the `netlist` header,
        // e.g. `breaker CB1 (L L1) 16A`. Silently dropping such lines used to
        // render a misleadingly near-empty schematic that still reported
        // success, so nothing downstream (validateDsl / the caller's post-gen
        // check) could catch it. Surface it as a real error instead — matching
        // the `id: type` colon form above and every other diagram's unknown-kind
        // handling.
        throw new CircuitParseError(
          `Unknown component type: "${typeStr}". ` +
            `For SPICE-style connectivity (Id net1 net2 [value]), start the diagram with the ` +
            `\`netlist\` header: circuit "..." netlist.`
        );
      }
      const rest = bareMatch[2] ?? "";
      const parsed = parseAttrs(rest, absoluteStrippedStart + stripped.length - rest.length, locator);
      const id = mkId(norm);
      const comp: CircuitComponent = {
        id,
        stableId: false,
        componentType: norm,
        direction: parsed.direction ?? "right",
        at: parsed.at ?? pendingAt,
        label: parsed.label,
        labelSourceRange: parsed.labelSourceRange,
        value: parsed.value,
        valueSourceRange: parsed.valueSourceRange,
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
    titleSourceRange,
    components,
    nets,
    mode: "positional",
  };
}
