/**
 * UML Class Diagram layout — proper Sugiyama layered layout with dummy-node
 * edge routing, modelled on dagre (which Mermaid uses).
 *
 * Per docs/reference/36-UMLCLASS-STANDARD.md §5, and informed by a deep read of
 * dagre's `normalize.run` / `normalize.undo` / `intersectRect`:
 *
 *   1. Rank assignment — UML-semantic directional edges define ranks
 *      (parent/whole/source above child/part/target). Longest-path.
 *   2. Dummy nodes — every edge spanning >1 rank is split into a chain of
 *      zero-width dummies, ONE per intermediate rank. Dummies are ordered and
 *      x-positioned like real nodes, so they reserve a clear vertical lane and
 *      the edge never crosses a real box. THIS is how dagre avoids box
 *      penetration (it is structural, not a collision test).
 *   3. Crossing minimisation — barycenter sweeps; dummies participate.
 *   4. X assignment — barycenter + order-preserving overlap resolution
 *      (the "minimal viable subset" — no full Brandes-Köpf needed).
 *   5. Edge routing — polyline through dummy centres, endpoints clipped to the
 *      box boundary with dagre's intersectRect. Same-rank edges (no rank
 *      separation) lift up over the row. Inheritance fans are tree-merged.
 */

import type {
  UmlClassAst,
  UmlClassClassifier,
  UmlClassLayoutBox,
  UmlClassLayoutEdge,
  UmlClassLayoutEdgeEnd,
  UmlClassLayoutPackage,
  UmlClassLayoutResult,
  UmlClassLayoutRow,
  UmlClassLayoutTree,
  UmlClassMember,
  UmlClassPackage,
  UmlClassRelationship,
} from "./types";

// ─── Coordinate model (spec §5.1) ────────────────────────────

export const UMLCLASS_CONST = {
  BOX_MIN_W: 160,
  BOX_MAX_W: 320,
  BOX_PAD_X: 14,
  COMPARTMENT_PAD_Y: 8,
  ROW_H: 22,
  NAME_ROW_H: 30,
  STEREOTYPE_ROW_H: 16,
  /** Vertical gap between rank bands. */
  RANK_SEP: 78,
  /** Horizontal gap between siblings within a rank. */
  NODE_SEP: 54,
  /** Separation reserved on each side of a dummy lane. */
  DUMMY_SEP: 34,
  DIAMOND_W: 20,
  DIAMOND_H: 12,
  TRIANGLE_W: 18,
  TRIANGLE_H: 14,
  ARROW_LEN: 11,
  END_LABEL_GAP: 7,
  EDGE_LABEL_HALO: 6,
  CANVAS_PAD: 32,
  /** Same-rank edges lift this far above the row band before crossing. */
  LIFT_CLEARANCE: 26,
  LANE_STEP: 14,
  TREE_JUNCTION_OFFSET: 26,
  CHAR_W: 6.6,
  SMALL_CHAR_W: 5.0,
  TREE_MERGE_THRESHOLD: 2,
  /** Crossing-minimisation sweeps. */
  ORDER_ITERATIONS: 8,
  /** X-coordinate barycenter sweeps. */
  X_ITERATIONS: 10,
  /** Package/namespace frame: inset padding around enclosed boxes. */
  PKG_PAD: 18,
  /** Package frame: extra top space reserved for the label. */
  PKG_LABEL_H: 24,
} as const;

// ─── Internal layered-graph node ─────────────────────────────

interface LNode {
  id: string;
  rank: number;
  order: number;
  /** Centre coordinates. */
  cx: number;
  cy: number;
  w: number;
  h: number;
  isDummy: boolean;
  box?: UmlClassLayoutBox;
}

interface EdgeChain {
  rel: UmlClassRelationship;
  /** Node ids: [from, dummy?, …, to]. Adjacent entries differ by one rank. */
  chain: string[];
  sameRank: boolean;
}

// ─── Entry ────────────────────────────────────────────────────

export function layoutUmlClass(ast: UmlClassAst): UmlClassLayoutResult {
  const direction = ast.direction ?? "tb";
  const vertical = direction === "tb" || direction === "bt";

  // 1. Box sizes from member text.
  const boxes = buildBoxes(ast.classifiers);
  const boxByID = new Map(boxes.map((b) => [b.classifier.id, b] as const));

  // 2. Rank assignment (longest-path on directional edges).
  const rankByID = computeRanks(ast, boxes);

  // 3. Build layered graph: real LNodes + dummy LNodes for multi-rank edges.
  const { nodes, chains } = buildLayeredGraph(ast.relationships, boxes, rankByID);

  // 4. Group nodes by rank.
  const ranks = groupByRank(nodes);

  // 5. Crossing minimisation (barycenter sweeps; dummies participate).
  orderRanks(ranks, chains);

  // 5b. Package clustering — keep same-package classifiers contiguous within
  //     each rank so their bounding frame stays a clean rectangle.
  if (ast.packages.length > 0) {
    clusterRanks(ranks, topLevelPackageMap(ast));
  }

  // 6. X / Y coordinate assignment.
  assignCoordinates(ranks, chains, boxByID);

  // 7. Write back box top-left from LNode centres.
  for (const n of nodes) {
    if (n.box) {
      n.box.x = n.cx - n.box.width / 2;
      n.box.y = n.cy - n.box.height / 2;
      n.box.layer = n.rank;
    }
  }

  // 8. Normalise so everything sits >= CANVAS_PAD.
  normaliseCoords(nodes, boxes);

  // 8b. Package frames (union + padding, nested). Computed from final box
  //     positions; then a second shift makes room for frame extents.
  const packages = layoutPackages(ast, boxByID);
  shiftForPackages(nodes, boxes, packages);

  // 9. Canvas size (boxes + frames).
  const { width, height } = canvasSize(boxes, packages);

  // 10. Route edges + tree-merged inheritance fans.
  const { edges, trees } = routeEdges(chains, nodes, boxByID, vertical);

  return { ast, boxes, packages, edges, trees, width, height };
}

