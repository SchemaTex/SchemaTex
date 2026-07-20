import type { RenderConfig, SourceRange } from "./types";

/** Reserved semantic id for the one diagram-level title scene item. */
export const TITLE_SCENE_ID = "@title";

export interface ResolvedSceneTitle {
  x: number;
  y: number;
  bbox: { x: number; y: number; width: number; height: number };
  attrs: {
    "data-sx-key"?: string;
    "data-sx-role"?: string;
  };
}

/** Resolve an authored/default title position and register its scene item. */
export function resolveSceneTitle(
  title: string,
  sourceRange: SourceRange | undefined,
  defaultCenterX: number,
  defaultBaselineY: number,
  config?: RenderConfig
): ResolvedSceneTitle {
  const width = Math.max(48, title.length * 9 + 10);
  const height = 22;
  const baselineOffset = 17;
  const pin = config?.__pins?.get(TITLE_SCENE_ID);
  const bbox = {
    x: pin?.x ?? defaultCenterX - width / 2,
    y: pin?.y ?? defaultBaselineY - baselineOffset,
    width,
    height,
  };

  config?.__scene?.push({
    key: "title",
    kind: "label",
    semanticId: TITLE_SCENE_ID,
    label: title,
    sourceRange,
    bbox,
    editable: { label: sourceRange !== undefined, position: "free" },
  });

  return {
    x: bbox.x + width / 2,
    y: bbox.y + baselineOffset,
    bbox,
    attrs: {
      "data-sx-key": config?.__scene ? "title" : undefined,
      "data-sx-role": config?.__scene ? "label" : undefined,
    },
  };
}
