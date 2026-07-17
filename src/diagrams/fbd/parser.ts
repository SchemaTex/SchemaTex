/**
 * FBD parser — IEC 61131-3 §6.4.
 *
 * Pipeline:
 *  1. Tokenize lines, strip comments.
 *  2. Split into header / variables / networks.
 *  3. Within each network, parse each statement as an assignment of the
 *     form `Inst = BLOCK(args)` — args can be nested calls (recursive).
 *  4. Build blocks + wires; wires reference port outputs or declared variables.
 *
 * v0.1 scope: standard blocks only (no user-defined FB pins_in/pins_out, no
 * EN/ENO rails, no page connectors). See 23-FBD-STANDARD.md §11 priority.
 */

import type {
  FbdAst,
  FbdBlock,
  FbdNetwork,
  FbdPort,
  FbdVarDecl,
  FbdVarScope,
  FbdDataType,
  FbdWire,
} from "../../core/types";
import { matchQuotedTitle } from "../../core/quotes";
import { createSourceLocator } from "../../core/source-range";
import { BLOCK_SPECS, isStdBlock, getBlockSpec } from "./blocks";

export class FbdParseError extends Error {
  line?: number;
  source?: string;
  constructor(message: string, line?: number, source?: string) {
    super(message);
    this.name = "FbdParseError";
    if (line !== undefined) this.line = line;
    if (source !== undefined) this.source = source;
  }
}

const VALID_DATA_TYPES: FbdDataType[] = [
  "bool", "int", "dint", "uint", "udint",
  "real", "lreal", "time", "date", "tod",
  "string", "wstring", "byte", "word", "dword",
  "timer", "counter",
];

const SCOPE_KEYWORDS: Record<string, FbdVarScope> = {
  var: "local",
  var_input: "input",
  var_output: "output",
  var_in_out: "in_out",
  var_global: "global",
  var_external: "external",
};

interface RawLine {
  text: string;
  indent: number;
  lineNo: number;
  start: number;
}

function tokenizeLines(text: string): RawLine[] {
  const out: RawLine[] = [];
  const lines = text.split("\n");
  let absoluteStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const sourceLine = lines[i]!;
    const raw = sourceLine.replace(/\r$/, "");
    const lineStart = absoluteStart;
    absoluteStart += sourceLine.length + (i < lines.length - 1 ? 1 : 0);
    // Strip `#` line comment but keep `#` inside time literals (T#...) and strings.
    let stripped = "";
    let inStr = false;
    for (let j = 0; j < raw.length; j++) {
      const ch = raw[j];
      if (ch === '"') inStr = !inStr;
      if (!inStr && ch === "#") {
        const prev = raw[j - 1];
        if (prev === undefined || /\s/.test(prev)) break;
      }
      stripped += ch;
    }
    if (!stripped.trim()) continue;
    let indent = 0;
    while (indent < stripped.length && (stripped[indent] === " " || stripped[indent] === "\t")) {
      indent += stripped[indent] === "\t" ? 4 : 1;
    }
    const trimmed = stripped.trim();
    out.push({ text: trimmed, indent, lineNo: i + 1, start: lineStart + stripped.indexOf(trimmed) });
  }
  return out;
}

function stripBrackets(s: string): string {
  return s.trim().replace(/^\[|\]$/g, "").trim();
}

function parseVarDecl(line: RawLine): FbdVarDecl | null {
  const m = line.text.match(/^(var|var_input|var_output|var_in_out|var_global|var_external)\s+([a-zA-Z_]\w*)\s*:\s*([a-zA-Z_]\w*)\s*(?:=\s*(.+))?$/i);
  if (!m) return null;
  const scope = SCOPE_KEYWORDS[m[1].toLowerCase()] ?? "local";
  const name = m[2];
  const typeRaw = m[3].toLowerCase();
  const init = m[4]?.trim();
  const isPrimitive = (VALID_DATA_TYPES as string[]).includes(typeRaw);
  const decl: FbdVarDecl = {
    name,
    scope,
    dataType: isPrimitive ? (typeRaw as FbdDataType) : m[3],
    isUserFb: !isPrimitive,
  };
  if (init !== undefined) decl.initValue = init;
  return decl;
}

