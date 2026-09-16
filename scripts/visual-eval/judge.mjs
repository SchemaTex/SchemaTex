/** Vision judge. Shows Codex a rendered diagram (and optionally the reference
 * drawing) and gets back a pass/fail verdict per rubric item.
 *
 * Codex is run read-only in a scratch directory so it can only look at the
 * images it was handed — it cannot read this repository and infer the answer
 * from the source code.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codexRun, extractJson } from "./codex-run.mjs";


const PROMPT = (rubric, hasIdeal) =>
  [
    "You are grading a technical drawing for visual correctness.",
    hasIdeal
      ? "The FIRST image is a REFERENCE drawing showing what a correct result looks like. The SECOND image is the drawing under test. Grade only the second image; use the first only to understand the intent."
      : "The attached image is the drawing under test.",
    "",
    "Judge each rule below by looking at the image. A rule PASSES only if you can see that it holds. If the image is too small or ambiguous to tell, answer \"unclear\" — never guess.",
    "",
    ...rubric.map((r, i) => `${i + 1}. [${r.id}] ${r.must}`),
    "",
    'Reply with raw JSON only. No prose, no markdown fences. Shape: {"items":[{"id":"<rule id>","verdict":"pass"|"fail"|"unclear","evidence":"<one sentence naming what you actually saw, and where>"}],"overall":"<one sentence>"}',
    "Include exactly one entry per rule, in the order given.",
  ].join("\n");


/**
 * @param {{imagePath: string, idealPath?: string, rubric: {id:string,must:string}[],
 *          model?: string, effort?: string, timeoutMs?: number}} opts
 */
/** One pass of the judge over one image. */
async function askOnce(opts, scratch) {
  const { imagePath, idealPath, rubric, model, effort, timeoutMs } = opts;
  const { reply, seconds } = await codexRun(PROMPT(rubric, Boolean(idealPath)), {
    dir: scratch,
    images: [...(idealPath ? [idealPath] : []), imagePath],
    model, effort, timeoutMs,
  });
  const parsed = extractJson(reply);
  const byId = new Map(parsed.items?.map((i) => [i.id, i]) ?? []);
  return {
    seconds,
    overall: String(parsed.overall ?? ""),
    items: rubric.map((rule) => {
      const got = byId.get(rule.id);
      const verdict = ["pass", "fail", "unclear"].includes(got?.verdict) ? got.verdict : "unclear";
      return {
        id: rule.id,
        verdict,
        evidence: String(got?.evidence ?? "The judge did not answer this rule."),
      };
    }),
  };
}

/**
 * Grade one drawing, several times, and keep the majority answer per rule.
 *
 * One pass is not stable enough to compare versions with. Asked twice about a
 * byte-identical drawing it once answered 69% and once 8%, flipping two rules
 * of five — a swing far larger than most real improvements. Three passes and a
 * per-rule majority collapse that; `agreement` records how often the panel was
 * unanimous, so a verdict resting on 2-of-3 can be read with suspicion.
 */
export async function judge(opts) {
  const { rubric, effort = "low", timeoutMs = 900_000, passes = 3 } = opts;
  const scratch = await mkdtemp(join(tmpdir(), "visual-eval-judge-"));
  try {
    // The three passes are independent questions about the same picture, so run
    // them together: the panel then costs one round trip instead of three.
    // Each pass gets its own scratch directory — codex writes its reply to a
    // fixed filename inside it, and sharing one would have the passes overwrite
    // each other's answers.
    const runs = await Promise.all(
      Array.from({ length: passes }, async (_, i) => {
        const dir = await mkdtemp(join(tmpdir(), `visual-eval-pass${i}-`));
        try {
          // A reply that is not valid JSON is worth asking again for — the
          // model usually gets it right the second time, and one malformed
          // answer must not cost the whole run.
          for (let attempt = 1; ; attempt++) {
            try {
              return await askOnce({ ...opts, effort, timeoutMs }, dir);
            } catch (error) {
              if (attempt >= 3) return null;
              console.warn(`  judge pass rejected (${String(error.message).slice(0, 60)}) — asking again`);
            }
          }
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      }),
    );
    const usable = runs.filter(Boolean);
    // Every pass failed. Say so rather than inventing a score: an absent
    // verdict reads as "not graded", a fabricated one would read as a result.
    if (!usable.length) return null;
    const items = rubric.map((rule) => {
      const answers = usable
        .map((r) => r.items.find((i) => i.id === rule.id))
        .filter(Boolean);
      if (!answers.length) return { id: rule.id, verdict: "unclear", votes: 0, of: usable.length, evidence: "the judge did not answer for this rule" };
      const tally = new Map();
      for (const a of answers) tally.set(a.verdict, (tally.get(a.verdict) ?? 0) + 1);
      const [verdict, votes] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
      // Quote a pass that actually reached the winning verdict.
      const winner = answers.find((a) => a.verdict === verdict);
      return { id: rule.id, verdict, votes, of: runs.length, evidence: winner.evidence };
    });
    return {
      seconds: usable.reduce((n, r) => n + r.seconds, 0),
      passes: usable.length,
      agreement: items.filter((i) => i.votes === usable.length).length / (items.length || 1),
      overall: usable[0].overall,
      items,
    };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
