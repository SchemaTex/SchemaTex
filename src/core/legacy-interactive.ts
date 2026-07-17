import type { DiagramType, SceneItem, SourceRange } from "./types";
import { createSourceLocator } from "./source-range";
import { TITLE_SCENE_ID } from "./title-scene";

type PositionMode = SceneItem["editable"]["position"];

interface TextCandidate {
  value: string;
  range: SourceRange;
  labelWrite?: SceneItem["labelWrite"];
  lineStart: number;
  lineEnd: number;
  title: boolean;
  used: boolean;
}

interface OpenTag {
  name: string;
  start: number;
  end: number;
  closeEnd: number;
  raw: string;
  parent?: OpenTag;
}

interface SvgText {
  tag: OpenTag;
  value: string;
  ancestors: OpenTag[];
  used: boolean;
}

interface StableNode {
  semanticId: string;
  labels: string[];
  mode: PositionMode;
}

interface Replacement {
  start: number;
  end: number;
  text: string;
}

interface AdaptedNode {
  semanticId: string;
  base: { x: number; y: number; width: number; height: number };
  dx: number;
  dy: number;
  group: OpenTag;
}

const LEGACY_TYPES = new Set<DiagramType>([
  "ecomap", "pedigree", "phylo", "sociogram", "logic", "blockdiagram",
  "ladder", "sfc", "sld", "entity", "venn", "bpmn", "usecase", "prisma",
  "pert", "faulttree", "bowtie", "matrix", "eventtree", "fmea", "rbd",
  "comparison", "causalloop", "markov", "gitgraph", "epc", "idef0",
  "threatmodel", "welding", "playbook",
]);

const POSITION_MODES: Partial<Record<DiagramType, PositionMode>> = {
  ecomap: "free",
  pedigree: "move-x",
  sociogram: "free",
  logic: "free",
  blockdiagram: "free",
  sfc: "move-x",
  sld: "move-x",
  entity: "move-x",
  bpmn: "move-x",
  usecase: "free",
  pert: "free",
  faulttree: "move-x",
  bowtie: "move-y",
  rbd: "move-x",
  causalloop: "free",
  markov: "free",
  epc: "move-x",
  idef0: "free",
  threatmodel: "free",
};

const NODE_COLLECTION = /(?:individuals?|people|persons?|systems?|nodes?|gates?|blocks?|boxes|steps?|sources?|buses?|transformers?|entities|objects?|activities|actors?|usecases?|tasks?|events?|threats?|consequences?|barriers?|variables?|states?|functions?|processes?|stores?|externals?|components?)/i;
const NODE_KINDS = /^(?:block|box|step|state|event|gate|function|activity|task|process|store|datastore|external|entity|actor|usecase|threat|consequence|barrier|equipment|component)$/i;
const LABEL_FIELDS = ["label", "name", "title", "text", "comment", "caption", "description"] as const;

export function supportsLegacyInteractive(type: DiagramType): boolean {
  return LEGACY_TYPES.has(type);
}

function decodeXml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_all, value: string) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_all, value: string) => String.fromCodePoint(Number.parseInt(value, 16)));
}

function normalizeText(text: string): string {
  return decodeXml(text).replace(/\s+/g, " ").trim();
}

