/**
 * Core API — public surface of Lineage.
 *
 * render(text)          → SVG string
 * parse(text)           → AST (for advanced use)
 * renderToElement(text) → SVGElement (browser only)
 */

import type { DiagramAST } from "./types";

export interface LineageConfig {
  /** Diagram type auto-detected from text, or set explicitly */
  type?: "genogram" | "ecomap" | "pedigree";
  /** SVG width in px. Default: auto (fit content) */
  width?: number;
  /** SVG height in px. Default: auto (fit content) */
  height?: number;
  /** Padding around the diagram in px. Default: 20 */
  padding?: number;
  /** Theme: 'default' | 'clinical' | 'minimal' */
  theme?: string;
  /** Font family. Default: system-ui */
  fontFamily?: string;
}

/**
 * Parse text DSL into an AST without rendering.
 */
export function parse(_text: string, _config?: LineageConfig): DiagramAST {
  // TODO: implement parser pipeline
  // 1. detect diagram type from first keyword
  // 2. delegate to type-specific parser
  // 3. return AST
  throw new Error("Not implemented yet — see CLAUDE.md for development plan");
}

/**
 * Render text DSL to an SVG string.
 */
export function render(text: string, config?: LineageConfig): string {
  const ast = parse(text, config);
  // TODO: implement render pipeline
  // 1. AST → layout (compute positions)
  // 2. layout → SVG string
  void ast;
  throw new Error("Not implemented yet — see CLAUDE.md for development plan");
}
