/**
 * Network topology — layout engine.
 *
 * Deterministic placement across eight topology modes (§5). No randomness, so
 * golden-string e2e tests are stable. Boundary boxes are the union of member
 * geometry inflated by padding (§5.5), mirroring C4.
 */

import { iconSize, isCloudKind } from "./symbols";
import type {
  DeviceBox,
  GroupBox,
  LinkGeom,
  NetPoint,
  NetworkAst,
  NetworkDevice,
  NetworkLayoutResult,
  NetworkLink,
  TopologyClass,
} from "./types";

export const NET_CONST = {
  DEVICE_W: 64,
  DEVICE_H: 48,
  TIER_BAND_GAP: 104,
  SIBLING_GAP: 44,
  RING_RADIUS_MIN: 120,
  STAR_HUB_GAP: 130,
  SPINE_LEAF_GAP: 140,
  LABEL_GAP: 6,
  LABEL_H: 15,
  SUBLABEL_H: 12,
  GROUP_PAD: 18,
  GROUP_LABEL_INSET: 12,
  GROUP_HEADER: 16,
  CHAR_W: 6.3,
  PAD: 30,
} as const;

const ENDPOINT_KINDS = new Set([
  "pc", "laptop", "mobile", "ipphone", "printer", "camera",
  "server", "serverfarm", "storage", "monitor", "nvr", "dvr",
]);

// ─── small geometry helpers ──────────────────────────────────────

function labelExtra(d: NetworkDevice): number {
  if (isCloudKind(d.kind)) return 0;
  let h = NET_CONST.LABEL_GAP + NET_CONST.LABEL_H;
  if (d.ip || d.model) h += NET_CONST.SUBLABEL_H;
  return h;
}

function labelText(d: NetworkDevice): string {
  return d.label ?? d.id;
}

function deviceFootprint(d: NetworkDevice): { w: number; h: number } {
  return iconSize(d.kind);
}

/** Effective bounding box including the label rendered below the icon. */
function effBox(box: DeviceBox): { left: number; top: number; right: number; bottom: number } {
  const labelW = Math.max(box.w, labelText(box.device).length * NET_CONST.CHAR_W + 6);
  const half = labelW / 2;
  return {
    left: box.cx - half,
    top: box.y,
    right: box.cx + half,
    bottom: box.y + box.h + labelExtra(box.device),
  };
}

/** Point on a box boundary in the direction of (tx, ty). */
function edgePoint(box: DeviceBox, tx: number, ty: number): NetPoint {
  const dx = tx - box.cx;
  const dy = ty - box.cy;
  if (dx === 0 && dy === 0) return { x: box.cx, y: box.cy };
  const hw = box.w / 2;
  const hh = box.h / 2;
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: box.cx + dx * s, y: box.cy + dy * s };
}

// ─── banded placement (tiered + tree share this) ─────────────────

function placeBanded(
  ast: NetworkAst,
  ranks: Map<string, number>,
): Map<string, NetPoint> {
  const lr = ast.direction === "lr";
  // group device ids by rank, preserving declaration order
  const byRank = new Map<number, NetworkDevice[]>();
  for (const d of ast.devices) {
    const r = ranks.get(d.id) ?? 0;
    if (!byRank.has(r)) byRank.set(r, []);
    byRank.get(r)!.push(d);
  }
  const rankValues = [...byRank.keys()].sort((a, b) => a - b);

  // cross-axis size of each row = max footprint along the cross axis
  const pos = new Map<string, NetPoint>();
  // compute total cross-axis width per row to center rows
  let maxRowSpan = 0;
  const rowSpans = new Map<number, number>();
  for (const r of rankValues) {
    const devs = byRank.get(r)!;
    let span = 0;
    devs.forEach((d, i) => {
      const fp = deviceFootprint(d);
      const cross = lr ? fp.h + labelExtra(d) : Math.max(fp.w, labelText(d).length * NET_CONST.CHAR_W + 6);
      span += cross + (i > 0 ? NET_CONST.SIBLING_GAP : 0);
    });
    rowSpans.set(r, span);
    maxRowSpan = Math.max(maxRowSpan, span);
  }

  rankValues.forEach((r, rowIdx) => {
    const devs = byRank.get(r)!;
    const along = rowIdx * NET_CONST.TIER_BAND_GAP;
    let cursor = (maxRowSpan - rowSpans.get(r)!) / 2;
    for (const d of devs) {
      const fp = deviceFootprint(d);
      const cross = lr ? fp.h + labelExtra(d) : Math.max(fp.w, labelText(d).length * NET_CONST.CHAR_W + 6);
      const center = cursor + cross / 2;
      if (lr) pos.set(d.id, { x: along, y: center });
      else pos.set(d.id, { x: center, y: along });
      cursor += cross + NET_CONST.SIBLING_GAP;
    }
  });
  return pos;
}

