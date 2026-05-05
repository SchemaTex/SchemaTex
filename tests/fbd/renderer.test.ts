import { describe, it, expect } from "vitest";
import { renderFbd } from "../../src/diagrams/fbd";

describe("FBD renderer", () => {
  it("renders SVG with block, header, ports", () => {
    const svg = renderFbd(`fbd\nnetwork 0:\n  Out = AND(A, B)`);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain('data-diagram-type="fbd"');
    expect(svg).toContain("data-block-type=\"AND\"");
    expect(svg).toContain(">AND<");  // block header text
    expect(svg).toContain(">&amp;<"); // inner symbol for AND
  });

  it("renders timer with constant", () => {
    const svg = renderFbd(`fbd\nvar Trigger: bool\nnetwork 0:\n  Done = TON(IN: Trigger, PT: T#5s)`);
    expect(svg).toContain("data-block-type=\"TON\"");
    expect(svg).toContain("T#5s");
  });

  it("renders comparison block with inline constant", () => {
    const svg = renderFbd(`fbd\nvar Tank: real\nnetwork 0:\n  Hot = GT(IN1: Tank, IN2: 80.0)`);
    expect(svg).toContain("data-block-type=\"GT\"");
    expect(svg).toContain("80.0");
  });

  it("output negation bubble for NAND", () => {
    const svg = renderFbd(`fbd\nnetwork 0:\n  Q = NAND(A, B)`);
    expect(svg).toContain("data-block-type=\"NAND\"");
    expect(svg).toContain("lt-fbd-negation");
  });
});