function quotedValue(raw: string): string {
  if (raw.length < 2) return raw;
  const quote = raw[0]!;
  const closer = raw[raw.length - 1]!;
  const quoted =
    (quote === '"' && closer === '"') ||
    (quote === "'" && closer === "'") ||
    (quote === "“" && closer === "”") ||
    (quote === "「" && closer === "」") ||
    (quote === "『" && closer === "』");
  if (!quoted) return raw;
  const inner = raw.slice(1, -1);
  return quote === '"' ? inner.replace(/\\([\\"])/g, "$1") : inner;
}

function lineBounds(source: string, offset: number): { start: number; end: number; text: string } {
  const start = source.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const nl = source.indexOf("\n", offset);
  const end = nl < 0 ? source.length : nl;
  return { start, end, text: source.slice(start, end).replace(/\r$/, "") };
}

function isHeaderTitle(line: string, rangeStartInLine: number): boolean {
  const prefix = line.slice(0, rangeStartInLine).trim().toLowerCase();
  if (/^title\s*:\s*$/.test(prefix)) return true;
  return /^(?:ecomap|pedigree|phylo|sociogram|logic|blockdiagram|ladder|sfc|sld|entity-structure|venn|bpmn|usecase|prisma|pert|gantt|faulttree|fta|bowtie|matrix|eventtree|eta|fmea|rbd|reliability(?:-block-diagram)?|comparison|compare|vs|tchart|t-chart|pugh|decision-matrix|causalloop|cld|markov|markovchain|gitgraph|epc|idef0|threatmodel|stride|welding|playbook)\b[^:=]*$/i.test(prefix);
}

function discoverTextCandidates(source: string, type: DiagramType): TextCandidate[] {
  const locator = createSourceLocator(source);
  const candidates: TextCandidate[] = [];
  const occupied: Array<{ start: number; end: number }> = [];

  const add = (
    start: number,
    end: number,
    value: string,
    labelWrite?: SceneItem["labelWrite"]
  ): void => {
    const clean = normalizeText(value);
    if (!clean || end <= start || occupied.some((range) => start >= range.start && end <= range.end)) return;
    const line = lineBounds(source, start);
    candidates.push({
      value: clean,
      range: locator.range(start, end),
      labelWrite,
      lineStart: line.start,
      lineEnd: line.end,
      title: isHeaderTitle(line.text, start - line.start),
      used: false,
    });
    occupied.push({ start, end });
  };

  const quoteRe = /"(?:\\.|[^"\\])*"|'[^'\r\n]*'|“[^”\r\n]*”|「[^」\r\n]*」|『[^』\r\n]*』/g;
  let quote: RegExpExecArray | null;
  while ((quote = quoteRe.exec(source))) {
    const line = lineBounds(source, quote.index);
    if (type === "phylo" && /^\s*newick\s*:/i.test(line.text)) continue;
    add(quote.index, quote.index + quote[0].length, quotedValue(quote[0]));
  }

  if (type === "phylo") {
    let phyloOffset = 0;
    let inIndentTree = false;
    for (const rawLine of source.split(/\n/)) {
      const line = rawLine.replace(/\r$/, "");
      const newick = /^\s*newick\s*:\s*(.*)$/i.exec(line);
      if (newick) {
        let body = newick[1]!;
        let bodyStart = phyloOffset + line.indexOf(body);
        if ((body.startsWith('"') && body.endsWith('"')) || (body.startsWith("'") && body.endsWith("'"))) {
          body = body.slice(1, -1);
          bodyStart += 1;
        }
        for (let index = 0; index < body.length; index++) {
          const before = body.slice(0, index).trimEnd().at(-1);
          if (index > 0 && before !== "(" && before !== "," && before !== ")") continue;
          while (/\s/.test(body[index] ?? "")) index++;
          if (body[index] === "(") continue;
          if (body[index] === "'") {
            const start = index + 1;
            let end = start;
            while (end < body.length) {
              if (body[end] === "'" && body[end + 1] === "'") {
                end += 2;
                continue;
              }
              if (body[end] === "'") break;
              end++;
            }
            if (end > start) {
              add(
                bodyStart + start,
                bodyStart + end,
                body.slice(start, end).replace(/''/g, "'"),
                "newick-quoted"
              );
            }
            index = end;
            continue;
          }
          const name = /^[^\s():,;[\]']+/.exec(body.slice(index));
          if (name) {
            add(bodyStart + index, bodyStart + index + name[0].length, name[0], "newick-bare");
            index += name[0].length - 1;
          }
        }
        inIndentTree = false;
      } else if (/^\s*root\s*:\s*$/i.test(line)) {
        inIndentTree = true;
        const start = line.search(/\S/);
        add(phyloOffset + start, phyloOffset + start + 4, line.slice(start, start + 4));
      } else if (inIndentTree && line.trim() && !line.trim().startsWith("#")) {
        const contentStart = line.search(/\S/);
        const content = line.slice(contentStart);
        const end = content.search(/\s*(?::|\[)/);
        const label = content.slice(0, end < 0 ? content.length : end).trimEnd();
        if (label) add(phyloOffset + contentStart, phyloOffset + contentStart + label.length, label);
      }
      phyloOffset += rawLine.length + 1;
    }
  }

  let offset = 0;
  for (const rawLine of source.split(/\n/)) {
    const content = rawLine.replace(/\r$/, "");
    const commentless = content.replace(/\s+(?:#|\/\/|%%).*$/, "");

    if (commentless.includes("|")) {
      let cursor = 0;
      for (const part of commentless.split("|")) {
        const leading = part.search(/\S/);
        const value = part.trim();
        if (value && !/^[-:]+$/.test(value)) {
          const start = offset + cursor + Math.max(0, leading);
          add(start, start + value.length, value);
        }
        cursor += part.length + 1;
      }
    }

    const kv = /(?:^|[,[\s])\s*([A-Za-z][\w-]*)\s*[:=]\s*([^,\]\r\n]+?)(?=\s+[A-Za-z][\w-]*\s*[:=]|\s*,|\s*\]|$)/g;
    let field: RegExpExecArray | null;
    while ((field = kv.exec(commentless))) {
      const rawValue = field[2]!.trim();
      const numeric = /^[-+]?\d+(?:\.\d+)?(?:px|%|ms|s|m|h)?$/i.test(rawValue);
      const structuredNumber = [
        "prisma", "fmea", "comparison", "welding", "markov", "faulttree",
        "rbd", "pert", "eventtree", "sld", "matrix", "venn",
      ].includes(type);
      const editableNumber = /^(?:severity|occurrence|detection|sev|occ|det|rating|score|weight|duration|probability|reliability|p|r|freq|frequency|n|studies|screened|assessed|angle|root|throat)$/i.test(field[1]!);
      if (!rawValue || (numeric && !editableNumber && !structuredNumber)) continue;
      const local = field.index + field[0].lastIndexOf(field[2]!) + field[2]!.indexOf(rawValue);
      add(offset + local, offset + local + rawValue.length, quotedValue(rawValue));
    }

    const call = /^\s*[A-Z][A-Z0-9_]*\s*\((.*)\)\s*$/.exec(commentless);
    if (call) {
      const innerStart = commentless.indexOf(call[1]!);
      let cursor = 0;
      for (const part of call[1]!.split(",")) {
        const trimmed = part.trim();
        if (trimmed) {
          const valuePart = trimmed.includes("=") ? trimmed.slice(trimmed.indexOf("=") + 1).trim() : trimmed;
          const at = commentless.indexOf(valuePart, innerStart + cursor);
          if (at >= 0) add(offset + at, offset + at + valuePart.length, quotedValue(valuePart));
        }
        cursor += part.length + 1;
      }
    }
    offset += rawLine.length + 1;
  }

  return candidates.sort((a, b) => a.range.start - b.range.start);
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) attrs[match[1]!] = match[2] ?? match[3] ?? "";
  return attrs;
}

function scanOpenTags(svg: string): OpenTag[] {
  const tags: OpenTag[] = [];
  const stack: OpenTag[] = [];
  const re = /<\/?([A-Za-z][\w:-]*)\b[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(svg))) {
    const raw = match[0];
    const name = match[1]!.toLowerCase();
    if (raw.startsWith("</")) {
      for (let index = stack.length - 1; index >= 0; index--) {
        if (stack[index]!.name !== name) continue;
        const [open] = stack.splice(index, 1);
        if (open) open.closeEnd = re.lastIndex;
        break;
      }
      continue;
    }
    const tag: OpenTag = {
      name,
      start: match.index,
      end: re.lastIndex,
      closeEnd: re.lastIndex,
      raw,
      parent: stack[stack.length - 1],
    };
    tags.push(tag);
    if (!raw.endsWith("/>") && !["path", "line", "rect", "circle", "ellipse", "polygon", "polyline", "use", "image"].includes(name)) {
      stack.push(tag);
    }
  }
  return tags;
}

function ancestorsOf(tag: OpenTag): OpenTag[] {
  const result: OpenTag[] = [];
  let current = tag.parent;
  while (current) {
    if (current.name === "g") result.push(current);
    current = current.parent;
  }
  return result;
}

function discoverSvgTexts(svg: string, tags: OpenTag[]): SvgText[] {
  return tags.filter((tag) => tag.name === "text").map((tag) => {
    const closeStart = svg.lastIndexOf("</text", tag.closeEnd);
    const body = closeStart >= tag.end ? svg.slice(tag.end, closeStart) : "";
    const spaced = body.replace(/<\/tspan>\s*<tspan\b[^>]*>/gi, " ");
    return {
      tag,
      value: normalizeText(spaced.replace(/<[^>]+>/g, "")),
      ancestors: ancestorsOf(tag),
      used: false,
    };
  }).filter((entry) => entry.value.length > 0);
}

function attrNumber(raw: string, name: string): number | undefined {
  const value = parseAttrs(raw)[name];
  if (value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function translateOf(raw: string): { x: number; y: number } {
  const transform = parseAttrs(raw).transform ?? "";
  let x = 0;
  let y = 0;
  const re = /translate\(\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:[ ,]+([+-]?(?:\d+(?:\.\d*)?|\.\d+)))?\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(transform))) {
    x += Number(match[1]);
    y += Number(match[2] ?? 0);
  }
  return { x, y };
}

function textAnchor(text: SvgText): { x: number; y: number } {
  let x = attrNumber(text.tag.raw, "x") ?? 0;
  let y = attrNumber(text.tag.raw, "y") ?? 0;
  for (const ancestor of text.ancestors) {
    const delta = translateOf(ancestor.raw);
    x += delta.x;
    y += delta.y;
  }
  return { x, y };
}

function nodeBox(text: SvgText): { x: number; y: number; width: number; height: number } {
  const anchor = textAnchor(text);
  const width = Math.max(52, Math.min(240, text.value.length * 7.2 + 24));
  const height = 44;
  const textAnchorValue = parseAttrs(text.tag.raw)["text-anchor"];
  return {
    x: textAnchorValue === "middle" ? anchor.x - width / 2 : anchor.x - 12,
    y: anchor.y - 27,
    width,
    height,
  };
}

function preferredNodeGroup(svg: string, text: SvgText): OpenTag | undefined {
  return text.ancestors.find((group) => {
    const body = svg.slice(group.end, group.closeEnd);
    return /<(?:rect|circle|ellipse|polygon|path)\b/i.test(body);
  }) ?? text.ancestors[0];
}

function semanticNodeGroup(svg: string, tags: OpenTag[], semanticId: string): OpenTag | undefined {
  const normalized = semanticId.toLowerCase();
  return tags
    .filter((tag) => ["g", "rect", "circle", "ellipse", "polygon", "path"].includes(tag.name))
    .filter((tag) => {
      const attrs = parseAttrs(tag.raw);
      return Object.entries(attrs).some(([name, value]) =>
        name !== "data-from" &&
        name !== "data-to" &&
        /(?:^id$|(?:^|-)id$)/i.test(name) &&
        value.toLowerCase() === normalized
      );
    })
    .filter((tag) => tag.name !== "g" || /<(?:rect|circle|ellipse|polygon|path|text)\b/i.test(svg.slice(tag.end, tag.closeEnd)))
    .sort((a, b) => (a.closeEnd - a.start) - (b.closeEnd - b.start))[0];
}

function findCandidate(candidates: TextCandidate[], value: string): TextCandidate | undefined {
  return candidates.find((candidate) => !candidate.used && normalizeText(candidate.value) === normalizeText(value));
}

function svgTextMatchesCandidate(text: string, candidate: string): boolean {
  const visible = normalizeText(text);
  const authored = normalizeText(candidate);
  if (visible === authored) return true;
  if (authored.length >= 3 && (visible.startsWith(authored) || visible.endsWith(authored))) return true;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:[%a-z]+)?$/i.test(authored)) return false;
  const escaped = authored.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^0-9A-Za-z_.+-])${escaped}(?=$|[^0-9A-Za-z_.+-])`, "i").test(visible);
}

function bareIdentityReferences(
  source: string,
  ids: Iterable<string>,
  textCandidates: TextCandidate[] = []
): Map<string, SourceRange[]> {
  const quoted: Array<{ start: number; end: number }> = [];
  for (const match of source.matchAll(/"(?:\\.|[^"\\])*"|'[^'\r\n]*'/g)) {
    quoted.push({ start: match.index!, end: match.index! + match[0].length });
  }
  const locator = createSourceLocator(source);
  const result = new Map<string, SourceRange[]>();
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^A-Za-z0-9_])(${escaped})(?![A-Za-z0-9_])`, "g");
    const ranges: SourceRange[] = [];
    let match: RegExpExecArray | null;
    while ((match = re.exec(source))) {
      const start = match.index + match[1]!.length;
      const end = start + id.length;
      if (quoted.some((range) => start >= range.start && start < range.end)) continue;
      const containingLabel = textCandidates.find((candidate) =>
        start >= candidate.range.start && end <= candidate.range.end
      );
      if (
        containingLabel &&
        (containingLabel.range.start !== start || containingLabel.range.end !== end)
      ) {
        continue;
      }
      ranges.push(locator.range(start, end));
    }
    if (ranges.length > 0) result.set(id, ranges);
  }
  return result;
}

