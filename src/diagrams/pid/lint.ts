import type { SchematexDiagnostic } from "../../core/diagnostics";
import type { PidAST, PidInstrument, PidLineType } from "./types";
import { PID_ACTUATOR_TYPES, PID_FAIL_POSITIONS } from "./types";
import { parsePid } from "./parser";
import { GEOMETRY, normalizePidActuator } from "./symbols";

/**
 * ISA-5.1 instrument-loop completeness lint.
 *
 * The engine never *invents* missing loop elements (that would be guessing at
 * the engineer's intent) — it only flags loops the DSL describes incompletely
 * so a control engineer can trust the diagram at the element level:
 *
 *  1. PID_LOOP_INCOMPLETE — a transmitter that `measures` a variable but has no
 *     signal path reaching a receiving instrument (the classic "transmitter
 *     with a dangling output" mistake). Receivers include controllers,
 *     indicators, recorders, alarms, switches, relays, and final drivers.
 *  2. PID_SIGNAL_TYPE_MISMATCH — a signal line whose type contradicts ISA-5.1
 *     §5.2 convention for the devices it connects (transmitter→controller is
 *     electric; controller→control-valve is pneumatic).
 */
export function lintPid(text: string): SchematexDiagnostic[] {
  let ast: PidAST;
  try {
    ast = parsePid(text);
  } catch {
    // Parse failures are reported by the normal error path; lint stays silent.
    return [];
  }
  return lintPidAst(ast);
}

// Instrument signal lines (everything that isn't a process pipe).
const SIGNAL_TYPES = new Set<PidLineType>([
  "pneumatic",
  "electric",
  "software",
  "capillary",
  "hydraulic",
  "mechanical",
]);

/** Identification letters (the part before the tag number, e.g. `FIC` of `FIC-201`). */
function idLetters(tag: string): string {
  const head = tag.split("-")[0] ?? tag;
  return head.replace(/[^A-Za-z]/g, "").toUpperCase();
}

/** ISA succeeding-letter `C` = controller (FIC, FC, LIC, PIC, TIC, …). */
function isController(tag: string): boolean {
  return idLetters(tag).slice(1).includes("C");
}

/** ISA succeeding-letter `T` = transmitter (FT, LT, PT, TT, FIT, …). */
function isTransmitter(tag: string): boolean {
  return idLetters(tag).slice(1).includes("T");
}

/**
 * ISA succeeding letters that consume or act on a signal. A transmitter may
 * legitimately feed an indicator/recorder/alarm/SIS instead of a controller.
 */
function isSignalReceiver(tag: string): boolean {
  return /[CIRASYZ]/.test(idLetters(tag).slice(1));
}

