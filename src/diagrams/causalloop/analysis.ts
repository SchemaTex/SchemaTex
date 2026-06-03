/**
 * Causal Loop Diagram analysis — the differentiator.
 * Per docs/reference/41-CAUSAL-LOOP-STANDARD.md §"Engine computation".
 *
 * 1. Build the signed directed graph (nodes = variables, edges = signed links).
 * 2. Enumerate the elementary feedback loops (simple directed cycles) with
 *    Johnson's algorithm (1975) — all elementary cycles, deterministically.
 * 3. Classify each loop by counting negative links:
 *      even count (incl. 0) → R (reinforcing)   product of signs = +1
 *      odd count            → B (balancing)      product of signs = −1
 *    This is exactly Sterman's even/odd polarity rule.
 *
 * Loops are numbered in detection order by kind: R1, B1, R2, …
 *
 * Determinism: Johnson's algorithm is run over variables in declaration order
 * and edges in declaration order; cycles are emitted in a fixed order; no
 * randomness anywhere.
 */

import type {
  CausalLink,
  CausalLoopAnalysis,
  CausalLoopAst,
  FeedbackLoop,
  LoopKind,
} from "./types";

interface Edge {
  to: number;
  linkIndex: number;
  negative: boolean;
}

export function analyseCausalLoop(ast: CausalLoopAst): CausalLoopAnalysis {
  const idToIndex = new Map<string, number>();
  ast.variables.forEach((v, i) => idToIndex.set(v.id, i));
  const n = ast.variables.length;

  // Adjacency in declaration order. Self-links are excluded from cycle search.
  const adj: Edge[][] = Array.from({ length: n }, () => []);
  const selfLinks: number[] = [];
  ast.links.forEach((l, linkIndex) => {
    const u = idToIndex.get(l.from)!;
    const v = idToIndex.get(l.to)!;
    if (u === v) {
      selfLinks.push(linkIndex);
      return;
    }
    adj[u]!.push({ to: v, linkIndex, negative: l.polarity === "-" });
  });

  const rawCycles = johnsonCycles(n, adj);

  // Classify + number by kind in detection order.
  const loops: FeedbackLoop[] = [];
  let rCount = 0;
  let bCount = 0;
  for (const cyc of rawCycles) {
    let negatives = 0;
    for (const li of cyc.linkIndices) {
      if (ast.links[li]!.polarity === "-") negatives++;
    }
    const kind: LoopKind = negatives % 2 === 0 ? "R" : "B";
    const id = kind === "R" ? `R${++rCount}` : `B${++bCount}`;
    const loop: FeedbackLoop = {
      id,
      kind,
      variables: cyc.nodes.map((idx) => ast.variables[idx]!.id),
      linkIndices: cyc.linkIndices,
      negativeCount: negatives,
    };
    loops.push(loop);
  }

  // Attach author phrases.
  for (const loop of loops) {
    const ann = ast.annotations.find((a) => a.id === loop.id);
    if (ann) loop.phrase = ann.phrase;
  }

  // Coverage: which variables / links sit in no loop (open chains).
  const varsInLoop = new Set<string>();
  const linksInLoop = new Set<number>();
  for (const loop of loops) {
    for (const v of loop.variables) varsInLoop.add(v);
    for (const li of loop.linkIndices) linksInLoop.add(li);
  }
  const variablesInNoLoop = ast.variables.map((v) => v.id).filter((id) => !varsInLoop.has(id));
  const linksInNoLoop: number[] = [];
  ast.links.forEach((_, i) => {
    if (!linksInLoop.has(i) && !selfLinks.includes(i)) linksInNoLoop.push(i);
  });

  const notes: string[] = [];
  if (selfLinks.length > 0) {
    notes.push(
      `Self-link${selfLinks.length > 1 ? "s" : ""} ignored for loop analysis: ${selfLinks
        .map((i) => describeLink(ast.links[i]!))
        .join(", ")}.`
    );
  }
  for (const a of ast.annotations) {
    if (!loops.some((l) => l.id === a.id)) {
      notes.push(`Loop phrase "${a.phrase}" names ${a.id}, but no such loop was detected.`);
    }
  }

  return {
    loops,
    reinforcing: rCount,
    balancing: bCount,
    variablesInNoLoop,
    linksInNoLoop,
    selfLinks,
    notes,
  };
}

function describeLink(l: CausalLink): string {
  return `${l.from} -> ${l.to}`;
}

// ─── Johnson's elementary-cycles algorithm (1975) ──────────────
//
// Deterministic: nodes are processed in ascending index order; within each
// node, adjacency is already in declaration order. Each elementary cycle is
// reported once, rooted at its smallest-index node.

interface RawCycle {
  nodes: number[];
  linkIndices: number[];
}

function johnsonCycles(n: number, adj: Edge[][]): RawCycle[] {
  const result: RawCycle[] = [];

  // Stacks track the current path; `edgeStack[i]` is the link taken to reach
  // node `stack[i+1]` from `stack[i]`.
  let startNode = 0;
  const blocked: boolean[] = new Array(n).fill(false);
  const blockMap: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  const stack: number[] = [];
  const edgeStack: number[] = [];

  const unblock = (u: number): void => {
    blocked[u] = false;
    for (const w of blockMap[u]!) {
      blockMap[u]!.delete(w);
      if (blocked[w]) unblock(w);
    }
  };

  const circuit = (v: number): boolean => {
    let found = false;
    blocked[v] = true;
    stack.push(v);

    for (const e of adj[v]!) {
      const w = e.to;
      if (w < startNode) continue; // only cycles rooted at >= startNode
      if (w === startNode) {
        // Closed an elementary cycle rooted at startNode.
        result.push({
          nodes: [...stack],
          linkIndices: [...edgeStack, e.linkIndex],
        });
        found = true;
      } else if (!blocked[w]) {
        edgeStack.push(e.linkIndex);
        if (circuit(w)) found = true;
        edgeStack.pop();
      }
    }

    if (found) {
      unblock(v);
    } else {
      for (const e of adj[v]!) {
        const w = e.to;
        if (w < startNode) continue;
        blockMap[w]!.add(v);
      }
    }

    stack.pop();
    return found;
  };

  for (startNode = 0; startNode < n; startNode++) {
    // Reset block state for the subgraph induced on nodes >= startNode.
    for (let i = 0; i < n; i++) {
      blocked[i] = false;
      blockMap[i]!.clear();
    }
    edgeStack.length = 0;
    circuit(startNode);
  }

  return result;
}
