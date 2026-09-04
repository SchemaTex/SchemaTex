import { describe, expect, it } from "vitest";
import { parseSLDDSL } from "../../src/diagrams/sld/parser";
import { layoutSLD } from "../../src/diagrams/sld/layout";

const COMMERCIAL_PV = `sld "Commercial PV Interconnection" [standard: ansi]
PV_A = solar [rating: "100 kWdc", label: "PV Array A"]
PV_B = solar [rating: "100 kWdc", label: "PV Array B"]
PV_C = solar [rating: "50 kWdc", label: "PV Array C"]
CMB = hub [rating: "600 Vdc", label: "DC Combiner"]
DISC_DC = switch_load [rating: "600 Vdc / 500 A", label: "DC Isolator"]
INV = load [rating: "200 kWac", label: "Grid-tie Inverter"]
CB_AC = breaker [rating: "400 A", label: "AC Breaker"]
MTR = watthour_meter [label: "Production Meter"]
MSB = bus [voltage: "400 V", label: "Main Switchboard"]
UTIL = utility [voltage: "400 V", label: "Utility"]
LOAD = load [rating: "Facility", label: "Building Loads"]
PV_A -> CMB [cable: "PV1-F 2×70 mm²"]
PV_B -> CMB [cable: "PV1-F 2×70 mm²"]
PV_C -> CMB [cable: "PV1-F 2×35 mm²"]
CMB -> DISC_DC [cable: "2×240 mm² DC"]
DISC_DC -> INV
INV -> CB_AC [cable: "4×240 mm² Cu"]
CB_AC -> MTR
MTR -> MSB
UTIL -> MSB
MSB -> LOAD`;

const RESIDENTIAL_BRANCHES = `sld "Residential Consumer Unit"
UTIL = utility [voltage: "230V"]
MTR = watthour_meter [label: "kWh meter"]
ISO = switch_load [label: "Main isolator"]
RCD = rcd [label: "Main RCD"]
BUS = bus [voltage: "230V"]
${Array.from({ length: 7 }, (_, index) => {
  const n = index + 1;
  return `CB${n} = breaker [label: "MCB circuit ${n}"]\nL${n} = load [label: "Residential circuit ${n}"]`;
}).join("\n")}
UTIL -> MTR
MTR -> ISO
ISO -> RCD
RCD -> BUS
${Array.from({ length: 7 }, (_, index) => {
  const n = index + 1;
  return `BUS -> CB${n}\nCB${n} -> L${n}`;
}).join("\n")}`;

const TWO_STAGE_SIDE_FEED = `sld "Two-stage PV Side Feed" [standard: ansi]
PV = solar [label: "PV Array"]
CMB = hub [label: "DC Combiner"]
UTIL = utility [label: "Utility"]
MSB = bus [label: "Main Switchboard"]
LOAD = load [label: "Building Loads"]
PV -> CMB
CMB -> MSB
UTIL -> MSB
MSB -> LOAD`;

