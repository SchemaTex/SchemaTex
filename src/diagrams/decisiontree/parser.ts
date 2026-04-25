import type {
  DTreeAST,
  DTreeBranchLabels,
  DTreeDirection,
  DTreeEdgeStyle,
  DTreeImpurity,
  DTreeMode,
  DTreeNode,
} from "./types";

export class DTreeParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number,
    public source?: string
  ) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "DTreeParseError";
  }
}

interface RawLine {
  indent: number;
  text: string;
  line: number;
}

function preprocess(src: string): RawLine[] {
  const out: RawLine[] = [];
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    if (!raw.trim() || raw.trim().startsWith("#") || raw.trim().startsWith("//")) continue;
    const indentSpaces = raw.length - raw.replace(/^\s+/, "").length;
    out.push({ indent: Math.floor(indentSpaces / 2), text: raw.trim(), line: i + 1 });
  }
  return out;
}

// ─── Tokenizer ───────────────────────────────────────────────
// Split a line into tokens, honoring double-quoted strings and bracket lists.
function tokenize(s: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') {
      const end = s.indexOf('"', i + 1);
      if (end < 0) throw new DTreeParseError(`Unterminated string: ${s}`);
      tokens.push(s.slice(i, end + 1));
      i = end + 1;
      continue;
    }
    // Read until whitespace or start of quoted string, but allow `=` and brackets inside
    let j = i;
    let bracket = 0;
    while (j < s.length) {
      const c = s[j]!;
      if (c === "[") bracket++;
      else if (c === "]") bracket--;
      else if (bracket === 0 && /\s/.test(c)) break;
      else if (bracket === 0 && c === '"') break;
      j++;
    }
    tokens.push(s.slice(i, j));
    i = j;
  }
  return tokens;
}

function unquote(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}

function parseKV(tokens: string[]): { keys: Record<string, string>; labels: string[]; rest: string[] } {
  const keys: Record<string, string> = {};
  const labels: string[] = [];
  const rest: string[] = [];
  for (const tok of tokens) {
    if (tok.startsWith('"') && tok.endsWith('"')) {
      labels.push(unquote(tok));
    } else if (tok.includes("=")) {
      const idx = tok.indexOf("=");
      const k = tok.slice(0, idx);
      const v = tok.slice(idx + 1);
      keys[k] = v;
    } else {
      rest.push(tok);
    }
  }
  return { keys, labels, rest };
}

function parseNumberList(s: string): number[] {
  const inner = s.replace(/^\[/, "").replace(/\]$/, "");
  return inner.split(",").map((p) => Number(p.trim())).filter((n) => !Number.isNaN(n));
}

// ─── Parser ──────────────────────────────────────────────────

let idCounter = 0;
function nextId(prefix = "n"): string {
  idCounter++;
  return `${prefix}${idCounter}`;
}

interface ParseContext {
  mode: DTreeMode;
  regression: boolean;
}

function parseDecisionLine(tokens: string[], _ctx: ParseContext, lineNum: number): DTreeNode {
  // First token is keyword; possible: decision, chance, end, choice, prob
  // prob/choice are edge-wrappers: they may be prefixes before a real node kind.
  let idx = 0;
  let incomingChoice: string | undefined;
  let incomingProb: number | undefined;

  if (tokens[idx] === "choice") {
    idx++;
    const next = tokens[idx];
    if (!next || !next.startsWith('"')) throw new DTreeParseError(`"choice" requires a label`, lineNum);
    incomingChoice = unquote(next);
    idx++;
    // If no more tokens, choice is a wrapper — child will be nested. Return placeholder.
    if (idx >= tokens.length) {
      return {
        id: nextId(),
        kind: "decision", // placeholder; will be overridden if sole child exists
        label: "",
        children: [],
        incomingChoice,
        // special marker so parseBody knows this is a wrapper
        _wrapper: "choice",
      } as DTreeNode & { _wrapper?: string };
    }
  } else if (tokens[idx] === "prob") {
    idx++;
    const p = Number(tokens[idx]);
    if (Number.isNaN(p)) throw new DTreeParseError(`"prob" requires a numeric probability`, lineNum);
    incomingProb = p;
    idx++;
  }

  const kw = tokens[idx];
  if (!kw) throw new DTreeParseError(`Missing node kind`, lineNum);
  const rest = tokens.slice(idx + 1);
  const parsed = parseKV(rest);

  let kind: DTreeNode["kind"];
  if (kw === "decision") kind = "decision";
  else if (kw === "chance") kind = "chance";
  else if (kw === "end" || kw === "outcome") kind = "end";
  else throw new DTreeParseError(`Unknown node kind "${kw}" in decision mode`, lineNum);

  const label = parsed.labels[0] ?? "";
  const payoffStr = parsed.keys.payoff;
  const payoff = payoffStr !== undefined ? Number(payoffStr) : undefined;

  return {
    id: nextId(),
    kind,
    label,
    children: [],
    incomingChoice,
    incomingProb,
    payoff,
  };
}

