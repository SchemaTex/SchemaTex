/**
 * UML Sequence diagram — recursive-descent parser.
 *
 * Spec: docs/reference/33-SEQUENCE-STANDARD.md §4
 *
 * Hand-written, zero-dependency. Line-oriented with recursion for nested
 * combined fragments.
 */

import { stripQuotes, matchQuotedTitle } from "../../core/quotes";
import type {
  SeqArrowKind,
  SeqAst,
  SeqFragment,
  SeqFragmentOp,
  SeqMessage,
  SeqNote,
  SeqNotePlacement,
  SeqOperand,
  SeqParticipant,
  SeqParticipantKind,
  SeqStatement,
} from "./types";

export class SequenceParseError extends Error {
  line?: number;
  constructor(message: string, line?: number) {
    super(line ? `${message} (line ${line})` : message);
    this.name = "SequenceParseError";
    this.line = line;
  }
}

const KINDS = new Set<SeqParticipantKind>([
  "participant",
  "actor",
  "boundary",
  "control",
  "entity",
  "database",
  "collections",
  "queue",
]);

const SIMPLE_FRAG = new Set<SeqFragmentOp>([
  "opt",
  "loop",
  "break",
  "critical",
  "neg",
  "ignore",
  "consider",
  "assert",
]);
const MULTI_FRAG = new Set<SeqFragmentOp>(["par", "seq", "strict"]);
/** `ignore`/`consider` carry a `{m1, m2}` message-name set after the keyword. */
const MSGSET_FRAG = new Set<SeqFragmentOp>(["ignore", "consider"]);
const ALL_FRAG = new Set<SeqFragmentOp>([
  "alt",
  ...SIMPLE_FRAG,
  ...MULTI_FRAG,
]);

/** Arrow tokens, ordered longest-first so the regex matches greedily. */
const ARROW_RE = /(-->>|--\)|--x|-->|->>|o->|-\)|-x|->)/;

/**
 * Map an arrow token to a Schematex arrow kind.
 *
 * In Mermaid mode (`sequenceDiagram` header) the tokens follow Mermaid's
 * conventions — notably `->>` is a *synchronous* call and `-->>` is the reply.
 * In native mode (`sequence` header) the long-standing Schematex meaning is
 * kept (`->>` = async) so existing documents are unaffected.
 */
function arrowKind(token: string, mermaid: boolean): SeqArrowKind {
  switch (token) {
    case "-->>":
      return "reply";
    case "-->":
      return "reply";
    case "--)":
      return "async";
    case "-)":
      return "async";
    case "o->":
      return "found";
    case "->>":
      return mermaid ? "sync" : "async";
    case "--x":
      return mermaid ? "reply" : "lost"; // mermaid keeps the target (styled below)
    case "-x":
      return mermaid ? "sync" : "lost";
    default:
      return "sync"; // "->"
  }
}

interface Line {
  text: string;
  n: number;
}

function firstWord(s: string): string {
  const m = /^(\S+)/.exec(s);
  return m ? m[1]! : "";
}

/** Strip a leading `[guard]` / `(n)` / `(n,m)` clause; returns its inner text. */
function extractGuard(rest: string): string | undefined {
  const t = rest.trim();
  if (!t) return undefined;
  if (t.startsWith("[") && t.endsWith("]")) return t.slice(1, -1).trim();
  if (t.startsWith("(") && t.endsWith(")")) return t.slice(1, -1).trim();
  return t;
}

export class SequenceParser {
  private lines: Line[];
  private i = 0;
  private order: string[] = [];
  private byId = new Map<string, SeqParticipant>();
  private warnings: string[] = [];
  private mermaid = false;

  constructor(source: string) {
    this.lines = source.split(/\r?\n/).map((raw, idx) => ({
      text: raw.trim(),
      n: idx + 1,
    }));
  }

