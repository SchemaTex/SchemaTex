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

  test("routes CSTR product flow from the right-side outlet in left-to-right layouts", () => {
    const layout = layoutPid(parsePid(REACTOR_DSL));
    const reactor = layout.equipment.find((eq) => eq.equip.id === "R-201")!;
    const productLine = layout.lines.find((line) => line.line.id === "L5")!;

    expect(productLine.path).toContain(`M ${reactor.ports.out.x} ${reactor.ports.out.y}`);
  });
});
