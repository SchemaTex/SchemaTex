import type { RelationshipType, LegendLinePattern } from "../../core/types";
import { labelPathPoints, type LabelPoint } from "../../core/label-placement";
import { circle, el } from "../../core/svg";
import { resolveGenogramTheme } from "../../core/theme";

interface LineForm {
  color: string;
  width: number;
  offsets: number[];
  pattern: LegendLinePattern;
}

export function emotionalForm(type: RelationshipType): LineForm {
  const color = resolveGenogramTheme("default")[emotionalInk(type)];
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

/** These widths, offsets and paths are the fixed routing footprint. Drawing a
 * new notation must not change the route search, caption placement or bounds. */
function routeSampler(path: string) {
  const points = relationshipPoints(path);
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = lengths[lengths.length - 1];
  const at = (distance: number, offset = 0): LabelPoint => {
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < distance) i++;
    const a = points[i - 1], b = points[i];
    const length = lengths[i] - lengths[i - 1];
    const t = (distance - lengths[i - 1]) / length;
    return { x: a.x + (b.x - a.x) * t - (b.y - a.y) / length * offset,
      y: a.y + (b.y - a.y) * t + (b.x - a.x) / length * offset };
  };
  return { total, at };
}

/** Layout's reserved line geometry; independent of the artwork below. */
export function emotionalPaths(path: string, type: RelationshipType): string[] {
  const form = emotionalForm(type);
  const { total, at } = routeSampler(path);
  if (!total) return [];
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

/** Semantic colours come from the engine theme, including monochrome/dark. */
function emotionalInk(type: RelationshipType): "positive" | "negative" | "neutral" | "accent" | "warn" {
  if (["harmony", "close", "bestfriends", "love", "inlove", "friendship"].includes(type)) return "positive";
  if (["hostile", "conflict", "enmity", "distant-hostile", "cutoff", "close-hostile", "fused-hostile",
    "abuse", "physical-abuse", "emotional-abuse", "sexual-abuse", "neglect", "focused-neg"].includes(type)) return "negative";
  if (["distant", "normal", "nevermet"].includes(type)) return "neutral";
  if (["manipulative", "controlling", "jealous"].includes(type)) return "warn";
  return "accent";
}

/** MFI 2017 takes precedence; GenoPro supplies the additional relationship marks.
 * Coordinates are baked into the reserved route, never scaled SVG artwork. */
export function renderEmotionalForm(path: string, type: RelationshipType, directional = false): string {
  const { total, at } = routeSampler(path);
  if (!total) return "";
  const form = emotionalForm(type);
  const ink = `schematex-genogram-ink-${emotionalInk(type)}`;
  const classes = (extra = "") => `schematex-genogram-emotional-stroke ${ink}${extra ? ` ${extra}` : ""}`;
  const result: string[] = [];
  const stroke = (d: string, mark: string, extra = "", dashed = false, width = 2) => {
    result.push(el("path", { d, class: classes(extra), "data-mark": mark,
      "stroke-width": width, "stroke-dasharray": dashed ? "4,4" : undefined }));
  };
  const openArrow = ["neglect", "manipulative", "controlling", "jealous", "admirer", "limerence"].includes(type);
  const abuse = ["abuse", "physical-abuse", "emotional-abuse", "sexual-abuse"].includes(type);
  const arrow = openArrow || abuse || ["focused", "focused-neg"].includes(type) || directional;
  const headLength = Math.min(12, total / 5);
  const headHalf = Math.min(6, total / 6);
  const end = arrow && !openArrow ? total - headLength : total;
  const run = (start: number, finish: number, offset: number, zigzag: boolean, mark: string, dashed = false) => {
    const count = Math.max(2, Math.ceil((finish - start) / 6));
    const distances = Array.from({ length: count + 1 }, (_, i) => start + (finish - start) * i / count);
    const neutral = (mark === "parallel" && ["close-hostile", "fused-hostile"].includes(type)) || mark === "dashed";
    stroke(polyline(distances.map((d, i) => at(d, offset +
      (zigzag && i > 0 && i < count ? (i % 2 === 0 ? -4 : 4) : 0)))), mark,
      neutral ? "schematex-genogram-ink-neutral" : "", dashed,
      type === "distant" ? form.width : 2);
  };
  if (type === "cutoff") {
    for (const d of emotionalPaths(path, type)) stroke(d, "cutoff");
  } else {
    const parallel = type === "fused-hostile" ? [-6, 0, 6] : type === "close-hostile" ? [-6, 6]
      : type === "fused" ? [-4, 0, 4]
      : type === "close" || type === "friendship" ? [-2.5, 2.5]
      : type === "bestfriends" || type === "sexual-abuse" ? [-4, 4] : [];
    for (const offset of parallel) run(0, end, offset, false, "parallel");
    const zigzag = abuse || ["hostile", "conflict", "enmity", "distant-hostile", "close-hostile", "fused-hostile"].includes(type);
    if (type === "distant-hostile") run(0, end, 0, false, "dashed", true);
    if (zigzag) run(0, end, 0, true, "zigzag");

    const circles = ["love", "admirer"].includes(type) ? 1 : ["inlove", "limerence"].includes(type) ? 2 : 0;
    const box = type === "nevermet" || type === "controlling";
    const diamond = type === "jealous";
    const radius = Math.min(6, total / (circles === 2 ? 5 : 4));
    const separation = circles === 2 ? radius / 2 : 0;
    const gap = circles ? radius + separation : box || diamond ? radius : 0;
    if (!parallel.length && !zigzag) {
      if (gap) {
        run(0, total / 2 - gap, 0, false, "shaft");
        run(total / 2 + gap, end, 0, false, "shaft");
      } else run(0, end, 0, false, "shaft", type === "distant" || type === "neglect");
    }
    for (const offset of circles === 2 ? [-separation, separation] : circles ? [0] : []) {
      const p = at(total / 2 + offset);
      result.push(circle({ cx: p.x, cy: p.y, r: radius, class: classes(), "data-mark": "circle", "stroke-width": 2 }));
    }
    const middle = total / 2;
    if (box) stroke(polyline([at(middle - radius, -radius), at(middle + radius, -radius),
      at(middle + radius, radius), at(middle - radius, radius)]) + " Z", "box");
    if (diamond) stroke(polyline([at(middle - radius), at(middle, -radius),
      at(middle + radius), at(middle, radius)]) + " Z", "diamond");
    if (box || type === "manipulative") {
      const cross = box ? radius * 0.7 : radius;
      for (const sign of [-1, 1]) stroke(polyline([at(middle - cross, sign * cross), at(middle + cross, -sign * cross)]), "cross");
    }
    if (type === "distrust" || type === "bestfriends") {
      const count = Math.max(3, Math.floor(total / 10));
      for (let i = 1; i < count; i++) {
        const d = total * i / count;
        stroke(polyline([at(d, -6), at(d, 6)]), "tick");
      }
    }
  }
  if (arrow) {
    // Orient against the original final tangent, not the final zigzag tooth.
    const tip = at(total), base = at(total - headLength);
    const length = Math.hypot(tip.x - base.x, tip.y - base.y);
    const nx = -(tip.y - base.y) / length * headHalf, ny = (tip.x - base.x) / length * headHalf;
    const d = polyline([{ x: base.x + nx, y: base.y + ny }, tip, { x: base.x - nx, y: base.y - ny }]);
    stroke(d + (openArrow ? "" : " Z"), "arrow", `schematex-genogram-arrow-${openArrow ? "open" : type === "emotional-abuse" ? "hollow" : "filled"}`);
  }
  return result.join("");
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
