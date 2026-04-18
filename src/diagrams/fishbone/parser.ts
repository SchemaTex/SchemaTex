import type {
  FishboneAST,
  FishboneCauseSide,
  FishboneDensity,
  FishboneNode,
  FishboneOrientation,
  FishboneSides,
} from "../../core/types";

export class FishboneParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FishboneParseError";
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
 *   category content "内容 Content"
 *   category tech    "技术 Technical"
 *   content : "更新频率下降"
 *   content : "关键词未覆盖"
 *     - "长尾词无内容"
 *     - "竞品占位 H1"
 *
 * Style B — compact shorthand (convenient for quick authoring, AI output)
 *
 *   fishbone "Title"
 *   effect "Problem statement"
 *   category Content: 更新频率下降; 同质化严重; 关键词未覆盖
 *   category Technical: Core Web Vitals 差; 索引覆盖率下降
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
      if (!lastLevel1) {
        throw new FishboneParseError(
          `Sub-cause at line ${i + 1} has no preceding Level-1 cause: "${trimmed}"`
        );
      }
      const subText = stripQuotes(trimmed.slice(1).trim());
      if (!subText) continue;
      lastLevel1.children.push({ label: subText, children: [] });
      continue;
    }

    // effect "..."
    if (/^effect\b/i.test(trimmed)) {
      const m = trimmed.match(/^effect\s*:?\s*(.*)$/i);
      if (m) effect = stripQuotes(m[1] ?? "");
      continue;
    }

    // config key = value
    if (/^config\b/i.test(trimmed)) {
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
          `Unknown category "${catId}" at line ${i + 1}. Declare with \`category ${catId} "..."\` first.`
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
      continue;
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
  for (const ch of s) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === "#" && !inQuote) break;
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
