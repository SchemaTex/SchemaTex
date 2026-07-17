import type {
  Point,
  SiteplanAst,
  SiteplanCallout,
  SiteplanDimension,
  SiteplanLine,
  SiteplanLineRole,
  SiteplanMarker,
  SiteplanMarkerKind,
  SiteplanPath,
  SiteplanPathRole,
  SiteplanPolygon,
  SiteplanPolygonRole,
  SiteplanUnit,
} from "./types";
import { createSourceLocator } from "../../core/source-range";

export class SiteplanParseError extends Error {
  readonly line: number;
  constructor(message: string, line: number) {
    super(`line ${line}: ${message}`);
    this.name = "SiteplanParseError";
    this.line = line;
  }
}

type Tok = { word: string } | { str: string };

const POLYGON_ROLES: readonly SiteplanPolygonRole[] = ["parcel", "structure", "zone", "landscape", "parking"];
const PATH_ROLES: readonly SiteplanPathRole[] = ["road", "driveway", "walkway", "trail"];
const LINE_ROLES: readonly SiteplanLineRole[] = ["setback", "easement", "fence", "utility", "frontage", "dimension", "boundary"];
const MARKER_KINDS: readonly SiteplanMarkerKind[] = ["tree", "car", "pin", "entry", "hydrant", "well"];

function normalizeQuotes(line: string): string {
  return line.replace(/[“”「」『』]/g, '"').replace(/[‘’]/g, "'");
}

function stripComment(line: string): string {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === "#" && !/^#[0-9a-fA-F]{3,8}\b/.test(line.slice(i))) return line.slice(0, i);
  }
  return line;
}

function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1] !== undefined) out.push({ str: m[1] });
    else out.push({ word: m[2]! });
  }
  return out;
}

const isWord = (t: Tok | undefined, w?: string): t is { word: string } =>
  t !== undefined && "word" in t && (w === undefined || t.word.toLowerCase() === w);
const isStr = (t: Tok | undefined): t is { str: string } => t !== undefined && "str" in t;

function tokenText(t: Tok): string {
  return "word" in t ? t.word : t.str;
}

function shiftStringIfNext(tok: Tok[]): string | undefined {
  const first = tok[0];
  if (!isStr(first)) return undefined;
  tok.shift();
  return first.str;
}

function parseNum(t: Tok | undefined, what: string, line: number): number {
  if (!isWord(t)) throw new SiteplanParseError(`expected a number for ${what}`, line);
  const n = Number(t.word);
  if (!Number.isFinite(n)) throw new SiteplanParseError(`expected a number for ${what}, got "${t.word}"`, line);
  return n;
}

function parsePointToken(t: Tok | undefined, what: string, line: number): Point {
  if (!isWord(t)) throw new SiteplanParseError(`expected "x,y" for ${what}`, line);
  const m = /^(-?\d*\.?\d+),(-?\d*\.?\d+)$/.exec(t.word);
  if (!m) throw new SiteplanParseError(`expected "x,y" for ${what}, got "${t.word}"`, line);
  return { x: Number(m[1]), y: Number(m[2]) };
}

function parseDimsToken(t: Tok | undefined, what: string, line: number): { w: number; h: number } {
  if (!isWord(t)) throw new SiteplanParseError(`expected "WxH" for ${what}`, line);
  const m = /^(\d*\.?\d+)[x×](\d*\.?\d+)$/i.exec(t.word);
  if (!m) throw new SiteplanParseError(`expected "WxH" for ${what}, got "${t.word}"`, line);
  return { w: Number(m[1]), h: Number(m[2]) };
}

function parseId(t: Tok | undefined, what: string, line: number): string {
  if (!isWord(t)) throw new SiteplanParseError(`expected ${what}`, line);
  return t.word;
}

