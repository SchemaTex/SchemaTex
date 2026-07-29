import type {
  PseudoStateKind,
  StateActivity,
  StateDiagramAST,
  StateDirection,
  StateNode,
  StateNote,
  StateTransition,
} from "./types";
import { IDENTIFIER_SOURCE, isIdentifier } from "../../core/identifier";
import { createSourceLocator } from "../../core/source-range";
import {
  decodeDslString,
  readLogicalLines,
  UnterminatedDslStringError,
} from "../../core/logical-lines";
import { estimateTextWidth } from "../../core/text-metrics";

const COMPOSITE_RE = new RegExp(
  `^(?:composite|state)\\s+(${IDENTIFIER_SOURCE})\\s*\\{?\\s*$`,
  "u"
);
const ALIAS_RE = new RegExp(
  `^state\\s+"((?:[^"\\\\]|\\\\.)*)"\\s+as\\s+(${IDENTIFIER_SOURCE})\\s*$`,
  "u"
);
const STEREOTYPE_RE = new RegExp(
  `^state\\s+(${IDENTIFIER_SOURCE})\\s+<<\\s*(choice|fork|join|end)\\s*>>\\s*$`,
  "u"
);
const STATE_LABEL_RE = new RegExp(`^state\\s+(${IDENTIFIER_SOURCE})\\s*:\\s*(.+)$`, "u");
const PSEUDO_RE = new RegExp(
  `^(initial|final|choice|junction|fork|join|history|dhistory|terminate|entry_point|exit_point)\\s+(${IDENTIFIER_SOURCE})\\s*$`,
  "u"
);
const NOTE_LINE_RE = new RegExp(
  `^note\\s+(left[_ ]of|right[_ ]of)\\s+(${IDENTIFIER_SOURCE})\\s*:\\s*(.*)$`,
  "u"
);
const NOTE_MERMAID_RE = new RegExp(
  `^note\\s+(left[_ ]of|right[_ ]of)\\s+(${IDENTIFIER_SOURCE})\\s*$`,
  "u"
);
const NOTE_BLOCK_RE = new RegExp(
  `^note\\s+(left[_ ]of\\s+|right[_ ]of\\s+)?(${IDENTIFIER_SOURCE})\\s*\\{\\s*$`,
  "u"
);
const TRANSITION_RE = new RegExp(
  `^(\\[\\*\\]|${IDENTIFIER_SOURCE})\\s*-+>\\s*(\\[\\*\\]|${IDENTIFIER_SOURCE})\\s*(?::\\s*(.*))?$`,
  "u"
);
const LABEL_ONLY_RE = new RegExp(`^(${IDENTIFIER_SOURCE})\\s*:\\s*(.+)$`, "u");
const BARE_IDENTIFIER_RE = new RegExp(`^(${IDENTIFIER_SOURCE})\\s*$`, "u");

export class StateParseError extends Error {
  public code?: string;
  public source?: string;
  public hint?: string;

  constructor(
    message: string,
    public line?: number,
    code?: string,
    source?: string,
    hint?: string
  ) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "StateParseError";
    this.code = code;
    this.source = source;
    this.hint = hint;
  }
}

interface RawLine {
  indent: number;
  text: string;
  line: number;
  /** Absolute UTF-16 offset of `text` in the original source. */
  start: number;
}

const PSEUDO_KEYWORDS: Record<string, PseudoStateKind> = {
  initial: "initial",
  final: "final",
  choice: "choice",
  junction: "junction",
  fork: "fork",
  join: "join",
  history: "history",
  dhistory: "dhistory",
  terminate: "terminate",
  entry_point: "entry_point",
  exit_point: "exit_point",
};

// Mermaid-style stereotype keywords:  state X <<choice>>
const MERMAID_STEREOTYPE: Record<string, PseudoStateKind> = {
  choice: "choice",
  fork: "fork",
  join: "join",
  end: "final",
};