function logicIdentityReferences(
  source: string,
  ast: unknown,
  textCandidates: TextCandidate[] = []
): Map<string, SourceRange[]> {
  if (ast === null || typeof ast !== "object") return new Map();
  const object = ast as Record<string, unknown>;
  const ids = new Set<string>();
  for (const collection of ["inputs", "outputs", "gates"] as const) {
    const values = object[collection];
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      if (value && typeof value === "object" && typeof (value as Record<string, unknown>).id === "string") {
        ids.add((value as Record<string, unknown>).id as string);
      }
    }
  }
  return bareIdentityReferences(source, ids, textCandidates);
}

function gitBranchReferences(source: string): Map<string, SourceRange[]> {
  const locator = createSourceLocator(source);
  const references = new Map<string, SourceRange[]>();
  const declared = new Set<string>();
  let offset = 0;
  for (const rawLine of source.split(/\n/)) {
    const line = rawLine.replace(/\r$/, "");
    const match = /^\s*(branch|checkout|switch|merge)\s+([^\s:]+)/i.exec(line);
    if (match) {
      const name = match[2]!;
      const start = offset + match.index + match[0].lastIndexOf(name);
      const list = references.get(name) ?? [];
      list.push(locator.range(start, start + name.length));
      references.set(name, list);
      if (match[1]!.toLowerCase() === "branch") declared.add(name);
    }
    offset += rawLine.length + 1;
  }
  return new Map([...references].filter(([name]) => declared.has(name)));
}

