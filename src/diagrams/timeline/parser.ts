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
import { parseDate, tryParseDate } from "./dates";
import { createSourceLocator } from "../../core/source-range";

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
  start: number;
}

function preprocess(src: string): RawLine[] {
  const out: RawLine[] = [];
  const lines = src.split(/\r?\n/);
  let absoluteStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    const lineStart = absoluteStart;
    absoluteStart += raw.length + (i < lines.length - 1 ? (src[lineStart + raw.length] === "\r" ? 2 : 1) : 0);
    if (!trimmed) continue;
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
    const spaces = raw.length - raw.replace(/^\s+/, "").length;
    out.push({ indent: Math.floor(spaces / 2), text: trimmed, line: i + 1, start: lineStart + raw.indexOf(trimmed) });
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
function splitDateAndBody(s: string, lineNum: number): {
  date: string;
  end?: string;
  body: string;
  dateStart: number;
  dateEnd: number;
  endStart?: number;
  endEnd?: number;
} {
  // Find the unquoted colon that separates row-key from body. Prefer a
  // colon with whitespace on both sides (matching the canonical ` : `
  // separator) — that way ordinal time-of-day keys like `14:30 : "Standup"`
  // stay intact instead of splitting at the colon inside the key. Fall
  // back to the first unquoted colon for back-compat with no-space forms.
  let inQuote = false;
  let colon = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '"') inQuote = !inQuote;
    if (inQuote) continue;
    if (c === ":") {
      const lhsSpace = i === 0 || s[i - 1] === " " || s[i - 1] === "\t";
      const rhsSpace = i === s.length - 1 || s[i + 1] === " " || s[i + 1] === "\t";
      if (lhsSpace && rhsSpace) { colon = i; break; }
    }
  }
  if (colon < 0) {
    // Fallback: first unquoted colon regardless of spacing.
    inQuote = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i]!;
      if (c === '"') inQuote = !inQuote;
      if (inQuote) continue;
      if (c === ":") { colon = i; break; }
    }
  }
  if (colon < 0) throw new TimelineParseError(`Expected ':' after date: ${s}`, lineNum);
  const datePartRaw = s.slice(0, colon);
  const datePart = datePartRaw.trim();
  const datePartOffset = datePartRaw.indexOf(datePart);
  const body = s.slice(colon + 1).trim();

  const token = (start: number, end: number) => {
    const raw = datePart.slice(start, end);
    const value = raw.trim();
    const local = raw.indexOf(value);
    return {
      value,
      start: datePartOffset + start + local,
      end: datePartOffset + start + local + value.length,
    };
  };

  // Detect `..` range
  const dd = datePart.indexOf("..");
  if (dd > 0) {
    const a = token(0, dd);
    const b = token(dd + 2, datePart.length);
    return {
      date: a.value,
      end: b.value,
      body,
      dateStart: a.start,
      dateEnd: a.end,
      endStart: b.start,
      endEnd: b.end,
    };
  }
  // Detect ` - ` (with surrounding whitespace) for range
  const mDash = / - /.exec(datePart);
  if (mDash && mDash.index > 0) {
    const a = token(0, mDash.index);
    const b = token(mDash.index + 3, datePart.length);
    return {
      date: a.value,
      end: b.value,
      body,
      dateStart: a.start,
      dateEnd: a.end,
      endStart: b.start,
      endEnd: b.end,
    };
  }
  const a = token(0, datePart.length);
  return { date: a.value, body, dateStart: a.start, dateEnd: a.end };
}

