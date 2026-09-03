import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { renderResult } from "../dist/index.js";

const root = resolve(process.cwd(), "preview/floorplan-visual-benchmark");
const cases = ["apartment", "townhouse", "restaurant"];
const summary = {};

for (const name of cases) {
  const sourcePath = resolve(root, `${name}.sx`);
  const source = readFileSync(sourcePath, "utf8").trim();
  const result = renderResult(source, { type: "floorplan" });

  if (!result.svg) {
    throw new Error(`${basename(sourcePath)} did not render`);
  }

  writeFileSync(resolve(root, `current-${name}.svg`), result.svg);
  summary[name] = {
    status: result.status,
    diagnostics: result.diagnostics ?? [],
  };
}

writeFileSync(
  resolve(root, "diagnostics.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);

console.log(JSON.stringify(summary, null, 2));