// ─── Package clustering + frame layout ───────────────────────

/** Map every classifier id → its top-level (root) package id, or undefined. */
function topLevelPackageMap(ast: UmlClassAst): Map<string, string> {
  const parentOf = new Map<string, string | undefined>();
  for (const p of ast.packages) parentOf.set(p.id, p.parentId);
  const rootOf = (pkgId: string): string => {
    let cur = pkgId;
    let guard = 0;
    while (parentOf.get(cur) && guard++ < 64) cur = parentOf.get(cur)!;
    return cur;
  };
  const map = new Map<string, string>();
  for (const c of ast.classifiers) {
    if (c.packageId) map.set(c.id, rootOf(c.packageId));
  }
  return map;
}

/**
 * Within each rank, reorder nodes so that classifiers sharing a top-level
 * package are contiguous. Cluster groups are ordered by the average current
 * order of their members (preserving the barycenter result between groups);
 * free nodes and dummies each form their own singleton group, so they can slot
 * between packages but never split one.
 */
function clusterRanks(ranks: LNode[][], clusterByID: Map<string, string>): void {
  const clusterOf = (n: LNode): string =>
    n.isDummy ? `__d:${n.id}` : clusterByID.get(n.id) ?? `__f:${n.id}`;
  for (const rank of ranks) {
    const groups = new Map<string, LNode[]>();
    const groupKeys: string[] = [];
    for (const n of rank) {
      const k = clusterOf(n);
      if (!groups.has(k)) { groups.set(k, []); groupKeys.push(k); }
      groups.get(k)!.push(n);
    }
    const avgOrder = (ns: LNode[]): number =>
      ns.reduce((s, n) => s + n.order, 0) / ns.length;
    groupKeys.sort((a, b) => avgOrder(groups.get(a)!) - avgOrder(groups.get(b)!));
    let idx = 0;
    const out: LNode[] = [];
    for (const k of groupKeys) {
      for (const n of groups.get(k)!) { n.order = idx++; out.push(n); }
    }
    rank.length = 0;
    rank.push(...out);
  }
}

/**
 * Compute nested package frames as a union of the member boxes (and nested
 * sub-package frames) plus padding + a label band on top. Returned outermost-
 * first (depth ascending) so the renderer can paint big frames under small.
 */
function layoutPackages(
  ast: UmlClassAst,
  boxByID: Map<string, UmlClassLayoutBox>
): UmlClassLayoutPackage[] {
  if (ast.packages.length === 0) return [];

  const byId = new Map<string, UmlClassPackage>();
  for (const p of ast.packages) byId.set(p.id, p);
  const childrenOf = new Map<string, UmlClassPackage[]>();
  for (const p of ast.packages) {
    if (p.parentId) {
      (childrenOf.get(p.parentId) ?? childrenOf.set(p.parentId, []).get(p.parentId)!).push(p);
    }
  }
  const depthOf = (p: UmlClassPackage): number => {
    let d = 0;
    let cur: string | undefined = p.parentId;
    let guard = 0;
    while (cur && guard++ < 64) { d++; cur = byId.get(cur)?.parentId; }
    return d;
  };

  const frames = new Map<string, { x: number; y: number; w: number; h: number }>();

  // bbox of a package = union of its direct member boxes + nested child frames.
  const compute = (p: UmlClassPackage): { x: number; y: number; w: number; h: number } | null => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let any = false;
    for (const id of p.classifierIds) {
      const b = boxByID.get(id);
      if (!b) continue;
      any = true;
      minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height);
    }
    for (const child of childrenOf.get(p.id) ?? []) {
      const cf = compute(child);
      if (!cf) continue;
      any = true;
      minX = Math.min(minX, cf.x); minY = Math.min(minY, cf.y);
      maxX = Math.max(maxX, cf.x + cf.w); maxY = Math.max(maxY, cf.y + cf.h);
    }
    if (!any) return null;
    const f = {
      x: minX - UMLCLASS_CONST.PKG_PAD,
      y: minY - UMLCLASS_CONST.PKG_PAD - UMLCLASS_CONST.PKG_LABEL_H,
      w: maxX - minX + 2 * UMLCLASS_CONST.PKG_PAD,
      h: maxY - minY + 2 * UMLCLASS_CONST.PKG_PAD + UMLCLASS_CONST.PKG_LABEL_H,
    };
    frames.set(p.id, f);
    return f;
  };
  for (const p of ast.packages) if (!frames.has(p.id)) compute(p);

  const out: UmlClassLayoutPackage[] = [];
  for (const p of ast.packages) {
    const f = frames.get(p.id);
    if (!f) continue;
    out.push({
      pkg: p,
      x: f.x, y: f.y, width: f.w, height: f.h,
      depth: depthOf(p),
      labelX: f.x + f.w / 2,
      labelY: f.y + UMLCLASS_CONST.PKG_LABEL_H - 8,
    });
  }
  out.sort((a, b) => a.depth - b.depth);
  return out;
}