function collectStableNodes(ast: unknown, type: DiagramType): StableNode[] {
  const mode = POSITION_MODES[type];
  if (!mode || ast === null || typeof ast !== "object") return [];
  const nodes: StableNode[] = [];
  const seen = new Set<string>();
  const visited = new Set<object>();

  const walk = (value: unknown, collection = ""): void => {
    if (value === null || typeof value !== "object") return;
    if (visited.has(value as object)) return;
    visited.add(value as object);
    if (value instanceof Map) {
      for (const entry of value.values()) walk(entry, collection);
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry, collection);
      return;
    }
    const object = value as Record<string, unknown>;
    const id = typeof object.id === "string" ? object.id : undefined;
    const kind = typeof object.kind === "string"
      ? object.kind
      : typeof object.type === "string" ? object.type : "";
    const hasDisplayField = LABEL_FIELDS.some((field) => typeof object[field] === "string");
    const relationLike = ("from" in object && "to" in object) || ("source" in object && "target" in object);
    const nodeLike = type === "logic"
      ? collection.toLowerCase() === "gates"
      : NODE_COLLECTION.test(collection) || NODE_KINDS.test(kind) || (hasDisplayField && !relationLike);
    if (id && nodeLike && !seen.has(id)) {
      const labels = LABEL_FIELDS.flatMap((field) => typeof object[field] === "string" ? [object[field] as string] : []);
      labels.push(id);
      nodes.push({ semanticId: id, labels: [...new Set(labels.filter(Boolean))], mode });
      seen.add(id);
    }
    for (const [key, child] of Object.entries(object)) walk(child, key);
  };
  walk(ast);
  return nodes;
}

