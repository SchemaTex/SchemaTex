/**
 * Shared text-width estimation for all diagram layouts.
 *
 * Schematex renders to static SVG with no DOM access, so layouts must
 * *estimate* how wide a label will paint. Before this module, five diagram
 * families each carried their own estimator with different per-char factors
 * and different CJK detection ranges — porting a label from one family to
 * another changed its measured width. This is the single source of truth;
 * new families must use it, existing families migrate as they're touched.
 *
 * The model is a char-class weighted sum (not a single average): full-width
 * glyphs count 1.0 × fontSize, narrow Latin (i, l, punctuation) ~0.32 ×,
 * digits/uppercase ~0.66 ×, other Latin ~0.54 ×. This tracks system-ui within
 * a few percent for typical diagram labels — and critically, it does not
 * under-measure CJK, the main overflow source for LLM-generated diagrams.
 */

/**
 * Full-width character detection — one rule for the whole library.
 * Covers CJK Unified Ideographs (+ext A), Hiragana/Katakana, Hangul,
 * CJK punctuation (U+3000–303F), and full-width forms (U+FF00–FF60).
 */
const FULL_WIDTH_RE =
  /[ᄀ-ᇿ⺀-〿぀-ヿ㄰-㆏㇀-㏿㐀-䶿一-鿿ꥠ-꥿가-퟿豈-﫿︰-﹏＀-｠￠-￦]/;

export function isFullWidth(ch: string): boolean {
  return FULL_WIDTH_RE.test(ch);
}

/** Narrow Latin glyphs and punctuation (~0.32 × fontSize). */
const NARROW_RE = /[iIljtf.,:;'"!|()[\]{}` ]/;

/** Wide-ish Latin: digits, uppercase, and the widest lowercase (~0.66 ×). */
const WIDE_RE = /[0-9A-HK-Z@#%&mwMW_<>=+~^$]/;

export interface EstimateTextWidthOptions {
  /** CSS font-weight; ≥600 widens the estimate ~6%. Default 400. */
  fontWeight?: number;
  /** Monospace stacks: every non-full-width char is 0.6 × fontSize. */
  monospace?: boolean;
}

/**
 * Estimated painted width in px of a single-line string at `fontSize`,
 * assuming the library's system-ui stack (or a monospace stack with
 * `monospace: true`).
 */
export function estimateTextWidth(
  text: string,
  fontSize: number,
  opts: EstimateTextWidthOptions = {}
): number {
  let units = 0;
  for (const ch of text) {
    if (isFullWidth(ch)) {
      units += 1.0;
    } else if (opts.monospace) {
      units += 0.6;
    } else if (NARROW_RE.test(ch)) {
      units += 0.32;
    } else if (WIDE_RE.test(ch)) {
      units += 0.66;
    } else {
      units += 0.54;
    }
  }
  const weightFactor = (opts.fontWeight ?? 400) >= 600 ? 1.06 : 1.0;
  return units * fontSize * weightFactor;
}

/**
 * Width of the widest line in a multi-line string (split on \n).
 */
export function estimateMaxLineWidth(
  text: string,
  fontSize: number,
  opts: EstimateTextWidthOptions = {}
): number {
  let max = 0;
  for (const line of text.split("\n")) {
    const w = estimateTextWidth(line, fontSize, opts);
    if (w > max) max = w;
  }
  return max;
}

/**
 * Deterministically wrap text to a measured pixel width.
 *
 * Explicit newlines are always preserved. Latin text prefers word boundaries;
 * CJK and over-wide tokens fall back to code-point boundaries. This is layout
 * input, not a renderer convenience: every consumer receives the exact lines
 * whose bounds it must reserve.
 */
export function wrapTextToWidth(
  text: string,
  fontSize: number,
  maxWidth: number,
  opts: EstimateTextWidthOptions = {}
): string[] {
  const output: string[] = [];

  const pushParagraph = (paragraph: string): void => {
    if (paragraph === "") {
      output.push("");
      return;
    }

    let line = "";
    let lastBreak = -1;
    for (const ch of paragraph) {
      const candidate = line + ch;
      if (
        line &&
        estimateTextWidth(candidate, fontSize, opts) > maxWidth
      ) {
        if (lastBreak >= 0) {
          const head = line.slice(0, lastBreak).trimEnd();
          const tail = line.slice(lastBreak).trimStart();
          if (head) output.push(head);
          line = tail;
        } else {
          output.push(line);
          line = "";
        }
        lastBreak = -1;
      }

      if (ch === " " && line.length > 0) lastBreak = line.length;
      line += ch;
      if (isFullWidth(ch)) lastBreak = line.length;
    }
    if (line.trim().length > 0) output.push(line.trim());
  };

  for (const paragraph of String(text).split(/\r?\n/)) {
    pushParagraph(paragraph);
  }
  return output.length > 0 ? output : [""];
}
