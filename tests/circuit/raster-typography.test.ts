import { expect, test } from "vitest";
import { Resvg } from "@resvg/resvg-js";
import { parseCircuit } from "../../src/diagrams/circuit/parser";
import { renderCircuit } from "../../src/diagrams/circuit/renderer";

test("raster output preserves title, caption and pin type hierarchy", () => {
  const svg = renderCircuit(parseCircuit('circuit "Example" netlist\nV1 supply GND 12V\nR1 supply GND 1k'));
  const style = svg.match(/<style>([\s\S]*?)<\/style>/)![1];
  const height = (name: string) => new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" class="schematex-circuit" width="200" height="60"><style>${style}</style><text x="0" y="30" class="schematex-circuit-${name}">HEIGHT</text></svg>`).innerBBox()!.height;
  expect(height("title")).toBeGreaterThan(height("label"));
  expect(height("label")).toBeGreaterThan(height("pol"));
});