interface NetworkHeader {
  index: number;
  title?: string;
}

function parseNetworkHeader(line: RawLine): NetworkHeader | null {
  // network 0 "title":  or  network "title":  or  network 1:  or  network:
  const m = line.text.match(/^network(?:\s+(\d+))?(?:\s+"([^"]*)")?(?:\s*\[[^\]]*\])?\s*:\s*$/i);
  if (!m) return null;
  return {
    index: m[1] ? parseInt(m[1], 10) : -1, // -1 = auto-assigned
    title: m[2],
  };
}

/**
 * Tokenize the call-arguments string into top-level token segments,
 * respecting parentheses depth and double-quoted strings.
 */
function splitArgs(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inStr = false;
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      inStr = !inStr;
      buf += ch;
      continue;
    }
    if (!inStr) {
      if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth--;
      else if (ch === "," && depth === 0) {
        out.push(buf.trim());
        buf = "";
        continue;
      }
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

interface ParsedArg {
  name?: string;
  raw: string;
  negated: boolean;
}

function parseArg(arg: string): ParsedArg {
  let s = arg.trim();
  let name: string | undefined;
  // named?  IDENT: value
  const nm = s.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);
  if (nm) {
    name = nm[1];
    s = nm[2].trim();
  }
  let negated = false;
  if (s.startsWith("~")) {
    negated = true;
    s = s.slice(1).trim();
  }
  return { name, raw: s, negated };
}

const TIME_LIT_RE = /^T#\d+(ms|s|m|h)(\d+(ms|s|m|h))*$/i;
const NUM_LIT_RE = /^-?\d+(\.\d+)?$/;

function isLiteral(s: string): boolean {
  if (TIME_LIT_RE.test(s)) return true;
  if (NUM_LIT_RE.test(s)) return true;
  if (/^(true|false)$/i.test(s)) return true;
  if (/^"[^"]*"$/.test(s)) return true;
  return false;
}

interface ParserState {
  variables: FbdVarDecl[];
  varByName: Map<string, FbdVarDecl>;
  blocks: FbdBlock[];
  blocksById: Map<string, FbdBlock>;
  wires: FbdWire[];
  networkIndex: number;
  blockCounter: number;
  /** Variables auto-declared during expression parsing (as bool by default).
   * Mirrors logic engine playbook — be lenient with LLM-generated DSL. */
  autoVars: Set<string>;
}

function freshBlockId(state: ParserState, baseHint?: string): string {
  state.blockCounter++;
  if (baseHint) {
    let id = baseHint;
    let n = 1;
    while (state.blocksById.has(id)) {
      id = `${baseHint}_${n++}`;
    }
    return id;
  }
  return `_blk${state.blockCounter}`;
}

function ensureVar(state: ParserState, name: string, dataType: FbdDataType = "bool"): void {
  if (state.varByName.has(name)) return;
  const decl: FbdVarDecl = { name, scope: "local", dataType };
  state.variables.push(decl);
  state.varByName.set(name, decl);
  state.autoVars.add(name);
}

/**
 * Parse a block call string `BLOCK(args)` and return the created block id.
 * Recursive: nested calls produce child blocks.
 *
 * @param callStr  the raw `BLOCK(args)` text (no leading instance assignment)
 * @param targetInstance optional instance name to use; if undefined a synthetic id is generated.
 * @param attrs    any [props] extracted from the suffix
 */
