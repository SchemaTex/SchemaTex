// Single source of cluster display data (label · order · accent color) for the
// 15 DiagramClusters defined in the package registry. Both the /diagrams catalog
// (diagrams-index.ts) and the /gallery filters (gallery-examples.ts) read from
// here, so there is exactly one cluster taxonomy + naming on the site — adding a
// cluster to the registry means adding one row here, nothing else drifts.
import type { DiagramCluster } from 'schematex/ai';

export interface ClusterDisplay {
  label: string;
  /** Sort order across catalog + filter UIs (lower = earlier). */
  order: number;
  /** Accent color token (one of --cat-0..7); reused across clusters. */
  color: string;
}

export const CLUSTER_DISPLAY: Record<DiagramCluster, ClusterDisplay> = {
  relationships:            { label: 'Relationships',            order: 0,    color: 'var(--cat-0)' },
  'electrical-industrial':  { label: 'Electrical & Industrial',  order: 1,    color: 'var(--cat-2)' },
  'behavior-modeling':      { label: 'Behavior Modeling',        order: 2,    color: 'var(--cat-4)' },
  'software-uml':           { label: 'Software / UML',           order: 2.5,  color: 'var(--cat-4)' },
  'corporate-legal':        { label: 'Corporate & Legal',        order: 3,    color: 'var(--cat-3)' },
  'causality-analysis':     { label: 'Causality & Analysis',     order: 4,    color: 'var(--cat-1)' },
  strategy:                 { label: 'Strategy',                 order: 5,    color: 'var(--cat-6)' },
  knowledge:                { label: 'Knowledge',                order: 6,    color: 'var(--cat-5)' },
  research:                 { label: 'Research',                 order: 7,    color: 'var(--cat-5)' },
  'project-management':     { label: 'Project Management',       order: 8,    color: 'var(--cat-6)' },
  concurrency:              { label: 'Concurrency',              order: 8.5,  color: 'var(--cat-4)' },
  'risk-reliability':       { label: 'Risk & Reliability',       order: 8.7,  color: 'var(--cat-4)' },
  'network-infrastructure': { label: 'Network & Infrastructure', order: 9,    color: 'var(--cat-2)' },
  architecture:             { label: 'Architecture & Space',     order: 9.5,  color: 'var(--cat-3)' },
  sports:                   { label: 'Sports & Tactics',         order: 9.7,  color: 'var(--cat-0)' },
  generic:                  { label: 'General',                  order: 10,   color: 'var(--cat-7)' },
};

/** Clusters in display order. */
export const CLUSTERS_ORDERED: DiagramCluster[] = (
  Object.keys(CLUSTER_DISPLAY) as DiagramCluster[]
).sort((a, b) => CLUSTER_DISPLAY[a].order - CLUSTER_DISPLAY[b].order);
