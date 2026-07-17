import type { SchematexDiagnostic } from "./diagnostics";
import type { SceneItem, SourceRange } from "./types";
import { QUOTE_PAIRS } from "./quotes";

export type PositionEditMode = SceneItem["editable"]["position"];

export type SceneEditTarget =
  | SceneItem
  | { sourceRange: SourceRange }
  | { key: string; scene: SceneItem[] };

export interface SourceEditResult {
  source: string;
  diagnostics: SchematexDiagnostic[];
}

interface SourceLine {
  index: number;
  start: number;
  contentEnd: number;
  end: number;
  text: string;
}

interface MachineSection {
  name: string;
  start: number;
  end: number;
  lines: SourceLine[];
  raw: string;
}

export interface ParsedMachineSections {
  body: string;
  pins: Map<string, { x: number; y: number }>;
  diagnostics: SchematexDiagnostic[];
  overrideBlocks: string[];
}

const NUMBER_SOURCE = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
const PIN_RE = new RegExp(`^pin\\s+(?:"((?:\\\\.|[^"\\\\])*)"|(\\S+))\\s+(${NUMBER_SOURCE})\\s*,\\s*(${NUMBER_SOURCE})\\s*$`);

function pinId(match: RegExpExecArray): string {
  if (match[1] === undefined) return match[2] ?? "";
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1];
  }
}

