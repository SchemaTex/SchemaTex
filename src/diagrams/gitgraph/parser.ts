/**
 * Git commit-graph parser — Mermaid `gitGraph` syntax (drop-in compatible).
 * Per docs/reference/43-GIT-GRAPH-STANDARD.md §"DSL sketch".
 *
 * Accepts the Mermaid op set unchanged so LLM-generated `gitGraph` blocks
 * render without edits:
 *   gitGraph            | gitgraph            (case-insensitive, optional `:`)
 *   gitGraph LR:        | gitGraph TB:        (inline orientation)
 *   commit
 *   commit id: "x" tag: "v1" type: HIGHLIGHT|REVERSE|NORMAL
 *   branch name         | branch name order: 2
 *   checkout name       | switch name
 *   merge name id: "x" tag: "v" type: HIGHLIGHT
 *   cherry-pick id: "x" parent: "y" tag: "v"
 *
 * Plus the optional config block (YAML frontmatter or `%%{init}%%`), of which we
 * honour the structural keys — orientation, mainBranchName, mainBranchOrder,
 * showBranches, showCommitLabel, rotateCommitLabel — and parse-and-ignore the
 * purely cosmetic theme keys (colour comes from our own palette).
 *
 * Zero runtime deps, hand-written, strict TS.
 */

import { extractQuotedString } from "../../core/quotes";
import type {
  GitCommitType,
  GitGraphAst,
  GitGraphOrientation,
  GitOperation,
} from "./types";

export class GitGraphParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "GitGraphParseError";
  }
}

const COMMIT_TYPES = new Set<GitCommitType>(["NORMAL", "REVERSE", "HIGHLIGHT"]);

// ─── Public entry ─────────────────────────────────────────────

export function parseGitGraph(text: string): GitGraphAst {
  const ast: GitGraphAst = {
    type: "gitgraph",
    orientation: "LR",
    mainBranchName: "main",
    mainBranchOrder: 0,
    showBranches: true,
    showCommitLabel: true,
    rotateCommitLabel: true,
    operations: [],
  };

  const rawLines = text.split(/\r?\n/);
  let i = 0;

  // ── Optional config: YAML frontmatter (--- … ---) before the header ──
  i = parseFrontmatter(rawLines, i, ast);

  // ── Optional `%%{init: {...}}%%` directive(s) ──
  i = skipBlankAndDirectives(rawLines, i, ast);

  // ── Header ──
  let headerSeen = false;
  while (i < rawLines.length) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") { i++; continue; }
    const h = /^gitgraph\b\s*:?\s*(.*)$/i.exec(t);
    if (!h) {
      throw new GitGraphParseError(
        `expected a 'gitGraph' header, got: ${truncate(t)}`,
        i + 1
      );
    }
    // Inline orientation: `gitGraph LR:` / `gitGraph TB:` / `gitGraph BT:`
    const after = (h[1] ?? "").trim();
    if (after) {
      const o = /^(LR|TB|BT)\s*:?\s*$/i.exec(after);
      if (o) {
        // Safe: the regex above only matches LR|TB|BT, so the upper-cased
        // value is exactly a GitGraphOrientation member.
        ast.orientation = o[1]!.toUpperCase() as GitGraphOrientation;
      }
      // Any other trailing text on the header line is ignored (Mermaid tolerant).
    }
    headerSeen = true;
    i++;
    break;
  }
  if (!headerSeen) {
    throw new GitGraphParseError("empty gitGraph (no header)");
  }

  // ── Body ──
  for (; i < rawLines.length; i++) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") continue;

    // Directives can appear mid-body in Mermaid; tolerate + apply.
    if (/^%%\{/.test(t)) { applyInit(t, ast); continue; }

    const op = parseOperation(t, i + 1);
    if (op) ast.operations.push(op);
  }

  validate(ast);
  return ast;
}

// ─── Operation parsing ────────────────────────────────────────

function parseOperation(line: string, lineNo: number): GitOperation | null {
  const kw = /^(\S+)/.exec(line)?.[1] ?? "";
  const rest = line.slice(kw.length).trim();
  const low = kw.toLowerCase();

  switch (low) {
    case "commit":
      return parseCommit(rest, lineNo);
    case "branch":
      return parseBranch(rest, lineNo);
    case "checkout":
    case "switch":
      return parseCheckout(rest, lineNo);
    case "merge":
      return parseMerge(rest, lineNo);
    case "cherry-pick":
    case "cherrypick":
      return parseCherryPick(rest, lineNo);
    default:
      throw new GitGraphParseError(
        `unknown operation '${kw}' (expected commit | branch | checkout | switch | merge | cherry-pick)`,
        lineNo
      );
  }
}

