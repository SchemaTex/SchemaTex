import type {
  FishboneAST,
  FishboneCauseSide,
  FishboneDensity,
  FishboneNode,
  FishboneOrientation,
  FishboneSides,
} from "../../core/types";

export class FishboneParseError extends Error {
  public line?: number;
  public source?: string;
  constructor(message: string, line?: number, source?: string) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "FishboneParseError";
    this.line = line;
    this.source = source;
  }
}

interface CategoryDef {
  id: string;
  label: string;
  color?: string;
  side?: "top" | "bottom";
  order?: number;
}

const SLOPE_PRESETS: Record<string, number> = {
  gentle: 0.45,
  normal: 0.6,
  steep: 0.75,
};

/**
 * Fishbone DSL parser.
 *
 * Supports two syntactic styles, mixable in one document:
 *
 * Style A — structured (per 13-FISHBONE-STANDARD §11)
 *
 *   fishbone "Title"
 *   effect "Problem statement"
 *   category content "Content"
 *   category tech    "Technical"
 *   content : "Publishing frequency down"
 *   content : "Keyword gaps"
 *     - "No long-tail coverage"
 *     - "Competitor dominates H1"
 *
 * Style B — compact shorthand (convenient for quick authoring, AI output)
 *
 *   fishbone "Title"
 *   effect "Problem statement"
 *   category Content: Publishing frequency down; Content too generic; Keyword gaps
 *   category Technical: Core Web Vitals failing; Crawl coverage drop
 *
 * Config directives:
 *
 *   config direction = left|right          # head orientation (default right)
 *   config width = 900
 *   config height = 620
 *
 * Lines starting with `#` are comments. Leading whitespace is indentation; a
 * line that begins with `-` (after ≥2 spaces of indent) is a Level-2 sub-cause
 * for the most-recent Level-1 cause.
 */
