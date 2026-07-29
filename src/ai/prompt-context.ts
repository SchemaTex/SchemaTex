/**
 * Prompt-context builder — a convenience wrapper for single-shot LLM callers.
 *
 * Agentic callers can keep using `getSyntax` + `getExamples` as separate tool
 * round-trips. But a high-volume single-shot caller (e.g. a product backend
 * generating DSL with one model call, no tool loop) just wants ONE inject-ready
 * block: the canonical grammar card plus a couple of worked few-shot examples.
 *
 * This adds no new knowledge — it stitches `getSyntax(detail: "canonical")` and
 * `getExamples(preferFeatured)` into one string so the caller doesn't have to
 * know the recipe. Both primitives remain exported and usable on their own.
 */
import { resolveDiagramType } from "./registry";
import { getExamples, getSyntax } from "./tools";
import type { SyntaxDetail } from "./syntax";
import {
  FLOORPLAN_CAPABILITIES,
  isFloorplanCapability,
  type FloorplanCapability,
} from "../diagrams/floorplan/capabilities";

export interface PromptIntent {
  /** Short use-case wording such as "classroom", "open-plan office", or "multi-floor home". */
  scenario?: string;
  /** Explicit gallery tags take precedence over generic featured ordering. */
  tags?: readonly string[];
  /** Capabilities the caller expects the chosen diagram type to represent. */
  requestedCapabilities?: readonly FloorplanCapability[];
}

export interface BuildPromptContextOptions {
  /** How many few-shot examples to embed. Default 2. Set 0 to omit examples. */
  examples?: number;
  /** Syntax detail level. Default `"canonical"` (the compact first-shot card). */
  detail?: SyntaxDetail;
  /** Prefer `featured: true` examples first. Default true. */
  preferFeatured?: boolean;
  /** Cap embedded example complexity (1–5). */
  maxComplexity?: number;
  /** Optional intent used for capability truthfulness and example retrieval. */
  intent?: PromptIntent;
}

export interface PromptContext {
  type: string;
  name: string;
  standard: string;
  /** One inject-ready markdown block: grammar card + worked examples. */
  text: string;
  /** Number of examples embedded in `text`. */
  exampleCount: number;
}

/**
 * Build a single inject-ready prompt block for one diagram type.
 *
 * @example
 * const ctx = buildPromptContext("genogram");
 * const systemPrompt = `Generate Schematex DSL.\n\n${ctx.text}`;
 */
export function buildPromptContext(
  type: string,
  opts: BuildPromptContextOptions = {}
): PromptContext {
  const resolved = resolveDiagramType(type) ?? type;
  const detail: SyntaxDetail = opts.detail ?? "canonical";
  const limit = opts.examples ?? 2;

  const { type: canonical, name, standard, syntax } = getSyntax(resolved, {
    detail,
  });

  const parts: string[] = [
    `# ${name} (${canonical})`,
    `Standard: ${standard}`,
    "",
    syntax.content,
  ];
  if (canonical === "floorplan") {
    const requested = opts.intent?.requestedCapabilities ?? [];
    const unsupported = requested.filter(
      (capability) =>
        !isFloorplanCapability(capability) ||
        !FLOORPLAN_CAPABILITIES[capability].supported
    );
    parts.push(
      "",
      "## Capability contract",
      "Floorplan represents measured rectilinear rooms, furniture placement, wall fixtures, protected zones, and explicit multi-floor plates.",
      "It does not represent curved room boundaries, plumbing/HVAC runs, electrical circuit connectivity, or automatic space planning."
    );
    if (unsupported.length > 0) {
      parts.push(
        `Requested but unsupported: ${unsupported.join(", ")}. Do not fake these semantics with rectangles, furniture points, or decorative lines.`
      );
    }
  }

  let exampleCount = 0;
  if (limit > 0) {
    const examples = getExamples(canonical, {
      preferFeatured: opts.preferFeatured ?? true,
      limit,
      maxComplexity: opts.maxComplexity,
      intentTags: [
        ...(opts.intent?.tags ?? []),
        ...(opts.intent?.scenario
          ?.toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((token) => token.length >= 3) ?? []),
      ],
    }).examples;
    exampleCount = examples.length;
    if (examples.length > 0) {
      parts.push("", "## Worked examples");
      for (const ex of examples) {
        parts.push("", `### ${ex.title}`);
        if (ex.description) parts.push(ex.description);
        parts.push("```", ex.dsl.trim(), "```");
      }
    }
  }

  return {
    type: canonical,
    name,
    standard,
    text: parts.join("\n"),
    exampleCount,
  };
}
