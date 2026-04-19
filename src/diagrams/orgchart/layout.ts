import type {
  OrgchartAST,
  OrgchartLayoutEdge,
  OrgchartLayoutNode,
  OrgchartLayoutResult,
  OrgchartNode,
} from "./types";

const CARD_W = 240;
const CARD_H = 76;
const TIER_GAP = 44;
const SIB_GAP = 20;
const PADDING = 30;
const ASSISTANT_GAP = 32;


interface TreeNode {
  id: string;
  children: TreeNode[];
  assistants: TreeNode[];
  node: OrgchartNode;
  subtreeWidth: number;
  x: number;
  y: number;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").padEnd(6, "0");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Light tint: mix base color with white at given weight (0 = white, 1 = base). */
function tint(hex: string, weight: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(255 + (r - 255) * weight, 255 + (g - 255) * weight, 255 + (b - 255) * weight);
}

/** Darker shade: mix base with black at given weight (0 = base, 1 = black). */
function shade(hex: string, weight: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - weight), g * (1 - weight), b * (1 - weight));
}

function computeInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (/[^\x00-\x7F]/.test(trimmed[0])) {
    return Array.from(trimmed)[0];
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function layoutOrgchart(
  ast: OrgchartAST,
  palette: readonly string[]
): OrgchartLayoutResult {
  // If any node has info, expand card height to fit 3 text lines
  const hasInfo = ast.nodes.some((n) => !!n.info);
  const cW = CARD_W;
  const cH = hasInfo ? 92 : CARD_H;
  const tierGap = TIER_GAP;
  const sibGap = SIB_GAP;

  const nodeById = new Map<string, OrgchartNode>();
  for (const n of ast.nodes) nodeById.set(n.id, n);

  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  for (const n of ast.nodes) childrenMap.set(n.id, []);
  for (const e of ast.edges) {
    if (e.kind !== "report") continue;
    childrenMap.get(e.from)?.push(e.to);
    parentMap.set(e.to, e.from);
  }

  const roots: OrgchartNode[] = [];
  for (const n of ast.nodes) {
    if (!parentMap.has(n.id) && !n.assistantOf) roots.push(n);
  }

  const treeById = new Map<string, TreeNode>();
  for (const n of ast.nodes) {
    treeById.set(n.id, {
      id: n.id,
      node: n,
      children: [],
      assistants: [],
      subtreeWidth: 0,
      x: 0,
      y: 0,
    });
  }

  for (const n of ast.nodes) {
    const t = treeById.get(n.id)!;
    for (const cid of childrenMap.get(n.id) ?? []) {
      const c = nodeById.get(cid)!;
      if (c.assistantOf === n.id) continue;
      t.children.push(treeById.get(cid)!);
    }
  }
  for (const n of ast.nodes) {
    if (n.assistantOf) {
      const parent = treeById.get(n.assistantOf);
      if (parent) parent.assistants.push(treeById.get(n.id)!);
    }
  }

  function computeWidth(t: TreeNode): number {
    if (t.children.length === 0) {
      t.subtreeWidth = cW;
      return t.subtreeWidth;
    }
    let sum = 0;
    for (let i = 0; i < t.children.length; i++) {
      sum += computeWidth(t.children[i]);
      if (i < t.children.length - 1) sum += sibGap;
    }
    t.subtreeWidth = Math.max(cW, sum);
    return t.subtreeWidth;
  }

  function assign(t: TreeNode, leftX: number, depth: number): void {
    const cx = leftX + t.subtreeWidth / 2;
    t.x = cx;
    t.y = PADDING + depth * (cH + tierGap);
    if (t.children.length > 0) {
      const childBlock = t.children.reduce(
        (s, c, i) => s + c.subtreeWidth + (i > 0 ? sibGap : 0),
        0
      );
      let childLeft = cx - childBlock / 2;
      for (const c of t.children) {
        assign(c, childLeft, depth + 1);
        childLeft += c.subtreeWidth + sibGap;
      }
    }
  }

  let curLeft = PADDING;
  for (const r of roots) {
    const rt = treeById.get(r.id)!;
    computeWidth(rt);
    assign(rt, curLeft, 0);
    curLeft += rt.subtreeWidth + sibGap * 2;
  }

  for (const [, t] of treeById) {
    for (let i = 0; i < t.assistants.length; i++) {
      const a = t.assistants[i];
      a.x = t.x + cW + ASSISTANT_GAP + i * (cW + sibGap);
      a.y = t.y + cH * 0.3;
    }
  }

  // Department color index
  const deptIndex = new Map<string, number>();
  for (const n of ast.nodes) {
    if (n.department && !deptIndex.has(n.department)) {
      deptIndex.set(n.department, deptIndex.size);
    }
  }

  const nodes: OrgchartLayoutNode[] = [];
  for (const n of ast.nodes) {
    const t = treeById.get(n.id)!;
    const deptColor = n.department
      ? palette[(deptIndex.get(n.department) ?? 0) % palette.length]
      : undefined;
    const base =
      n.avatarColor ??
      deptColor ??
      palette[hashString(n.name) % palette.length];
    const avatarBg = tint(base, 0.14);
    const avatarFg = shade(base, 0.4);
    nodes.push({
      node: n,
      x: t.x,
      y: t.y,
      width: cW,
      height: cH,
      deptColor,
      avatarBg,
      avatarFg,
      initials: computeInitials(n.name),
    });
  }

  // Shift all nodes so the leftmost sits at PADDING
  let minX = Infinity;
  for (const n of nodes) minX = Math.min(minX, n.x - n.width / 2);
  const shift = PADDING - minX;
  if (Math.abs(shift) > 0.5) {
    for (const n of nodes) n.x += shift;
  }

  const nodeLayoutById = new Map<string, OrgchartLayoutNode>();
  for (const n of nodes) nodeLayoutById.set(n.node.id, n);

  const layoutEdges: OrgchartLayoutEdge[] = [];
  for (const e of ast.edges) {
    const from = nodeLayoutById.get(e.from);
    const to = nodeLayoutById.get(e.to);
    if (!from || !to) continue;
    if (e.kind === "report") {
      if (to.node.assistantOf === from.node.id) {
        const sx = from.x + from.width / 2;
        const sy = from.y + from.height / 2;
        const ex = to.x - to.width / 2;
        const ey = to.y + to.height / 2;
        layoutEdges.push({ edge: e, path: `M ${sx} ${sy} L ${ex} ${ey}` });
        continue;
      }
      const sx = from.x;
      const sy = from.y + from.height;
      const ex = to.x;
      const ey = to.y;
      const midY = (sy + ey) / 2;
      const path =
        Math.abs(sx - ex) < 0.5
          ? `M ${sx} ${sy} L ${ex} ${ey}`
          : `M ${sx} ${sy} L ${sx} ${midY} L ${ex} ${midY} L ${ex} ${ey}`;
      layoutEdges.push({ edge: e, path });
    } else {
      const sx = from.x;
      const sy = from.y + from.height / 2;
      const ex = to.x;
      const ey = to.y + to.height / 2;
      const midY = (sy + ey) / 2;
      const path = `M ${sx} ${sy} C ${sx} ${midY}, ${ex} ${midY}, ${ex} ${ey}`;
      const entry: OrgchartLayoutEdge = { edge: e, path };
      if (e.label) {
        entry.labelX = (sx + ex) / 2;
        entry.labelY = midY;
      }
      layoutEdges.push(entry);
    }
  }

  let maxX = 0;
  let maxY = 0;
  for (const n of nodes) {
    maxX = Math.max(maxX, n.x + n.width / 2);
    maxY = Math.max(maxY, n.y + n.height);
  }

  const width = Math.max(400, maxX + PADDING);
  const height = Math.max(200, maxY + PADDING);

  return {
    width,
    height,
    nodes,
    edges: layoutEdges,
    title: ast.title,
    mode: "tree",
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// List / directory layout
// ──────────────────────────────────────────────────────────────────────────────

const LIST_ROW_H = 32;
const LIST_INDENT = 22;
const LIST_PAD = 20;
const LIST_PANEL_W = 820;
const LIST_GUIDE_X0 = 32; // x of root caret

export function layoutOrgchartList(
  ast: OrgchartAST,
  palette: readonly string[]
): OrgchartLayoutResult {
  const nodeById = new Map<string, OrgchartNode>();
  for (const n of ast.nodes) nodeById.set(n.id, n);

  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  for (const n of ast.nodes) childrenMap.set(n.id, []);
  for (const e of ast.edges) {
    if (e.kind !== "report") continue;
    childrenMap.get(e.from)?.push(e.to);
    parentMap.set(e.to, e.from);
  }

  const roots: OrgchartNode[] = [];
  for (const n of ast.nodes) {
    if (!parentMap.has(n.id) && !n.assistantOf) roots.push(n);
  }

  // Subtree size (descendants count, excluding self)
  const subtreeSize = new Map<string, number>();
  function computeSize(id: string): number {
    const cached = subtreeSize.get(id);
    if (cached !== undefined) return cached;
    const kids = childrenMap.get(id) ?? [];
    let s = kids.length;
    for (const k of kids) s += computeSize(k);
    subtreeSize.set(id, s);
    return s;
  }
  for (const n of ast.nodes) computeSize(n.id);

  // Department color index
  const deptIndex = new Map<string, number>();
  for (const n of ast.nodes) {
    if (n.department && !deptIndex.has(n.department)) {
      deptIndex.set(n.department, deptIndex.size);
    }
  }

  const nodes: OrgchartLayoutNode[] = [];
  const guides: string[] = [];
  let rowIdx = 0;

  function visit(id: string, depth: number): void {
    const n = nodeById.get(id);
    if (!n) return;
    const y = LIST_PAD + rowIdx * LIST_ROW_H;
    const x = LIST_GUIDE_X0 + depth * LIST_INDENT;
    const deptColor = n.department
      ? palette[(deptIndex.get(n.department) ?? 0) % palette.length]
      : undefined;
    const base =
      n.avatarColor ??
      deptColor ??
      palette[hashString(n.name) % palette.length];
    const kids = childrenMap.get(id) ?? [];
    const hasKids = kids.length > 0;
    nodes.push({
      node: n,
      x,
      y,
      width: LIST_PANEL_W - x - LIST_PAD,
      height: LIST_ROW_H,
      deptColor,
      avatarBg: tint(base, 0.14),
      avatarFg: shade(base, 0.4),
      initials: computeInitials(n.name),
      depth,
      subtreeSize: subtreeSize.get(id) ?? 0,
      hasChildren: hasKids,
    });
    rowIdx++;
    for (const c of kids) visit(c, depth + 1);
  }

  for (const r of roots) visit(r.id, 0);

  // Guide lines: for each parent with children, draw a vertical trunk from its row
  // center down to the last child's row center, plus a short horizontal tick into each child.
  for (let i = 0; i < nodes.length; i++) {
    const p = nodes[i];
    if (!p.hasChildren) continue;
    const pxLine = p.x + 10; // beneath the caret
    const pyStart = p.y + LIST_ROW_H / 2 + 6;
    // Find last descendant child (direct) row y
    const directChildren: OrgchartLayoutNode[] = [];
    for (let j = i + 1; j < nodes.length; j++) {
      const q = nodes[j];
      if ((q.depth ?? 0) <= (p.depth ?? 0)) break;
      if ((q.depth ?? 0) === (p.depth ?? 0) + 1) directChildren.push(q);
    }
    if (directChildren.length === 0) continue;
    const lastChild = directChildren[directChildren.length - 1];
    const pyEnd = lastChild.y + LIST_ROW_H / 2;
    guides.push(`M ${pxLine} ${pyStart} L ${pxLine} ${pyEnd}`);
    for (const c of directChildren) {
      const tickY = c.y + LIST_ROW_H / 2;
      guides.push(`M ${pxLine} ${tickY} L ${c.x - 2} ${tickY}`);
    }
  }

  const height = LIST_PAD * 2 + rowIdx * LIST_ROW_H;
  return {
    width: LIST_PANEL_W,
    height,
    nodes,
    edges: [],
    title: ast.title,
    mode: "list",
    guides,
  };
}
