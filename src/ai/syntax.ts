/**
 * Syntax lookup — LLM-facing per-diagram grammar reference.
 *
 * v1: returns the stripped-MDX content from `website/content/docs/*.mdx`
 * (JSX components replaced with fenced DSL code blocks).
 *
 * Later: may be replaced with curated compact summaries per diagram if
 * the stripped docs prove too long for good LLM performance.
 */
import { SYNTAX, type GeneratedSyntax } from "./_generated";

export type SyntaxDoc = GeneratedSyntax & { key: string };

export function getSyntaxForType(syntaxKey: string): SyntaxDoc | undefined {
  const s = SYNTAX[syntaxKey];
  if (!s) return undefined;
  return { key: syntaxKey, ...s };
}

export function listSyntaxKeys(): string[] {
  return Object.keys(SYNTAX);
}