function withAttrs(raw: string, attrs: Record<string, string>): string {
  let next = raw;
  for (const [name, value] of Object.entries(attrs)) {
    const escaped = value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    const existing = new RegExp(`\\s${name}\\s*=\\s*(?:"[^"]*"|'[^']*')`);
    if (existing.test(next)) next = next.replace(existing, ` ${name}="${escaped}"`);
    else next = next.replace(/\/?>(?=[^>]*$)/, ` ${name}="${escaped}"$&`);
  }
  return next;
}

function withTranslate(raw: string, dx: number, dy: number): string {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return raw;
  const attrs = parseAttrs(raw);
  const delta = `translate(${Math.round(dx * 100) / 100} ${Math.round(dy * 100) / 100})`;
  return withAttrs(raw, { transform: attrs.transform ? `${attrs.transform} ${delta}` : delta });
}

function applyReplacements(source: string, replacements: Replacement[]): string {
  const byRange = new Map<string, Replacement>();
  for (const replacement of replacements) byRange.set(`${replacement.start}:${replacement.end}`, replacement);
  return [...byRange.values()]
    .sort((a, b) => b.start - a.start)
    .reduce((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), source);
}

function globalTranslate(tag: OpenTag): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let current: OpenTag | undefined = tag.parent;
  while (current) {
    const delta = translateOf(current.raw);
    x += delta.x;
    y += delta.y;
    current = current.parent;
  }
  return { x, y };
}

function pathPoints(d: string): Array<{ x: number; y: number }> | undefined {
  const simple = /^\s*[ML]\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)[,\s]+[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*[ML]\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)[,\s]+[+-]?(?:\d+(?:\.\d*)?|\.\d+))*\s*$/i;
  if (!simple.test(d)) return undefined;
  const values = d.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g)?.map(Number) ?? [];
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    points.push({ x: values[index]!, y: values[index + 1]! });
  }
  return points.length >= 2 ? points : undefined;
}

function fmt(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function compactOrthogonal(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    if (!previous || Math.abs(previous.x - point.x) > 0.01 || Math.abs(previous.y - point.y) > 0.01) result.push(point);
  }
  return result;
}