function adjacency(devices: NetworkDevice[], links: NetworkLink[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const d of devices) adj.set(d.id, new Set());
  for (const l of links) {
    adj.get(l.from)?.add(l.to);
    adj.get(l.to)?.add(l.from);
  }
  return adj;
}

function tieredRanks(ast: NetworkAst, links: NetworkLink[]): Map<string, number> {
  const TIER_RANK: Record<string, number> = { edge: 1, core: 2, distribution: 3, access: 4 };
  const rank = new Map<string, number>();
  for (const d of ast.devices) {
    if (isCloudKind(d.kind)) rank.set(d.id, 0);
    else if (d.tier) rank.set(d.id, TIER_RANK[d.tier]!);
  }
  const adj = adjacency(ast.devices, links);
  // iterative relaxation for unranked devices
  for (let pass = 0; pass < ast.devices.length + 4; pass++) {
    let changed = false;
    for (const d of ast.devices) {
      if (rank.has(d.id)) continue;
      const known: number[] = [];
      for (const n of adj.get(d.id) ?? []) {
        const r = rank.get(n);
        if (r !== undefined) known.push(r);
      }
      if (known.length === 0) continue;
      const next = ENDPOINT_KINDS.has(d.kind)
        ? Math.max(...known) + 1
        : Math.min(...known) + 1;
      rank.set(d.id, next);
      changed = true;
    }
    if (!changed) break;
  }
  // fallback for isolated/unresolved devices
  const maxR = Math.max(0, ...[...rank.values()]);
  for (const d of ast.devices) {
    if (!rank.has(d.id)) rank.set(d.id, ENDPOINT_KINDS.has(d.kind) ? maxR + 1 : 2);
  }
  return rank;
}

function treeRanks(ast: NetworkAst, links: NetworkLink[]): Map<string, number> {
  const adj = adjacency(ast.devices, links);
  const rank = new Map<string, number>();
  // root: first cloud, else highest-degree, else first device
  let root = ast.devices.find((d) => isCloudKind(d.kind));
  if (!root) {
    let best = -1;
    for (const d of ast.devices) {
      const deg = adj.get(d.id)?.size ?? 0;
      if (deg > best) { best = deg; root = d; }
    }
  }
  if (!root) return rank;
  const queue: string[] = [root.id];
  rank.set(root.id, 0);
  while (queue.length) {
    const id = queue.shift()!;
    const r = rank.get(id)!;
    for (const n of adj.get(id) ?? []) {
      if (!rank.has(n)) { rank.set(n, r + 1); queue.push(n); }
    }
  }
  // disconnected devices → rank 0
  for (const d of ast.devices) if (!rank.has(d.id)) rank.set(d.id, 0);
  return rank;
}

function placeCircle(ast: NetworkAst, radiusBase: number): Map<string, NetPoint> {
  const pos = new Map<string, NetPoint>();
  const n = ast.devices.length;
  const radius = Math.max(radiusBase, (n * 56) / (2 * Math.PI));
  ast.devices.forEach((d, i) => {
    const ang = (i / Math.max(1, n)) * 2 * Math.PI - Math.PI / 2;
    pos.set(d.id, { x: radius * Math.cos(ang), y: radius * Math.sin(ang) });
  });
  return pos;
}

function placeStar(ast: NetworkAst, links: NetworkLink[]): Map<string, NetPoint> {
  const adj = adjacency(ast.devices, links);
  let hub = ast.devices[0];
  let best = -1;
  for (const d of ast.devices) {
    const deg = adj.get(d.id)?.size ?? 0;
    if (deg > best) { best = deg; hub = d; }
  }
  const pos = new Map<string, NetPoint>();
  if (!hub) return pos;
  pos.set(hub.id, { x: 0, y: 0 });
  const spokes = ast.devices.filter((d) => d.id !== hub!.id);
  const radius = Math.max(NET_CONST.STAR_HUB_GAP, (spokes.length * 50) / (2 * Math.PI));
  spokes.forEach((d, i) => {
    const ang = (i / Math.max(1, spokes.length)) * 2 * Math.PI - Math.PI / 2;
    pos.set(d.id, { x: radius * Math.cos(ang), y: radius * Math.sin(ang) });
  });
  return pos;
}

