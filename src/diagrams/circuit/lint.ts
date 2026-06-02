import type { SchematexDiagnostic } from "../../core/diagnostics";
import type {
  CircuitAST,
  CircuitComponent,
  CircuitComponentType,
} from "../../core/types";
import { parseCircuit } from "./parser";

/**
 * Circuit electrical-rule check (ERC) + recoverable-input lint.
 *
 * Every diagnostic here is **non-fatal** — the schematic still renders. Their
 * only effect is to flip the result status to `partial` and surface the issue
 * to the author. This follows Schematex's degrade-not-reject philosophy: we
 * never blank a drawable schematic just because it is electrically suspect.
 *
 * Connectivity-based rules (floating nets, missing ground, net-name typos) need
 * the authoritative net graph that only the **netlist** mode builds (`pinMap` +
 * fully-populated `nets`). In positional mode connectivity is implicit in the
 * direction chain and not captured in `nets`, so those rules are skipped there
 * to avoid false positives. The duplicate-id rule runs in both modes.
 *
 * Rules:
 *   - CIRCUIT_PIN_UNDERSPECIFIED — multi-terminal part given fewer nets than
 *     pins (missing pins left floating). [both modes via recovered]
 *   - CIRCUIT_DUPLICATE_ID        — same component id declared twice. [both]
 *   - CIRCUIT_NO_GROUND           — has a source but no ground reference. [netlist]
 *   - CIRCUIT_FLOATING_NET        — a node only one pin connects to. [netlist]
 *   - CIRCUIT_NET_TYPO            — a dangling net one edit away from a wired
 *     net (likely a misspelled connection). [netlist]
 */

/** Symbols for which a net with a single connection is normal (reference/flag). */
const INTENTIONAL_SINGLE_PIN = new Set<CircuitComponentType>([
  "ground", "gnd_signal", "gnd_chassis", "gnd_digital",
  "vcc", "antenna", "no_connect", "test_point", "label", "port",
]);

/** Energy sources that demand a ground/return reference. */
const SOURCE_TYPES = new Set<CircuitComponentType>([
  "voltage_source", "ac_source", "battery", "current_source",
]);

const GROUND_TYPES = new Set<CircuitComponentType>([
  "ground", "gnd_signal", "gnd_chassis", "gnd_digital",
]);

/** Auto-synthesized floating no-connect nets from pin under-specification. */
const NC_NET = /_nc\d+$/;

function componentIdOfAnchor(anchor: string): string {
  const dot = anchor.lastIndexOf(".");
  return dot < 0 ? anchor : anchor.slice(0, dot);
}

/** Levenshtein distance, bailing out as soon as it provably exceeds `max`. */
function editDistanceWithin(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return false;
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length] <= max;
}

export function lintCircuit(text: string): SchematexDiagnostic[] {
  let ast: CircuitAST;
  try {
    ast = parseCircuit(text);
  } catch {
    return [];
  }

  const out: SchematexDiagnostic[] = [];

  // ── Duplicate component id (both modes) ───────────────────────────────────
  // Auto-synthesized ids (auto ground, positional auto-ids) are unique by
  // construction; user-authored collisions silently overwrite a pinMap entry.
  const idCounts = new Map<string, number>();
  for (const c of ast.components) {
    if (c.id.startsWith("_")) continue; // engine-internal (e.g. _GND0)
    idCounts.set(c.id, (idCounts.get(c.id) ?? 0) + 1);
  }
  for (const [id, n] of idCounts) {
    if (n > 1) {
      out.push({
        severity: "error",
        code: "CIRCUIT_DUPLICATE_ID",
        message: `component id "${id}" is declared ${n} times; each reference designator must be unique`,
        hint: `Rename the duplicates (e.g. ${id}, ${id}B). With a repeated id only the last line's connections are kept.`,
        fatal: false,
      });
    }
  }

  // ── Under-specified multi-terminal parts (recovered during parse) ─────────
  for (const u of ast.recovered?.underspecified ?? []) {
    out.push({
      severity: "warning",
      code: "CIRCUIT_PIN_UNDERSPECIFIED",
      message: `component ${u.id} (${u.type}) needs ${u.expected} nets but got ${u.got}; the missing terminal(s) were left floating`,
      hint: `Give ${u.id} all ${u.expected} net connections (e.g. a transformer is \`${u.id} p1 p2 s1 s2 type=transformer\`). Unconnected pins are drawn but not wired.`,
      fatal: false,
    });
  }

  // Connectivity ERC needs the authoritative netlist graph.
  if (ast.mode !== "netlist") return out;

  const compById = new Map<string, CircuitComponent>();
  for (const c of ast.components) compById.set(c.id, c);

  // ── No ground reference ───────────────────────────────────────────────────
  // The netlist parser auto-creates a GND net + ground symbol whenever any pin
  // references ground, so this only fires when the author never grounded at all.
  const hasGround =
    ast.nets.some((n) => n.id === "GND") ||
    ast.components.some((c) => GROUND_TYPES.has(c.componentType));
  const sources = ast.components.filter((c) => SOURCE_TYPES.has(c.componentType));
  if (sources.length > 0 && !hasGround) {
    out.push({
      severity: "warning",
      code: "CIRCUIT_NO_GROUND",
      message: `circuit has ${sources.length} source(s) (e.g. ${sources[0].id}) but no ground reference; node voltages are undefined`,
      hint: `Tie a return node to ground — name a net \`0\`/\`GND\` (e.g. \`${sources[0].id} ${sources[0].id.toLowerCase()}_out 0\`) or add a ground symbol.`,
      fatal: false,
    });
  }

  // ── Floating nets + likely net-name typos ─────────────────────────────────
  // A net only one pin touches is a dangling node. Before flagging it as
  // generically floating, check whether it is one edit away from a properly
  // wired net — that points at a misspelled connection, which is far more
  // actionable than "floating".
  const wired = ast.nets.filter(
    (n) => n.anchors.length >= 2 && !NC_NET.test(n.id)
  );
  for (const net of ast.nets) {
    if (net.id === "GND") continue;            // ground rail fans out by nature
    if (NC_NET.test(net.id)) continue;         // already covered by underspecified
    if (net.anchors.length !== 1) continue;

    const comp = compById.get(componentIdOfAnchor(net.anchors[0]));
    if (comp && INTENTIONAL_SINGLE_PIN.has(comp.componentType)) continue;

    const lower = net.id.toLowerCase();
    const typoTarget = wired.find(
      (w) =>
        w.id.toLowerCase() !== lower &&
        Math.max(w.id.length, net.id.length) >= 3 &&
        editDistanceWithin(lower, w.id.toLowerCase(), 1)
    );

    if (typoTarget) {
      out.push({
        severity: "warning",
        code: "CIRCUIT_NET_TYPO",
        message: `net "${net.id}" connects to only one pin and is one character from "${typoTarget.id}" — likely a misspelled connection`,
        hint: `If they are the same node, rename "${net.id}" to "${typoTarget.id}" so the pins join.`,
        fatal: false,
      });
    } else {
      out.push({
        severity: "warning",
        code: "CIRCUIT_FLOATING_NET",
        message: `net "${net.id}" connects to only one pin (${net.anchors[0]}); nothing else joins this node`,
        hint: `Wire "${net.id}" to another pin, or mark the pin as intentionally open with a no-connect.`,
        fatal: false,
      });
    }
  }

  return out;
}
