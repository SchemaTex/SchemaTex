export class SociogramParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SociogramParseError";
  }
}

// ─── AST Types ──────────────────────────────────────────────

export type SociogramLayout = "circular" | "force-directed" | "concentric";
export type EdgeValence = "positive" | "negative" | "neutral";
export type EdgeDirection = "one-way" | "mutual" | "undirected";
export type NodeRole = "star" | "isolate" | "bridge" | "neglectee" | "rejected";
export type SizingMode = "uniform" | "in-degree" | "betweenness";
export type ColoringMode = "default" | "group" | "role";

export interface SociogramNode {
  id: string;
  label?: string;
  group?: string;
  role?: NodeRole;
  size?: "small" | "medium" | "large";
  properties?: Record<string, string>;
}

export interface SociogramEdge {
  from: string;
  to: string;
  direction: EdgeDirection;
  valence: EdgeValence;
  weight: number;
  label?: string;
}

export interface SociogramGroup {
  id: string;
  label?: string;
  color?: string;
  members: string[];
}

export interface SociogramConfig {
  layout: SociogramLayout;
  sizing: SizingMode;
  coloring: ColoringMode;
  highlight: string[];
}

export interface SociogramAST {
  type: "sociogram";
  title?: string;
  config: SociogramConfig;
  nodes: SociogramNode[];
  edges: SociogramEdge[];
  groups: SociogramGroup[];
}

// ─── Edge Operator Parsing ──────────────────────────────────

interface EdgeOp {
  direction: EdgeDirection;
  valence: EdgeValence;
  weight: number;
}

const EDGE_OPS: [string, EdgeOp][] = [
  ["<===>", { direction: "mutual", valence: "positive", weight: 4 }],
  ["===>" , { direction: "one-way", valence: "positive", weight: 4 }],
  ["<===", { direction: "one-way", valence: "positive", weight: 4 }],
  ["<==>", { direction: "mutual", valence: "positive", weight: 3 }],
  ["==>" , { direction: "one-way", valence: "positive", weight: 3 }],
  ["<==", { direction: "one-way", valence: "positive", weight: 3 }],
  ["===", { direction: "undirected", valence: "positive", weight: 3 }],
  ["<x->", { direction: "mutual", valence: "negative", weight: 2 }],
  ["-x>", { direction: "one-way", valence: "negative", weight: 2 }],
  ["<x-", { direction: "one-way", valence: "negative", weight: 2 }],
  ["-x-", { direction: "undirected", valence: "negative", weight: 2 }],
  ["<.->", { direction: "mutual", valence: "neutral", weight: 2 }],
  [".->",  { direction: "one-way", valence: "neutral", weight: 2 }], // part of -.>
  ["-.-", { direction: "undirected", valence: "neutral", weight: 2 }],
  ["<->", { direction: "mutual", valence: "positive", weight: 2 }],
  ["->",  { direction: "one-way", valence: "positive", weight: 2 }],
  ["<-",  { direction: "one-way", valence: "positive", weight: 2 }],
  ["--",  { direction: "undirected", valence: "positive", weight: 2 }],
];

function findEdgeOp(line: string): { leftId: string; rightId: string; op: EdgeOp; rest: string } | null {
  for (const [opStr, op] of EDGE_OPS) {
    const idx = line.indexOf(` ${opStr} `);
    if (idx === -1) continue;

    const leftId = line.slice(0, idx).trim();
    const afterOp = line.slice(idx + opStr.length + 2).trim();

    if (!leftId || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(leftId)) continue;

    // Right side: ID [props]
    const rightMatch = afterOp.match(/^([a-zA-Z][a-zA-Z0-9_-]*)(.*)/);
    if (!rightMatch) continue;

    const rightId = rightMatch[1];
    const rest = rightMatch[2].trim();

    // Handle reverse direction
    if (opStr === "<-" || opStr === "<==" || opStr === "<===" || opStr === "<x-") {
      return { leftId: rightId, rightId: leftId, op: { ...op, direction: "one-way" }, rest };
    }

    return { leftId, rightId, op, rest };
  }

  // Try -.> which has the dot embedded
  const dashDotMatch = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s+-\.>\s+([a-zA-Z][a-zA-Z0-9_-]*)(.*)/);
  if (dashDotMatch) {
    return {
      leftId: dashDotMatch[1],
      rightId: dashDotMatch[2],
      op: { direction: "one-way", valence: "neutral", weight: 2 },
      rest: dashDotMatch[3].trim(),
    };
  }

  return null;
}

// ─── Property Parsing ───────────────────────────────────────

function parseProperties(propsStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Match key: "value" or key: value pairs
  const regex = /(\w[\w-]*):\s*(?:"([^"]*)"|([^\s,\]]+))/g;
  let match;
  while ((match = regex.exec(propsStr)) !== null) {
    result[match[1]] = match[2] ?? match[3];
  }
  return result;
}