function parseMlLine(tokens: string[], ctx: ParseContext, lineNum: number): DTreeNode {
  // Optional `true`/`false` prefix for branch direction.
  let idx = 0;
  let mlBranch: "true" | "false" | undefined;
  if (tokens[idx] === "true" || tokens[idx] === "false") {
    mlBranch = tokens[idx] as "true" | "false";
    idx++;
  }

  const kw = tokens[idx];
  if (!kw) throw new DTreeParseError(`Missing ML node kind`, lineNum);
  idx++;
  const rest = tokens.slice(idx);
  const parsed = parseKV(rest);

  let kind: DTreeNode["kind"];
  if (kw === "split") kind = "split";
  else if (kw === "leaf") kind = "leaf";
  else throw new DTreeParseError(`Unknown ML node kind "${kw}"`, lineNum);

  const label = parsed.labels[0] ?? "";
  const k = parsed.keys;

  let value: number[] | number | undefined;
  if (k.value !== undefined) {
    if (k.value.startsWith("[")) value = parseNumberList(k.value);
    else value = Number(k.value);
  }
  if (typeof value === "number") ctx.regression = true;

  // Impurity number — extract from any of gini/entropy/mse/gain/impurity
  let impurity: number | undefined;
  for (const impKey of ["gini", "entropy", "mse", "gain", "impurity"]) {
    if (k[impKey] !== undefined) {
      impurity = Number(k[impKey]);
      break;
    }
  }

  return {
    id: nextId(),
    kind,
    label,
    children: [],
    feature: k.feature,
    op: k.op,
    threshold: k.threshold !== undefined ? (Number.isNaN(Number(k.threshold)) ? k.threshold : Number(k.threshold)) : undefined,
    samples: k.samples !== undefined ? Number(k.samples) : undefined,
    value,
    impurity,
    mlBranch,
    className: k.class,
  };
}

