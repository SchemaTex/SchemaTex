import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderBpmn, renderBpmnLayout } from "../../src/diagrams/bpmn/renderer";
import { parseBpmn } from "../../src/diagrams/bpmn/parser";
import { layoutBpmn } from "../../src/diagrams/bpmn/layout";
import { resolveBpmnTheme } from "../../src/core/theme";

const fixture = (name: string): string =>
  readFileSync(resolve(__dirname, "../fixtures/bpmn", name), "utf-8");

describe("bpmn renderer", () => {
  it("renders SVG for loan-approval", () => {
    const svg = renderBpmn(fixture("loan-approval.bpmn"));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
    // Pool label
    expect(svg).toContain("Bank");
    // Sequence flow marker is referenced
    expect(svg).toContain("bpmn-arrow-seq");
    // X glyph for xor gateway present
    expect(svg).toContain("schematex-bpmn-gateway kind-xor");
  });

  it("renders message flow markers in pizza-order", () => {
    const svg = renderBpmn(fixture("pizza-order.bpmn"));
    expect(svg).toContain("bpmn-arrow-msg");
    expect(svg).toContain("bpmn-msg-start");
    expect(svg).toContain("kind-message");
    expect(svg).toContain("blackbox");
  });

  it("renders end events with thick stroke", () => {
    const svg = renderBpmn(fixture("loan-approval.bpmn"));
    expect(svg).toContain("kind-end");
  });

  it("renders parallel-and gateway with + glyph", () => {
    const svg = renderBpmn(fixture("simple-service.bpmn"));
    expect(svg).toContain("kind-and");
  });
});

const symbolProcess = (direction = "LR", gateway = "event"): string => `bpmn
direction: ${direction}
pool "External" blackbox
pool "Operations" {
  begin: start
  work: task service "Validate"
  decision: gateway ${gateway} "Proceed?"
  wait: intermediate message
  finish: end
}
flows
begin --> work
work --? "ready" --> decision
decision --? "received" --> wait
decision --* "otherwise" --> finish
wait --> finish
work ~~> "External"
"External" ~~> wait
`;

function groupContents(svg: string, className: string): string {
  const start = svg.indexOf(`<g class="${className}"`);
  expect(start, `missing ${className}`).toBeGreaterThanOrEqual(0);
  return svg.slice(start, svg.indexOf("</g>", start));
}

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error("Expected an SVG element or coordinate");
  return value;
}

function attribute(element: string, name: string): string {
  const value = element.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  expect(value, `missing ${name}`).toBeDefined();
  return required(value);
}

