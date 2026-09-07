/** Logic candidate only. Never overwrites the immutable 1.0.14 baseline. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { renderResult } from "../src/index";
import { Resvg } from "@resvg/resvg-js";
const root = new URL("../preview/engineering-review/", import.meta.url);
const source = await readFile(new URL("logic.sx", root), "utf8");
const result = renderResult(source, { type: "logic" });
const version = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version;
const commit = execFileSync("git", ["log", "-1", "--format=%h", "--", "src/diagrams/logic"], { encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain", "--", "src/diagrams/logic"], { encoding: "utf8" }).trim();
await writeFile(new URL("after/logic.svg", root), result.svg);
await writeFile(new URL("after/logic.png", root), new Resvg(result.svg, { background: "white", fitTo: { mode: "width", value: 1400 } }).render().asPng());
await writeFile(new URL("after/results.json", root), JSON.stringify([{
  id: "logic", type: "logic", version, commit: commit + (dirty ? " + uncommitted Logic changes" : ""),
  sourceHash: createHash("sha256").update(source).digest("hex"), status: result.status,
  diagnostics: result.diagnostics, changed: result.svg !== await readFile(new URL("logic.svg", root), "utf8")
}], null, 2) + "\n");
console.log("Generated actual Logic candidate SVG:", result.status);
