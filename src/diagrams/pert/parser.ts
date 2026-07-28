/**
 * PERT / CPM DSL parser (recursive descent, hand-written).
 *
 * Grammar: docs/reference/32-PERT-STANDARD.md §7
 *
 *   pert
 *   title: "..."            unit: days|weeks|hours|abstract
 *   direction: LR|TB        layout: network|timescaled
 *   critical-tolerance: 0   show-sentinels: false
 *
 *   task <id> "<label>" duration: <d|O/M/P> [after: <ref-list>] [milestone] [tags: a,b] [class: c]
 *
 * Dependency references: `A`, `A+2`, `A+2d`, `A FS`, `A FS+2d`, `B SS-1`, `I FF`, `G SF+1`.
 */

import type {
  PertAst,
  PertDependency,
  PertDepType,
  PertDirection,
  PertLayoutMode,
  PertTask,
  PertThreePoint,
  PertUnit,
} from "./types";
import { IDENTIFIER_SOURCE, isIdentifier } from "../../core/identifier";

const ATTACHED_DEP_RE = new RegExp(
  `^(${IDENTIFIER_SOURCE})\\+(\\d+(?:\\.\\d+)?)([dwh])?$`,
  "u"
);

export class PertParseError extends Error {
  line?: number;
  constructor(message: string, line?: number) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "PertParseError";
    if (line !== undefined) this.line = line;
  }
}

interface RawLine {
  text: string;
  line: number;
}

const UNIT_SUFFIX: Record<PertUnit, string | null> = {
  days: "d",
  weeks: "w",
  hours: "h",
  abstract: null,
};

/** Normalise smart / CJK quotes to straight ASCII quotes (AI-friendly). */
function normalizeQuotes(s: string): string {
  return s
    .replace(/[“”〝〞＂]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[「」『』]/g, '"');
}

function preprocess(src: string): RawLine[] {
  const out: RawLine[] = [];
  const rows = normalizeQuotes(src).split(/\r?\n/);
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i] ?? "";
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
    // Strip end-of-line comments outside quotes.
    let inQ = false;
    let cut = raw.length;
    for (let j = 0; j < raw.length; j++) {
      const c = raw[j];
      if (c === '"') {
        inQ = !inQ;
        continue;
      }
      if (inQ) continue;
      if (c === "#") {
        cut = j;
        break;
      }
      if (c === "/" && raw[j + 1] === "/") {
        cut = j;
        break;
      }
    }
    const stripped = raw.slice(0, cut).trim();
    if (!stripped) continue;
    out.push({ text: stripped, line: i + 1 });
  }
  return out;
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseNumber(s: string, lineNo: number, what: string): number {
  if (!/^-?\d+(?:\.\d+)?$/.test(s.trim())) {
    throw new PertParseError(`${what} must be a number (got '${s}')`, lineNo);
  }
  return Number(s.trim());
}

// ─── Header ──────────────────────────────────────────────────────

function parseHeaderLine(ln: RawLine, ast: PertAst): boolean {
  const m = ln.text.match(/^([a-zA-Z-]+)\s*:\s*(.+)$/);
  if (!m) return false;
  const key = m[1].toLowerCase();
  const valueRaw = m[2].trim();
  const value = stripQuotes(valueRaw);
  switch (key) {
    case "title":
      ast.title = value;
      return true;
    case "unit": {
      const u = value.toLowerCase();
      if (u !== "days" && u !== "weeks" && u !== "hours" && u !== "abstract") {
        throw new PertParseError(`unit must be days, weeks, hours, or abstract (got '${value}')`, ln.line);
      }
      ast.unit = u as PertUnit;
      return true;
    }
    case "direction": {
      const d = value.toUpperCase();
      if (d !== "LR" && d !== "TB") {
        throw new PertParseError(`direction must be LR or TB (got '${value}')`, ln.line);
      }
      ast.direction = d as PertDirection;
      return true;
    }
    case "layout": {
      const l = value.toLowerCase();
      if (l !== "network" && l !== "timescaled" && l !== "aoa" && l !== "gantt") {
        throw new PertParseError(`layout must be network, timescaled, aoa, or gantt (got '${value}')`, ln.line);
      }
      ast.layout = l as PertLayoutMode;
      return true;
    }
    case "critical-tolerance":
      ast.criticalTolerance = parseNumber(value, ln.line, "critical-tolerance");
      return true;
    case "show-sentinels":
      ast.showSentinels = /^(true|yes|on)$/i.test(value);
      return true;
    case "start":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new PertParseError(`start must be a date 'YYYY-MM-DD' (got '${value}')`, ln.line);
      }
      ast.start = value;
      return true;
    case "calendar": {
      const c = value.toLowerCase();
      if (c !== "continuous" && c !== "5day" && c !== "7day") {
        throw new PertParseError(`calendar must be continuous, 7day, or 5day (got '${value}')`, ln.line);
      }
      ast.calendar = c === "5day" ? "5day" : "continuous";
      return true;
    }
    case "today":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new PertParseError(`today must be a date 'YYYY-MM-DD' (got '${value}')`, ln.line);
      }
      ast.today = value;
      return true;
    default:
      return false;
  }
}