function parsePoints(tok: Tok[], line: number, min = 2): Point[] {
  const points: Point[] = [];
  while (tok.length && isWord(tok[0]) && /^-?\d*\.?\d+,-?\d*\.?\d+$/.test(tok[0].word)) {
    points.push(parsePointToken(tok.shift(), "points", line));
  }
  if (points.length < min) {
    throw new SiteplanParseError(`expected at least ${min} point${min === 1 ? "" : "s"}`, line);
  }
  return points;
}

function parseOptionalLabel(tok: Tok[], obj: { label?: string }): void {
  const label = shiftStringIfNext(tok);
  if (label !== undefined) obj.label = label;
}

function parseHeader(tok: Tok[], ast: SiteplanAst, line: number): void {
  while (tok.length) {
    const t = tok.shift()!;
    if (isStr(t)) ast.title = t.str;
    else if (isWord(t, "unit")) {
      const unit = parseId(tok.shift(), "unit (ft|m)", line).toLowerCase();
      if (unit !== "ft" && unit !== "m") throw new SiteplanParseError(`unit must be "ft" or "m", got "${unit}"`, line);
      ast.unit = unit as SiteplanUnit;
    } else throw new SiteplanParseError(`siteplan: unexpected token "${tokenText(t)}"`, line);
  }
}

function parsePolygon(role: SiteplanPolygonRole, tok: Tok[], line: number): SiteplanPolygon {
  const poly: SiteplanPolygon = { role, id: parseId(tok.shift(), `${role} id`, line), points: [], line };
  parseOptionalLabel(tok, poly);
  if (!isWord(tok.shift(), "points")) throw new SiteplanParseError(`${role}: expected "points"`, line);
  poly.points = parsePoints(tok, line, 3);
  while (tok.length) {
    const t = tok.shift()!;
    if (!isWord(t)) throw new SiteplanParseError(`${role}: unexpected string "${tokenText(t)}"`, line);
    if (t.word === "fill") poly.fill = parseId(tok.shift(), "fill color", line);
    else if (t.word === "label") {
      const label = shiftStringIfNext(tok);
      if (label !== undefined) poly.label = label;
      else throw new SiteplanParseError(`${role}: label expects a quoted string`, line);
    }
    else throw new SiteplanParseError(`${role}: unexpected token "${t.word}"`, line);
  }
  return poly;
}

function parsePath(role: SiteplanPathRole, tok: Tok[], line: number): SiteplanPath {
  const path: SiteplanPath = { role, id: parseId(tok.shift(), `${role} id`, line), points: [], width: role === "road" ? 20 : 8, line };
  parseOptionalLabel(tok, path);
  const head = tok.shift();
  if (isWord(head, "from")) {
    path.points = [parsePointToken(tok.shift(), "from", line)];
    if (!isWord(tok.shift(), "to")) throw new SiteplanParseError(`${role}: expected "to"`, line);
    path.points.push(parsePointToken(tok.shift(), "to", line));
  } else if (isWord(head, "points")) {
    path.points = parsePoints(tok, line, 2);
  } else throw new SiteplanParseError(`${role}: expected "from" or "points"`, line);

  while (tok.length) {
    const t = tok.shift()!;
    if (!isWord(t)) throw new SiteplanParseError(`${role}: unexpected string "${tokenText(t)}"`, line);
    if (t.word === "width") path.width = parseNum(tok.shift(), "width", line);
    else if (t.word === "label") {
      const label = shiftStringIfNext(tok);
      if (label !== undefined) path.label = label;
      else throw new SiteplanParseError(`${role}: label expects a quoted string`, line);
    }
    else throw new SiteplanParseError(`${role}: unexpected token "${t.word}"`, line);
  }
  return path;
}

