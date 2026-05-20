// Types, label maps, and cluster helpers for the gallery UI.
// The actual example data lives in content/examples/*.mdx — see lib/examples-source.ts.

export type DiagramType =
  | 'genogram'
  | 'ecomap'
  | 'pedigree'
  | 'phylo'
  | 'sociogram'
  | 'timing'
  | 'logic'
  | 'circuit'
  | 'ladder'
  | 'sld'
  | 'block'
  | 'entity'
  | 'fishbone'
  | 'venn'
  | 'usecase'
  | 'prisma'
  | 'pert';

export type Industry =
  | 'healthcare'
  | 'legal-finance'
  | 'industrial'
  | 'education'
  | 'research'
  | 'business';

export type Complexity = 1 | 2 | 3;

export interface GalleryExample {
  slug: string;
  title: string;
  description: string;
  diagram: DiagramType;
  industry: Industry;
  complexity: Complexity;
  standard: string;
  dsl: string;
  hasDetailPage: boolean;
}

export const DIAGRAM_LABELS: Record<DiagramType, { label: string; icon: string }> = {
  genogram: { label: 'Genogram', icon: '👪' },
  ecomap: { label: 'Ecomap', icon: '🌐' },
  pedigree: { label: 'Pedigree', icon: '🧬' },
  phylo: { label: 'Phylogenetic', icon: '🌿' },
  sociogram: { label: 'Sociogram', icon: '🕸' },
  timing: { label: 'Timing', icon: '⏱' },
  logic: { label: 'Logic gate', icon: '🔌' },
  circuit: { label: 'Circuit', icon: '⚡' },
  ladder: { label: 'Ladder logic', icon: '🪜' },
  sld: { label: 'Single-line', icon: '🔋' },
  block: { label: 'Block diagram', icon: '📦' },
  entity: { label: 'Entity structure', icon: '🏢' },
  fishbone: { label: 'Fishbone', icon: '🐟' },
  venn: { label: 'Venn / Euler', icon: '⊙' },
  usecase: { label: 'Use case', icon: '🧩' },
  prisma: { label: 'PRISMA flow', icon: '📊' },
  pert: { label: 'PERT / CPM', icon: '🗓' },
};

export const INDUSTRY_LABELS: Record<Industry, { label: string; icon: string }> = {
  healthcare: { label: 'Healthcare', icon: '🩺' },
  'legal-finance': { label: 'Legal & Finance', icon: '⚖️' },
  industrial: { label: 'Industrial', icon: '🏭' },
  education: { label: 'Education', icon: '🎓' },
  research: { label: 'Research', icon: '🔬' },
  business: { label: 'Business', icon: '💼' },
};

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  1: 'Minimal',
  2: 'Typical',
  3: 'Advanced',
};

export const CLUSTER_TO_TYPES: Record<string, DiagramType[]> = {
  relationships: ['genogram', 'ecomap', 'pedigree', 'sociogram', 'phylo'],
  'electrical-industrial': ['timing', 'logic', 'circuit', 'ladder', 'sld', 'block'],
  'corporate-legal': ['entity'],
  'causality-analysis': ['fishbone', 'venn'],
  'software-uml': ['usecase'],
  research: ['prisma'],
  'project-management': ['pert'],
};

export const CLUSTER_META: Record<string, { label: string; color: string }> = {
  relationships:           { label: 'Relationships',           color: 'var(--cat-0)' },
  'electrical-industrial': { label: 'Electrical & Industrial', color: 'var(--cat-2)' },
  'corporate-legal':       { label: 'Corporate & Legal',       color: 'var(--cat-3)' },
  'causality-analysis':    { label: 'Causality & Analysis',    color: 'var(--cat-1)' },
  'software-uml':          { label: 'Software & UML',          color: 'var(--cat-4)' },
  research:                { label: 'Research',                color: 'var(--cat-5)' },
  'project-management':    { label: 'Project Management',      color: 'var(--cat-6)' },
};

export function getDiagramCluster(diagram: DiagramType): string {
  for (const [cluster, types] of Object.entries(CLUSTER_TO_TYPES)) {
    if ((types as string[]).includes(diagram)) return cluster;
  }
  return 'relationships';
}