// ─── Duration ────────────────────────────────────────────────────

interface DurationResult {
  duration: number;
  threePoint?: PertThreePoint;
  variance?: number;
}

function parseDuration(raw: string, lineNo: number): DurationResult {
  const s = raw.trim();
  const tri = s.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (tri) {
    const o = Number(tri[1]);
    const m = Number(tri[2]);
    const p = Number(tri[3]);
    if (!(o <= m && m <= p)) {
      throw new PertParseError(`three-point estimate must satisfy O ≤ M ≤ P (got ${o}/${m}/${p})`, lineNo);
    }
    if (o < 0) {
      throw new PertParseError(`three-point optimistic value must be ≥ 0 (got ${o})`, lineNo);
    }
    const te = (o + 4 * m + p) / 6;
    const variance = ((p - o) / 6) ** 2;
    return { duration: te, threePoint: { o, m, p }, variance };
  }
  if (/^\d+(?:\.\d+)?$/.test(s)) {
    return { duration: Number(s) };
  }
  throw new PertParseError(`duration must be a number or three-point 'O/M/P' (got '${raw}')`, lineNo);
}

// ─── Dependency references ───────────────────────────────────────

function parseDepRef(raw: string, unit: PertUnit, lineNo: number): PertDependency {
  const ref = raw.trim();
  if (!ref) throw new PertParseError(`empty predecessor reference`, lineNo);
  const expectedSuffix = UNIT_SUFFIX[unit];

  const checkUnit = (suf: string | undefined): void => {
    if (!suf) return;
    if (expectedSuffix === null) {
      throw new PertParseError(
        `lag unit '${suf}' is not allowed when unit: abstract — drop the suffix in '${ref}'`,
        lineNo,
      );
    }
    if (suf !== expectedSuffix) {
      throw new PertParseError(
        `lag unit '${suf}' does not match the diagram unit '${unit}' in '${ref}'`,
        lineNo,
      );
    }
  };

  // Form 1: <id> <TYPE>[<sign><lag>][<unit>]
  const typed = ref.match(/^(\S+)\s+(FS|SS|FF|SF)\s*([+-]\d+(?:\.\d+)?)?\s*([dwh])?$/i);
  if (typed) {
    checkUnit(typed[4]?.toLowerCase());
    return {
      pred: typed[1],
      type: typed[2].toUpperCase() as PertDepType,
      lag: typed[3] ? Number(typed[3]) : 0,
    };
  }

  // Form 2: <id>+<lag>[<unit>]  (attached FS lag sugar; only '+' to avoid dash-id ambiguity)
  const attached = ref.match(ATTACHED_DEP_RE);
  if (attached) {
    checkUnit(attached[3]?.toLowerCase());
    return { pred: attached[1], type: "FS", lag: Number(attached[2]) };
  }

  // Form 3: bare id (FS, zero lag)
  if (isIdentifier(ref)) {
    return { pred: ref, type: "FS", lag: 0 };
  }

  throw new PertParseError(`cannot parse predecessor reference '${ref}'`, lineNo);
}

// ─── Task line ───────────────────────────────────────────────────

const KEY_RE = /\b(duration|after|tags|class|lane|progress|done)\s*:/gi;

