import type {
  PidAST,
  PidAnchor,
  PidDirection,
  PidEquipType,
  PidEquipment,
  PidInstrument,
  PidInstrumentCategory,
  PidLine,
  PidLineType,
} from "./types";

export class PidParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "PidParseError";
  }
}

const EQUIP_TYPES = new Set<PidEquipType>([
  "tank_atm", "tank_cone_roof",
  "vessel_v", "vessel_h", "sphere",
  "column_tray", "column_packed",
  "hx_shell_tube", "hx_air_cooled", "reboiler", "condenser",
  "pump_centrifugal", "pump_pd",
  "compressor", "blower",
  "reactor_cstr", "reactor_pfr",
  "filter", "cyclone", "flare", "cooling_tower",
  "valve_gate", "valve_ball", "valve_globe", "valve_butterfly",
  "valve_check", "valve_control", "valve_psv",
]);

const LINE_TYPES = new Set<PidLineType>([
  "process", "process_minor", "pneumatic", "electric",
  "hydraulic", "capillary", "software", "mechanical",
]);

const INST_CATEGORIES = new Set<PidInstrumentCategory>([
  "field_discrete", "field_shared", "field_computer", "field_plc",
  "cr_discrete", "cr_shared", "cr_computer", "cr_plc",
  "local_discrete", "local_shared",
]);

interface RawLine {
  text: string;
  indent: number;
  line: number;
}

function preprocess(src: string): RawLine[] {
  const out: RawLine[] = [];
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    let stripped = "";
    let inQuote = false;
    for (const ch of raw) {
      if (ch === '"') inQuote = !inQuote;
      if (ch === "#" && !inQuote) break;
      stripped += ch;
    }
    const trimmed = stripped.trim();
    if (!trimmed) continue;
    const indent = stripped.length - stripped.replace(/^\s+/, "").length;
    out.push({ text: trimmed, indent, line: i + 1 });
  }
  return out;
}

function unquote(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    // Handle escaped quotes \" → "
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

function parseAttrList(inside: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let cur = "";
  for (const ch of inside) {
    if (ch === '"') inQuote = !inQuote;
    if (!inQuote && ch === "[") depth++;
    if (!inQuote && ch === "]") depth--;
    if (!inQuote && depth === 0 && ch === ",") {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur);
  for (const p of parts) {
    const idx = p.indexOf(":");
    if (idx < 0) continue;
    const key = p.slice(0, idx).trim();
    const val = unquote(p.slice(idx + 1).trim());
    out[key] = val;
  }
  return out;
}

function extractAttrs(text: string): { rest: string; attrs: Record<string, string> } {
  // Find a trailing [...] (respecting quotes & brackets).
  let depth = 0;
  let inQuote = false;
  let openIdx = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inQuote = !inQuote;
    if (inQuote) continue;
    if (ch === "[") {
      if (depth === 0) openIdx = i;
      depth++;
    } else if (ch === "]") {
      depth--;
      if (depth === 0 && i === text.length - 1) {
        const inside = text.slice(openIdx + 1, i);
        return {
          rest: text.slice(0, openIdx).trim(),
          attrs: parseAttrList(inside),
        };
      }
    }
  }
  return { rest: text, attrs: {} };
}

function parseAnchor(tok: string): PidAnchor {
  const dot = tok.indexOf(".");
  if (dot < 0) return { id: tok };
  return { id: tok.slice(0, dot), port: tok.slice(dot + 1) };
}

function tokenize(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') {
      const end = s.indexOf('"', i + 1);
      if (end < 0) throw new PidParseError(`Unterminated string: ${s}`);
      out.push(s.slice(i, end + 1));
      i = end + 1;
      continue;
    }
    let j = i;
    let bracket = 0;
    while (j < s.length) {
      const c = s[j]!;
      if (c === "[") bracket++;
      else if (c === "]") bracket--;
      else if (bracket === 0 && /\s/.test(c)) break;
      j++;
    }
    out.push(s.slice(i, j));
    i = j;
  }
  return out;
}

