import type {
  LogicGateAST,
  LogicGateInput,
  LogicGateOutput,
  LogicGateNode,
  LogicGateType,
  LogicGateStyle,
  LogicGateModule,
} from "../../core/types";

export class LogicParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogicParseError";
  }
}

const GATE_TYPES = new Set<string>([
  "AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR", "BUF",
  "TRISTATE_BUF", "TRISTATE_INV", "OPEN_DRAIN", "SCHMITT",
  "DFF", "JKFF", "SRFF", "TFF", "LATCH_SR", "LATCH_D",
  "MUX", "DEMUX", "DECODER", "ENCODER", "COUNTER", "SHIFT_REG",
]);

function splitIds(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseInputList(s: string): string[] {
  // Supports named (D=A) or positional. Returns raw tokens (keep ~ prefix for active-low).
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((tok) => {
      const eq = tok.indexOf("=");
      return eq >= 0 ? tok.slice(eq + 1).trim() : tok;
    });
}

export function parseLogic(text: string): LogicGateAST {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, "").trim());
  let title: string | undefined;
  let style: LogicGateStyle | undefined;
  const inputs: LogicGateInput[] = [];
  const outputs: LogicGateOutput[] = [];
  const gates: LogicGateNode[] = [];
  const modules: LogicGateModule[] = [];
  const moduleStack: string[] = [];
  let moduleCounter = 0;
  const explicitOutputFrom = new Map<string, string>();

  for (const rawLine of lines) {
    // Strip line comments
    const line = rawLine.replace(/#.*$/, "").replace(/--.*$/, "").trim();
    if (!line) continue;

    // module "Label" {   or  module Label {
    const modOpen = line.match(/^module\s+(?:"([^"]+)"|([a-zA-Z_][\w]*))\s*\{$/);
    if (modOpen) {
      const label = modOpen[1] ?? modOpen[2];
      const id = `mod_${moduleCounter++}`;
      modules.push({ id, label });
      moduleStack.push(id);
      continue;
    }

    // close module
    if (line === "}") {
      if (moduleStack.length === 0) {
        throw new LogicParseError("Unmatched `}` — no open module");
      }
      moduleStack.pop();
      continue;
    }

    // Header
    if (/^logic\b/i.test(line)) {
      const t = line.match(/"([^"]*)"/);
      if (t) title = t[1];
      const s = line.match(/style\s*:\s*(ansi|iec)/i);
      if (s) style = s[1].toLowerCase() as LogicGateStyle;
      continue;
    }

    // input A, B, C
    const inputMatch = line.match(/^input\s+(.+)$/i);
    if (inputMatch) {
      for (const id of splitIds(inputMatch[1])) {
        const isLow = id.startsWith("~");
        const clean = isLow ? id.slice(1) : id;
        inputs.push({ id: clean, label: clean, isActiveLow: isLow || undefined });
      }
      continue;
    }

    // output X, Y
    const outputMatch = line.match(/^output\s+(.+)$/i);
    if (outputMatch) {
      for (const id of splitIds(outputMatch[1])) {
        outputs.push({ id, label: id, from: id });
      }
      continue;
    }

    // OUTPUT <- GATE  (map output to gate)
    const assignMatch = line.match(/^([a-zA-Z_][\w]*)\s*<-\s*([a-zA-Z_][\w]*)$/);
    if (assignMatch) {
      explicitOutputFrom.set(assignMatch[1], assignMatch[2]);
      continue;
    }

    // Gate: ID = GATE(a, b, ...)
    const gateMatch = line.match(/^([a-zA-Z_][\w]*)\s*=\s*([A-Za-z_][\w]*)\s*\(([^)]*)\)$/);
    if (gateMatch) {
      const id = gateMatch[1];
      const rawType = gateMatch[2].toUpperCase();
      if (!GATE_TYPES.has(rawType)) {
        throw new LogicParseError(`Unknown gate type: ${rawType}`);
      }
      const gInputs = parseInputList(gateMatch[3]);
      const moduleId = moduleStack[moduleStack.length - 1];
      gates.push({ id, gateType: rawType as LogicGateType, inputs: gInputs, moduleId });
      continue;
    }
  }

  if (moduleStack.length > 0) {
    throw new LogicParseError(`Unclosed module (${moduleStack.length} open)`);
  }

  // Wire outputs: if output not explicitly mapped, look for gate with same id
  for (const out of outputs) {
    const mapped = explicitOutputFrom.get(out.id);
    if (mapped) out.from = mapped;
    else if (gates.some((g) => g.id === out.id)) out.from = out.id;
  }

  // Validate: undefined input references
  const known = new Set<string>([
    ...inputs.map((i) => i.id),
    ...gates.map((g) => g.id),
  ]);
  for (const g of gates) {
    for (const inp of g.inputs) {
      const clean = inp.startsWith("~") ? inp.slice(1) : inp;
      if (!known.has(clean)) {
        throw new LogicParseError(`Unknown signal "${clean}" in gate ${g.id}`);
      }
    }
  }

  return {
    type: "logic",
    title,
    style: style ?? "ansi",
    inputs,
    outputs,
    gates,
    modules: modules.length > 0 ? modules : undefined,
  };
}
