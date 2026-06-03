import { describe, test, expect } from "vitest";
import { parseMatrix } from "../../src/diagrams/matrix/parser";
import { renderMatrix } from "../../src/diagrams/matrix/renderer";
import { computeQfdImportance } from "../../src/diagrams/matrix/types";

// ─────────────────────────────────────────────────────────────
// SIPOC
//
// DSL shape (documented here as the canonical SIPOC grammar):
//   matrix sipoc "Title"
//   suppliers: "Vendor", "Warehouse"
//   inputs:    "PO", "Stock levels"
//   process:   "Receive order", "Pick", "Pack", "Ship"
//   outputs:   "Shipped package", "Invoice"
//   customers: "End customer", "Finance"
// Repeated section lines append; singular keys (supplier/input/...) also accepted.
// ─────────────────────────────────────────────────────────────

describe("matrix sipoc", () => {
  const DSL = `matrix sipoc "Order fulfilment"
suppliers: "Vendor", "Warehouse"
inputs: "PO", "Stock levels"
process: "Receive order", "Pick", "Pack", "Ship"
outputs: "Shipped package", "Invoice"
customers: "End customer", "Finance"`;

  test("parses the five fixed columns in order", () => {
    const ast = parseMatrix(DSL);
    expect(ast.mode).toBe("sipoc");
    expect(ast.title).toBe("Order fulfilment");
    expect(ast.cols).toBe(5);
    expect(ast.sipoc).toBeDefined();
    const s = ast.sipoc!;
    expect(s.suppliers).toEqual(["Vendor", "Warehouse"]);
    expect(s.inputs).toEqual(["PO", "Stock levels"]);
    expect(s.process).toEqual(["Receive order", "Pick", "Pack", "Ship"]);
    expect(s.outputs).toEqual(["Shipped package", "Invoice"]);
    expect(s.customers).toEqual(["End customer", "Finance"]);
  });

  test("rows = longest column item count (Process here = 4)", () => {
    const ast = parseMatrix(DSL);
    expect(ast.rows).toBe(4);
  });

  test("repeated section lines append; singular keys accepted", () => {
    const ast = parseMatrix(`matrix sipoc
supplier: "A"
supplier: "B"
input: "x"`);
    expect(ast.sipoc!.suppliers).toEqual(["A", "B"]);
    expect(ast.sipoc!.inputs).toEqual(["x"]);
  });

  test("renders 5 column-band headers and all items", () => {
    const svg = renderMatrix(DSL);
    expect(svg).toContain('data-mode="sipoc"');
    for (const h of ["Suppliers", "Inputs", "Process", "Outputs", "Customers"]) {
      expect(svg).toContain(h);
    }
    for (const item of ["Vendor", "Receive order", "Ship", "Invoice", "Finance"]) {
      expect(svg).toContain(item);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// QFD — House of Quality
//
// DSL shape:
//   matrix qfd "Title"
//   what: "Quiet operation" weight: 5
//   how:  "Fan RPM" dir: down
//   rel (whatIdx, howIdx): 9   # 9 strong / 3 medium / 1 weak
//   roof (howA, howB): ++      # ++ / + / - / --
//   normalize: true
// ─────────────────────────────────────────────────────────────

describe("matrix qfd — parse", () => {
  const DSL = `matrix qfd "Coffee maker"
what: "Quiet operation" weight: 5
what: "Brews fast" weight: 3
what: "Cheap to run" weight: 2
how: "Fan RPM" dir: down
how: "Heater watts" dir: up
how: "Insulation"
rel (0, 0): 9
rel (0, 2): 3
rel (1, 1): 9
rel (2, 1): 3
rel (2, 2): 1
roof (0, 1): --
roof (1, 2): +`;

  test("parses WHATs with weights", () => {
    const ast = parseMatrix(DSL);
    expect(ast.mode).toBe("qfd");
    expect(ast.qfd!.whats).toEqual([
      { label: "Quiet operation", weight: 5 },
      { label: "Brews fast", weight: 3 },
      { label: "Cheap to run", weight: 2 },
    ]);
  });

  test("parses HOWs with optional direction; rows/cols derived", () => {
    const ast = parseMatrix(DSL);
    expect(ast.qfd!.hows).toEqual([
      { label: "Fan RPM", direction: "down" },
      { label: "Heater watts", direction: "up" },
      { label: "Insulation" },
    ]);
    expect(ast.rows).toBe(3); // 3 WHATs
    expect(ast.cols).toBe(3); // 3 HOWs
  });

  test("parses relationships at 9/3/1 strengths", () => {
    const ast = parseMatrix(DSL);
    expect(ast.qfd!.relationships).toContainEqual({ what: 0, how: 0, strength: 9 });
    expect(ast.qfd!.relationships).toContainEqual({ what: 0, how: 2, strength: 3 });
    expect(ast.qfd!.relationships).toContainEqual({ what: 2, how: 2, strength: 1 });
    expect(ast.qfd!.relationships).toHaveLength(5);
  });

  test("parses the roof correlations (normalized a<b)", () => {
    const ast = parseMatrix(DSL);
    expect(ast.qfd!.roof).toContainEqual({ a: 0, b: 1, correlation: "--" });
    expect(ast.qfd!.roof).toContainEqual({ a: 1, b: 2, correlation: "+" });
  });

  test("roof index order is normalized so (j,i) === (i,j)", () => {
    const ast = parseMatrix(`matrix qfd
how: "A"
how: "B"
roof (1, 0): ++`);
    expect(ast.qfd!.roof).toEqual([{ a: 0, b: 1, correlation: "++" }]);
  });

  test("cell (how, what) value: form is accepted as a relationship", () => {
    const ast = parseMatrix(`matrix qfd
what: "W" weight: 2
how: "H"
cell (0, 0) value: 9`);
    expect(ast.qfd!.relationships).toEqual([{ what: 0, how: 0, strength: 9 }]);
  });
});

describe("matrix qfd — computed technical importance (the key differentiator)", () => {
  // Hand-computed expected column sums for the Coffee maker example.
  //
  //                 HOW0 FanRPM   HOW1 Heater   HOW2 Insulation
  //  W0 weight 5      9              .             3
  //  W1 weight 3      .              9             .
  //  W2 weight 2      .              3             1
  //
  //  col0 = 5×9                       = 45
  //  col1 = 3×9 + 2×3 = 27 + 6        = 33
  //  col2 = 5×3 + 2×1 = 15 + 2        = 17
  //  total = 95
  const DSL = `matrix qfd "Coffee maker"
what: "Quiet operation" weight: 5
what: "Brews fast" weight: 3
what: "Cheap to run" weight: 2
how: "Fan RPM"
how: "Heater watts"
how: "Insulation"
rel (0, 0): 9
rel (0, 2): 3
rel (1, 1): 9
rel (2, 1): 3
rel (2, 2): 1`;

  test("Σ(weight × strength) per column is correct", () => {
    const ast = parseMatrix(DSL);
    const imp = computeQfdImportance(ast.qfd!);
    expect(imp.map((c) => c.importance)).toEqual([45, 33, 17]);
  });

  test("normalized percentages sum sensibly and round per-column", () => {
    const ast = parseMatrix(DSL);
    const imp = computeQfdImportance(ast.qfd!);
    // 45/95=47%, 33/95=35%, 17/95=18%
    expect(imp.map((c) => c.percent)).toEqual([47, 35, 18]);
  });

  test("a blank column (no relationships) computes to 0 importance / 0%", () => {
    const ast = parseMatrix(`matrix qfd
what: "W" weight: 4
how: "Used"
how: "Unused"
rel (0, 0): 9`);
    const imp = computeQfdImportance(ast.qfd!);
    expect(imp).toEqual([
      { how: 0, importance: 36, percent: 100 },
      { how: 1, importance: 0, percent: 0 },
    ]);
  });

  test("out-of-range relationships are ignored by the compute step", () => {
    const ast = parseMatrix(`matrix qfd
what: "W" weight: 5
how: "H"`);
    // inject an out-of-range relationship directly
    ast.qfd!.relationships.push({ what: 9, how: 0, strength: 9 });
    ast.qfd!.relationships.push({ what: 0, how: 9, strength: 9 });
    const imp = computeQfdImportance(ast.qfd!);
    expect(imp).toEqual([{ how: 0, importance: 0, percent: 0 }]);
  });
});

describe("matrix qfd — render", () => {
  const DSL = `matrix qfd "Coffee maker"
what: "Quiet operation" weight: 5
what: "Brews fast" weight: 3
how: "Fan RPM"
how: "Heater watts"
rel (0, 0): 9
rel (1, 1): 9
roof (0, 1): --
normalize: true`;

  test("renders house with computed bottom row + roof + importance column", () => {
    const svg = renderMatrix(DSL);
    expect(svg).toContain('data-mode="qfd"');
    // WHAT labels, HOW labels
    expect(svg).toContain("Quiet operation");
    expect(svg).toContain("Fan RPM");
    // computed technical importance row present: col0 = 5×9 = 45, col1 = 3×9 = 27
    // normalize:true → percents 45/72=62.5%→63%, 27/72=37.5%→38%
    expect(svg).toContain("63%");
    expect(svg).toContain("38%");
    // weight column shows the importance weights
    expect(svg).toContain(">5<");
  });
});

// ─────────────────────────────────────────────────────────────
// QFD roof — the HOW×HOW correlation half-matrix of diamond cells.
//
// For N HOWs the roof is N(N-1)/2 pairwise diamonds tessellating into a
// pyramid above the column boundaries. Pair (i,j) sits horizontally above
// the midpoint of columns i and j; vertical row = depth = j−i (adjacent
// pairs in the bottom row, the i=0/j=N−1 pair at the apex).
// ─────────────────────────────────────────────────────────────

describe("matrix qfd — roof correlation lattice", () => {
  // Geometry constants mirror layout.ts (QFD_CELL=46, pads, label widths).
  // We re-derive only what the assertions need from the public render output.
  const QFD_CELL = 46;

  // 4 HOWs → 4·3/2 = 6 diamond cells. Several declared correlations with
  // distinct glyphs so the roof exercises every strength class.
  const DSL = `matrix qfd "Vehicle door"
what: "Easy to close" weight: 5
how: "Door seal force"
how: "Hinge friction"
how: "Door mass"
how: "Window drop"
roof (0, 1): ++
roof (0, 3): --
roof (1, 2): +
roof (2, 3): -`;

  test("renders exactly N(N-1)/2 diamond cells for N HOWs", () => {
    const svg = renderMatrix(DSL);
    // 4 HOWs → 6 pairs. Each pair is one roof-pair group with one diamond polygon.
    const pairGroups = svg.match(/class="sx-qfd-roof-pair"/g) ?? [];
    expect(pairGroups).toHaveLength(6);
    // Every pair (i,j) is present as a data-pair attribute.
    for (const pair of ["0,1", "0,2", "0,3", "1,2", "1,3", "2,3"]) {
      expect(svg).toContain(`data-pair="${pair}"`);
    }
  });

  test("each declared correlation produces the right glyph + class at the right pair", () => {
    const svg = renderMatrix(DSL);
    const cases: Array<[string, string, string]> = [
      ["0,1", "++", "sx-qfd-corr-strong-pos"],
      ["0,3", "--", "sx-qfd-corr-strong-neg"],
      ["1,2", "+", "sx-qfd-corr-pos"],
      ["2,3", "-", "sx-qfd-corr-neg"],
    ];
    const glyphFor: Record<string, string> = { "++": "●", "+": "○", "-": "−", "--": "✕" };
    for (const [pair, corr, cls] of cases) {
      // The pair group carries the declared correlation + the strength class.
      const groupRe = new RegExp(
        `<g class="sx-qfd-roof-pair" data-pair="${pair}" data-corr="${corr.replace(/[+]/g, "\\$&")}">[\\s\\S]*?<\\/g>`,
      );
      const m = svg.match(groupRe);
      expect(m, `pair ${pair} group present`).not.toBeNull();
      const groupSvg = m![0];
      expect(groupSvg).toContain(cls);
      expect(groupSvg).toContain(`>${glyphFor[corr]}<`);
    }
  });

  test("undeclared pairs render an empty diamond (no glyph, base cell class)", () => {
    const svg = renderMatrix(DSL);
    // (0,2) and (1,3) were not declared → blank diamonds with no data-corr.
    const blankRe = /<g class="sx-qfd-roof-pair" data-pair="1,3">([\s\S]*?)<\/g>/;
    const m = svg.match(blankRe);
    expect(m).not.toBeNull();
    expect(m![0]).not.toContain("data-corr");
    expect(m![0]).toContain("sx-qfd-roof-cell");
    expect(m![0]).not.toContain("sx-qfd-corr-"); // no correlation glyph
  });

  test("geometry: adjacent-pair diamonds share the bottom roof row, deeper pairs sit higher", () => {
    const svg = renderMatrix(DSL);
    // Extract each pair's diamond polygon center-y from its 4-point rhombus.
    // points are "cx,top cx+half,cy cx,bottom cx-half,cy"; center y = average of top & bottom.
    function diamondCenter(pair: string): { cx: number; cy: number } {
      const re = new RegExp(
        `data-pair="${pair}"[^>]*>[\\s\\S]*?<polygon points="([^"]+)"`,
      );
      const m = svg.match(re);
      expect(m, `polygon for ${pair}`).not.toBeNull();
      const pts = m![1]!.split(/\s+/).map((p) => p.split(",").map(Number));
      const xs = pts.map((p) => p[0]!);
      const ys = pts.map((p) => p[1]!);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      return { cx, cy };
    }

    const adj01 = diamondCenter("0,1"); // depth 1
    const adj12 = diamondCenter("1,2"); // depth 1
    const adj23 = diamondCenter("2,3"); // depth 1
    const mid02 = diamondCenter("0,2"); // depth 2
    const apex03 = diamondCenter("0,3"); // depth 3 (apex)

    // All depth-1 (adjacent) diamonds share the bottom row → same y.
    expect(adj01.cy).toBeCloseTo(adj12.cy, 5);
    expect(adj12.cy).toBeCloseTo(adj23.cy, 5);

    // Deeper pairs sit strictly higher on the canvas (smaller y).
    expect(mid02.cy).toBeLessThan(adj01.cy);
    expect(apex03.cy).toBeLessThan(mid02.cy);

    // Vertical pitch between rows is half the column pitch (the half-diagonal).
    expect(adj01.cy - mid02.cy).toBeCloseTo(QFD_CELL / 2, 5);
    expect(mid02.cy - apex03.cy).toBeCloseTo(QFD_CELL / 2, 5);

    // Horizontal placement: adjacent pair (i,i+1) sits above the boundary
    // between columns i and i+1 → its cx is one full pitch right of the prior.
    expect(adj12.cx - adj01.cx).toBeCloseTo(QFD_CELL, 5);
    expect(adj23.cx - adj12.cx).toBeCloseTo(QFD_CELL, 5);

    // The apex (0,3) is horizontally centered over the whole column span,
    // i.e. midway between the first and last adjacent diamonds.
    expect(apex03.cx).toBeCloseTo((adj01.cx + adj23.cx) / 2, 5);
  });
});
