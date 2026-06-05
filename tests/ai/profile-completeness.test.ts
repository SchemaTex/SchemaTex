/**
 * Profile completeness gate — audits every diagram family's LLM-facing
 * "grammar card" (src/ai/profiles.ts) + few-shot examples for the qualities
 * that make first-shot generation reliable.
 *
 * A "qualified card" (welding is the reference template) has:
 *   - concrete `forms` (runnable-looking, not bare placeholders)
 *   - ≥2 `prefer` hints
 *   - specific `avoid` items (naming a concrete token/operator)
 *   - a `repair[0]` that maps a real validator error message → a fix
 *     (this string is fed straight to the LLM via repairHint() on retry)
 *   - ≥1 example, with ≥1 `featured`, all validating green
 *
 * Running this prints a ranked scorecard (worst-first) so we know which
 * families to harden, and hard-fails only on genuine correctness bugs
 * (missing profile, or a shipped example that does not validate).
 */
import { describe, it, expect } from "vitest";
import { DIAGRAM_REGISTRY, getExamples, validateDsl } from "../../src/ai";
import { getGenerationProfile } from "../../src/ai/profiles";

interface Criterion {
  key: string;
  weight: number;
  pass: boolean;
}

interface Audit {
  type: string;
  score: number;
  criteria: Criterion[];
  issues: string[];
  invalidExamples: string[];
  partialExamples: string[];
}