function parseLine(role: SiteplanLineRole, tok: Tok[], line: number): SiteplanLine {
  const ln: SiteplanLine = { role, id: parseId(tok.shift(), `${role} id`, line), points: [], line };
  parseOptionalLabel(tok, ln);
  const head = tok.shift();
  if (isWord(head, "from")) {
    ln.points = [parsePointToken(tok.shift(), "from", line)];
    if (!isWord(tok.shift(), "to")) throw new SiteplanParseError(`${role}: expected "to"`, line);
    ln.points.push(parsePointToken(tok.shift(), "to", line));
  } else if (isWord(head, "points")) {
    ln.points = parsePoints(tok, line, 2);
  } else throw new SiteplanParseError(`${role}: expected "from" or "points"`, line);

  while (tok.length) {
    const t = tok.shift()!;
    if (!isWord(t)) throw new SiteplanParseError(`${role}: unexpected string "${tokenText(t)}"`, line);
    if (t.word === "label") {
      const label = shiftStringIfNext(tok);
      if (label !== undefined) ln.label = label;
      else throw new SiteplanParseError(`${role}: label expects a quoted string`, line);
    }
    else throw new SiteplanParseError(`${role}: unexpected token "${t.word}"`, line);
  }
  return ln;
}

function parseMarker(kind: SiteplanMarkerKind, tok: Tok[], line: number): SiteplanMarker {
  let id = `${kind}${line}`;
  const first = tok[0];
  if (first && "word" in first && first.word.toLowerCase() !== "at") {
    tok.shift();
    id = first.word;
  }
  const marker: SiteplanMarker = { kind, id, at: { x: 0, y: 0 }, size: kind === "car" ? 16 : 8, rotate: 0, line };
  parseOptionalLabel(tok, marker);
  while (tok.length) {
    const t = tok.shift()!;
    if (!isWord(t)) marker.label = tokenText(t);
    else if (t.word === "at") marker.at = parsePointToken(tok.shift(), "at", line);
    else if (t.word === "size") {
      const next = tok.shift();
      if (isWord(next) && /[x×]/i.test(next.word)) {
        const d = parseDimsToken(next, "size", line);
        marker.size = Math.max(d.w, d.h);
      } else marker.size = parseNum(next, "size", line);
    } else if (t.word === "rotate") marker.rotate = parseNum(tok.shift(), "rotate", line);
    else if (t.word === "label") {
      const label = shiftStringIfNext(tok);
      if (label !== undefined) marker.label = label;
      else throw new SiteplanParseError(`${kind}: label expects a quoted string`, line);
    }
    else throw new SiteplanParseError(`${kind}: unexpected token "${t.word}"`, line);
  }
  return marker;
}

function parseCallout(tok: Tok[], line: number): SiteplanCallout {
  const first = tok.shift();
  if (!isStr(first)) throw new SiteplanParseError(`callout: expected quoted label`, line);
  if (!isWord(tok.shift(), "at")) throw new SiteplanParseError(`callout: expected "at"`, line);
  const at = parsePointToken(tok.shift(), "at", line);
  if (!isWord(tok.shift(), "to")) throw new SiteplanParseError(`callout: expected "to"`, line);
  return { label: first.str, at, to: parsePointToken(tok.shift(), "to", line), line };
}

function parseDimension(tok: Tok[], line: number): SiteplanDimension {
  let label = "";
  label = shiftStringIfNext(tok) ?? label;
  if (!isWord(tok.shift(), "from")) throw new SiteplanParseError(`dimension: expected "from"`, line);
  const from = parsePointToken(tok.shift(), "from", line);
  if (!isWord(tok.shift(), "to")) throw new SiteplanParseError(`dimension: expected "to"`, line);
  const to = parsePointToken(tok.shift(), "to", line);
  while (tok.length) {
    const t = tok.shift()!;
    if (isWord(t, "label")) {
      const next = shiftStringIfNext(tok);
      if (next !== undefined) label = next;
      else throw new SiteplanParseError(`dimension: label expects a quoted string`, line);
    }
    else throw new SiteplanParseError(`dimension: unexpected token`, line);
  }
  return { label, from, to, line };
}

