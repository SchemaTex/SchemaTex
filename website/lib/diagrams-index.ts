// Builds the data for the /diagrams catalog entirely from the package registry +
// the examples MDX collection + the parsed CHANGELOG. No hand-maintained diagram
// list lives here — add a diagram to DIAGRAM_REGISTRY + an example MDX and it
// shows up, with every example form rendered and its version history attached.
import { render, SYMBOL_CATALOG_TYPES } from 'schematex';
import {
  DIAGRAM_REGISTRY,
  getDiagramSince,
  resolveDiagramType,
  type DiagramType,
  type DiagramCluster,
} from 'schematex/ai';
import { allExamples, type Example } from '@/lib/examples-source';
import { parseChangelog } from '@/lib/changelog';
import { CLUSTER_DISPLAY } from '@/lib/clusters';

export interface DiagramExampleThumb {
  slug: string;
  title: string;
  complexity: number;
  svg: string | null;
}

export interface DiagramIndexEntry {
  type: DiagramType;
  name: string;
  tagline: string;
  standard: string;
  cluster: DiagramCluster;
  since: string;
  /** Other releases (besides `since`) that touched this diagram, oldest→newest. */
  updatedIn: string[];
  /** Doc slug (registry syntaxKey) → /docs/{slug}. */
  docSlug: string;
  hasSymbolSheet: boolean;
  /** Every example for this type, simplest→most complex, each rendered. */
  examples: DiagramExampleThumb[];
}

export interface DiagramClusterGroup {
  cluster: DiagramCluster;
  label: string;
  entries: DiagramIndexEntry[];
}

const SYMBOL_SHEET_TYPES = new Set<DiagramType>(SYMBOL_CATALOG_TYPES);

function examplesByType(): Map<DiagramType, Example[]> {
  const map = new Map<DiagramType, Example[]>();
  for (const ex of allExamples) {
    const t = resolveDiagramType(ex.diagram);
    if (!t) continue;
    (map.get(t) ?? map.set(t, []).get(t)!).push(ex);
  }
  return map;
}

// type → list of releases that touched it (from CHANGELOG entries' diagram tags).
function versionsByType(): Map<DiagramType, string[]> {
  const map = new Map<DiagramType, Set<string>>();
  for (const v of parseChangelog()) {
    const tag = v.unreleased ? 'Unreleased' : v.version;
    for (const e of v.entries) {
      for (const t of e.diagrams) {
        (map.get(t) ?? map.set(t, new Set()).get(t)!).add(tag);
      }
    }
  }
  const out = new Map<DiagramType, string[]>();
  for (const [t, set] of map) out.set(t, [...set]);
  return out;
}

function safeRender(dsl: string, theme: 'default' | 'dark'): string | null {
  try {
    return render(dsl, { theme });
  } catch {
    return null;
  }
}

export function buildDiagramEntries(): DiagramIndexEntry[] {
  const byType = examplesByType();
  const versions = versionsByType();

  return DIAGRAM_REGISTRY.map((meta) => {
    const since = getDiagramSince(meta.type) ?? '';
    const sorted = [...(byType.get(meta.type) ?? [])].sort(
      (a, b) => a.complexity - b.complexity,
    );
    const touched = versions.get(meta.type) ?? [];
    const updatedIn = touched
      .filter((v) => v !== since)
      .sort((a, b) => (a === 'Unreleased' ? 1 : b === 'Unreleased' ? -1 : a.localeCompare(b, undefined, { numeric: true })));

    return {
      type: meta.type,
      name: meta.name,
      tagline: meta.tagline,
      standard: meta.standard,
      cluster: meta.cluster,
      since,
      updatedIn,
      docSlug: meta.syntaxKey,
      hasSymbolSheet: SYMBOL_SHEET_TYPES.has(meta.type),
      examples: sorted.map((ex) => ({
        slug: ex.slug,
        title: ex.title,
        complexity: ex.complexity,
        svg: safeRender(ex.dsl, 'default'),
      })),
    };
  });
}

export function getDiagramEntryMap(): Map<DiagramType, DiagramIndexEntry> {
  return new Map(buildDiagramEntries().map((e) => [e.type, e]));
}

export function buildDiagramIndex(): DiagramClusterGroup[] {
  const entries = buildDiagramEntries();

  const groups = new Map<DiagramCluster, DiagramIndexEntry[]>();
  for (const e of entries) {
    (groups.get(e.cluster) ?? groups.set(e.cluster, []).get(e.cluster)!).push(e);
  }

  return [...groups.entries()]
    .map(([cluster, list]) => ({
      cluster,
      label: CLUSTER_DISPLAY[cluster].label,
      entries: list,
    }))
    .sort((a, b) => CLUSTER_DISPLAY[a.cluster].order - CLUSTER_DISPLAY[b.cluster].order);
}