function placeBus(ast: NetworkAst): Map<string, NetPoint> {
  const pos = new Map<string, NetPoint>();
  let cursor = 0;
  for (const d of ast.devices) {
    const fp = deviceFootprint(d);
    pos.set(d.id, { x: cursor + fp.w / 2, y: 0 });
    cursor += fp.w + NET_CONST.SIBLING_GAP;
  }
  return pos;
}

function placeSpineLeaf(ast: NetworkAst, links: NetworkLink[]): Map<string, NetPoint> {
  const pos = new Map<string, NetPoint>();
  const spineSet = new Set(ast.spines);
  const leafSet = new Set(ast.leaves);
  const rowGap = NET_CONST.SPINE_LEAF_GAP;
  const step = NET_CONST.DEVICE_W + NET_CONST.SIBLING_GAP;

  const centerRow = (ids: string[], y: number) => {
    const span = (ids.length - 1) * step;
    ids.forEach((id, i) => pos.set(id, { x: i * step - span / 2, y }));
  };
  centerRow(ast.spines, 0);
  centerRow(ast.leaves, rowGap);

  // hosts = everything else; hang below the leaf they connect to (else sequential)
  const adj = adjacency(ast.devices, links);
  const hosts = ast.devices.filter((d) => !spineSet.has(d.id) && !leafSet.has(d.id));
  let seq = 0;
  for (const h of hosts) {
    let anchorX: number | undefined;
    for (const n of adj.get(h.id) ?? []) {
      if (leafSet.has(n)) { anchorX = pos.get(n)?.x; break; }
    }
    pos.set(h.id, { x: anchorX ?? (seq++ * step), y: rowGap * 2 });
  }
  return pos;
}

function placeManual(ast: NetworkAst): Map<string, NetPoint> {
  const pos = new Map<string, NetPoint>();
  let fallback = 0;
  for (const d of ast.devices) {
    if (d.at) pos.set(d.id, { x: d.at.x, y: d.at.y });
    else { pos.set(d.id, { x: fallback * 120, y: 0 }); fallback++; }
  }
  return pos;
}

// ─── spine-leaf auto-mesh links ──────────────────────────────────

function withAutoLinks(ast: NetworkAst): NetworkLink[] {
  if (ast.layout !== "spine-leaf" || ast.spines.length === 0 || ast.leaves.length === 0) {
    return ast.links;
  }
  const have = new Set(ast.links.map((l) => [l.from, l.to].sort().join("↔")));
  const extra: NetworkLink[] = [];
  for (const s of ast.spines) {
    for (const lf of ast.leaves) {
      const key = [s, lf].sort().join("↔");
      if (!have.has(key)) {
        extra.push({ from: s, to: lf, directed: false, linkType: "copper", auto: true });
        have.add(key);
      }
    }
  }
  return [...ast.links, ...extra];
}

// ─── topology classification ─────────────────────────────────────

function classify(ast: NetworkAst): TopologyClass {
  if (ast.devices.length === 2 && ast.links.length === 1) return "point-to-point";
  switch (ast.layout) {
    case "star": return "star";
    case "ring": return "ring";
    case "bus": return "bus";
    case "mesh": return "mesh";
    case "spine-leaf": return "spine-leaf";
    case "tree": return "tree";
    case "tiered": return ast.devices.some((d) => d.tier) ? "hierarchical" : "tree";
    default: return "general";
  }
}

// ─── main ────────────────────────────────────────────────────────