function shiftPath(d: string, start: { x: number; y: number }, end: { x: number; y: number }): string {
  const orthogonal = pathPoints(d);
  if (orthogonal) {
    const original = orthogonal.map((point) => ({ ...point }));
    orthogonal[0]!.x += start.x;
    orthogonal[0]!.y += start.y;
    orthogonal[orthogonal.length - 1]!.x += end.x;
    orthogonal[orthogonal.length - 1]!.y += end.y;
    if (orthogonal.length === 2) {
      const first = orthogonal[0]!;
      const last = orthogonal[1]!;
      if (Math.abs(first.x - last.x) > 0.01 && Math.abs(first.y - last.y) > 0.01) {
        const horizontal = Math.abs(original[0]!.y - original[1]!.y) < 0.01;
        orthogonal.splice(1, 0, horizontal ? { x: last.x, y: first.y } : { x: first.x, y: last.y });
      }
    } else {
      const second = orthogonal[1]!;
      if (Math.abs(original[0]!.y - original[1]!.y) < 0.01) second.y += start.y;
      else second.x += start.x;
      const beforeLast = orthogonal[orthogonal.length - 2]!;
      const originalBefore = original[original.length - 2]!;
      const originalLast = original[original.length - 1]!;
      if (Math.abs(originalBefore.y - originalLast.y) < 0.01) beforeLast.y += end.y;
      else beforeLast.x += end.x;
    }
    return compactOrthogonal(orthogonal).map((point, index) => `${index === 0 ? "M" : "L"}${fmt(point.x)} ${fmt(point.y)}`).join(" ");
  }

  const numbers = [...d.matchAll(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g)];
  if (numbers.length < 4) return d;
  const replacements = new Map<number, number>();
  replacements.set(0, Number(numbers[0]![0]) + start.x);
  replacements.set(1, Number(numbers[1]![0]) + start.y);
  replacements.set(numbers.length - 2, Number(numbers[numbers.length - 2]![0]) + end.x);
  replacements.set(numbers.length - 1, Number(numbers[numbers.length - 1]![0]) + end.y);
  let next = d;
  for (const [index, value] of [...replacements].sort((a, b) => b[0] - a[0])) {
    const token = numbers[index]!;
    next = next.slice(0, token.index!) + fmt(value) + next.slice(token.index! + token[0].length);
  }
  return next;
}

function elementEndpoints(tag: OpenTag): { start: { x: number; y: number }; end: { x: number; y: number } } | undefined {
  const attrs = parseAttrs(tag.raw);
  const translate = globalTranslate(tag);
  if (tag.name === "line") {
    const x1 = Number(attrs.x1);
    const y1 = Number(attrs.y1);
    const x2 = Number(attrs.x2);
    const y2 = Number(attrs.y2);
    if ([x1, y1, x2, y2].every(Number.isFinite)) {
      return { start: { x: x1 + translate.x, y: y1 + translate.y }, end: { x: x2 + translate.x, y: y2 + translate.y } };
    }
  }
  if (tag.name === "polyline") {
    const values = attrs.points?.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g)?.map(Number) ?? [];
    if (values.length >= 4) {
      return {
        start: { x: values[0]! + translate.x, y: values[1]! + translate.y },
        end: { x: values[values.length - 2]! + translate.x, y: values[values.length - 1]! + translate.y },
      };
    }
  }
  if (tag.name === "path" && attrs.d && !/[zZ]\s*$/.test(attrs.d)) {
    const points = attrs.d.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g)?.map(Number) ?? [];
    if (points.length >= 4) {
      return {
        start: { x: points[0]! + translate.x, y: points[1]! + translate.y },
        end: { x: points[points.length - 2]! + translate.x, y: points[points.length - 1]! + translate.y },
      };
    }
  }
  return undefined;
}

function distanceToBox(point: { x: number; y: number }, box: AdaptedNode["base"]): number {
  const dx = Math.max(box.x - point.x, 0, point.x - (box.x + box.width));
  const dy = Math.max(box.y - point.y, 0, point.y - (box.y + box.height));
  return Math.hypot(dx, dy);
}

function nearestNode(point: { x: number; y: number }, nodes: AdaptedNode[], exclude?: string): AdaptedNode | undefined {
  const ranked = nodes
    .filter((node) => node.semanticId !== exclude)
    .map((node) => ({ node, distance: distanceToBox(point, node.base) }))
    .sort((a, b) => a.distance - b.distance);
  return ranked[0] && ranked[0].distance <= 80 ? ranked[0].node : undefined;
}

