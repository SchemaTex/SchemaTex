import { describe, expect, test } from "vitest";
import { render } from "../../src";

describe("blockdiagram renderer", () => {
  test("renders dangling signal output ports without excessive canvas height", () => {
    const svg = render(`blockdiagram "PID"
C = block("PID C(s)") [role: controller]
G = block("Plant G(s)") [role: plant]
err = sum(+r, -y)
r = signal("r (setpoint)")
y = signal("y (output)")
in -> r
r -> err
err -> C
C -> G
G -> y
G -> err`);

    expect(svg).toContain("y (output)");
    const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    expect(viewBox).not.toBeNull();
    expect(Number(viewBox?.[2])).toBeLessThan(260);
  });
});