export function layoutNetwork(ast: NetworkAst): NetworkLayoutResult {
  const links = withAutoLinks(ast);

  // 1. centers per mode
  let centers: Map<string, NetPoint>;
  switch (ast.layout) {
    case "tree": centers = placeBanded(ast, treeRanks(ast, links)); break;
    case "star": centers = placeStar(ast, links); break;
    case "ring": centers = placeCircle(ast, NET_CONST.RING_RADIUS_MIN); break;
    case "mesh": centers = placeCircle(ast, NET_CONST.RING_RADIUS_MIN); break;
    case "bus": centers = placeBus(ast); break;
    case "spine-leaf": centers = placeSpineLeaf(ast, links); break;
    case "manual": centers = placeManual(ast); break;
    case "tiered":
    default: centers = placeBanded(ast, tieredRanks(ast, links)); break;
  }

  // 2. device boxes
  const boxes: DeviceBox[] = ast.devices.map((d) => {
    const fp = deviceFootprint(d);
    const c = centers.get(d.id) ?? { x: 0, y: 0 };
    return {
      device: d,
      cx: c.x,
      cy: c.y,
      x: c.x - fp.w / 2,
      y: c.y - fp.h / 2,
      w: fp.w,
      h: fp.h,
      band: 0,
    };
  });
  const boxById = new Map(boxes.map((b) => [b.device.id, b]));

  // 3. group boxes (inner first), union of member geometry + padding
  const groupBoxesRaw = new Map<string, { left: number; top: number; right: number; bottom: number; depth: number }>();
  const depthOf = (id: string): number => {
    let depth = 0;
    let g = ast.groups.find((x) => x.id === id);
    while (g?.parent) { depth++; g = ast.groups.find((x) => x.id === g!.parent); }
    return depth;
  };
  // process deepest groups first so parents can include child boxes
  const groupsByDepth = [...ast.groups].sort((a, b) => depthOf(b.id) - depthOf(a.id));
  for (const g of groupsByDepth) {
    let l = Infinity, t = Infinity, r = -Infinity, bm = -Infinity;
    const addBox = (e: { left: number; top: number; right: number; bottom: number }) => {
      l = Math.min(l, e.left); t = Math.min(t, e.top); r = Math.max(r, e.right); bm = Math.max(bm, e.bottom);
    };
    for (const mid of g.members) { const mb = boxById.get(mid); if (mb) addBox(effBox(mb)); }
    for (const cid of g.children) { const cb = groupBoxesRaw.get(cid); if (cb) addBox(cb); }
    if (l === Infinity) continue; // empty group
    const depth = depthOf(g.id);
    const pad = NET_CONST.GROUP_PAD;
    groupBoxesRaw.set(g.id, {
      left: l - pad,
      top: t - pad - NET_CONST.GROUP_HEADER,
      right: r + pad,
      bottom: bm + pad,
      depth,
    });
  }

  // 4. normalize coordinates (shift so min extent = PAD)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    const e = effBox(b);
    minX = Math.min(minX, e.left); minY = Math.min(minY, e.top);
    maxX = Math.max(maxX, e.right); maxY = Math.max(maxY, e.bottom);
  }
  for (const gb of groupBoxesRaw.values()) {
    minX = Math.min(minX, gb.left); minY = Math.min(minY, gb.top);
    maxX = Math.max(maxX, gb.right); maxY = Math.max(maxY, gb.bottom);
  }
  if (!Number.isFinite(minX)) { minX = 0; minY = 0; maxX = NET_CONST.DEVICE_W; maxY = NET_CONST.DEVICE_H; }

  const dx = NET_CONST.PAD - minX;
  const dy = NET_CONST.PAD - minY;
  for (const b of boxes) { b.x += dx; b.y += dy; b.cx += dx; b.cy += dy; }

  const groups: GroupBox[] = [];
  for (const g of ast.groups) {
    const gb = groupBoxesRaw.get(g.id);
    if (!gb) continue;
    groups.push({
      group: g,
      x: gb.left + dx,
      y: gb.top + dy,
      w: gb.right - gb.left,
      h: gb.bottom - gb.top,
      depth: gb.depth,
    });
  }

  // 5. link geometry (straight, clipped to box boundaries)
  const linkGeoms: LinkGeom[] = links.map((link) => {
    const a = boxById.get(link.from)!;
    const b = boxById.get(link.to)!;
    const p1 = edgePoint(a, b.cx, b.cy);
    const p2 = edgePoint(b, a.cx, a.cy);
    return {
      link,
      points: [p1, p2],
      labelX: (p1.x + p2.x) / 2,
      labelY: (p1.y + p2.y) / 2,
    };
  });

  const width = maxX - minX + 2 * NET_CONST.PAD;
  const height = maxY - minY + 2 * NET_CONST.PAD;

  return {
    ast,
    width: Math.max(width, 120),
    height: Math.max(height, 80),
    devices: boxes,
    links: linkGeoms,
    groups,
    topologyClass: classify(ast),
    warnings: ast.warnings,
    title: ast.title,
  };
}
