/**
 * Shared DSL directive parser for the unified Legend system.
 *
 * Diagram parsers call `parseLegendDirective(line, overrides)` for each
 * non-content line. If the line is a `legend.*` directive, it is consumed
 * (overrides mutated in place) and the function returns true. Otherwise it
 * returns false and the caller continues normal parsing.
 *
 * Recognized forms (see docs/reference/LEGEND-SYSTEM.md):
 *
 *   legend: on | off | <position> | on <position>
 *   legend.title: "..."
 *   legend.position: <position>
 *   legend.columns: <n>
 *   legend.label <key>: "..."
 *   legend.hide: a, b, c
 *   legend.section <id>: "..."
 *   legend.section <id>.hide: true|false
 *   legend.item <id>: "..." (kind: ..., color: ..., pattern: ..., shape: ..., marker: ..., section: ...)
 */

import type {
  LegendItem,
  LegendItemKind,
  LegendLinePattern,
  LegendOverrides,
  LegendPosition,
} from "./types";

const VALID_POSITIONS: ReadonlySet<LegendPosition> = new Set<LegendPosition>([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "outside-right",
  "outside-bottom",
  "right",
  "bottom-center",
  "none",
]);

const VALID_KINDS: ReadonlySet<LegendItemKind> = new Set<LegendItemKind>([
  "shape",
  "fill",
  "fill-pattern",
  "line",
  "marker",
  "edge",
]);

const VALID_PATTERNS: ReadonlySet<LegendLinePattern> = new Set<LegendLinePattern>([
  "solid",
  "dashed",
  "dotted",
  "double",
  "wavy",
  "zigzag",
  "broken",
]);

export function parseLegendDirective(
  rawLine: string,
  overrides: LegendOverrides
): boolean {
  const line = rawLine.trim();
  if (!line.toLowerCase().startsWith("legend")) return false;

  // `legend: ...` shorthand (toggle / position keyword)
  const masterMatch = line.match(/^legend\s*:\s*(.+)$/i);
  if (masterMatch && !line.toLowerCase().startsWith("legend.")) {
    return applyMaster(masterMatch[1].trim(), overrides);
  }

  // `legend.title: "..."`
  const titleMatch = line.match(/^legend\.title\s*:\s*(.+)$/i);
  if (titleMatch) {
    overrides.title = unquote(titleMatch[1].trim());
    return true;
  }

  // `legend.position: <pos>`
  const posMatch = line.match(/^legend\.position\s*:\s*(.+)$/i);
  if (posMatch) {
    const pos = posMatch[1].trim().toLowerCase();
    if (VALID_POSITIONS.has(pos as LegendPosition)) {
      overrides.position = pos as LegendPosition;
      return true;
    }
    return false;
  }

  // `legend.columns: N`
  const colsMatch = line.match(/^legend\.columns\s*:\s*(\d+)\s*$/i);
  if (colsMatch) {
    overrides.columns = Number.parseInt(colsMatch[1], 10);
    return true;
  }

  // `legend.label <key>: "..."`
  const labelMatch = line.match(/^legend\.label\s+([^\s:]+)\s*:\s*(.+)$/i);
  if (labelMatch) {
    overrides.labels ??= {};
    overrides.labels[labelMatch[1]] = unquote(labelMatch[2].trim());
    return true;
  }

  // `legend.hide: a, b, c`
  const hideMatch = line.match(/^legend\.hide\s*:\s*(.+)$/i);
  if (hideMatch) {
    const keys = hideMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    overrides.hide = (overrides.hide ?? []).concat(keys);
    return true;
  }

  // `legend.section <id>.hide: true|false`
  const sectionHideMatch = line.match(
    /^legend\.section\s+([^\s.]+)\.hide\s*:\s*(true|false)\s*$/i
  );
  if (sectionHideMatch) {
    const id = sectionHideMatch[1];
    const flag = sectionHideMatch[2].toLowerCase() === "true";
    overrides.sections ??= {};
    overrides.sections[id] = { ...(overrides.sections[id] ?? {}), hidden: flag };
    return true;
  }

  // `legend.section <id>: "..."` (rename)
  const sectionMatch = line.match(/^legend\.section\s+([^\s:]+)\s*:\s*(.+)$/i);
  if (sectionMatch) {
    const id = sectionMatch[1];
    overrides.sections ??= {};
    overrides.sections[id] = {
      ...(overrides.sections[id] ?? {}),
      title: unquote(sectionMatch[2].trim()),
    };
    return true;
  }

  // `legend.item <id>: "label" (kind: X, color: Y, ...)`
  const itemMatch = line.match(
    /^legend\.item\s+([^\s:]+)\s*:\s*"([^"]*)"\s*(?:\(([^)]*)\))?\s*$/i
  );
  if (itemMatch) {
    const item = buildItem(itemMatch[1], itemMatch[2], itemMatch[3]);
    if (item) {
      overrides.added ??= [];
      overrides.added.push(item);
      return true;
    }
  }

  return false;
}

function applyMaster(value: string, overrides: LegendOverrides): boolean {
  const parts = value.split(/\s+/).filter(Boolean);
  let consumed = false;
  for (const tok of parts) {
    const t = tok.toLowerCase();
    if (t === "on" || t === "off" || t === "auto") {
      overrides.mode = t;
      consumed = true;
    } else if (VALID_POSITIONS.has(t as LegendPosition)) {
      overrides.position = t as LegendPosition;
      // A position keyword implies on (unless explicitly off)
      if (overrides.mode !== "off") overrides.mode = "on";
      consumed = true;
    } else {
      return false;
    }
  }
  return consumed;
}

function buildItem(
  id: string,
  label: string,
  attrsRaw: string | undefined
): LegendItem | null {
  const item: LegendItem = { key: id, label, kind: "fill" };
  if (!attrsRaw) return item;

  for (const part of attrsRaw.split(",")) {
    const eq = part.indexOf(":");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim().toLowerCase();
    const v = part.slice(eq + 1).trim();
    switch (k) {
      case "kind":
        if (VALID_KINDS.has(v as LegendItemKind)) item.kind = v as LegendItemKind;
        else return null;
        break;
      case "color":
        item.color = v;
        break;
      case "color2":
        item.color2 = v;
        break;
      case "pattern":
        if (VALID_PATTERNS.has(v as LegendLinePattern))
          item.pattern = v as LegendLinePattern;
        break;
      case "shape":
        item.shape = v;
        break;
      case "marker":
        item.marker = v;
        break;
      case "section":
        item.section = v;
        break;
      case "stroke-width":
      case "strokewidth": {
        const n = Number.parseFloat(v);
        if (Number.isFinite(n)) item.strokeWidth = n;
        break;
      }
      default:
        // Unknown attribute — ignore silently to keep DSL forward-compatible.
        break;
    }
  }
  return item;
}

function unquote(s: string): string {
  const m = s.match(/^"(.*)"$/);
  return m ? m[1] : s;
}
