/**
 * Bowtie layout — deterministic bespoke symmetric band model.
 * Per docs/reference/38-BOWTIE-STANDARD.md §5.
 *
 * NOT the flowchart layered-DAG engine: the geometry is prescribed, not solved.
 * The top-event circle is the knot at (cx, cy); threats stack in row bands on
 * the left, consequences on the right, each wing independently centred about
 * cy. Barrier chains x-step outward from the knot, centre-anchored (innermost
 * barriers align in a column near the knot; outer threat/consequence boxes are
 * ragged by chain length — §5.3 default (a)). Escalation factors drop downward
 * from the barrier they degrade, growing the band when present.
 */

import type {
  BowtieAst,
  BowtieBarrier,
  BowtieConsequence,
  BowtieLayoutBox,
  BowtieLayoutEscalationLine,
  BowtieLayoutLine,
  BowtieLayoutResult,
  BowtieThreat,
} from "./types";

export const BOWTIE_CONST = {
  TOPEVENT_R: 52,
  NODE_W: 132,
  NODE_H: 44,
  BARRIER_W: 120,
  WING_X_STEP: 168,
  ROW_BAND_H: 96,
  ROW_GAP: 24,
  EF_DROP: 72,
  EF_GAP: 16,
  CENTER_GUTTER: 40,
  HAZARD_GAP: 40,
  HAZARD_W: 220,
  PAGE_PAD: 32,
  TITLE_H: 34,
  LEGEND_H: 30,
} as const;

/** Bottom extent (below the band centre-line) of a barrier's escalation column. */
function dropBottom(barrier: BowtieBarrier): number {
  const C = BOWTIE_CONST;
  if (barrier.escalations.length === 0) return C.NODE_H / 2;
  let cursor = C.EF_DROP; // centre offset of the next stacked box
  let lastBottom = C.NODE_H / 2;
  for (const esc of barrier.escalations) {
    lastBottom = cursor + C.NODE_H / 2;
    cursor += C.NODE_H + C.EF_GAP;
    for (const _ef of esc.barriers) {
      lastBottom = cursor + C.NODE_H / 2;
      cursor += C.NODE_H + C.EF_GAP;
    }
  }
  return lastBottom;
}

interface Line { id: string; label: string; barriers: BowtieBarrier[]; }

interface BandLayout {
  rel: number[];
  below: number[];
  /** Centre of the band-centre-lines block (used to centre boxes on cy). */
  blockMid: number;
  /** Distance the topmost box's top edge sits above the block centre. */
  aboveExtent: number;
  /** Distance the lowest element (incl. escalation drop) sits below the block centre. */
  belowExtent: number;
}

/**
 * Band centre-lines for a wing. The BOXES are centred about cy via `blockMid`
 * (so a single line sits exactly on cy regardless of any escalation drop);
 * escalation factors hang downward into the whitespace below without re-centring
 * the box. Pitch between consecutive bands accounts for escalation depth so
 * drops never collide with the next band (§5.2.5).
 */
function bandLayout(lines: Line[]): BandLayout {
  const C = BOWTIE_CONST;
  const below = lines.map((l) => Math.max(...l.barriers.map(dropBottom), C.NODE_H / 2));
  const rel: number[] = [];
  for (let k = 0; k < lines.length; k++) {
    if (k === 0) { rel.push(0); continue; }
    const pitch = Math.max(C.ROW_BAND_H, below[k - 1]! + C.ROW_GAP + C.NODE_H / 2);
    rel.push(rel[k - 1]! + pitch);
  }
  const last = lines.length - 1;
  const blockMid = lines.length ? rel[last]! / 2 : 0;
  const aboveExtent = lines.length ? blockMid + C.NODE_H / 2 : 0;
  const belowExtent = lines.length ? (rel[last]! - blockMid) + below[last]! : 0;
  return { rel, below, blockMid, aboveExtent, belowExtent };
}

