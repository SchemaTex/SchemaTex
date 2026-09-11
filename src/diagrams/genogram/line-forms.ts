import type { RelationshipType, LegendLinePattern } from "../../core/types";
import { labelPathPoints, type LabelPoint } from "../../core/label-placement";
import { el } from "../../core/svg";

interface LineForm {
  color: string;
  width: number;
  offsets: number[];
  pattern: LegendLinePattern;
}

export function emotionalForm(type: RelationshipType): LineForm {
  let color = "#1565c0";
  if (["harmony", "close", "bestfriends", "love", "inlove", "friendship"].includes(type)) color = "#4caf50";
  if (["hostile", "conflict", "enmity", "distant-hostile", "cutoff"].includes(type)) color = "#e53935";
  if (["close-hostile", "fused", "fused-hostile"].includes(type)) color = "#9c27b0";
  if (["distant", "normal", "nevermet"].includes(type)) color = "#9e9e9e";
  if (["abuse", "physical-abuse", "emotional-abuse", "sexual-abuse", "neglect"].includes(type)) color = "#b71c1c";
  if (["manipulative", "controlling", "jealous"].includes(type)) color = "#e65100";
  const offsets = type === "fused" ? [-4, 0, 4] : type === "close" ? [-2.5, 2.5] : [0];
  let pattern: LegendLinePattern = "solid";
  if (["hostile", "conflict", "enmity", "distant-hostile", "close-hostile", "fused-hostile"].includes(type)) pattern = "zigzag";
  if (["distant", "nevermet"].includes(type)) pattern = "dotted";
  if (type === "cutoff") pattern = "broken";
  let width = type === "distant" ? 1.25 : 2;
  if (["fused-hostile", "bestfriends"].includes(type)) width = 4;
  if (["close-hostile", "love", "inlove"].includes(type)) width = 3;
  return { color, width, offsets, pattern };
}

export const relationshipPoints = labelPathPoints;

function polyline(points: LabelPoint[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

/** One arclength/tangent mechanism supplies parallel offsets, teeth, and break caps. */
export function emotionalPaths(path: string, type: RelationshipType): string[] {
  const form = emotionalForm(type);
  const points = relationshipPoints(path);
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = lengths[lengths.length - 1];
  if (!total) return [];
  const at = (distance: number, offset = 0): LabelPoint => {
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < distance) i++;
    const a = points[i - 1], b = points[i];
    const length = lengths[i] - lengths[i - 1];
    const t = (distance - lengths[i - 1]) / length;
    return { x: a.x + (b.x - a.x) * t - (b.y - a.y) / length * offset,
      y: a.y + (b.y - a.y) * t + (b.x - a.x) / length * offset };
  };
  const count = Math.max(2, Math.ceil(total / 6));
  const samples = Array.from({ length: count + 1 }, (_, i) => i * total / count);
  const gap = Math.min(16, total / 3);
  const before = (total - gap) / 2, after = (total + gap) / 2;
  const ranges = form.pattern === "broken" ? [[0, before], [after, total]] : [[0, total]];
  const paths: string[] = [];
  for (const offset of form.offsets) {
    for (const [start, end] of ranges) {
      // Floating-point multiples can land a few ulps short of the endpoint.
      // Keep a real final segment so SVG arrow tangents never become zero-length.
      const distances = [start, ...samples.filter(d => d > start + 1e-6 && d < end - 1e-6), end];
      paths.push(polyline(distances.map((d, i) => at(d, offset +
        (form.pattern === "zigzag" && i > 0 && i < distances.length - 1 ? (i % 2 === 0 ? -4 : 4) : 0)))));
    }
  }
  if (form.pattern === "broken") {
    for (const d of [before, after]) paths.push(polyline([at(d, -6), at(d, 6)]));
  }
  if (type === "conflict") {
    for (const d of [total / 2 - Math.min(5, total / 8), total / 2 + Math.min(5, total / 8)]) {
      paths.push(polyline([at(d, -6), at(d, 6)]));
    }
  }
  return paths;
}

export function renderEmotionalForm(path: string, type: RelationshipType, directional = false): string {
  const form = emotionalForm(type);
  return emotionalPaths(path, type).map((d, i) => el("path", {
    d, fill: "none", stroke: form.color, "stroke-width": form.width,
    "stroke-linecap": "round", "stroke-linejoin": "round",
    "stroke-dasharray": form.pattern === "dotted" ? "2,5" : undefined,
    "marker-end": directional && i === (form.pattern === "broken" ? 1 : 0) ? "url(#schematex-genogram-arrow)" : undefined,
  })).join("");
}

/** Multiple-birth branches share an apex; the joining bar means identical. */
export function twinPaths(apex: LabelPoint, children: LabelPoint[], identical: boolean): string[] {
  const paths = children.map(child => polyline([apex, child]));
  if (identical) paths.push(polyline(children.map(child => ({
    x: apex.x + (child.x - apex.x) * 0.55,
    y: apex.y + (child.y - apex.y) * 0.55,
  }))));
  return paths;
}
