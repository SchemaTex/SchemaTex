import type {
  PhyloTreeAST,
  PhyloNode,
  PhyloLayout,
  PhyloMode,
  CladeDef,
  CladeHighlightMode,
} from "../../core/types";

export class PhyloParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhyloParseError";
  }
}

// ─── Newick Parser ──────────────────────────────────────────

let _pos = 0;
let _src = "";
let _nextId = 0;

function genId(): string {
  return `_n${_nextId++}`;
}

function peek(): string {
  return _src[_pos] ?? "";
}

function advance(): string {
  return _src[_pos++] ?? "";
}

function skipWhitespace(): void {
  while (_pos < _src.length && /\s/.test(_src[_pos])) _pos++;
}

function parseNewickName(): string {
  skipWhitespace();
  if (peek() === "'") {
    advance();
    let name = "";
    while (_pos < _src.length) {
      if (peek() === "'") {
        advance();
        if (peek() === "'") {
          name += "'";
          advance();
        } else {
          break;
        }
      } else {
        name += advance();
      }
    }
    return name;
  }
  let name = "";
  while (_pos < _src.length && !/[\s():,;[\]']/.test(_src[_pos])) {
    name += advance();
  }
  return name;
}

function parseNewickLength(): number | undefined {
  skipWhitespace();
  if (peek() !== ":") return undefined;
  advance();
  skipWhitespace();
  let numStr = "";
  while (_pos < _src.length && /[0-9eE.+-]/.test(_src[_pos])) {
    numStr += advance();
  }
  if (!numStr) return undefined;
  const val = Number(numStr);
  return Number.isNaN(val) ? undefined : val;
}

function parseNHX(): { support?: number; nhx?: Record<string, string> } | undefined {
  skipWhitespace();
  if (peek() !== "[") return undefined;
  const start = _pos;
  advance();
  let content = "";
  let depth = 1;
  while (_pos < _src.length && depth > 0) {
    if (peek() === "[") depth++;
    if (peek() === "]") depth--;
    if (depth > 0) content += advance();
    else advance();
  }
  if (content.startsWith("&&NHX:")) {
    const pairs = content.slice(6).split(":");
    const nhx: Record<string, string> = {};
    let support: number | undefined;
    for (const pair of pairs) {
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const key = pair.slice(0, eq);
      const val = pair.slice(eq + 1);
      nhx[key] = val;
      if (key === "B") {
        const num = Number(val);
        if (!Number.isNaN(num)) support = num;
      }
    }
    return { support, nhx };
  }
  // Plain bootstrap value in brackets like [95]
  const num = Number(content.trim());
  if (!Number.isNaN(num) && content.trim().length > 0) {
    return { support: num };
  }
  // Unknown bracket content — rewind
  _pos = start;
  return undefined;
}

function parseNewickSubtree(): PhyloNode {
  skipWhitespace();
  let children: PhyloNode[] = [];

  if (peek() === "(") {
    advance();
    children = [];
    children.push(parseNewickSubtree());
    skipWhitespace();
    while (peek() === ",") {
      advance();
      children.push(parseNewickSubtree());
      skipWhitespace();
    }
    skipWhitespace();
    if (peek() === ")") advance();
  }

  const name = parseNewickName();
  const nhxData = parseNHX();
  const branchLength = parseNewickLength();
  // NHX can also appear after length
  const nhxData2 = nhxData ? undefined : parseNHX();
  const merged = nhxData ?? nhxData2;

  const isLeaf = children.length === 0;
  const id = name || genId();

  return {
    id,
    label: name || undefined,
    branchLength,
    support: merged?.support,
    children,
    isLeaf,
    nhx: merged?.nhx,
  };
}

export function parseNewick(newick: string): PhyloNode {
  _pos = 0;
  _src = newick.trim();
  _nextId = 0;

  if (_src.endsWith(";")) {
    _src = _src.slice(0, -1);
  }

  const root = parseNewickSubtree();
  return root;
}

// ─── Indent DSL Parser ──────────────────────────────────────

interface IndentLine {
  indent: number;
  name: string;
  branchLength?: number;
  support?: number;
}

function parseIndentTree(lines: string[]): PhyloNode {
  _nextId = 0;
  const parsed: IndentLine[] = [];

  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const indent = raw.search(/\S/);
    const content = raw.trim();

    let name: string;
    let branchLength: number | undefined;
    let support: number | undefined;

    // Check for support value [N]
    let contentClean = content;
    const supportMatch = contentClean.match(/\[(\d+(?:\.\d+)?)\]\s*$/);
    if (supportMatch) {
      support = Number(supportMatch[1]);
      contentClean = contentClean.slice(0, supportMatch.index).trim();
    }

    // "Name: length" or ":length" or "Name:" or "Name"
    const colonIdx = contentClean.indexOf(":");
    if (colonIdx === -1) {
      name = contentClean;
    } else {
      name = contentClean.slice(0, colonIdx).trim();
      const lenStr = contentClean.slice(colonIdx + 1).trim();
      if (lenStr) {
        const num = Number(lenStr);
        if (!Number.isNaN(num)) branchLength = num;
      }
    }

    parsed.push({ indent, name, branchLength, support });
  }

  if (parsed.length === 0) {
    throw new PhyloParseError("Empty indent tree definition");
  }

  function buildTree(startIdx: number, parentIndent: number): { node: PhyloNode; nextIdx: number } {
    const line = parsed[startIdx];
    const children: PhyloNode[] = [];
    let idx = startIdx + 1;

    while (idx < parsed.length && parsed[idx].indent > parentIndent) {
      if (parsed[idx].indent === line.indent + 2 || parsed[idx].indent > line.indent) {
        const childIndent = parsed[idx].indent;
        const result = buildTree(idx, childIndent);
        children.push(result.node);
        idx = result.nextIdx;
      } else {
        break;
      }
    }

    const id = line.name || genId();
    return {
      node: {
        id,
        label: line.name || undefined,
        branchLength: line.branchLength,
        support: line.support,
        children,
        isLeaf: children.length === 0,
      },
      nextIdx: idx,
    };
  }

  // Build from the first line
  const rootLine = parsed[0];
  const rootIndent = rootLine.indent;
  const children: PhyloNode[] = [];
  let idx = 1;

  while (idx < parsed.length) {
    if (parsed[idx].indent > rootIndent) {
      const result = buildTree(idx, parsed[idx].indent);
      children.push(result.node);
      idx = result.nextIdx;
    } else {
      break;
    }
  }

  const rootId = rootLine.name || genId();
  return {
    id: rootId,
    label: rootLine.name || undefined,
    branchLength: rootLine.branchLength,
    support: rootLine.support,
    children,
    isLeaf: children.length === 0,
  };
}