function parseCall(
  state: ParserState,
  callStr: string,
  targetInstance: string | undefined,
  attrs: Map<string, string>,
  lineNo: number
): { blockId: string; outPort: string; outType: FbdDataType } {
  // Split BLOCK and args  e.g.  AND(IN1: A, IN2: B)
  const m = callStr.match(/^([A-Za-z_]\w*)\s*\((.*)\)\s*$/);
  if (!m) {
    throw new FbdParseError(`Invalid block call: ${callStr}`, lineNo, callStr);
  }
  const blockType = m[1];
  const argsRaw = m[2];

  if (!isStdBlock(blockType.toUpperCase())) {
    throw new FbdParseError(
      `Unknown function block: ${blockType} (v0.1 supports IEC standard blocks only)`,
      lineNo,
      callStr
    );
  }
  const upper = blockType.toUpperCase();
  const spec = getBlockSpec(upper as keyof typeof BLOCK_SPECS);

  const args = splitArgs(argsRaw);

  // Determine input count for variadic blocks
  let inputCount = spec.defaultInputs ?? 0;
  const inputsAttr = attrs.get("inputs");
  if (inputsAttr) {
    inputCount = Math.max(2, parseInt(inputsAttr, 10) || 2);
  }
  // For pure variadic (AND/OR/etc.), use number of positional args if larger.
  const posArgsCount = args.filter((a) => !/^[A-Za-z_]\w*\s*:/.test(a)).length;
  if (spec.defaultInputs !== undefined && posArgsCount > inputCount) {
    inputCount = posArgsCount;
  }

  // Build expanded port list for variadic blocks
  const ports: FbdPort[] = [];
  for (const ps of spec.ports) {
    if (ps.variadic && ps.side === "in" && spec.defaultInputs !== undefined) {
      // Skip — we'll generate IN1..INn below for the block as a whole.
      continue;
    }
    ports.push({
      name: ps.name,
      side: ps.side,
      dataType: ps.dataType,
    });
  }
  if (spec.defaultInputs !== undefined) {
    // Generate IN1..INn at the front
    const variadicIn: FbdPort[] = [];
    const refType = spec.ports.find((p) => p.variadic && p.side === "in")?.dataType ?? "bool";
    for (let i = 1; i <= inputCount; i++) {
      variadicIn.push({ name: `IN${i}`, side: "in", dataType: refType });
    }
    ports.unshift(...variadicIn);
  }

  const blockId = targetInstance ?? freshBlockId(state);
  if (state.blocksById.has(blockId)) {
    throw new FbdParseError(`Duplicate instance name: ${blockId}`, lineNo, callStr);
  }
  const block: FbdBlock = {
    instance: targetInstance,
    blockType: upper,
    isStd: true,
    ports,
    networkIndex: state.networkIndex,
    id: blockId,
  };
  state.blocks.push(block);
  state.blocksById.set(blockId, block);

  // Wire each argument to its port
  // Resolve argument-to-port mapping: named first, else positional over the
  // input ports in declaration order.
  const inputPorts = ports.filter((p) => p.side === "in");
  const usedPorts = new Set<string>();

  // First pass: named
  const positional: ParsedArg[] = [];
  for (const argStr of args) {
    const a = parseArg(argStr);
    if (a.name) {
      bindArg(state, block, a, a.name, lineNo);
      usedPorts.add(a.name);
    } else {
      positional.push(a);
    }
  }
  // Second pass: positional fills remaining input ports in order
  let pi = 0;
  for (const arg of positional) {
    while (pi < inputPorts.length && usedPorts.has(inputPorts[pi].name)) pi++;
    if (pi >= inputPorts.length) {
      throw new FbdParseError(
        `Too many positional arguments for ${upper} (max ${inputPorts.length})`,
        lineNo,
        callStr
      );
    }
    bindArg(state, block, arg, inputPorts[pi].name, lineNo);
    usedPorts.add(inputPorts[pi].name);
    pi++;
  }

  const outPortName = spec.primaryOut ?? "OUT";
  const outPort = ports.find((p) => p.name === outPortName && p.side === "out");
  return {
    blockId,
    outPort: outPortName,
    outType: outPort?.dataType ?? "any",
  };
}

