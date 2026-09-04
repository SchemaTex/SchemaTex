import { access, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { render } from "../dist/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "preview/professional-visual-contract");
const refreshBaseline = process.argv.includes("--refresh-baseline");
const baselineDistArg = process.argv.find((arg) => arg.startsWith("--baseline-dist="));
const baselineDist = baselineDistArg?.slice("--baseline-dist=".length);
const caseArg = process.argv.find((arg) => arg.startsWith("--case="));
const requestedCase = caseArg?.slice("--case=".length);
const baselineRender = baselineDist
  ? (await import(pathToFileURL(resolve(baselineDist, "index.js")).href)).render
  : render;

const cases = [
  ["pid-hydraulic-test-stand", 1800],
  ["circuit-555-astable", 1400],
  ["sld-commercial-solar", 1400],
  ["circuit-load-bank-pilot", 1600],
  ["sld-side-feeder-threshold", 1400],
];

const selectedCases = requestedCase
  ? cases.filter(([name]) => name === requestedCase)
  : cases;

if (requestedCase && selectedCases.length === 0) {
  throw new Error(`Unknown visual-contract case: ${requestedCase}`);
}

for (const [name, width] of selectedCases) {
  const source = await readFile(resolve(target, `${name}.sx`), "utf8");
  const svg = render(source);
  const png = new Resvg(svg, {
    background: "white",
    fitTo: { mode: "width", value: width },
  }).render().asPng();

  const beforeSvg = resolve(target, `before-${name}.svg`);
  const beforePng = resolve(target, `before-${name}.png`);
  const baselineExists = await access(beforeSvg).then(() => true).catch(() => false);
  if (refreshBaseline || baselineDist || !baselineExists) {
    const baselineSvg = baselineRender(source);
    const baselinePng = new Resvg(baselineSvg, {
      background: "white",
      fitTo: { mode: "width", value: width },
    }).render().asPng();
    await writeFile(beforeSvg, baselineSvg);
    await writeFile(beforePng, baselinePng);
  }

  await writeFile(resolve(target, `candidate-${name}.svg`), svg);
  await writeFile(resolve(target, `candidate-${name}.png`), png);
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

console.log(
  `Generated ${selectedCases.length} implementation candidates${refreshBaseline || baselineDist ? " and refreshed baselines" : ""} in ${target}`
);
