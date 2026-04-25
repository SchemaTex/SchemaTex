import type {
  TimelineAST,
  TimelineAxisPosition,
  TimelineDate,
  TimelineEra,
  TimelineEvent,
  TimelineEventShape,
  TimelineOrientation,
  TimelineScale,
  TimelineSide,
  TimelineStyle,
} from "./types";
import { parseDate } from "./dates";

export class TimelineParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number,
    public source?: string
  ) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "TimelineParseError";
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
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
    const spaces = raw.length - raw.replace(/^\s+/, "").length;
    out.push({ indent: Math.floor(spaces / 2), text: trimmed, line: i + 1 });
  }
  return out;
}

// Quoted string reader. Returns [string, rest].
function readQuoted(s: string, lineNum: number): [string, string] {
  const t = s.trimStart();
  if (!t.startsWith('"')) {
    throw new TimelineParseError(`Expected quoted string, got: ${s}`, lineNum);
  }
  const end = t.indexOf('"', 1);
  if (end < 0) throw new TimelineParseError(`Unterminated string: ${s}`, lineNum);
  return [t.slice(1, end), t.slice(end + 1)];
}

// Parse trailing `[k: v, k2: v2]` properties.
function parseProperties(s: string, lineNum: number): { props: Record<string, string>; rest: string } {
  const t = s.trimEnd();
  if (!t.endsWith("]")) return { props: {}, rest: s };
  const open = t.lastIndexOf("[");
  if (open < 0) return { props: {}, rest: s };
  const inner = t.slice(open + 1, -1);
  const props: Record<string, string> = {};
  const parts = splitTopLevel(inner, ",");
  for (const p of parts) {
    const pt = p.trim();
    if (!pt) continue;
    const idx = pt.indexOf(":");
    if (idx < 0) {
      throw new TimelineParseError(`Invalid property (missing ':'): ${pt}`, lineNum);
    }
    const k = pt.slice(0, idx).trim();
    let v = pt.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    props[k] = v;
  }
  return { props, rest: t.slice(0, open).trimEnd() };
}

function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inQuote = false;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === '"') inQuote = !inQuote;
    if (inQuote) continue;
    if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth--;
    else if (ch === sep && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}

/**
 * Split the leading "date" or "date - date" / "date .. date" segment from
 * `label-and-rest`. Returns [dateSegment, rest-after-colon].
 *
 * Tricky bit: a bare BC year is negative (`-753`), so we must distinguish the
 * date-range separator (space-hyphen-space or `..`) from an intra-date minus.
 */
function splitDateAndBody(s: string, lineNum: number): { date: string; end?: string; body: string } {
  // Find unquoted colon that ends the date spec
  let inQuote = false;
  let colon = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '"') inQuote = !inQuote;
    if (inQuote) continue;
    if (c === ":") { colon = i; break; }
  }
  if (colon < 0) throw new TimelineParseError(`Expected ':' after date: ${s}`, lineNum);
  const datePart = s.slice(0, colon).trim();
  const body = s.slice(colon + 1).trim();

  // Detect `..` range
  const dd = datePart.indexOf("..");
  if (dd > 0) {
    return {
      date: datePart.slice(0, dd).trim(),
      end: datePart.slice(dd + 2).trim(),
      body,
    };
  }
  // Detect ` - ` (with surrounding whitespace) for range
  const mDash = / - /.exec(datePart);
  if (mDash && mDash.index > 0) {
    return {
      date: datePart.slice(0, mDash.index).trim(),
      end: datePart.slice(mDash.index + 3).trim(),
      body,
    };
  }
  return { date: datePart, body };
}

