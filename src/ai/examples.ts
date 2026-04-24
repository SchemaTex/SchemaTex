/**
 * Example library — runtime lookup over the bundled MDX examples.
 */
import { EXAMPLES, type GeneratedExample } from "./_generated";

export type Example = GeneratedExample;

export interface GetExamplesOptions {
  /** Maximum number of examples to return. Default 5. */
  limit?: number;
  /** Prefer examples marked `featured: true` when set. */
  preferFeatured?: boolean;
  /** Maximum complexity (1–5). */
  maxComplexity?: number;
}

/**
 * Normalise a diagram-registry type to the diagram key used in example
 * frontmatter. Most are identical; a few legacy keys differ.
 */
function normaliseDiagramKey(type: string): string[] {
  // The frontmatter uses short keys like "block" while the plugin type is
  // "blockdiagram". Return all aliases to match on.
  switch (type) {
    case "blockdiagram":
      return ["block", "blockdiagram"];
    default:
      return [type];
  }
}

export function getExamplesForType(
  type: string,
  opts: GetExamplesOptions = {}
): Example[] {
  const keys = normaliseDiagramKey(type);
  const all = EXAMPLES.filter((e) => keys.includes(e.diagram));
  let filtered = all;
  const maxComplexity = opts.maxComplexity;
  if (typeof maxComplexity === "number") {
    filtered = filtered.filter((e) => e.complexity <= maxComplexity);
  }
  // Featured first when requested, then by complexity ascending.
  const sorted = [...filtered].sort((a, b) => {
    if (opts.preferFeatured) {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
    }
    return a.complexity - b.complexity;
  });
  const limit = opts.limit ?? 5;
  return sorted.slice(0, limit);
}

export function listAllExampleSlugs(): string[] {
  return EXAMPLES.map((e) => e.slug);
}