  parse(): SeqAst {
    const header = this.consumeHeader();
    const ast: SeqAst = {
      type: "sequence",
      participants: [],
      statements: [],
      warnings: this.warnings,
    };
    if (header.title) ast.title = header.title;

    const statements = this.parseBlock();

    // A leftover terminator at top level is a dangling `end`/`else`/`and`.
    const leftover = this.peek();
    if (leftover) {
      const fw = firstWord(leftover.text).toLowerCase();
      throw new SequenceParseError(
        `'${fw}' without a matching combined fragment`,
        leftover.n,
      );
    }

    if (this.autonumberSpec) ast.autonumber = this.autonumberSpec;
    ast.statements = statements;
    ast.participants = this.order.map((id) => this.byId.get(id)!);
    return ast;
  }

  private autonumberSpec?: { start: number; step: number };

  // ── line cursor ──────────────────────────────────────────────

  private peek(): Line | null {
    while (this.i < this.lines.length) {
      const ln = this.lines[this.i]!;
      if (ln.text === "" || ln.text.startsWith("#") || ln.text.startsWith("//")) {
        this.i++;
        continue;
      }
      return ln;
    }
    return null;
  }

  private next(): Line | null {
    const ln = this.peek();
    if (ln) this.i++;
    return ln;
  }

  // ── header ───────────────────────────────────────────────────

  private consumeHeader(): { title?: string } {
    const ln = this.next();
    if (!ln || !/^sequence(?:diagram)?\b/i.test(ln.text)) {
      throw new SequenceParseError(
        "A sequence diagram must start with the keyword 'sequence' (or Mermaid 'sequenceDiagram')",
        ln?.n,
      );
    }
    // Mermaid's `sequenceDiagram` header switches arrow tokens to Mermaid semantics.
    this.mermaid = /^sequencediagram\b/i.test(ln.text);
    const title = matchQuotedTitle(ln.text);
    return title ? { title } : {};
  }

  // ── participants ─────────────────────────────────────────────

  private ensure(id: string, kind: SeqParticipantKind = "participant", line?: number): SeqParticipant {
    let p = this.byId.get(id);
    if (!p) {
      p = { id, name: id, kind, line };
      this.byId.set(id, p);
      this.order.push(id);
    }
    return p;
  }

  private declare(line: Line): void {
    const fw = firstWord(line.text);
    const kind = fw.toLowerCase() as SeqParticipantKind;
    let rest = line.text.slice(fw.length).trim();
    // pull out an optional «stereotype» / <<stereotype>> (may sit before or after `as`)
    let stereotype: string | undefined;
    const stereoMatch = /«([^»]*)»|<<([^>]*)>>/.exec(rest);
    if (stereoMatch) {
      stereotype = (stereoMatch[1] ?? stereoMatch[2] ?? "").trim();
      rest = (rest.slice(0, stereoMatch.index) + rest.slice(stereoMatch.index + stereoMatch[0].length)).trim();
    }
    // split on " as " (case-insensitive), respecting the rest as the label
    let id: string;
    let name: string;
    const asMatch = /\sas\s/i.exec(rest);
    if (asMatch) {
      id = stripQuotes(rest.slice(0, asMatch.index).trim());
      name = stripQuotes(rest.slice(asMatch.index + asMatch[0].length).trim());
    } else {
      id = stripQuotes(rest);
      name = id;
    }
    if (!id) {
      throw new SequenceParseError(`'${fw}' declaration needs a name`, line.n);
    }
    const existing = this.byId.get(id);
    if (existing) {
      existing.kind = kind;
      existing.name = name;
      if (stereotype) existing.stereotype = stereotype;
    } else {
      const p: SeqParticipant = { id, name, kind, line: line.n };
      if (stereotype) p.stereotype = stereotype;
      this.byId.set(id, p);
      this.order.push(id);
    }
  }

  // ── block / statement dispatch ───────────────────────────────

  /** Parse statements until a terminator (`end`/`else`/`and`) or EOF. Terminators are left unconsumed. */
  private parseBlock(): SeqStatement[] {
    const out: SeqStatement[] = [];
    for (;;) {
      const ln = this.peek();
      if (!ln) break;
      const fw = firstWord(ln.text).toLowerCase();
      if (fw === "end" || fw === "else" || fw === "and") break;

      if (KINDS.has(fw as SeqParticipantKind)) {
        this.i++;
        this.declare(ln);
        continue;
      }
      if (ALL_FRAG.has(fw as SeqFragmentOp)) {
        out.push(this.parseFragment(ln));
        continue;
      }
      this.i++;
      const stmt = this.parseSimpleStatement(ln);
      if (stmt) out.push(stmt);
    }
    return out;
  }