/** Shift all geometry so the topmost/leftmost package frame still clears CANVAS_PAD. */
function shiftForPackages(
  nodes: LNode[],
  boxes: UmlClassLayoutBox[],
  packages: UmlClassLayoutPackage[]
): void {
  if (packages.length === 0) return;
  let minX = Infinity, minY = Infinity;
  for (const p of packages) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); }
  const dx = Math.max(0, UMLCLASS_CONST.CANVAS_PAD - minX);
  const dy = Math.max(0, UMLCLASS_CONST.CANVAS_PAD - minY);
  if (dx === 0 && dy === 0) return;
  for (const b of boxes) { b.x += dx; b.y += dy; }
  for (const n of nodes) { n.cx += dx; n.cy += dy; }
  for (const p of packages) { p.x += dx; p.y += dy; p.labelX += dx; p.labelY += dy; }
}

// ─── Box construction (unchanged from v0.2) ──────────────────

function buildBoxes(classifiers: UmlClassClassifier[]): UmlClassLayoutBox[] {
  return classifiers.map((c) => boxFor(c));
}

function boxFor(c: UmlClassClassifier): UmlClassLayoutBox {
  const attrs = c.members.filter((m) => m.kind === "attribute" || m.kind === "literal");
  const ops = c.members.filter((m) => m.kind === "operation");

  const nameText = c.name;
  const stereoText = stereoFor(c);

  const labelWidth = (s: string) => Math.ceil(s.length * UMLCLASS_CONST.CHAR_W);
  const smallWidth = (s: string) => Math.ceil(s.length * UMLCLASS_CONST.SMALL_CHAR_W);

  let widest = labelWidth(nameText);
  if (stereoText) widest = Math.max(widest, smallWidth(stereoText));
  for (const m of attrs) widest = Math.max(widest, labelWidth(memberLineText(m)));
  for (const m of ops)   widest = Math.max(widest, labelWidth(memberLineText(m)));

  const naturalWidth = widest + 2 * UMLCLASS_CONST.BOX_PAD_X;
  const width = Math.min(
    UMLCLASS_CONST.BOX_MAX_W,
    Math.max(UMLCLASS_CONST.BOX_MIN_W, naturalWidth)
  );

  const innerW = width - 2 * UMLCLASS_CONST.BOX_PAD_X;
  const maxChars = Math.max(8, Math.floor(innerW / UMLCLASS_CONST.CHAR_W));
  const fitRow = (m: UmlClassMember): { displayText: string; truncated: boolean } => {
    const raw = memberLineText(m);
    if (raw.length <= maxChars) return { displayText: raw, truncated: false };
    return { displayText: raw.slice(0, maxChars - 1) + "…", truncated: true };
  };

  let y = 0;
  let stereotypeBaselineY: number | undefined;
  if (stereoText) {
    y += UMLCLASS_CONST.STEREOTYPE_ROW_H;
    stereotypeBaselineY = y - 4;
  }
  const nameBaselineY = y + UMLCLASS_CONST.NAME_ROW_H - 9;
  y += UMLCLASS_CONST.NAME_ROW_H;

  const attrsTopY = y;
  const attrRows: UmlClassLayoutRow[] = [];
  y += UMLCLASS_CONST.COMPARTMENT_PAD_Y;
  for (const m of attrs) {
    y += UMLCLASS_CONST.ROW_H;
    const { displayText, truncated } = fitRow(m);
    attrRows.push({ member: m, baselineY: y - 6, displayText, ...(truncated ? { truncated } : {}) });
  }
  if (attrs.length === 0) y += UMLCLASS_CONST.ROW_H;
  y += UMLCLASS_CONST.COMPARTMENT_PAD_Y;

  const opsTopY = y;
  const opRows: UmlClassLayoutRow[] = [];
  y += UMLCLASS_CONST.COMPARTMENT_PAD_Y;
  for (const m of ops) {
    y += UMLCLASS_CONST.ROW_H;
    const { displayText, truncated } = fitRow(m);
    opRows.push({ member: m, baselineY: y - 6, displayText, ...(truncated ? { truncated } : {}) });
  }
  if (ops.length === 0) y += UMLCLASS_CONST.ROW_H;
  y += UMLCLASS_CONST.COMPARTMENT_PAD_Y;

  return {
    classifier: c,
    x: 0,
    y: 0,
    width,
    height: y,
    layer: 0,
    order: 0,
    ...(stereotypeBaselineY !== undefined ? { stereotypeBaselineY } : {}),
    nameBaselineY,
    attrsTopY,
    opsTopY,
    attrRows,
    opRows,
  };
}

function stereoFor(c: UmlClassClassifier): string | undefined {
  return c.stereotype
    ? `«${c.stereotype}»`
    : c.kind === "interface" ? "«interface»"
    : c.kind === "enum" ? "«enumeration»"
    : c.kind === "datatype" ? "«datatype»"
    : c.kind === "primitive" ? "«primitive»"
    : undefined;
}