interface OptionBag {
  id?: string;
  tag?: string;
  type?: GitCommitType;
  order?: number;
  parent?: string;
  leading?: string; // first bare (unkeyed) token, e.g. the branch name
}

/**
 * Parse the `key: value` option tail shared by commit/branch/merge/cherry-pick.
 * Keys: id, tag, type, order, parent. A leading bare token (no `:`) is captured
 * as `leading` (the branch/target name). Values may be quoted (CJK quotes ok).
 */
function parseOptions(rest: string, lineNo: number): OptionBag {
  const bag: OptionBag = {};
  let i = 0;
  const s = rest;

  // Leading bare token (branch name / merge target).
  const lead = /^([^\s:]+)(?=\s|$)/.exec(s.slice(i));
  if (lead && !s.slice(i + lead[0].length).trimStart().startsWith(":")) {
    bag.leading = lead[1];
    i += lead[0].length;
  }

  while (i < s.length) {
    // skip whitespace
    while (i < s.length && /\s/.test(s[i]!)) i++;
    if (i >= s.length) break;

    const keyMatch = /^([A-Za-z]+)\s*:/.exec(s.slice(i));
    if (!keyMatch) {
      throw new GitGraphParseError(
        `unexpected token near '${truncate(s.slice(i))}' (expected key: value)`,
        lineNo
      );
    }
    const key = keyMatch[1]!.toLowerCase();
    i += keyMatch[0].length;
    while (i < s.length && /\s/.test(s[i]!)) i++;

    let value: string;
    const ch = s[i];
    if (ch !== undefined && isQuote(ch)) {
      const q = extractQuotedString(s, i);
      if (!q) {
        throw new GitGraphParseError(`unterminated quoted value for '${key}'`, lineNo);
      }
      value = q.value;
      i = q.end;
    } else {
      const bare = /^(\S+)/.exec(s.slice(i));
      if (!bare) {
        throw new GitGraphParseError(`missing value for '${key}'`, lineNo);
      }
      value = bare[1]!;
      i += bare[0].length;
    }

    assignOption(bag, key, value, lineNo);
  }

  return bag;
}

function assignOption(bag: OptionBag, key: string, value: string, lineNo: number): void {
  switch (key) {
    case "id":
      bag.id = value;
      break;
    case "tag":
      bag.tag = value;
      break;
    case "parent":
      bag.parent = value;
      break;
    case "order": {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        throw new GitGraphParseError(`'order:' must be a number, got '${value}'`, lineNo);
      }
      bag.order = n;
      break;
    }
    case "type": {
      // Cast then validate against COMMIT_TYPES on the next line; an unknown
      // value throws before the bag is mutated.
      const up = value.toUpperCase() as GitCommitType;
      if (!COMMIT_TYPES.has(up)) {
        throw new GitGraphParseError(
          `unknown commit type '${value}' (expected NORMAL | REVERSE | HIGHLIGHT)`,
          lineNo
        );
      }
      bag.type = up;
      break;
    }
    default:
      throw new GitGraphParseError(`unknown option '${key}:'`, lineNo);
  }
}

function parseCommit(rest: string, lineNo: number): GitOperation {
  const o = parseOptions(rest, lineNo);
  if (o.leading !== undefined) {
    throw new GitGraphParseError(
      `'commit' takes no bare argument (use id:/tag:/type:), got '${o.leading}'`,
      lineNo
    );
  }
  return {
    kind: "commit",
    id: o.id,
    tag: o.tag,
    commitType: o.type ?? "NORMAL",
    line: lineNo,
  };
}

function parseBranch(rest: string, lineNo: number): GitOperation {
  const o = parseOptions(rest, lineNo);
  const name = o.leading ?? o.id;
  if (!name) {
    throw new GitGraphParseError("'branch' requires a branch name", lineNo);
  }
  return { kind: "branch", name, order: o.order, line: lineNo };
}

function parseCheckout(rest: string, lineNo: number): GitOperation {
  const o = parseOptions(rest, lineNo);
  const name = o.leading ?? o.id;
  if (!name) {
    throw new GitGraphParseError("'checkout' / 'switch' requires a branch name", lineNo);
  }
  return { kind: "checkout", name, line: lineNo };
}

function parseMerge(rest: string, lineNo: number): GitOperation {
  const o = parseOptions(rest, lineNo);
  if (!o.leading) {
    throw new GitGraphParseError("'merge' requires a branch name", lineNo);
  }
  return {
    kind: "merge",
    name: o.leading,
    id: o.id,
    tag: o.tag,
    commitType: o.type ?? "NORMAL",
    line: lineNo,
  };
}

