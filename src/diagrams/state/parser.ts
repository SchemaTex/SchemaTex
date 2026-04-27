import type {
  PseudoStateKind,
  StateActivity,
  StateDiagramAST,
  StateDirection,
  StateNode,
  StateNote,
  StateTransition,
} from "./types";

export class StateParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "StateParseError";
  }
}

interface RawLine {
  indent: number;
  text: string;
  line: number;
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
  const out: RawLine[] = [];
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    // Comment forms: # // and Mermaid's %%
    if (trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("%%")) continue;
    const indent = raw.length - raw.replace(/^\s+/, "").length;
    out.push({ indent, text: trimmed, line: i + 1 });
  }
  return out;
}

function unquote(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
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
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(tok);
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

  const headerRest = header.text.slice(headerTok[0].length).trim();
  // Parse optional `direction LR` on the header line itself (Mermaid permits this on a separate line too)
  const propsMatch = headerRest.match(/\[[^\]]*\]\s*$/);
  let beforeProps = headerRest;
  if (propsMatch) {
    const props = parseProps(propsMatch[0]);
    if (props.direction === "TB" || props.direction === "LR") direction = props.direction;
    beforeProps = headerRest.slice(0, propsMatch.index).trim();
  }
  if (beforeProps.startsWith('"')) title = unquote(beforeProps);
  else if (beforeProps.length > 0) title = beforeProps;

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
    const dirMatch = text.match(/^direction\s+(TB|BT|LR|RL)\s*$/);
    if (dirMatch) {
      const d = dirMatch[1] as "TB" | "BT" | "LR" | "RL";
      direction = d === "BT" ? "TB" : d === "RL" ? "LR" : (d as StateDirection);
      i++;
      continue;
    }

    // ── Composite definition: composite IDENT {  OR  state IDENT { (Mermaid) ──
    const compMatch = text.match(/^(?:composite|state)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{?\s*$/);
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
    const aliasMatch = text.match(/^state\s+"([^"]*)"\s+as\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/);
    if (aliasMatch) {
      const node = ensureSimpleState(ctx, aliasMatch[2], parent);
      node.label = aliasMatch[1];
      i++;
      continue;
    }

    // ── Mermaid stereotype: `state ID <<choice>>` / `<<fork>>` / `<<join>>` / `<<end>>` ──
    const stereoMatch = text.match(/^state\s+([A-Za-z_][A-Za-z0-9_]*)\s+<<\s*(choice|fork|join|end)\s*>>\s*$/);
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
    const stateLabelMatch = text.match(/^state\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
    if (stateLabelMatch) {
      const node = ensureSimpleState(ctx, stateLabelMatch[1], parent);
      node.label = unquote(stateLabelMatch[2].trim());
      i++;
      continue;
    }

    // ── Schematex pseudo-state declaration: initial X / fork F / etc. ──
    const pseudoMatch = text.match(
      /^(initial|final|choice|junction|fork|join|history|dhistory|terminate|entry_point|exit_point)\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/
    );
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
    const noteSimple = text.match(
      /^note\s+(left[_ ]of|right[_ ]of)\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/
    );
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
    const noteBlockMermaid = text.match(
      /^note\s+(left[_ ]of|right[_ ]of)\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/
    );
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
    const noteBlockSchematex = text.match(
      /^note\s+(left[_ ]of\s+|right[_ ]of\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*$/
    );
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
    const transMatch = text.match(
      /^(\[\*\]|[A-Za-z_][A-Za-z0-9_]*)\s*-+>\s*(\[\*\]|[A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*(.*))?$/
    );
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
      });
      i++;
      continue;
    }

    // ── Mermaid `Foo: description` to label an existing/new state ──
    const labelOnlyMatch = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
    if (labelOnlyMatch && isIdent(labelOnlyMatch[1])) {
      const node = ensureSimpleState(ctx, labelOnlyMatch[1], parent);
      node.label = unquote(labelOnlyMatch[2].trim());
      i++;
      continue;
    }

    // ── Bare state declaration: `IDENT` ──
    const bareIdent = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*$/);
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

  return {
    type: "state",
    title,
    direction,
    states: ctx.states,
    transitions: ctx.transitions,
    notes: ctx.notes,
  };
}
