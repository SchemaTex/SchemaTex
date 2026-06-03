// Types, label maps, and cluster helpers for the gallery UI.
// The actual example data lives in content/examples/*.mdx — see lib/examples-source.ts.
//
// The diagram list, labels, and clusters are DERIVED from the package registry
// (schematex/ai) — there is no hand-maintained type list here. Add a diagram to
// DIAGRAM_REGISTRY and it shows up in the gallery filters automatically.
import {
  DIAGRAM_REGISTRY,
  getDiagramMeta,
  type DiagramType,
  type DiagramCluster,
} from 'schematex/ai';
import { CLUSTER_DISPLAY, CLUSTERS_ORDERED } from '@/lib/clusters';
import { type UseCase, USE_CASE_LABELS, resolveUseCase } from '@/lib/use-cases';

export type { DiagramType };

// "Industry" is the gallery's use-case axis — derived from the curated
// use-case taxonomy (lib/use-cases.ts), not a hand-kept enum.
export type Industry = UseCase;
export { resolveUseCase };

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

// label per diagram type, derived from the registry's canonical `name`.
export const DIAGRAM_LABELS: Record<DiagramType, { label: string }> =
  Object.fromEntries(
    DIAGRAM_REGISTRY.map((m) => [m.type, { label: m.name }]),
  ) as Record<DiagramType, { label: string }>;

// use-case label per id, from the curated taxonomy.
export const INDUSTRY_LABELS: Record<Industry, { label: string }> = USE_CASE_LABELS;

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  1: 'Minimal',
  2: 'Typical',
  3: 'Advanced',
};

// cluster id → its diagram types, grouped + ordered straight from the registry.
export const CLUSTER_TO_TYPES: Record<DiagramCluster, DiagramType[]> = (() => {
  const map = Object.fromEntries(
    CLUSTERS_ORDERED.map((c) => [c, [] as DiagramType[]]),
  ) as Record<DiagramCluster, DiagramType[]>;
  for (const m of DIAGRAM_REGISTRY) map[m.cluster].push(m.type);
  return map;
})();

export const CLUSTER_META: Record<DiagramCluster, { label: string; color: string }> =
  Object.fromEntries(
    (Object.keys(CLUSTER_DISPLAY) as DiagramCluster[]).map((c) => [
      c,
      { label: CLUSTER_DISPLAY[c].label, color: CLUSTER_DISPLAY[c].color },
    ]),
  ) as Record<DiagramCluster, { label: string; color: string }>;

export function getDiagramCluster(diagram: DiagramType): DiagramCluster {
  return getDiagramMeta(diagram)?.cluster ?? 'generic';
}