  private parseFragment(open: Line): SeqFragment {
    const fw = firstWord(open.text).toLowerCase() as SeqFragmentOp;
    this.i++; // consume the opening line
    let rest = open.text.slice(fw.length);

    // ignore/consider: pull the `{m1, m2}` message-name set out first
    let messageSet: string[] | undefined;
    if (MSGSET_FRAG.has(fw)) {
      const bm = /\{([^}]*)\}/.exec(rest);
      if (bm) {
        messageSet = bm[1]!.split(",").map((s) => s.trim()).filter(Boolean);
        rest = rest.slice(0, bm.index) + rest.slice(bm.index + bm[0].length);
      }
    }

    const firstGuard = extractGuard(rest);
    const operands: SeqOperand[] = [
      { guard: firstGuard, statements: this.parseBlock() },
    ];

    for (;;) {
      const ln = this.peek();
      if (!ln) {
        throw new SequenceParseError(`Unterminated '${fw}' fragment`, open.n);
      }
      const term = firstWord(ln.text).toLowerCase();
      if (term === "end") {
        this.i++;
        break;
      }
      if (term === "else") {
        if (fw !== "alt") {
          throw new SequenceParseError(
            `'else' is only valid inside an 'alt' fragment, not '${fw}'`,
            ln.n,
          );
        }
        this.i++;
        operands.push({
          guard: extractGuard(ln.text.slice(4)),
          statements: this.parseBlock(),
        });
        continue;
      }
      if (term === "and") {
        if (!MULTI_FRAG.has(fw)) {
          throw new SequenceParseError(
            `'and' is only valid inside par/seq/strict, not '${fw}'`,
            ln.n,
          );
        }
        this.i++;
        const label = ln.text.slice(3).trim();
        operands.push({
          guard: label ? extractGuard(label) : undefined,
          statements: this.parseBlock(),
        });
        continue;
      }
      // unreachable: parseBlock only stops at end/else/and
      throw new SequenceParseError(`Unexpected '${term}' in '${fw}'`, ln.n);
    }