export function parseSiteplan(text: string): SiteplanAst {
  const ast: SiteplanAst = {
    type: "siteplan",
    title: "Site Plan",
    unit: "ft",
    legend: true,
    polygons: [],
    paths: [],
    lines: [],
    markers: [],
    callouts: [],
    dimensions: [],
  };

  const lines = text.split(/\r?\n/);
  const locator = createSourceLocator(text);
  let absoluteStart = 0;
  let sawHeader = false;
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const original = lines[i] ?? "";
    const lineStart = absoluteStart;
    absoluteStart += original.length + (i < lines.length - 1 ? (text[lineStart + original.length] === "\r" ? 2 : 1) : 0);
    const raw = stripComment(normalizeQuotes(original)).trim();
    if (!raw) continue;
    const tok = tokenize(raw);
    const head = tok.shift();
    if (!isWord(head)) throw new SiteplanParseError(`unexpected string at line start`, lineNo);
    const keyword = head.word.toLowerCase();
    if (!sawHeader) {
      if (keyword !== "siteplan" && keyword !== "plotplan" && keyword !== "parcelmap" && keyword !== "propertymap") {
        throw new SiteplanParseError(`expected siteplan header`, lineNo);
      }
      const titleToken = /"[^"]*"/.exec(original);
      if (titleToken?.index !== undefined) {
        ast.titleSourceRange = locator.range(
          lineStart + titleToken.index,
          lineStart + titleToken.index + titleToken[0].length
        );
      }
      parseHeader(tok, ast, lineNo);
      sawHeader = true;
      continue;
    }

    if ((POLYGON_ROLES as readonly string[]).includes(keyword)) {
      const polygon = parsePolygon(keyword as SiteplanPolygonRole, tok, lineNo);
      polygon.pointSourceRanges = coordinateRanges(original, lineStart, locator.range);
      ast.polygons.push(polygon);
    } else if ((PATH_ROLES as readonly string[]).includes(keyword)) {
      const path = parsePath(keyword as SiteplanPathRole, tok, lineNo);
      path.pointSourceRanges = coordinateRanges(original, lineStart, locator.range);
      ast.paths.push(path);
    } else if ((LINE_ROLES as readonly string[]).includes(keyword)) {
      const line = parseLine(keyword as SiteplanLineRole, tok, lineNo);
      line.pointSourceRanges = coordinateRanges(original, lineStart, locator.range);
      ast.lines.push(line);
    } else if ((MARKER_KINDS as readonly string[]).includes(keyword)) {
      const marker = parseMarker(keyword as SiteplanMarkerKind, tok, lineNo);
      marker.atSourceRange = coordinateRanges(original, lineStart, locator.range)[0];
      ast.markers.push(marker);
    } else if (keyword === "callout") {
      const callout = parseCallout(tokenize(raw).slice(1), lineNo);
      [callout.atSourceRange, callout.toSourceRange] = coordinateRanges(original, lineStart, locator.range);
      ast.callouts.push(callout);
    } else if (keyword === "dim" || keyword === "measure") {
      const dimension = parseDimension(tok, lineNo);
      [dimension.fromSourceRange, dimension.toSourceRange] = coordinateRanges(original, lineStart, locator.range);
      ast.dimensions.push(dimension);
    } else if (keyword === "north") {
      ast.north = tok.length ? parseNum(tok.shift(), "north", lineNo) : 0;
    } else if (keyword === "scale") {
      ast.scale = parseNum(tok.shift(), "scale", lineNo);
    } else if (keyword === "legend") {
      const v = parseId(tok.shift(), "legend (on|off)", lineNo).toLowerCase();
      ast.legend = v !== "off";
    } else {
      throw new SiteplanParseError(`unknown siteplan keyword "${keyword}"`, lineNo);
    }
  }

  if (!sawHeader) throw new SiteplanParseError(`missing siteplan header`, 1);
  return ast;
}

function coordinateRanges(
  line: string,
  lineStart: number,
  locate: (start: number, end: number) => import("../../core/types").SourceRange,
): import("../../core/types").SourceRange[] {
  const ranges: import("../../core/types").SourceRange[] = [];
  const re = /-?\d*\.?\d+,-?\d*\.?\d+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) {
    ranges.push(locate(lineStart + match.index, lineStart + match.index + match[0].length));
  }
  return ranges;
}
