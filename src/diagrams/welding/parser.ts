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

function stripComment(line: string): string {
  const hash = line.indexOf("#");
  if (hash >= 0 && (line.slice(0, hash).match(/["'“‘]/g)?.length ?? 0) % 2 === 0) {
    return line.slice(0, hash);
  }
  return line;
}

// Directive keywords that introduce a value (the lookahead stops a value here).
const DIR_BOUNDARY = "(?:arrow|other|both|tail|label)\\s*[:=]|(?:around|all-?around|field|site)\\b";

/** Parse one joint body (inline or multi-line) into the joint. */
function parseJointBody(body: string, joint: Joint): void {
  // value-bearing directives, value runs until the next directive/flag keyword
  const dirRe = new RegExp(`\\b(arrow|other|both|tail|label)\\s*[:=]\\s*([\\s\\S]*?)(?=\\b(?:${DIR_BOUNDARY})|$)`, "gi");
  for (const m of body.matchAll(dirRe)) {
    const key = m[1]!.toLowerCase();
    const val = m[2]!.trim();
    if (key === "arrow") joint.arrow = parseWeldSpec(val);
    else if (key === "other") joint.other = parseWeldSpec(val);
    else if (key === "both") {
      const spec = parseWeldSpec(val);
      if (spec) {
        joint.arrow = spec;
        joint.other = { ...spec };
      }
    } else if (key === "tail") joint.tail = stripQuotes(val);
    else if (key === "label") joint.label = stripQuotes(val);
  }
  // standalone flags
  if (/\b(around|all-?around)\b/i.test(body)) joint.around = true;
  if (/\b(field|site)\b/i.test(body)) joint.field = true;
}

export function parseWelding(text: string): WeldingAST {
  const ast: WeldingAST = { type: "welding", standard: "aws", joints: [], warnings: [] };
  const src = text.split(/\r?\n/).map(stripComment).join("\n");

  // header — the `welding …` line up to the first `joint`
  const headEnd = src.search(/\bjoint\b/i);
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
    const titleM = rest.replace(/standard\s*[:=]\s*[a-zA-Z-]+/i, "").trim();
    if (titleM) ast.title = stripQuotes(titleM);
  }

  // joint blocks — `joint <label?> { body }` (body has no nested braces)
  const jointRe = /\bjoint\b([^{]*)\{([\s\S]*?)\}/gi;
  for (const m of src.matchAll(jointRe)) {
    const joint = emptyJoint();
    const labelRaw = m[1]!.trim();
    if (labelRaw) joint.label = stripQuotes(labelRaw);
    parseJointBody(m[2]!, joint);
    ast.joints.push(joint);
  }

  // tolerate a final joint with no closing brace (only when braces are unbalanced)
  const opens = (src.match(/\{/g) ?? []).length;
  const closes = (src.match(/\}/g) ?? []).length;
  const tail = opens > closes ? src.match(/\bjoint\b([^{]*)\{([^}]*)$/i) : null;
  if (tail) {
    const joint = emptyJoint();
    const labelRaw = tail[1]!.trim();
    if (labelRaw) joint.label = stripQuotes(labelRaw);
    parseJointBody(tail[2]!, joint);
    ast.joints.push(joint);
  }

  ast.warnings = validateWelding(ast);
  return ast;
}