describe("SLD layout — professional review contract", () => {
  it("gives portrait commercial feeders at least a square review canvas", () => {
    const layout = layoutSLD(parseSLDDSL(COMMERCIAL_PV));
    expect(layout.width).toBeGreaterThanOrEqual(layout.height);
  });

  it("keeps fan-in cable labels beside their own source drops", () => {
    const layout = layoutSLD(parseSLDDSL(COMMERCIAL_PV));
    const pvCables = layout.edges.filter((edge) => edge.to === "CMB");
    expect(pvCables).toHaveLength(3);
    const labelXs = pvCables.map((edge) => edge.midX).sort((a, b) => a - b);
    expect(labelXs[1]! - labelXs[0]!).toBeGreaterThanOrEqual(100);
    expect(labelXs[2]! - labelXs[1]!).toBeGreaterThanOrEqual(100);
  });

  it("keeps a direct Utility feeder outside the PV source bank", () => {
    const layout = layoutSLD(parseSLDDSL(COMMERCIAL_PV));
    const utility = layout.nodes.find((node) => node.node.id === "UTIL")!;
    const rightmostPv = Math.max(
      ...layout.nodes
        .filter((node) => node.node.id.startsWith("PV_"))
        .map((node) => node.x)
    );
    expect(utility.x - rightmostPv).toBeGreaterThanOrEqual(140);
  });

  it("treats any structurally skipped rank as a side feed without a depth threshold", () => {
    const layout = layoutSLD(parseSLDDSL(TWO_STAGE_SIDE_FEED));
    const utility = layout.nodes.find((node) => node.node.id === "UTIL")!;
    const pv = layout.nodes.find((node) => node.node.id === "PV")!;

    expect(utility.x - pv.x).toBeGreaterThanOrEqual(140);
  });

  it("keeps true peer sources together when neither edge skips a rank", () => {
    const peerSources = TWO_STAGE_SIDE_FEED.replace("PV -> CMB\nCMB -> MSB", "PV -> MSB");
    const layout = layoutSLD(parseSLDDSL(peerSources));
    const utility = layout.nodes.find((node) => node.node.id === "UTIL")!;
    const pv = layout.nodes.find((node) => node.node.id === "PV")!;

    expect(Math.abs(utility.x - pv.x)).toBeLessThanOrEqual(150);
  });

  it("keeps labels centered on deep residential boards with wide branch banks", () => {
    const layout = layoutSLD(parseSLDDSL(RESIDENTIAL_BRANCHES));
    const branchNodes = layout.nodes.filter((node) => /^CB|^L/.test(node.node.id));

    expect(branchNodes).toHaveLength(14);
    expect(branchNodes.every((node) => node.labelSide === undefined)).toBe(true);
  });

  it("reserves canvas width for side annotations on deep narrow feeders", () => {
    const layout = layoutSLD(parseSLDDSL(COMMERCIAL_PV));
    const sideNodes = layout.nodes.filter((node) => node.labelSide === "right");

    expect(sideNodes.length).toBeGreaterThan(0);
    for (const node of sideNodes) {
      const estimatedRight =
        node.x + node.halfWidth + 18 + (node.node.label ?? node.node.id).length * 6;
      expect(estimatedRight).toBeLessThan(layout.width);
    }
  });

  it("keeps the same structural decisions after declaration reordering", () => {
    const original = parseSLDDSL(COMMERCIAL_PV);
    const reordered = parseSLDDSL(COMMERCIAL_PV);
    reordered.nodes.reverse();
    reordered.connections.reverse();

    const before = layoutSLD(original);
    const after = layoutSLD(reordered);
    const beforeById = new Map(before.nodes.map((node) => [node.node.id, node]));
    const afterById = new Map(after.nodes.map((node) => [node.node.id, node]));

    expect(after.width).toBeGreaterThanOrEqual(after.height);
    expect(afterById.get("UTIL")!.x).toBeGreaterThan(afterById.get("PV_C")!.x);
    for (const id of ["DISC_DC", "INV", "CB_AC", "MTR", "LOAD"]) {
      expect(afterById.get(id)!.labelSide).toBe(beforeById.get(id)!.labelSide);
    }
  });

  it("separates fan-in cable labels when a fourth source is added", () => {
    const fourSourceDsl = COMMERCIAL_PV
      .replace(
        "CMB = hub",
        'PV_D = solar [rating: "50 kWdc", label: "PV Array D"]\nCMB = hub'
      )
      .replace(
        "PV_A -> CMB",
        'PV_D -> CMB [cable: "PV1-F 2×35 mm²"]\nPV_A -> CMB'
      );
    const layout = layoutSLD(parseSLDDSL(fourSourceDsl));
    const cables = layout.edges
      .filter((edge) => edge.to === "CMB")
      .map((edge) => edge.midX)
      .sort((a, b) => a - b);

    expect(cables).toHaveLength(4);
    for (let index = 1; index < cables.length; index++) {
      expect(cables[index]! - cables[index - 1]!).toBeGreaterThanOrEqual(100);
    }
  });
});
