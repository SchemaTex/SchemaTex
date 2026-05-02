/**
 * Tiny SVG builder utility.
 *
 * Handles XML escaping, attribute formatting, and nesting.
 * Avoids raw string concatenation fragility.
 *
 * @example
 * ```ts
 * const svg = svgRoot({ width: 800, height: 600, viewBox: '0 0 800 600' }, [
 *   defs([
 *     pattern({ id: 'half-fill', ... }, [...]),
 *   ]),
 *   group({ class: 'schematex-generation-0', transform: 'translate(0, 0)' }, [
 *     rect({ x: 100, y: 50, width: 40, height: 40, class: 'schematex-node' }),
 *     text({ x: 120, y: 110, class: 'schematex-label' }, 'John'),
 *   ]),
 * ]);
 * ```
 */

// ─── XML Escaping ────────────────────────────────────────────

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escapeXml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

// ─── Attribute Formatting ────────────────────────────────────

type Attrs = Record<string, string | number | undefined>;

function formatAttrs(attrs: Attrs): string {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
    .join(" ");
}

// ─── Element Builders ────────────────────────────────────────

export function el(
  tag: string,
  attrs: Attrs,
  children?: string | string[]
): string {
  const attrStr = formatAttrs(attrs);
  const open = attrStr ? `<${tag} ${attrStr}` : `<${tag}`;

  if (children === undefined) {
    return `${open}/>`;
  }

  const content = Array.isArray(children) ? children.join("\n") : children;
  return `${open}>${content}</${tag}>`;
}

// Convenience wrappers for common SVG elements

export function svgRoot(attrs: Attrs, children: string[]): string {
  return el(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      "xmlns:xlink": "http://www.w3.org/1999/xlink",
      ...attrs,
    },
    children
  );
}

export function defs(children: string[]): string {
  return el("defs", {}, children);
}

export function group(attrs: Attrs, children: string[]): string {
  return el("g", attrs, children);
}

export function rect(attrs: Attrs): string {
  return el("rect", attrs);
}

export function circle(attrs: Attrs): string {
  return el("circle", attrs);
}

export function line(attrs: Attrs): string {
  return el("line", attrs);
}

export function path(attrs: Attrs): string {
  return el("path", attrs);
}

export function text(attrs: Attrs, content: string): string {
  return el("text", attrs, escapeXml(content));
}

interface Segment { text: string; bold: boolean; italic: boolean }

function parseInlineSegments(line: string): Segment[] {
  const out: Segment[] = [];
  let bold = false;
  let italic = false;
  let buf = "";
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);
    const m = /^<(\/?)([bi])>/i.exec(rest);
    if (m) {
      if (buf) { out.push({ text: buf, bold, italic }); buf = ""; }
      const isClose = m[1] === "/";
      const tag = m[2]!.toLowerCase();
      if (tag === "b") bold = !isClose;
      else italic = !isClose;
      i += m[0].length;
    } else {
      buf += line[i];
      i++;
    }
  }
  if (buf) out.push({ text: buf, bold, italic });
  return out;
}

function segmentTspan(
  seg: Segment,
  extra: Attrs
): string {
  const a: Attrs = { ...extra };
  if (seg.bold) a["font-weight"] = "bold";
  if (seg.italic) a["font-style"] = "italic";
  return el("tspan", a, escapeXml(seg.text));
}

/** Splits on `<br/>`/`<br>`/`\n` into vertically centered `<tspan>` rows. Honors inline `<b>`/`<i>` per segment. */
export function multilineText(
  attrs: Attrs & { x: number | string },
  content: string,
  lineHeight = 14
): string {
  const lines = String(content).split(/<br\s*\/?>|\n/i);
  const total = (lines.length - 1) * lineHeight;
  const tspans: string[] = [];
  lines.forEach((ln, lineIdx) => {
    const segs = parseInlineSegments(ln);
    const rendered = segs.length === 0 ? [{ text: "", bold: false, italic: false }] : segs;
    rendered.forEach((seg, segIdx) => {
      // Only the first segment of each line carries x + dy (line break);
      // subsequent segments inherit position and continue inline.
      const extra: Attrs = {};
      if (segIdx === 0) {
        extra.x = attrs.x;
        extra.dy = lineIdx === 0 ? -total / 2 : lineHeight;
      }
      tspans.push(segmentTspan(seg, extra));
    });
  });
  return el("text", attrs, tspans.join(""));
}

export function title(content: string): string {
  return el("title", {}, escapeXml(content));
}

export function desc(content: string): string {
  return el("desc", {}, escapeXml(content));
}

export function pattern(attrs: Attrs, children: string[]): string {
  return el("pattern", attrs, children);
}

export function polygon(attrs: Attrs): string {
  return el("polygon", attrs);
}
