import { describe, test, expect } from "vitest";
import { parseFlowchart } from "../../src/diagrams/flowchart/parser";
import {
  layoutFlowchart,
  measureLabelWidth,
} from "../../src/diagrams/flowchart/layout";

describe("flowchart layout", () => {
  test("linear chain yields one node per layer (TB)", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B --> C");
    const r = layoutFlowchart(ast);
    expect(r.nodes).toHaveLength(3);
    const a = r.nodes.find((n) => n.node.id === "A")!;
    const b = r.nodes.find((n) => n.node.id === "B")!;
    const c = r.nodes.find((n) => n.node.id === "C")!;
    expect(a.layer).toBe(0);
    expect(b.layer).toBe(1);
    expect(c.layer).toBe(2);
    // y grows with layer
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
  });

  test("branching decision — merge point on deeper layer", () => {
    const ast = parseFlowchart(`flowchart TD
A --> B
A --> C
B --> D
C --> D`);
    const r = layoutFlowchart(ast);
    const d = r.nodes.find((n) => n.node.id === "D")!;
    const b = r.nodes.find((n) => n.node.id === "B")!;
    const c = r.nodes.find((n) => n.node.id === "C")!;
    expect(b.layer).toBe(1);
    expect(c.layer).toBe(1);
    expect(d.layer).toBe(2);
  });

  test("long edge: layer difference > 1 routes through dummies", () => {
    const ast = parseFlowchart(`flowchart TD
A --> B --> C --> D
A --> D`);
    const r = layoutFlowchart(ast);
    // A at 0, D at 3
    const a = r.nodes.find((n) => n.node.id === "A")!;
    const d = r.nodes.find((n) => n.node.id === "D")!;
    expect(a.layer).toBe(0);
    expect(d.layer).toBe(3);
    // The A→D edge should have a path with more than 4 points → > 1 L-bend,
    // since routing dummies introduce intermediate waypoints.
    const ad = r.edges.find(
      (e) => e.edge.from === "A" && e.edge.to === "D"
    );
    expect(ad).toBeDefined();
    // Path uses M ... L ... L ... L ... — count L commands
    const lcount = (ad!.path.match(/L /g) ?? []).length;
    expect(lcount).toBeGreaterThanOrEqual(3);
  });

  test("cycle handling: greedy-FAS produces valid layering", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B --> C --> A");
    const r = layoutFlowchart(ast);
    // All 3 nodes placed; exactly one edge marked reversed
    expect(r.nodes).toHaveLength(3);
    const reversed = r.edges.filter((e) => e.edge.isReversed);
    expect(reversed.length).toBe(1);
    // Layers must be valid non-negative integers
    for (const n of r.nodes) {
      expect(Number.isInteger(n.layer)).toBe(true);
      expect(n.layer).toBeGreaterThanOrEqual(0);
    }
  });

  test("LR direction: nodes arranged left-to-right", () => {
    const ast = parseFlowchart("flowchart LR\nA --> B --> C --> D");
    const r = layoutFlowchart(ast);
    const a = r.nodes.find((n) => n.node.id === "A")!;
    const b = r.nodes.find((n) => n.node.id === "B")!;
    const c = r.nodes.find((n) => n.node.id === "C")!;
    const d = r.nodes.find((n) => n.node.id === "D")!;
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
    expect(c.x).toBeLessThan(d.x);
    expect(r.direction).toBe("LR");
  });

  test("canvas dimensions are positive", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B");
    const r = layoutFlowchart(ast);
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
  });

  test("edge path is non-empty for each edge", () => {
    const ast = parseFlowchart(`flowchart TD
A{Valid?} -->|yes| B[Save]
A -->|no| C[Reject]`);
    const r = layoutFlowchart(ast);
    expect(r.edges).toHaveLength(2);
    for (const e of r.edges) {
      expect(e.path.length).toBeGreaterThan(0);
      expect(e.path.startsWith("M ")).toBe(true);
    }
  });

  test("edge label anchor is present for labeled edges", () => {
    const ast = parseFlowchart("flowchart TD\nA -->|yes| B");
    const r = layoutFlowchart(ast);
    expect(r.edges[0]?.labelAnchor).toBeDefined();
  });

  test("implicit nodes (used only in edges) are created", () => {
    const ast = parseFlowchart("flowchart TD\nA --> B\nB --> C");
    const r = layoutFlowchart(ast);
    expect(r.nodes.map((n) => n.node.id).sort()).toEqual(["A", "B", "C"]);
  });

  test("CJK label width is roughly double Latin width per char", () => {
    // 6 CJK chars vs 6 Latin chars must produce noticeably wider measurement.
    const cjk = measureLabelWidth("網路公開招募");
    const latin = measureLabelWidth("recruit");
    expect(cjk).toBeGreaterThan(latin * 1.4);
    // Mixed labels: CJK characters dominate the width even with Latin tokens.
    const mixed = measureLabelWidth("基本資料、POMS量表、配戴HRV");
    expect(mixed).toBeGreaterThan(150);
  });

  test("CJK label drives wider node so text doesn't overflow padding", () => {
    const latinAst = parseFlowchart("flowchart TD\nA([recruit])");
    const cjkAst = parseFlowchart("flowchart TD\nA([網路公開招募])");
    const latinR = layoutFlowchart(latinAst);
    const cjkR = layoutFlowchart(cjkAst);
    const latinW = latinR.nodes.find((n) => n.node.id === "A")!.width;
    const cjkW = cjkR.nodes.find((n) => n.node.id === "A")!.width;
    // CJK label of 6 full-width chars must produce strictly wider node than
    // 7 Latin chars, since per-glyph width is ~2× larger.
    expect(cjkW).toBeGreaterThan(latinW);
  });

  // ─── Multi-line label sizing (Track A Unit 1) ────────────────
  describe("multi-line label sizing", () => {
    test("<b>/<i> tags do not inflate measured width", () => {
      const plain = measureLabelWidth("Important");
      const bold = measureLabelWidth("<b>Important</b>");
      const italic = measureLabelWidth("<i>Important</i>");
      const mixed = measureLabelWidth("<b>Bold</b> and <i>italic</i>");
      expect(bold).toBeCloseTo(plain, 1);
      expect(italic).toBeCloseTo(plain, 1);
      expect(mixed).toBeCloseTo(measureLabelWidth("Bold and italic"), 1);
    });

    test("<br/> width is max-of-lines, not concatenated", () => {
      const oneLine = measureLabelWidth("aaaaaaaaaaaa");
      const twoLines = measureLabelWidth("aaaaaaaaaaaa<br/>aaaaaaaaaaaa");
      // Two-line label of identical lines should measure same width, not 2x
      expect(twoLines).toBeCloseTo(oneLine, 1);
    });

    test("<br/> width picks widest line", () => {
      const w = measureLabelWidth("short<br/>much longer line here");
      const longerOnly = measureLabelWidth("much longer line here");
      expect(w).toBeCloseTo(longerOnly, 1);
    });

    test("node height grows for multi-line <br/> labels", () => {
      const single = layoutFlowchart(parseFlowchart('flowchart TD\nA["One line"]'));
      const dual = layoutFlowchart(parseFlowchart('flowchart TD\nA["Line one<br/>Line two"]'));
      const triple = layoutFlowchart(parseFlowchart('flowchart TD\nA["L1<br/>L2<br/>L3"]'));
      const hSingle = single.nodes.find((n) => n.node.id === "A")!.height;
      const hDual = dual.nodes.find((n) => n.node.id === "A")!.height;
      const hTriple = triple.nodes.find((n) => n.node.id === "A")!.height;
      // Each extra line adds ~lineHeight (14px). Allow tolerance for rounding.
      expect(hDual - hSingle).toBeGreaterThanOrEqual(12);
      expect(hTriple - hDual).toBeGreaterThanOrEqual(12);
    });

    test("multi-line label combined with <b> renders correct height", () => {
      const ast = parseFlowchart(
        'flowchart TD\nA["<b>Total</b><br/>n = 1,234"]'
      );
      const r = layoutFlowchart(ast);
      const n = r.nodes.find((nn) => nn.node.id === "A")!;
      // Two-line PRISMA-style label: bold header + count. Height must exceed
      // single-line baseline.
      expect(n.height).toBeGreaterThan(50);
    });
  });

  test("parallelogram with long CJK label fits inside slanted body", () => {
    const ast = parseFlowchart(
      "flowchart TD\nP[/基本資料、POMS量表、個人儀式感量表、配戴HRV/]"
    );
    const r = layoutFlowchart(ast);
    const p = r.nodes.find((n) => n.node.id === "P")!;
    // Inner usable width at y=h/2 = w − 2·slant (slant = 20). Label rendered
    // width must fit, otherwise the polygon clips the glyphs.
    const labelW = measureLabelWidth(p.node.label);
    const usableInner = p.width - 2 * 20;
    expect(usableInner).toBeGreaterThanOrEqual(labelW);
  });

  test("sequential clusters (TB) keep a centered straight spine", () => {
    // Pre / Intervention / Post each occupy a distinct layer range — lane
    // mode would push each cluster sideways. BK should keep the spine
    // straight and centered.
    const ast = parseFlowchart(`flowchart TD
A --> B
subgraph S1 [Phase1]
  P1
end
B --> P1
subgraph S2 [Phase2]
  P2
end
P1 --> P2
subgraph S3 [Phase3]
  P3
end
P2 --> P3
P3 --> Z`);
    const r = layoutFlowchart(ast);
    const cx = (id: string): number => {
      const n = r.nodes.find((nn) => nn.node.id === id)!;
      return n.x + n.width / 2;
    };
    // Sequential clusters → straight spine. All node centers should share
    // the same X (within 1px tolerance for rounding).
    const centers = ["A", "B", "P1", "P2", "P3", "Z"].map(cx);
    const refX = centers[0]!;
    for (const x of centers) {
      expect(Math.abs(x - refX)).toBeLessThan(2);
    }
  });

  test("sequential cluster bboxes never overlap (bbox-disjoint)", () => {
    // Three back-to-back clusters in TB. Without per-gap spacing, the
    // pad+pad+title (=68px) requirement exceeds the default 56px layer gap
    // and adjacent cluster bboxes overlap by ~12px.
    const ast = parseFlowchart(`flowchart TD
A --> B
subgraph S1 [Phase1]
  P1
end
B --> P1
subgraph S2 [Phase2]
  P2
end
P1 --> P2
subgraph S3 [Phase3]
  P3a
  P3b
  P3a --> P3b
end
P2 --> P3a
P3b --> Z`);
    const r = layoutFlowchart(ast);
    const cs = [...r.clusters].sort((a, b) => a.y - b.y);
    expect(cs.length).toBe(3);
    for (let i = 0; i < cs.length - 1; i++) {
      const aBottom = cs[i]!.y + cs[i]!.height;
      const bTop = cs[i + 1]!.y;
      // Strictly disjoint, with at least the configured cluster gap of
      // breathing room between bboxes.
      expect(bTop).toBeGreaterThanOrEqual(aBottom);
      expect(bTop - aBottom).toBeGreaterThanOrEqual(8);
    }
  });

  test("parallel sibling clusters: spine sits centered between clusters", () => {
    const ast = parseFlowchart(`flowchart TD
Start --> Random
Random --> G1
Random --> G2
subgraph Left [LeftPath]
  L1
  G1 --> L1
end
subgraph Right [RightPath]
  R1
  G2 --> R1
end
L1 --> Done
R1 --> Done`);
    const r = layoutFlowchart(ast);
    const cx = (id: string): number => {
      const n = r.nodes.find((nn) => nn.node.id === id)!;
      return n.x + n.width / 2;
    };
    // Spine nodes (Start, Random, Done) should be horizontally between
    // L1 (left cluster) and R1 (right cluster).
    const lx = cx("L1");
    const rx = cx("R1");
    expect(lx).toBeLessThan(rx);
    for (const id of ["Start", "Random", "Done"]) {
      const x = cx(id);
      expect(x).toBeGreaterThan(lx - 1);
      expect(x).toBeLessThan(rx + 1);
    }
  });

  test("BT direction places source below sink", () => {
    const tb = layoutFlowchart(parseFlowchart("flowchart TB\nA --> B"));
    const bt = layoutFlowchart(parseFlowchart("flowchart BT\nA --> B"));
    const get = (l: ReturnType<typeof layoutFlowchart>, id: string) =>
      l.nodes.find((n) => n.node.id === id)!;
    expect(get(tb, "A").y).toBeLessThan(get(tb, "B").y);
    expect(get(bt, "A").y).toBeGreaterThan(get(bt, "B").y);
  });

  test("RL direction places source right of sink", () => {
    const lr = layoutFlowchart(parseFlowchart("flowchart LR\nA --> B"));
    const rl = layoutFlowchart(parseFlowchart("flowchart RL\nA --> B"));
    const get = (l: ReturnType<typeof layoutFlowchart>, id: string) =>
      l.nodes.find((n) => n.node.id === id)!;
    expect(get(lr, "A").x).toBeLessThan(get(lr, "B").x);
    expect(get(rl, "A").x).toBeGreaterThan(get(rl, "B").x);
  });

  test("BT clusters keep title above bbox after flip", () => {
    const ast = parseFlowchart(`flowchart BT
subgraph Top
  T[Top]
end
subgraph Bot
  B[Bot]
end
B --> T`);
    const r = layoutFlowchart(ast);
    const get = (id: string) => r.nodes.find((n) => n.node.id === id)!;
    expect(get("B").y).toBeGreaterThan(get("T").y);
    const top = r.clusters.find((c) => c.subgraph.id === "Top")!;
    const bot = r.clusters.find((c) => c.subgraph.id === "Bot")!;
    expect(top.y).toBeLessThanOrEqual(get("T").y);
    expect(bot.y).toBeLessThanOrEqual(get("B").y);
    expect(top.y + top.height).toBeLessThan(bot.y);
  });
});
