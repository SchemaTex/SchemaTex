import { describe, expect, test } from "vitest";
import { layoutPid } from "../../src/diagrams/pid/layout";
import { parsePid } from "../../src/diagrams/pid/parser";
import { renderPid } from "../../src/diagrams/pid/renderer";

const DISTILLATION_DSL = `pid "Distillation Column T-201"

equip T-201 : column_tray      [tag: "T-201"]
equip E-201 : condenser        [tag: "Overhead Condenser"]
equip D-201 : vessel_h         [tag: "Reflux Drum"]
equip P-201 : pump_centrifugal [tag: "Reflux Pump"]
equip E-202 : reboiler         [tag: "Reboiler"]
equip PSV-201 : valve_psv      [tag: "PSV-201", set_pressure: "150 psig"]

line L1 from T-201.top to E-201.shell_in       [size: "8in", service: "overhead vapor", type: "process"]
line L2 from E-201.shell_out to D-201.in       [size: "8in", service: "condensate", type: "process"]
line L3 from D-201.bottom to P-201.in          [size: "3in", service: "reflux", type: "process"]
line L4 from P-201.out to T-201.reflux         [size: "3in", service: "reflux", type: "process"]
line L5 from T-201.bottom to E-202.in          [size: "6in", service: "bottoms", type: "process"]
line L6 from T-201.top to PSV-201.in           [size: "2in", service: "relief", type: "process_minor"]

inst PT-201 : field_discrete
  measures T-201
inst LIC-201 : cr_shared
  measures D-201
inst TIC-201 : cr_shared
  measures T-201`;

const REACTOR_DSL = `pid "High-Pressure Reactor Feed"

equip T-201 : tank_atm [tag: "Raw Material Tank"]
equip P-201 : pump_centrifugal [tag: "Feed Pump P-201A/B"]
equip E-201 : hx_shell_tube [tag: "Feed Pre-heater"]
equip R-201 : reactor_cstr [tag: "Reactor R-201"]
equip V-201 : valve_control [actuator: "diaphragm", fail: "FC"]
equip V-202 : valve_control [actuator: "diaphragm", fail: "FO"]
equip V-203 : valve_psv [set_pressure: "150 psig"]

line L1 from T-201.bottom to P-201.in [size: "6\\"", service: "feed", type: "process"]
line L2 from P-201.out to E-201.shell_in [size: "6\\"", service: "feed", type: "process"]
line L3 from E-201.shell_out to V-201.in [size: "6\\"", service: "feed", type: "process"]
line L4 from V-201.out to R-201.in [size: "6\\"", service: "feed", type: "process"]
line L5 from R-201.out to V-202.in [size: "4\\"", service: "product", type: "process"]

inst FT-201 : field_discrete
  measures L2
inst FIC-201 : cr_shared
  controls V-201

inst TT-201 : field_discrete
  measures R-201
inst TIC-201 : cr_shared
  controls V-202

inst PT-201 : field_discrete
  measures R-201
inst PSHH-201 : field_discrete
  measures R-201

line s1 from FT-201 to FIC-201 [type: "electric"]
line s2 from FIC-201 to V-201 [type: "pneumatic"]
line s3 from TT-201 to TIC-201 [type: "electric"]
line s4 from TIC-201 to V-202 [type: "pneumatic"]
line s5 from PT-201 to PSHH-201 [type: "electric"]`;

const DUPLEX_DSL = `pid "Duplex Pump Loop"
equip T-1 : tank_atm [tag: "Reservoir"]
equip P-A : pump_centrifugal [tag: "Duty Pump"]
equip P-B : pump_centrifugal [tag: "Standby Pump"]
equip NRV-A : valve_check [tag: "NRV-A"]
equip NRV-B : valve_check [tag: "NRV-B"]
equip F-1 : filter [tag: "Filter"]
equip V-1 : valve_control [tag: "PCV"]
equip TEST : vessel_v [tag: "Test Manifold"]

line s1 from T-1.bottom to P-A.in [type: process]
line s2 from T-1.bottom to P-B.in [type: process]
line d1 from P-A.out to NRV-A.in [type: process]
line d2 from P-B.out to NRV-B.in [type: process]
line m1 from NRV-A.out to F-1.in [type: process]
line m2 from NRV-B.out to F-1.in [type: process]
line p1 from F-1.out to V-1.in [type: process]
line p2 from V-1.out to TEST.in [type: process]
line ret from TEST.bottom to T-1.top [type: process]`;

const UNEVEN_BRANCH_DSL = `pid "Unequal Parallel Trains"
equip FEED : tank_atm [tag: "Feed"]
equip SHORT : pump_centrifugal [tag: "Short train"]
equip LONG_A : pump_centrifugal [tag: "Long train A"]
equip LONG_B : filter [tag: "Long train B"]
equip MERGE : vessel_v [tag: "Merge"]
equip PRODUCT : tank_atm [tag: "Product"]
line a1 from FEED.bottom to SHORT.in [type: process]
line a2 from SHORT.out to MERGE.in [type: process]
line b1 from FEED.bottom to LONG_A.in [type: process]
line b2 from LONG_A.out to LONG_B.in [type: process]
line b3 from LONG_B.out to MERGE.in [type: process]
line out from MERGE.out to PRODUCT.top [type: process]`;

