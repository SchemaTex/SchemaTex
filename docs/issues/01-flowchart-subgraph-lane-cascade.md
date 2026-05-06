# 01 — Flowchart sibling subgraphs cascade horizontally when they share a layer

> **Status:** known behavior, by-design fallback. **Filed:** 2026-05-04 (Victor reviewing the PRISMA 2020 example).
> **Severity:** medium — surprises the author when they expect `flowchart TD` to produce a top-to-bottom diagram and instead get a left-to-right cascade.
> **Affects:** [src/diagrams/flowchart/layout.ts:756](../../src/diagrams/flowchart/layout.ts) — `hasOverlappingTopLevelClusters()`

## What you observe

You write a `flowchart TD` with 3+ top-level subgraphs (`subgraph A … end / subgraph B … end / subgraph C … end`). Instead of stacking them top-to-bottom in document order, the renderer cascades them diagonally left-to-right. Each subgraph drifts further right than the one above it, and the overall canvas balloons horizontally.

Reproducible minimal case (the PRISMA 2020 first draft):

```
flowchart TD
  subgraph ID ["Identification"]
    a[A]
    b[B]
  end
  subgraph SCREEN ["Screening"]
    c[C]
  end
  subgraph ELIG ["Eligibility"]
    d[D]
    e[E]
  end
  subgraph INCL ["Included"]
    f[F]
    g[G]
  end
  a --> c
  b --> c
  c --> d
  d --> e
  d --> f
  f --> g
```

Look at the `d --> e` and `d --> f` edges: both `e` (in ELIG) and `f` (in INCL) get layered as siblings of `d` + 1. They land at the **same DAG layer**, but they live in different top-level clusters → trigger.

## Why it happens

Schematex's flowchart layout has a fallback called **lane-based x-coord placement** ([layout.ts:561](../../src/diagrams/flowchart/layout.ts) — `assignLaneXCoords`). It activates when `hasOverlappingTopLevelClusters` returns true, which is the case if any two top-level clusters have member nodes on the **same layer** (Y-rank) of the layered DAG.

Why the fallback exists: without lane separation, two parallel clusters' members would interleave horizontally. The cluster bounding box (computed downstream as `min/max` of its members' positions) would then physically enclose foreign nodes — a worse visual bug.

So: when the trigger fires, every top-level cluster gets its own horizontal lane. The lanes are placed left-to-right in declaration order. That's the cascade you see.

## When it triggers in real use

1. **Branching from a node into two cluster terminals** — most common. PRISMA hits this: `assessed` branches to `excl_reasons` (in ELIG) and `included` (in INCL). Both targets land on layer N+1 in different clusters → cascade.
2. **Parallel pipelines drawn as side-by-side subgraphs** — but here the cascade is intentional (the user *wants* left-to-right lanes).
3. **Cross-cluster shortcut edges** — e.g., `subgraph A … end → subgraph C … end` skipping B.

## Workarounds (no engine change)

Pick the one that matches your intent:

- **(A) Reorder DSL: declare all subgraphs (with all members) first, then write all edges last.** Removes the orphan-node-creation issue that compounds the problem when you write an edge to a node before its subgraph is declared. (The auto-created orphan won't be reparented when the subgraph is later declared with the same node id.)

- **(B) Promote terminal nodes out of their subgraphs.** If two clusters fight over the same layer because they each contain one of the two branches from a single node, take the smaller / less load-bearing cluster and remove it — leave its members as bare nodes. PRISMA's `Included` subgraph is a good candidate: the two stadium nodes for "Studies in qualitative synthesis" / "Studies in meta-analysis" are visually fine without a wrapping cluster border.

- **(C) Insert an invisible spacer node** between the branch point and the deeper cluster's entry, to force a layer offset. Hacky; breaks the "one box = one PRISMA element" mapping.

Both (A) + (B) were applied to the canonical PRISMA example — see [website/content/examples/flowchart-prisma-systematic-review.mdx](../../website/content/examples/flowchart-prisma-systematic-review.mdx).

## Possible future engine fix (not scoped now)

The cleanest fix would be a **"prefer-vertical-stacking" hint** for top-level clusters when they appear sequentially in DSL order with a clear forward edge between them (`A's terminal node → B's entry node`). The layered layout could then enforce: cluster A occupies layers `[la_min, la_max]`, cluster B occupies `[lb_min, lb_max]` with `la_max < lb_min`, by inserting dummy layers as needed. This would let users write the natural PRISMA-style 4-phase top-down layout without having to lift `Included` out of its cluster.

Estimated effort: ~1 day. Currently low priority — the workaround is well-documented and the lane fallback IS correct for parallel-pipeline cases.

## Related code

- [src/diagrams/flowchart/layout.ts:756](../../src/diagrams/flowchart/layout.ts) — `hasOverlappingTopLevelClusters` (the trigger)
- [src/diagrams/flowchart/layout.ts:561](../../src/diagrams/flowchart/layout.ts) — `assignLaneXCoords` (the cascade implementation)
- [docs/reference/14-FLOWCHART-STANDARD.md §15.5](../reference/14-FLOWCHART-STANDARD.md) — PRISMA pattern documentation that points to the workarounds
