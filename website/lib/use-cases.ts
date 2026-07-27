// Use-case (audience / domain) taxonomy for the gallery.
//
// Example MDX frontmatter uses a rich, free-form `industry:` vocabulary (90+
// distinct tokens: software, saas, manufacturing, devops, banking, …). The
// gallery groups those into a small, curated set of audience buckets so the
// "use-case" filter stays scannable AND accurate — every token maps to exactly
// one bucket here, so nothing silently falls back into the wrong group.
//
// Adding a new domain token to an example? Add it to a bucket below. The
// coverage test (tests in website) asserts every token used across the corpus
// is mapped, so a new unmapped token fails CI instead of quietly mis-bucketing.

export type UseCase =
  | 'healthcare'
  | 'software'
  | 'engineering'
  | 'industrial'
  | 'business'
  | 'legal-finance'
  | 'education'
  | 'research';

export interface UseCaseGroup {
  id: UseCase;
  label: string;
  /** Free-form frontmatter domain tokens that map into this bucket. */
  domains: string[];
}

// Ordered — this is also the chip order in the filter bar.
export const USE_CASE_GROUPS: UseCaseGroup[] = [
  {
    id: 'healthcare',
    label: 'Healthcare & Social',
    domains: [
      'healthcare', 'clinical', 'genetics', 'biology', 'biotech',
      'pharmaceuticals', 'pharmaceutical', 'social-work', 'child-protection',
    ],
  },
  {
    id: 'software',
    label: 'Software & IT',
    domains: [
      'software', 'saas', 'it', 'devops', 'sre', 'cloud', 'datacenter',
      'infrastructure', 'security', 'iot', 'productivity', 'analytics', 'sap',
      'ecommerce', 'e-commerce', 'billing',
    ],
  },
  {
    id: 'engineering',
    label: 'Engineering & Hardware',
    domains: [
      'engineering', 'hardware', 'electronics', 'embedded', 'embedded-systems',
      'robotics', 'mechanical', 'maker', 'automotive', 'aviation',
    ],
  },
  {
    id: 'industrial',
    label: 'Industrial & Process',
    domains: [
      'industrial', 'manufacturing', 'automation', 'plc', 'chemical-processing',
      'chemical', 'specialty-chemicals', 'petrochemical', 'oil-gas',
      'water-treatment', 'food-processing', 'beverage', 'brewing', 'baking',
      'packaging', 'plastics', 'energy', 'renewables', 'utilities', 'nuclear',
      'hvac', 'process-safety', 'safety', 'fire-safety', 'fabrication',
      'construction', 'residential', 'quality',
    ],
  },
  {
    id: 'business',
    label: 'Business & Operations',
    domains: [
      'business', 'management', 'operations', 'strategy', 'business-strategy',
      'product', 'hr', 'marketing', 'leadership', 'consulting', 'startup',
      'scaleup', 'enterprise', 'support', 'coaching', 'hospitality', 'retail',
      'logistics', 'supply-chain', 'warehousing', 'transportation', 'transport',
    ],
  },
  {
    id: 'legal-finance',
    label: 'Finance & Legal',
    domains: [
      'legal-finance', 'finance', 'banking', 'insurance', 'legal', 'compliance',
      'investor-relations',
    ],
  },
  {
    id: 'education',
    label: 'Education',
    domains: ['education'],
  },
  {
    id: 'research',
    label: 'Research & Analysis',
    domains: [
      'research', 'decision-analysis', 'probability', 'systems-thinking',
      'foresight', 'urban-planning', 'bioinformatics',
    ],
  },
];

export const USE_CASE_LABELS: Record<UseCase, { label: string }> =
  Object.fromEntries(
    USE_CASE_GROUPS.map((g) => [g.id, { label: g.label }]),
  ) as Record<UseCase, { label: string }>;

const DOMAIN_TO_USECASE: Record<string, UseCase> = (() => {
  const map: Record<string, UseCase> = {};
  for (const g of USE_CASE_GROUPS) for (const d of g.domains) map[d] = g.id;
  return map;
})();

/** Every domain token recognised by the taxonomy (for coverage tests). */
export const KNOWN_DOMAINS = new Set(Object.keys(DOMAIN_TO_USECASE));

/**
 * Resolve an example's frontmatter `industry` tokens to a single use-case
 * bucket. First mapped token wins (tokens are listed primary-first). Falls back
 * to 'business' only if no token maps — the coverage test keeps that from
 * happening silently for corpus examples.
 */
export function resolveUseCase(domains: readonly string[]): UseCase {
  for (const d of domains) {
    const uc = DOMAIN_TO_USECASE[d];
    if (uc) return uc;
  }
  return 'business';
}