export function layoutBowtie(ast: BowtieAst): BowtieLayoutResult {
  const C = BOWTIE_CONST;
  const boxes: BowtieLayoutBox[] = [];
  const lines: BowtieLayoutLine[] = [];
  const escalationLines: BowtieLayoutEscalationLine[] = [];

  const threatLines: Line[] = ast.threats.map((t: BowtieThreat) => ({ id: t.id, label: t.label, barriers: t.barriers }));
  const conseqLines: Line[] = ast.consequences.map((c: BowtieConsequence) => ({ id: c.id, label: c.label, barriers: c.barriers }));

  const left = bandLayout(threatLines);
  const right = bandLayout(conseqLines);

  // Knot must fit too. Each wing's boxes are centred about cy via blockMid;
  // the below-cy extent (incl. escalation drops) is captured by the box bounds
  // when sizing the canvas, so only the above-cy extent gates cy here.
  const aboveCy = Math.max(left.aboveExtent, right.aboveExtent, C.TOPEVENT_R);

  // Horizontal: cx places the longest left chain's threat box at PAGE_PAD.
  const maxLeftChain = Math.max(0, ...threatLines.map((l) => l.barriers.length));
  const innerOffset = C.TOPEVENT_R + C.CENTER_GUTTER + C.BARRIER_W / 2;
  const cx = C.PAGE_PAD + C.NODE_W / 2 + maxLeftChain * C.WING_X_STEP + innerOffset;

  // Vertical: title band, then the hazard header (above the wings), then the knot.
  const titleZone = ast.title ? C.TITLE_H : 0;
  const hazardReserve = ast.hazard ? C.NODE_H + C.HAZARD_GAP : 0;
  const cy = C.PAGE_PAD + titleZone + hazardReserve + aboveCy;

  // ── Top event (the knot) ──
  const topEvent = { cx, cy, r: C.TOPEVENT_R, label: ast.topEvent };

  // ── Hazard header (centred above the wings, tied down to the knot) ──
  let hazardTie: BowtieLayoutResult["hazardTie"];
  if (ast.hazard) {
    const hcy = C.PAGE_PAD + titleZone + C.NODE_H / 2;
    boxes.push({ id: "hazard", role: "hazard", label: ast.hazard, cx, cy: hcy, width: C.HAZARD_W, height: C.NODE_H });
    hazardTie = { x: cx, y1: hcy + C.NODE_H / 2, y2: cy - C.TOPEVENT_R };
  }

  // ── A wing's bands: emit boxes + flow line + escalation drops ──
  const emitWing = (
    wing: Line[],
    band: BandLayout,
    side: "prevent" | "mitigate"
  ): void => {
    const innerX = side === "prevent"
      ? cx - C.TOPEVENT_R - C.CENTER_GUTTER - C.BARRIER_W / 2
      : cx + C.TOPEVENT_R + C.CENTER_GUTTER + C.BARRIER_W / 2;

    wing.forEach((line, k) => {
      const by = cy + (band.rel[k]! - band.blockMid);
      const n = line.barriers.length;

      // Barrier x positions (centre-anchored: innermost fixed near the knot).
      const barrierX: number[] = line.barriers.map((_b, j) => {
        if (side === "prevent") {
          // declaration order j: 0 outermost … n-1 innermost.
          const stepsFromInner = n - 1 - j;
          return innerX - stepsFromInner * C.WING_X_STEP;
        }
        // mitigate: declaration order j: 0 innermost … n-1 outermost.
        return innerX + j * C.WING_X_STEP;
      });

      // The threat / consequence box sits one step beyond the outermost barrier.
      const outerBarrierX = side === "prevent"
        ? Math.min(...barrierX)
        : Math.max(...barrierX);
      const headX = side === "prevent"
        ? outerBarrierX - C.WING_X_STEP
        : outerBarrierX + C.WING_X_STEP;

      boxes.push({
        id: line.id,
        role: side === "prevent" ? "threat" : "consequence",
        label: line.label,
        cx: headX,
        cy: by,
        width: C.NODE_W,
        height: C.NODE_H,
      });

      // Barrier boxes + their escalation columns.
      line.barriers.forEach((b, j) => {
        const bx = barrierX[j]!;
        boxes.push({
          id: b.id,
          role: "barrier",
          label: b.label,
          cx: bx,
          cy: by,
          width: C.BARRIER_W,
          height: C.NODE_H,
          side,
          lineId: line.id,
          order: j,
        });
        // Escalation column (drops downward).
        if (b.escalations.length) {
          let cursor = C.EF_DROP;
          let connectFromY = by + C.NODE_H / 2; // bottom of the barrier
          for (const esc of b.escalations) {
            const escCy = by + cursor;
            escalationLines.push({ x: bx, y1: connectFromY, y2: escCy - C.NODE_H / 2 });
            boxes.push({
              id: esc.id,
              role: "escalation",
              label: esc.label,
              cx: bx,
              cy: escCy,
              width: C.NODE_W,
              height: C.NODE_H,
              lineId: line.id,
              barrierId: b.id,
            });
            connectFromY = escCy + C.NODE_H / 2;
            cursor += C.NODE_H + C.EF_GAP;
            for (const ef of esc.barriers) {
              const efCy = by + cursor;
              escalationLines.push({ x: bx, y1: connectFromY, y2: efCy - C.NODE_H / 2 });
              boxes.push({
                id: ef.id,
                role: "ef-barrier",
                label: ef.label,
                cx: bx,
                cy: efCy,
                width: C.BARRIER_W,
                height: C.NODE_H,
                lineId: line.id,
                escalationId: esc.id,
              });
              connectFromY = efCy + C.NODE_H / 2;
              cursor += C.NODE_H + C.EF_GAP;
            }
          }
        }
      });

      // ── Flow polyline: head box → barriers → knot boundary ──
      const dy = by - cy;
      const clampedDy = Math.max(-(C.TOPEVENT_R - 4), Math.min(C.TOPEVENT_R - 4, dy));
      const knotDx = Math.sqrt(Math.max(0, C.TOPEVENT_R * C.TOPEVENT_R - clampedDy * clampedDy));

      const pts: Array<[number, number]> = [];
      if (side === "prevent") {
        // threat right edge → each barrier (straight across by) → knot entry.
        pts.push([headX + C.NODE_W / 2, by]);
        // barriers outer→inner
        const ordered = [...line.barriers].map((_b, j) => barrierX[j]!).sort((a, b) => a - b);
        for (const bx of ordered) {
          pts.push([bx - C.BARRIER_W / 2, by]);
          pts.push([bx + C.BARRIER_W / 2, by]);
        }
        pts.push([cx - knotDx, cy + clampedDy]);
      } else {
        pts.push([cx + knotDx, cy + clampedDy]);
        const ordered = [...line.barriers].map((_b, j) => barrierX[j]!).sort((a, b) => a - b);
        for (const bx of ordered) {
          pts.push([bx - C.BARRIER_W / 2, by]);
          pts.push([bx + C.BARRIER_W / 2, by]);
        }
        pts.push([headX - C.NODE_W / 2, by]);
      }
      const path = pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${r(p[0])} ${r(p[1])}`).join(" ");

      // Arrowhead at the knot boundary. Flow runs left→right throughout
      // (threat → knot → consequence), so both arrowheads point +x.
      const ax = side === "prevent" ? cx - knotDx : cx + knotDx;
      lines.push({ lineId: line.id, side, path, arrow: { x: ax, y: cy + clampedDy, angle: 0 } });
    });
  };

  emitWing(threatLines, left, "prevent");
  emitWing(conseqLines, right, "mitigate");

  // ── Canvas size (cx was sized so the leftmost box lands ≈ PAGE_PAD) ──
  let maxX = 0, maxY = 0;
  const bump = (x: number, y: number) => { maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  for (const b of boxes) bump(b.cx + b.width / 2, b.cy + b.height / 2);
  bump(cx + C.TOPEVENT_R, cy + C.TOPEVENT_R);
  if (ast.title) bump(C.PAGE_PAD + ast.title.length * 9, 0);

  const legendBand = ast.legend === "off" ? 0 : C.LEGEND_H;

  return {
    ast,
    topEvent,
    boxes,
    lines,
    escalationLines,
    ...(hazardTie ? { hazardTie } : {}),
    width: Math.ceil(maxX + C.PAGE_PAD),
    height: Math.ceil(maxY + C.PAGE_PAD + legendBand),
  };
}

function r(n: number): number {
  return Math.round(n * 10) / 10;
}
