import { routeNetworkLink, pointOnRoute } from "./routing";
import { estimateTextWidth, wrapTextToWidth } from "../../core/text-metrics";
/**
 * Network topology — layout engine.
 *
 * Deterministic placement across eight topology modes (§5). No randomness, so
 * golden-string e2e tests are stable. Boundary boxes are the union of member
 * geometry inflated by padding (§5.5), mirroring C4.
 */

import { iconSize, isCloudKind, cloudSize } from "./symbols";
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
import { applyPins } from "../../core/editing";

export const NET_CONST = {
  DEVICE_W: 64,
  DEVICE_H: 48,
  TIER_BAND_GAP: 170,
  SIBLING_GAP: 44,
  RING_RADIUS_MIN: 120,
  STAR_HUB_GAP: 130,
  SPINE_LEAF_GAP: 140,
  LABEL_GAP: 6,
  LABEL_H: 15,
  SUBLABEL_H: 12,
  GROUP_PAD: 24,
  GROUP_LABEL_INSET: 12,
  GROUP_HEADER: 16,
  CHAR_W: 6.3,
  PAD: 30,
} as const;

const ENDPOINT_KINDS = new Set([
  "pc", "laptop", "mobile", "ipphone", "printer", "camera",
  "server", "serverfarm", "storage", "monitor", "nvr", "dvr",
  // These distinct kinds previously inherited endpoint placement through aliases.
  "database", "hypervisor", "nas", "san", "tablet",
]);

// ─── small geometry helpers ──────────────────────────────────────

function labelExtra(d: NetworkDevice): number {
  if (isCloudKind(d.kind)) return 0;
  let h = NET_CONST.LABEL_GAP + deviceLabelLines(d).length * NET_CONST.LABEL_H;
  if (d.ip || d.model) h += NET_CONST.SUBLABEL_H;
  return h;
}

function labelText(d: NetworkDevice): string {
  return d.label ?? d.id;
}

export function deviceLabelLines(d: NetworkDevice): string[] {
  return wrapTextToWidth(labelText(d),12,120);
}

function deviceFootprint(d: NetworkDevice): { w: number; h: number } {
  const fp = iconSize(d.kind);
  return isCloudKind(d.kind) ? cloudSize(labelText(d)) : fp;
}

/** Effective bounding box including the label rendered below the icon. */
export function deviceCaption(box: DeviceBox): { x:number; y:number; width:number; height:number; baseline:number } {
  const width=captionWidth(box.device), height=labelExtra(box.device)-NET_CONST.LABEL_GAP;
  const side=box.captionSide==="right";
  const x=side?box.x+box.w+12:box.cx-width/2;
  const baseline=side?box.cy+4-(height-NET_CONST.LABEL_H)/2:box.y+box.h+NET_CONST.LABEL_GAP+11;
  return {x,y:baseline-12,width,height,baseline};
}
function effBox(box: DeviceBox): { left: number; top: number; right: number; bottom: number } {
  const caption=deviceCaption(box);
  return {left:Math.min(box.x,caption.x),top:Math.min(box.y,caption.y),
    right:Math.max(box.x+box.w,caption.x+caption.width),bottom:Math.max(box.y+box.h,caption.y+caption.height)};
}

// ─── banded placement (tiered + tree share this) ─────────────────

function captionWidth(d: NetworkDevice): number {
  return Math.max(...deviceLabelLines(d).map(line=>estimateTextWidth(line,12)), estimateTextWidth(d.ip ?? d.model ?? "", 10)) + 12;
}

