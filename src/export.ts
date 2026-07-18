/**
 * Browser export utilities for Schematex SVG output.
 *
 * All APIs require a browser DOM + Canvas environment.
 * For Node.js PNG generation, use sharp or puppeteer externally.
 *
 * @example
 * ```ts
 * import { render } from 'schematex';
 * import { svgToPngBlob, downloadBlob } from 'schematex/export';
 *
 * const svg = render('genogram\n  alice [female]');
 * const png = await svgToPngBlob(svg, { scale: 2 });
 * downloadBlob(png, 'diagram.png');
 * ```
 */

export interface PngExportOptions {
  /** Pixel ratio multiplier. Default: 2 (retina/2×). */
  scale?: number;
  /** Background fill color. Default: null (transparent). Pass a color string (e.g. 'white') to fill. */
  background?: string | null;
}

/** Add an opaque white paint layer without disturbing SVG title/description metadata. */
export function withWhiteSvgBackground(svgString: string): string {
  if (svgString.includes('data-sx-export-background="true"')) return svgString;
  const open = svgString.match(/<svg\b[^>]*>/)?.[0];
  if (!open) return svgString;
  const descEnd = svgString.indexOf("</desc>");
  const titleEnd = svgString.indexOf("</title>");
  const insertAt = descEnd >= 0
    ? descEnd + "</desc>".length
    : titleEnd >= 0
      ? titleEnd + "</title>".length
      : svgString.indexOf(open) + open.length;
  const background = '<rect width="100%" height="100%" fill="#ffffff" data-sx-export-background="true"/>';
  return `${svgString.slice(0, insertAt)}${background}${svgString.slice(insertAt)}`;
}

/**
 * Convert an SVG string to a PNG Blob using Canvas.
 * Resolves at @2× by default for crisp retina output.
 */
export function svgToPngBlob(
  svgString: string,
  options: PngExportOptions = {}
): Promise<Blob> {
  const { scale = 2, background = null } = options;

  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const w = img.naturalWidth || img.width || 800;
      const h = img.naturalHeight || img.height || 600;
      const canvas = document.createElement("canvas");
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get 2D canvas context"));
        return;
      }
      ctx.scale(scale, scale);
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (pngBlob) => {
          if (pngBlob) resolve(pngBlob);
          else reject(new Error("canvas.toBlob returned null"));
        },
        "image/png"
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG as image"));
    };

    img.src = url;
  });
}

/**
 * Trigger a browser file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Open SVG in a print-ready popup and trigger the browser's print dialog
 * (allows Save as PDF via the OS print driver).
 */
export function printSvgAsPdf(svgString: string, title = "Schematex Diagram"): void {
  const printSvg = withWhiteSvgBackground(svgString);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; color: #111; }
  body { display: flex; justify-content: center; align-items: flex-start; }
  svg { max-width: 100%; height: auto; display: block; }
  @media print {
    body { display: block; }
    svg { width: 100%; page-break-inside: avoid; }
  }
</style>
</head>
<body>${printSvg}</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    // Popup blocked — fallback: open SVG directly
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    window.open(URL.createObjectURL(blob), "_blank");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}