// ─── Main Document Parser ───────────────────────────────────

function parseHeaderProps(propsStr: string): {
  layout: PhyloLayout;
  mode: PhyloMode;
  unrooted: boolean;
  branchWidth?: number;
  openAngle?: number;
  mrsd?: string;
} {
  const result: ReturnType<typeof parseHeaderProps> = {
    layout: "rectangular",
    mode: "phylogram",
    unrooted: false,
  };

  const pairs = propsStr.split(",").map((s) => s.trim());
  for (const pair of pairs) {
    if (pair === "unrooted") {
      result.unrooted = true;
      continue;
    }
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim();
    const val = pair.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");

    switch (key) {
      case "layout":
        if (["rectangular", "slanted", "circular", "unrooted"].includes(val)) {
          result.layout = val as PhyloLayout;
        }
        break;
      case "mode":
        if (["phylogram", "cladogram", "chronogram"].includes(val)) {
          result.mode = val as PhyloMode;
        }
        break;
      case "branch-width":
        result.branchWidth = Number(val);
        break;
      case "openAngle":
        result.openAngle = Number(val);
        break;
      case "mrsd":
        result.mrsd = val;
        break;
    }
  }

  if (result.layout === "unrooted") {
    result.unrooted = true;
  }

  return result;
}

function parseCladeLine(line: string): CladeDef | null {
  // clade ID = (member1, member2, ...) [color: "#hex", label: "text", highlight: mode]
  const match = line.match(
    /^clade\s+(\S+)\s*=\s*\(([^)]+)\)\s*(?:\[([^\]]*)\])?\s*$/
  );
  if (!match) return null;

  const id = match[1];
  const members = match[2].split(",").map((s) => s.trim()).filter(Boolean);
  const propsStr = match[3] ?? "";

  let color: string | undefined;
  let label: string | undefined;
  let highlight: CladeHighlightMode | undefined;

  if (propsStr) {
    const colorMatch = propsStr.match(/color:\s*"([^"]+)"/);
    if (colorMatch) color = colorMatch[1];
    const labelMatch = propsStr.match(/label:\s*"([^"]+)"/);
    if (labelMatch) label = labelMatch[1];
    const hlMatch = propsStr.match(/highlight:\s*(\w+)/);
    if (hlMatch && ["branch", "background", "both"].includes(hlMatch[1])) {
      highlight = hlMatch[1] as CladeHighlightMode;
    }
  }

  return { id, members, color, label, highlight };
}

