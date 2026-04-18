/**
 * Netlist DSL parser — SPICE-subset text → CircuitAST.
 *
 * Grammar (line-oriented, after stripping `circuit "name" netlist` header):
 *
 *   R1 vin vout 10k              ← 2-terminal passive
 *   C1 out 0 100n                ← `0` / `gnd` / `GND` → ground net
 *   V1 vin 0 5V                  ← voltage source
 *   D1 vout 0 value="1N4007"     ← diode
 *   Q1 c b e npn                 ← 3-terminal, explicit model
 *   M1 d g s nmos
 *   # comment
 *
 *  Pin ordering by prefix (SPICE conventions):
 *    R/C/L/F(fuse)  → [p1, p2]
 *    D              → [anode, cathode]
 *    V/I            → [plus, minus]
 *    Q              → [c, b, e]
 *    M/J            → [d, g, s]
 *    S (switch)     → [p1, p2]
 *    U (IC)         → custom via pins="vcc,gnd,out,..." attr
 *
 *  After the pin list, trailing tokens can be:
 *    - a bare value (e.g. "10k")  → value
 *    - a bare model name (e.g. "npn", "1N4007") → componentType override or value
 *    - key=value pairs (value=, label=, type=, ...)
 */
import type {
  CircuitAST,
  CircuitComponent,
  CircuitComponentType,
  CircuitNet,
} from "../../core/types";

export class NetlistParseError extends Error {
  constructor(message: string, public readonly line?: number) {
    super(message);
    this.name = "NetlistParseError";
  }
}

/**
 * Map from SPICE prefix → default type + pin order.
 * Pin names MUST match the anchor names in the corresponding symbol definition
 * (symbols.ts). Passive 2-terminals use `start` / `end`; sources use
 * `plus` / `minus`; BJTs use `c/b/e`; FETs use `d/g/s`.
 */
const PREFIX_MAP: Record<string, { type: CircuitComponentType; pins: string[] }> = {
  R: { type: "resistor", pins: ["start", "end"] },
  C: { type: "capacitor", pins: ["start", "end"] },
  L: { type: "inductor", pins: ["start", "end"] },
  D: { type: "diode", pins: ["start", "end"] }, // anode → start, cathode → end
  V: { type: "voltage_source", pins: ["plus", "minus"] },
  I: { type: "current_source", pins: ["plus", "minus"] },
  Q: { type: "npn", pins: ["c", "b", "e"] },
  M: { type: "nmos", pins: ["d", "g", "s"] },
  J: { type: "jfet_n", pins: ["d", "g", "s"] },
  S: { type: "switch_spst", pins: ["start", "end"] },
  F: { type: "fuse", pins: ["start", "end"] },
  B: { type: "battery", pins: ["plus", "minus"] },
  K: { type: "relay_coil", pins: ["start", "end"] },
  U: { type: "generic_ic", pins: [] }, // pins declared via pins="..." attr
  X: { type: "generic_ic", pins: [] },
};

/** Aliases for type=xxx — mirror parser.ts aliases. */
const TYPE_ALIASES: Record<string, CircuitComponentType> = {
  vsource: "voltage_source",
  isource: "current_source",
  acsource: "ac_source",
  ecap: "electrolytic_cap",
  pot: "potentiometer",
  gnd: "ground",
  ic: "generic_ic",
  reg: "voltage_regulator",
  timer555: "555_timer",
  transistor: "npn",
};

/** Ground net aliases. */
const GROUND_NETS = new Set(["0", "gnd", "GND", "Gnd", "ground", "Ground"]);

function tokenize(line: string): string[] {
  // Split on whitespace, respecting key="quoted values with spaces"
  const tokens: string[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if (ch === '"') {
      const end = line.indexOf('"', i + 1);
      tokens.push(line.slice(i, end < 0 ? line.length : end + 1));
      i = end < 0 ? line.length : end + 1;
      continue;
    }
    let j = i;
    while (j < line.length && line[j] !== " " && line[j] !== "\t") {
      if (line[j] === "=" && line[j + 1] === '"') {
        const end = line.indexOf('"', j + 2);
        j = end < 0 ? line.length : end + 1;
        break;
      }
      j++;
    }
    tokens.push(line.slice(i, j));
    i = j;
  }
  return tokens;
}

function isKeyEqVal(tok: string): boolean {
  const eq = tok.indexOf("=");
  return eq > 0 && /^[a-zA-Z_][\w]*$/.test(tok.slice(0, eq));
}

