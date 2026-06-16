/**
 * Comparison (comparison) parser — keyword-structured DSL, one grammar across
 * five modes. Per docs/reference/51-COMPARISON-STANDARD.md §4.
 *
 * Header `comparison "Title"` (aliases `tchart` / `pugh` / `compare` set the
 * mode directly). `mode:` picks the presentation; when omitted the mode is
 * inferred from the keywords used. Binding is keyword-driven so indentation is
 * forgiving (tabs / ragged spacing tolerated). CJK quotes accepted. Zero deps.
 */

import type {
  ComparisonAst,
  ComparisonColumn,
  ComparisonCriterion,
  ComparisonMode,
  ComparisonOption,
  CellValue,
} from "./types";

export class ComparisonParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "ComparisonParseError";
  }
}

const MODES: readonly ComparisonMode[] = [
  "tchart",
  "pros-cons",
  "matrix",
  "decision",
  "double-bubble",
];

// ─── Public entry ─────────────────────────────────────────────

export function parseComparison(text: string): ComparisonAst {
  const ast: ComparisonAst = {
    type: "comparison",
    mode: "tchart",
    columns: [],
    pros: [],
    cons: [],
    options: [],
    criteria: [],
    legend: "on",
    warnings: [],
  };

  const rawLines = text.split(/\r?\n/);
  let i = 0;
  let explicitMode: ComparisonMode | undefined;

  // ── Header ──
  while (i < rawLines.length) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") {
      i++;
      continue;
    }
    const h = /^(comparison|compare|vs|tchart|t-chart|pugh|decision-matrix|decisionmatrix)\b(.*)$/i.exec(t);
    if (h) {
      const head = h[1]!.toLowerCase();
      if (head === "tchart" || head === "t-chart") explicitMode = "tchart";
      else if (head === "pugh" || head === "decision-matrix" || head === "decisionmatrix")
        explicitMode = "decision";
      const q = matchQuoted(h[2]!.trim());
      if (q) ast.title = q.value;
      i++;
    }
    break;
  }

  // ── Body ──
  let curColumn: ComparisonColumn | null = null;
  let curCriterion: ComparisonCriterion | null = null;
  let colCount = 0;
  let optCount = 0;
  let critCount = 0;
  const bubble = { left: "", right: "", shared: [] as string[], leftOnly: [] as string[], rightOnly: [] as string[] };

  for (; i < rawLines.length; i++) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") continue;
    const lineNo = i + 1;

    // ── Directives ──
    if (/^mode\s*:/i.test(t)) {
      const v = afterColon(t).toLowerCase().replace(/\s+/g, "-");
      const m = normaliseMode(v);
      if (m) explicitMode = m;
      else ast.warnings.push(`Line ${lineNo}: unknown mode "${afterColon(t)}" — using ${explicitMode ?? "inferred"}.`);
      continue;
    }
    if (/^legend\s*:/i.test(t)) {
      const v = afterColon(t).toLowerCase();
      if (v === "on" || v === "off") ast.legend = v;
      continue;
    }
    if (/^baseline\s*:/i.test(t)) {
      const q = matchQuoted(afterColon(t));
      ast.baseline = q ? q.value : afterColon(t);
      continue;
    }
    if (/^(title|subject)\s*:/i.test(t)) {
      const q = matchQuoted(afterColon(t));
      const val = q ? q.value : afterColon(t);
      if (/^subject/i.test(t)) ast.subject = val;
      else if (!ast.title) ast.title = val;
      continue;
    }
    if (/^theme\s*:/i.test(t)) continue; // resolved at render time

    // ── Cell line inside a criterion block: `Option: value` ──
    // Shape-detected (a `name: value` line whose name is not a reserved
    // keyword); the option is then resolved, warning on a typo'd name.
    if (curCriterion) {
      const ref = cellPrefix(t);
      if (ref !== null) {
        const valTok = t.slice(t.indexOf(":") + 1).trim();
        const opt = findOption(ast.options, ref);
        if (!opt) {
          ast.warnings.push(
            `Line ${lineNo}: "${ref}" is not a declared option — add \`option "${ref}"\` or fix the name.`
          );
        } else {
          curCriterion.cells[opt.id] = parseCellValue(valTok);
        }
        continue;
      }
    }

    // ── Keyword lines ──
    const kw = /^([a-z][a-z-]*)\b/i.exec(t);
    const keyword = kw ? kw[1]!.toLowerCase() : "";
    const rest = kw ? t.slice(kw[0].length).trim() : t;

    switch (keyword) {
      case "column":
      case "col": {
        const label = requireLabel(rest, keyword, lineNo);
        curColumn = { id: `col${++colCount}`, label, items: [] };
        ast.columns.push(curColumn);
        curCriterion = null;
        break;
      }
      case "item": {
        const label = requireLabel(rest, keyword, lineNo);
        if (!curColumn) {
          ast.warnings.push(`Line ${lineNo}: \`item\` before any \`column\` — ignored.`);
        } else curColumn.items.push(label);
        break;
      }
      case "pro": {
        ast.pros.push(requireLabel(rest, keyword, lineNo));
        break;
      }
      case "con": {
        ast.cons.push(requireLabel(rest, keyword, lineNo));
        break;
      }
      case "option":
      case "opt": {
        const label = requireLabel(rest, keyword, lineNo);
        ast.options.push({ id: `o${++optCount}`, label });
        curCriterion = null;
        break;
      }
      case "criterion":
      case "criteria":
      case "row": {
        curCriterion = parseCriterion(rest, `c${++critCount}`, keyword, lineNo, ast.options, ast.warnings, lineNo);
        ast.criteria.push(curCriterion);
        curColumn = null;
        break;
      }
      case "left":
        bubble.left = requireLabel(rest, keyword, lineNo);
        break;
      case "right":
        bubble.right = requireLabel(rest, keyword, lineNo);
        break;
      case "shared":
      case "both":
        bubble.shared.push(requireLabel(rest, keyword, lineNo));
        break;
      case "left-only":
      case "leftonly":
        bubble.leftOnly.push(requireLabel(rest, keyword, lineNo));
        break;
      case "right-only":
      case "rightonly":
        bubble.rightOnly.push(requireLabel(rest, keyword, lineNo));
        break;
      default: {
        // Bare bullet item belongs to the current column (tchart).
        const bullet = /^[-*•]\s+(.*)$/.exec(t);
        if (bullet && curColumn) {
          curColumn.items.push(unquoteLoose(bullet[1]!.trim()));
        } else if (bullet) {
          ast.warnings.push(`Line ${lineNo}: bullet "${truncate(t, 60)}" before any \`column\` — ignored.`);
        } else {
          ast.warnings.push(`Line ${lineNo}: unrecognised line: "${truncate(t, 80)}"`);
        }
      }
    }
  }

  if (bubble.left || bubble.right || bubble.shared.length) {
    ast.bubble = bubble;
  }

  // ── Resolve mode (explicit/header wins, else infer) ──
  ast.mode = explicitMode ?? inferMode(ast);

  validate(ast);
  return ast;
}