function parseCherryPick(rest: string, lineNo: number): GitOperation {
  const o = parseOptions(rest, lineNo);
  if (!o.id) {
    throw new GitGraphParseError("'cherry-pick' requires id: \"<commit>\"", lineNo);
  }
  return { kind: "cherry-pick", id: o.id, tag: o.tag, parent: o.parent, line: lineNo };
}

// ─── Validation (structural; layout does DAG-level checks) ────

function validate(ast: GitGraphAst): void {
  const firstOp = ast.operations[0];
  if (firstOp && firstOp.kind !== "commit" && firstOp.kind !== "branch") {
    // Mermaid implicitly starts on main; a leading checkout/merge of a branch
    // that doesn't exist yet is the only thing to guard here — defer the
    // undeclared-branch / unknown-id checks to layout (it has the replay state).
  }
}

// ─── Config block parsing ─────────────────────────────────────

/** Parse a leading `--- … ---` YAML frontmatter block, applying known keys. */
function parseFrontmatter(lines: string[], start: number, ast: GitGraphAst): number {
  let i = start;
  // skip leading blanks
  while (i < lines.length && (lines[i] ?? "").trim() === "") i++;
  if ((lines[i] ?? "").trim() !== "---") return i;
  i++;
  const body: string[] = [];
  while (i < lines.length && (lines[i] ?? "").trim() !== "---") {
    body.push(lines[i] ?? "");
    i++;
  }
  if (i < lines.length) i++; // consume closing ---
  applyConfigLines(body, ast);
  return i;
}

/** Skip blank lines + `%%{init:...}%%` directives before the header. */
function skipBlankAndDirectives(lines: string[], start: number, ast: GitGraphAst): number {
  let i = start;
  for (; i < lines.length; i++) {
    const t = stripComment(lines[i] ?? "").trim();
    if (t === "") continue;
    if (/^%%\{/.test(t)) { applyInit(t, ast); continue; }
    break;
  }
  return i;
}

/** Apply a `%%{init: { gitGraph: { ... }, ... }}%%` directive (lenient). */
function applyInit(line: string, ast: GitGraphAst): void {
  // We don't ship a JSON parser dependency; extract the keys we care about by
  // scanning for `key: value` / `key: "value"` tokens anywhere in the blob.
  applyConfigLines([line], ast);
}

/** Scan config text (frontmatter lines or an init blob) for known keys. */
function applyConfigLines(lines: string[], ast: GitGraphAst): void {
  const blob = lines.join("\n");

  // `K:` after an optional closing key-quote (Mermaid init blobs quote keys:
  // `'mainBranchName': 'release'`), then an optional value quote.
  const orient = /\borientation['"]?\s*:\s*['"]?(LR|TB|BT)['"]?/i.exec(blob);
  // Safe: capture group is constrained to LR|TB|BT.
  if (orient) ast.orientation = orient[1]!.toUpperCase() as GitGraphOrientation;

  const mbn = /\bmainBranchName['"]?\s*:\s*['"]?([^'",}\s]+)['"]?/i.exec(blob);
  if (mbn) ast.mainBranchName = mbn[1]!;

  const mbo = /\bmainBranchOrder['"]?\s*:\s*['"]?(-?\d+)['"]?/i.exec(blob);
  if (mbo) ast.mainBranchOrder = Number(mbo[1]);

  const sb = /\bshowBranches['"]?\s*:\s*['"]?(true|false)/i.exec(blob);
  if (sb) ast.showBranches = sb[1]!.toLowerCase() === "true";

  const scl = /\bshowCommitLabel['"]?\s*:\s*['"]?(true|false)/i.exec(blob);
  if (scl) ast.showCommitLabel = scl[1]!.toLowerCase() === "true";

  const rcl = /\brotateCommitLabel['"]?\s*:\s*['"]?(true|false)/i.exec(blob);
  if (rcl) ast.rotateCommitLabel = rcl[1]!.toLowerCase() === "true";

  const titleM = /\btitle\s*:\s*['"]?([^'"\n}]+?)['"]?\s*$/im.exec(blob);
  if (titleM) {
    const tv = titleM[1]!.trim();
    if (tv && !/^(LR|TB|BT)$/i.test(tv)) ast.title = tv;
  }
}

// ─── Small helpers ────────────────────────────────────────────

function stripComment(line: string): string {
  // Mermaid uses `%%` for comments. Strip from first `%%` not part of `%%{`.
  const idx = line.indexOf("%%");
  if (idx >= 0 && line.slice(idx, idx + 3) !== "%%{") {
    return line.slice(0, idx);
  }
  return line;
}

function isQuote(ch: string): boolean {
  return ch === '"' || ch === "'" || ch === "“" || ch === "‘"
    || ch === "「" || ch === "『" || ch === "«";
}

function truncate(s: string): string {
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}
