/** Fold `report.shard-*.json` into the single `report.json` the page reads.
 *
 * Sharded runs each own a disjoint slice of the corpus, so merging is just a
 * union keyed on case id, newest wins. Anything the shards did not touch is
 * carried over from the existing report, the same as a filtered run does.
 */
import { readFile, writeFile, rename, readdir } from "node:fs/promises";
// Deliberately not importing from lib.mts: this runs under plain node, which
// cannot load a .mts file, and the only thing needed from it is one path.
const outDir = new URL("../../preview/visual-eval/", import.meta.url);

const read = (name) =>
  readFile(new URL(name, outDir), "utf8").then((t) => JSON.parse(t)).catch(() => null);

const previous = (await read("report.json"))?.cases ?? [];
const byId = new Map(previous.map((c) => [c.id, c]));

const shards = (await readdir(outDir)).filter((f) => /^report\.shard-\d+\.json$/.test(f)).sort();
if (!shards.length) {
  console.log("No report.shard-*.json to merge — nothing to do.");
  process.exit(0);
}

let newest = null;
for (const file of shards) {
  const data = await read(file);
  if (!data) { console.warn(`skipped unreadable ${file}`); continue; }
  for (const c of data.cases) byId.set(c.id, c);
  if (!newest || data.generatedAt > newest.generatedAt) newest = data;
  console.log(`${file}: ${data.cases.length} case(s)`);
}

const cases = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
const temp = new URL("report.json.tmp", outDir);
await writeFile(
  temp,
  JSON.stringify({ generatedAt: newest.generatedAt, judged: newest.judged, engine: newest.engine, cases }, null, 2) + "\n",
);
await rename(temp, new URL("report.json", outDir));
console.log(`\nMerged ${shards.length} shard(s) into report.json — ${cases.length} cases.`);