function preprocess(src: string): RawLine[] {
  try {
    return readLogicalLines(src, {
      fullLineCommentMarkers: ["#", "//", "%%"],
    }).map((statement) => ({
      indent: statement.indent,
      text: statement.text.trim(),
      line: statement.line,
      start: statement.start,
    }));
  } catch (error) {
    if (error instanceof UnterminatedDslStringError) {
      throw new StateParseError(
        "unterminated quoted state label",
        error.line,
        "STATE_UNTERMINATED_STRING",
        error.source,
        "Close the quoted label; use `\\n` or physical newlines only inside that closed string."
      );
    }
    throw error;
  }
}

function tokenBounds(text: string, token: string, from = 0): { start: number; end: number } {
  const start = text.indexOf(token, from);
  return { start, end: start + token.length };
}

function unquote(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return decodeDslString(s.slice(1, -1));
  }
  return s;
}

function parseProps(s: string): Record<string, string> {
  // [direction: LR, style: uml]
  const out: Record<string, string> = {};
  const inner = s.replace(/^\[/, "").replace(/\]$/, "");
  if (!inner.trim()) return out;
  for (const part of inner.split(",")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = unquote(part.slice(idx + 1).trim());
  }
  return out;
}

function parseTransitionLabel(label: string): {
  trigger?: string;
  guard?: string;
  action?: string;
} {
  const out: { trigger?: string; guard?: string; action?: string } = {};
  let rest = label.trim();
  if (!rest) return out;

  let depth = 0;
  let slashIdx = -1;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (c === "[") depth++;
    else if (c === "]") depth--;
    else if (c === "/" && depth === 0) {
      slashIdx = i;
      break;
    }
  }
  if (slashIdx >= 0) {
    out.action = rest.slice(slashIdx + 1).trim();
    rest = rest.slice(0, slashIdx).trim();
  }

  const gMatch = rest.match(/^(?<trig>[^[]*?)\s*\[(?<guard>[^\]]*)\]\s*$/);
  if (gMatch?.groups) {
    out.guard = gMatch.groups.guard.trim();
    const trig = gMatch.groups.trig.trim();
    if (trig) out.trigger = trig;
  } else if (rest.length) {
    out.trigger = rest;
  }
  return out;
}

function parseActivityLine(text: string): StateActivity | undefined {
  const match = text.match(/^(entry|exit|do)\s*\/\s*(.*)$/);
  if (match) {
    return { kind: match[1] as "entry" | "exit" | "do", action: match[2].trim() };
  }
  const parsed = parseTransitionLabel(text);
  if (!parsed.trigger && !parsed.guard && !parsed.action) return undefined;
  return {
    kind: "internal",
    trigger: parsed.trigger,
    guard: parsed.guard,
    action: parsed.action,
  };
}

interface ParseContext {
  states: StateNode[];
  transitions: StateTransition[];
  notes: StateNote[];
  pseudoCounter: number;
  noteCounter: number;
  transCounter: number;
  byId: Map<string, StateNode>;
  initialAlias?: string;
  finalAlias?: string;
}

function newPseudoId(ctx: ParseContext, kind: PseudoStateKind): string {
  ctx.pseudoCounter += 1;
  return `__${kind}_${ctx.pseudoCounter}`;
}

function ensureInitialAlias(ctx: ParseContext, parent?: StateNode): StateNode {
  if (!parent) {
    if (ctx.initialAlias) {
      const existing = ctx.byId.get(ctx.initialAlias);
      if (existing) return existing;
    }
    const node: StateNode = {
      id: newPseudoId(ctx, "initial"),
      label: "",
      kind: "pseudo",
      pseudoKind: "initial",
      activities: [],
      children: [],
    };
    ctx.initialAlias = node.id;
    ctx.byId.set(node.id, node);
    ctx.states.push(node);
    return node;
  }
  for (const child of parent.children) {
    if (child.id.startsWith("__initial_") && child.label === "") return child;
  }
  const node: StateNode = {
    id: newPseudoId(ctx, "initial"),
    label: "",
    kind: "pseudo",
    pseudoKind: "initial",
    activities: [],
    children: [],
    parent: parent.id,
  };
  ctx.byId.set(node.id, node);
  parent.children.push(node);
  return node;
}