function memberLineText(m: UmlClassMember): string {
  const v = m.visibility === "public" ? "+ "
    : m.visibility === "private" ? "- "
    : m.visibility === "protected" ? "# "
    : m.visibility === "package" ? "~ "
    : "";
  if (m.kind === "literal") return m.name;
  if (m.kind === "attribute") {
    const der = m.isDerived ? "/" : "";
    const typ = m.type ? `: ${m.type}` : "";
    const mult = m.multiplicity ? ` [${m.multiplicity}]` : "";
    const def = m.defaultValue ? ` = ${m.defaultValue}` : "";
    const props = m.properties && m.properties.length > 0 ? ` {${m.properties.join(", ")}}` : "";
    return `${v}${der}${m.name}${typ}${mult}${def}${props}`;
  }
  const params = (m.params ?? []).map((p) => {
    const d = p.direction && p.direction !== "in" ? `${p.direction} ` : "";
    const t = p.type ? `: ${p.type}` : "";
    return `${d}${p.name}${t}`;
  }).join(", ");
  const ret = m.type ? `: ${m.type}` : "";
  const props = m.properties && m.properties.length > 0 ? ` {${m.properties.join(", ")}}` : "";
  return `${v}${m.name}(${params})${ret}${props}`;
}

// ─── Rank assignment ──────────────────────────────────────────

/** Returns the {parent, child} of a rank-defining edge, or null for plain assoc. */
function rankEnds(r: UmlClassRelationship): { parent: string; child: string } | null {
  switch (r.kind) {
    case "generalization":
    case "realization":
      return { parent: r.to, child: r.from };
    case "composition":
    case "aggregation":
    case "directed":
    case "dependency":
      return { parent: r.from, child: r.to };
    case "association":
      return null;
  }
}

function computeRanks(ast: UmlClassAst, boxes: UmlClassLayoutBox[]): Map<string, number> {
  const parentsOf = new Map<string, Set<string>>();
  for (const b of boxes) parentsOf.set(b.classifier.id, new Set());
  for (const r of ast.relationships) {
    const ends = rankEnds(r);
    if (ends) parentsOf.get(ends.child)?.add(ends.parent);
  }

  const rank = new Map<string, number>();
  const visiting = new Set<string>();
  function visit(id: string): number {
    if (rank.has(id)) return rank.get(id)!;
    if (visiting.has(id)) return 0; // cycle guard
    visiting.add(id);
    let max = 0;
    for (const p of parentsOf.get(id) ?? []) max = Math.max(max, visit(p) + 1);
    visiting.delete(id);
    rank.set(id, max);
    return max;
  }
  for (const b of boxes) visit(b.classifier.id);
  return rank;
}

// ─── Build layered graph with dummy nodes ────────────────────

let dummyCounter = 0;
function nextDummyId(): string {
  return `__dummy_${dummyCounter++}`;
}

function buildLayeredGraph(
  rels: UmlClassRelationship[],
  boxes: UmlClassLayoutBox[],
  rankByID: Map<string, number>
): { nodes: LNode[]; chains: EdgeChain[] } {
  dummyCounter = 0;
  const nodes: LNode[] = [];
  const byID = new Map<string, LNode>();

  for (const b of boxes) {
    const n: LNode = {
      id: b.classifier.id,
      rank: rankByID.get(b.classifier.id) ?? 0,
      order: 0,
      cx: 0,
      cy: 0,
      w: b.width,
      h: b.height,
      isDummy: false,
      box: b,
    };
    nodes.push(n);
    byID.set(n.id, n);
  }

  const chains: EdgeChain[] = [];
  for (const r of rels) {
    const a = byID.get(r.from);
    const b = byID.get(r.to);
    if (!a || !b) continue;

    if (a.rank === b.rank) {
      chains.push({ rel: r, chain: [a.id, b.id], sameRank: true });
      continue;
    }

    // Order endpoints from lower rank → higher rank for the dummy walk.
    const lo = a.rank < b.rank ? a : b;
    const hi = a.rank < b.rank ? b : a;
    const diff = hi.rank - lo.rank;
    if (diff === 1) {
      // Direct edge — store in original from→to direction.
      chains.push({ rel: r, chain: [r.from, r.to], sameRank: false });
      continue;
    }

    // Insert (diff - 1) dummies on intermediate ranks lo.rank+1 .. hi.rank-1.
    const innerDummies: string[] = [];
    for (let rk = lo.rank + 1; rk < hi.rank; rk++) {
      const d: LNode = {
        id: nextDummyId(),
        rank: rk,
        order: 0,
        cx: 0,
        cy: 0,
        w: 0,
        h: 0,
        isDummy: true,
      };
      nodes.push(d);
      byID.set(d.id, d);
      innerDummies.push(d.id);
    }
    // Chain is stored low→high; mark direction so routing knows from/to.
    const lowToHigh = [lo.id, ...innerDummies, hi.id];
    // Keep `chain` in the *original from→to* sense for adornment orientation.
    const chain = a.rank < b.rank ? lowToHigh : [...lowToHigh].reverse();
    chains.push({ rel: r, chain, sameRank: false });
  }

  return { nodes, chains };
}