function shiftedConnectorTag(tag: OpenTag, start: AdaptedNode, end: AdaptedNode): string {
  const attrs = parseAttrs(tag.raw);
  let next = tag.raw;
  if (tag.name === "path" && attrs.d) {
    next = withAttrs(next, { d: shiftPath(attrs.d, { x: start.dx, y: start.dy }, { x: end.dx, y: end.dy }) });
  } else if (tag.name === "line") {
    next = withAttrs(next.replace(/^<line\b/, "<path"), {
      d: `M${fmt(Number(attrs.x1) + start.dx)} ${fmt(Number(attrs.y1) + start.dy)} L${fmt(Number(attrs.x2) + end.dx)} ${fmt(Number(attrs.y2) + end.dy)}`,
    });
  } else if (tag.name === "polyline" && attrs.points) {
    const values = attrs.points.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g)?.map(Number) ?? [];
    if (values.length >= 4) {
      values[0] = values[0]! + start.dx;
      values[1] = values[1]! + start.dy;
      values[values.length - 2] = values[values.length - 2]! + end.dx;
      values[values.length - 1] = values[values.length - 1]! + end.dy;
      const points = values.reduce<string[]>((out, value, index) => {
        if (index % 2 === 0) out.push(fmt(value));
        else out[out.length - 1] += `,${fmt(value)}`;
        return out;
      }, []);
      next = withAttrs(next.replace(/^<polyline\b/, "<path"), {
        d: points.map((point, index) => `${index === 0 ? "M" : "L"}${point.replace(",", " ")}`).join(" "),
      });
    }
  }
  return withAttrs(next, {
    "data-sx-live-edge": "true",
    "data-sx-live-start": start.semanticId,
    "data-sx-live-end": end.semanticId,
    "data-sx-live-mode": pathPoints(parseAttrs(next).d ?? "") ? "orthogonal" : "sampled",
  });
}