export function parsePhylo(text: string): PhyloTreeAST {
  const lines = text.split("\n");
  let lineIdx = 0;

  // Skip empty lines
  while (lineIdx < lines.length && !lines[lineIdx].trim()) lineIdx++;

  // Parse header: phylo "title" [props]
  const headerLine = lines[lineIdx]?.trim() ?? "";
  if (!headerLine.toLowerCase().startsWith("phylo")) {
    throw new PhyloParseError("Phylo document must start with 'phylo'");
  }
  lineIdx++;

  let title: string | undefined;
  const titleMatch = headerLine.match(/"([^"]+)"/);
  if (titleMatch) title = titleMatch[1];

  let headerProps: ReturnType<typeof parseHeaderProps> = {
    layout: "rectangular",
    mode: "phylogram",
    unrooted: false,
  };
  const propsMatch = headerLine.match(/\[([^\]]+)\]/);
  if (propsMatch) {
    headerProps = parseHeaderProps(propsMatch[1]);
  }

  // Parse body: newick, indent tree, scale, outgroup, clade definitions
  let root: PhyloNode | null = null;
  let scaleLabel: string | undefined;
  let outgroup: string | undefined;
  const clades: CladeDef[] = [];
  const indentLines: string[] = [];
  let inIndentTree = false;

  while (lineIdx < lines.length) {
    const raw = lines[lineIdx];
    const trimmed = raw.trim();
    lineIdx++;

    if (!trimmed || trimmed.startsWith("#")) continue;

    // Newick definition
    if (trimmed.startsWith("newick:")) {
      const newickStr = trimmed.slice(7).trim().replace(/^["']|["']$/g, "");
      root = parseNewick(newickStr);
      inIndentTree = false;
      continue;
    }

    // Scale definition
    if (trimmed.startsWith("scale")) {
      const scaleMatch = trimmed.match(/scale\s+"([^"]+)"/);
      if (scaleMatch) {
        scaleLabel = scaleMatch[1];
      } else {
        scaleLabel = trimmed.slice(5).trim().replace(/^["']|["']$/g, "") || "substitutions/site";
      }
      continue;
    }

    // Outgroup
    if (trimmed.startsWith("outgroup:")) {
      outgroup = trimmed.slice(9).trim();
      continue;
    }

    // Clade definition
    if (trimmed.startsWith("clade ")) {
      const clade = parseCladeLine(trimmed);
      if (clade) clades.push(clade);
      continue;
    }

    // Style line (alternative props)
    if (trimmed.startsWith("style")) {
      const styleProps = trimmed.match(/\[([^\]]+)\]/);
      if (styleProps) {
        headerProps = { ...headerProps, ...parseHeaderProps(styleProps[1]) };
      }
      continue;
    }

    // Indent tree definition
    if (trimmed.endsWith(":") && (trimmed === "root:" || !trimmed.includes(" "))) {
      inIndentTree = true;
      indentLines.push(raw);
      continue;
    }

    if (inIndentTree) {
      indentLines.push(raw);
      continue;
    }
  }

  // Parse indent tree if present and no Newick was found
  if (!root && indentLines.length > 0) {
    root = parseIndentTree(indentLines);
  }

  if (!root) {
    throw new PhyloParseError("No tree definition found (newick: or indent tree)");
  }

  return {
    type: "phylo",
    title,
    root,
    unrooted: headerProps.unrooted,
    layout: headerProps.layout,
    mode: headerProps.mode,
    clades,
    scaleLabel,
    mrsd: headerProps.mrsd,
    outgroup,
    metadata: {},
  };
}
