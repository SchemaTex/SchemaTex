/**
 * UML Use Case layout.
 *
 * Deterministic, seedless layered placement:
 *   1. Size each use-case ellipse from its text stack.
 *   2. Assign a *depth* (column) to each use case from the include / extend /
 *      generalization chains; use cases connected only to actors are depth 0,
 *      included / extended / parent use cases sit one column deeper.
 *   3. Order use cases within each column by a barycenter of their neighbours so
 *      include chains line up on roughly the same row.
 *   4. Wrap the use-case block in a subject (system boundary) rectangle.
 *   5. Flank the subject with actor stacks (primary left, supporting right).
 *   6. Route associations (straight, clamped to ellipse perimeter),
 *      include / extend (dashed, arrow toward the included / base), and
 *      generalization (hollow triangle toward the parent, optionally merged
 *      into one shared head for ≥3 siblings).
 *
 * Spec: docs/reference/29-USECASE-STANDARD.md §8
 */

import type {
  UsecaseActor,
  UsecaseActorBox,
  UsecaseAst,
  UsecaseEdge,
  UsecaseEdgeLabel,
  UsecaseEllipse,
  UsecaseGeneralizationTree,
  UsecaseLayoutResult,
  UsecaseNode,
  UsecaseRelation,
  UsecaseSubject,
} from "./types";

export const USECASE_CONST = {
  COL_GAP: 84, // horizontal gap between adjacent use-case columns (edge-to-edge)
  ROW_PITCH: 104, // vertical center-to-center between use cases
  ROW_GAP_MIN: 22, // minimum vertical gap between ellipse edges in a column

  MIN_RX: 70,
  MIN_RY: 30,
  ELLIPSE_PAD_X: 22,
  ELLIPSE_PAD_Y: 16,
  CHAR_W_NAME: 6.9,
  CHAR_W_EXT: 5.8,
  NAME_LH: 15,
  STEREO_LH: 13,
  EXTPOINT_LH: 13,
  EXT_HEADER: "extension points",

  ACTOR_W: 40,
  ACTOR_H: 60,
  ACTOR_LABEL_H: 16,
  EXTERNAL_W: 132,
  EXTERNAL_H: 48,
  ACTOR_GAP: 60, // gap from subject edge to actor bounding box
  ACTOR_PITCH: 120, // vertical center-to-center between actors on one side

  SUBJECT_PAD: 34,
  SUBJECT_TOP_PAD: 54,
  SUBJECT_BOTTOM_PAD: 30,

  MARGIN: 24,
  TITLE_H: 34,

  GEN_TREE_THRESHOLD: 3,
  GEN_JUNCTION_OFFSET: 38,
} as const;

// ─── geometry helpers ───────────────────────────────────────────

function ellipsePerimeterPoint(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx + rx, y: cy };
  const t = 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
  return { x: cx + dx * t, y: cy + dy * t };
}

function isWideGlyph(cp: number): boolean {
  // CJK Unified (incl. ext A), Hiragana/Katakana, Hangul, and full/half-width forms.
  return (
    (cp >= 0x3000 && cp <= 0x9fff) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xff00 && cp <= 0xffef)
  );
}

function estimateTextWidth(s: string, charW: number): number {
  let w = 0;
  for (const ch of s) {
    // CJK / full-width glyphs render roughly 1.7x the Latin advance width.
    w += isWideGlyph(ch.codePointAt(0) ?? 0) ? charW * 1.7 : charW;
  }
  return w;
}

// ─── ellipse sizing ─────────────────────────────────────────────