export function parseFishboneDSL(text: string): FishboneAST {
  const rawLines = text.split(/\r?\n/);

  let title: string | undefined;
  let effect = "";
  let orientation: FishboneOrientation = "ltr";
  let width: number | undefined;
  let height: number | undefined;
  let sides: FishboneSides | undefined;
  let ribSlope: number | undefined;
  let density: FishboneDensity | undefined;
  let causeSide: FishboneCauseSide | undefined;

  const categories: CategoryDef[] = [];
  const causesByCategory = new Map<string, FishboneNode[]>();
  let lastLevel1: FishboneNode | null = null;
  // When a Mermaid-style implicit-category heading is seen, this holds the
  // category id so a following `- foo` becomes its first Level-1 cause and
  // a following bare-text line becomes a Level-1 cause under it directly.
  let implicitActiveCatId: string | null = null;
  let implicitBulletIndent: number | null = null;

  let headerSeen = false;

  const getCat = (id: string): CategoryDef | undefined =>
    categories.find((c) => c.id === id || c.label === id);

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i] ?? "";
    const line = stripComment(raw).trimEnd();
    if (!line.trim()) continue;

    const indent = countIndent(raw);
    const trimmed = line.trim();

    // Header: fishbone "Title"  OR  fishbone: "Title"
    if (!headerSeen && /^fishbone\b/i.test(trimmed)) {
      const m = trimmed.match(/^fishbone\s*:?\s*(.*)$/i);
      if (m && m[1]) title = stripQuotes(m[1]);
      headerSeen = true;
      continue;
    }

    // Sub-cause (Level 2+): starts with "-" after indent
    if (indent >= 2 && trimmed.startsWith("-")) {
      const subText = stripQuotes(trimmed.slice(1).trim());
      if (!subText) continue;
      // Under an implicit category, bullets at the same indentation are
      // sibling Level-1 causes. Deeper bullets remain sub-causes of the last
      // Level-1 item.
      if (
        implicitActiveCatId &&
        (implicitBulletIndent === null || indent <= implicitBulletIndent)
      ) {
        const bucket = causesByCategory.get(implicitActiveCatId)!;
        const node: FishboneNode = { label: subText, children: [] };
        bucket.push(node);
        lastLevel1 = node;
        implicitBulletIndent = indent;
        continue;
      }
      if (lastLevel1) {
        lastLevel1.children.push({ label: subText, children: [] });
        continue;
      }
      // No Level-1 in scope. If an implicit-category heading just declared
      // a category, promote this `- foo` to be its first Level-1 cause so
      // bare Mermaid-mindmap shapes like
      //     Content
      //       - heavy hero image
      // parse cleanly.
      if (implicitActiveCatId) {
        const bucket = causesByCategory.get(implicitActiveCatId)!;
        const node: FishboneNode = { label: subText, children: [] };
        bucket.push(node);
        lastLevel1 = node;
        implicitBulletIndent = indent;
        continue;
      }
      throw new FishboneParseError(
        `Sub-cause has no preceding Level-1 cause`,
        i + 1,
        trimmed
      );
    }

    // effect "..."
    if (/^effect\b/i.test(trimmed)) {
      implicitActiveCatId = null;
      implicitBulletIndent = null;
      const m = trimmed.match(/^effect\s*:?\s*(.*)$/i);
      if (m) effect = stripQuotes(m[1] ?? "");
      continue;
    }

    // config key = value
    if (/^config\b/i.test(trimmed)) {
      implicitActiveCatId = null;
      implicitBulletIndent = null;
      const m = trimmed.match(/^config\s+([a-zA-Z]+)\s*=\s*(.+)$/i);
      if (m) {
        const key = m[1]!.toLowerCase();
        const val = stripQuotes(m[2]!.trim());
        if (key === "direction") {
          orientation = val === "left" || val === "rtl" ? "rtl" : "ltr";
        } else if (key === "width") {
          const n = Number(val);
          if (Number.isFinite(n)) width = n;
        } else if (key === "height") {
          const n = Number(val);
          if (Number.isFinite(n)) height = n;
        } else if (key === "sides") {
          const v = val.toLowerCase();
          if (v === "both" || v === "top" || v === "bottom") sides = v;
        } else if (key === "slope" || key === "ribslope") {
          const preset = SLOPE_PRESETS[val.toLowerCase()];
          if (preset !== undefined) ribSlope = preset;
          else {
            const n = Number(val);
            if (Number.isFinite(n) && n > 0 && n < 3) ribSlope = n;
          }
        } else if (key === "density") {
          const v = val.toLowerCase();
          if (v === "compact" || v === "normal" || v === "spacious") density = v;
        } else if (key === "causeside" || key === "cause-side") {
          const v = val.toLowerCase();
          if (v === "head" || v === "tail" || v === "both") causeSide = v;
        }
      }
      continue;
    }

    // category <id> "<display>" [color: <hex>]
    if (/^category\b/i.test(trimmed)) {
      implicitActiveCatId = null;
      implicitBulletIndent = null;
      const compact = trimmed.match(/^category\s+([^:]+?)\s*:\s*(.+)$/i);
      const structured = trimmed.match(
        /^category\s+([a-zA-Z][\w-]*)\s+("[^"]*"|[^\s[]+)(?:\s*(\[.*\]))?\s*$/i
      );

      if (structured) {
        const id = structured[1]!;
        const label = stripQuotes(structured[2]!);
        const props = parseProps(structured[3] ?? "");
        if (!getCat(id)) {
          const sideProp = props["side"]?.toLowerCase();
          const side =
            sideProp === "top" || sideProp === "bottom" ? sideProp : undefined;
          const orderProp = props["order"];
          const orderNum = orderProp !== undefined ? Number(orderProp) : NaN;
          const order = Number.isFinite(orderNum) ? orderNum : undefined;
          categories.push({ id, label, color: props["color"], side, order });
          causesByCategory.set(id, []);
        }
        lastLevel1 = null;
        continue;
      }

      if (compact) {
        const label = stripQuotes(compact[1]!.trim());
        const id = slugify(label);
        const rest = compact[2]!.trim();
        if (!getCat(id)) {
          categories.push({ id, label });
          causesByCategory.set(id, []);
        }
        // split by `;` for compact style causes
        const bucket = causesByCategory.get(id)!;
        for (const part of rest.split(/[;,]/)) {
          const txt = stripQuotes(part.trim());
          if (txt) {
            const node: FishboneNode = { label: txt, children: [] };
            bucket.push(node);
            lastLevel1 = node;
          }
        }
        continue;
      }
    }

    // <categoryId> : "cause"
    const causeMatch = trimmed.match(/^([a-zA-Z][\w-]*)\s*:\s*(.+)$/);
    if (causeMatch) {
      const catId = causeMatch[1]!;
      const cat = getCat(catId);
      if (!cat) {
        throw new FishboneParseError(
          `Unknown category "${catId}". Declare with \`category ${catId} "..."\` first.`,
          i + 1,
          trimmed
        );
      }
      const bucket = causesByCategory.get(cat.id)!;
      const rest = causeMatch[2]!.trim();
      // `cause_text [prop: value]`
      const { text: causeText } = splitTrailingProps(rest);
      const label = stripQuotes(causeText);
      if (!label) continue;
      const node: FishboneNode = { label, children: [] };
      bucket.push(node);
      lastLevel1 = node;
      implicitActiveCatId = null;
      implicitBulletIndent = null;
      continue;
    }

    // Implicit category — a top-level (indent 0) line that is neither a
    // keyword nor a `catId: cause` shorthand. Mermaid mindmap and most LLM
    // outputs use this shape: bare-word headings on their own line followed
    // by `-` sub-items. We treat the heading as a category whose label is
    // the trimmed text, slugified for the id.
    //
    // We do NOT seed a synthetic Level-1 cause here. The Sub-cause check
    // below has been relaxed so that when `lastLevel1` is null but we just
    // declared an implicit category, `- foo` becomes the first Level-1
    // cause directly. That keeps the AST clean (no phantom anchor entries
    // to prune) and avoids breaking the `config causeSide = both` test
    // which counts causes by index.
    if (
      indent === 0 &&
      !trimmed.startsWith("-") &&
      !trimmed.includes(":") &&
      !trimmed.startsWith("[")
    ) {
      const label = stripQuotes(trimmed);
      if (label) {
        const id = slugify(label);
        if (!getCat(id)) {
          categories.push({ id, label });
          causesByCategory.set(id, []);
        }
        implicitActiveCatId = id;
        implicitBulletIndent = null;
        lastLevel1 = null;
        continue;
      }
    }

    // Unknown line — ignore silently to tolerate alien syntax blends
  }

  if (!effect) {
    // Fallback: use title as effect
    effect = title ?? "";
  }

  if (categories.length === 0) {
    throw new FishboneParseError(
      "Fishbone requires at least one `category`. See docs/reference/13-FISHBONE-STANDARD.md."
    );
  }

  const majors: FishboneNode[] = categories.map((c) => ({
    label: c.label,
    color: c.color,
    children: causesByCategory.get(c.id) ?? [],
    side: c.side,
    order: c.order,
  }));

  return {
    type: "fishbone",
    title,
    effect,
    majors,
    orientation,
    width,
    height,
    sides,
    ribSlope,
    density,
    causeSide,
  };
}

