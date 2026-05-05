import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseBpmn, BpmnParseError } from "../../src/diagrams/bpmn/parser";

const fixture = (name: string): string =>
  readFileSync(resolve(__dirname, "../fixtures/bpmn", name), "utf-8");

describe("bpmn parser", () => {
  it("parses loan-approval header + pools/lanes", () => {
    const ast = parseBpmn(fixture("loan-approval.bpmn"));
    expect(ast.type).toBe("bpmn");
    expect(ast.direction).toBe("LR");
    expect(ast.title).toBe("Loan Application Approval");
    expect(ast.pools.length).toBe(1);
    expect(ast.pools[0]!.label).toBe("Bank");
    expect(ast.pools[0]!.lanes.length).toBe(2);
    expect(ast.lanes.map((l) => l.label)).toEqual(["Clerk", "Underwriter"]);
  });

  it("classifies events / tasks / gateways", () => {
    const ast = parseBpmn(fixture("loan-approval.bpmn"));
    expect(ast.events.length).toBe(3); // A start, E + F end
    expect(ast.activities.length).toBe(3); // B, C, D tasks
    expect(ast.gateways.length).toBe(2); // G1, G2
    const a = ast.events.find((e) => e.id === "A")!;
    expect(a.kind).toBe("start");
    expect(a.label).toBe("Application received");
    const c = ast.activities.find((x) => x.id === "C")!;
    expect(c.marker).toBe("service");
    const g1 = ast.gateways.find((x) => x.id === "G1")!;
    expect(g1.gatewayKind).toBe("xor");
  });

  it("handles message flows + black-box pool", () => {
    const ast = parseBpmn(fixture("pizza-order.bpmn"));
    const customer = ast.pools.find((p) => p.label === "Customer")!;
    expect(customer.blackbox).toBe(true);
    expect(customer.lanes.length).toBe(0);
    const msgFlows = ast.flows.filter((f) => f.kind === "message");
    expect(msgFlows.length).toBe(2);
    expect(msgFlows[0]!.from).toBe("Customer");
    expect(msgFlows[0]!.to).toBe("A");
  });

  it("parses conditional and default flows", () => {
    const ast = parseBpmn(fixture("loan-approval.bpmn"));
    const cond = ast.flows.filter((f) => f.kind === "conditional");
    const def = ast.flows.filter((f) => f.kind === "default");
    expect(cond.length).toBeGreaterThan(0);
    expect(def.length).toBeGreaterThan(0);
    expect(cond[0]!.label).toBe("yes");
  });

  it("rejects sequence flow crossing pool boundary", () => {
    expect(() =>
      parseBpmn(`bpmn
pool "P1" {
  lane "L1" {
    A: start "s"
  }
}
pool "P2" {
  lane "L2" {
    B: end "e"
  }
}
flows
A --> B
`)
    ).toThrow(/crosses pool boundary/);
  });

  it("rejects message flow inside one pool", () => {
    expect(() =>
      parseBpmn(`bpmn
pool "P1" {
  lane "L1" {
    A: start "s"
    B: end "e"
  }
}
flows
A ~~> B
`)
    ).toThrow(/cross pool boundaries/);
  });

  it("rejects two default flows from same gateway", () => {
    expect(() =>
      parseBpmn(`bpmn
pool "P" {
  lane "L" {
    A: start
    G: gateway xor
    B: end
    C: end
  }
}
flows
A --> G
G --* "x" --> B
G --* "y" --> C
`)
    ).toThrow(/default flow/);
  });

  it("rejects black-box pool with internal objects", () => {
    expect(() =>
      parseBpmn(`bpmn
pool "Customer" blackbox {
  lane "X" {
    A: start
  }
}`)
    ).toThrow(/cannot contain lanes/);
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      parseBpmn(`bpmn
pool "P" {
  lane "L" {
    A: start
    A: end
  }
}`)
    ).toThrow(/duplicate id/);
  });

  it("emits BpmnParseError with line number for header", () => {
    try {
      parseBpmn("not-bpmn\n");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(BpmnParseError);
      expect((e as BpmnParseError).line).toBe(1);
    }
  });
});
