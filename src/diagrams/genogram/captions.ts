import type { Individual, LayoutNode, LayoutEdge } from "../../core/types";
import { estimateTextWidth } from "../../core/text-metrics";
import { placeLabel, labelLeader, type LabelBox } from "../../core/label-placement";
import { relationshipPoints } from "./line-forms";

/** The same caption lines drive rendering, spacing, and canvas bounds. */
export function individualCaptions(ind: Individual): Array<{ kind: string; text: string }> {
  const label = ind.label || ind.id;
  let name = label.charAt(0).toUpperCase() + label.slice(1);
  const dates = vitalDatesLine(ind);
  if (dates === null && !ind.note) {
    if (ind.birthYear && ind.deathYear) name += ` (${ind.birthYear}–${ind.deathYear})`;
    else if (ind.birthYear) name += ` (b. ${ind.birthYear})`;
  }
  const captions = [{ kind: "label", text: name }];
  if (dates !== null) captions.push({ kind: "vitals", text: dates });
  if (ind.note) captions.push({ kind: "note", text: ind.note });
  for (const key of Object.keys(ind.annotations ?? {}).sort()) {
    captions.push({ kind: "annotation", text: `${key}: ${ind.annotations![key]}` });
  }
  return captions;
}

/** Baselines and conservative occupied bands, shared by routing and SVG text. */
export function captionGeometry(node: LayoutNode, fontSize: number) {
  const x = node.x + node.width / 2;
  return individualCaptions(node.individual).map((caption, index) => {
    const y = node.y + node.height + 6 + fontSize + index * (Math.max(9, fontSize) + 1);
    const size = caption.kind === "label" ? fontSize : Math.max(9, fontSize - 1);
    const width = estimateTextWidth(caption.text, Math.max(size, fontSize));
    const box = { x: x - width / 2, y: y - Math.max(size, fontSize),
      width, height: Math.max(size, fontSize) * 1.25 };
    return { ...caption, x, y, box };
  });
}

export interface RelationshipCaption {
  edge: LayoutEdge;
  box: LabelBox;
  leader: ReturnType<typeof labelLeader>;
}

/** Structural captions claim their positions before emotional routes are chosen. */
export function structuralCaptions(edges: LayoutEdge[], nodes: LayoutNode[], fontSize: number): RelationshipCaption[] {
  const occupied = nodes.flatMap(node => [node, ...captionGeometry(node, fontSize).map(c => c.box)]);
  const labels: RelationshipCaption[] = [];
  for (const edge of edges) {
    if (edge.relationship.secondary || !edge.relationship.label) continue;
    const points = relationshipPoints(edge.path);
    const mid = points[Math.floor(points.length / 2)];
    const previous = points[Math.max(0, Math.floor(points.length / 2) - 1)];
    const anchor = points.length === 2
      ? { x: (points[0].x + mid.x) / 2, y: (points[0].y + mid.y) / 2 - 12 }
      : { x: mid.x, y: mid.y - 12 };
    const box = placeLabel(anchor, { width: estimateTextWidth(edge.relationship.label, 10) + 8, height: 16 }, occupied,
      { x: mid.x - previous.x, y: mid.y - previous.y });
    occupied.push(box);
    labels.push({ edge, box, leader: labelLeader(box, points) });
  }
  return labels;
}

/**
 * Build the genealogy vital-records caption line, e.g. `* 1940-03-12 † 2018-11-04`.
 * Returns null when no full date / birth-status / death info applies (clinical
 * mode keeps the inline year suffix instead). The born glyph encodes German
 * Ahnentafel birth status: legitimate `*`, out-of-wedlock `(*)`, adopted `[*]`.
 */
function vitalDatesLine(ind: {
  dob?: string;
  dod?: string;
  birthYear?: number;
  deathYear?: number;
  status?: string;
  birthStatus?: "legitimate" | "out-of-wedlock" | "adopted";
}): string | null {
  const bornText = ind.dob ?? (ind.birthYear ? String(ind.birthYear) : undefined);
  const diedText = ind.dod ?? (ind.deathYear ? String(ind.deathYear) : undefined);
  const isDeceased = ind.status === "deceased" || diedText !== undefined;

  // Switch to the dedicated `* … † …` caption only when a year suffix can't
  // express it: a full ISO date or a legal birth status. Pure year-only
  // (clinical McGoldrick) individuals keep the inline `(1930–1990)` suffix so
  // existing genograms render unchanged.
  const hasFullDate = !!ind.dob || !!ind.dod;
  if (!hasFullDate && !ind.birthStatus) return null;

  const bornGlyph =
    ind.birthStatus === "adopted"
      ? "[*]"
      : ind.birthStatus === "out-of-wedlock"
      ? "(*)"
      : "*";

  const parts: string[] = [];
  if (bornText) parts.push(`${bornGlyph} ${bornText}`);
  else if (ind.birthStatus) parts.push(bornGlyph);
  if (isDeceased) parts.push(diedText ? `† ${diedText}` : "†");

  return parts.length > 0 ? parts.join("  ") : null;
}
