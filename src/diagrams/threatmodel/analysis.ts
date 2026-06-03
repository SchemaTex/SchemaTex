/**
 * Threat Model analysis — STRIDE-per-element mapping + trust-boundary-crossing
 * detection. This is the engine's differentiator.
 *
 * Per docs/reference/46-THREAT-MODEL-STRIDE-STANDARD.md §"The STRIDE-per-element
 * mapping" + §"Engine computation":
 *
 *   | DFD element       | S | T | R  | I | D | E |
 *   | External entity   | ✓ |   | ✓  |   |   |   |   → S R
 *   | Process           | ✓ | ✓ | ✓  | ✓ | ✓ | ✓ |   → S T R I D E
 *   | Data store        |   | ✓ | ✓* | ✓ | ✓ |   |   → T (R?) I D
 *   | Data flow         |   | ✓ |    | ✓ | ✓ |   |   → T I D
 *
 * The data-store `R` (✓*) is **conditional**: it applies notably to log / audit
 * / journal stores (the Shostack chart draws it as a green "?"). We gate it on
 * a name/id heuristic (`log|audit|journal`) or an explicit `log` hint.
 *
 * Boundary crossing: a data flow whose endpoints sit in different trust zones is
 * flagged — that is where Spoofing / Tampering / Information-disclosure
 * concentrate (Microsoft TMT model). Elements in no boundary share a single
 * implicit "untrusted" zone (null); a flow between two null-zone nodes does not
 * cross.
 */

import type {
  DfdNode,
  DfdNodeKind,
  FlowStride,
  NodeStride,
  StrideCategory,
  ThreatCandidate,
  ThreatModelAnalysis,
  ThreatModelAst,
} from "./types";
import { STRIDE_NAMES } from "./types";

/** Base STRIDE-per-element table (the data-store conditional `R` is added separately). */
const STRIDE_BY_KIND: Record<DfdNodeKind, StrideCategory[]> = {
  external: ["S", "R"],
  process: ["S", "T", "R", "I", "D", "E"],
  store: ["T", "I", "D"], // R added conditionally for log/audit stores
};

/** STRIDE categories applicable to a data flow itself. */
const FLOW_STRIDE: StrideCategory[] = ["T", "I", "D"];

/** Canonical S,T,R,I,D,E ordering for any category subset. */
const STRIDE_ORDER: StrideCategory[] = ["S", "T", "R", "I", "D", "E"];

function sortStride(cats: Iterable<StrideCategory>): StrideCategory[] {
  const set = new Set(cats);
  return STRIDE_ORDER.filter((c) => set.has(c));
}

/**
 * Decide whether a data store qualifies for the conditional Repudiation
 * category. True when an explicit `log` hint was parsed, or the id/label
 * matches the log/audit/journal heuristic.
 */
export function isLogStore(node: DfdNode): boolean {
  if (node.kind !== "store") return false;
  if (node.logStore) return true;
  return /\b(log|logs|audit|auditing|journal|journaling|ledger)\b/i.test(
    `${node.id} ${node.label}`
  );
}

/** STRIDE categories for one node (data-store R folded in conditionally). */
export function strideForNode(node: DfdNode): NodeStride {
  const base = STRIDE_BY_KIND[node.kind];
  let conditionalR = false;
  let cats = base;
  if (node.kind === "store" && isLogStore(node)) {
    cats = [...base, "R"];
    conditionalR = true;
  }
  return {
    id: node.id,
    kind: node.kind,
    categories: sortStride(cats),
    conditionalR,
  };
}

export function analyseThreatModel(ast: ThreatModelAst): ThreatModelAnalysis {
  const notes: string[] = [];

  // ── Trust-zone membership: node id → boundary name (or null = untrusted) ──
  const zoneOf = new Map<string, string | null>();
  for (const n of ast.nodes) zoneOf.set(n.id, null);
  for (const b of ast.boundaries) {
    for (const m of b.members) {
      if (zoneOf.has(m)) zoneOf.set(m, b.name);
    }
  }

  // ── Per-element STRIDE ──
  const nodes: NodeStride[] = ast.nodes.map(strideForNode);
  const nodeById = new Map(nodes.map((n) => [n.id, n] as const));
  const astById = new Map(ast.nodes.map((n) => [n.id, n] as const));

  // ── Per-flow STRIDE + boundary crossing ──
  const flows: FlowStride[] = ast.flows.map((f) => {
    const sourceZone = zoneOf.get(f.source) ?? null;
    const targetZone = zoneOf.get(f.target) ?? null;
    return {
      source: f.source,
      target: f.target,
      label: f.label,
      categories: [...FLOW_STRIDE],
      sourceZone,
      targetZone,
      crossesBoundary: sourceZone !== targetZone,
    };
  });

  const crossings = flows.filter((f) => f.crossesBoundary);

  // ── Enumerated (element, category) threat checklist — crossings first ──
  const candidates: ThreatCandidate[] = [];

  // Flow candidates: boundary crossings first, then internal flows.
  const orderedFlows = [...crossings, ...flows.filter((f) => !f.crossesBoundary)];
  for (const f of orderedFlows) {
    const label = f.label ? ` (“${f.label}”)` : "";
    for (const c of f.categories) {
      candidates.push({
        elementId: `${f.source} -> ${f.target}`,
        elementKind: "flow",
        category: c,
        text: `Data flow ${f.source}→${f.target}${label}: ${STRIDE_NAMES[c]}${
          f.crossesBoundary ? " [boundary crossing]" : ""
        }`,
        onCrossing: f.crossesBoundary,
      });
    }
  }

  // Node candidates, declaration order.
  for (const n of nodes) {
    const src = astById.get(n.id);
    const label = src ? src.label : n.id;
    for (const c of n.categories) {
      candidates.push({
        elementId: n.id,
        elementKind: n.kind,
        category: c,
        text: `${kindWord(n.kind)} “${label}”: ${STRIDE_NAMES[c]}`,
        onCrossing: false,
      });
    }
  }

  // ── Modelling notes ──
  const logStores = ast.nodes.filter((n) => n.kind === "store" && isLogStore(n));
  if (logStores.length > 0) {
    notes.push(
      `Repudiation enabled on ${logStores.length} log/audit store(s): ${logStores
        .map((n) => n.id)
        .join(", ")} (STRIDE-per-element conditional R).`
    );
  }
  if (crossings.length > 0) {
    notes.push(
      `${crossings.length} data flow(s) cross a trust boundary — the prime threat location.`
    );
  } else if (ast.boundaries.length > 0) {
    notes.push("No data flow crosses a trust boundary.");
  }

  // Reference nodeById to keep the symbol meaningful for downstream callers.
  void nodeById;

  return { nodes, flows, crossings, candidates, notes };
}

function kindWord(kind: DfdNodeKind): string {
  switch (kind) {
    case "external":
      return "External entity";
    case "process":
      return "Process";
    case "store":
      return "Data store";
  }
}