export function lintPidAst(ast: PidAST): SchematexDiagnostic[] {
  const out: SchematexDiagnostic[] = [];

  // ── Rule 0: unrecognised equipment types ────────────────────────
  // Kept (drawn as a flagged placeholder) but warned about so the partial
  // render is analyzable. The engine never silently substitutes a real glyph.
  for (const eq of ast.equipment) {
    if (eq.equipType !== "unknown") continue;
    out.push({
      severity: "warning",
      code: "PID_UNKNOWN_EQUIP",
      message: `equipment "${eq.id}" has unrecognised type "${eq.rawType ?? ""}"; drawn as a flagged placeholder`,
      hint: `"${eq.rawType ?? ""}" is not an ISA-5.1 / ISO 10628 equipment type. Pick a catalog type (e.g. tank_atm, vessel_v, hx_shell_tube, pump_centrifugal, reactor_cstr). See docs/reference/22-PID-STANDARD.md.`,
      fatal: false,
    });
  }

  const equipById = new Map(ast.equipment.map((eq) => [eq.id, eq]));

  // ── Rule 0b: explicit equipment ports must exist ───────────────
  // A misspelled port must never be routed through a plausible-looking
  // default inlet/outlet. The renderer still draws a partial result, while
  // the diagnostic makes the semantic substitution visible.
  for (const line of ast.lines) {
    for (const [role, anchor] of [["from", line.from], ["to", line.to]] as const) {
      if (!anchor.port) continue;
      const eq = equipById.get(anchor.id);
      if (!eq || eq.equipType === "unknown") continue;
      const ports = GEOMETRY[eq.equipType].ports;
      if (anchor.port in ports) continue;
      out.push({
        severity: "warning",
        code: "PID_UNKNOWN_PORT",
        message: `line ${line.id} ${role} anchor ${anchor.id}.${anchor.port} is not a supported port`,
        hint: `${eq.equipType} supports: ${Object.keys(ports).join(", ")}. Fix the named port; the partial preview uses the normal ${role === "from" ? "outlet" : "inlet"} only to keep the diagram inspectable.`,
        fatal: false,
      });
    }
  }

  // ── Rule 0c: control-valve modifiers use a small typed contract ─
  for (const eq of ast.equipment) {
    if (eq.equipType !== "valve_control") continue;
    if (eq.attrs.actuator && !normalizePidActuator(eq.attrs.actuator)) {
      out.push({
        severity: "warning",
        code: "PID_UNKNOWN_ACTUATOR",
        message: `control valve ${eq.id} has unsupported actuator '${eq.attrs.actuator}'`,
        hint: `Use one of: ${PID_ACTUATOR_TYPES.join(", ")}. The partial preview uses diaphragm.`,
        fatal: false,
      });
    }
    if (
      eq.attrs.fail &&
      !PID_FAIL_POSITIONS.includes(eq.attrs.fail.trim().toUpperCase() as (typeof PID_FAIL_POSITIONS)[number])
    ) {
      out.push({
        severity: "warning",
        code: "PID_UNKNOWN_FAIL_POSITION",
        message: `control valve ${eq.id} has unsupported fail position '${eq.attrs.fail}'`,
        hint: `Use FC (fail closed), FO (fail open), or FL (fail in last position).`,
        fatal: false,
      });
    }
  }

  const instByTag = new Map<string, PidInstrument>();
  for (const inst of ast.instruments) instByTag.set(inst.tag, inst);

  const controlValves = new Map(
    ast.equipment
      .filter((e) => e.equipType === "valve_control")
      .map((e) => [e.id, e])
  );

  // ── Adjacency among instruments via signal lines ───────────────
  const signalAdj = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (!signalAdj.has(a)) signalAdj.set(a, new Set());
    signalAdj.get(a)!.add(b);
  };
  for (const ln of ast.lines) {
    if (!SIGNAL_TYPES.has(ln.lineType)) continue;
    const a = ln.from.id;
    const b = ln.to.id;
    if (instByTag.has(a) && instByTag.has(b)) {
      addEdge(a, b);
      addEdge(b, a);
    }
  }

  const canReachSignalReceiver = (start: string): boolean => {
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur !== start && isSignalReceiver(cur)) return true;
      for (const nxt of signalAdj.get(cur) ?? []) {
        if (!seen.has(nxt)) {
          seen.add(nxt);
          queue.push(nxt);
        }
      }
    }
    return false;
  };

  // ── Rule 1: loop completeness ───────────────────────────────────
  for (const inst of ast.instruments) {
    // Only a transmitter promises an outgoing signal. A local indicator or a
    // standalone process switch may measure something without another node.
    if (!inst.measures || !isTransmitter(inst.tag) || isController(inst.tag)) {
      continue;
    }
    if (!canReachSignalReceiver(inst.tag)) {
      out.push({
        severity: "warning",
        code: "PID_LOOP_INCOMPLETE",
        message: `transmitter ${inst.tag} has no signal path to a receiving instrument`,
        hint: `${inst.tag} measures '${inst.measures}' but no signal line (electric/pneumatic/…) connects it to a controller, indicator, recorder, alarm, switch, relay, or final driver. Add the intended receiving instrument and signal line.`,
        fatal: false,
      });
    }
  }

  // ── Rule 2: signal-line type vs device-type consistency ─────────
  for (const ln of ast.lines) {
    if (!SIGNAL_TYPES.has(ln.lineType)) continue;
    const a = ln.from.id;
    const b = ln.to.id;
    const aInst = instByTag.get(a);
    const bInst = instByTag.get(b);

    // transmitter ↔ controller → expect electric (4–20 mA analog signal)
    const txToCtrl =
      (aInst && isTransmitter(a) && !isController(a) && bInst && isController(b)) ||
      (bInst && isTransmitter(b) && !isController(b) && aInst && isController(a));
    if (txToCtrl && ln.lineType !== "electric") {
      out.push({
        severity: "warning",
        code: "PID_SIGNAL_TYPE_MISMATCH",
        message: `signal line ${a}→${b} is '${ln.lineType}' but a transmitter→controller link should be 'electric' (ISA-5.1 §5.2)`,
        hint: `Set [type: electric] on this line, or rename the devices if the connection is not a transmitter→controller measurement signal.`,
        fatal: false,
      });
      continue;
    }

    // Controller ↔ control valve follows the authored actuator energy source.
    const valve =
      aInst && isController(a) ? controlValves.get(b) :
      bInst && isController(b) ? controlValves.get(a) : undefined;
    const actuator = valve
      ? (normalizePidActuator(valve.attrs.actuator) ?? (valve.attrs.actuator ? undefined : "diaphragm"))
      : undefined;
    const expectedSignal = actuator === "motor" || actuator === "solenoid"
      ? "electric"
      : actuator === "diaphragm" || actuator === "piston"
        ? "pneumatic"
        : undefined;
    if (valve && expectedSignal && ln.lineType !== expectedSignal) {
      out.push({
        severity: "warning",
        code: "PID_SIGNAL_TYPE_MISMATCH",
        message: `signal line ${a}→${b} is '${ln.lineType}' but a ${actuator} actuator should be '${expectedSignal}'`,
        hint: `Set [type: ${expectedSignal}] on this line, or change the valve's actuator attribute to match the actual final control element.`,
        fatal: false,
      });
    }
  }

  return out;
}