function ensureFinalAlias(ctx: ParseContext, parent?: StateNode): StateNode {
  if (!parent) {
    if (ctx.finalAlias) {
      const existing = ctx.byId.get(ctx.finalAlias);
      if (existing) return existing;
    }
    const node: StateNode = {
      id: newPseudoId(ctx, "final"),
      label: "",
      kind: "pseudo",
      pseudoKind: "final",
      activities: [],
      children: [],
    };
    ctx.finalAlias = node.id;
    ctx.byId.set(node.id, node);
    ctx.states.push(node);
    return node;
  }
  for (const child of parent.children) {
    if (child.id.startsWith("__final_") && child.label === "") return child;
  }
  const node: StateNode = {
    id: newPseudoId(ctx, "final"),
    label: "",
    kind: "pseudo",
    pseudoKind: "final",
    activities: [],
    children: [],
    parent: parent.id,
  };
  ctx.byId.set(node.id, node);
  parent.children.push(node);
  return node;
}

function ensureSimpleState(
  ctx: ParseContext,
  id: string,
  parent?: StateNode
): StateNode {
  const existing = ctx.byId.get(id);
  if (existing) return existing;
  const node: StateNode = {
    id,
    label: id,
    kind: "simple",
    activities: [],
    children: [],
    parent: parent?.id,
  };
  ctx.byId.set(id, node);
  if (parent) parent.children.push(node);
  else ctx.states.push(node);
  return node;
}

function isIdent(tok: string): boolean {
  return isIdentifier(tok);
}

/**
 * Parse a state-diagram DSL.
 *
 * Accepts both the native Schematex syntax and the full Mermaid `stateDiagram-v2`
 * vocabulary as a strict superset:
 *   - `[*]` for initial / final (direction-resolved)
 *   - `state "Long name" as ID`
 *   - `Foo: description` to label an existing/new state
 *   - `state X <<choice>>` / `<<fork>>` / `<<join>>` / `<<end>>` stereotypes
 *   - `note right of X` ... `end note`  /  `note right of X : single-line text`
 *   - `--` (Mermaid) and `---` (Schematex) separators inside composites
 *   - `%%`, `#`, `//` comments
 *
 * Composite blocks use `composite ID { ... }` (Schematex) or `state ID { ... }`
 * (Mermaid). Default direction is TB to match Mermaid's default — override
 * with `direction LR` (top-level statement) or `[direction: LR]` (header attrs).
 */
