/**
 * Build MCP `tools/call` content blocks for a renderDsl result.
 *
 * Why this exists: clients (Claude.ai, Claude Desktop) do not render arbitrary
 * SVG that arrives as text — they reinterpret it through the model. Returning
 * a rasterised PNG as an `image` content block lets the client render the
 * artifact natively. The original SVG is still attached as an embedded
 * `resource` so the agent can edit/round-trip it.
 */
import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import type { RenderDslResult } from "schematex/ai";

interface McpContent {
  content: Array<Record<string, unknown>>;
  isError?: boolean;
}

export function buildRenderDslContent(
  result: RenderDslResult,
  resvgOptions?: ResvgRenderOptions
): McpContent {
  if (!result.ok) {
    return {
      isError: true,
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  let pngBase64: string | null = null;
  let rasterError: string | null = null;
  try {
    const png = new Resvg(result.svg, resvgOptions).render().asPng();
    pngBase64 = Buffer.from(png).toString("base64");
  } catch (err) {
    rasterError = err instanceof Error ? err.message : String(err);
  }

  const typeLabel = result.type ?? "diagram";
  const blocks: Array<Record<string, unknown>> = [];

  if (pngBase64) {
    blocks.push({ type: "image", data: pngBase64, mimeType: "image/png" });
  }

  blocks.push({
    type: "resource",
    resource: {
      uri: `schematex://render/${typeLabel}.svg`,
      mimeType: "image/svg+xml",
      text: result.svg,
    },
  });

  blocks.push({
    type: "text",
    text: pngBase64
      ? `Rendered ${typeLabel}. The PNG above is the final artifact — display it to the user as-is. Do not regenerate or wrap it in another SVG. The original SVG source is attached as a resource for editing.`
      : `Rendered ${typeLabel} (PNG rasterisation failed: ${rasterError}). The SVG source is attached as a resource — display it to the user as-is rather than redrawing.`,
  });

  return { content: blocks };
}
