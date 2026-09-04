/**
 * Syntax lookup — LLM-facing per-diagram grammar reference.
 *
 * The default "canonical" view stays intentionally narrow for first-shot
 * generation. The "reference" view preserves the fuller stripped-MDX docs
 * when a caller needs advanced syntax or adapter coverage.
 */
import type { DiagramType } from "../core/types";
import { SYNTAX } from "./_generated";
import {
  COMMON_GENERATION_RULES,
  getGenerationProfile,
  type GenerationProfile,
} from "./profiles";

export type SyntaxDetail = "canonical" | "reference";

export interface SyntaxDoc {
  key: string;
  title: string;
  detail: SyntaxDetail;
  content: string;
}

export function getSyntaxForType(
  syntaxKey: string,
  type: DiagramType,
  detail: SyntaxDetail = "canonical"
): SyntaxDoc | undefined {
  const s = SYNTAX[syntaxKey];
  if (!s) return undefined;
  return {
    key: syntaxKey,
    title: s.title,
    detail,
    content:
      detail === "reference"
        ? s.content
        : buildCanonicalSyntax(getGenerationProfile(type)),
  };
}

export function listSyntaxKeys(): string[] {
  return Object.keys(SYNTAX);
}

function buildCanonicalSyntax(profile: GenerationProfile): string {
  return [
    "# Canonical generation syntax",
    "",
    `Start with \`${profile.header}\`.`,
    `Authoring mode: ${profile.mode}.`,
    "",
    codeSection("Copyable pattern", profile.forms),
    profile.keywords ? ["## Vocabulary", "", profile.keywords, ""].join("\n") : "",
    bulletSection("Rules", profile.prefer),
    bulletSection("Avoid", profile.avoid),
    bulletSection("Fix validation failures", profile.repair),
    "## Before returning",
    "",
    ...COMMON_GENERATION_RULES.map((rule) => `- ${rule}`),
  ]
    .filter((part) => part !== "")
    .join("\n");
}

function bulletSection(title: string, items: readonly string[]): string {
  return [`### ${title}`, "", ...items.map((item) => `- ${item}`), ""].join("\n");
}

function codeSection(title: string, lines: readonly string[]): string {
  // Four-space indentation is a Markdown code block. Unlike bullets, it keeps
  // nested DSL continuations such as `measures` and `controls` copyable while
  // avoiding another fenced block inside buildPromptContext's worked examples.
  return [`## ${title}`, "", ...lines.map((line) => `    ${line}`), ""].join("\n");
}