function formatPinId(id: string): string {
  return /^[^\s"]+$/.test(id) ? id : quoteLabel(id);
}

function diagnostic(
  code: string,
  message: string,
  options: { line?: number; column?: number; severity?: "error" | "warning" } = {}
): SchematexDiagnostic {
  return {
    severity: options.severity ?? "warning",
    code,
    message,
    line: options.line,
    column: options.column,
    fatal: false,
  };
}

function scanLines(source: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let start = 0;
  let index = 0;
  while (start <= source.length) {
    const nl = source.indexOf("\n", start);
    const end = nl < 0 ? source.length : nl + 1;
    let contentEnd = nl < 0 ? source.length : nl;
    if (contentEnd > start && source[contentEnd - 1] === "\r") contentEnd--;
    lines.push({
      index,
      start,
      contentEnd,
      end,
      text: source.slice(start, contentEnd),
    });
    index++;
    if (nl < 0) break;
    start = nl + 1;
  }
  return lines;
}

function machineSections(source: string): MachineSection[] {
  const lines = scanLines(source);
  const sections: MachineSection[] = [];
  for (let i = 0; i < lines.length; i++) {
    const header = lines[i]!;
    const match = /^@([A-Za-z][\w-]*)\s*$/.exec(header.text.trim());
    if (!match) continue;
    let j = i + 1;
    while (j < lines.length && !/^@[A-Za-z][\w-]*\s*$/.test(lines[j]!.text.trim())) j++;
    const end = j < lines.length ? lines[j]!.start : source.length;
    sections.push({
      name: match[1]!.toLowerCase(),
      start: header.start,
      end,
      lines: lines.slice(i + 1, j),
      raw: source.slice(header.start, end),
    });
    i = j - 1;
  }
  return sections;
}

function blankRanges(source: string, ranges: Array<{ start: number; end: number }>): string {
  if (ranges.length === 0) return source;
  const chars = source.split("");
  for (const range of ranges) {
    for (let i = range.start; i < range.end; i++) {
      const ch = chars[i];
      if (ch !== "\n" && ch !== "\r") chars[i] = " ";
    }
  }
  return chars.join("");
}

/** Parse and blank cross-cutting machine sections without changing offsets. */
export function parseMachineSections(source: string): ParsedMachineSections {
  const sections = machineSections(source);
  const machine = sections.filter((section) =>
    section.name === "overrides" || section.name === "annotations"
  );
  const pins = new Map<string, { x: number; y: number }>();
  const diagnostics: SchematexDiagnostic[] = [];
  const overrideBlocks: string[] = [];

  for (const section of machine) {
    if (section.name !== "overrides") continue;
    overrideBlocks.push(section.raw);
    for (const line of section.lines) {
      const trimmed = line.text.trim();
      if (trimmed === "" || trimmed.startsWith("%%")) continue;
      const match = PIN_RE.exec(trimmed);
      if (!match) {
        diagnostics.push(diagnostic(
          "PIN_INVALID",
          `Ignored malformed @overrides line: ${JSON.stringify(trimmed)}`,
          { line: line.index + 1, column: 1 }
        ));
        continue;
      }
      const id = pinId(match);
      const value = { x: Number(match[3]), y: Number(match[4]) };
      if (pins.has(id)) {
        diagnostics.push(diagnostic(
          "PIN_DUPLICATE",
          `Duplicate pin for ${JSON.stringify(id)}; the last value wins.`,
          { line: line.index + 1, column: 1 }
        ));
      }
      pins.set(id, value);
    }
  }

  return {
    body: blankRanges(source, machine),
    pins,
    diagnostics,
    overrideBlocks,
  };
}

function resolveTarget(target: SceneEditTarget): SceneItem | { sourceRange: SourceRange } | undefined {
  if ("scene" in target) return target.scene.find((item) => item.key === target.key);
  return target;
}

function quoteLabel(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function encodeLabel(source: string, range: SourceRange, text: string): string {
  const current = source.slice(range.start, range.end);
  const quoted =
    current.length >= 2 && QUOTE_PAIRS[current[0]!] === current[current.length - 1];
  const opener = source[range.start - 1];
  const closer = source[range.end];
  const unsafeCloser = closer !== undefined && text.includes(closer);
  const needsQuote =
    quoted ||
    unsafeCloser ||
    text.includes('"') ||
    text.includes("\\") ||
    text.includes("%%") ||
    text.trim() !== text ||
    (opener === "|" && text.includes("|"));
  return needsQuote ? quoteLabel(text) : text;
}

/** Deterministically replace one parser-produced label range. */
export function setLabel(
  source: string,
  target: SceneEditTarget,
  newText: string
): SourceEditResult {
  if (newText.includes("\n") || newText.includes("\r")) {
    return {
      source,
      diagnostics: [diagnostic("EDIT_MULTILINE_LABEL", "Labels cannot contain source newlines.")],
    };
  }
  const resolved = resolveTarget(target);
  if (!resolved || ("editable" in resolved && !resolved.editable.label)) {
    return {
      source,
      diagnostics: [diagnostic("EDIT_LABEL_UNAVAILABLE", "This scene item has no deterministic label edit range.")],
    };
  }
  const range = resolved.sourceRange;
  if (!range || range.start < 0 || range.end < range.start || range.end > source.length) {
    return {
      source,
      diagnostics: [diagnostic("EDIT_RANGE_INVALID", "The label source range is missing or stale.")],
    };
  }
  if (
    "labelWrite" in resolved &&
    resolved.labelWrite === "identifier" &&
    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(newText)
  ) {
    return {
      source,
      diagnostics: [diagnostic(
        "EDIT_IDENTIFIER_INVALID",
        "Identifiers must start with a letter or underscore and contain only letters, numbers, or underscores."
      )],
    };
  }
  const ranges = "labelSourceRanges" in resolved && resolved.labelSourceRanges?.length
    ? resolved.labelSourceRanges
    : [range];
  if (ranges.some((entry) => entry.start < 0 || entry.end < entry.start || entry.end > source.length)) {
    return {
      source,
      diagnostics: [diagnostic("EDIT_RANGE_INVALID", "One or more label source ranges are missing or stale.")],
    };
  }
  const encodedFor = (entry: SourceRange): string =>
    "labelWrite" in resolved && resolved.labelWrite === "newick-bare"
      ? /^[^\s():,;[\]']+$/.test(newText)
        ? newText
        : `'${newText.replace(/'/g, "''")}'`
      : "labelWrite" in resolved && resolved.labelWrite === "newick-quoted"
        ? newText.replace(/'/g, "''")
        : "labelWrite" in resolved && (resolved.labelWrite === "verbatim" || resolved.labelWrite === "identifier")
          ? newText
          : encodeLabel(source, entry, newText);
  const next = [...ranges]
    .sort((a, b) => b.start - a.start)
    .reduce((text, entry) =>
      text.slice(0, entry.start) + encodedFor(entry) + text.slice(entry.end), source);
  return {
    source: next,
    diagnostics: [],
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

function formatTimelineDate(
  value: number,
  raw: string,
  precision: "day" | "month" | "year" | "ma"
): string {
  if (precision === "ma") {
    const match = /\b(Ma|Ga|ka)\b/i.exec(raw);
    const unit = match?.[1] ?? "Ma";
    const multiplier = unit.toLowerCase() === "ga" ? 1e9 : unit.toLowerCase() === "ka" ? 1e3 : 1e6;
    return `${formatNumber((1970 - value) / multiplier)}${unit}`;
  }
  if (precision === "year") {
    const year = Math.round(value);
    const suffix = /(BCE|BC)\s*$/i.exec(raw)?.[1];
    return suffix && year < 0 ? `${Math.abs(year)}${suffix}` : String(year);
  }
  const year = Math.floor(value);
  const fraction = clamp(value - year, 0, 0.999999);
  if (precision === "month") {
    const month = clamp(Math.round(fraction * 12) + 1, 1, 12);
    if (/Q[1-4]\s*$/i.test(raw)) return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  const dayIndex = clamp(Math.round(fraction * daysInYear(year)), 0, daysInYear(year) - 1);
  const date = new Date(Date.UTC(year, 0, 1 + dayIndex));
  const actualYear = date.getUTCFullYear();
  return `${actualYear}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function expandTimingWave(wave: string): string[] {
  const result: string[] = [];
  let previous = "x";
  for (const char of wave) {
    const effective = char === "." ? previous : char;
    result.push(effective);
    previous = effective;
  }
  return result;
}

function breadboardRowIndex(row: string | undefined): number {
  return Math.max(0, "abcdefghij".indexOf((row ?? "a").toLowerCase()));
}

function formatBreadboardCoord(coord: {
  kind: "hole" | "rail";
  col: number;
  row?: string;
  rail?: string;
}): string {
  return coord.kind === "rail" ? `${coord.rail ?? "+t"}${coord.col}` : `${coord.col}${coord.row ?? "a"}`;
}

/** Write or update one delta-only pin in the explicit @overrides block. */
export function setPosition(
  source: string,
  target: SceneEditTarget,
  pos: { x: number; y: number }
): SourceEditResult {
  const resolved = resolveTarget(target);
  if (!resolved || !("editable" in resolved) || resolved.editable.position === "none") {
    return {
      source,
      diagnostics: [diagnostic("EDIT_POSITION_UNAVAILABLE", "This scene item does not support position edits.")],
    };
  }
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
    return {
      source,
      diagnostics: [diagnostic("EDIT_POSITION_INVALID", "Finite coordinates are required.")],
    };
  }

  if (resolved.positionSource && resolved.bbox) {
    const edit = resolved.positionSource;
    const range = edit.range;
    if (range.start < 0 || range.end < range.start || range.end > source.length) {
      return {
        source,
        diagnostics: [diagnostic("EDIT_RANGE_INVALID", "The position source range is missing or stale.")],
      };
    }
    const dx = pos.x - resolved.bbox.x;
    const dy = pos.y - resolved.bbox.y;
    let replacement: string;
    if (edit.kind === "source-block") {
      const shift = Math.round(dy / edit.step);
      const target = clamp(edit.index + shift, 0, edit.blocks.length - 1);
      if (target === edit.index) return { source, diagnostics: [] };
      let moving = source.slice(edit.range.start, edit.range.end);
      const without = source.slice(0, edit.range.start) + source.slice(edit.range.end);
      const targetBlock = edit.blocks[target]!;
      let insertAt = target < edit.index ? targetBlock.start : targetBlock.end;
      if (insertAt > edit.range.end) insertAt -= edit.range.end - edit.range.start;
      const before = without.slice(0, insertAt);
      const after = without.slice(insertAt);
      if (before && moving && !/[\r\n]$/.test(before) && !/^[\r\n]/.test(moving)) {
        moving = `\n${moving}`;
      }
      if (moving && after && !/[\r\n]$/.test(moving) && !/^[\r\n]/.test(after)) {
        moving += "\n";
      }
      return {
        source: before + moving + after,
        diagnostics: [],
      };
    } else if (edit.kind === "scalar") {
      const next = clamp(edit.value + dx * edit.unitsPerSvgX, edit.min ?? -Infinity, edit.max ?? Infinity);
      replacement = `${edit.prefix ?? ""}${formatNumber(next)}${edit.suffix ?? ""}`;
    } else if (edit.kind === "size") {
      const nextWidth = edit.axis === "y"
        ? edit.width
        : Math.max(edit.minWidth ?? 0.1, edit.width + dx * edit.unitsPerSvgX);
      const nextHeight = edit.axis === "x"
        ? edit.height
        : Math.max(edit.minHeight ?? 0.1, edit.height + dy * edit.unitsPerSvgY);
      replacement = `${formatNumber(nextWidth)}x${formatNumber(nextHeight)}`;
    } else if (edit.kind === "date") {
      replacement = formatTimelineDate(
        edit.value + dx * edit.unitsPerSvgX,
        edit.raw,
        edit.precision,
      );
    } else if (edit.kind === "wave-boundary") {
      const states = expandTimingWave(edit.wave);
      const nextBoundary = clamp(
        edit.boundary + Math.round(dx / edit.periodWidth),
        edit.runStart + 1,
        edit.runEnd - 1,
      );
      const left = states[edit.boundary - 1] ?? "x";
      const right = states[edit.boundary] ?? left;
      for (let i = edit.runStart; i < nextBoundary; i++) states[i] = left;
      for (let i = nextBoundary; i < edit.runEnd; i++) states[i] = right;
      replacement = states.join("");
    } else if (edit.kind === "breadboard") {
      const anchorX = edit.anchorSvgX + dx;
      const anchorY = edit.anchorSvgY + dy;
      const nextFrom = { ...edit.from };
      let colDelta = Math.round((anchorX - edit.gridX0) / edit.pitch) + 1 - edit.from.col;
      if (edit.to) {
        colDelta = clamp(colDelta, 1 - Math.min(edit.from.col, edit.to.col), edit.cols - Math.max(edit.from.col, edit.to.col));
      } else {
        colDelta = clamp(colDelta, 1 - edit.from.col, edit.cols - edit.from.col);
      }
      nextFrom.col += colDelta;
      let rowDelta = 0;
      if (edit.from.kind === "hole") {
        let nearest = 0;
        let distance = Infinity;
        edit.holeRowYs.forEach((rowY, index) => {
          const d = Math.abs(anchorY - rowY);
          if (d < distance) {
            distance = d;
            nearest = index;
          }
        });
        const fromRow = breadboardRowIndex(edit.from.row);
        rowDelta = nearest - fromRow;
        if (edit.to?.kind === "hole") {
          const toRow = breadboardRowIndex(edit.to.row);
          rowDelta = clamp(rowDelta, -Math.min(fromRow, toRow), 9 - Math.max(fromRow, toRow));
        } else {
          rowDelta = clamp(rowDelta, -fromRow, 9 - fromRow);
        }
        nextFrom.row = "abcdefghij"[fromRow + rowDelta];
      } else {
        const railEntries = Object.entries(edit.railRowYs);
        const nearest = railEntries.reduce((best, entry) =>
          Math.abs(entry[1] - anchorY) < Math.abs(best[1] - anchorY) ? entry : best,
          railEntries[0] ?? [edit.from.rail ?? "+t", anchorY],
        );
        nextFrom.rail = nearest[0];
      }
      const nextTo = edit.to
        ? {
            ...edit.to,
            col: edit.to.col + colDelta,
            ...(edit.to.kind === "hole"
              ? { row: "abcdefghij"[breadboardRowIndex(edit.to.row) + rowDelta] }
              : edit.from.kind === "rail" ? { rail: nextFrom.rail } : {}),
          }
        : undefined;
      replacement = `@${formatBreadboardCoord(nextFrom)}${nextTo ? `..${formatBreadboardCoord(nextTo)}` : ""}`;
    } else {
      const nextX = edit.x + dx * edit.unitsPerSvgX;
      const nextY = edit.y + dy * edit.unitsPerSvgY;
      replacement = `${edit.prefix ?? ""}${formatNumber(nextX)},${formatNumber(nextY)}${edit.suffix ?? ""}`;
    }
    return {
      source: source.slice(0, range.start) + replacement + source.slice(range.end),
      diagnostics: [],
    };
  }

  if (!resolved.semanticId) {
    return {
      source,
      diagnostics: [diagnostic("EDIT_POSITION_INVALID", "A stable semantic id or native position range is required.")],
    };
  }

  const sections = machineSections(source).filter((section) => section.name === "overrides");
  const lineText = `pin ${formatPinId(resolved.semanticId)} ${formatNumber(pos.x)},${formatNumber(pos.y)}`;
  if (sections.length === 0) {
    const separator = source.length === 0 || source.endsWith("\n") ? "" : "\n";
    return { source: `${source}${separator}\n@overrides\n${lineText}`, diagnostics: [] };
  }

  const section = sections[sections.length - 1]!;
  const matching = section.lines.filter((line) => {
    const match = PIN_RE.exec(line.text.trim());
    return match ? pinId(match) === resolved.semanticId : false;
  });
  if (matching.length === 0) {
    const insertAt = section.end;
    const needsNewline = insertAt > 0 && source[insertAt - 1] !== "\n";
    const insertion = `${needsNewline ? "\n" : ""}${lineText}\n`;
    return {
      source: source.slice(0, insertAt) + insertion + source.slice(insertAt),
      diagnostics: [],
    };
  }

  const keep = matching[matching.length - 1]!;
  let next = source.slice(0, keep.start) + lineText + source.slice(keep.contentEnd);
  for (let i = matching.length - 2; i >= 0; i--) {
    const line = matching[i]!;
    next = next.slice(0, line.start) + next.slice(line.end);
  }
  return { source: next, diagnostics: [] };
}

export function stripPins(source: string): SourceEditResult & { block: string } {
  const sections = machineSections(source).filter((section) => section.name === "overrides");
  let next = source;
  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i]!;
    next = next.slice(0, section.start) + next.slice(section.end);
  }
  return {
    source: next.replace(/\n{3,}/g, "\n\n").replace(/\n+$/, ""),
    block: sections.map((section) => section.raw.trimEnd()).join("\n"),
    diagnostics: [],
  };
}

export function reattachPins(source: string, block: string): SourceEditResult {
  if (block.trim() === "") return { source, diagnostics: [] };
  const clean = stripPins(source).source;
  const normalized = block.trim().startsWith("@overrides")
    ? block.trim()
    : `@overrides\n${block.trim()}`;
  const separator = clean.length === 0 || clean.endsWith("\n") ? "" : "\n";
  return { source: `${clean}${separator}\n${normalized}`, diagnostics: [] };
}

export function prunePins(source: string, scene: SceneItem[]): SourceEditResult {
  const valid = new Set(scene.flatMap((item) => item.semanticId ? [item.semanticId] : []));
  const sections = machineSections(source).filter((section) => section.name === "overrides");
  const removals: SourceLine[] = [];
  const diagnostics: SchematexDiagnostic[] = [];
  for (const section of sections) {
    for (const line of section.lines) {
      const match = PIN_RE.exec(line.text.trim());
      if (!match || valid.has(pinId(match))) continue;
      removals.push(line);
      diagnostics.push(diagnostic("PIN_PRUNED", `Removed pin for missing id ${JSON.stringify(pinId(match))}.`, {
        line: line.index + 1,
        column: 1,
      }));
    }
  }
  let next = source;
  for (let i = removals.length - 1; i >= 0; i--) {
    const line = removals[i]!;
    next = next.slice(0, line.start) + next.slice(line.end);
  }
  return { source: next, diagnostics };
}

/** Apply authored bbox-top-left pins without coupling core to one layout type. */
export function applyPins<T extends { x: number; y: number }>(
  items: T[],
  pins: Map<string, { x: number; y: number }> | undefined,
  options: {
    id: (item: T) => string;
    position: (item: T) => PositionEditMode;
  }
): void {
  if (!pins || pins.size === 0) return;
  for (const item of items) {
    const pin = pins.get(options.id(item));
    if (!pin) continue;
    const mode = options.position(item);
    if (mode === "free" || mode === "move-x") item.x = pin.x;
    if (mode === "free" || mode === "move-y") item.y = pin.y;
  }
}
