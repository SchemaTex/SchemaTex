import { describe, it, expect } from "vitest";
import { parseFbd } from "../../src/diagrams/fbd";

describe("FBD parser", () => {
  it("parses minimal AND network", () => {
    const ast = parseFbd(`fbd\nnetwork 0:\n  Out = AND(A, B)`);
    expect(ast.type).toBe("fbd");
    expect(ast.networks.length).toBe(1);
    expect(ast.networks[0].blocks.length).toBe(1);
    expect(ast.networks[0].blocks[0].blockType).toBe("AND");
  });

  it("parses nested expression", () => {
    const ast = parseFbd(`fbd\nnetwork 0:\n  Out = OR(A, AND(B, C))`);
    expect(ast.networks[0].blocks.length).toBe(2);
    const types = ast.networks[0].blocks.map((b) => b.blockType).sort();
    expect(types).toEqual(["AND", "OR"]);
  });

  it("parses inline constants", () => {
    const ast = parseFbd(`fbd\nvar Trigger: bool\nnetwork 0:\n  Done = TON(IN: Trigger, PT: T#5s)`);
    const ton = ast.networks[0].blocks[0];
    const ptPort = ton.ports.find((p) => p.name === "PT");
    expect(ptPort?.constant).toBe("T#5s");
  });

  it("supports negation", () => {
    const ast = parseFbd(`fbd\nnetwork 0:\n  Out = AND(A, ~B)`);
    const wires = ast.networks[0].wires;
    const negWire = wires.find((w) => w.negatedAtSink);
    expect(negWire).toBeDefined();
  });

  it("variadic AND with 4 inputs", () => {
    const ast = parseFbd(`fbd\nnetwork 0:\n  All = AND(A, B, C, D)`);
    const block = ast.networks[0].blocks[0];
    const ins = block.ports.filter((p) => p.side === "in");
    expect(ins.length).toBe(4);
  });

  it("instance reference", () => {
    const ast = parseFbd(
      `fbd\nnetwork 0:\n  Pulse = R_TRIG(CLK: Sensor)\n  Cnt = CTU(CU: Pulse.Q, R: Reset, PV: 100)`
    );
    expect(ast.networks[0].blocks.length).toBe(2);
  });

  it("rejects unknown block", () => {
    expect(() => parseFbd(`fbd\nnetwork 0:\n  X = FOOBAR(A)`)).toThrow(/Unknown function block/);
  });

  it("multiple networks", () => {
    const ast = parseFbd(`fbd\nnetwork 0:\n  X = AND(A, B)\nnetwork 1:\n  Y = OR(C, D)`);
    expect(ast.networks.length).toBe(2);
  });
});
