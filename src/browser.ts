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

import {
  render,
  renderPreview,
  type SchematexConfig,
} from "./core/api";

/**
 * Render DSL text to a live `SVGSVGElement` ready to insert into the DOM.
 */
export function renderToElement(
  text: string,
  config?: SchematexConfig
): SVGSVGElement {
  return svgStringToElement(render(text, config));
}

/**
 * Render a live SVG element for an editing/AI-preview surface.
 *
 * Invalid DSL is represented as a diagnostic SVG instead of an empty surface.
 */
export function renderPreviewToElement(
  text: string,
  config?: SchematexConfig
): SVGSVGElement {
  return svgStringToElement(renderPreview(text, config));
}

function svgStringToElement(svgString: string): SVGSVGElement {
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

/** Replace a preview container with an SVG or a visible diagnostic fallback. */
export function renderPreviewToContainer(
  text: string,
  container: Element,
  config?: SchematexConfig
): void {
  container.innerHTML = renderPreview(text, config);
}

export {
  render,
  renderPreview,
  renderResult,
  type SchematexConfig,
} from "./core/api";