// ─── Criterion header parsing ─────────────────────────────────

/**
 * `criterion "Label" weight: 5` or pipe form `criterion "Label" | a | b | c`
 * (positional to declared option order).
 */
function parseCriterion(
  rest: string,
  id: string,
  keyword: string,
  lineNo: number,
  options: ComparisonOption[],
  warnings: string[],
  ln: number
): ComparisonCriterion {
  // Pipe form: split label from positional cell values.
  const pipeIdx = rest.indexOf("|");
  let head = pipeIdx >= 0 ? rest.slice(0, pipeIdx).trim() : rest;
  const cells: Record<string, CellValue> = {};

  // Extract a trailing `weight: N` / `w: N` / `(weight N)` from the head.
  let weight: number | undefined;
  const wm = /\b(?:weight|w)\s*[:=]\s*(\d+(?:\.\d+)?)/i.exec(head);
  if (wm) {
    weight = Number(wm[1]);
    head = head.slice(0, wm.index).trim() + head.slice(wm.index + wm[0].length).trim();
    head = head.trim();
  }

  const label = requireLabel(head, keyword, lineNo);

  if (pipeIdx >= 0) {
    const parts = rest
      .slice(pipeIdx + 1)
      .split("|")
      .map((p) => p.trim());
    parts.forEach((p, k) => {
      const opt = options[k];
      if (!opt) {
        if (p) warnings.push(`Line ${ln}: pipe value "${p}" has no matching option (only ${options.length} declared).`);
        return;
      }
      if (p) cells[opt.id] = parseCellValue(p);
    });
  }

  const crit: ComparisonCriterion = { id, label, cells };
  if (weight !== undefined) crit.weight = weight;
  return crit;
}

