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
  | 'fbd'
  | 'sfc'
  | 'pid'
  | 'breadboard'
  | 'entity'
  | 'erd'
  | 'fishbone'
  | 'venn'
  | 'decisiontree'
  | 'matrix'
  | 'usecase'
  | 'sequence'
  | 'bpmn'
  | 'state'
  | 'prisma'
  | 'pert'
  | 'petri'
  | 'flowchart'
  | 'mindmap'
  | 'orgchart'
  | 'timeline'
  | 'network'
  | 'umlclass';

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
  fbd: { label: 'Function block', icon: '🧮' },
  sfc: { label: 'Sequential FC', icon: '🔢' },
  pid: { label: 'P&ID', icon: '🛢' },
  breadboard: { label: 'Breadboard', icon: '🍞' },
  entity: { label: 'Entity structure', icon: '🏢' },
  erd: { label: 'ER diagram', icon: '🗄' },
  fishbone: { label: 'Fishbone', icon: '🐟' },
  venn: { label: 'Venn / Euler', icon: '⊙' },
  decisiontree: { label: 'Decision tree', icon: '🌳' },
  matrix: { label: 'Matrix / quadrant', icon: '🔲' },
  usecase: { label: 'Use case', icon: '🧩' },
  sequence: { label: 'Sequence', icon: '💬' },
  bpmn: { label: 'BPMN', icon: '🔀' },
  state: { label: 'State diagram', icon: '🔄' },
  prisma: { label: 'PRISMA flow', icon: '📊' },
  pert: { label: 'PERT / CPM', icon: '🗓' },
  petri: { label: 'Petri net', icon: '◉' },
  flowchart: { label: 'Flowchart', icon: '🔷' },
  mindmap: { label: 'Mindmap', icon: '🧠' },
  orgchart: { label: 'Org chart', icon: '🏛' },
  timeline: { label: 'Timeline', icon: '📅' },
  network: { label: 'Network topology', icon: '🖧' },
  umlclass: { label: 'UML class', icon: '🧱' },
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
  'electrical-industrial': ['timing', 'logic', 'circuit', 'ladder', 'sld', 'block', 'fbd', 'sfc', 'pid', 'breadboard'],
  'corporate-legal': ['entity', 'erd', 'orgchart'],
  'causality-analysis': ['fishbone', 'venn', 'decisiontree', 'matrix'],
  'software-uml': ['umlclass', 'usecase', 'sequence', 'bpmn', 'state', 'petri'],
  research: ['prisma'],
  'project-management': ['pert'],
  'network-infrastructure': ['network'],
  general: ['flowchart', 'mindmap', 'timeline'],
};

export const CLUSTER_META: Record<string, { label: string; color: string }> = {
  relationships:           { label: 'Relationships',           color: 'var(--cat-0)' },
  'electrical-industrial': { label: 'Electrical & Industrial', color: 'var(--cat-2)' },
  'corporate-legal':       { label: 'Corporate & Legal',       color: 'var(--cat-3)' },
  'causality-analysis':    { label: 'Causality & Analysis',    color: 'var(--cat-1)' },
  'software-uml':          { label: 'Software & UML',          color: 'var(--cat-4)' },
  research:                { label: 'Research',                color: 'var(--cat-5)' },
  'project-management':    { label: 'Project Management',      color: 'var(--cat-6)' },
  'network-infrastructure': { label: 'Network & Infrastructure', color: 'var(--cat-2)' },
  general:                 { label: 'General',                 color: 'var(--cat-7)' },
};

export function getDiagramCluster(diagram: DiagramType): string {
  for (const [cluster, types] of Object.entries(CLUSTER_TO_TYPES)) {
    if ((types as string[]).includes(diagram)) return cluster;
  }
  return 'relationships';
}
