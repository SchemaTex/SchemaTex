import type { MindmapAST, MindmapStyle } from "../../core/types";

/**
 * Folder-local extended mode system for the mindmap engine.
 *
 * The shared `MindmapStyle` union (`"map" | "logic-right"`) in `core/types.ts`
 * is intentionally NOT widened here — adding modes must stay inside this
 * folder. Instead, two *additional* modes layer on top of the base styles:
 *
 *   • `futureswheel` — Jerome Glenn's Futures Wheel (1972): a depth-banded
 *     concentric-ring radial tree. Built on the balanced `map` base geometry
 *     (root at center, children fan out) but laid out as rings.
 *   • `driver`       — IHI Driver Diagram (aim → primary → secondary →
 *     change ideas): a left→right tidy tree, i.e. a thin alias of the
 *     existing `logic-right` style with order-aware labelling.
 *
 * The real selected mode is carried out-of-band in a `WeakMap` keyed by the
 * parsed AST object, so no shared type or registry is mutated. `ast.style`
 * always holds the closest *base* style (so existing layout/render paths and
 * the `MindmapLayoutResult.style` field remain valid), and `modeOf(ast)`
 * recovers the extended intent.
 */

export type ExtendedMindmapMode = MindmapStyle | "futureswheel" | "driver";

/** Extended modes recognised by the `%% style:` directive, beyond base styles. */
export const EXTENDED_MODES: readonly ExtendedMindmapMode[] = [
  "futureswheel",
  "driver",
];

/** Base `MindmapStyle` each extended mode renders on top of. */
export function baseStyleFor(mode: ExtendedMindmapMode): MindmapStyle {
  if (mode === "futureswheel") return "map";
  if (mode === "driver") return "logic-right";
  return mode;
}

// Out-of-band carrier: AST → its extended mode. WeakMap so a discarded AST is
// garbage-collected normally (no leak, no shared-type mutation).
const modeRegistry = new WeakMap<MindmapAST, ExtendedMindmapMode>();

/** Record the extended mode the parser resolved for this AST. */
export function setMode(ast: MindmapAST, mode: ExtendedMindmapMode): void {
  modeRegistry.set(ast, mode);
}

/** Recover the extended mode; falls back to the AST's base `style`. */
export function modeOf(ast: MindmapAST): ExtendedMindmapMode {
  return modeRegistry.get(ast) ?? ast.style;
}
