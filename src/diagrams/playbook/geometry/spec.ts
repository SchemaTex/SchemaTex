/**
 * Per-sport geometry contract. Each sport module places players, builds zones,
 * resolves sport-specific named moves, computes the field window, and draws the
 * field/court/pitch. The layout + renderer stay sport-agnostic once a module is
 * selected.
 */

import type { PlaybookTokens, ResolvedTheme } from "../../../core/theme";
import type {
  MoveGeom,
  PlaybookAst,
  PlaybookLayoutResult,
  PlaybookMove,
  PlayerGeom,
  ZoneGeom,
} from "../types";

export type PbTheme = ResolvedTheme<PlaybookTokens>;

/** Render-space transform: native unit → px, plus axis mappers. */
export interface RenderCtx {
  X: (u: number) => number;
  Y: (u: number) => number;
  px: (u: number) => number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface LegendItem {
  /** Swatch kind drawn by the renderer. */
  kind: "offense" | "defense" | "gk" | "run" | "pass" | "dribble" | "screen" | "shot" | "motion" | "zone";
  label: string;
}

export interface SportModule {
  /** px per native unit at the default scale. */
  scale: number;
  /** Flip y on render so larger native-y is drawn upward (football downfield). */
  yUp: boolean;
  /** Build the final player list (preset roster + explicit overrides). */
  buildPlayers(ast: PlaybookAst): PlayerGeom[];
  /** Coverage / responsibility zones (may be empty). */
  buildZones(ast: PlaybookAst, players: PlayerGeom[]): ZoneGeom[];
  /**
   * Resolve a sport-specific named move (football route tree, etc.). Return
   * null to fall through to the generic resolver in layout.ts.
   */
  resolveNamed?(
    m: PlaybookMove,
    src: { x: number; y: number },
    players: PlayerGeom[],
    byId: Map<string, number>,
    warnings: string[]
  ): MoveGeom | null;
  /** Resolve a court/pitch landmark name (e.g. "wing", "elbow", "byline"). */
  resolveLandmark?(name: string): { x: number; y: number } | null;
  /** Field window in native units, given the resolved content. */
  bounds(ast: PlaybookAst, players: PlayerGeom[], moves: MoveGeom[], zones: ZoneGeom[]): Bounds;
  /** Draw the field / court / pitch markings (SVG fragment). */
  drawField(lay: PlaybookLayoutResult, ctx: RenderCtx, t: PbTheme): string;
  /** Legend entries relevant to this sport. */
  legend(lay: PlaybookLayoutResult): LegendItem[];
}
