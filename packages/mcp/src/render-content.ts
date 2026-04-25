/**
 * Build MCP `tools/call` content blocks for a renderDsl result.
 *
 * stdio MCP runs locally without a Blob store, so we cannot return a public
 * URL like the hosted endpoint does. We return the SVG as an embedded
 * `resource` block — clients that support inline SVG resources will render
 * it natively; others will at least surface it for the agent to edit.
 *
 * No server-side rasterisation: resvg's CSS support diverges from real
 * browsers (CSS variables, descendant selectors, font metrics) and breaks
 * WYSIWYG with the Schematex playground.
 */
import type { RenderDslResult } from "schematex/ai";

interface McpContent {
  content: Array<Record<string, unknown>>;
  isError?: boolean;
}

export function buildRenderDslContent(result: RenderDslResult): McpContent {
  if (!result.ok) {
    return {
      isError: true,
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  const typeLabel = result.type ?? "diagram";

  return {
    content: [
      {
        type: "resource",
        resource: {
          uri: `schematex://render/${typeLabel}.svg`,
          mimeType: "image/svg+xml",
          text: result.svg,
        },
      },
      {
        type: "text",
        text: `Rendered ${typeLabel}. The SVG is attached as a resource — display it to the user as-is. Do not regenerate or redraw it.`,
      },
    ],
  };
}
