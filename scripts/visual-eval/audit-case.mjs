/** Ask Codex to review a case as a practitioner of that field would, not as a
 * draughtsman.
 *
 *   node scripts/visual-eval/audit-case.mjs --case floorplan-apartment
 *   node scripts/visual-eval/audit-case.mjs --all
 *
 * The rubric and the vision judge only ask whether a drawing is *drawn* well.
 * They cannot tell you that a flat is unusable because its only way into the
 * main bedroom is through the bathroom. That is a question about the subject,
 * and it has to be asked of someone who knows the subject — so this hands the
 * source and the target drawing to Codex under the persona of the professional
 * who signs off that kind of drawing, and asks what is wrong with the design.
 *
 * Findings land in the case's goal.json under `audit`. They are advice, not
 * verdicts: fixing one means changing the DSL source, which is a decision, not
 * an edit to apply blindly.
 */
import { mkdtemp, readFile, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codexRun, extractJson } from "./codex-run.mjs";

const root = new URL("../../", import.meta.url);
const argv = process.argv.slice(2);
const value = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };

/** Who Codex should be for each kind of drawing, and what they care about. */
const EXPERTS = {
  floorplan: {
    who: "a licensed architect reviewing a residential or commercial plan before it goes out",
    cares: "circulation (every habitable room reachable without passing through another habitable room or a bathroom), door swings that do not collide or block, egress and travel distance, room proportions and minimum clear widths, plumbing stacked sensibly, furniture that actually fits with clearance to use it",
  },
  circuit: {
    who: "a practising electronics engineer checking a schematic before layout",
    cares: "whether the circuit would work as drawn, component values that make sense together, missing decoupling or protection, supply and return integrity, part ratings against the supply",
  },
  sld: {
    who: "a power systems engineer reviewing a single-line diagram for permit",
    cares: "protection coordination and device ratings, isolation and lockout points, conductor sizing against load, code-required disconnects and metering position",
  },
  pid: {
    who: "a process engineer reviewing a P&ID before HAZOP",
    cares: "whether the process can actually run and be isolated, missing isolation or relief, instrument loops that close, drains and vents, pump protection",
  },
  logic: {
    who: "a digital design engineer checking a gate-level schematic",
    cares: "whether the logic computes what the title claims, redundant or missing terms, unconnected inputs, fan-out",
  },
  genogram: {
    who: "a family therapist trained on McGoldrick's conventions",
    cares: "whether the family structure is coherent and clinically legible, generations aligned, relationships that a clinician would actually record",
  },
  pedigree: {
    who: "a clinical geneticist reading a pedigree",
    cares: "inheritance pattern consistency, proband marking, generation numbering, consanguinity, whether the pattern shown supports the stated condition",
  },
};

const FALLBACK = {
  who: "an experienced practitioner who reads this kind of drawing daily",
  cares: "whether the subject shown would actually work, and whether anything a professional would object to has been drawn as if it were normal",
};

async function auditOne(id) {
  const caseDir = new URL(`visual-eval/cases/${id}/`, root);
  const goal = JSON.parse(await readFile(new URL("goal.json", caseDir), "utf8"));
  const source = await readFile(new URL("source.sx", caseDir), "utf8");
  const expert = EXPERTS[goal.type] ?? FALLBACK;

  const images = [];
  const idealPng = new URL(`preview/visual-eval/${id}/ideal.png`, root).pathname;
  const nextPng = new URL(`preview/visual-eval/${id}/next.png`, root).pathname;
  for (const path of [idealPng, nextPng])
    if (await access(path).then(() => true, () => false)) images.push(path);
  if (!images.length) throw new Error(`No renders for ${id}. Run "npm run eval" first.`);

  const prompt = [
    `You are ${expert.who}. You are not reviewing the drawing quality — assume the draughting is fine.`,
    `You are reviewing the SUBJECT: is what this drawing depicts any good?`,
    "",
    `You care about: ${expert.cares}.`,
    "",
    `Title: ${goal.title}`,
    `Intent: ${goal.goal}`,
    "",
    "The attached image(s) show the drawing. This is the text description it was built from:",
    source,
    "",
    "Answer in English.",
    "Name only things a professional would actually object to, worst first. Say what is wrong, why it matters in practice, and the smallest change that fixes it. If the design is sound, say so and return an empty list — do not invent problems.",
    "",
    'Reply with raw JSON only, no prose or fences: {"verdict":"sound"|"flawed","findings":[{"severity":"blocker"|"major"|"minor","what":"<the problem>","why":"<why a professional objects>","fix":"<smallest change>"}]}',
  ].join("\n");

  const dir = await mkdtemp(join(tmpdir(), "visual-eval-audit-"));
  try {
    const run = () => codexRun(prompt, {
      dir, images, effort: value("effort") ?? "medium", model: value("model"),
    });
    // An empty or unparseable reply happens occasionally; one retry is enough.
    let reply, seconds;
    try {
      ({ reply, seconds } = await run());
      extractJson(reply);
    } catch {
      ({ reply, seconds } = await run());
    }
    const parsed = extractJson(reply);
    goal.audit = {
      reviewedBy: expert.who,
      at: new Date().toISOString(),
      verdict: parsed.verdict === "sound" ? "sound" : "flawed",
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    };
    await writeFile(new URL("goal.json", caseDir), JSON.stringify(goal, null, 2) + "\n");
    console.log(`\n${id} — ${goal.audit.verdict} (${seconds}s, ${goal.audit.findings.length} findings)`);
    for (const f of goal.audit.findings) console.log(`  [${f.severity}] ${f.what}\n      fix: ${f.fix}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const ids = value("case")
  ? [value("case")]
  : JSON.parse(await readFile(new URL("preview/visual-eval/report.json", root), "utf8"))
      .cases.map((c) => c.id);
for (const id of ids) await auditOne(id).catch((e) => console.error(`${id}: ${e.message}`));
