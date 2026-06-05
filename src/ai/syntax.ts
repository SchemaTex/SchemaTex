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
    "Use this compact path for new DSL generation. Ask for `detail: \"reference\"` only when the request needs advanced forms or an imported adapter.",
    "",
    "## Generation profile",
    "",
    `- Canonical type: \`${profile.type}\``,
    `- Canonical header: \`${profile.header}\``,
    `- Preferred mode: ${profile.mode}`,
    profile.keywords ? `- Keywords: ${profile.keywords}` : "",
    bulletSection("Core forms", profile.forms),
    bulletSection("Prefer", profile.prefer),
    bulletSection("Avoid by default", profile.avoid),
    bulletSection("Repair checks", profile.repair),
    "## Shared generation rules",
    "",
    ...COMMON_GENERATION_RULES.map((rule) => `- ${rule}`),
  ]
    .filter((part) => part !== "")
    .join("\n");
}

function bulletSection(title: string, items: readonly string[]): string {
  return [`### ${title}`, "", ...items.map((item) => `- ${item}`), ""].join("\n");
}