function groupByRank(nodes: LNode[]): LNode[][] {
  const ranks: LNode[][] = [];
  for (const n of nodes) {
    while (ranks.length <= n.rank) ranks.push([]);
    ranks[n.rank]!.push(n);
  }
  return ranks;
}

// ─── Crossing minimisation (barycenter) ──────────────────────

function buildSegments(chains: EdgeChain[]): Array<[string, string]> {
  const segs: Array<[string, string]> = [];
  for (const c of chains) {
    if (c.sameRank) continue;
    for (let i = 0; i + 1 < c.chain.length; i++) {
      segs.push([c.chain[i]!, c.chain[i + 1]!]);
    }
  }
  return segs;
}

function orderRanks(ranks: LNode[][], chains: EdgeChain[]): void {
  // Initial order: declaration order within each rank.
  for (const rank of ranks) rank.forEach((n, i) => { n.order = i; });

  const segs = buildSegments(chains);
  const down = new Map<string, string[]>(); // node → neighbours one rank up
  const up = new Map<string, string[]>();   // node → neighbours one rank down
  const nodeRank = new Map<string, number>();
  for (const rank of ranks) for (const n of rank) nodeRank.set(n.id, n.rank);
  for (const [a, b] of segs) {
    const ra = nodeRank.get(a)!, rb = nodeRank.get(b)!;
    const [lo, hi] = ra < rb ? [a, b] : [b, a];
    (up.get(hi) ?? up.set(hi, []).get(hi)!).push(lo);   // hi looks up at lo
    (down.get(lo) ?? down.set(lo, []).get(lo)!).push(hi); // lo looks down at hi
  }

  const orderOf = (id: string, rankNodes: LNode[]): number =>
    rankNodes.find((n) => n.id === id)?.order ?? 0;

  for (let iter = 0; iter < UMLCLASS_CONST.ORDER_ITERATIONS; iter++) {
    const downward = iter % 2 === 0;
    if (downward) {
      for (let r = 1; r < ranks.length; r++) {
        applyBarycenter(ranks[r]!, ranks[r - 1]!, up);
      }
    } else {
      for (let r = ranks.length - 2; r >= 0; r--) {
        applyBarycenter(ranks[r]!, ranks[r + 1]!, down);
      }
    }
    void orderOf;
  }
}

function applyBarycenter(
  rank: LNode[],
  adjacentRank: LNode[],
  neighbourMap: Map<string, string[]>
): void {
  const adjOrder = new Map<string, number>();
  adjacentRank.forEach((n, i) => adjOrder.set(n.id, i));
  const bary = new Map<string, number>();
  rank.forEach((n, i) => {
    const neigh = neighbourMap.get(n.id) ?? [];
    if (neigh.length === 0) { bary.set(n.id, i); return; }
    const sum = neigh.reduce((s, nb) => s + (adjOrder.get(nb) ?? 0), 0);
    bary.set(n.id, sum / neigh.length);
  });
  rank.sort((a, b) => (bary.get(a.id)! - bary.get(b.id)!));
  rank.forEach((n, i) => { n.order = i; });
}

// ─── Coordinate assignment ────────────────────────────────────

function assignCoordinates(
  ranks: LNode[][],
  chains: EdgeChain[],
  _boxByID: Map<string, UmlClassLayoutBox>
): void {
  // Y: rank bands stacked by max height.
  let y = 0;
  for (const rank of ranks) {
    const bandH = Math.max(0, ...rank.map((n) => n.h));
    for (const n of rank) n.cy = y + bandH / 2;
    y += bandH + UMLCLASS_CONST.RANK_SEP;
  }

  // X: initial — left-to-right within rank honouring separation.
  for (const rank of ranks) {
    let cx = 0;
    for (const n of rank) {
      const half = (n.isDummy ? 0 : n.w / 2);
      cx += half;
      n.cx = cx;
      cx += half + sepFor(n);
    }
  }

  // Build adjacency (both directions) for barycenter pulling.
  const segs = buildSegments(chains);
  const neigh = new Map<string, string[]>();
  for (const [a, b] of segs) {
    (neigh.get(a) ?? neigh.set(a, []).get(a)!).push(b);
    (neigh.get(b) ?? neigh.set(b, []).get(b)!).push(a);
  }
  const cxOf = new Map<string, number>();
  const sync = () => { cxOf.clear(); for (const rank of ranks) for (const n of rank) cxOf.set(n.id, n.cx); };
  sync();

  // Iterative median/average placement with order-preserving overlap resolution.
  for (let iter = 0; iter < UMLCLASS_CONST.X_ITERATIONS; iter++) {
    const downward = iter % 2 === 0;
    const order = downward ? [...ranks] : [...ranks].reverse();
    for (const rank of order) {
      // desired x = average of neighbour centres
      for (const n of rank) {
        const ns = neigh.get(n.id) ?? [];
        if (ns.length > 0) {
          const sum = ns.reduce((s, id) => s + (cxOf.get(id) ?? n.cx), 0);
          n.cx = sum / ns.length;
        }
      }
      resolveOverlaps(rank);
      for (const n of rank) cxOf.set(n.id, n.cx);
    }
  }
}

function sepFor(n: LNode): number {
  return n.isDummy ? UMLCLASS_CONST.DUMMY_SEP : UMLCLASS_CONST.NODE_SEP;
}