export function parseTimeline(src: string): TimelineAST {
  const lines = preprocess(src);
  if (!lines.length) throw new TimelineParseError("Empty timeline");

  const ast: TimelineAST = {
    type: "timeline",
    title: undefined,
    style: "swimlane",
    orientation: "horizontal",
    scale: "proportional",
    axis: "bottom",
    events: [],
    eras: [],
    tracks: [],
  };

  let i = 0;
  let autoId = 0;
  const nextId = (prefix: string) => `${prefix}-${++autoId}`;

  // ─── header: `timeline "Title"` or `timeline` ───
  const first = lines[0]!;
  if (/^timeline\b/i.test(first.text)) {
    const rest = first.text.replace(/^timeline\b/i, "").trim();
    if (rest) {
      if (rest.startsWith('"')) {
        const [title] = readQuoted(rest, first.line);
        ast.title = title;
      } else {
        ast.title = rest;
      }
    }
    i = 1;
  }

  while (i < lines.length) {
    const L = lines[i]!;
    const text = L.text;

    // config:
    if (/^config\s*:/i.test(text)) {
      const body = text.replace(/^config\s*:\s*/i, "");
      const eq = body.indexOf("=");
      if (eq < 0) throw new TimelineParseError(`Expected 'key = value' in config: ${text}`, L.line);
      const k = body.slice(0, eq).trim();
      const v = body.slice(eq + 1).trim();
      applyConfig(ast, k, v, L.line);
      i++;
      continue;
    }

    // era ...
    if (/^era\b/i.test(text)) {
      const body = text.replace(/^era\s+/i, "");
      const { props, rest } = parseProperties(body, L.line);
      const { date, end, body: labelPart } = splitDateAndBody(rest, L.line);
      if (!end) throw new TimelineParseError(`era requires a date range: ${text}`, L.line);
      const [label] = readQuoted(labelPart, L.line);
      const era: TimelineEra = {
        id: nextId("era"),
        label,
        start: safeParseDate(date, L.line),
        end: safeParseDate(end, L.line),
        color: props["color"],
      };
      ast.eras.push(era);
      i++;
      continue;
    }

    // track "Name":
    if (/^track\b/i.test(text)) {
      const body = text.replace(/^track\s+/i, "");
      const [name, restAfter] = readQuoted(body, L.line);
      if (!restAfter.trim().startsWith(":")) {
        throw new TimelineParseError(`Expected ':' after track name`, L.line);
      }
      const trackId = nextId("track");
      ast.tracks.push({ id: trackId, label: name });
      i++;
      // Consume indented events belonging to this track
      while (i < lines.length && lines[i]!.indent > L.indent) {
        const child = lines[i]!;
        // Skip a note: line; it's attached to the preceding event below
        if (/^note\s*:/i.test(child.text)) { i++; continue; }
        const parsed = parseEventLine(child.text, child.line, nextId);
        if (!parsed) throw new TimelineParseError(`Unrecognized line in track: ${child.text}`, child.line);
        parsed.event.trackId = trackId;
        ast.events.push(parsed.event);
        i++;
        if (i < lines.length && /^note\s*:/i.test(lines[i]!.text) && lines[i]!.indent > child.indent) {
          const noteBody = lines[i]!.text.replace(/^note\s*:\s*/i, "");
          const [note] = readQuoted(noteBody, lines[i]!.line);
          parsed.event.note = note;
          i++;
        }
      }
      continue;
    }

    // Otherwise: flat event line
    const parsed = parseEventLine(text, L.line, nextId);
    if (parsed) {
      ast.events.push(parsed.event);
      i++;
      // Optional note block on next line (indented)
      if (i < lines.length && /^note\s*:/i.test(lines[i]!.text) && lines[i]!.indent > L.indent) {
        const noteBody = lines[i]!.text.replace(/^note\s*:\s*/i, "");
        const [note] = readQuoted(noteBody, lines[i]!.line);
        parsed.event.note = note;
        i++;
      }
      continue;
    }

    throw new TimelineParseError(`Unrecognized line: ${text}`, L.line);
  }

  return ast;
}

function safeParseDate(raw: string, line: number): TimelineDate {
  try {
    return parseDate(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TimelineParseError(msg, line);
  }
}

function applyConfig(ast: TimelineAST, k: string, v: string, line: number): void {
  switch (k) {
    case "style": {
      const normalized = v === "gantt-project" ? "gantt" : v;
      if (normalized !== "swimlane" && normalized !== "gantt" && normalized !== "lollipop") {
        throw new TimelineParseError(`Invalid style: ${v}`, line);
      }
      ast.style = normalized as TimelineStyle;
      break;
    }
    case "orientation":
      if (v !== "horizontal" && v !== "vertical") {
        throw new TimelineParseError(`Invalid orientation: ${v}`, line);
      }
      ast.orientation = v as TimelineOrientation;
      break;
    case "scale":
      if (v !== "proportional" && v !== "equidistant" && v !== "log") {
        throw new TimelineParseError(`Invalid scale: ${v}`, line);
      }
      ast.scale = v as TimelineScale;
      break;
    case "axis":
      if (v !== "bottom" && v !== "center") {
        throw new TimelineParseError(`Invalid axis: ${v}`, line);
      }
      ast.axis = v as TimelineAxisPosition;
      break;
    default:
      (ast.metadata ??= {})[k] = v;
  }
}

/**
 * Parse a single event line. Returns `null` if the line isn't an event line
 * (e.g. unknown keyword).
 */
function parseEventLine(
  text: string,
  line: number,
  nextId: (p: string) => string
): { event: TimelineEvent; hasNote: boolean } | null {
  const { props, rest } = parseProperties(text, line);
  const { date, end, body } = splitDateAndBody(rest, line);

  // body forms:
  //   milestone "label"
  //   "label"
  let kind: "point" | "range" | "milestone" = end ? "range" : "point";
  let bodyS = body.trim();
  if (/^milestone\b/i.test(bodyS)) {
    kind = "milestone";
    bodyS = bodyS.replace(/^milestone\s+/i, "");
  }
  if (!bodyS.startsWith('"')) return null;
  const [label] = readQuoted(bodyS, line);

  const sideRaw = props["side"];
  const side: TimelineSide | undefined =
    sideRaw === "above" || sideRaw === "below" ? sideRaw : undefined;

  const ev: TimelineEvent = {
    id: nextId("ev"),
    label,
    kind,
    start: safeParseDate(date, line),
    end: end ? safeParseDate(end, line) : undefined,
    icon: props["icon"],
    shape: props["shape"] as TimelineEventShape | undefined,
    color: props["color"],
    category: props["category"],
    side,
  };
  return { event: ev, hasNote: false };
}
