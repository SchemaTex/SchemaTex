import { describe, expect, it } from "vitest";
import { parseResult, renderResult } from "../../src/core/api";
import { estimateMaxLineWidth } from "../../src/core/text-metrics";
import {
  findBlockDiagramCollisions,
  layoutBlockDiagram,
} from "../../src/diagrams/blockdiagram/layout";
import { parseBlockDiagram } from "../../src/diagrams/blockdiagram/parser";
import { layoutCircuitNetlist } from "../../src/diagrams/circuit/autolayout";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { getSymbol } from "../../src/diagrams/circuit/symbols";
import { CIRCUIT_GENERATION_CAPABILITIES } from "../../src/diagrams/circuit/capabilities";
import { BLOCKDIAGRAM_GENERATION_CAPABILITIES } from "../../src/diagrams/blockdiagram/capabilities";
import { STATE_GENERATION_CAPABILITIES } from "../../src/diagrams/state/capabilities";
import { layoutStateDiagram } from "../../src/diagrams/state/layout";
import { parseStateDiagram } from "../../src/diagrams/state/parser";

const SPI_BLOCK = `blockdiagram "SPI Bus Topology — 28× ADF4351"
CPU = block("STM32F407\\nSPI1 Peripheral\\nSCK · MOSI\\n+ 7× GPIO LE[1:7]") [role: controller]
TCXO = block("25 MHz TCXO\\nClock Distribution\\nBuffer Fanout ×7") [role: reference]
${Array.from(
  { length: 7 },
  (_, index) =>
    `G${index + 1} = block("G${index + 1}: RF Band\\n4× ADF4351 daisy-chain")`
).join("\n")}
in -> CPU
in -> TCXO
${Array.from(
  { length: 7 },
  (_, index) => `CPU -> G${index + 1} ["SCK, MOSI + LE${index + 1}"]`
).join("\n")}
${Array.from(
  { length: 7 },
  (_, index) => `TCXO -> G${index + 1} ["25 MHz REF"]`
).join("\n")}`;

const PID_BLOCK = `blockdiagram "PID Closed-Loop Control System"
C = block("C(s)") [role: controller]
G = block("G(s)") [role: plant]
H = block("H(s)") [role: sensor]
r = signal("r(t)")
e = signal("e(t)")
u = signal("u(t)")
y = signal("y(t)")
ym = signal("y_m(t)")
err = sum(+r, -ym)
in -> r
r -> err ["R(s)"]
err -> C ["E(s)"]
C -> G ["U(s)"]
G -> out ["Y(s)"]
G -> H ["Y(s)"]
H -> err ["Y_m(s)"]`;

const AUTOMOTIVE = `circuit "Circuito de Intermitentes Automotriz 12V" netlist
B1 bat 0 12V label="Batería / Encendedor 12V"
F1 bat p1 15A label="Fusible 15A"
S1 p1 p2 type=switch_spst label="Interruptor Activación"
K1 p2 fl_out piloto type=automotive_flasher_3pin label="Flasher 3 Contactos"
S2 fl_out izq der type=switch_spdt_center_off label="Selector Izq / OFF / Der"
L1 izq 0 type=lamp label="Ámbar Del. Izq"
L2 izq 0 type=lamp label="Ámbar Tras. Izq"
D1 izq l1 type=led label="LED Verde Izq 1"
R1 l1 0 500
D2 izq l2 type=led label="LED Verde Izq 2"
R2 l2 0 500
L3 der 0 type=lamp label="Ámbar Del. Der"
L4 der 0 type=lamp label="Ámbar Tras. Der"
D3 der r1 type=led label="LED Verde Der 1"
R3 r1 0 500
D4 der r2 type=led label="LED Verde Der 2"
R4 r2 0 500`;

const LONG_STATE_BODY = `[*] --> M0
state "M0: (1,0,0,0,0) Package Received from Seller" as M0
state "M1: (0,1,0,0,0) At Sorting Center" as M1
state "M2: (0,0,1,0,0) At Warehouse / Transit Hub" as M2
state "M3: (0,0,0,1,0) With Delivery Courier" as M3
state "M4: (0,0,0,0,1) Customer Received Package" as M4
M0 --> M1 : T1 — Pickup Package
M1 --> M2 : T2 — Sorting Process
M2 --> M3 : T3 — Transportation to Hub
M3 --> M4 : T4 — Last Mile Delivery
M4 --> [*]`;