/** Order-preserving overlap resolution: sweep L→R then R→L enforcing min gap. */
function resolveOverlaps(rank: LNode[]): void {
  // Sort by current cx but keep stable for ties using existing order.
  const sorted = [...rank].sort((a, b) => a.cx - b.cx || a.order - b.order);
  // L→R push right
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const minGap = prev.w / 2 + cur.w / 2 + Math.max(sepFor(prev), sepFor(cur));
    const minCx = prev.cx + minGap;
    if (cur.cx < minCx) cur.cx = minCx;
  }
  // R→L pull left toward desired without re-overlapping (keeps things compact)
  for (let i = sorted.length - 2; i >= 0; i--) {
    const next = sorted[i + 1]!;
    const cur = sorted[i]!;
    const minGap = cur.w / 2 + next.w / 2 + Math.max(sepFor(cur), sepFor(next));
    const maxCx = next.cx - minGap;
    if (cur.cx > maxCx) cur.cx = maxCx;
  }
  // Re-sync order indices to the resolved left-to-right sequence.
  sorted.forEach((n, i) => { n.order = i; });
  rank.sort((a, b) => a.order - b.order);
}

function normaliseCoords(nodes: LNode[], boxes: UmlClassLayoutBox[]): void {
  let minX = Infinity, minY = Infinity;
  for (const b of boxes) { minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); }
  for (const n of nodes) {
    if (n.isDummy) { minX = Math.min(minX, n.cx); minY = Math.min(minY, n.cy); }
  }
  const dx = UMLCLASS_CONST.CANVAS_PAD - minX;
  const dy = UMLCLASS_CONST.CANVAS_PAD - minY;
  for (const b of boxes) { b.x += dx; b.y += dy; }
  for (const n of nodes) { n.cx += dx; n.cy += dy; if (n.box) { /* box already shifted */ } }
  // dummies need their centres in box-coordinate space too
  for (const n of nodes) if (n.isDummy) { /* already shifted above */ }
}