describe("P&ID renderer", () => {
  test("renders process_minor as an unfilled minor process line", () => {
    const svg = renderPid(DISTILLATION_DSL);

    expect(svg).toContain(".lt-pid-process-min { stroke: #1d1d1d; stroke-width: 1.5; fill: none; }");
    expect(svg).toContain('data-line-id="L6"');
    expect(svg).toContain('class="lt-pid-process-min lt-pid-line-path"');
    expect(svg).not.toContain("lt-pid-process_minor");
  });

  test("adds a no-fill guard class to every line path", () => {
    const svg = renderPid(DISTILLATION_DSL);
    const linePaths = [...svg.matchAll(/<path [^>]*data-line-id="[^"]+"[^>]*>/g)].map((match) => match[0]);

    expect(linePaths).toHaveLength(6);
    expect(linePaths.every((path) => /class="[^"]*\blt-pid-line-path\b/.test(path))).toBe(true);
  });

  test("keeps process pipes behind equipment and signal lines above equipment", () => {
    const svg = renderPid(REACTOR_DSL);

    expect(svg.indexOf("lt-pid-process-lines")).toBeLessThan(svg.indexOf("lt-pid-equipment"));
    expect(svg.indexOf("lt-pid-equipment")).toBeLessThan(svg.indexOf("lt-pid-signal-lines"));
  });

  test("places line-mounted field instruments near the measured pipe", () => {
    const layout = layoutPid(parsePid(REACTOR_DSL));
    const pump = layout.equipment.find((eq) => eq.equip.id === "P-201")!;
    const exchanger = layout.equipment.find((eq) => eq.equip.id === "E-201")!;
    const ft = layout.instruments.find((inst) => inst.inst.tag === "FT-201")!;

    expect(ft.cx).toBeGreaterThan(pump.cx);
    expect(ft.cx).toBeLessThanOrEqual(exchanger.cx + 24);
  });

  test("fans out field instruments that share the same equipment target", () => {
    const layout = layoutPid(parsePid(REACTOR_DSL));
    const reactorInstruments = ["TT-201", "PT-201", "PSHH-201"].map(
      (tag) => layout.instruments.find((inst) => inst.inst.tag === tag)!
    );
    const sortedX = reactorInstruments.map((inst) => inst.cx).sort((a, b) => a - b);

    expect(sortedX[1]! - sortedX[0]!).toBeGreaterThanOrEqual(38);
    expect(sortedX[2]! - sortedX[1]!).toBeGreaterThanOrEqual(38);
  });

  test("reserves the equipment-tag strip before placing field instruments", () => {
    const layout = layoutPid(parsePid(REACTOR_DSL));
    const reactor = layout.equipment.find((eq) => eq.equip.id === "R-201")!;
    const tt = layout.instruments.find((inst) => inst.inst.tag === "TT-201")!;

    expect(tt.cy - (reactor.y + reactor.height)).toBeGreaterThanOrEqual(60);
  });

  test("routes CSTR product flow from the right-side outlet in left-to-right layouts", () => {
    const layout = layoutPid(parsePid(REACTOR_DSL));
    const reactor = layout.equipment.find((eq) => eq.equip.id === "R-201")!;
    const productLine = layout.lines.find((line) => line.line.id === "L5")!;

    expect(productLine.path).toContain(`M ${reactor.ports.out.x} ${reactor.ports.out.y}`);
  });

  test("places parallel pump branches in shared ranks instead of a serial declaration row", () => {
    const layout = layoutPid(parsePid(DUPLEX_DSL));
    const duty = layout.equipment.find((eq) => eq.equip.id === "P-A")!;
    const standby = layout.equipment.find((eq) => eq.equip.id === "P-B")!;
    const dutyCheck = layout.equipment.find((eq) => eq.equip.id === "NRV-A")!;
    const standbyCheck = layout.equipment.find((eq) => eq.equip.id === "NRV-B")!;
    const filter = layout.equipment.find((eq) => eq.equip.id === "F-1")!;

    expect(duty.cx).toBe(standby.cx);
    expect(duty.cy).not.toBe(standby.cy);
    expect(dutyCheck.cx).toBe(standbyCheck.cx);
    expect(dutyCheck.cy).not.toBe(standbyCheck.cy);
    expect(filter.cx).toBeGreaterThan(dutyCheck.cx);
  });

  test("keeps topology ranks when declarations and lines are reordered", () => {
    const original = parsePid(DUPLEX_DSL);
    const reordered = parsePid(DUPLEX_DSL);
    reordered.equipment.reverse();
    reordered.lines.reverse();

    const rankX = (dsl: ReturnType<typeof parsePid>) =>
      new Map(layoutPid(dsl).equipment.map((item) => [item.equip.id, item.cx]));
    const before = rankX(original);
    const after = rankX(reordered);

    for (const id of before.keys()) expect(after.get(id)).toBe(before.get(id));
  });

  test("places a merge after the longer of two unequal process trains", () => {
    const layout = layoutPid(parsePid(UNEVEN_BRANCH_DSL));
    const byId = new Map(layout.equipment.map((item) => [item.equip.id, item]));

    expect(byId.get("MERGE")!.cx).toBeGreaterThan(byId.get("LONG_B")!.cx);
    expect(byId.get("PRODUCT")!.cx).toBeGreaterThan(byId.get("MERGE")!.cx);
  });

  test("routes recycle lines below the equipment field", () => {
    const layout = layoutPid(parsePid(DUPLEX_DSL));
    const recycle = layout.lines.find((line) => line.line.id === "ret")!;
    const equipmentBottom = Math.max(
      ...layout.equipment.map((eq) => eq.y + eq.height)
    );
    const ys = [...recycle.path.matchAll(/[ML]\s+-?[\d.]+\s+(-?[\d.]+)/g)].map(
      (match) => Number(match[1])
    );

    expect(Math.max(...ys)).toBeGreaterThan(equipmentBottom);
  });

  test("renders junction dots where process branches split and merge", () => {
    const svg = renderPid(DUPLEX_DSL);
    expect(svg).toContain('class="lt-pid-junctions"');
    expect(svg).toContain('class="lt-pid-junction"');
  });
});
