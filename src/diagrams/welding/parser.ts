/**
 * Welding-symbol parser (47-WELDING-SYMBOL-STANDARD).
 *
 * Grammar (one block per joint):
 *   welding [standard: aws | iso-a | iso-b]
 *   joint "label" {
 *     arrow: <weldspec>     # weld on the arrow side
 *     other: <weldspec>     # weld on the other side
 *     both:  <weldspec>     # shorthand: same weld on both sides
 *     around                # weld-all-around
 *     field                 # field / site weld
 *     tail: "GTAW; WPS-12"  # process / spec / NDE
 *   }
 *   <weldspec> = <type> [size=n] [len=n] [pitch=n] [count=n]
 *               [angle=deg] [root=n] [throat=n] [contour=…] [finish=…]
 */
import type {
  WeldingAST,
  Joint,
  WeldSpec,
  WeldType,
  WeldStandard,
  WeldContour,
  WeldFinish,
} from "./types";
import { validateWelding } from "./types";
import { stripLineComment, type CommentMarker } from "../../core/dsl-preprocess";

/** Line-comment markers this grammar recognises. */
const COMMENT_MARKERS: readonly CommentMarker[] = ["#"];

const WELD_TYPES: ReadonlySet<string> = new Set<WeldType>([
  "fillet", "square", "vgroove", "bevel", "ugroove", "jgroove",
  "flarev", "flarebevel", "plug", "slot", "spot", "seam",
  "back", "backing", "surfacing", "edge",
]);

// Friendly aliases an LLM might emit.
const TYPE_ALIAS: Record<string, WeldType> = {
  v: "vgroove",
  "v-groove": "vgroove",
  u: "ugroove",
  "u-groove": "ugroove",
  j: "jgroove",
  "j-groove": "jgroove",
  "flare-v": "flarev",
  "flare-bevel": "flarebevel",
  groove: "vgroove",
};

const CONTOURS: ReadonlySet<string> = new Set(["flush", "convex", "concave"]);
const FINISHES: ReadonlySet<string> = new Set(["G", "M", "C", "R", "H", "U"]);

function stripQuotes(s: string): string {
  const t = s.trim();
  const pairs: [string, string][] = [['"', '"'], ["'", "'"], ["“", "”"], ["‘", "’"]];
  for (const [a, b] of pairs) {
    if (t.startsWith(a) && t.endsWith(b) && t.length >= 2) return t.slice(1, -1);
  }
  return t;
}

function num(v: string): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse a weld spec: `<type> key=value …`. Returns undefined if no valid type. */
function parseWeldSpec(raw: string): WeldSpec | undefined {
  const tokens = raw.trim().split(/\s+/);
  if (tokens.length === 0) return undefined;
  const head = tokens[0]!.toLowerCase();
  const type = (WELD_TYPES.has(head) ? (head as WeldType) : TYPE_ALIAS[head]);
  if (!type) return undefined;
  const spec: WeldSpec = { type };
  for (let i = 1; i < tokens.length; i++) {
    const m = tokens[i]!.match(/^([a-zA-Z]+)\s*[=:]\s*(.+)$/);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const val = m[2]!;
    switch (key) {
      case "size": case "leg": case "s": spec.size = num(val); break;
      case "len": case "length": case "l": spec.length = num(val); break;
      case "pitch": case "p": spec.pitch = num(val); break;
      case "count": case "n": spec.count = num(val); break;
      case "angle": case "a": case "deg": spec.angle = num(val); break;
      case "root": case "gap": case "r": spec.root = num(val); break;
      case "throat": case "e": case "t": spec.throat = num(val); break;
      case "contour": case "c": if (CONTOURS.has(val.toLowerCase())) spec.contour = val.toLowerCase() as WeldContour; break;
      case "finish": case "f": { const u = val.toUpperCase(); if (FINISHES.has(u)) spec.finish = u as WeldFinish; break; }
    }
  }
  return spec;
}

function emptyJoint(): Joint {
  return { around: false, field: false };
}