describe("BPMN accepted symbol forms", () => {
  it("draws two toothed service gears with hollow hubs inside the task", () => {
    const layout = layoutBpmn(parseBpmn(symbolProcess()));
    const task = required(layout.objects.find((object) => object.obj.id === "work"));
    const svg = renderBpmnLayout(layout);
    const marker = groupContents(svg, "marker-service");
    const gears = marker.match(/<polygon\b[^>]*>/g) ?? [];
    const hubs = marker.match(/<circle\b[^>]*>/g) ?? [];
    expect(gears).toHaveLength(2);
    expect(hubs).toHaveLength(2);
    for (let i = 0; i < gears.length; i++) {
      expect(attribute(required(gears[i]), "class")).toBe("bpmn-service-gear");
      expect(attribute(required(hubs[i]), "class")).toBe("bpmn-service-hub");
      const cx = Number(attribute(required(hubs[i]), "cx"));
      const cy = Number(attribute(required(hubs[i]), "cy"));
      const points = attribute(required(gears[i]), "points").split(" ").map((p) => p.split(",").map(Number));
      const radii = points.map(([x, y]) => Math.hypot(required(x) - cx, required(y) - cy));
      const threshold = (Math.min(...radii) + Math.max(...radii)) / 2;
      // Eight distinct teeth, each returning to the root radius.
      const toothCount = radii.filter((r, k) => r > threshold && required(radii[(k + radii.length - 1) % radii.length]) < threshold).length;
      expect(toothCount).toBe(8);
      for (const [x, y] of points) {
        expect(required(x)).toBeGreaterThan(task.x);
        expect(required(x)).toBeLessThan(task.x + task.width);
        expect(required(y)).toBeGreaterThan(task.y);
        expect(required(y)).toBeLessThan(task.y + task.height / 2 - 6);
      }
    }
    expect(Number(attribute(required(hubs[1]), "cx"))).toBeGreaterThan(Number(attribute(required(hubs[0]), "cx")));
    expect(Number(attribute(required(hubs[1]), "cy"))).toBeGreaterThan(Number(attribute(required(hubs[0]), "cy")));
    expect(marker).not.toContain("transform=");
  });

  it("encloses an upright pentagon in two separate concentric gateway rings", () => {
    const marker = groupContents(renderBpmn(symbolProcess()), "schematex-bpmn-gateway kind-event");
    const rings = marker.match(/<circle\b[^>]*>/g) ?? [];
    expect(rings).toHaveLength(2);
    expect(attribute(required(rings[0]), "cx")).toBe(attribute(required(rings[1]), "cx"));
    expect(attribute(required(rings[0]), "cy")).toBe(attribute(required(rings[1]), "cy"));
    const outer = Number(attribute(required(rings[0]), "r"));
    const inner = Number(attribute(required(rings[1]), "r"));
    expect(outer - inner).toBeGreaterThan(2);
    const pentagon = required(required(marker.match(/<polygon\b[^>]*>/g))[1]);
    const points = attribute(pentagon, "points").split(" ").map((p) => p.split(",").map(Number));
    expect(points).toHaveLength(5);
    const cx = Number(attribute(required(rings[0]), "cx"));
    const cy = Number(attribute(required(rings[0]), "cy"));
    expect(required(points[0])[0]).toBeCloseTo(cx);
    expect(required(points[0])[1]).toBeLessThan(cy);
    for (const [x, y] of points) expect(Math.hypot(required(x) - cx, required(y) - cy)).toBeLessThan(inner - 1);
  });

  it.each(["xor", "or", "and", "event"])("omits the conditional diamond leaving a %s gateway, retaining its label and arrow", (gateway) => {
    const svg = renderBpmn(symbolProcess("LR", gateway));
    expect(svg.match(/class="bpmn-flow-conditional"/g)).toHaveLength(1);
    expect(svg).toContain("received");
    expect(svg.match(/class="schematex-bpmn-flow kind-conditional"/g)).toHaveLength(2);
    expect(svg).toContain('marker-end="url(#bpmn-arrow-seq)"');
  });

  it.each(["LR", "TB"])("paints source adornments above every node without moving %s layout or flow paths", (direction) => {
    const layout = layoutBpmn(parseBpmn(symbolProcess(direction)));
    const before = structuredClone(layout);
    const svg = renderBpmnLayout(layout);
    expect(layout).toEqual(before);
    const layer = svg.indexOf('<g class="schematex-bpmn-source-markers"');
    expect(layer).toBeGreaterThan(svg.lastIndexOf('<g class="schematex-bpmn-event'));
    expect(layer).toBeGreaterThan(svg.lastIndexOf('<g class="schematex-bpmn-task'));
    expect(layer).toBeGreaterThan(svg.lastIndexOf('<g class="schematex-bpmn-gateway'));
    for (const flow of layout.flows) expect(svg).toContain(`d="${flow.path}"`);
    const adornments = groupContents(svg, "schematex-bpmn-source-markers");
    expect(adornments).toContain('class="bpmn-flow-default"');
    expect(adornments).toContain('class="bpmn-flow-conditional"');
    const conditional = required(layout.flows.find((flow) => flow.flow.kind === "conditional"));
    const start = required(conditional.path.match(/^M ([\d.-]+) ([\d.-]+)/));
    const diamond = required(adornments.match(/<polygon\b[^>]*class="bpmn-flow-conditional"[^>]*>/))[0];
    const points = attribute(diamond, "points").split(" ").map((p) => p.split(",").map(Number));
    // One tip joins the activity edge; the whole diamond is outside the box.
    expect(points[0]).toEqual([Number(start[1]), Number(start[2])]);
    const along = direction === "LR" ? 0 : 1;
    const across = 1 - along;
    expect(required(required(points[2])[along]) - required(required(points[0])[along])).toBe(10);
    expect(Math.abs(required(required(points[1])[across]) - required(required(points[3])[across]))).toBe(7);
    expect(adornments.match(/class="bpmn-msg-start"/g)).toHaveLength(2);
    expect(svg).not.toContain('marker-start="url(#bpmn-msg-start)"');
    expect(svg).not.toMatch(/transform="[^"]*scale\(/);
    const circles = required(adornments.match(/<circle\b[^>]*>/g));
    layout.flows.filter((flow) => flow.flow.kind === "message").forEach((flow, i) => {
      const start = required(flow.path.match(/^M ([\d.-]+) ([\d.-]+)/));
      expect(Number(attribute(required(circles[i]), "cx"))).toBe(Number(start[1]));
      expect(Number(attribute(required(circles[i]), "cy"))).toBe(Number(start[2]));
      // Preserve the former SVG marker's rendered radius: 3 × 6 / 10 × 1.4.
      expect(Number(attribute(required(circles[i]), "r"))).toBeCloseTo(2.52);
    });
  });

  it.each(["default", "monochrome", "dark"])("themes the new marks with CSS classes under %s", (theme) => {
    const svg = renderBpmn(symbolProcess(), { theme });
    const tokens = resolveBpmnTheme(theme);
    expect(svg).not.toContain("style=");
    expect(svg).toContain(`.schematex-bpmn .bpmn-service-gear`);
    expect(svg).toContain(`fill: ${tokens.taskFill}`);
    expect(svg).toContain(`stroke: ${tokens.gatewayGlyph}`);
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
  });

  it.each([
    { end: "200 100", tip: "110,100", slash: "M 104,104 L 112,96" },
    { end: "0 100", tip: "90,100", slash: "M 96,96 L 88,104" },
    { end: "100 200", tip: "100,110", slash: "M 96,104 L 104,112" },
    { end: "100 0", tip: "100,90", slash: "M 104,96 L 96,88" },
  ])("orients the source diamond and slash toward $end, skipping duplicate vertices", ({ end, tip, slash }) => {
    const layout = layoutBpmn(parseBpmn(symbolProcess()));
    const conditional = required(layout.flows.find((flow) => flow.flow.kind === "conditional"));
    const defaultFlow = required(layout.flows.find((flow) => flow.flow.kind === "default"));
    conditional.path = defaultFlow.path = `M 100 100 L 100 100 L ${end}`;
    const markers = groupContents(renderBpmnLayout(layout), "schematex-bpmn-source-markers");
    const diamond = required(markers.match(/<polygon\b[^>]*>/))[0];
    const points = attribute(required(diamond), "points").split(" ");
    expect(points[0]).toBe("100,100");
    expect(points[2]).toBe(tip);
    expect(markers).toContain(`d="${slash}"`);
  });
});