describe("22.2 parser truthfulness", () => {
  it("exposes generation capabilities from the same live contracts", () => {
    expect(
      CIRCUIT_GENERATION_CAPABILITIES.supportedComponentTypes.every(
        (type) => !!getSymbol(type)
      )
    ).toBe(true);
    expect(CIRCUIT_GENERATION_CAPABILITIES.automotiveTypes).toEqual([
      "automotive_flasher_3pin",
      "switch_spdt_center_off",
    ]);
    expect(BLOCKDIAGRAM_GENERATION_CAPABILITIES).toMatchObject({
      unknownStatementPolicy: "error",
      undeclaredEndpointPolicy: "error",
      layout: "measured-layered",
    });
    expect(STATE_GENERATION_CAPABILITIES.directions).toEqual([
      "LR",
      "TB",
      "auto",
    ]);
  });

  it("removes a fenced mindmap marker without synthesizing a false root", () => {
    const fenced = `\`\`\`
mindmap

# Lycanthropy Class Tree
## Archetypes
### Berserker
- Moon rage
\`\`\``;
    const result = parseResult(fenced, { type: "mindmap" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ast = result.ast as { root: { label: string } };
      expect(ast.root.label).toBe("Lycanthropy Class Tree");
      expect(result.status).toBe("valid");
    }
  });

  it("keeps genuine multiple mindmap roots invalid with a stable code", () => {
    const result = parseResult("mindmap\n# One\n# Two", { type: "mindmap" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]?.code).toBe("MINDMAP_MULTIPLE_ROOTS");
      expect(result.diagnostics[0]?.line).toBe(3);
    }
  });

  it("parses physical and escaped multiline block labels without loss", () => {
    const ast = parseBlockDiagram(`blockdiagram "Washer"
MCU = block("MCU Principal
DC41-00285C") [role: controller]
Motor = block("Direct Drive\\nMotor") [role: actuator]
MCU -> Motor ["PWM"]`);
    expect(ast.blocks.find((block) => block.id === "MCU")?.label).toBe(
      "MCU Principal\nDC41-00285C"
    );
    expect(ast.blocks.find((block) => block.id === "Motor")?.label).toBe(
      "Direct Drive\nMotor"
    );
  });

  it("never silently drops unknown statements or bare undeclared endpoints", () => {
    const unknown = parseResult(
      'blockdiagram "X"\nA = blok("typo")',
      { type: "blockdiagram" }
    );
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) {
      expect(unknown.diagnostics[0]?.code).toBe("BLOCK_UNKNOWN_STATEMENT");
      expect(unknown.diagnostics[0]?.line).toBe(2);
    }

    const endpoint = parseResult('blockdiagram "X"\nA -> B', {
      type: "blockdiagram",
    });
    expect(endpoint.ok).toBe(false);
    if (!endpoint.ok) {
      expect(endpoint.diagnostics[0]?.code).toBe(
        "BLOCK_UNDECLARED_ENDPOINT"
      );
    }
  });
});

