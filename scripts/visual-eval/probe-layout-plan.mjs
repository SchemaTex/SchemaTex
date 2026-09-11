/** Probe: can a model supply the layout intent a netlist throws away?
 *
 * A SPICE netlist says what is connected and never where anything sits, so the
 * engine has to guess the drafting intent from topology alone — which is where
 * our remaining failures live. The open question is whether that intent is
 * better *asked for* than inferred. This asks for it, twice per case, from the
 * netlist alone: two independent answers that agree are intent the model
 * actually holds, not a coin flip we would be building a DSL feature on top of.
 *
 *   node scripts/visual-eval/probe-layout-plan.mjs circuit-bridge-psu circuit-opamp-inverting
 */
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codexRun, extractJson } from "./codex-run.mjs";

const ids = process.argv.slice(2);
if (!ids.length) throw new Error("Name at least one case id.");

const PROMPT = (netlist) => [
  "You are a schematic drafter. Below is a circuit as a SPICE-style netlist.",
  "A netlist records connectivity and nothing about placement, so decide the placement yourself, the way you would lay this circuit out on paper for a technician to read.",
  "",
  "```",
  netlist.trim(),
  "```",
  "",
  "Reply with raw JSON only, no prose and no markdown fences:",
  '{"groups":[{"name":"<what this block is, e.g. bridge rectifier>","members":["<component id>"],"shape":"diamond"|"row"|"column"|"bridge"|"free"}],',
  ' "stages":[["<component or group name>"]],',
  ' "topRails":["<net>"],"bottomRails":["<net>"],',
  ' "notes":"<one sentence on anything a drafter must not get wrong here>"}',
  "",
  '"stages" is the left-to-right reading order: the first array is the leftmost column, the last is the rightmost. Every component must appear exactly once, either directly or inside a group you named.',
  '"topRails" are the nets drawn as a rail across the top, "bottomRails" the ones along the bottom.',
].join("\n");

const outDir = new URL("../../preview/visual-eval/layout-probe/", import.meta.url);
await mkdir(outDir, { recursive: true });

for (const id of ids) {
  const netlist = await readFile(new URL(`../../visual-eval/cases/${id}/source.sx`, import.meta.url), "utf8");
  const scratch = await mkdtemp(join(tmpdir(), "layout-probe-"));
  try {
    const asks = [0, 1].map(() =>
      codexRun(PROMPT(netlist), { dir: scratch, model: process.env.PROBE_MODEL, effort: "medium" })
        .then(({ reply }) => extractJson(reply)),
    );
    const answers = await Promise.all(asks);
    await writeFile(new URL(`${id}.json`, outDir), JSON.stringify({ id, answers }, null, 2) + "\n");
    console.log(`${id}: two plans written`);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
