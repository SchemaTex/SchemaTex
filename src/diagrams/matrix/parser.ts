import type {
  MatrixAST,
  MatrixPoint,
  MatrixCell,
  MatrixConfig,
  MatrixAxis,
  LabelCollisionMode,
  MatrixTemplate,
} from "./types";
import { resolveTemplate, applyTemplateDefaults } from "./templates";

const TEMPLATE_NAMES: ReadonlySet<string> = new Set([
  "eisenhower",
  "impact-effort",
  "rice",
  "bcg",
  "ansoff",
  "johari",
  "9-box",
  "risk-matrix",
]);

const DEFAULT_CONFIG: MatrixConfig = {
  quadrantBg: true,
  gridLines: true,
  axisArrows: true,
  labelCollision: "auto",
  bubbleScale: "area",
  quadrantAnnotations: true,
  legendPosition: "bottom-right",
  offChartPolicy: "clamp-badge",
  showAxis: "auto",
  margins: false,
};

interface ParseState {
  ast: MatrixAST;
  pointIdSeq: number;
}

function emptyAxis(): MatrixAxis {
  return { low: "", high: "" };
}

function newAST(): MatrixAST {
  return {
    type: "matrix",
    mode: "quadrant",
    grid: "2x2",
    cols: 2,
    rows: 2,
    xAxis: emptyAxis(),
    yAxis: emptyAxis(),
    points: [],
    cells: [],
    cellLabels: [],
    annotations: [],
    config: { ...DEFAULT_CONFIG },
  };
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function readQuoted(line: string, from: number): { text: string; next: number } | null {
  // skip whitespace
  let i = from;
  while (i < line.length && /\s/.test(line[i]!)) i++;
  if (line[i] !== '"' && line[i] !== "'") return null;
  const quote = line[i]!;
  const start = i + 1;
  let end = start;
  while (end < line.length && line[end] !== quote) end++;
  if (end >= line.length) return null;
  return { text: line.slice(start, end), next: end + 1 };
}

function parseAxis(raw: string): MatrixAxis {
  // "Low Effort → High Effort" or "High Market Share ← Low Market Share"
  // or "Low → High" or "Low ↑ High" etc.
  const arrowMatch = raw.match(/\s*(→|↑|->|>|↓|←|<-|<)\s*/);
  if (arrowMatch) {
    const arrow = arrowMatch[1]!;
    const idx = arrowMatch.index!;
    const left = raw.slice(0, idx).trim();
    const right = raw.slice(idx + arrowMatch[0].length).trim();
    const reversed = arrow === "←" || arrow === "<-" || arrow === "<";
    if (reversed) {
      return { low: right, high: left, reversed: true };
    }
    return { low: left, high: right };
  }
  // Plain text: treat as high label, low stays empty
  return { low: "", high: raw.trim() };
}

function parseNumberList(raw: string): string[] {
  // "[A, B, C]" → ["A","B","C"]
  const t = raw.trim();
  const inner = t.startsWith("[") && t.endsWith("]") ? t.slice(1, -1) : t;
  return inner
    .split(",")
    .map((s) => stripQuotes(s.trim()))
    .filter((s) => s.length > 0);
}

function parseProperties(
  raw: string,
  point: MatrixPoint
): void {
  // e.g.  size: 5 category: design  note: "foo"  highlight: true
  let i = 0;
  while (i < raw.length) {
    // skip whitespace
    while (i < raw.length && /\s/.test(raw[i]!)) i++;
    if (i >= raw.length) break;
    // read key
    const keyMatch = raw.slice(i).match(/^([a-zA-Z_-]+)\s*:\s*/);
    if (!keyMatch) break;
    const key = keyMatch[1]!.toLowerCase();
    i += keyMatch[0].length;
    // read value: quoted, number, true/false, or bareword
    if (raw[i] === '"' || raw[i] === "'") {
      const q = readQuoted(raw, i);
      if (!q) break;
      if (key === "note") point.note = q.text;
      else if (key === "label") point.label = q.text;
      i = q.next;
    } else {
      // bareword until whitespace + next "key:"
      const rest = raw.slice(i);
      const endMatch = rest.match(/\s+[a-zA-Z_-]+\s*:/);
      const end = endMatch ? endMatch.index! : rest.length;
      const val = rest.slice(0, end).trim();
      i += end;
      if (key === "size") {
        const n = Number(val);
        if (!Number.isNaN(n)) point.size = n;
      } else if (key === "category") {
        point.category = val;
      } else if (key === "color") {
        point.color = val;
      } else if (key === "shape") {
        if (val === "circle" || val === "square" || val === "triangle" || val === "diamond") {
          point.shape = val;
        }
      } else if (key === "highlight") {
        point.highlight = val === "true" || val === "1";
      }
    }
  }
}

function parsePointLine(line: string, st: ParseState): boolean {
  // `"Label" at (x, y) size: 3 category: infra`
  const q = readQuoted(line, 0);
  if (!q) return false;
  const rest = line.slice(q.next).trim();
  const atMatch = rest.match(/^at\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*(.*)$/);
  if (!atMatch) return false;
  const x = Number(atMatch[1]);
  const y = Number(atMatch[2]);
  const props = atMatch[3]!;
  const offChart = x < 0 || x > 1 || y < 0 || y > 1;
  const clampedX = Math.max(0, Math.min(1, x));
  const clampedY = Math.max(0, Math.min(1, y));
  const point: MatrixPoint = {
    id: `p${st.pointIdSeq++}`,
    label: q.text,
    x: clampedX,
    y: clampedY,
    offChart,
    origX: offChart ? x : undefined,
    origY: offChart ? y : undefined,
  };
  if (props) parseProperties(props, point);
  st.ast.points.push(point);
  return true;
}

function parseCellLine(line: string, st: ParseState): boolean {
  // `cell (i,j) value: 9 label: "foo"`
  const m = line.match(/^cell\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*(.*)$/i);
  if (!m) return false;
  const col = Number(m[1]);
  const row = Number(m[2]);
  const rest = m[3]!;
  const cell: MatrixCell = { col, row };
  const valMatch = rest.match(/value:\s*(-?\d+(?:\.\d+)?)/i);
  if (valMatch) cell.value = Number(valMatch[1]);
  const labMatch = rest.match(/label:\s*"([^"]*)"/i);
  if (labMatch) cell.label = labMatch[1]!;
  const lvlMatch = rest.match(/level:\s*(strong|medium|weak)\b/i);
  if (lvlMatch) {
    const lv = lvlMatch[1]!.toLowerCase() as "strong" | "medium" | "weak";
    cell.level = lv;
    if (cell.value === undefined) cell.value = lv === "strong" ? 3 : lv === "medium" ? 2 : 1;
  }
  st.ast.cells.push(cell);
  if (cell.label) {
    st.ast.cellLabels.push({ col, row, label: cell.label });
  }
  return true;
}

