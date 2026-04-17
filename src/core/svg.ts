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
 *   group({ class: 'lineage-generation-0', transform: 'translate(0, 0)' }, [
 *     rect({ x: 100, y: 50, width: 40, height: 40, class: 'lineage-node' }),
 *     text({ x: 120, y: 110, class: 'lineage-label' }, 'John'),
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