function sizeEllipse(uc: UsecaseNode): { rx: number; ry: number; dividerY?: number } {
  const C = USECASE_CONST;
  const nameW = estimateTextWidth(uc.name, C.CHAR_W_NAME);
  let widest = nameW;
  if (uc.stereotype) {
    widest = Math.max(widest, estimateTextWidth(`«${uc.stereotype}»`, C.CHAR_W_EXT));
  }

  // Vertical text stack height
  let stack = 0;
  if (uc.stereotype) stack += C.STEREO_LH;
  stack += C.NAME_LH;

  const hasExt = uc.extensionPoints.length > 0;
  if (hasExt) {
    stack += 8; // divider gap
    stack += C.EXTPOINT_LH; // header
    stack += uc.extensionPoints.length * C.EXTPOINT_LH;
    widest = Math.max(widest, estimateTextWidth(C.EXT_HEADER, C.CHAR_W_EXT));
    for (const ep of uc.extensionPoints) {
      widest = Math.max(widest, estimateTextWidth(ep, C.CHAR_W_EXT) + 16);
    }
  }

  // Ellipse must enclose the text rectangle: a w×h rectangle fits an ellipse of
  // semi-axes (w/√2, h/√2). Add padding, then enforce minimums.
  const rx = Math.max(C.MIN_RX, (widest / 2) * Math.SQRT2 + C.ELLIPSE_PAD_X);
  const ry = Math.max(C.MIN_RY, (stack / 2) * Math.SQRT2 + C.ELLIPSE_PAD_Y);

  const result: { rx: number; ry: number; dividerY?: number } = {
    rx: Math.round(rx),
    ry: Math.round(ry),
  };
  return result;
}

// ─── depth assignment ───────────────────────────────────────────

interface DeepEdge {
  from: string; // shallower
  to: string; // deeper
}

function buildDeepEdges(ast: UsecaseAst, ucIds: Set<string>): DeepEdge[] {
  const edges: DeepEdge[] = [];
  for (const r of ast.relations) {
    if (!ucIds.has(r.source) || !ucIds.has(r.target)) continue;
    if (r.kind === "include") {
      // includer (source) shallow, included (target) deep
      edges.push({ from: r.source, to: r.target });
    } else if (r.kind === "extend") {
      // canonical: source = extension (deep), target = base (shallow)
      edges.push({ from: r.target, to: r.source });
    } else if (r.kind === "generalization") {
      // child (source) shallow, parent (target) deep
      edges.push({ from: r.source, to: r.target });
    }
  }
  return edges;
}

