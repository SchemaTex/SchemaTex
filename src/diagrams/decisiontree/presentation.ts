import { estimateTextWidth, wrapTextToWidth } from "../../core/text-metrics";
import type { DTreeAST, DTreeNode } from "./types";

/** Shared by sizing and painting: every line measured here is actually rendered. */
export function questionLines(n: DTreeNode): string[] {
  return wrapTextToWidth(n.label, n.kind === "question" ? 13 : 12.5, n.kind === "question" ? 240 : 164);
}

export const CLASS_COLORS = ["#1D64A8", "#C98A0E", "#B42318", "#2B7A4B", "#7955A1", "#087F8C"];
/** Explicit urgency classes have a stable meaning; arbitrary classes use declaration order. */
export function classTone(name: string, names: string[], mode: DTreeAST["mode"]): { band: string; edge: string; tint: string; on: string } {
  const urgency = mode === "taxonomy" ? { emergency: 2, urgent: 1, routine: 3 }[name] : undefined;
  const index = urgency ?? Math.max(0, names.indexOf(name)) % CLASS_COLORS.length;
  const edge = CLASS_COLORS[index]!;
  return { edge, band: index === 1 ? "#F2B233" : edge, tint: ["#E7F1F9", "#FFF6DD", "#FDECEA", "#EAF5EE", "#F1ECF7", "#E5F3F4"][index]!, on: index === 1 ? "#1F2933" : "#FFFFFF" };
}

export function classNames(ast: DTreeAST): string[] {
  const names = [...(ast.classes ?? [])];
  const visit = (n: DTreeNode): void => {
    if (n.className && !names.includes(n.className)) names.push(n.className);
    n.children.forEach(visit);
  };
  visit(ast.root);
  return names;
}

export function mlLines(n: DTreeNode, ast: DTreeAST): string[] {
  const lines: string[] = [];
  if (n.kind === "split") {
    const rule = n.label || (n.feature && n.op && n.threshold !== undefined ? `${n.feature} ${n.op} ${n.threshold}` : "");
    if (rule) lines.push(rule.replace(/<=/g, "≤").replace(/>=/g, "≥").replace(/!=/g, "≠"));
  } else if (n.label && n.label !== n.className) lines.push(n.label);
  if (n.samples !== undefined) lines.push(`${n.samples.toLocaleString("en-US")} samples`);
  if (n.impurity !== undefined) lines.push(`${n.impurityName ?? ast.impurityName ?? "gini"} ${n.impurity.toFixed(2)}`);
  if (typeof n.value === "number") lines.push(`value = ${n.value}`);
  return lines;
}

export function cardSize(n: DTreeNode, ast: DTreeAST): { w: number; h: number } {
  if (ast.mode === "taxonomy") {
    const lines = questionLines(n);
    const question = n.kind === "question";
    return {
      w: Math.max(question ? 180 : 188, ...lines.map(l => estimateTextWidth(l, question ? 13 : 12.5) + (question ? 64 : 24))),
      h: Math.max(question ? 56 : 64, lines.length * 17 + 24 + (n.className ? 24 : 0)),
    };
  }
  const counts = Array.isArray(n.value) ? n.value : [];
  const countsWidth = counts.reduce((w, v) => w + estimateTextWidth(String(v), 10.5) + 28, 0);
  return {
    w: Math.max(192, countsWidth + 24, estimateTextWidth(n.className ?? "", 11, {fontWeight: 600}) + 24, ...mlLines(n, ast).map(l => estimateTextWidth(l, 13, {fontWeight: 600}) + 32)),
    h: Math.max(88, mlLines(n, ast).length * 17 + 24 + (n.kind === "leaf" && n.className ? 24 : 0) + (counts.length ? 34 : 0)),
  };
}
