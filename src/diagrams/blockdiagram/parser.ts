import type {
  BlockAST,
  BlockEdge,
  BlockNode,
  BlockRole,
  SchematexDiagnostic,
  SummingJunction,
} from "../../core/types";
import { IDENTIFIER_SOURCE, isIdentifier } from "../../core/identifier";
import {
  decodeDslString,
  readLogicalLines,
  UnterminatedDslStringError,
} from "../../core/logical-lines";
import { extractQuotedString } from "../../core/quotes";

const QUOTED_CONTENT = String.raw`((?:[^"\\]|\\.)*)`;
const BLOCK_DECL_RE = new RegExp(
  `^(${IDENTIFIER_SOURCE})\\s*=\\s*block\\s*\\(\\s*"${QUOTED_CONTENT}"\\s*\\)\\s*(?:\\[([^\\]]*)\\])?\\s*$`,
  "u"
);
const SUM_DECL_RE = new RegExp(
  `^(${IDENTIFIER_SOURCE})\\s*=\\s*sum\\s*\\(([^)]*)\\)\\s*$`,
  "u"
);
const SIGNAL_DECL_RE = new RegExp(
  `^(${IDENTIFIER_SOURCE})\\s*=\\s*signal\\s*\\(\\s*"${QUOTED_CONTENT}"\\s*\\)\\s*(?:\\[([^\\]]*)\\])?\\s*$`,
  "u"
);
const BRACKETED_IDENTIFIER_RE = new RegExp(`^\\[(${IDENTIFIER_SOURCE})\\]$`, "u");
const BOUNDARY_PORT_IDS = new Set(["in", "out"]);

export class BlockDiagramParseError extends Error {
  public code?: string;
  public hint?: string;

  constructor(
    message: string,
    public line?: number,
    public column?: number,
    public source?: string,
    code?: string,
    hint?: string
  ) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "BlockDiagramParseError";
    this.code = code;
    this.hint = hint;
  }
}

const ROLE_VALUES = new Set<BlockRole>([
  "plant",
  "controller",
  "sensor",
  "actuator",
  "reference",
  "disturbance",
  "input",
  "output",
  "generic",
]);

interface SignalDecl {
  id: string;
  label: string;
  discrete: boolean;
}

interface ParsedAttrs {
  role?: BlockRole;
  discrete?: boolean;
  label?: string;
  route?: "above" | "below";
}

type AttrContext = "block" | "signal" | "connection";