export function parsePid(src: string): PidAST {
  const lines = preprocess(src);
  if (lines.length === 0) {
    throw new PidParseError("Empty document");
  }

  const header = lines[0]!;
  if (!/^pid\b/i.test(header.text)) {
    throw new PidParseError(`Expected 'pid' header, got '${header.text}'`, header.line);
  }

  let title: string | undefined;
  let direction: PidDirection = "LR";

  // header: pid "title" [direction: LR]
  const headerRest = header.text.replace(/^pid\b/i, "").trim();
  const { rest, attrs: headerAttrs } = extractAttrs(headerRest);
  if (headerAttrs.direction === "TB") direction = "TB";
  if (headerAttrs.direction === "LR") direction = "LR";
  if (rest) title = unquote(rest);

  const equipment: PidEquipment[] = [];
  const linesAst: PidLine[] = [];
  const instruments: PidInstrument[] = [];

  let lineIdCounter = 0;

  // Track current statement context (e.g. instrument followed by indented `measures`/`controls`).
  let currentInst: PidInstrument | undefined;

  for (let idx = 1; idx < lines.length; idx++) {
    const ln = lines[idx]!;
    const text = ln.text;

    // ── Indented continuation for an instrument ───────────
    const measuresMatch = text.match(/^measures\s+(.+)$/);
    if (measuresMatch && currentInst) {
      currentInst.measures = measuresMatch[1].trim();
      continue;
    }
    const controlsMatch = text.match(/^controls\s+(.+)$/);
    if (controlsMatch && currentInst) {
      currentInst.controls = controlsMatch[1].trim();
      continue;
    }
    // Reset the contextual instrument on any non-continuation line.
    currentInst = undefined;

    // ── equip ID : type [attrs] ───────────────────────────
    const equipMatch = text.match(/^equip\s+([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.+)$/);
    if (equipMatch) {
      const id = equipMatch[1];
      const tail = equipMatch[2];
      const { rest: typeRest, attrs } = extractAttrs(tail);
      const equipType = typeRest.trim() as PidEquipType;
      if (!EQUIP_TYPES.has(equipType)) {
        throw new PidParseError(`Unknown equipment type '${equipType}'`, ln.line);
      }
      equipment.push({
        id,
        equipType,
        tag: attrs.tag ?? id,
        attrs,
      });
      continue;
    }

    // ── line ID from X.port to Y.port [attrs] ─────────────
    const lineMatch = text.match(/^line\s+([A-Za-z0-9_-]+)\s+from\s+(\S+)\s+to\s+(\S+)\s*(.*)$/);
    if (lineMatch) {
      const id = lineMatch[1];
      const fromTok = lineMatch[2];
      const toTok = lineMatch[3];
      const tail = lineMatch[4];
      const { attrs } = extractAttrs(tail);
      const lt = (attrs.type ?? "process") as PidLineType;
      if (!LINE_TYPES.has(lt)) {
        throw new PidParseError(`Unknown line type '${lt}'`, ln.line);
      }
      linesAst.push({
        id,
        from: parseAnchor(fromTok),
        to: parseAnchor(toTok),
        lineType: lt,
        tag: attrs.tag,
        size: attrs.size,
        service: attrs.service,
        attrs,
      });
      lineIdCounter += 1;
      continue;
    }

    // ── inst TAG : category [attrs] ───────────────────────
    const instMatch = text.match(/^inst\s+([A-Z][A-Z0-9]*-[A-Za-z0-9]+)\s*:\s*(.+)$/);
    if (instMatch) {
      const tag = instMatch[1];
      const { rest: catRest, attrs } = extractAttrs(instMatch[2]);
      const category = catRest.trim() as PidInstrumentCategory;
      if (!INST_CATEGORIES.has(category)) {
        throw new PidParseError(`Unknown instrument category '${category}'`, ln.line);
      }
      const inst: PidInstrument = {
        tag,
        category,
        attrs,
      };
      instruments.push(inst);
      currentInst = inst;
      continue;
    }

    throw new PidParseError(`Unparseable line: ${text}`, ln.line);
  }

  // Strip unused id counter — it's just there to silence linter's unused-var.
  void lineIdCounter;
  void tokenize;

  return {
    type: "pid",
    title,
    direction,
    equipment,
    lines: linesAst,
    instruments,
  };
}
