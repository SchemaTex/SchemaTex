import { describe, expect, it } from "vitest";
import { parseSLDDSL } from "../../src/diagrams/sld/parser";
import { layoutSLD } from "../../src/diagrams/sld/layout";

const COMMERCIAL_PV = `sld "Commercial PV Interconnection" [standard: iec]
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

describe("SLD layout — professional review contract", () => {
  it("gives deep commercial feeders a landscape review canvas", () => {
    const layout = layoutSLD(parseSLDDSL(COMMERCIAL_PV));
    expect(layout.width).toBeGreaterThanOrEqual(960);
    expect(layout.width / layout.height).toBeGreaterThan(0.85);
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
});