// ─── Cell value parsing ───────────────────────────────────────

function parseCellValue(tok: string): CellValue {
  const raw = tok;
  const q = matchQuoted(tok);
  if (q) return { text: q.value, raw };
  const low = tok.toLowerCase();
  if (/^(yes|y|true|✓|✔|check)$/.test(low)) return { glyph: "yes", raw };
  if (/^(no|n|false|✗|✘|x|cross)$/.test(low)) return { glyph: "no", raw };
  if (/^(partial|part|~|maybe|some|half)$/.test(low)) return { glyph: "partial", raw };
  if (/^(na|n\/a|-|—|none)$/.test(low)) return { glyph: "na", raw };
  const num = Number(tok);
  if (tok !== "" && !Number.isNaN(num)) return { score: num, raw };
  return { text: tok, raw };
}

// ─── Mode inference ───────────────────────────────────────────

function inferMode(ast: ComparisonAst): ComparisonMode {
  if (ast.bubble) return "double-bubble";
  if (ast.pros.length || ast.cons.length) return "pros-cons";
  if (ast.options.length || ast.criteria.length) {
    const anyScore = ast.criteria.some((c) =>
      Object.values(c.cells).some((v) => typeof v.score === "number")
    );
    const anyWeight = ast.criteria.some((c) => c.weight !== undefined);
    return anyScore || anyWeight || ast.baseline ? "decision" : "matrix";
  }
  return "tchart";
}

function normaliseMode(v: string): ComparisonMode | undefined {
  if (v === "ychart" || v === "y-chart") return "tchart";
  if (v === "proscons" || v === "pro-con" || v === "pros-and-cons") return "pros-cons";
  if (v === "pugh" || v === "decision-matrix") return "decision";
  if (v === "doublebubble" || v === "double-bubble" || v === "compare-contrast") return "double-bubble";
  return (MODES as readonly string[]).includes(v) ? (v as ComparisonMode) : undefined;
}

// ─── Validation ───────────────────────────────────────────────

