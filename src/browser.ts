/**
 * Browser-specific utilities for Schematex.
 *
 * These APIs require a DOM environment. Do not import in SSR/Node contexts.
 *
 * @example
 * ```ts
 * import { renderToElement, renderToContainer } from 'schematex/browser';
 *
 * const svg = renderToElement('genogram\n  alice [female]');
 * document.getElementById('diagram')!.appendChild(svg);
 * ```
 */

import { render, type SchematexConfig } from "./core/api";

/**
 * Render DSL text to a live `SVGSVGElement` ready to insert into the DOM.
 */
export function renderToElement(
  text: string,
  config?: SchematexConfig
): SVGSVGElement {
  const svgString = render(text, config);
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const el = doc.documentElement;
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`SVG parse error: ${parseError.textContent}`);
  }
  return el as unknown as SVGSVGElement;
}

/**
 * Render DSL text and inject SVG into a container element (replaces innerHTML).
 */
export function renderToContainer(
  text: string,
  container: Element,
  config?: SchematexConfig
): void {
  container.innerHTML = render(text, config);
}

export { render, type SchematexConfig } from "./core/api";