// ─── helpers ─────────────────────────────────────────────────

function stripComment(s: string): string {
  let out = "";
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === '"') inQuote = !inQuote;
    if (!inQuote) {
      if (ch === "#") break;
      if (ch === "/" && s[i + 1] === "/") break;
      if (ch === "%" && s[i + 1] === "%") break;
    }
    out += ch;
  }
  return out;
}

function stripQuotes(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

function countIndent(raw: string): number {
  let n = 0;
  for (const ch of raw) {
    if (ch === " ") n += 1;
    else if (ch === "\t") n += 2;
    else break;
  }
  return n;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "") || "cat"
  );
}

function splitTrailingProps(s: string): { text: string; props: Record<string, string> } {
  const idx = s.lastIndexOf("[");
  if (idx < 0 || !s.trimEnd().endsWith("]")) return { text: s, props: {} };
  const text = s.slice(0, idx).trim();
  const props = parseProps(s.slice(idx));
  return { text, props };
}

function parseProps(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const m = raw.match(/^\[(.*)\]$/s);
  if (!m) return out;
  const inside = m[1]!;
  for (const part of splitTopLevelCommas(inside)) {
    const [k, ...rest] = part.split(":");
    if (!k || rest.length === 0) continue;
    out[k.trim()] = stripQuotes(rest.join(":").trim());
  }
  return out;
}

function splitTopLevelCommas(inside: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let buf = "";
  let inQuote = false;
  for (const ch of inside) {
    if (ch === '"') inQuote = !inQuote;
    if (!inQuote) {
      if (ch === "[") depth += 1;
      else if (ch === "]") depth -= 1;
      else if (ch === "," && depth === 0) {
        parts.push(buf);
        buf = "";
        continue;
      }
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf);
  return parts;
}