function parseConfigLine(key: string, value: string, ast: MatrixAST): void {
  const k = key.trim().toLowerCase();
  const v = value.trim();
  if (k === "quadrantbg") ast.config.quadrantBg = v === "true";
  else if (k === "gridlines") ast.config.gridLines = v === "true";
  else if (k === "axisarrows") ast.config.axisArrows = v === "true";
  else if (k === "labelcollision") ast.config.labelCollision = v.replace(/"/g, "") as LabelCollisionMode;
  else if (k === "bubblescale") ast.config.bubbleScale = v === "radius" ? "radius" : "area";
  else if (k === "quadrantannotations") ast.config.quadrantAnnotations = v === "true";
  else if (k === "legendposition") {
    const t = v.replace(/"/g, "") as MatrixConfig["legendPosition"];
    ast.config.legendPosition = t;
  } else if (k === "offchartpolicy") {
    const t = v.replace(/"/g, "") as MatrixConfig["offChartPolicy"];
    ast.config.offChartPolicy = t;
  }
}

function parseHeader(line: string, ast: MatrixAST): MatrixTemplate | undefined {
  // `matrix eisenhower "Week"` / `matrix "Title"` / `matrix heatmap 5x5`
  const t = line.trim();
  const rest = t.slice("matrix".length).trim();
  // heatmap NxM
  const heatMatch = rest.match(/^heatmap\s+(\d+)\s*x\s*(\d+)\s*(.*)$/i);
  if (heatMatch) {
    ast.mode = "heatmap";
    ast.grid = "NxM";
    ast.cols = Number(heatMatch[1]);
    ast.rows = Number(heatMatch[2]);
    const title = heatMatch[3]!.trim();
    if (title) ast.title = stripQuotes(title);
    return undefined;
  }
  // correlation [NxM] "title"   — rows/cols come from rows:/cols: directive if not here
  const corrMatch = rest.match(/^correlation\s*(?:(\d+)\s*x\s*(\d+))?\s*(.*)$/i);
  if (corrMatch) {
    ast.mode = "correlation";
    ast.grid = "NxM";
    if (corrMatch[1] && corrMatch[2]) {
      ast.cols = Number(corrMatch[1]);
      ast.rows = Number(corrMatch[2]);
    }
    const title = corrMatch[3]!.trim();
    if (title) ast.title = stripQuotes(title);
    return undefined;
  }
  // template name + optional title
  const tokenMatch = rest.match(/^([a-zA-Z0-9_-]+)\s*(.*)$/);
  if (tokenMatch) {
    const tok = tokenMatch[1]!.toLowerCase();
    const remainder = tokenMatch[2]!.trim();
    if (TEMPLATE_NAMES.has(tok)) {
      if (remainder) ast.title = stripQuotes(remainder);
      return tok as MatrixTemplate;
    }
    // treat as quoted title
    if (rest.startsWith('"') || rest.startsWith("'")) {
      ast.title = stripQuotes(rest);
    } else if (rest.length > 0) {
      ast.title = stripQuotes(rest);
    }
  }
  return undefined;
}

export function parseMatrix(text: string): MatrixAST {
  const st: ParseState = { ast: newAST(), pointIdSeq: 0 };
  const lines = text.split(/\r?\n/);
  let templateName: MatrixTemplate | undefined;
  let inConfig = false;

  for (let raw of lines) {
    // strip trailing comments (but keep # inside quotes)
    let line = raw;
    const hashIdx = findCommentStart(line);
    if (hashIdx >= 0) line = line.slice(0, hashIdx);
    line = line.trim();
    if (!line) {
      inConfig = false;
      continue;
    }

    if (/^matrix\b/i.test(line)) {
      templateName = parseHeader(line, st.ast);
      continue;
    }

    if (/^config\s*:/i.test(line)) {
      inConfig = true;
      continue;
    }

    // config key: value (indented under `config:`)
    if (inConfig) {
      const kv = line.match(/^([a-zA-Z]+)\s*:\s*(.+)$/);
      if (kv) {
        parseConfigLine(kv[1]!, kv[2]!, st.ast);
        continue;
      }
      inConfig = false;
    }

    if (/^title\s*:/i.test(line)) {
      st.ast.title = stripQuotes(line.replace(/^title\s*:\s*/i, ""));
      continue;
    }
    if (/^x-axis\s*:/i.test(line)) {
      st.ast.xAxis = parseAxis(line.replace(/^x-axis\s*:\s*/i, ""));
      continue;
    }
    if (/^y-axis\s*:/i.test(line)) {
      st.ast.yAxis = parseAxis(line.replace(/^y-axis\s*:\s*/i, ""));
      continue;
    }
    if (/^rows\s*:/i.test(line)) {
      st.ast.rowLabels = parseNumberList(line.replace(/^rows\s*:\s*/i, ""));
      if (st.ast.mode !== "quadrant") st.ast.rows = st.ast.rowLabels.length;
      continue;
    }
    if (/^cols\s*:/i.test(line)) {
      st.ast.colLabels = parseNumberList(line.replace(/^cols\s*:\s*/i, ""));
      if (st.ast.mode !== "quadrant") st.ast.cols = st.ast.colLabels.length;
      continue;
    }
    if (/^grid\s*:/i.test(line)) {
      const v = line.replace(/^grid\s*:\s*/i, "").trim().toLowerCase();
      const gm = v.match(/^(\d+)\s*x\s*(\d+)$/);
      if (gm) {
        const c = Number(gm[1]);
        const r = Number(gm[2]);
        st.ast.cols = c;
        st.ast.rows = r;
        if (c === 2 && r === 2) st.ast.grid = "2x2";
        else if (c === 3 && r === 3) st.ast.grid = "3x3";
        else st.ast.grid = "NxM";
      }
      continue;
    }
    if (/^quadrant\s+/i.test(line)) {
      // `quadrant Q1 "Do First" description: "..."`
      const m = line.match(/^quadrant\s+(?:Q)?(\d)\s*"([^"]*)"(.*)$/i);
      if (m) {
        const q = Number(m[1]) as 1 | 2 | 3 | 4;
        const rest = m[3]!.trim();
        const descMatch = rest.match(/description:\s*"([^"]*)"/i);
        const description = descMatch ? descMatch[1]! : undefined;
        if (q >= 1 && q <= 4) {
          const existing = st.ast.annotations.find((a) => a.q === q);
          if (existing) {
            existing.label = m[2]!;
            if (description) existing.description = description;
          } else {
            st.ast.annotations.push({ q, label: m[2]!, description });
          }
        }
      }
      continue;
    }

    if (/^axis\s*:/i.test(line)) {
      const v = line.replace(/^axis\s*:\s*/i, "").trim().toLowerCase().replace(/"/g, "");
      if (v === "none" || v === "off" || v === "hidden") st.ast.config.showAxis = "off";
      else if (v === "on" || v === "show" || v === "visible") st.ast.config.showAxis = "on";
      else st.ast.config.showAxis = "auto";
      continue;
    }

    if (/^margins\s*:/i.test(line)) {
      const v = line.replace(/^margins\s*:\s*/i, "").trim().toLowerCase();
      st.ast.config.margins = v === "true" || v === "on" || v === "1";
      continue;
    }

    if (/^cell\s*\(/i.test(line)) {
      parseCellLine(line, st);
      continue;
    }

    // point line (starts with a quote)
    if (line.startsWith('"') || line.startsWith("'")) {
      if (parsePointLine(line, st)) continue;
    }
  }

  // Apply template defaults last (so explicit x-axis/y-axis override template)
  if (templateName) {
    const spec = resolveTemplate(templateName);
    if (spec) {
      applyTemplateDefaults(st.ast, spec);
      st.ast.template = templateName;
    }
  }

  // Promote 3x3 / NxM where cols/rows already say so but grid wasn't set
  if (st.ast.cols === 3 && st.ast.rows === 3 && st.ast.grid !== "NxM") {
    st.ast.grid = "3x3";
  }
  if (st.ast.mode === "heatmap" || st.ast.mode === "correlation") st.ast.grid = "NxM";

  return st.ast;
}

function findCommentStart(line: string): number {
  let inQuote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === "#") {
      return i;
    }
  }
  return -1;
}

// also export for testing
export { DEFAULT_CONFIG };