export function adaptLegacyInteractiveSvg(options: {
  type: DiagramType;
  source: string;
  svg: string;
  ast: unknown;
  scene: SceneItem[];
  pins?: Map<string, { x: number; y: number }>;
}): string {
  const { type, source, ast, scene, pins } = options;
  const candidates = discoverTextCandidates(source, type);
  const tags = scanOpenTags(options.svg);
  const texts = discoverSvgTexts(options.svg, tags);
  const replacements: Replacement[] = [];
  const claimedGroups = new Set<number>();
  const adaptedNodes: AdaptedNode[] = [];
  const stableNodes = collectStableNodes(ast, type);
  const stableIdentities = bareIdentityReferences(
    source,
    stableNodes.map((node) => node.semanticId),
    candidates
  );
  const logicIdentities = type === "logic"
    ? logicIdentityReferences(source, ast, candidates)
    : new Map<string, SourceRange[]>();

  const replaceTag = (tag: OpenTag, raw: string): void => {
    replacements.push({ start: tag.start, end: tag.end, text: raw });
  };

  for (const node of stableNodes) {
    const semanticGroup = semanticNodeGroup(options.svg, tags, node.semanticId);
    const match = node.labels.flatMap((label) => texts.filter((candidate) => !candidate.used && candidate.value === normalizeText(label)))
      .map((candidate) => ({ candidate, group: semanticGroup ?? preferredNodeGroup(options.svg, candidate) }))
      .find((entry) => entry.group && !claimedGroups.has(entry.group.start));
    if (!match?.group) continue;
    const label = node.labels.find((value) => normalizeText(value) === match.candidate.value) ?? match.candidate.value;
    const identityRanges = normalizeText(label) === normalizeText(node.semanticId)
      ? stableIdentities.get(node.semanticId)
      : undefined;
    const range = findCandidate(candidates, label);
    if (range) range.used = true;
    match.candidate.used = true;
    claimedGroups.add(match.group.start);
    const base = nodeBox(match.candidate);
    const pin = pins?.get(node.semanticId);
    const dx = pin && (node.mode === "free" || node.mode === "move-x") ? pin.x - base.x : 0;
    const dy = pin && (node.mode === "free" || node.mode === "move-y") ? pin.y - base.y : 0;
    const bbox = { ...base, x: base.x + dx, y: base.y + dy };
    const key = `legacy-node:${node.semanticId}`;
    replaceTag(match.group, withTranslate(withAttrs(match.group.raw, { "data-sx-key": key }), dx, dy));
    replaceTag(match.candidate.tag, withAttrs(match.candidate.tag.raw, {
      "data-sx-owner": key,
      "data-sx-role": "label",
    }));
    scene.push({
      key,
      kind: "node",
      semanticId: node.semanticId,
      label,
      labelWrite: identityRanges ? "identifier" : undefined,
      sourceRange: identityRanges?.[0] ?? range?.range,
      labelSourceRanges: identityRanges,
      bbox,
      editable: { label: identityRanges !== undefined || range !== undefined, position: node.mode },
    });
    adaptedNodes.push({ semanticId: node.semanticId, base, dx, dy, group: match.group });
  }

  // Infer connector ownership from semantic node geometry. This keeps legacy
  // engines truthful during the gesture and reconnects pinned endpoints on the
  // next render without requiring 19 copies of the same SVG plumbing.
  for (const tag of tags) {
    if (!["path", "line", "polyline"].includes(tag.name)) continue;
    const ancestors = ancestorsOf(tag);
    if (ancestors.some((ancestor) => claimedGroups.has(ancestor.start))) continue;
    const attrs = parseAttrs(tag.raw);
    const from = attrs["data-from"];
    const to = attrs["data-to"];
    if (from || to) {
      const start = adaptedNodes.find((node) => node.semanticId.toLowerCase() === from?.toLowerCase());
      const end = adaptedNodes.find((node) => node.semanticId.toLowerCase() === to?.toLowerCase());
      if (start || end) {
        const placeholder = (semanticId: string): AdaptedNode => ({
          semanticId,
          base: { x: 0, y: 0, width: 0, height: 0 },
          dx: 0,
          dy: 0,
          group: tag,
        });
        replaceTag(tag, shiftedConnectorTag(
          tag,
          start ?? placeholder(from ?? ""),
          end ?? placeholder(to ?? ""),
        ));
        continue;
      }
    }
    const endpoints = elementEndpoints(tag);
    if (!endpoints) continue;
    const start = nearestNode(endpoints.start, adaptedNodes);
    const end = nearestNode(endpoints.end, adaptedNodes, start?.semanticId);
    if (!start || !end) continue;
    replaceTag(tag, shiftedConnectorTag(tag, start, end));
  }

  if (type === "gitgraph") {
    for (const [name, ranges] of gitBranchReferences(source)) {
      const text = texts.find((entry) => !entry.used && entry.value === normalizeText(name));
      if (!text || !ranges[0]) continue;
      text.used = true;
      const key = `gitgraph:branch:${name}`;
      replaceTag(text.tag, withAttrs(text.tag.raw, {
        "data-sx-key": key,
        "data-sx-role": "label",
      }));
      scene.push({
        key,
        kind: "label",
        semanticId: `branch:${name}`,
        label: name,
        labelWrite: "identifier",
        sourceRange: ranges[0],
        labelSourceRanges: ranges,
        bbox: nodeBox(text),
        editable: { label: true, position: "none" },
      });
    }
  }

  if (type === "logic") {
    for (const [name, ranges] of logicIdentities) {
      if (scene.some((item) => item.semanticId === name && item.editable.label)) continue;
      const text = texts.find((entry) => !entry.used && entry.value === normalizeText(name));
      if (!text || !ranges[0]) continue;
      text.used = true;
      const key = `logic:signal:${name}`;
      replaceTag(text.tag, withAttrs(text.tag.raw, {
        "data-sx-key": key,
        "data-sx-role": "label",
      }));
      scene.push({
        key,
        kind: "label",
        semanticId: `signal:${name}`,
        label: name,
        labelWrite: "identifier",
        sourceRange: ranges[0],
        labelSourceRanges: ranges,
        bbox: nodeBox(text),
        editable: { label: true, position: "none" },
      });
    }
  }

  for (const candidate of candidates) {
    if (candidate.used) continue;
    const text = texts.find((entry) => !entry.used && svgTextMatchesCandidate(entry.value, candidate.value));
    if (!text) continue;
    candidate.used = true;
    text.used = true;
    const key = candidate.title && !scene.some((item) => item.semanticId === TITLE_SCENE_ID)
      ? "title"
      : `legacy-label:${scene.length}`;
    const base = nodeBox(text);
    const semanticId = key === "title" ? TITLE_SCENE_ID : undefined;
    const pin = semanticId ? pins?.get(semanticId) : undefined;
    const dx = pin ? pin.x - base.x : 0;
    const dy = pin ? pin.y - base.y : 0;
    const bbox = { ...base, x: base.x + dx, y: base.y + dy };
    replaceTag(text.tag, withTranslate(withAttrs(text.tag.raw, {
      "data-sx-key": key,
      "data-sx-role": "label",
    }), dx, dy));
    scene.push({
      key,
      kind: "label",
      semanticId,
      label: candidate.value,
      labelWrite: candidate.labelWrite,
      sourceRange: candidate.range,
      bbox,
      editable: { label: true, position: semanticId ? "free" : "none" },
    });
  }

  return applyReplacements(options.svg, replacements);
}