export function parseTimeline(src: string): TimelineAST {
  const lines = preprocess(src);
  const locator = createSourceLocator(src);
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
  // Shared ordinal counter — incremented whenever a row key fails date
  // parsing and falls back to a string label.
  const ordinal = { index: 0 };

  // ─── header: `timeline "Title"` or `timeline` ───
  const first = lines[0]!;
  if (/^timeline\b/i.test(first.text)) {
    const rest = first.text.replace(/^timeline\b/i, "").trim();
    if (rest) {
      if (rest.startsWith('"')) {
        const [title] = readQuoted(rest, first.line);
        ast.title = title;
        const titleToken = /"[^"]*"/.exec(first.text);
        if (titleToken?.index !== undefined) {
          ast.titleSourceRange = locator.range(
            first.start + titleToken.index,
            first.start + titleToken.index + titleToken[0].length
          );
        }
      } else {
        ast.title = rest;
        const localStart = first.text.indexOf(rest);
        ast.titleSourceRange = locator.range(first.start + localStart, first.start + localStart + rest.length);
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
      const split = splitDateAndBody(rest, L.line);
      const { date, end, body: labelPart } = split;
      if (!end) throw new TimelineParseError(`era requires a date range: ${text}`, L.line);
      const [label] = readQuoted(labelPart, L.line);
      const era: TimelineEra = {
        id: nextId("era"),
        label,
        start: safeParseDate(date, L.line),
        end: safeParseDate(end, L.line),
        startSourceRange: locator.range(L.start + text.indexOf(rest) + split.dateStart, L.start + text.indexOf(rest) + split.dateEnd),
        endSourceRange: locator.range(L.start + text.indexOf(rest) + split.endStart!, L.start + text.indexOf(rest) + split.endEnd!),
        color: props["color"],
      };
      ast.eras.push(era);
      i++;
      continue;
    }

    // `track "Name":` (indented body) OR `section "Name"` / `section Foo` (Mermaid-style, flat).
    const isTrack = /^track\b/i.test(text);
    const isSection = /^section\b/i.test(text);
    if (isTrack || isSection) {
      const keyword = isTrack ? "track" : "section";
      const body = text.replace(new RegExp(`^${keyword}\\s+`, "i"), "");
      let name: string;
      if (body.startsWith('"')) {
        const [n] = readQuoted(body, L.line);
        name = n;
      } else {
        // Bare name (Mermaid-style). Strip trailing colon if present.
        name = body.replace(/:\s*$/, "").trim();
        if (!name) {
          throw new TimelineParseError(`Expected name after '${keyword}'`, L.line);
        }
      }
      const trackId = nextId("track");
      ast.tracks.push({ id: trackId, label: name });
      i++;
      // `track` requires deeper indent for its events; `section` is flat and
      // ends at the next section/track or EOF.
      const baseIndent = L.indent;
      while (i < lines.length) {
        const child = lines[i]!;
        if (child.indent <= baseIndent && /^(section|track)\b/i.test(child.text)) break;
        if (isTrack && child.indent <= baseIndent) break;
        if (/^note\s*:/i.test(child.text)) { i++; continue; }
        const parsed = parseEventLine(child.text, child.line, nextId, ordinal, child.start, locator.range);
        if (!parsed) throw new TimelineParseError(`Unrecognized line in ${keyword}: ${child.text}`, child.line);
        parsed.event.trackId = trackId;
        ast.events.push(parsed.event);
        if (parsed.warning) (ast.warnings ??= []).push(parsed.warning);
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
    const parsed = parseEventLine(text, L.line, nextId, ordinal, L.start, locator.range);
    if (parsed) {
      ast.events.push(parsed.event);
      if (parsed.warning) (ast.warnings ??= []).push(parsed.warning);
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

/**
 * Parse a row key, falling back to ordinal mode when the token is not a
 * recognisable date (e.g. "Phase 1", "Q1 2024", "Spring", non-Latin
 * season names). Ordinal events are positioned in declaration order via
 * a shared counter; the raw key is preserved as the display label.
 */
function parseRowKey(
  raw: string,
  ordinal: { index: number }
): TimelineDate {
  const parsed = tryParseDate(raw);
  if (parsed) return parsed;
  ordinal.index += 1;
  return {
    value: ordinal.index,
    raw,
    precision: "ordinal",
  };
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
  nextId: (p: string) => string,
  ordinal: { index: number },
  sourceStart?: number,
  locate?: (start: number, end: number) => import("../../core/types").SourceRange,
): {
  event: TimelineEvent;
  hasNote: boolean;
  warning?: { line: number; message: string };
} | null {
  const { props, rest } = parseProperties(text, line);
  const split = splitDateAndBody(rest, line);
  const { date, end, body } = split;
  const restOffset = text.indexOf(rest);

  // body forms:
  //   milestone "label"
  //   "label"
  let kind: "point" | "range" | "milestone" = end ? "range" : "point";
  let bodyS = body.trim();
  if (bodyS === "") {
    ordinal.index += 1;
    return {
      event: {
        id: nextId("ev"),
        label: date,
        kind: "point",
        start: {
          value: ordinal.index,
          raw: "",
          precision: "ordinal",
        },
        icon: props["icon"],
        shape: props["shape"] as TimelineEventShape | undefined,
        color: props["color"],
        category: props["category"],
      },
      hasNote: false,
      warning: {
        line,
        message: `Timeline entry "${date}" has no date/value after ':'. Rendered as an undated entry.`,
      },
    };
  }
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
    start: parseRowKey(date, ordinal),
    end: end ? parseRowKey(end, ordinal) : undefined,
    startSourceRange: sourceStart !== undefined && locate
      ? locate(sourceStart + restOffset + split.dateStart, sourceStart + restOffset + split.dateEnd)
      : undefined,
    endSourceRange: end && sourceStart !== undefined && locate && split.endStart !== undefined && split.endEnd !== undefined
      ? locate(sourceStart + restOffset + split.endStart, sourceStart + restOffset + split.endEnd)
      : undefined,
    icon: props["icon"],
    shape: props["shape"] as TimelineEventShape | undefined,
    color: props["color"],
    category: props["category"],
    side,
  };
  return { event: ev, hasNote: false };
}