function validate(ast: ComparisonAst): void {
  switch (ast.mode) {
    case "tchart": {
      if (ast.columns.length === 0) {
        throw new ComparisonParseError(
          `a tchart needs at least one \`column "…"\` — declare the columns you want to compare.`
        );
      }
      break;
    }
    case "pros-cons": {
      if (ast.pros.length === 0 && ast.cons.length === 0) {
        throw new ComparisonParseError(
          `a pros-cons needs at least one \`pro "…"\` or \`con "…"\` line.`
        );
      }
      break;
    }
    case "matrix":
    case "decision": {
      if (ast.options.length === 0) {
        throw new ComparisonParseError(
          `a ${ast.mode} matrix needs at least one \`option "…"\` — declare the options (columns) you are comparing.`
        );
      }
      if (ast.criteria.length === 0) {
        throw new ComparisonParseError(
          `a ${ast.mode} matrix needs at least one \`criterion "…"\` — declare the criteria (rows) to compare on.`
        );
      }
      if (ast.mode === "decision") {
        const anyScore = ast.criteria.some((c) =>
          Object.values(c.cells).some((v) => typeof v.score === "number")
        );
        if (!anyScore) {
          ast.warnings.push(
            `decision mode but no numeric scores found — add \`Option: <number>\` lines under each criterion, or switch to \`mode: matrix\`.`
          );
        }
        if (ast.baseline) {
          const ok = ast.options.some((o) => o.label === ast.baseline || o.id === ast.baseline);
          if (!ok) {
            ast.warnings.push(
              `baseline "${ast.baseline}" is not one of the declared options — ignored.`
            );
            delete ast.baseline;
          }
        }
      }
      break;
    }
    case "double-bubble": {
      if (!ast.bubble || !ast.bubble.left || !ast.bubble.right) {
        throw new ComparisonParseError(
          `a double-bubble needs both a \`left "…"\` and a \`right "…"\` centre to compare.`
        );
      }
      break;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────

const RESERVED_KEYWORDS = new Set([
  "comparison", "compare", "vs", "tchart", "t-chart", "pugh", "decision-matrix", "decisionmatrix",
  "mode", "legend", "baseline", "title", "subject", "theme",
  "column", "col", "item", "pro", "con", "option", "opt",
  "criterion", "criteria", "row",
  "left", "right", "shared", "both", "left-only", "leftonly", "right-only", "rightonly",
]);

/**
 * If `t` is a cell line (`name: value` whose leading word is not a reserved
 * keyword), return the trimmed `name`; otherwise null. Lets a typo'd option
 * name be reported as such rather than swallowed as an unknown line.
 */
function cellPrefix(t: string): string | null {
  const ci = t.indexOf(":");
  if (ci <= 0) return null;
  const pre = t.slice(0, ci).trim();
  if (!pre) return null;
  const firstWord = (pre.split(/\s+/)[0] ?? "").toLowerCase();
  if (RESERVED_KEYWORDS.has(firstWord)) return null;
  return pre;
}

function findOption(options: ComparisonOption[], ref: string): ComparisonOption | undefined {
  const r = ref.toLowerCase();
  return options.find((o) => o.label.toLowerCase() === r || o.id.toLowerCase() === r);
}

function requireLabel(s: string, keyword: string, lineNo: number): string {
  const q = matchQuoted(s);
  if (q) return q.value;
  const bare = s.trim();
  if (!bare) throw new ComparisonParseError(`\`${keyword}\` needs a label`, lineNo);
  return bare;
}

/** Strip surrounding quotes if present, else return as-is (for bullet items). */
function unquoteLoose(s: string): string {
  const q = matchQuoted(s);
  return q && q.length === s.length ? q.value : s;
}

interface Quoted {
  value: string;
  length: number;
}
function matchQuoted(s: string): Quoted | undefined {
  if (!s) return undefined;
  const open = s[0]!;
  if (open !== '"' && open !== "「" && open !== "“" && open !== "『") return undefined;
  const close = closingQuote(open);
  const end = s.indexOf(close, 1);
  if (end < 0) return undefined;
  return { value: s.slice(1, end), length: end + 1 };
}

function closingQuote(open: string): string {
  return open === "「" ? "」" : open === "『" ? "』" : open === "“" ? "”" : '"';
}

function afterColon(s: string): string {
  const i = s.indexOf(":");
  return i < 0 ? "" : s.slice(i + 1).trim();
}

function stripComment(line: string): string {
  let inQ = false;
  let qc = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQ) {
      if (ch === qc) inQ = false;
      continue;
    }
    if (ch === '"' || ch === "「" || ch === "“" || ch === "『") {
      inQ = true;
      qc = closingQuote(ch);
      continue;
    }
    if (ch === "#") return line.slice(0, i);
    if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
  }
  return line;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