export function parseStateDiagram(src: string): StateDiagramAST {
  const lines = preprocess(src);
  const locator = createSourceLocator(src);
  if (lines.length === 0) {
    throw new StateParseError("Empty document");
  }

  // Header: must start with `state` or `stateDiagram` (Mermaid-compat) or `stateDiagram-v2`.
  const header = lines[0]!;
  const headerTok = header.text.match(/^(stateDiagram-v2|stateDiagram|state)\b/i);
  if (!headerTok) {
    throw new StateParseError(
      `Expected 'state' or 'stateDiagram' header, got '${header.text}'`,
      header.line
    );
  }

  let title: string | undefined;
  let direction: StateDirection = "TB";
  let directionSource: StateDiagramAST["directionSource"] = "default";

  const headerRest = header.text.slice(headerTok[0].length).trim();
  // Parse optional `direction LR` on the header line itself (Mermaid permits this on a separate line too)
  const propsMatch = headerRest.match(/\[[^\]]*\]\s*$/);
  let beforeProps = headerRest;
  if (propsMatch) {
    const props = parseProps(propsMatch[0]);
    const requested = props.direction?.toUpperCase();
    if (requested === "TB" || requested === "LR") {
      direction = requested;
      directionSource = "explicit";
    } else if (requested === "AUTO") {
      directionSource = "auto";
    }
    beforeProps = headerRest.slice(0, propsMatch.index).trim();
  }
  if (beforeProps.startsWith('"')) title = unquote(beforeProps);
  else if (beforeProps.length > 0) title = beforeProps;
  const titleStart = beforeProps ? header.text.indexOf(beforeProps, headerTok[0].length) : -1;
  const titleSourceRange = titleStart >= 0
    ? locator.range(header.start + titleStart, header.start + titleStart + beforeProps.length)
    : undefined;

  const ctx: ParseContext = {
    states: [],
    transitions: [],
    notes: [],
    pseudoCounter: 0,
    noteCounter: 0,
    transCounter: 0,
    byId: new Map(),
  };

  // Composite-stack: each entry is the current parent. Empty = root.
  const compositeStack: Array<{
    parent?: StateNode;
    regionMode: boolean;
  }> = [{ parent: undefined, regionMode: false }];

  let i = 1;
  while (i < lines.length) {
    const ln = lines[i]!;
    const text = ln.text;

    const ctxTop = compositeStack[compositeStack.length - 1]!;
    const parent = ctxTop.parent;

    // Closing `}`
    if (text === "}") {
      if (compositeStack.length <= 1) {
        throw new StateParseError("Unexpected '}'", ln.line);
      }
      compositeStack.pop();
      i++;
      continue;
    }

    // Region separator `---` (Schematex) or `--` (Mermaid)
    if (text === "---" || text === "--") {
      if (!parent) {
        throw new StateParseError(
          "Region separator only allowed inside a composite",
          ln.line
        );
      }
      ctxTop.regionMode = true;
      if (!parent.regions) parent.regions = [];
      const lastIdx = parent.regions.reduce((s, r) => s + r.length, 0);
      const slice = parent.children.slice(lastIdx);
      parent.regions.push(slice);
      i++;
      continue;
    }

    // Top-level `direction LR` directive (Mermaid)
    const dirMatch = text.match(/^direction\s+(TB|BT|LR|RL|AUTO)\s*$/i);
    if (dirMatch) {
      const d = dirMatch[1]!.toUpperCase() as "TB" | "BT" | "LR" | "RL" | "AUTO";
      if (d === "AUTO") {
        directionSource = "auto";
      } else {
        direction = d === "BT" ? "TB" : d === "RL" ? "LR" : d;
        directionSource = "explicit";
      }
      i++;
      continue;
    }

    // ── Composite definition: composite IDENT {  OR  state IDENT { (Mermaid) ──
    const compMatch = text.match(COMPOSITE_RE);
    const isCompositeWithBrace = compMatch && text.endsWith("{");
    if (isCompositeWithBrace) {
      const id = compMatch![1];
      const node = ensureSimpleState(ctx, id, parent);
      node.kind = "composite";
      compositeStack.push({ parent: node, regionMode: false });
      i++;
      continue;
    }

    // ── Mermaid alias: `state "Long name" as ID` ──
    const aliasMatch = text.match(ALIAS_RE);
    if (aliasMatch) {
      const node = ensureSimpleState(ctx, aliasMatch[2], parent);
      node.label = decodeDslString(aliasMatch[1]);
      const quoted = `"${aliasMatch[1]}"`;
      const bounds = tokenBounds(text, quoted);
      node.labelSourceRange = locator.range(ln.start + bounds.start, ln.start + bounds.end);
      i++;
      continue;
    }

    // ── Mermaid stereotype: `state ID <<choice>>` / `<<fork>>` / `<<join>>` / `<<end>>` ──
    const stereoMatch = text.match(STEREOTYPE_RE);
    if (stereoMatch) {
      const id = stereoMatch[1];
      const kind = MERMAID_STEREOTYPE[stereoMatch[2]];
      const node: StateNode = {
        id,
        label: "",
        kind: "pseudo",
        pseudoKind: kind,
        activities: [],
        children: [],
        parent: parent?.id,
      };
      ctx.byId.set(id, node);
      if (parent) parent.children.push(node);
      else ctx.states.push(node);
      i++;
      continue;
    }

    // ── `state ID : description` (Mermaid declares + labels) ──
    const stateLabelMatch = text.match(STATE_LABEL_RE);
    if (stateLabelMatch) {
      const node = ensureSimpleState(ctx, stateLabelMatch[1], parent);
      const token = stateLabelMatch[2].trim();
      node.label = unquote(token);
      const bounds = tokenBounds(text, token, text.indexOf(":") + 1);
      node.labelSourceRange = locator.range(ln.start + bounds.start, ln.start + bounds.end);
      i++;
      continue;
    }

    // ── Schematex pseudo-state declaration: initial X / fork F / etc. ──
    const pseudoMatch = text.match(PSEUDO_RE);
    if (pseudoMatch) {
      const kindKw = pseudoMatch[1];
      const id = pseudoMatch[2];
      const pkind = PSEUDO_KEYWORDS[kindKw];
      const node: StateNode = {
        id,
        label: "",
        kind: "pseudo",
        pseudoKind: pkind,
        activities: [],
        children: [],
        parent: parent?.id,
      };
      ctx.byId.set(id, node);
      if (parent) parent.children.push(node);
      else ctx.states.push(node);
      i++;
      continue;
    }

    // ── Activities inside composite ──
    if (parent) {
      const activity = parseActivityLine(text);
      if (activity && (activity.kind === "entry" || activity.kind === "exit" || activity.kind === "do")) {
        parent.activities.push(activity);
        i++;
        continue;
      }
    }

    // ── Notes ──
    // Single-line: `note right_of X : text`  /  `note right of X : text`
    const noteSimple = text.match(NOTE_LINE_RE);
    if (noteSimple) {
      const side = noteSimple[1].startsWith("left") ? "left" : "right";
      const target = noteSimple[2];
      ctx.noteCounter += 1;
      ctx.notes.push({
        id: `__note_${ctx.noteCounter}`,
        target,
        side,
        text: noteSimple[3].trim(),
      });
      i++;
      continue;
    }
    // Block forms:
    //  Schematex:  note X { ... } or note left_of X { ... }
    //  Mermaid:    note right of X \n ... \n end note
    const noteBlockMermaid = text.match(NOTE_MERMAID_RE);
    if (noteBlockMermaid) {
      const side = noteBlockMermaid[1].startsWith("left") ? "left" : "right";
      const target = noteBlockMermaid[2];
      const buf: string[] = [];
      i++;
      while (i < lines.length) {
        const t = lines[i]!.text;
        if (t === "end note" || t === "}") break;
        buf.push(t);
        i++;
      }
      if (i >= lines.length) {
        throw new StateParseError("Unterminated note block", ln.line);
      }
      i++; // consume end note / }
      ctx.noteCounter += 1;
      ctx.notes.push({
        id: `__note_${ctx.noteCounter}`,
        target,
        side,
        text: buf.join("\n"),
      });
      continue;
    }
    const noteBlockSchematex = text.match(NOTE_BLOCK_RE);
    if (noteBlockSchematex) {
      const side = noteBlockSchematex[1]?.startsWith("left") ? "left" : "right";
      const target = noteBlockSchematex[2];
      const buf: string[] = [];
      i++;
      while (i < lines.length && lines[i]!.text !== "}") {
        buf.push(lines[i]!.text);
        i++;
      }
      if (i >= lines.length) {
        throw new StateParseError("Unterminated note block", ln.line);
      }
      i++;
      ctx.noteCounter += 1;
      ctx.notes.push({
        id: `__note_${ctx.noteCounter}`,
        target,
        side,
        text: buf.join("\n"),
      });
      continue;
    }

    // ── Transition: A -> B [: label]  OR Mermaid `A --> B [: label]` ──
    const transMatch = text.match(TRANSITION_RE);
    if (transMatch) {
      const fromTok = transMatch[1];
      const toTok = transMatch[2];
      const labelRaw = transMatch[3];

      const resolveTok = (
        tok: string,
        position: "from" | "to"
      ): string => {
        if (tok === "[*]") {
          if (position === "from") return ensureInitialAlias(ctx, parent).id;
          return ensureFinalAlias(ctx, parent).id;
        }
        return ensureSimpleState(ctx, tok, parent).id;
      };

      const fromId = resolveTok(fromTok, "from");
      const toId = resolveTok(toTok, "to");

      ctx.transCounter += 1;
      const tid = `t${ctx.transCounter}`;
      const parsedLabel = labelRaw ? parseTransitionLabel(labelRaw) : {};
      ctx.transitions.push({
        id: tid,
        from: fromId,
        to: toId,
        trigger: parsedLabel.trigger,
        guard: parsedLabel.guard,
        action: parsedLabel.action,
        labelSourceRange: labelRaw
          ? (() => {
              const token = labelRaw.trim();
              const bounds = tokenBounds(text, token, text.indexOf(":") + 1);
              return locator.range(ln.start + bounds.start, ln.start + bounds.end);
            })()
          : undefined,
      });
      i++;
      continue;
    }

    // ── Mermaid `Foo: description` to label an existing/new state ──
    const labelOnlyMatch = text.match(LABEL_ONLY_RE);
    if (labelOnlyMatch && isIdent(labelOnlyMatch[1])) {
      const node = ensureSimpleState(ctx, labelOnlyMatch[1], parent);
      const token = labelOnlyMatch[2].trim();
      node.label = unquote(token);
      const bounds = tokenBounds(text, token, text.indexOf(":") + 1);
      node.labelSourceRange = locator.range(ln.start + bounds.start, ln.start + bounds.end);
      i++;
      continue;
    }

    // ── Bare state declaration: `IDENT` ──
    const bareIdent = text.match(BARE_IDENTIFIER_RE);
    if (bareIdent) {
      ensureSimpleState(ctx, bareIdent[1], parent);
      i++;
      continue;
    }

    throw new StateParseError(`Unparseable line: ${text}`, ln.line);
  }

  if (compositeStack.length > 1) {
    throw new StateParseError("Unclosed composite block (expected '}')");
  }

  function finalizeRegions(node: StateNode) {
    if (node.regions) {
      const consumed = node.regions.reduce((s, r) => s + r.length, 0);
      if (node.children.length > consumed) {
        node.regions.push(node.children.slice(consumed));
      }
    }
    for (const child of node.children) finalizeRegions(child);
  }
  for (const s of ctx.states) finalizeRegions(s);

  if (directionSource === "auto") {
    const simpleStates: StateNode[] = [];
    const collectSimple = (state: StateNode): void => {
      if (state.kind === "simple") simpleStates.push(state);
      for (const child of state.children) collectSimple(child);
    };
    for (const state of ctx.states) collectSimple(state);
    const simpleIds = new Set(simpleStates.map((state) => state.id));
    const edges = ctx.transitions.filter(
      (transition) =>
        simpleIds.has(transition.from) && simpleIds.has(transition.to)
    );
    const indegree = new Map<string, number>();
    const outdegree = new Map<string, number>();
    for (const edge of edges) {
      indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
      outdegree.set(edge.from, (outdegree.get(edge.from) ?? 0) + 1);
    }
    const linear =
      simpleStates.length > 0 &&
      edges.length >= Math.max(0, simpleStates.length - 1) &&
      simpleStates.every(
        (state) =>
          (indegree.get(state.id) ?? 0) <= 1 &&
          (outdegree.get(state.id) ?? 0) <= 1
      );
    const maxLabelWidth = Math.max(
      0,
      ...simpleStates.map((state) =>
        estimateTextWidth(state.label || state.id, 12, { fontWeight: 600 })
      )
    );
    direction =
      linear && simpleStates.length <= 3 && maxLabelWidth <= 150
        ? "LR"
        : "TB";
  }

  return {
    type: "state",
    title,
    titleSourceRange,
    direction,
    directionSource,
    states: ctx.states,
    transitions: ctx.transitions,
    notes: ctx.notes,
  };
}