describe("22.2 measured layered layout", () => {
  it("gives every SPI peer a unique measured row and collision-free labels", () => {
    const layout = layoutBlockDiagram(parseBlockDiagram(SPI_BLOCK));
    const logical = layout.nodes.filter(
      (node) => node.id === "CPU" || node.id === "TCXO" || /^G\d$/.test(node.id)
    );
    const positions = logical.map((node) => {
      if (node.kind === "block") return `${node.x},${node.y}`;
      if (node.kind === "sum") return `${node.cx},${node.cy}`;
      return `${node.x},${node.y}`;
    });
    expect(new Set(positions).size).toBe(logical.length);
    expect(findBlockDiagramCollisions(layout)).toEqual({
      nodeNode: [],
      labelLabel: [],
      labelNode: [],
    });
    const rendered = renderResult(SPI_BLOCK);
    expect(rendered.ok).toBe(true);
    if (rendered.ok) {
      expect(rendered.svg).toContain("<tspan");
      expect(rendered.svg).toContain("STM32F407");
    }
  });

  it("keeps return-path blocks off the forward row without stretching the canvas", () => {
    const layout = layoutBlockDiagram(parseBlockDiagram(PID_BLOCK));
    const block = (id: string) => {
      const node = layout.nodes.find((candidate) => candidate.id === id);
      expect(node?.kind).toBe("block");
      return node! as Extract<typeof node, { kind: "block" }>;
    };
    const plant = block("G");
    const sensor = block("H");
    const output = layout.nodes.find((node) => node.id === "out");

    expect(sensor.y).toBeGreaterThan(plant.y + plant.height);
    expect(output?.kind).toBe("port");
    if (output?.kind === "port") {
      expect(output.y).toBe(plant.y + plant.height / 2);
    }
    expect(layout.edges.find((edge) => edge.from === "H")?.isFeedback).toBe(
      true
    );
    expect(layout.width).toBeLessThan(1200);
    expect(findBlockDiagramCollisions(layout)).toEqual({
      nodeNode: [],
      labelLabel: [],
      labelNode: [],
    });
  });

  it("supports real automotive B/L/P and center-off symbols", () => {
    expect(getSymbol("automotive_flasher_3pin")?.netlistPins).toEqual([
      "b",
      "l",
      "p",
    ]);
    expect(getSymbol("switch_spdt_center_off")?.netlistPins).toEqual([
      "common",
      "left",
      "right",
    ]);

    const ast = parseNetlist(AUTOMOTIVE.split("\n").slice(1).join("\n"));
    const layout = layoutCircuitNetlist(ast);
    const ids = layout.items.map((item) => item.component.id);
    expect(ids).toEqual(expect.arrayContaining(["K1", "S2", "L1", "R4"]));
    expect(new Set(layout.items.map((item) => `${item.x},${item.y}`)).size).toBe(
      layout.items.length
    );
    const leftLoads = ["L1", "L2", "D1", "D2"].map(
      (id) => layout.items.find((item) => item.component.id === id)!.x
    );
    const rightLoads = ["L3", "L4", "D3", "D4"].map(
      (id) => layout.items.find((item) => item.component.id === id)!.x
    );
    expect(Math.max(...leftLoads)).toBeLessThan(Math.min(...rightLoads));
    expect(
      layout.routes.some(
        (route) =>
          route.netId === "GND" &&
          route.points.length === 2 &&
          route.points[0]!.y === route.points[1]!.y
      )
    ).toBe(true);
    const outputRail = (netId: string) =>
      layout.routes.find(
        (route) =>
          route.netId === netId &&
          route.points.length === 2 &&
          route.points[0]!.y === route.points[1]!.y
      )!;
    const leftRail = outputRail("izq");
    const rightRail = outputRail("der");
    expect(
      Math.max(...leftRail.points.map((point) => point.x))
    ).toBeLessThan(
      Math.min(...rightRail.points.map((point) => point.x))
    );

    const rendered = renderResult(AUTOMOTIVE);
    expect(rendered.ok).toBe(true);
    if (rendered.ok) {
      expect(rendered.status).toBe("valid");
      expect(rendered.svg).not.toContain("?flasher");
      expect(rendered.svg).toContain(">OFF<");
      expect(rendered.svg).toContain(">P<");
    }
  });

  it("chooses TB for a long auto chain and preserves compact LR", () => {
    const long = parseStateDiagram(
      `stateDiagram-v2\ndirection auto\n${LONG_STATE_BODY}`
    );
    expect(long.direction).toBe("TB");
    const longLayout = layoutStateDiagram(long);
    expect(longLayout.height).toBeGreaterThan(longLayout.width);
    for (const edge of longLayout.edges) {
      if (!edge.label) continue;
      const labelWidth = Math.ceil(estimateMaxLineWidth(edge.label, 11)) + 8;
      const left =
        edge.labelX -
        (edge.labelAnchor === "start"
          ? 0
          : edge.labelAnchor === "end"
            ? labelWidth
            : labelWidth / 2);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + labelWidth).toBeLessThanOrEqual(longLayout.width);
    }

    const short = parseStateDiagram(`stateDiagram-v2
direction auto
[*] --> Idle
Idle --> Done
Done --> [*]`);
    expect(short.direction).toBe("LR");
  });

  it("renders multiline states and marks manual layout provenance", () => {
    const source = `stateDiagram-v2
direction TB
state "M₀ · (1,0,0)
Package received from seller" as M0
state "M₁ · (0,1,0)\\nAt sorting center" as M1
M0 --> M1 : T1 — Pickup package
@overrides
pin M0 180,125`;
    const result = renderResult(source, { scene: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.svg).toContain("<tspan");
      expect(result.svg).toContain('data-manual-layout="true"');
    }
  });

  it("warns instead of silently blessing an extreme explicit LR strip", () => {
    const result = renderResult(
      `stateDiagram-v2\ndirection LR\n${LONG_STATE_BODY}`
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe("partial");
    if (result.ok) {
      expect(result.diagnostics[0]?.code).toBe(
        "STATE_EXTREME_ASPECT_RATIO"
      );
    }
  });

  it("does not apply the simple-chain aspect warning to composite charts", () => {
    const result = renderResult(`stateDiagram-v2 [direction: LR]
[*] --> Cart
Cart --> Checkout
Checkout --> Payment
Payment --> Confirmed
Confirmed --> [*]
state Payment {
  [*] --> Authorizing
  Authorizing --> Captured
}`);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("valid");
  });
});