function assignDepths(ucs: UsecaseNode[], deepEdges: DeepEdge[]): Map<string, number> {
  const depth = new Map<string, number>();
  for (const u of ucs) depth.set(u.id, 0);
  // Longest-path relaxation, bounded to avoid runaway on accidental cycles.
  const maxPasses = ucs.length + 1;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    for (const e of deepEdges) {
      const d = (depth.get(e.from) ?? 0) + 1;
      if (d > (depth.get(e.to) ?? 0)) {
        depth.set(e.to, d);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return depth;
}

// ─── actor side classification ──────────────────────────────────

/**
 * Assign each actor to the left or right column. Generalization-related actors
 * are pulled onto the *same* side (the side of their earliest-declared member)
 * so a specialisation hierarchy reads as one compact stack instead of arrows
 * crossing the whole subject.
 */
function classifyActorSides(ast: UsecaseAst): Map<string, "left" | "right"> {
  const actorIds = new Set(ast.actors.map((a) => a.id));
  const idx = new Map<string, number>();
  ast.actors.forEach((a, i) => idx.set(a.id, i));

  // union-find over actor↔actor generalization edges
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while ((parent.get(r) ?? r) !== r) r = parent.get(r) ?? r;
    let c = x;
    while ((parent.get(c) ?? c) !== c) {
      const next = parent.get(c) ?? c;
      parent.set(c, r);
      c = next;
    }
    return r;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    // keep the earlier-declared id as the root for deterministic side choice
    if ((idx.get(ra) ?? 0) <= (idx.get(rb) ?? 0)) parent.set(rb, ra);
    else parent.set(ra, rb);
  };
  for (const a of ast.actors) parent.set(a.id, a.id);
  for (const r of ast.relations) {
    if (r.kind === "generalization" && actorIds.has(r.source) && actorIds.has(r.target)) {
      union(r.source, r.target);
    }
  }

  // base side per actor
  const baseSide = (a: UsecaseActor, i: number): "left" | "right" =>
    a.side === "left" ? "left" : a.side === "right" ? "right" : i === 0 ? "left" : "right";

  // resolve component side: explicit hint wins, else side of earliest member
  const componentSide = new Map<string, "left" | "right">();
  ast.actors.forEach((a, i) => {
    const root = find(a.id);
    if (a.side === "left" || a.side === "right") {
      componentSide.set(root, a.side);
    } else if (!componentSide.has(root)) {
      componentSide.set(root, baseSide(a, i));
    }
  });

  const sides = new Map<string, "left" | "right">();
  ast.actors.forEach((a, i) => {
    const root = find(a.id);
    sides.set(a.id, componentSide.get(root) ?? baseSide(a, i));
  });
  return sides;
}

// ─── main layout ────────────────────────────────────────────────

export function layoutUsecase(ast: UsecaseAst): UsecaseLayoutResult {
  const C = USECASE_CONST;
  const ucIds = new Set(ast.usecases.map((u) => u.id));
  const actorById = new Map(ast.actors.map((a) => [a.id, a]));

  // 1. size ellipses
  const sizes = new Map<string, { rx: number; ry: number }>();
  for (const u of ast.usecases) sizes.set(u.id, sizeEllipse(u));

  // 2. depth
  const deepEdges = buildDeepEdges(ast, ucIds);
  const depth = assignDepths(ast.usecases, deepEdges);
  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);

  // 3. ordering within columns
  const actorIndex = new Map<string, number>();
  ast.actors.forEach((a, i) => actorIndex.set(a.id, i));
  const sides = classifyActorSides(ast);

  // connected actors per use case
  const connectedActors = new Map<string, string[]>();
  for (const u of ast.usecases) connectedActors.set(u.id, []);
  for (const r of ast.relations) {
    if (r.kind !== "association" && r.kind !== "directed") continue;
    const aId = actorById.has(r.source) ? r.source : actorById.has(r.target) ? r.target : null;
    const uId = ucIds.has(r.source) ? r.source : ucIds.has(r.target) ? r.target : null;
    if (aId && uId) connectedActors.get(uId)!.push(aId);
  }

  const columns: UsecaseNode[][] = [];
  for (let d = 0; d <= maxDepth; d++) columns.push([]);
  for (const u of ast.usecases) columns[depth.get(u.id) ?? 0].push(u);

  // predecessors in deepEdges (shallower neighbours pointing into a node)
  const preds = new Map<string, string[]>();
  for (const u of ast.usecases) preds.set(u.id, []);
  for (const e of deepEdges) preds.get(e.to)!.push(e.from);

  const declIndex = new Map<string, number>();
  ast.usecases.forEach((u, i) => declIndex.set(u.id, i));

  // initial order for column 0: by average connected-actor index, then decl order
  const rowPos = new Map<string, number>();
  const col0 = columns[0];
  col0.sort((a, b) => {
    const ka = avgActorKey(connectedActors.get(a.id)!, actorIndex);
    const kb = avgActorKey(connectedActors.get(b.id)!, actorIndex);
    if (ka !== kb) return ka - kb;
    return declIndex.get(a.id)! - declIndex.get(b.id)!;
  });
  col0.forEach((u, i) => rowPos.set(u.id, i));

  // deeper columns: barycenter of predecessors, fall back to decl order
  for (let d = 1; d <= maxDepth; d++) {
    const col = columns[d];
    for (const u of col) {
      const ps = preds.get(u.id)!.filter((p) => rowPos.has(p));
      if (ps.length > 0) {
        const sum = ps.reduce((acc, p) => acc + (rowPos.get(p) ?? 0), 0);
        rowPos.set(u.id, sum / ps.length);
      } else {
        rowPos.set(u.id, declIndex.get(u.id)! );
      }
    }
    // resolve to distinct slots while preserving relative order
    col.sort((a, b) => {
      const ra = rowPos.get(a.id)!;
      const rb = rowPos.get(b.id)!;
      if (ra !== rb) return ra - rb;
      return declIndex.get(a.id)! - declIndex.get(b.id)!;
    });
    let prev = -Infinity;
    for (const u of col) {
      let r = rowPos.get(u.id)!;
      if (r <= prev) r = prev + 1;
      rowPos.set(u.id, r);
      prev = r;
    }
  }

  // 4. compute geometry — column x positions (dynamic from max rx per column)
  const colMaxRx: number[] = columns.map((col) =>
    col.reduce((m, u) => Math.max(m, sizes.get(u.id)!.rx), C.MIN_RX as number),
  );
  const colCenterX: number[] = [];
  let cursorX = 0;
  for (let d = 0; d <= maxDepth; d++) {
    cursorX += colMaxRx[d];
    colCenterX[d] = cursorX;
    cursorX += colMaxRx[d] + C.COL_GAP;
  }

  // global row pitch big enough for tallest ellipse
  let maxRy: number = C.MIN_RY;
  for (const s of sizes.values()) maxRy = Math.max(maxRy, s.ry);
  const rowPitch = Math.max(C.ROW_PITCH, 2 * maxRy + C.ROW_GAP_MIN);

  // place ellipses (relative coords; offset later)
  const ellipses: UsecaseEllipse[] = [];
  const ellById = new Map<string, UsecaseEllipse>();
  for (let d = 0; d <= maxDepth; d++) {
    for (const u of columns[d]) {
      const s = sizes.get(u.id)!;
      const e: UsecaseEllipse = {
        usecase: u,
        cx: colCenterX[d],
        cy: rowPos.get(u.id)! * rowPitch,
        rx: s.rx,
        ry: s.ry,
      };
      if (u.extensionPoints.length > 0) e.dividerY = e.cy + 6;
      ellipses.push(e);
      ellById.set(u.id, e);
    }
  }

  // resolve residual vertical overlaps per column
  for (let d = 0; d <= maxDepth; d++) {
    const colE = columns[d].map((u) => ellById.get(u.id)!).sort((a, b) => a.cy - b.cy);
    for (let i = 1; i < colE.length; i++) {
      const prev = colE[i - 1];
      const cur = colE[i];
      const minGap = prev.ry + cur.ry + C.ROW_GAP_MIN;
      if (cur.cy - prev.cy < minGap) {
        cur.cy = prev.cy + minGap;
        if (cur.dividerY !== undefined) cur.dividerY = cur.cy + 6;
      }
    }
  }

  // bounding box of use-case block
  let ucMinX = Infinity, ucMaxX = -Infinity, ucMinY = Infinity, ucMaxY = -Infinity;
  for (const e of ellipses) {
    ucMinX = Math.min(ucMinX, e.cx - e.rx);
    ucMaxX = Math.max(ucMaxX, e.cx + e.rx);
    ucMinY = Math.min(ucMinY, e.cy - e.ry);
    ucMaxY = Math.max(ucMaxY, e.cy + e.ry);
  }
  if (!isFinite(ucMinX)) { ucMinX = 0; ucMaxX = 200; ucMinY = 0; ucMaxY = 100; }

  // 5. subject box
  const hasSubject = !!ast.system;
  const subjLeft = ucMinX - C.SUBJECT_PAD;
  const subjRight = ucMaxX + C.SUBJECT_PAD;
  const subjTop = ucMinY - C.SUBJECT_TOP_PAD;
  const subjBottom = ucMaxY + C.SUBJECT_BOTTOM_PAD;

  // 6. actors — left and right stacks, vertically centered against the subject
  const leftActors = ast.actors.filter((a) => sides.get(a.id) === "left");
  const rightActors = ast.actors.filter((a) => sides.get(a.id) === "right");

  const actorBoxes: UsecaseActorBox[] = [];
  const actorById2 = new Map<string, UsecaseActorBox>();

  const subjCenterY = (subjTop + subjBottom) / 2;

  function placeStack(actors: UsecaseActor[], side: "left" | "right"): void {
    if (actors.length === 0) return;
    const totalH = (actors.length - 1) * C.ACTOR_PITCH;
    let cy = subjCenterY - totalH / 2;
    for (const a of actors) {
      const isRect = a.kind === "external" || a.kind === "system";
      const w = isRect ? C.EXTERNAL_W : C.ACTOR_W;
      const h = isRect ? C.EXTERNAL_H : C.ACTOR_H;
      // box top-left
      let x: number;
      if (side === "left") {
        x = subjLeft - C.ACTOR_GAP - w;
      } else {
        x = subjRight + C.ACTOR_GAP;
      }
      const y = cy - h / 2;
      // Single unified anchor per actor: all association lines fan out from this
      // one point on the facing side, at torso height for stick figures.
      const anchorX = side === "left" ? x + w : x;
      const anchorY = isRect ? cy : cy - 6;
      const box: UsecaseActorBox = {
        actor: a,
        x,
        y,
        width: w,
        height: h,
        side,
        anchorX,
        anchorY,
      };
      actorBoxes.push(box);
      actorById2.set(a.id, box);
      cy += C.ACTOR_PITCH;
    }
  }
  placeStack(leftActors, "left");
  placeStack(rightActors, "right");

  // 7. compute overall bounds (include actors + labels)
  let minX = subjLeft, maxX = subjRight, minY = subjTop, maxY = subjBottom;
  for (const b of actorBoxes) {
    let left = b.x;
    let right = b.x + b.width;
    const isRect = b.actor.kind === "external" || b.actor.kind === "system";
    if (!isRect) {
      // the name label is centered under the stick figure and can be wider
      const labelW = estimateTextWidth(b.actor.name, 6.4);
      const cx = b.x + b.width / 2;
      left = Math.min(left, cx - labelW / 2);
      right = Math.max(right, cx + labelW / 2);
    }
    minX = Math.min(minX, left);
    maxX = Math.max(maxX, right);
    minY = Math.min(minY, b.y);
    // include name label below figure
    maxY = Math.max(maxY, b.y + b.height + C.ACTOR_LABEL_H);
  }

  // translate so everything sits at margin offset, leaving room for a title.
  const titleSpace = ast.title ? C.TITLE_H : 0;
  const offsetX = C.MARGIN - minX;
  const offsetY = C.MARGIN + titleSpace - minY;

  const translate = (px: number, py: number) => ({ x: px + offsetX, y: py + offsetY });

  for (const e of ellipses) {
    const p = translate(e.cx, e.cy);
    e.cx = p.x;
    e.cy = p.y;
    if (e.dividerY !== undefined) e.dividerY += offsetY;
  }
  for (const b of actorBoxes) {
    b.x += offsetX;
    b.y += offsetY;
    b.anchorX += offsetX;
    b.anchorY += offsetY;
  }
  const subject: UsecaseSubject | undefined = hasSubject
    ? {
        x: subjLeft + offsetX,
        y: subjTop + offsetY,
        width: subjRight - subjLeft,
        height: subjBottom - subjTop,
      }
    : undefined;
  if (subject && ast.system) subject.name = ast.system;

  const width = maxX - minX + 2 * C.MARGIN;
  const height = maxY - minY + 2 * C.MARGIN + titleSpace;

  // 8. route edges
  const edges: UsecaseEdge[] = [];
  const trees: UsecaseGeneralizationTree[] = [];

  // group generalization relations by parent for tree merging
  const genByParent = new Map<string, UsecaseRelation[]>();
  for (const r of ast.relations) {
    if (r.kind !== "generalization") continue;
    if (!genByParent.has(r.target)) genByParent.set(r.target, []);
    genByParent.get(r.target)!.push(r);
  }
  const handledGen = new Set<UsecaseRelation>();

  function nodeCenter(id: string): { cx: number; cy: number; rx: number; ry: number } | null {
    const e = ellById.get(id);
    if (e) return { cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry };
    const b = actorById2.get(id);
    if (b) {
      return {
        cx: b.x + b.width / 2,
        cy: b.y + b.height / 2,
        rx: b.width / 2,
        ry: b.height / 2,
      };
    }
    return null;
  }

  function perimeter(id: string, towardX: number, towardY: number): { x: number; y: number } {
    const e = ellById.get(id);
    if (e) return ellipsePerimeterPoint(e.cx, e.cy, e.rx, e.ry, towardX, towardY);
    const b = actorById2.get(id)!;
    // clamp to actor box edge facing the target
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    return clampToRect(b.width, b.height, cx, cy, towardX, towardY);
  }

  // Generalization on actors connects at the *outer* edge of the stick figure
  // (left side → left edge, right side → right edge), so the bus runs clear of
  // the use-case associations and the name labels.
  function actorGenAnchor(id: string, side: "left" | "right"): { x: number; y: number } {
    const b = actorById2.get(id)!;
    const isRect = b.actor.kind === "external" || b.actor.kind === "system";
    const y = isRect ? b.y + b.height / 2 : b.y + 22; // torso line on a stick figure
    const x = side === "left" ? b.x + 4 : b.x + b.width - 4;
    return { x, y };
  }

  for (const [parentId, rels] of genByParent) {
    const useTree = ast.generalizationTree && rels.length >= C.GEN_TREE_THRESHOLD;
    const allActors =
      actorById2.has(parentId) && rels.every((r) => actorById2.has(r.source));

    if (allActors) {
      // route as a vertical bus on the outer side of the actor stack
      const side = sides.get(parentId) ?? "left";
      const pAnchor = actorGenAnchor(parentId, side);
      const childAnchors = rels.map((r) => ({ r, p: actorGenAnchor(r.source, side) }));
      const xs = [pAnchor.x, ...childAnchors.map((c) => c.p.x)];
      const ys = [pAnchor.y, ...childAnchors.map((c) => c.p.y)];
      const busX =
        side === "left" ? Math.min(...xs) - 20 : Math.max(...xs) + 20;
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      if (useTree) {
        const legPaths: string[] = [
          `M ${round(busX)} ${round(minY)} L ${round(busX)} ${round(maxY)}`,
        ];
        for (const c of childAnchors) {
          legPaths.push(`M ${round(c.p.x)} ${round(c.p.y)} L ${round(busX)} ${round(c.p.y)}`);
          handledGen.add(c.r);
        }
        trees.push({
          parentId,
          childIds: rels.map((r) => r.source),
          stemX: busX,
          stemTop: minY,
          stemBottom: maxY,
          trunkD: `M ${round(busX)} ${round(pAnchor.y)} L ${round(pAnchor.x)} ${round(pAnchor.y)}`,
          legPaths,
        });
      } else {
        // individual L-routes that still share the outer bus column
        for (const c of childAnchors) {
          edges.push({
            relation: c.r,
            d:
              `M ${round(c.p.x)} ${round(c.p.y)} ` +
              `L ${round(busX)} ${round(c.p.y)} ` +
              `L ${round(busX)} ${round(pAnchor.y)} ` +
              `L ${round(pAnchor.x)} ${round(pAnchor.y)}`,
            arrowKind: "hollow",
            dashed: false,
          });
          handledGen.add(c.r);
        }
      }
      continue;
    }

    if (!useTree) continue;
    // use-case (or mixed) generalization tree — star-merge toward the parent
    const parent = nodeCenter(parentId);
    if (!parent) continue;
    const childCenters = rels
      .map((r) => nodeCenter(r.source))
      .filter((c): c is NonNullable<typeof c> => c !== null);
    if (childCenters.length === 0) continue;
    const avgX = childCenters.reduce((s, c) => s + c.cx, 0) / childCenters.length;
    const avgY = childCenters.reduce((s, c) => s + c.cy, 0) / childCenters.length;
    const pPt = perimeter(parentId, avgX, avgY);
    const dirX = avgX - parent.cx;
    const dirY = avgY - parent.cy;
    const len = Math.hypot(dirX, dirY) || 1;
    const jx = pPt.x + (dirX / len) * C.GEN_JUNCTION_OFFSET;
    const jy = pPt.y + (dirY / len) * C.GEN_JUNCTION_OFFSET;
    const legPaths: string[] = [];
    for (const r of rels) {
      const cPt = perimeter(r.source, jx, jy);
      legPaths.push(`M ${round(cPt.x)} ${round(cPt.y)} L ${round(jx)} ${round(jy)}`);
      handledGen.add(r);
    }
    trees.push({
      parentId,
      childIds: rels.map((r) => r.source),
      stemX: jx,
      stemTop: jy,
      stemBottom: jy,
      trunkD: `M ${round(jx)} ${round(jy)} L ${round(pPt.x)} ${round(pPt.y)}`,
      legPaths,
    });
  }

  for (const r of ast.relations) {
    if (handledGen.has(r)) continue;
    const a = nodeCenter(r.source);
    const b = nodeCenter(r.target);
    if (!a || !b) continue;

    // actor↔actor generalization not caught above (single child, individual mode)
    if (r.kind === "generalization" && actorById2.has(r.source) && actorById2.has(r.target)) {
      const side = sides.get(r.target) ?? "left";
      const pAnchor = actorGenAnchor(r.target, side);
      const cAnchor = actorGenAnchor(r.source, side);
      const busX = side === "left"
        ? Math.min(pAnchor.x, cAnchor.x) - 20
        : Math.max(pAnchor.x, cAnchor.x) + 20;
      edges.push({
        relation: r,
        d:
          `M ${round(cAnchor.x)} ${round(cAnchor.y)} ` +
          `L ${round(busX)} ${round(cAnchor.y)} ` +
          `L ${round(busX)} ${round(pAnchor.y)} ` +
          `L ${round(pAnchor.x)} ${round(pAnchor.y)}`,
        arrowKind: "hollow",
        dashed: false,
      });
      continue;
    }

    // Endpoints. For actor↔use-case associations, anchor the actor end at its
    // single unified point so every line from that actor fans out from one spot
    // (canonical UML rendering); the use-case end aims at that anchor.
    const srcActor = actorById2.get(r.source);
    const tgtActor = actorById2.get(r.target);
    let pa: { x: number; y: number };
    let pb: { x: number; y: number };
    if (srcActor && !tgtActor) {
      pa = { x: srcActor.anchorX, y: srcActor.anchorY };
      pb = perimeter(r.target, pa.x, pa.y);
    } else if (tgtActor && !srcActor) {
      pb = { x: tgtActor.anchorX, y: tgtActor.anchorY };
      pa = perimeter(r.source, pb.x, pb.y);
    } else {
      pa = perimeter(r.source, b.cx, b.cy);
      pb = perimeter(r.target, a.cx, a.cy);
    }

    const dashed = r.kind === "include" || r.kind === "extend";
    let arrowKind: UsecaseEdge["arrowKind"] = "none";
    if (r.kind === "directed" || r.kind === "include" || r.kind === "extend") arrowKind = "open";
    else if (r.kind === "generalization") arrowKind = "hollow";

    const edge: UsecaseEdge = {
      relation: r,
      d: `M ${round(pa.x)} ${round(pa.y)} L ${round(pb.x)} ${round(pb.y)}`,
      arrowKind,
      dashed,
    };

    // label for include / extend
    if (r.kind === "include" || r.kind === "extend") {
      const rows: string[] = [];
      const keyword = r.kind === "include" ? "include" : "extend";
      rows.push(`«${r.stereotype ?? keyword}»`);
      if (r.condition) rows.push(`[${r.condition}]`);
      if (r.extensionPointRef) rows.push(`(extension point: ${r.extensionPointRef})`);
      const label: UsecaseEdgeLabel = {
        rows,
        cx: (pa.x + pb.x) / 2,
        cy: (pa.y + pb.y) / 2,
      };
      edge.label = label;
    } else if ((r.kind === "association" || r.kind === "directed") && r.stereotype) {
      edge.label = {
        rows: [`«${r.stereotype}»`],
        cx: (pa.x + pb.x) / 2,
        cy: (pa.y + pb.y) / 2,
      };
    }

    // multiplicities near endpoints
    if (r.sourceMultiplicity) {
      edge.multiplicityFrom = placeMultiplicity(pa, pb, r.sourceMultiplicity);
    }
    if (r.targetMultiplicity) {
      edge.multiplicityTo = placeMultiplicity(pb, pa, r.targetMultiplicity);
    }

    edges.push(edge);
  }

  const result: UsecaseLayoutResult = {
    width: Math.round(width),
    height: Math.round(height),
    actors: actorBoxes,
    usecases: ellipses,
    edges,
    trees,
    warnings: ast.warnings,
    ast,
  };
  if (ast.title) result.title = ast.title;
  if (subject) result.subject = subject;
  return result;
}

function avgActorKey(actorIds: string[], idx: Map<string, number>): number {
  if (actorIds.length === 0) return Number.MAX_SAFE_INTEGER / 2;
  const sum = actorIds.reduce((s, a) => s + (idx.get(a) ?? 0), 0);
  return sum / actorIds.length;
}

function clampToRect(
  w: number,
  h: number,
  cx: number,
  cy: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  // Intersect the ray from (cx,cy) toward (tx,ty) with the rectangle border.
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const halfW = w / 2;
  const halfH = h / 2;
  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const s = Math.min(scaleX, scaleY);
  return { x: cx + dx * s, y: cy + dy * s };
}

function placeMultiplicity(
  near: { x: number; y: number },
  far: { x: number; y: number },
  text: string,
): { text: string; x: number; y: number } {
  const dx = far.x - near.x;
  const dy = far.y - near.y;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (dx / len) * 14;
  const oy = (dy / len) * 14;
  // offset perpendicular a touch so it doesn't sit on the line
  const px = (-dy / len) * 9;
  const py = (dx / len) * 9;
  return { text, x: round(near.x + ox + px), y: round(near.y + oy + py) };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
