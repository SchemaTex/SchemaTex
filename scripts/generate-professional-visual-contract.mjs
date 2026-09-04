import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { render } from "../dist/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "preview/professional-visual-contract");

const cases = [
  ["pid-hydraulic-test-stand", 1800],
  ["circuit-555-astable", 1400],
  ["sld-commercial-solar", 1400],
];

for (const [name, width] of cases) {
  const source = await readFile(resolve(target, `${name}.sx`), "utf8");
  const svg = render(source);
  await writeFile(resolve(target, `before-${name}.svg`), svg);

  const png = new Resvg(svg, {
    background: "white",
    fitTo: { mode: "width", value: width },
  }).render().asPng();
  await writeFile(resolve(target, `before-${name}.png`), png);
}

const targetCircuit = await readFile(
  resolve(target, "after-circuit-555-astable.svg"),
  "utf8"
);
const targetCircuitPng = new Resvg(targetCircuit, {
  background: "white",
  fitTo: { mode: "width", value: 1400 },
}).render().asPng();
await writeFile(
  resolve(target, "after-circuit-555-astable.png"),
  targetCircuitPng
);

console.log(`Generated ${cases.length} current-renderer baselines and the corrected circuit target in ${target}`);