function parseTaskLine(ln: RawLine, ast: PertAst): void {
  const head = ln.text.match(/^task\s+(\S+)\s*(.*)$/i);
  if (!head) {
    throw new PertParseError(`malformed task line: ${ln.text}`, ln.line);
  }
  const id = head[1];
  if (!isIdentifier(id)) {
    throw new PertParseError(`invalid task id '${id}' (Unicode letters/digits, dashes, underscores; must start with a letter, digit, or _)`, ln.line);
  }
  let rest = head[2].trim();

  // Extract a quoted label if present at the start.
  let label = id;
  if (rest.startsWith('"') || rest.startsWith("'")) {
    const q = rest[0];
    const end = rest.indexOf(q, 1);
    if (end < 0) throw new PertParseError(`unterminated label string in task '${id}'`, ln.line);
    label = rest.slice(1, end);
    rest = rest.slice(end + 1).trim();
  } else {
    // Bare token label only if the next token is not a known key/flag.
    const firstTok = rest.split(/\s+/)[0] ?? "";
    if (firstTok && !/^(duration|after|tags|class)\s*:/i.test(firstTok) && !/^milestone$/i.test(firstTok)) {
      label = firstTok;
      rest = rest.slice(firstTok.length).trim();
    }
  }

  // Pull out the standalone `milestone` flag.
  let milestone = false;
  rest = rest.replace(/\bmilestone\b/i, () => {
    milestone = true;
    return "";
  }).trim();

  // Split remaining attributes by key markers.
  const markers: { key: string; start: number; valStart: number }[] = [];
  KEY_RE.lastIndex = 0;
  let mm: RegExpExecArray | null;
  while ((mm = KEY_RE.exec(rest)) !== null) {
    markers.push({ key: mm[1].toLowerCase(), start: mm.index, valStart: mm.index + mm[0].length });
  }

  const values: Record<string, string> = {};
  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i];
    const nextStart = i + 1 < markers.length ? markers[i + 1].start : rest.length;
    const val = rest.slice(cur.valStart, nextStart).trim();
    if (cur.key in values) {
      throw new PertParseError(`duplicate '${cur.key}:' on task '${id}'`, ln.line);
    }
    values[cur.key] = val;
  }
  // Anything before the first marker that isn't whitespace is unexpected.
  const preamble = (markers.length ? rest.slice(0, markers[0].start) : rest).trim();
  if (preamble) {
    throw new PertParseError(`unexpected text '${preamble}' in task '${id}'`, ln.line);
  }

  let duration = 0;
  let threePoint: PertThreePoint | undefined;
  let variance: number | undefined;
  if (values.duration !== undefined) {
    const d = parseDuration(values.duration, ln.line);
    duration = d.duration;
    threePoint = d.threePoint;
    variance = d.variance;
  } else if (!milestone) {
    throw new PertParseError(`task '${id}' is missing 'duration:' (or mark it 'milestone')`, ln.line);
  }
  if (duration === 0) milestone = true; // diamond when either marker present (§15 Q7)

  const deps: PertDependency[] = [];
  if (values.after !== undefined && values.after !== "") {
    for (const part of values.after.split(",").map((p) => p.trim()).filter(Boolean)) {
      const dep = parseDepRef(part, ast.unit, ln.line);
      if (dep.pred === id) {
        throw new PertParseError(`task '${id}' cannot depend on itself`, ln.line);
      }
      deps.push(dep);
    }
  }

  const tags = values.tags
    ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const className = values.class ? values.class.trim() : undefined;
  const lane = values.lane ? stripQuotes(values.lane) : undefined;

  const progressRaw = values.progress ?? values.done;
  let progress: number | undefined;
  if (progressRaw !== undefined && progressRaw !== "") {
    const pct = progressRaw.trim().replace(/%$/, "");
    const n = parseNumber(pct, ln.line, "progress");
    progress = Math.max(0, Math.min(100, n));
  }

  const task: PertTask = {
    id,
    label,
    duration,
    milestone,
    deps,
    tags,
    line: ln.line,
  };
  if (threePoint) task.threePoint = threePoint;
  if (variance !== undefined) task.variance = variance;
  if (className) task.className = className;
  if (lane) task.lane = lane;
  if (progress !== undefined) task.progress = progress;
  ast.tasks.push(task);
}

// ─── Driver ──────────────────────────────────────────────────────

export function parsePert(src: string): PertAst {
  const ast: PertAst = {
    type: "pert",
    unit: "days",
    direction: "LR",
    layout: "network",
    criticalTolerance: 0,
    showSentinels: false,
    calendar: "continuous",
    tasks: [],
    warnings: [],
  };

  const lines = preprocess(src);
  if (lines.length === 0) {
    throw new PertParseError("empty document — expected 'pert' or 'gantt' header", 1);
  }
  const first = lines[0];
  if (!/^(pert|gantt)\b/i.test(first.text)) {
    throw new PertParseError(`first non-comment line must start with 'pert' or 'gantt' (got: ${first.text})`, first.line);
  }
  // The `gantt` header keyword is sugar for `pert` + `layout: gantt`.
  const isGanttHeader = /^gantt\b/i.test(first.text);
  if (isGanttHeader) ast.layout = "gantt";
  const inlineTitle = first.text.replace(/^(pert|gantt)\b/i, "").trim();
  if (inlineTitle) {
    const m = inlineTitle.match(/^"([^"]+)"$/) || inlineTitle.match(/^'([^']+)'$/);
    if (m) ast.title = m[1];
  }

  let unitSeen = false;
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i];
    if (/^task\b/i.test(ln.text)) {
      parseTaskLine(ln, ast);
      continue;
    }
    // Track duplicate unit declarations (§7.9).
    if (/^unit\s*:/i.test(ln.text)) {
      if (unitSeen) throw new PertParseError("unit: declared more than once", ln.line);
      unitSeen = true;
    }
    if (parseHeaderLine(ln, ast)) continue;
    throw new PertParseError(`unrecognised statement: ${ln.text}`, ln.line);
  }

  if (ast.tasks.length === 0) {
    throw new PertParseError("no tasks declared", 1);
  }

  // Duplicate-id check + reference resolution (forward refs allowed).
  const ids = new Set<string>();
  for (const t of ast.tasks) {
    if (ids.has(t.id)) {
      throw new PertParseError(`duplicate task id '${t.id}'`, t.line);
    }
    ids.add(t.id);
  }
  for (const t of ast.tasks) {
    for (const dep of t.deps) {
      if (!ids.has(dep.pred)) {
        throw new PertParseError(`task '${t.id}' references undeclared predecessor '${dep.pred}'`, t.line);
      }
    }
  }

  return ast;
}