function parseKV(tok: string): [string, string] {
  const eq = tok.indexOf("=");
  const key = tok.slice(0, eq).trim();
  let val = tok.slice(eq + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return [key, val];
}

/**
 * Parse a netlist body (lines after `circuit "name" netlist` header).
 * Returns components + nets + pinMap.
 */
export function parseNetlist(
  body: string,
  title?: string
): CircuitAST {
  const components: CircuitComponent[] = [];
  const netByName = new Map<string, CircuitNet>();
  const pinMap: Record<string, Record<string, string>> = {};
  let autoGnd = 0;

  const ensureNet = (name: string): CircuitNet => {
    let n = netByName.get(name);
    if (!n) {
      n = { id: name, anchors: [] };
      netByName.set(name, n);
    }
    return n;
  };

  const lines = body.split("\n").map((l) => l.replace(/\r$/, ""));

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const raw = lines[lineIdx];
    const stripped = raw.replace(/#.*$/, "").trim();
    if (!stripped) continue;

    const tokens = tokenize(stripped);
    if (tokens.length < 2) {
      throw new NetlistParseError(
        `Netlist line must have at least ID + one net: "${stripped}"`,
        lineIdx + 1
      );
    }

    const id = tokens[0];
    if (!/^[a-zA-Z_][\w]*$/.test(id)) {
      throw new NetlistParseError(`Invalid component id: "${id}"`, lineIdx + 1);
    }

    // Separate net refs from trailing attrs. Net refs are the positional
    // (non key=value) tokens immediately after the id.
    let cursor = 1;
    const netRefs: string[] = [];
    while (cursor < tokens.length && !isKeyEqVal(tokens[cursor])) {
      netRefs.push(tokens[cursor]);
      cursor++;
    }

    // Collect key=value pairs
    const kv: Record<string, string> = {};
    for (; cursor < tokens.length; cursor++) {
      if (!isKeyEqVal(tokens[cursor])) {
        throw new NetlistParseError(
          `Expected key=value after nets, got "${tokens[cursor]}"`,
          lineIdx + 1
        );
      }
      const [k, v] = parseKV(tokens[cursor]);
      kv[k] = v;
    }

    // Determine component type + pin order
    const prefix = id[0].toUpperCase();
    const defaults = PREFIX_MAP[prefix];
    let cType: CircuitComponentType;
    let pinOrder: string[];

    if (kv.type) {
      const t = kv.type.toLowerCase();
      cType = (TYPE_ALIASES[t] ?? t) as CircuitComponentType;
      pinOrder = defaults?.pins ?? ["p1", "p2"];
    } else if (defaults) {
      cType = defaults.type;
      pinOrder = defaults.pins;
    } else {
      throw new NetlistParseError(
        `Cannot infer type from id "${id}" — use type= override`,
        lineIdx + 1
      );
    }

    // Net refs consumption depends on type: last net ref may actually be the
    // "value" / "model" if it doesn't look like a net name.
    // Heuristic: if we have more refs than expected pins+0, last one is value.
    // Model override: Q/D/M can have a model name at the end (e.g. "Q1 c b e npn")
    const expectedPins = pinOrder.length;
    let valueFromTail: string | undefined;

    if (netRefs.length > expectedPins && expectedPins > 0) {
      // tail contains model/value
      const tail = netRefs.slice(expectedPins);
      netRefs.length = expectedPins;
      // Try to interpret first tail token as type override (model name)
      const first = tail[0].toLowerCase();
      if (TYPE_ALIASES[first]) {
        cType = TYPE_ALIASES[first];
      } else if (
        first === "npn" || first === "pnp" ||
        first === "nmos" || first === "pmos" ||
        first === "jfet_n" || first === "jfet_p" ||
        first === "zener" || first === "schottky" || first === "led" ||
        first === "photodiode"
      ) {
        cType = first as CircuitComponentType;
        // Rebuild pinOrder for transistor flips (pnp mirrors npn pin names)
        if (first === "pnp") pinOrder = ["c", "b", "e"];
        if (first === "pmos" || first === "jfet_p") pinOrder = ["d", "g", "s"];
      } else {
        // Treat as value
        valueFromTail = tail.join(" ");
      }
      // If there are more trailing tokens after the model, those are value
      if (tail.length > 1 && !valueFromTail) {
        valueFromTail = tail.slice(1).join(" ");
      }
    }

    // Ground auto-connection: if this is a ground symbol, one net slot is
    // implicit. The parser supports `GND1 gnd_net` as a 1-pin component.
    if (cType === "ground" || cType === "gnd_signal" || cType === "gnd_chassis" || cType === "gnd_digital") {
      pinOrder = ["start"];
    }

    if (netRefs.length < pinOrder.length) {
      throw new NetlistParseError(
        `Component ${id} (${cType}) expects ${pinOrder.length} nets, got ${netRefs.length}`,
        lineIdx + 1
      );
    }

    // Build pinMap entry, binding each pin to a net. Ground net aliases are
    // normalized to a shared canonical name.
    const pins: Record<string, string> = {};
    for (let p = 0; p < pinOrder.length; p++) {
      let net = netRefs[p];
      if (GROUND_NETS.has(net)) net = "GND";
      pins[pinOrder[p]] = net;
      ensureNet(net).anchors.push(`${id}.${pinOrder[p]}`);
    }

    // Auto-synthesize a ground component whenever GND net is referenced so the
    // symbol shows up. We emit one per GND reference pin later, or a single
    // floor — keep it simple: one ground symbol attached to the GND net.
    // (Done below, after the main component scan.)

    pinMap[id] = pins;

    const comp: CircuitComponent = {
      id,
      componentType: cType,
      direction: "right",
      label: kv.label ?? id,
      value: kv.value ?? valueFromTail,
      attrs: {},
    };
    // Propagate extra key=value attrs (skip well-known keys)
    for (const [k, v] of Object.entries(kv)) {
      if (k === "label" || k === "value" || k === "type") continue;
      comp.attrs![k] = v;
    }
    components.push(comp);
  }

  // Auto-emit ground symbols for the GND net if any component pin references it
  // but no explicit ground component exists.
  if (netByName.has("GND")) {
    const hasGroundSym = components.some((c) =>
      c.componentType === "ground" ||
      c.componentType === "gnd_signal" ||
      c.componentType === "gnd_chassis" ||
      c.componentType === "gnd_digital"
    );
    if (!hasGroundSym) {
      const gId = `_GND${autoGnd++}`;
      components.push({
        id: gId,
        componentType: "ground",
        direction: "down",
        label: undefined,
        value: undefined,
        attrs: { auto: "true" },
      });
      pinMap[gId] = { start: "GND" };
      ensureNet("GND").anchors.push(`${gId}.start`);
    }
  }

  const nets: CircuitNet[] = Array.from(netByName.values());

  return {
    type: "circuit",
    title,
    components,
    nets,
    pinMap,
    mode: "netlist",
  };
}