function parseTaxonomyLine(tokens: string[], _ctx: ParseContext, lineNum: number): DTreeNode {
  // Forms:
  //   q "..."           → question
  //   question "..."    → question
  //   a "..."           → answer / leaf
  //   answer "..."      → answer / leaf
  //   leaf "..."        → answer
  //   yes: q "..."      → question with branchLabel="yes"
  //   no:  a "..."      → answer with branchLabel="no"
  //   label "X": a "Y"  → answer with branchLabel="X"
  let idx = 0;
  let branchLabel: string | undefined;

  if (tokens[idx] === "yes:" || tokens[idx] === "no:") {
    branchLabel = tokens[idx]!.replace(":", "");
    idx++;
  } else if (tokens[idx] === "label") {
    idx++;
    const lbl = tokens[idx];
    if (!lbl || !lbl.startsWith('"')) throw new DTreeParseError(`"label" requires a quoted string`, lineNum);
    // Allow trailing colon form: label "X": ...
    branchLabel = unquote(lbl.replace(/":?$/, '"'));
    // Handle `"X":` (colon attached)
    if (lbl.endsWith(':"')) {/* unreachable */}
    idx++;
    if (tokens[idx] === ":") idx++;
  }

  const kw = tokens[idx];
  if (!kw) throw new DTreeParseError(`Missing taxonomy node kind`, lineNum);
  idx++;
  const rest = tokens.slice(idx);
  const parsed = parseKV(rest);

  let kind: DTreeNode["kind"];
  if (kw === "q" || kw === "question") kind = "question";
  else if (kw === "a" || kw === "answer" || kw === "leaf") kind = "answer";
  else throw new DTreeParseError(`Unknown taxonomy node kind "${kw}"`, lineNum);

  return {
    id: nextId(),
    kind,
    label: parsed.labels[0] ?? "",
    children: [],
    branchLabel,
  };
}

function parseNodeLine(text: string, mode: DTreeMode, ctx: ParseContext, lineNum: number): DTreeNode {
  // Handle `yes: q "..."` style where `yes:` is glued but tokenizer splits fine.
  // Handle `label "X":` pattern for taxonomy with inline colon.
  const normalized = text.replace(/"\s*:\s*/g, '" : ');
  const tokens = tokenize(normalized).filter((t) => t !== ":");
  if (mode === "decision") return parseDecisionLine(tokens, ctx, lineNum);
  if (mode === "ml") return parseMlLine(tokens, ctx, lineNum);
  return parseTaxonomyLine(tokens, ctx, lineNum);
}

function buildTree(lines: RawLine[], mode: DTreeMode, ctx: ParseContext): DTreeNode {
  if (lines.length === 0) throw new DTreeParseError("No tree body");
  const [first, ...rest] = lines;
  if (!first) throw new DTreeParseError("No tree body");
  const root = parseNodeLine(first.text, mode, ctx, first.line);
  const stack: Array<{ node: DTreeNode; indent: number }> = [{ node: root, indent: first.indent }];

  for (const line of rest) {
    const node = parseNodeLine(line.text, mode, ctx, line.line);
    while (stack.length > 0 && stack[stack.length - 1]!.indent >= line.indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (!parent) throw new DTreeParseError(`Orphan line (bad indent): ${line.text}`, line.line);
    parent.node.children.push(node);
    stack.push({ node, indent: line.indent });
  }

  return collapseWrappers(root);
}

// Collapse `choice` wrappers (they carry incomingChoice to their sole child)
function collapseWrappers(node: DTreeNode): DTreeNode {
  node.children = node.children.map(collapseWrappers).flatMap((c) => {
    const anyC = c as DTreeNode & { _wrapper?: string };
    if (anyC._wrapper === "choice") {
      return c.children.map((gc) => ({ ...gc, incomingChoice: c.incomingChoice }));
    }
    return [c];
  });
  return node;
}

// ─── EV Rollback (decision mode) ─────────────────────────────

function computeEV(node: DTreeNode): void {
  for (const c of node.children) computeEV(c);
  if (node.kind === "end") {
    node.ev = node.payoff ?? 0;
    return;
  }
  if (node.kind === "chance") {
    let sum = 0;
    for (const c of node.children) sum += (c.incomingProb ?? 0) * (c.ev ?? 0);
    node.ev = sum;
    return;
  }
  if (node.kind === "decision") {
    let best = -Infinity;
    for (const c of node.children) {
      if ((c.ev ?? -Infinity) > best) best = c.ev ?? -Infinity;
    }
    node.ev = best;
    for (const c of node.children) {
      if ((c.ev ?? -Infinity) === best) c.optimal = true;
    }
    return;
  }
}

function validateDecision(node: DTreeNode, lineMap: Map<string, number>): void {
  if (node.kind === "chance" && node.children.length > 0) {
    const sum = node.children.reduce((a, c) => a + (c.incomingProb ?? 0), 0);
    if (Math.abs(sum - 1) > 0.01) {
      throw new DTreeParseError(
        `chance "${node.label}" probabilities do not sum to 1.0 (got ${sum.toFixed(3)})`,
      );
    }
  }
  for (const c of node.children) validateDecision(c, lineMap);
}

// ─── Top-level ───────────────────────────────────────────────

export function parseDecisionTree(src: string): DTreeAST {
  idCounter = 0;
  const lines = preprocess(src);
  if (lines.length === 0) throw new DTreeParseError("Empty input");

  // Header: `decisiontree[:mode] "title"?`
  const header = lines.shift()!;
  const headerMatch = header.text.match(/^decisiontree(?::(\w+))?(?:\s+"([^"]*)")?\s*$/i);
  if (!headerMatch) throw new DTreeParseError(`Invalid header: ${header.text}`, header.line);
  const modeRaw = (headerMatch[1] ?? "taxonomy").toLowerCase();
  const mode: DTreeMode =
    modeRaw === "decision" || modeRaw === "da" ? "decision"
    : modeRaw === "ml" ? "ml"
    : "taxonomy";
  const title = headerMatch[2];

  // Config block: lines with `key: value` before the tree body, at indent 0.
  // Tree body starts at the first line whose first token is a recognized node keyword.
  const nodeKeywords = new Set([
    "decision", "chance", "end", "outcome", "choice", "prob",
    "split", "leaf", "true", "false",
    "q", "question", "a", "answer", "yes:", "no:", "label",
  ]);
  const config: Record<string, string> = {};
  while (lines.length > 0) {
    const l = lines[0]!;
    const firstTok = l.text.split(/\s+/)[0]!;
    if (nodeKeywords.has(firstTok)) break;
    const m = l.text.match(/^([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
    if (!m) break;
    config[m[1]!] = m[2]!.trim();
    lines.shift();
  }

  let direction: DTreeDirection = "top-down";
  if (config.direction === "left-right" || config.direction === "lr") direction = "left-right";
  if (mode === "decision" && !config.direction) direction = "left-right";

  const classes = config.classes
    ? config.classes.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  let impurityName: DTreeImpurity | undefined;
  if (config.impurity) {
    const v = config.impurity.toLowerCase();
    if (v === "gini" || v === "entropy" || v === "mse" || v === "gain") impurityName = v;
  }

  const branchLabels: DTreeBranchLabels | undefined =
    config.branchLabels === "relation" || config["branch-labels"] === "relation" ? "relation" : "boolean";

  const branchLengthProb = config.branchLength === "probability" || config["branch-length"] === "probability";

  let edgeStyle: DTreeEdgeStyle | undefined;
  const es = (config.edgeStyle || config["edge-style"] || "").toLowerCase();
  if (es === "diagonal" || es === "orthogonal" || es === "bracket") edgeStyle = es;

  const ctx: ParseContext = { mode, regression: false };
  const root = buildTree(lines, mode, ctx);

  if (mode === "decision") {
    validateDecision(root, new Map());
    computeEV(root);
  }

  return {
    type: "decisiontree",
    mode,
    title,
    direction,
    classes,
    impurityName: impurityName ?? (mode === "ml" ? "gini" : undefined),
    branchLabels,
    branchLengthProb,
    edgeStyle,
    regression: ctx.regression,
    root,
  };
}