function extractProps(line: string): { clean: string; props: Record<string, string> } {
  const bracketMatch = line.match(/\[([^\]]*)\]/);
  if (!bracketMatch) return { clean: line, props: {} };
  const clean = line.slice(0, bracketMatch.index).trim();
  const props = parseProperties(bracketMatch[1]);
  return { clean, props };
}

// ─── Main Parser ────────────────────────────────────────────

export function parseSociogram(text: string): SociogramAST {
  const lines = text.split("\n");
  let lineIdx = 0;

  // Skip empty lines
  while (lineIdx < lines.length && !lines[lineIdx].trim()) lineIdx++;

  // Parse header
  const headerLine = lines[lineIdx]?.trim() ?? "";
  if (!headerLine.toLowerCase().startsWith("sociogram")) {
    throw new SociogramParseError("Sociogram must start with 'sociogram'");
  }
  lineIdx++;

  let titleStr: string | undefined;
  const titleMatch = headerLine.match(/"([^"]+)"/);
  if (titleMatch) titleStr = titleMatch[1];

  const config: SociogramConfig = {
    layout: "circular",
    sizing: "uniform",
    coloring: "default",
    highlight: ["stars", "isolates"],
  };

  const nodes: SociogramNode[] = [];
  const edges: SociogramEdge[] = [];
  const groups: SociogramGroup[] = [];
  const nodeIds = new Set<string>();

  let currentGroup: SociogramGroup | null = null;

  while (lineIdx < lines.length) {
    const raw = lines[lineIdx];
    const trimmed = raw.trim();
    lineIdx++;

    if (!trimmed || trimmed.startsWith("#")) continue;

    // Config line
    if (trimmed.startsWith("config:")) {
      const configBody = trimmed.slice(7).trim();
      const eqIdx = configBody.indexOf("=");
      if (eqIdx !== -1) {
        const key = configBody.slice(0, eqIdx).trim();
        const val = configBody.slice(eqIdx + 1).trim();
        switch (key) {
          case "layout":
            if (["circular", "force-directed", "concentric"].includes(val)) {
              config.layout = val as SociogramLayout;
            }
            break;
          case "sizing":
            if (["uniform", "in-degree", "betweenness"].includes(val)) {
              config.sizing = val as SizingMode;
            }
            break;
          case "coloring":
            if (["default", "group", "role"].includes(val)) {
              config.coloring = val as ColoringMode;
            }
            break;
          case "highlight":
            config.highlight = val.split(",").map((s) => s.trim());
            break;
        }
      }
      continue;
    }

    // Group definition
    if (trimmed.startsWith("group ")) {
      const { clean, props } = extractProps(trimmed.slice(6).trim());
      const groupId = clean.split(/\s/)[0];
      currentGroup = {
        id: groupId,
        label: props.label ?? groupId,
        color: props.color,
        members: [],
      };
      groups.push(currentGroup);
      continue;
    }

    // Check indentation for group members
    const indent = raw.search(/\S/);
    if (currentGroup && indent >= 4) {
      const { clean, props } = extractProps(trimmed);
      const memberId = clean.split(/\s/)[0];
      if (memberId && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(memberId)) {
        currentGroup.members.push(memberId);
        if (!nodeIds.has(memberId)) {
          nodeIds.add(memberId);
          nodes.push({
            id: memberId,
            label: props.label,
            group: currentGroup.id,
            role: props.role as NodeRole | undefined,
            size: props.size as "small" | "medium" | "large" | undefined,
          });
        }
        continue;
      }
    }

    if (indent < 4) {
      currentGroup = null;
    }

    // Try edge parsing
    const edgeResult = findEdgeOp(trimmed);
    if (edgeResult) {
      const { leftId, rightId, op, rest } = edgeResult;
      const edgeProps = extractProps(rest).props;

      // Auto-register nodes
      for (const id of [leftId, rightId]) {
        if (!nodeIds.has(id)) {
          nodeIds.add(id);
          nodes.push({ id });
        }
      }

      const weight = edgeProps.weight ? Number(edgeProps.weight) : op.weight;

      edges.push({
        from: leftId,
        to: rightId,
        direction: op.direction,
        valence: op.valence,
        weight,
        label: edgeProps.label,
      });
      continue;
    }

    // Node definition: ID [props]
    const { clean, props } = extractProps(trimmed);
    const nodeId = clean.split(/\s/)[0];
    if (nodeId && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(nodeId) && !nodeIds.has(nodeId)) {
      nodeIds.add(nodeId);
      const node: SociogramNode = {
        id: nodeId,
        label: props.label,
        group: props.group,
        role: props.role as NodeRole | undefined,
        size: props.size as "small" | "medium" | "large" | undefined,
      };
      nodes.push(node);

      // Auto-add to group by group property
      if (props.group) {
        let grp = groups.find((g) => g.id === props.group);
        if (!grp) {
          grp = { id: props.group, members: [] };
          groups.push(grp);
        }
        grp.members.push(nodeId);
      }
    }
  }

  return {
    type: "sociogram",
    title: titleStr,
    config,
    nodes,
    edges,
    groups,
  };
}