function canvasSize(
  boxes: UmlClassLayoutBox[],
  packages: UmlClassLayoutPackage[]
): { width: number; height: number } {
  if (boxes.length === 0) return { width: 200, height: 100 };
  let maxX = 0, maxY = 0;
  for (const b of boxes) {
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  for (const p of packages) {
    maxX = Math.max(maxX, p.x + p.width);
    maxY = Math.max(maxY, p.y + p.height);
  }
  return {
    width: Math.ceil(maxX + UMLCLASS_CONST.CANVAS_PAD),
    height: Math.ceil(maxY + UMLCLASS_CONST.CANVAS_PAD),
  };
}

// ─── Edge routing ─────────────────────────────────────────────

function routeEdges(
  chains: EdgeChain[],
  nodes: LNode[],
  boxByID: Map<string, UmlClassLayoutBox>,
  vertical: boolean
): { edges: UmlClassLayoutEdge[]; trees: UmlClassLayoutTree[] } {
  const nodeByID = new Map(nodes.map((n) => [n.id, n] as const));
  const edges: UmlClassLayoutEdge[] = [];
  const trees: UmlClassLayoutTree[] = [];

  // ── Tree-merge: group gen/real edges by parent (≥2 children) ──
  const handled = new Set<UmlClassRelationship>();
  const groups = new Map<string, { kind: "generalization" | "realization"; parentId: string; rels: UmlClassRelationship[] }>();
  for (const c of chains) {
    const r = c.rel;
    if (r.kind !== "generalization" && r.kind !== "realization") continue;
    const k = `${r.kind}::${r.to}`;
    if (!groups.has(k)) groups.set(k, { kind: r.kind, parentId: r.to, rels: [] });
    groups.get(k)!.rels.push(r);
  }
  for (const [, group] of groups) {
    if (group.rels.length < UMLCLASS_CONST.TREE_MERGE_THRESHOLD) continue;
    const parent = boxByID.get(group.parentId);
    if (!parent) continue;
    const children = group.rels
      .map((r) => ({ r, box: boxByID.get(r.from) }))
      .filter((c): c is { r: UmlClassRelationship; box: UmlClassLayoutBox } => !!c.box);
    if (children.length < UMLCLASS_CONST.TREE_MERGE_THRESHOLD) continue;
    const tree = buildTree(group.kind, parent, children, vertical);
    if (tree) {
      trees.push(tree);
      for (const r of group.rels) handled.add(r);
    }
  }

  // ── Every other edge ──
  const liftLanes = new Map<number, number>();
  for (const c of chains) {
    if (handled.has(c.rel)) continue;
    const from = boxByID.get(c.rel.from);
    const to = boxByID.get(c.rel.to);
    if (!from || !to) continue;

    if (c.sameRank) {
      edges.push(routeSameRank(c.rel, from, to, vertical, liftLanes));
    } else {
      edges.push(routeChained(c, nodeByID, from, to));
    }
  }

  return { edges, trees };
}

/**
 * Adornment contract (shared with the renderer):
 *   `sourceEnd` / `targetEnd` carry the CLIP point — the exact spot on the box
 *   boundary where the relationship touches. The renderer draws the adornment
 *   (triangle / open-arrow / diamond) with its TIP at that point, pointing INTO
 *   the box, extending outward by the adornment length. The drawn PATH stops at
 *   the adornment's outer base (so the line doesn't poke through it).
 */
function routeChained(
  c: EdgeChain,
  nodeByID: Map<string, LNode>,
  from: UmlClassLayoutBox,
  to: UmlClassLayoutBox
): UmlClassLayoutEdge {
  const interior: Array<{ x: number; y: number }> = [];
  for (let i = 1; i + 1 < c.chain.length; i++) {
    const n = nodeByID.get(c.chain[i]!);
    if (n) interior.push({ x: n.cx, y: n.cy });
  }

  const fromC = boxCenter(from);
  const toC = boxCenter(to);
  const firstAim = interior.length ? interior[0]! : toC;
  const lastAim = interior.length ? interior[interior.length - 1]! : fromC;

  const sClip = intersectRect(from, firstAim);
  const tClip = intersectRect(to, lastAim);
  const sourceEnd: UmlClassLayoutEdgeEnd = { boxId: from.classifier.id, x: sClip.x, y: sClip.y, side: sClip.side };
  const targetEnd: UmlClassLayoutEdgeEnd = { boxId: to.classifier.id, x: tClip.x, y: tClip.y, side: tClip.side };

  const sBase = adornmentBase(sourceEnd, sourceOutset(c.rel.kind));
  const tBase = adornmentBase(targetEnd, targetOutset(c.rel.kind));

  const pts = [sBase, ...interior, tBase];
  return { rel: c.rel, path: polyline(pts), sourceEnd, targetEnd, labelAnchor: midOf(pts) };
}

/** Same-rank edge: lift up over the row band so it never crosses the boxes
 *  sitting between source and target. */
function routeSameRank(
  rel: UmlClassRelationship,
  from: UmlClassLayoutBox,
  to: UmlClassLayoutBox,
  vertical: boolean,
  liftLanes: Map<number, number>
): UmlClassLayoutEdge {
  if (vertical) {
    const laneKey = Math.round((from.y + to.y) / 2);
    const lane = liftLanes.get(laneKey) ?? 0;
    liftLanes.set(laneKey, lane + 1);
    const rowTop = Math.min(from.y, to.y);
    const liftY = rowTop - UMLCLASS_CONST.LIFT_CLEARANCE - lane * UMLCLASS_CONST.LANE_STEP;
    const sourceEnd: UmlClassLayoutEdgeEnd = { boxId: from.classifier.id, x: from.x + from.width / 2, y: from.y, side: "top" };
    const targetEnd: UmlClassLayoutEdgeEnd = { boxId: to.classifier.id, x: to.x + to.width / 2, y: to.y, side: "top" };
    const sBase = adornmentBase(sourceEnd, sourceOutset(rel.kind));
    const tBase = adornmentBase(targetEnd, targetOutset(rel.kind));
    const path = polyline([
      sBase,
      { x: sBase.x, y: liftY },
      { x: tBase.x, y: liftY },
      tBase,
    ]);
    return { rel, path, sourceEnd, targetEnd, labelAnchor: { x: (sBase.x + tBase.x) / 2, y: liftY } };
  }
  const laneKey = Math.round((from.x + to.x) / 2);
  const lane = liftLanes.get(laneKey) ?? 0;
  liftLanes.set(laneKey, lane + 1);
  const colLeft = Math.min(from.x, to.x);
  const liftX = colLeft - UMLCLASS_CONST.LIFT_CLEARANCE - lane * UMLCLASS_CONST.LANE_STEP;
  const sourceEnd: UmlClassLayoutEdgeEnd = { boxId: from.classifier.id, x: from.x, y: from.y + from.height / 2, side: "left" };
  const targetEnd: UmlClassLayoutEdgeEnd = { boxId: to.classifier.id, x: to.x, y: to.y + to.height / 2, side: "left" };
  const sBase = adornmentBase(sourceEnd, sourceOutset(rel.kind));
  const tBase = adornmentBase(targetEnd, targetOutset(rel.kind));
  const path = polyline([
    sBase,
    { x: liftX, y: sBase.y },
    { x: liftX, y: tBase.y },
    tBase,
  ]);
  return { rel, path, sourceEnd, targetEnd, labelAnchor: { x: liftX, y: (sBase.y + tBase.y) / 2 } };
}

// ─── Tree-merge construction (clean layers ⇒ robust geometry) ──

function buildTree(
  kind: "generalization" | "realization",
  parent: UmlClassLayoutBox,
  children: Array<{ r: UmlClassRelationship; box: UmlClassLayoutBox }>,
  vertical: boolean
): UmlClassLayoutTree | undefined {
  if (vertical) {
    const parentBottom = parent.y + parent.height;
    const minChildTop = Math.min(...children.map((c) => c.box.y));
    // Guard: only merge when children really are below the parent.
    if (minChildTop <= parentBottom + 4) return undefined;
    const channelMid = (parentBottom + minChildTop) / 2;
    const junctionY = Math.max(parentBottom + UMLCLASS_CONST.TREE_JUNCTION_OFFSET, channelMid);

    const childXs = children.map((c) => c.box.x + c.box.width / 2);
    const avgChildX = childXs.reduce((a, b) => a + b, 0) / childXs.length;
    const trunkX = Math.max(parent.x + 10, Math.min(parent.x + parent.width - 10, avgChildX));

    // Trunk runs from the junction up to the triangle BASE (one TRIANGLE_H below
    // the parent edge); the renderer draws the triangle tip at parentBottom.
    const trunkBaseY = parentBottom + UMLCLASS_CONST.TRIANGLE_H;
    const trunkD = `M ${round(trunkX)} ${round(junctionY)} L ${round(trunkX)} ${round(trunkBaseY)}`;
    const legPaths = children.map((c) => {
      const cx = c.box.x + c.box.width / 2;
      return `M ${round(cx)} ${round(c.box.y)} L ${round(cx)} ${round(junctionY)} L ${round(trunkX)} ${round(junctionY)}`;
    });
    return {
      parentId: parent.classifier.id,
      childIds: children.map((c) => c.box.classifier.id),
      kind,
      trunkD,
      legPaths,
      parentEnd: { boxId: parent.classifier.id, x: trunkX, y: parentBottom, side: "bottom" },
    };
  }
  const parentRight = parent.x + parent.width;
  const minChildLeft = Math.min(...children.map((c) => c.box.x));
  if (minChildLeft <= parentRight + 4) return undefined;
  const channelMid = (parentRight + minChildLeft) / 2;
  const junctionX = Math.max(parentRight + UMLCLASS_CONST.TREE_JUNCTION_OFFSET, channelMid);
  const childYs = children.map((c) => c.box.y + c.box.height / 2);
  const avgChildY = childYs.reduce((a, b) => a + b, 0) / childYs.length;
  const trunkY = Math.max(parent.y + 10, Math.min(parent.y + parent.height - 10, avgChildY));
  const trunkBaseX = parentRight + UMLCLASS_CONST.TRIANGLE_H;
  const trunkD = `M ${round(junctionX)} ${round(trunkY)} L ${round(trunkBaseX)} ${round(trunkY)}`;
  const legPaths = children.map((c) => {
    const cy = c.box.y + c.box.height / 2;
    return `M ${round(c.box.x)} ${round(cy)} L ${round(junctionX)} ${round(cy)} L ${round(junctionX)} ${round(trunkY)}`;
  });
  return {
    parentId: parent.classifier.id,
    childIds: children.map((c) => c.box.classifier.id),
    kind,
    trunkD,
    legPaths,
    parentEnd: { boxId: parent.classifier.id, x: parentRight, y: trunkY, side: "right" },
  };
}

// ─── Geometry helpers ─────────────────────────────────────────

function boxCenter(b: UmlClassLayoutBox): { x: number; y: number } {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/**
 * dagre's intersectRect — the point on a box's boundary in the direction of
 * `aim` (from the box centre). Returns the cardinal side the point sits on so
 * the renderer can orient the adornment.
 */
function intersectRect(
  b: UmlClassLayoutBox,
  aim: { x: number; y: number }
): { x: number; y: number; side: "top" | "bottom" | "left" | "right" } {
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const dx = aim.x - cx;
  const dy = aim.y - cy;
  let w = b.width / 2;
  let h = b.height / 2;
  if (Math.abs(dy) * w > Math.abs(dx) * h) {
    // top or bottom
    const side = dy < 0 ? "top" : "bottom";
    if (dy < 0) h = -h;
    const sx = dy === 0 ? 0 : (h * dx) / dy;
    return { x: cx + sx, y: cy + h, side };
  }
  // left or right
  const side = dx < 0 ? "left" : "right";
  if (dx < 0) w = -w;
  const sy = dx === 0 ? 0 : (w * dy) / dx;
  return { x: cx + w, y: cy + sy, side };
}

/** Adornment length at the TARGET end, by relationship kind. */
function targetOutset(kind: UmlClassRelationship["kind"]): number {
  switch (kind) {
    case "generalization":
    case "realization": return UMLCLASS_CONST.TRIANGLE_H;
    case "directed":
    case "dependency": return UMLCLASS_CONST.ARROW_LEN;
    case "aggregation":
    case "composition":
    case "association": return 0; // target end is plain
  }
}

/** Adornment length at the SOURCE end (only composition/aggregation diamonds). */
function sourceOutset(kind: UmlClassRelationship["kind"]): number {
  return kind === "composition" || kind === "aggregation" ? UMLCLASS_CONST.DIAMOND_W : 0;
}

/** The outer base point of an adornment whose tip sits at `end` (on the box
 *  boundary), pushed outward along the box-edge normal by `outset`. The drawn
 *  path terminates here so it never overlaps the adornment. */
function adornmentBase(end: UmlClassLayoutEdgeEnd, outset: number): { x: number; y: number } {
  if (outset === 0) return { x: end.x, y: end.y };
  switch (end.side) {
    case "top":    return { x: end.x, y: end.y - outset };
    case "bottom": return { x: end.x, y: end.y + outset };
    case "left":   return { x: end.x - outset, y: end.y };
    case "right":  return { x: end.x + outset, y: end.y };
  }
}

function polyline(pts: Array<{ x: number; y: number }>): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${round(p.x)} ${round(p.y)}`).join(" ");
}

function midOf(pts: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (pts.length === 0) return { x: 0, y: 0 };
  const i = Math.floor((pts.length - 1) / 2);
  const a = pts[i]!, b = pts[i + 1] ?? pts[i]!;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