function splitAttrs(source: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuote = false;
  let escaped = false;
  for (const ch of source) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (inQuote && ch === "\\") {
      current += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') inQuote = !inQuote;
    if (ch === "," && !inQuote) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function unquoteAttr(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return decodeDslString(value.slice(1, -1));
  }
  return value;
}

function parseAttrs(
  source: string,
  context: AttrContext,
  line: number,
  statement: string,
  warnings: SchematexDiagnostic[]
): ParsedAttrs {
  const result: ParsedAttrs = {};
  const parts = splitAttrs(source).map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    if (part === "discrete") {
      if (context === "block") {
        throw parserError(
          '`discrete` is not valid on a block declaration',
          line,
          statement,
          "BLOCK_UNKNOWN_ATTRIBUTE",
          "Block attributes are `role: ...` and `route: above|below`."
        );
      }
      result.discrete = true;
      continue;
    }
    if (part.startsWith('"') && part.endsWith('"')) {
      if (context !== "connection" || parts.length !== 1) {
        throw parserError(
          "a bare quoted label is only valid as the sole connection attribute",
          line,
          statement,
          "BLOCK_INVALID_ATTRIBUTE",
          'Use `["label"]`, or combine attributes as `[label: "label", discrete]`.'
        );
      }
      result.label = unquoteAttr(part);
      continue;
    }
    const match = part.match(/^(\w+)\s*:\s*(.+)$/);
    if (!match) {
      throw parserError(
        `invalid ${context} attribute "${part}"`,
        line,
        statement,
        "BLOCK_INVALID_ATTRIBUTE"
      );
    }
    const key = match[1]!.toLowerCase();
    const rawValue = match[2]!.trim();
    const value = unquoteAttr(rawValue);

    if (context === "block" && key === "role") {
      if (!ROLE_VALUES.has(value as BlockRole)) {
        warnings.push({
          severity: "warning",
          code: "blockdiagram/unknown-role",
          message: `unknown block role "${value}"; rendered with the neutral generic role`,
          token: value,
          line,
          fatal: false,
        });
        result.role = "generic";
        continue;
      }
      result.role = value as BlockRole;
      continue;
    }
    if (context === "block" && key === "route") {
      if (value !== "above" && value !== "below") {
        throw parserError(
          `invalid route "${value}"`,
          line,
          statement,
          "BLOCK_INVALID_ATTRIBUTE_VALUE",
          "Use `route: above` or `route: below`."
        );
      }
      result.route = value;
      continue;
    }
    if (context === "connection" && key === "label") {
      if (!rawValue.startsWith('"') || !rawValue.endsWith('"')) {
        throw parserError(
          "connection labels must be double-quoted",
          line,
          statement,
          "BLOCK_INVALID_ATTRIBUTE_VALUE",
          'Use `[label: "signal"]`.'
        );
      }
      result.label = value;
      continue;
    }
    if (context === "connection") {
      warnings.push({
        severity: "warning",
        code: "blockdiagram/unknown-connection-attribute",
        message: `unknown connection attribute "${key}"; ignored`,
        token: match[1]!,
        line,
        fatal: false,
      });
      continue;
    }
    throw parserError(
      `unknown ${context} attribute "${key}"`,
      line,
      statement,
      "BLOCK_UNKNOWN_ATTRIBUTE"
    );
  }
  return result;
}

function parserError(
  message: string,
  line: number,
  source: string,
  code: string,
  hint?: string
): BlockDiagramParseError {
  return new BlockDiagramParseError(
    message,
    line,
    undefined,
    source,
    code,
    hint
  );
}

function parseBlockHeader(line: string, lineNo: number): string | undefined {
  const match = /^blockdiagram\b/i.exec(line);
  if (!match) return undefined;
  const remainder = line.slice(match[0].length).trim();
  if (!remainder) return undefined;
  let quoted: ReturnType<typeof extractQuotedString>;
  try {
    quoted = extractQuotedString(remainder, 0);
  } catch {
    quoted = null;
  }
  if (!quoted || remainder.slice(quoted.end).trim()) {
    throw parserError(
      "invalid blockdiagram header",
      lineNo,
      line,
      "BLOCK_INVALID_HEADER",
      'Use `blockdiagram` or `blockdiagram "Title"` with no trailing content.'
    );
  }
  return decodeDslString(quoted.value);
}

