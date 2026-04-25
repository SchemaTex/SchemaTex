/**
 * Auto-derive a LegendSpec from a sociogram AST.
 *
 * Sections (each emitted only when the corresponding encoding is present):
 *   1. Groups   — color swatch per declared group (emits when coloring="group"
 *                 or any group has an explicit color)
 *   2. Roles    — sociometric role markers (star, isolate, neglectee, rejected)
 *                 — only roles actually used in the chart
 *   3. Ties     — edge valence (positive solid, negative dashed red, neutral
 *                 dotted grey) — only valences actually used
 */

import type { SociogramAST, EdgeValence, NodeRole } from "./parser";
import type {
  LegendItem,
  LegendSection,
  LegendSpec,
} from "../../core/types";
import type { BaseTheme } from "../../core/theme";

const SECTIONS: LegendSection[] = [
  { id: "groups", title: "Groups" },
  { id: "roles", title: "Roles" },
  { id: "ties", title: "Ties" },
];

export function buildSociogramLegend(
  ast: SociogramAST,
  theme: BaseTheme
): LegendSpec {
  const items: LegendItem[] = [];

  // Groups: when coloring=group or groups have explicit colors, list each.
  const colorByGroup = ast.config.coloring === "group" || ast.groups.some(g => g.color);
  if (colorByGroup) {
    ast.groups.forEach((g, i) => {
      const color = g.color ?? theme.palette[i % theme.palette.length];
      items.push({
        key: `group.${g.id}`,
        label: g.label ?? humanize(g.id),
        kind: "fill",
        color,
        section: "groups",
      });
    });
  }

  // Roles: emit each role actually used (star/isolate/neglectee/rejected).
  // "bridge" is excluded — it's a structural notion (no special visual).
  const usedRoles = new Set<NodeRole>();
  for (const n of ast.nodes) {
    if (n.role) usedRoles.add(n.role);
  }
  const roleOrder: NodeRole[] = ["star", "isolate", "neglectee", "rejected"];
  for (const r of roleOrder) {
    if (!usedRoles.has(r)) continue;
    items.push(roleItem(r, theme));
  }

  // Ties: emit each valence used.
  const usedValences = new Set<EdgeValence>();
  for (const e of ast.edges) usedValences.add(e.valence);
  const valOrder: EdgeValence[] = ["positive", "negative", "neutral"];
  for (const v of valOrder) {
    if (!usedValences.has(v)) continue;
    items.push(valenceItem(v, theme));
  }

  return {
    mode: "auto",
    title: "Legend",
    position: "bottom-inline",
    columns: 1,
    sections: SECTIONS,
    items,
  };
}

function roleItem(r: NodeRole, theme: BaseTheme): LegendItem {
  switch (r) {
    case "star":
      return {
        key: `role.${r}`,
        label: "Star (sociometric center)",
        kind: "shape",
        shape: "circle",
        fill: theme.warn,
        color: theme.warn,
        section: "roles",
      };
    case "isolate":
      return {
        key: `role.${r}`,
        label: "Isolate",
        kind: "shape",
        shape: "circle",
        fill: theme.fillMuted,
        color: theme.neutral,
        section: "roles",
      };
    case "neglectee":
      return {
        key: `role.${r}`,
        label: "Neglectee",
        kind: "shape",
        shape: "circle",
        fill: theme.fillMuted,
        color: theme.accent,
        section: "roles",
      };
    case "rejected":
      return {
        key: `role.${r}`,
        label: "Rejected",
        kind: "shape",
        shape: "circle",
        fill: theme.negative,
        color: theme.negative,
        section: "roles",
      };
    default:
      return {
        key: `role.${r}`,
        label: humanize(r),
        kind: "shape",
        shape: "circle",
        section: "roles",
      };
  }
}

function valenceItem(v: EdgeValence, theme: BaseTheme): LegendItem {
  switch (v) {
    case "positive":
      return {
        key: `valence.${v}`,
        label: "Positive tie",
        kind: "line",
        color: theme.positive,
        pattern: "solid",
        strokeWidth: 2,
        section: "ties",
      };
    case "negative":
      return {
        key: `valence.${v}`,
        label: "Negative tie",
        kind: "line",
        color: theme.negative,
        pattern: "dashed",
        strokeWidth: 2,
        section: "ties",
      };
    case "neutral":
      return {
        key: `valence.${v}`,
        label: "Neutral tie",
        kind: "line",
        color: theme.neutral,
        pattern: "dotted",
        strokeWidth: 2,
        section: "ties",
      };
  }
}

function humanize(s: string): string {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