const QUOTED = /['"`][^'"`]{4,}['"`]/; // a quoted phrase of reasonable length
const HAS_VALUE = /\d|["']/; // a concrete value: a digit or a quoted string
const NAMES_TOKEN = /`/; // backtick = names a concrete token/operator

function auditType(type: string): Audit {
  const profile = getGenerationProfile(type);
  const examples = getExamples(type, { limit: 100 }).examples;
  const featured = examples.filter((e) => e.featured);

  const invalidExamples: string[] = [];
  const partialExamples: string[] = [];
  for (const ex of examples) {
    const res = validateDsl(type, ex.dsl);
    if (!res.ok) invalidExamples.push(ex.slug);
    else if (res.status === "partial") partialExamples.push(ex.slug);
  }

  const c = (key: string, weight: number, pass: boolean): Criterion => ({
    key,
    weight,
    pass,
  });

  const criteria: Criterion[] = [
    c("forms≥1", 10, profile.forms.length >= 1),
    c("forms-concrete", 10, profile.forms.some((f) => HAS_VALUE.test(f))),
    c("prefer≥2", 15, profile.prefer.length >= 2),
    c("avoid≥1", 10, profile.avoid.length >= 1),
    c("avoid-specific", 10, profile.avoid.some((a) => NAMES_TOKEN.test(a))),
    c("repair≥1", 10, profile.repair.length >= 1),
    c(
      "repair-maps-error",
      15,
      profile.repair.length >= 1 && QUOTED.test(profile.repair[0])
    ),
    c("example≥1", 10, examples.length >= 1),
    c("featured≥1", 5, featured.length >= 1),
    c("examples-green", 5, examples.length >= 1 && invalidExamples.length === 0),
  ];

  const score = criteria.reduce((s, x) => s + (x.pass ? x.weight : 0), 0);
  const issues = criteria.filter((x) => !x.pass).map((x) => x.key);

  return { type, score, criteria, issues, invalidExamples, partialExamples };
}

const audits = DIAGRAM_REGISTRY.map((d) => auditType(d.type)).sort(
  (a, b) => a.score - b.score
);

function printScorecard(): void {
  const lines: string[] = [];
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════════");
  lines.push("  PROFILE COMPLETENESS SCORECARD  (worst-first; welding = template)");
  lines.push("═══════════════════════════════════════════════════════════════════");
  lines.push("  score  type                  examples  gaps");
  lines.push("  ─────  ────────────────────  ────────  ──────────────────────────");
  for (const a of audits) {
    const exCount = getExamples(a.type, { limit: 100 }).examples.length;
    const exTag =
      a.invalidExamples.length > 0
        ? `${exCount}⛔`
        : a.partialExamples.length > 0
          ? `${exCount}⚠`
          : `${exCount}`;
    lines.push(
      `  ${String(a.score).padStart(4)}   ${a.type.padEnd(20)}  ${exTag.padEnd(8)}  ${a.issues.join(", ")}`
    );
  }
  lines.push("═══════════════════════════════════════════════════════════════════");
  const avg = Math.round(audits.reduce((s, a) => s + a.score, 0) / audits.length);
  const fullMarks = audits.filter((a) => a.score === 100).length;
  lines.push(
    `  avg ${avg}/100 · ${fullMarks}/${audits.length} at 100 · ` +
      `${audits.filter((a) => a.invalidExamples.length).length} with invalid examples · ` +
      `${audits.filter((a) => getExamples(a.type, { limit: 100 }).examples.length === 0).length} with zero examples · ` +
      `${audits.filter((a) => !a.criteria.find((c) => c.key === "featured≥1")!.pass).length} missing featured`
  );
  lines.push("═══════════════════════════════════════════════════════════════════");
  lines.push("");
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
}

describe("profile completeness gate", () => {
  it("prints the ranked scorecard", () => {
    printScorecard();
    expect(audits.length).toBe(DIAGRAM_REGISTRY.length);
  });

  it("every diagram type has a generation profile", () => {
    for (const d of DIAGRAM_REGISTRY) {
      const p = getGenerationProfile(d.type);
      expect(p, `missing profile: ${d.type}`).toBeTruthy();
      expect(p.type).toBe(d.type);
    }
  });

  it("every shipped example validates (no invalid DSL)", () => {
    const broken = audits.filter((a) => a.invalidExamples.length > 0);
    const detail = broken
      .map((a) => `${a.type}: ${a.invalidExamples.join(", ")}`)
      .join("\n  ");
    expect(broken.length, `examples that fail validateDsl:\n  ${detail}`).toBe(0);
  });
});

// ─── core-construct coverage ────────────────────────────────────────
// A card is "sufficient" only if the single-shot payload (forms + prefer +
// keywords + featured example DSL) actually exercises every core construct of
// the family — not just the trivial case. Specs are defined per family as we
// harden them; families without a spec are not checked yet.
interface Construct {
  label: string;
  test: RegExp;
}

const CONSTRUCT_SETS: Record<string, Construct[]> = {
  sfc: [
    { label: "step", test: /\bstep\s+\w+/ },
    { label: "qualified action", test: /(^|\n)\s*(N|S|R|L|D|P|P0|P1|SD|DS|SL)\s+\w/ },
    { label: "transition from:/to:", test: /transition\s+(?:\w+\s+)?from\s*:/ },
    { label: "alt|sim branch", test: /\b(alt|sim)\s+from\s*:/ },
  ],
  blockdiagram: [
    { label: "block()", test: /=\s*block\s*\(/ },
    { label: "sum()", test: /=\s*sum\s*\(/ },
    { label: "-> connection", test: /->/ },
  ],
};

function singleShotPayload(type: string): string {
  const p = getGenerationProfile(type);
  const featuredDsl = getExamples(type, { preferFeatured: true, limit: 5 })
    .examples.filter((e) => e.featured)
    .map((e) => e.dsl)
    .join("\n");
  return [...p.forms, ...p.prefer, p.keywords ?? "", featuredDsl].join("\n");
}

describe("core-construct coverage (spec'd families)", () => {
  for (const [type, constructs] of Object.entries(CONSTRUCT_SETS)) {
    it(`${type}: card + featured examples exercise every core construct`, () => {
      const text = singleShotPayload(type);
      const missing = constructs
        .filter((c) => !c.test.test(text))
        .map((c) => c.label);
      expect(missing, `${type} missing constructs: ${missing.join(", ")}`).toEqual([]);
    });
  }
});