/** Mask quoted text while retaining source offsets so keywords inside labels stay data. */
function outsideQuotes(text: string): string {
  let close = "";
  return text.split("").map((ch, index) => {
    if (close) {
      if (ch === close && text[index - 1] !== "\\") close = "";
      return " ";
    }
    const ending: Record<string, string> = { '"': '"', "'": "'", "“": "”", "‘": "’" };
    // Quotes open a token or value; an apostrophe within a bare word is data.
    if (ending[ch] && (index === 0 || /[\s:=([{,;]/.test(text[index - 1]!))) {
      close = ending[ch];
      return " ";
    }
    return ch;
  }).join("");
}

/** Parse directives only outside quoted labels, preserving the original value text. */
function parseJointBody(body: string, joint: Joint): void {
  const tokens = [...outsideQuotes(body).matchAll(/\b(arrow|other|both|tail|label)\s*[:=]|\b(around|all-?around|field|site)\b/gi)];
  tokens.forEach((token, index) => {
    const key = (token[1] ?? token[2])!.toLowerCase();
    const value = body.slice(token.index! + token[0].length, tokens[index + 1]?.index ?? body.length).trim();
    if (key === "field" || key === "site") joint.field = true;
    else if (key === "around" || key === "all-around" || key === "allaround") joint.around = true;
    else if (key === "tail") joint.tail = stripQuotes(value);
    else if (key === "label") joint.label = stripQuotes(value);
    else if (key === "arrow") joint.arrow = parseWeldSpec(value);
    else if (key === "other") joint.other = parseWeldSpec(value);
    else if (key === "both") {
      const spec = parseWeldSpec(value);
      if (spec) { joint.arrow = spec; joint.other = { ...spec }; }
    }
  });
}

export function parseWelding(text: string): WeldingAST {
  const ast: WeldingAST = { type: "welding", standard: "aws", joints: [], warnings: [] };
  const src = text.split(/\r?\n/).map((line) => stripLineComment(line, COMMENT_MARKERS)).join("\n");

  // header — the `welding …` line up to the first `joint`
  const unquoted = outsideQuotes(src);
  const headEnd = unquoted.search(/\bjoint\b/i);
  const headerScope = headEnd >= 0 ? src.slice(0, headEnd) : src;
  const header = headerScope.match(/welding\b([^\n]*)/i);
  if (header) {
    const rest = header[1]!.trim();
    const std = rest.match(/standard\s*[:=]\s*([a-zA-Z-]+)/i);
    if (std) {
      const s = std[1]!.toLowerCase();
      if (s === "aws" || s === "iso-a" || s === "iso-b") ast.standard = s as WeldStandard;
      else if (s === "iso") ast.standard = "iso-a";
    }
    const titleM = rest.replace(/\[\s*standard\s*[:=]\s*[a-zA-Z-]+\s*\]|standard\s*[:=]\s*[a-zA-Z-]+/i, "").trim();
    if (titleM) ast.title = stripQuotes(titleM);
  }

  // joint blocks — `joint <label?> { body }` (body has no nested braces)
  const jointRe = /\bjoint\b([^{]*)\{([\s\S]*?)\}/gi;
  for (const m of unquoted.matchAll(jointRe)) {
    const joint = emptyJoint();
    const open = unquoted.indexOf("{", m.index);
    const labelRaw = src.slice(m.index! + 5, open).trim();
    if (labelRaw) joint.label = stripQuotes(labelRaw);
    parseJointBody(src.slice(open + 1, open + 1 + m[2]!.length), joint);
    ast.joints.push(joint);
  }

  // tolerate a final joint with no closing brace (only when braces are unbalanced)
  const opens = (unquoted.match(/\{/g) ?? []).length;
  const closes = (unquoted.match(/\}/g) ?? []).length;
  const tail = opens > closes ? unquoted.match(/\bjoint\b([^{]*)\{([^}]*)$/i) : null;
  if (tail) {
    const joint = emptyJoint();
    const open = unquoted.indexOf("{", tail.index);
    const labelRaw = src.slice(tail.index! + 5, open).trim();
    if (labelRaw) joint.label = stripQuotes(labelRaw);
    parseJointBody(src.slice(open + 1), joint);
    ast.joints.push(joint);
  }

  ast.warnings = validateWelding(ast);
  return ast;
}