function placeBanded(ast: NetworkAst, ranks: Map<string, number>): Map<string, NetPoint> {
  const lr = ast.direction === "lr", pos = new Map<string, NetPoint>();
  const adj = adjacency(ast.devices, ast.links);
  const sideCaption = (d: NetworkDevice) => !lr && !isCloudKind(d.kind) && [...adj.get(d.id)??[]].some(id=>(ranks.get(id)??0)>(ranks.get(d.id)??0));
  const crossSize = (d: NetworkDevice) => sideCaption(d) ? deviceFootprint(d).w + 12 + captionWidth(d) : lr ? deviceFootprint(d).h + labelExtra(d) : Math.max(deviceFootprint(d).w, captionWidth(d));
  const rankValues = [...new Set(ranks.values())].sort((a,b) => a-b);
  const members = (id: string): Set<string> => {
    const g = ast.groups.find(g => g.id === id)!;
    return new Set([...g.members, ...g.children.flatMap(c => [...members(c)])]);
  };
  // A boundary is a placement constraint, not a rectangle drawn after arranging
  // unrelated rows. Flat subset groups inherit their containing group as well.
  const groups = ast.groups.filter(g => g.kind !== "vlan").map(g => ({ id: g.id, members: members(g.id) }));
  const roots = groups.filter(g => g.members.size && !groups.some(other => other !== g &&
    other.members.size > g.members.size && [...g.members].every(id => other.members.has(id))));
  const owned = new Set(roots.flatMap(g => [...g.members]));
  const free = ast.devices.filter(d => !owned.has(d.id));
  const lanes = roots.map(g => ({ ...g, devices: ast.devices.filter(d => g.members.has(d.id)) }));
  // Ungrouped devices alongside a bounded row need their own lane. Ancestors
  // above all groups can still sit centrally over their connected children.
  const boundedRanks = new Set(lanes.flatMap(g => g.devices.map(d => ranks.get(d.id)!)));
  const alongside = free.filter(d => boundedRanks.has(ranks.get(d.id)!));
  if (alongside.length) lanes.unshift({ id: "", members: new Set(alongside.map(d => d.id)), devices: alongside });
  const span = (devs: NetworkDevice[]) => devs.reduce((v,d,i) => v + crossSize(d) + (i ? NET_CONST.SIBLING_GAP : 0),0);
  const widths = lanes.map(g => Math.max(120, ...rankValues.map(r => span(g.devices.filter(d => ranks.get(d.id)===r)))) + 2*NET_CONST.GROUP_PAD);
  const total = Math.max(widths.reduce((a,b)=>a+b,0) + Math.max(0,lanes.length-1)*NET_CONST.SIBLING_GAP, ...rankValues.map(r=>span(free.filter(d=>ranks.get(d.id)===r))));
  const order = (devs: NetworkDevice[]) => [...devs].sort((a,b) => {
    const bary = (d: NetworkDevice) => {
      const neighbors = [...adj.get(d.id) ?? []].map(id => pos.get(id)).filter((p): p is NetPoint => !!p);
      return neighbors.length ? neighbors.reduce((v,p)=>v+(lr?p.y:p.x),0)/neighbors.length : ast.devices.indexOf(d)*100;
    };
    return bary(a)-bary(b);
  });
  const placeRow = (devs: NetworkDevice[], left: number, width: number, along: number) => {
    let cursor = left + (width-span(devs))/2;
    for(const d of order(devs)) { const cross=cursor+(sideCaption(d)?deviceFootprint(d).w/2:crossSize(d)/2);
      pos.set(d.id,lr?{x:along,y:cross}:{x:cross,y:along});cursor+=crossSize(d)+NET_CONST.SIBLING_GAP;
    }
  };
  // Reserve actual along-axis footprints and annotation channels, including
  // long labels in left-to-right diagrams.
  let along = 0;
  rankValues.forEach((r,index) => {
    const row = ast.devices.filter(d=>ranks.get(d.id)===r);
    const extent = Math.max(...row.map(d=>lr?Math.max(deviceFootprint(d).w,captionWidth(d)):deviceFootprint(d).h+labelExtra(d)), 0);
    if(index) along += extent/2 + 60;
    let left=0;
    lanes.forEach((lane,i)=> { placeRow(lane.devices.filter(d=>ranks.get(d.id)===r),left,widths[i],along);left+=widths[i]+NET_CONST.SIBLING_GAP; });
    const outside = free.filter(d=>ranks.get(d.id)===r&&!alongside.includes(d));
    placeRow(outside,0,Math.max(total,span(outside)),along);
    along += extent/2;
  });
  // Pack once in each direction: parent centering followed by child alignment.
  // The second sweep keeps a one-to-one access/endpoint column vertical even
  // when the parent has a wider caption than its endpoint.
  const pack = (row: NetworkDevice[], targets: Map<string,number>) => {
    let end=-Infinity;
    const packed=new Map<string,number>();
    for(const d of [...row].sort((a,b)=>targets.get(a.id)!-targets.get(b.id)!)) {
      const leftExtent=sideCaption(d)?deviceFootprint(d).w/2:crossSize(d)/2;
      const cross=Math.max(targets.get(d.id)!,end+leftExtent);
      packed.set(d.id,cross);end=cross+crossSize(d)-leftExtent+NET_CONST.SIBLING_GAP;
    }
    const shift=row.length?row.reduce((v,d)=>v+targets.get(d.id)!-packed.get(d.id)!,0)/row.length:0;
    for(const d of row){const p=pos.get(d.id)!,cross=packed.get(d.id)!+shift;if(lr)p.y=cross;else p.x=cross;}
  };
  for(const downward of [false,true])for(const r of downward?rankValues:[...rankValues].reverse()) {
    const row=free.filter(d=>ranks.get(d.id)===r&&!alongside.includes(d));
    const targets=new Map<string,number>();
    for(const d of row) {
      const neighbors=[...adj.get(d.id)??[]].filter(id=>downward?(ranks.get(id)??r)<r:(ranks.get(id)??r)>r).map(id=>pos.get(id)!);
      if(neighbors.length)targets.set(d.id,neighbors.reduce((v,p)=>v+(lr?p.y:p.x),0)/neighbors.length);
    }
    for(const d of row)if(!targets.has(d.id)) {
      const peers=downward?[]:[...adj.get(d.id)??[]].map(id=>targets.get(id)).filter((x):x is number=>x!==undefined);
      const current=pos.get(d.id)!;
      targets.set(d.id,peers.length?peers.reduce((a,b)=>a+b,0)/peers.length:(lr?current.y:current.x));
    }
    pack(row,targets);
  }
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

function placeRing(ast: NetworkAst, links: NetworkLink[]): Map<string, NetPoint> {
  const adj=adjacency(ast.devices,links), core=new Set(ast.devices.map(d=>d.id));
  let changed=true;
  while(changed){changed=false;for(const id of core)if([...adj.get(id)??[]].filter(n=>core.has(n)).length<2){core.delete(id);changed=true;}}
  if(!core.size)return placeBanded(ast,treeRanks(ast,links));
  // Follow cycle connectivity, never declaration order. For a mesh core, retain
  // the remaining devices too; chords carry those additional links explicitly.
  const order:string[]=[], remaining=new Set(core);
  let next=remaining.values().next().value as string;
  while(remaining.size){order.push(next);remaining.delete(next);next=[...adj.get(next)??[]].find(n=>remaining.has(n))??remaining.values().next().value as string;}
  const maxCaption=Math.max(...ast.devices.map(captionWidth));
  const step=Math.max(150,maxCaption+40), radius=Math.max(140,step/(2*Math.sin(Math.PI/Math.max(core.size,3))));
  const pos=new Map<string,NetPoint>(), visited=new Set(core);
  order.forEach((id,i)=>{const angle=-Math.PI/2+i*2*Math.PI/order.length;pos.set(id,{x:radius*Math.cos(angle),y:radius*Math.sin(angle)});});
  const branch=(id:string,angle:number,depth:number)=>{
    const children=[...adj.get(id)??[]].filter(n=>!visited.has(n));children.forEach(n=>visited.add(n));
    children.forEach((n,i)=>{const a=angle+(i-(children.length-1)/2)*Math.min(.6,Math.PI/order.length);
      const parent=pos.get(id)!;
      pos.set(n,{x:parent.x+step*Math.cos(a),y:parent.y+step*Math.sin(a)});branch(n,a,depth+1);});
  };
  order.forEach((id,i)=>branch(id,-Math.PI/2+i*2*Math.PI/order.length,0));
  let offset=radius+step;for(const d of ast.devices)if(!pos.has(d.id)){pos.set(d.id,{x:offset,y:radius+step});offset+=step;}
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
  const fabric = new Set([...ast.spines,...ast.leaves]);
  const adj=adjacency(ast.devices,links), ranks=new Map<string,number>();
  ast.spines.forEach(id=>ranks.set(id,0));ast.leaves.forEach(id=>ranks.set(id,1));
  const extras=ast.devices.filter(d=>!fabric.has(d.id));
  // Declared fabric tiers fix their ranks; connected devices follow them.
  for(const d of extras) {
    const neighbors=[...adj.get(d.id)??[]].filter(id=>fabric.has(id));
    if(neighbors.length)ranks.set(d.id,2);
  }
  for(let pass=0;pass<extras.length;pass++)for(const d of extras)if(!ranks.has(d.id)){
    const rs=[...adj.get(d.id)??[]].map(id=>ranks.get(id)).filter((r):r is number=>r!==undefined);
    if(rs.length)ranks.set(d.id,Math.max(...rs)+1);
  }
  for(const d of extras)if(!ranks.has(d.id))ranks.set(d.id,2);
  return placeBanded({...ast, links}, ranks);
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

export function layoutNetwork(
  ast: NetworkAst,
  pins?: Map<string, { x: number; y: number }>
): NetworkLayoutResult {
  const links = withAutoLinks(ast);

  // 1. centers per mode
  let centers: Map<string, NetPoint>;
  switch (ast.layout) {
    case "tree": centers = placeBanded(ast, treeRanks(ast, links)); break;
    case "star": centers = placeStar(ast, links); break;
    case "ring": centers = placeRing(ast, links); break;
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
  const adjacent=adjacency(ast.devices,links);
  for(const b of boxes) b.captionSide=ast.direction!=="lr" && ast.layout!=="ring" && ast.layout!=="mesh" && ast.layout!=="star" &&
    !isCloudKind(b.device.kind) && [...adjacent.get(b.device.id)??[]].some(id=>(boxById.get(id)?.cy??b.cy)>b.cy+1) ? "right" : "below";

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
    if (g.kind === "vlan") continue;
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

  applyPins(boxes, pins, {
    id: (box) => box.device.id,
    position: () => "free",
  });
  for (const b of boxes) {
    b.cx = b.x + b.w / 2;
    b.cy = b.y + b.h / 2;
  }

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

  // VLAN membership can span unrelated branches or physical sites. Show it
  // at each device instead of drawing a false enclosing physical boundary.
  for (const g of ast.groups.filter(g => g.kind === "vlan")) {
    const label = /^vlan\b/i.test(g.label ?? g.id) ? (g.label ?? g.id) : `VLAN ${g.label ?? g.id}`;
    const w = estimateTextWidth(label, 10, {fontWeight:600}) + 20;
    for(const id of g.members) {
      const b = boxById.get(id); if(!b)continue;
      const count=groups.filter(gb=>gb.group.kind==="vlan"&&gb.group.members.includes(id)).length;
      groups.push({group:{...g,members:[id]},x:b.cx-w/2,y:effBox(b).bottom+6+count*22,w,h:18,depth:0});
    }
  }

  // 5. link geometry (straight, clipped to box boundaries)
  // The label defaults to the midpoint, but on long diagonals the midpoint can
  // land on an unrelated device (the label zone of a tiered layout). Try a few
  // positions along the line and keep the first that clears every device box.
  const labelClearsDevices = (x: number, y: number, halfW: number): boolean => {
    const margin = 6;
    for (const b of boxes) {
      const e = effBox(b);
      if (
        x + halfW >= e.left - margin && x - halfW <= e.right + margin &&
        y + 5 >= e.top - margin && y - 5 <= e.bottom + margin
      ) {
        return false;
      }
    }
    return true;
  };

  // Already-placed link labels, so parallel links (e.g. two trunks fanning out
  // of one core switch) don't stack their annotations on the same spot.
  // Assumed extents: ~45px half-width at 9px font, 8px half-height.
  const placedLabels: Array<{ x: number; y: number }> = [];
  const labelClearsPlaced = (x: number, y: number): boolean =>
    placedLabels.every((p) => Math.abs(p.x - x) > 90 || Math.abs(p.y - y) > 16);

  const wireObstacles = boxes.flatMap(b => {
    const c=deviceCaption(b);
    return [{left:b.x,top:b.y,right:b.x+b.w,bottom:b.y+b.h},
      ...(!isCloudKind(b.device.kind)?[{left:c.x-4,right:c.x+c.width+4,top:c.y-4,bottom:c.y+c.height+4}]:[])];
  });
  wireObstacles.push(...groups.map(g=>({left:g.x+6,right:g.x+Math.min(g.w-6,estimateTextWidth(g.group.label??g.group.id,10)+20),top:g.y,bottom:g.y+18})));
  const routed: {net:string;points:NetPoint[]}[]=[];
  const linkGeoms: LinkGeom[] = links.map((link) => {
    const a = boxById.get(link.from)!;
    const b = boxById.get(link.to)!;
    const points = routeNetworkLink(a, b, wireObstacles, routed);
    // Crossing costs are defined only for orthogonal segments in the shared router.
    if(points.every((p,i)=>!i||p.x===points[i-1].x||p.y===points[i-1].y))
      routed.push({net:`${a.device.id}:${b.device.id}`,points});
    const hasAnnotation = Boolean(
      link.label || link.speed || link.mode || (link.vlans && link.vlans.length)
    );
    let labelT = 0.5;
    if (hasAnnotation) {
      // Mirror of the renderer's annotation assembly, for width estimation only.
      const annLen =
        (link.mode ? link.mode.length + 3 : 0) +
        (link.vlans && link.vlans.length ? 6 + link.vlans.join(",").length + 3 : 0) +
        (link.speed ? link.speed.length + 3 : 0) +
        (link.label ? link.label.length : 0);
      const halfW = (annLen * 5.4) / 2;
      const candidates = [0.5, 0.38, 0.62, 0.28, 0.72, 0.2, 0.8, 0.14, 0.86];
      const at = (t: number) => pointOnRoute(points,t).point;
      const strict = candidates.find((t) => {
        const p = at(t);
        return labelClearsDevices(p.x, p.y, halfW) && labelClearsPlaced(p.x, p.y);
      });
      // Degrade gracefully: clearing devices matters more than label spacing
      // (the halo keeps stacked labels legible; a label on a device icon is not).
      const relaxed = strict ?? candidates.find((t) => {
        const p = at(t);
        return labelClearsDevices(p.x, p.y, halfW);
      });
      labelT = relaxed ?? 0.5;
      placedLabels.push({
        ...pointOnRoute(points,labelT).point,
      });
    }
    return {
      link,
      points,
      labelX: pointOnRoute(points,labelT).point.x,
      labelY: pointOnRoute(points,labelT).point.y,
    };
  });

  // Routed channels belong to the canvas too. Normalize before the renderer
  // adds the title band, so a top escape cannot run across the title.
  const geometry=linkGeoms.flatMap(l=>l.points);
  const shiftX=Math.max(0,NET_CONST.PAD-Math.min(...geometry.map(p=>p.x)));
  const shiftY=Math.max(0,NET_CONST.PAD-Math.min(...geometry.map(p=>p.y)));
  for(const b of boxes){b.x+=shiftX;b.cx+=shiftX;b.y+=shiftY;b.cy+=shiftY;}
  for(const g of groups){g.x+=shiftX;g.y+=shiftY;}
  for(const l of linkGeoms){for(const p of l.points){p.x+=shiftX;p.y+=shiftY;}l.labelX+=shiftX;l.labelY+=shiftY;}
  const pinnedMaxX = Math.max(maxX - minX + NET_CONST.PAD, ...boxes.map((b) => effBox(b).right), ...groups.map(g=>g.x+g.w),...geometry.map(p=>p.x));
  const pinnedMaxY = Math.max(maxY - minY + NET_CONST.PAD, ...boxes.map((b) => effBox(b).bottom), ...groups.map(g=>g.y+g.h),...geometry.map(p=>p.y));
  const width = pinnedMaxX + NET_CONST.PAD;
  const height = pinnedMaxY + NET_CONST.PAD;

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
