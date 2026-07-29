import type { DiagramType, SceneItem } from "./types";
import {
  desc,
  el,
  escapeXml,
  rect,
  svgRoot,
  text,
  title,
} from "./svg";

export type SchematexResultStatus = "valid" | "partial" | "invalid";

export interface SchematexDiagnostic {
  severity: "error" | "warning";
  code: string;
  message: string;
  line?: number;
  column?: number;
  source?: string;
  hint?: string;
  fatal: boolean;
}

export type SchematexParseResult =
  | {
      ok: true;
      status: "valid" | "partial";
      type: DiagramType;
      ast: unknown;
      diagnostics: SchematexDiagnostic[];
    }
  | {
      ok: false;
      status: "invalid";
      type: DiagramType | null;
      diagnostics: SchematexDiagnostic[];
    };

export type SchematexRenderResult =
  | {
      ok: true;
      status: "valid" | "partial";
      type: DiagramType;
      svg: string;
      diagnostics: SchematexDiagnostic[];
      /** Present only for an explicit renderResult(..., { scene: true }) request. */
      scene?: SceneItem[];
    }
  | {
      ok: false;
      status: "invalid";
      type: DiagramType | null;
      svg: string;
      diagnostics: SchematexDiagnostic[];
    };

const ENGINE_BUG_NAMES = new Set([
  "ReferenceError",
  "TypeError",
  "RangeError",
]);

export function diagnosticFromError(err: unknown): SchematexDiagnostic {
  if (err instanceof Error) {
    const anyErr = err as Error & {
      code?: string;
      line?: number;
      column?: number;
      source?: string;
      hint?: string;
    };
    const hasParseFields = typeof anyErr.line === "number";
    const isEngineBug = !hasParseFields && ENGINE_BUG_NAMES.has(err.name);
    const source =
      typeof anyErr.source === "string"
        ? anyErr.source
        : isEngineBug
        ? firstStackFrame(err.stack)
        : undefined;

    return {
      severity: "error",
      code:
        typeof anyErr.code === "string"
          ? anyErr.code
          : isEngineBug
          ? "ENGINE_BUG"
          : "DSL_INVALID",
      line: typeof anyErr.line === "number" ? anyErr.line : undefined,
      column: typeof anyErr.column === "number" ? anyErr.column : undefined,
      source,
      message: isEngineBug
        ? `[engine bug: ${err.name}] ${err.message}`
        : err.message,
      hint:
        typeof anyErr.hint === "string"
          ? anyErr.hint
          : isEngineBug
          ? "This looks like a Schematex internal error rather than a DSL syntax problem. Keep the failing DSL and file an issue."
          : undefined,
      fatal: true,
    };
  }

  return {
    severity: "error",
    code: "UNKNOWN_THROW",
    message: String(err),
    fatal: true,
  };
}

export function renderDiagnosticSvg(
  diagnostics: SchematexDiagnostic[],
  type: DiagramType | null,
  config: { fontFamily?: string } = {}
): string {
  const headline = type
    ? `${type} preview could not be rendered`
    : "Diagram preview could not be rendered";
  const detail =
    diagnostics[0]?.message ?? "Schematex could not parse this DSL.";
  const lines = wrapText(detail, 88).slice(0, 5);
  const source = diagnostics[0]?.source
    ? wrapText(`Source: ${diagnostics[0].source}`, 88).slice(0, 2)
    : [];
  const foot = "Strict validation failed before a diagram could be drawn.";
  const width = 760;
  const lineHeight = 20;
  const height = 174 + (lines.length + source.length) * lineHeight;
  const fontFamily =
    config.fontFamily ?? "system-ui, -apple-system, sans-serif";

  const children = [
    title(headline),
    desc(`${headline}. ${detail}`),
    el(
      "style",
      {},
      `
.schematex-preview-error { font-family: ${escapeXml(fontFamily)}; }
.schematex-preview-error-frame { fill: #fff7ed; stroke: #c2410c; stroke-width: 1.5; }
.schematex-preview-error-mark { fill: #c2410c; }
.schematex-preview-error-title { fill: #7c2d12; font-size: 18px; font-weight: 600; }
.schematex-preview-error-copy { fill: #431407; font-size: 13px; }
.schematex-preview-error-muted { fill: #9a3412; font-size: 12px; }
`
    ),
    el("g", { class: "schematex-preview-error" }, [
      rect({
        x: 1,
        y: 1,
        width: width - 2,
        height: height - 2,
        rx: 6,
        class: "schematex-preview-error-frame",
      }),
      rect({
        x: 28,
        y: 30,
        width: 8,
        height: 34,
        rx: 4,
        class: "schematex-preview-error-mark",
      }),
      rect({
        x: 28,
        y: 72,
        width: 8,
        height: 8,
        rx: 4,
        class: "schematex-preview-error-mark",
      }),
      text(
        { x: 58, y: 49, class: "schematex-preview-error-title" },
        headline
      ),
      text(
        { x: 58, y: 76, class: "schematex-preview-error-muted" },
        "The DSL is still available to repair or retry."
      ),
      ...renderRows(lines, 58, 112, lineHeight, "schematex-preview-error-copy"),
      ...renderRows(
        source,
        58,
        112 + lines.length * lineHeight + 10,
        lineHeight,
        "schematex-preview-error-muted"
      ),
      text(
        { x: 58, y: height - 28, class: "schematex-preview-error-muted" },
        foot
      ),
    ]),
  ];

  return svgRoot(
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": headline,
      "data-schematex-status": "invalid",
    },
    children
  );
}

function renderRows(
  rows: string[],
  x: number,
  y: number,
  lineHeight: number,
  className: string
): string[] {
  return rows.map((row, idx) =>
    text({ x, y: y + idx * lineHeight, class: className }, row)
  );
}

function wrapText(value: string, max: number): string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const rows: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (current.length + word.length + 1 <= max) {
      current += ` ${word}`;
      continue;
    }
    rows.push(current);
    current = word;
  }
  if (current) rows.push(current);
  return rows.length > 0 ? rows : [value];
}

function firstStackFrame(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  for (const line of stack.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("at ")) {
      return trimmed.replace(/\((?:.*\/)?([^/]+)\)/, "($1)");
    }
  }
  return undefined;
}
