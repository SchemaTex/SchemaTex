import type { SchematexDiagnostic } from "../../core/diagnostics";
import type { PidAST, PidInstrument, PidLineType } from "./types";
import { parsePid } from "./parser";

/**
 * ISA-5.1 instrument-loop completeness lint.
 *
 * The engine never *invents* missing loop elements (that would be guessing at
 * the engineer's intent) — it only flags loops the DSL describes incompletely
 * so a control engineer can trust the diagram at the element level:
 *
 *  1. PID_LOOP_INCOMPLETE — an instrument that `measures` a variable but has no
 *     signal path reaching a controller (the classic "transmitter with a
 *     dangling output" mistake).
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

  const instByTag = new Map<string, PidInstrument>();
  for (const inst of ast.instruments) instByTag.set(inst.tag, inst);

  const controlValveIds = new Set(
    ast.equipment.filter((e) => e.equipType === "valve_control").map((e) => e.id)
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

  const canReachController = (start: string): boolean => {
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur !== start && isController(cur)) return true;
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
    // A sensing element / transmitter participates in a loop when it `measures`
    // a variable. A controller is itself the loop's brain, so skip those.
    if (!inst.measures || isController(inst.tag)) continue;
    if (!canReachController(inst.tag)) {
      out.push({
        severity: "warning",
        code: "PID_LOOP_INCOMPLETE",
        message: `instrument loop ${inst.tag} has no signal path to a controller`,
        hint: `${inst.tag} measures '${inst.measures}' but no signal line (electric/pneumatic/…) connects it to a controller instrument (e.g. a tag with a 'C' function letter such as FIC). Add a signal line from ${inst.tag} to the controller.`,
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

    // controller ↔ control valve → expect pneumatic (3–15 psi to actuator)
    const ctrlToValve =
      (aInst && isController(a) && controlValveIds.has(b)) ||
      (bInst && isController(b) && controlValveIds.has(a));
    if (ctrlToValve && ln.lineType !== "pneumatic") {
      out.push({
        severity: "warning",
        code: "PID_SIGNAL_TYPE_MISMATCH",
        message: `signal line ${a}→${b} is '${ln.lineType}' but a controller→control-valve link should be 'pneumatic' (ISA-5.1 §5.2)`,
        hint: `Set [type: pneumatic] on this line, or use [type: electric] only if the valve has an electric actuator.`,
        fatal: false,
      });
    }
  }

  return out;
}