    const frag: SeqFragment = { kind: "fragment", op: fw, operands, line: open.n };
    if (messageSet && messageSet.length) frag.messageSet = messageSet;
    return frag;
  }

  /** Non-fragment, non-participant statements. */
  private parseSimpleStatement(ln: Line): SeqStatement | null {
    const text = ln.text;
    const fw = firstWord(text).toLowerCase();

    if (fw === "activate" || fw === "deactivate") {
      const m = /^(?:de)?activate\s+(\S+)$/i.exec(text);
      if (!m) throw new SequenceParseError(`Malformed ${fw} statement`, ln.n);
      this.ensure(m[1]!, "participant", ln.n);
      return { kind: fw, id: m[1]!, line: ln.n };
    }

    if (fw === "note") {
      return this.parseNote(ln);
    }

    if (fw === "ref") {
      const m = /^ref\s+over\s+(.+?)\s*:\s*(.*)$/i.exec(text);
      if (!m) throw new SequenceParseError("Malformed ref (expected: ref over A, B : text)", ln.n);
      const ids = m[1]!.split(",").map((s) => stripQuotes(s.trim())).filter(Boolean);
      ids.forEach((id) => this.ensure(id, "participant", ln.n));
      return { kind: "ref", ids, text: m[2]!.trim(), line: ln.n };
    }

    if (text.startsWith("==")) {
      const m = /^==\s*(.*?)\s*==\s*$/.exec(text);
      return { kind: "divider", text: m ? m[1]!.trim() : "", line: ln.n };
    }

    if (fw === "state") {
      const m = /^state\s+(\S+)\s*:\s*(.*)$/i.exec(text);
      if (!m) throw new SequenceParseError("Malformed state invariant (expected: state A : text)", ln.n);
      this.ensure(m[1]!, "participant", ln.n);
      return { kind: "invariant", id: m[1]!, text: m[2]!.trim(), line: ln.n };
    }

    if (fw === "destroy") {
      const m = /^destroy\s+(\S+)$/i.exec(text);
      if (!m) throw new SequenceParseError("Malformed destroy statement", ln.n);
      this.ensure(m[1]!, "participant", ln.n);
      return { kind: "destroy", id: m[1]!, line: ln.n };
    }

    if (fw === "autonumber") {
      const m = /^autonumber(?:\s+(\d+))?(?:\s+(\d+))?$/i.exec(text);
      const start = m && m[1] ? parseInt(m[1], 10) : 1;
      const step = m && m[2] ? parseInt(m[2], 10) : 1;
      this.autonumberSpec = { start, step };
      return null;
    }

    return this.parseMessage(ln);
  }

  private parseNote(ln: Line): SeqNote {
    const m = /^note\s+(over|left of|right of)\s+(.+?)\s*:\s*(.*)$/i.exec(ln.text);
    if (!m) {
      throw new SequenceParseError(
        "Malformed note (expected: note over|left of|right of A[, B] : text)",
        ln.n,
      );
    }
    const placementRaw = m[1]!.toLowerCase();
    const placement: SeqNotePlacement =
      placementRaw === "over" ? "over" : placementRaw.startsWith("left") ? "left" : "right";
    const ids = m[2]!.split(",").map((s) => stripQuotes(s.trim())).filter(Boolean);
    ids.forEach((id) => this.ensure(id, "participant", ln.n));
    return { kind: "note", placement, ids, text: m[3]!.trim(), line: ln.n };
  }

  private parseMessage(ln: Line): SeqMessage {
    const text = ln.text;
    const arrowMatch = ARROW_RE.exec(text);
    if (!arrowMatch) {
      throw new SequenceParseError(`Cannot parse statement: "${text}"`, ln.n);
    }
    const token = arrowMatch[1]!;
    const at = arrowMatch.index;
    const leftRaw = text.slice(0, at);
    let rightRaw = text.slice(at + token.length);

    // label after the first ':'
    let label: string | undefined;
    const colon = rightRaw.indexOf(":");
    if (colon >= 0) {
      label = rightRaw.slice(colon + 1).trim();
      rightRaw = rightRaw.slice(0, colon);
    }

    // activation suffixes: leftRaw may end with +/- ; rightRaw may start with +/-
    let activateTarget = false;
    let deactivateSource = false;
    let left = leftRaw.trim();
    if (left.endsWith("+")) {
      activateTarget = true;
      left = left.slice(0, -1).trim();
    } else if (left.endsWith("-")) {
      deactivateSource = true;
      left = left.slice(0, -1).trim();
    }
    let right = rightRaw.trim();
    if (right.startsWith("+")) {
      activateTarget = true;
      right = right.slice(1).trim();
    } else if (right.startsWith("-")) {
      deactivateSource = true;
      right = right.slice(1).trim();
    }

    const arrow = arrowKind(token, this.mermaid);

    // create form: right id prefixed with '*'
    let create = false;
    if (right.startsWith("*")) {
      create = true;
      right = right.slice(1).trim();
    }

    const from = arrow === "found" ? "" : stripQuotes(left);
    const to = arrow === "lost" ? "" : stripQuotes(right);

    if (from) this.ensure(from, "participant", ln.n);
    if (to) {
      const p = this.ensure(to, "participant", ln.n);
      if (create) p.createdInline = true;
    }

    const msg: SeqMessage = {
      kind: "message",
      from,
      to,
      arrow,
      line: ln.n,
    };
    if (label) msg.label = label;
    if (activateTarget) msg.activateTarget = true;
    if (deactivateSource) msg.deactivateSource = true;
    if (create) msg.create = true;
    return msg;
  }
}

export function parseSequence(text: string): SeqAst {
  return new SequenceParser(text).parse();
}
