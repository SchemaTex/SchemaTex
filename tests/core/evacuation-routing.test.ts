import { describe, expect, it } from "vitest";
import { parse, renderResult } from "../../src/core/api";
import { getInteractiveCapabilities } from "../../src/core/interactive-capabilities";
import { floorplan } from "../../src/diagrams/floorplan";

describe("evacuation DiagramType routing", () => {
  it("the floorplan plugin detects both evacuation headers", () => {
    expect(floorplan.detect(`evacuation "Office"\nroom office at 0,0 size 4x3`)).toBe(true);
    expect(floorplan.detect(`escapeplan "Office"\nroom office at 0,0 size 4x3`)).toBe(true);
  });

  it("normalizes escapeplan to evacuation mode without rewriting the requested type", () => {
    const ast = parse(`escapeplan "Office"\nroom office at 0,0 size 4x3`, {
      type: "evacuation",
    }) as { type: string; mode: string };
    expect(ast.type).toBe("floorplan");
    expect(ast.mode).toBe("evacuation");
  });

  it("recovers an omitted evacuation header when config.type declares the mode", () => {
    const result = renderResult(
      `room office "Office" at 0,0 size 4x3
here in office at 1,1
exit-final x1 in office at 4,1.5 side east
route primary here -> x1`,
      {
        type: "evacuation",
      }
    );
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.svg).toContain("Office");
  });

  it("keeps an explicit evacuation header intact under forced routing", () => {
    const result = renderResult(
      `evacuation "Office"
room office "Office" at 0,0 size 4x3
here in office at 1,1
exit-final x1 in office at 4,1.5 side east
route primary here -> x1`,
      { type: "evacuation" }
    );
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.svg).toContain("Office");
  });

  it("advertises the floorplan-native room editing that the shared plugin serves", () => {
    const capability = getInteractiveCapabilities("evacuation");
    expect(capability.text).toContain("labels");
    expect(capability.position).toBe("native-xy");

    const result = renderResult(
      `evacuation "Office"
compliance iso
sheet a3 landscape
room office "Office" at 0,0 size 6x5
room lobby "Lobby" below office size 6x2.4
room stairA "Stair A" left-of lobby size 3x2.4
room stairB "Stair B" right-of lobby size 3x2.4
opening between office lobby at 50% width 1.6
door between lobby stairA at 50% width 1.1
door between lobby stairB at 50% width 1.1
here in office at 3,2.5
exit-final xA in stairA at 0,1.2 side west
exit-final xB in stairB at 3,1.2 side east
call-point cp1 in lobby at 0.8,0.3 side north
extinguisher f1 in lobby at 2,0.3 side north
first-aid fa1 in lobby at 4.8,1.8
route primary here -> lobby -> stairB -> xB
route secondary here -> lobby -> stairA -> xA`,
      { type: "evacuation", scene: true }
    );
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.scene?.some((item) => item.key === "node:office")).toBe(true);
    expect(result.svg).toContain('data-sx-key="node:office"');
  });
});