function bindArg(
  state: ParserState,
  block: FbdBlock,
  arg: ParsedArg,
  portName: string,
  lineNo: number
): void {
  const port = block.ports.find((p) => p.name === portName && p.side === "in");
  if (!port) {
    throw new FbdParseError(
      `Block ${block.blockType} has no input port "${portName}"`,
      lineNo,
      arg.raw
    );
  }

  // Inline literal?
  if (isLiteral(arg.raw)) {
    port.constant = arg.raw;
    if (arg.negated) port.negated = true;
    return;
  }

  // Nested call?
  if (/^[A-Za-z_]\w*\s*\(/.test(arg.raw)) {
    const sub = parseCall(state, arg.raw, undefined, new Map(), lineNo);
    state.wires.push({
      from: { kind: "port", blockId: sub.blockId, portName: sub.outPort },
      to: { kind: "port", blockId: block.id, portName },
      dataType: sub.outType,
      negatedAtSink: arg.negated,
    });
    return;
  }

  // Port reference  Inst.PortName ?
  const portRef = arg.raw.match(/^([A-Za-z_]\w*)\.([A-Za-z_]\w*)$/);
  if (portRef) {
    const srcId = portRef[1];
    const srcPort = portRef[2];
    if (!state.blocksById.has(srcId)) {
      throw new FbdParseError(
        `Unknown instance "${srcId}" referenced in ${arg.raw}`,
        lineNo,
        arg.raw
      );
    }
    const srcBlock = state.blocksById.get(srcId)!;
    const srcPortObj = srcBlock.ports.find((p) => p.name === srcPort && p.side === "out");
    if (!srcPortObj) {
      throw new FbdParseError(
        `Instance "${srcId}" (${srcBlock.blockType}) has no output port "${srcPort}"`,
        lineNo,
        arg.raw
      );
    }
    state.wires.push({
      from: { kind: "port", blockId: srcId, portName: srcPort },
      to: { kind: "port", blockId: block.id, portName },
      dataType: srcPortObj.dataType,
      negatedAtSink: arg.negated,
    });
    return;
  }

  // Plain variable reference
  const varName = arg.raw;
  if (!/^[A-Za-z_]\w*$/.test(varName)) {
    throw new FbdParseError(`Invalid argument: ${arg.raw}`, lineNo, arg.raw);
  }
  ensureVar(state, varName, port.dataType === "any" ? "bool" : port.dataType);
  state.wires.push({
    from: { kind: "var", name: varName },
    to: { kind: "port", blockId: block.id, portName },
    dataType: state.varByName.get(varName)!.dataType as FbdDataType,
    negatedAtSink: arg.negated,
  });
}

/** Top-level parser entrypoint. */
export function parseFbd(text: string): FbdAst {
  const locator = createSourceLocator(text);
  const lines = tokenizeLines(text);
  if (lines.length === 0) {
    throw new FbdParseError("Empty FBD program");
  }
  const headLine = lines[0];
  if (!/^fbd\b/i.test(headLine.text)) {
    throw new FbdParseError(`First non-comment line must start with "fbd" (got: ${headLine.text})`, headLine.lineNo);
  }
  const title = matchQuotedTitle(headLine.text);
  const titleToken = /"[^"]*"/.exec(headLine.text);
  const titleSourceRange = titleToken?.index !== undefined
    ? locator.range(headLine.start + titleToken.index, headLine.start + titleToken.index + titleToken[0].length)
    : undefined;

  const state: ParserState = {
    variables: [],
    varByName: new Map(),
    blocks: [],
    blocksById: new Map(),
    wires: [],
    networkIndex: 0,
    blockCounter: 0,
    autoVars: new Set(),
  };

  const networks: FbdNetwork[] = [];

  let i = 1;
  let nextNetworkIndex = 0;

  // Parse declarations (variables) until we hit a `network` line
  while (i < lines.length) {
    const ln = lines[i];
    if (/^network\b/i.test(ln.text)) break;
    const decl = parseVarDecl(ln);
    if (decl) {
      if (state.varByName.has(decl.name)) {
        throw new FbdParseError(`Duplicate variable: ${decl.name}`, ln.lineNo, ln.text);
      }
      state.variables.push(decl);
      state.varByName.set(decl.name, decl);
      i++;
      continue;
    }
    throw new FbdParseError(`Unrecognized line at top level: ${ln.text}`, ln.lineNo, ln.text);
  }

  // Parse networks
  while (i < lines.length) {
    const head = lines[i];
    const nh = parseNetworkHeader(head);
    if (!nh) {
      throw new FbdParseError(`Expected "network ...:" (got: ${head.text})`, head.lineNo, head.text);
    }
    i++;
    const idx = nh.index === -1 ? nextNetworkIndex : nh.index;
    nextNetworkIndex = idx + 1;
    state.networkIndex = idx;

    // Snapshot current block/wire pointers so we can collect this network's
    const blocksBefore = state.blocks.length;
    const wiresBefore = state.wires.length;

    // Read indented body
    while (i < lines.length && lines[i].indent > head.indent) {
      const stmt = lines[i];
      parseStatement(state, stmt);
      i++;
    }
    const network: FbdNetwork = {
      index: idx,
      blocks: state.blocks.slice(blocksBefore),
      wires: state.wires.slice(wiresBefore),
    };
    if (nh.title !== undefined) network.title = nh.title;
    networks.push(network);
  }

  // Final pass: any block whose instance/output id matches a declared variable
  // wires from outPort to that variable.
  for (const block of state.blocks) {
    if (!block.instance) continue;
    const v = state.varByName.get(block.instance);
    if (!v) continue;
    const spec = getBlockSpec(block.blockType as keyof typeof BLOCK_SPECS);
    const outPort = spec?.primaryOut ?? "OUT";
    const out = block.ports.find((p) => p.name === outPort && p.side === "out");
    if (!out) continue;
    state.wires.push({
      from: { kind: "port", blockId: block.id, portName: outPort },
      to: { kind: "var", name: block.instance },
      dataType: out.dataType,
    });
    // Add to the network's wire list too.
    const net = networks.find((n) => n.index === block.networkIndex);
    if (net) {
      net.wires.push(state.wires[state.wires.length - 1]);
    }
  }

  const ast: FbdAst = {
    type: "fbd",
    variables: state.variables,
    networks,
  };
  if (title !== undefined) ast.title = title;
  if (titleSourceRange !== undefined) ast.titleSourceRange = titleSourceRange;
  return ast;
}

