import type { SLDNode } from "../../core/types";
import { estimateTextWidth, wrapTextToWidth } from "../../core/text-metrics";

export interface SLDAnnotation {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  className: string;
}

/** Device annotations are measured once, then used by placement and painting. */
export function equipmentText(node: SLDNode): {
  title: string[];
  details: string[];
} {
  const title = wrapTextToWidth(node.label ?? node.id, 11, 160, {
    fontWeight: 700,
  });
  const details = [node.rating, node.voltage].filter((s): s is string => !!s);
  const keys =
    node.nodeType.startsWith("transformer") ||
    node.nodeType === "autotransformer"
      ? Object.keys(node.nameplate ?? {})
      : ["curve", "icn", "rcd_type", "type", "sensitivity", "poles"];
  for (const key of keys) {
    const value = node.nameplate?.[key] ?? node.nameplate?.[key.toUpperCase()];
    if (value) details.push(`${key}: ${value}`);
  }
  return { title, details: details.flatMap((s) => wrapTextToWidth(s, 9, 160)) };
}

export function annotation(
  text: string,
  x: number,
  y: number,
  title = false,
): SLDAnnotation {
  return {
    text,
    x,
    y,
    width: estimateTextWidth(text, title ? 11 : 9, {
      fontWeight: title ? 700 : 400,
    }),
    fontSize: title ? 11 : 9,
    className: title ? "lt-sld-id-side" : "lt-sld-rating-side",
  };
}
