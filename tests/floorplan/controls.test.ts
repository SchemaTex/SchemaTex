import { describe, expect, it } from "vitest";
import {
  layoutFloorplan,
  parseFloorplan,
  renderFloorplan,
} from "../../src/diagrams/floorplan";

const BASE = `floorplan "Controls"
room hall "Hall" at 0,0 size 3x4
room living "Living" right-of hall size 5x4
fixture switch SW1 in hall on east at 25%
fixture switch-3way SW2 in living on west at 75%
furniture motion-sensor MS1 in living at 0.8,0.5
furniture ceiling-light L1 in living at 2.3,1.8
furniture recessed-light L2 in living at 3.4,1.2`;

describe("floorplan controls syntax and rendering", () => {
  it("parses one-to-many controls by instance id", () => {
    const ast = parseFloorplan(`${BASE}\ncontrols SW1 -> L1, L2`);
    expect(ast.controls).toEqual([
      { source: "SW1", targets: ["L1", "L2"], line: 9 },
    ]);
  });

  it("renders themeable dashed quadratic curves across room boundaries", () => {
    const svg = renderFloorplan(`${BASE}\ncontrols SW1 -> L1, L2`);
    expect(svg.match(/class="sx-fp-control"/g)).toHaveLength(2);
    expect(svg).toContain(".sx-fp-control {");
    expect(svg).toContain("stroke-dasharray: 5 4");
    expect(svg).toMatch(/class="sx-fp-control"[^>]*d="M [^"]+ Q [^"]+"/);
    expect(svg).toContain('data-control-source="SW1"');
    expect(svg).toContain('data-control-target="L1"');
    expect(svg).not.toContain("style=");
  });

  it("allows switches and a motion sensor to control the same luminaire", () => {
    const layout = layoutFloorplan(parseFloorplan(`${BASE}
controls SW1 -> L1
controls SW2 -> L1
controls MS1 -> L1`));
    expect(layout.errors).toEqual([]);
    expect(layout.controls.map((control) => control.sourceId)).toEqual([
      "SW1",
      "SW2",
      "MS1",
    ]);
    expect(layout.controls.map((control) => control.targetId)).toEqual([
      "L1",
      "L1",
      "L1",
    ]);
  });
});

describe("floorplan controls validation", () => {
  it("rejects undefined source and target ids with recovery suggestions", () => {
    const layout = layoutFloorplan(parseFloorplan(`${BASE}
controls SX1 -> LX1`));
    expect(layout.errors).toContain(
      'controls: unknown instance id "SX1". Did you mean "SW1"?'
    );
    expect(layout.errors).toContain(
      'controls: unknown instance id "LX1". Did you mean "L1"?'
    );
    expect(layout.diagnostics.filter(
      (diagnostic) => diagnostic.code === "floorplan/control-unknown-instance"
    )).toHaveLength(2);
  });

  it("rejects an item controlling itself", () => {
    const layout = layoutFloorplan(parseFloorplan(`${BASE}
controls SW1 -> SW1`));
    expect(layout.errors).toContain('controls: item "SW1" cannot control itself');
    expect(layout.controls).toEqual([]);
  });

  it("rejects a source outside the switch and sensor family", () => {
    const layout = layoutFloorplan(parseFloorplan(`${BASE}
furniture sofa SOFA1 in hall at 0.2,2.5
controls SOFA1 -> L1`));
    expect(layout.errors).toContain(
      'controls: source "SOFA1" is sofa; sources must be a switch or motion-sensor'
    );
    expect(layout.controls).toEqual([]);
  });

  it("rejects a target that is not a luminaire", () => {
    const layout = layoutFloorplan(parseFloorplan(`${BASE}
furniture chair C1 in living at 4.2,3
controls SW1 -> C1`));
    expect(layout.errors).toContain(
      'controls: target "C1" is chair; targets must be luminaires'
    );
    expect(layout.controls).toEqual([]);
  });
});