export function parseBlockDiagram(text: string): BlockAST {
  let statements: ReturnType<typeof readLogicalLines>;
  try {
    statements = readLogicalLines(text, {
      fullLineCommentMarkers: ["#"],
      inlineCommentMarkers: ["#"],
    });
  } catch (error) {
    if (error instanceof UnterminatedDslStringError) {
      throw parserError(
        "unterminated quoted label",
        error.line,
        error.source ?? "",
        "BLOCK_UNTERMINATED_STRING",
        "Close the label with `\"`; use `\\n` or a physical newline only inside a closed quoted string."
      );
    }
    throw error;
  }

  const header = statements[0];
  if (!header) {
    throw new BlockDiagramParseError(
      "missing `blockdiagram` header",
      undefined,
      undefined,
      undefined,
      "BLOCK_MISSING_HEADER"
    );
  }
  const headerLine = header.text.trim();
  if (!/^blockdiagram\b/i.test(headerLine)) {
    throw parserError(
      "the first statement must be a blockdiagram header",
      header.line,
      headerLine,
      "BLOCK_MISSING_HEADER",
      'Start with `blockdiagram` or `blockdiagram "Title"`.'
    );
  }
  const title = parseBlockHeader(headerLine, header.line);
  const blocks: BlockNode[] = [];
  const sums: SummingJunction[] = [];
  const connections: BlockEdge[] = [];
  const warnings: SchematexDiagnostic[] = [];
  const signals = new Map<string, SignalDecl>();

  const declared = (id: string): boolean =>
    blocks.some((block) => block.id === id) ||
    sums.some((sum) => sum.id === id) ||
    signals.has(id);

  const assertFresh = (id: string, line: number, source: string): void => {
    const existing = blocks.find((block) => block.id === id);
    if (existing?.synthetic) return;
    if (declared(id)) {
      throw parserError(
        `duplicate declaration for "${id}"`,
        line,
        source,
        "BLOCK_DUPLICATE_ID"
      );
    }
  };

  const declareBlock = (node: BlockNode): void => {
    const syntheticIndex = blocks.findIndex(
      (block) => block.id === node.id && block.synthetic
    );
    if (syntheticIndex >= 0 && !node.synthetic) {
      blocks[syntheticIndex] = node;
    } else if (syntheticIndex < 0) {
      blocks.push(node);
    }
  };

  for (const statement of statements.slice(1)) {
    const line = statement.text.trim();
    const lineNo = statement.line;

    if (/^blockdiagram\b/i.test(line)) {
      throw parserError(
        "multiple blockdiagram headers are not allowed",
        lineNo,
        line,
        "BLOCK_MULTIPLE_HEADERS"
      );
    }

    const blockMatch = line.match(BLOCK_DECL_RE);
    if (blockMatch) {
      const id = blockMatch[1]!;
      assertFresh(id, lineNo, line);
      const attrs = blockMatch[3]
        ? parseAttrs(blockMatch[3], "block", lineNo, line, warnings)
        : {};
      const node: BlockNode = {
        id,
        label: decodeDslString(blockMatch[2]!),
        role: attrs.role ?? "generic",
        sourceLine: lineNo,
      };
      if (attrs.route) node.route = attrs.route;
      declareBlock(node);
      continue;
    }

    const sumMatch = line.match(SUM_DECL_RE);
    if (sumMatch) {
      const id = sumMatch[1]!;
      assertFresh(id, lineNo, line);
      const inputs = sumMatch[2]!
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) =>
          entry.startsWith("+") || entry.startsWith("-") ? entry : `+${entry}`
        );
      sums.push({ id, inputs });
      continue;
    }

    const signalMatch = line.match(SIGNAL_DECL_RE);
    if (signalMatch) {
      const id = signalMatch[1]!;
      assertFresh(id, lineNo, line);
      const attrs = signalMatch[3]
        ? parseAttrs(signalMatch[3], "signal", lineNo, line, warnings)
        : {};
      signals.set(id, {
        id,
        label: decodeDslString(signalMatch[2]!),
        discrete: !!attrs.discrete,
      });
      continue;
    }

    if (line.includes("->")) {
      let body = line;
      let tailAttrs: ParsedAttrs = {};

      if (body.endsWith("]")) {
        let bracketStart = -1;
        let depth = 0;
        let inQuote = false;
        let escaped = false;
        for (let index = body.length - 1; index >= 1; index--) {
          const ch = body[index]!;
          if (escaped) {
            escaped = false;
            continue;
          }
          if (inQuote && ch === "\\") {
            escaped = true;
            continue;
          }
          if (ch === '"') inQuote = !inQuote;
          else if (!inQuote && ch === "]") depth++;
          else if (!inQuote && ch === "[") {
            depth--;
            if (depth === 0) {
              if (/\s/.test(body[index - 1] ?? "")) bracketStart = index;
              break;
            }
          }
        }
        if (bracketStart >= 0) {
          const inner = body.slice(bracketStart + 1, -1).trim();
          if (!isIdentifier(inner)) {
            body = body.slice(0, bracketStart).trim();
            tailAttrs = parseAttrs(inner, "connection", lineNo, line, warnings);
          }
        }
      }

      const rawEndpoints = body
        .split("->")
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (rawEndpoints.length < 2) {
        throw parserError(
          `invalid connection: ${line}`,
          lineNo,
          line,
          "BLOCK_INVALID_CONNECTION"
        );
      }

      const endpoints = rawEndpoints.map((raw) => {
        const bracketed = BRACKETED_IDENTIFIER_RE.exec(raw);
        const id = bracketed?.[1] ?? raw;
        if (!isIdentifier(id)) {
          throw parserError(
            `invalid endpoint "${raw}"`,
            lineNo,
            line,
            "BLOCK_INVALID_ENDPOINT"
          );
        }
        return { id, explicitShorthand: bracketed !== null };
      });

      for (const endpoint of endpoints) {
        if (declared(endpoint.id) || BOUNDARY_PORT_IDS.has(endpoint.id)) continue;
        if (!endpoint.explicitShorthand) {
          throw parserError(
            `undeclared endpoint "${endpoint.id}"`,
            lineNo,
            line,
            "BLOCK_UNDECLARED_ENDPOINT",
            `Declare \`${endpoint.id} = block("…")\`, or use \`[${endpoint.id}]\` to request an explicit shorthand block.`
          );
        }
        declareBlock({
          id: endpoint.id,
          label: endpoint.id,
          role: "generic",
          synthetic: true,
          sourceLine: lineNo,
        });
      }

      for (let index = 0; index < endpoints.length - 1; index++) {
        const edge: BlockEdge = {
          from: endpoints[index]!.id,
          to: endpoints[index + 1]!.id,
        };
        if (index === endpoints.length - 2) {
          if (tailAttrs.label) edge.label = tailAttrs.label;
          if (tailAttrs.discrete) edge.discrete = true;
        }
        connections.push(edge);
      }
      continue;
    }

    throw parserError(
      `unrecognized statement: ${line.replace(/\s+/g, " ")}`,
      lineNo,
      line,
      "BLOCK_UNKNOWN_STATEMENT",
      "Use a block/sum/signal declaration or a directed `A -> B` connection."
    );
  }

  if (signals.size > 0) {
    const merged: BlockEdge[] = [];
    const bySource = new Map<string, BlockEdge[]>();
    const byTarget = new Map<string, BlockEdge[]>();
    for (const edge of connections) {
      const outgoing = bySource.get(edge.from) ?? [];
      outgoing.push(edge);
      bySource.set(edge.from, outgoing);
      const incoming = byTarget.get(edge.to) ?? [];
      incoming.push(edge);
      byTarget.set(edge.to, incoming);
    }

    const consumed = new Set<BlockEdge>();
    for (const signal of signals.values()) {
      const incoming = byTarget.get(signal.id) ?? [];
      const outgoing = bySource.get(signal.id) ?? [];
      if (incoming.length > 0 && outgoing.length > 0) {
        for (const source of incoming) {
          for (const target of outgoing) {
            consumed.add(source);
            consumed.add(target);
            merged.push({
              from: source.from,
              to: target.to,
              label: source.label ?? target.label ?? signal.label,
              discrete:
                signal.discrete || !!source.discrete || !!target.discrete,
            });
          }
        }
      } else if (incoming.length > 0) {
        for (const source of incoming) {
          consumed.add(source);
          merged.push({
            from: source.from,
            to: signal.id,
            label: source.label ?? signal.label,
            discrete: signal.discrete || !!source.discrete,
          });
        }
      } else if (outgoing.length > 0) {
        for (const target of outgoing) {
          consumed.add(target);
          merged.push({
            from: signal.id,
            to: target.to,
            label: target.label ?? signal.label,
            discrete: signal.discrete || !!target.discrete,
          });
        }
      }
    }
    for (const edge of connections) {
      if (!consumed.has(edge)) merged.push(edge);
    }
    connections.splice(0, connections.length, ...merged);
  }

  return {
    type: "blockdiagram",
    title,
    blocks,
    sums,
    connections,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