function parseStatement(state: ParserState, line: RawLine): void {
  const text = line.text;
  // Form A:  Inst = BLOCK(args) [props]
  const m = text.match(/^([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*\s*\(.*\))\s*(\[[^\]]*\])?\s*$/);
  if (m) {
    const lhs = m[1];
    const callStr = m[2];
    const propsRaw = m[3];
    const attrs = parseAttrs(propsRaw, line);
    parseCall(state, callStr, lhs, attrs, line.lineNo);
    return;
  }
  // Form B:  bare BLOCK(args) (rare; instance auto-named)
  const mB = text.match(/^([A-Za-z_]\w*\s*\(.*\))\s*(\[[^\]]*\])?\s*$/);
  if (mB) {
    const callStr = mB[1];
    const propsRaw = mB[2];
    const attrs = parseAttrs(propsRaw, line);
    parseCall(state, callStr, undefined, attrs, line.lineNo);
    return;
  }
  throw new FbdParseError(`Unrecognized network statement: ${text}`, line.lineNo, text);
}

function parseAttrs(raw: string | undefined, line: RawLine): Map<string, string> {
  const out = new Map<string, string>();
  if (!raw) return out;
  const inner = stripBrackets(raw);
  for (const part of inner.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const colon = t.indexOf(":");
    if (colon < 0) {
      out.set(t.toLowerCase(), "true");
    } else {
      const key = t.slice(0, colon).trim().toLowerCase();
      const val = t.slice(colon + 1).trim().replace(/^"|"$/g, "");
      out.set(key, val);
    }
  }
  void line;
  return out;
}
