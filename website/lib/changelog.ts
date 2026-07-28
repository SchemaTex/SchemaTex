// Parses the repo's CHANGELOG.md into a structured release timeline for the
// /changelog page. CHANGELOG.md stays the single source of truth — this just
// reads it. Each entry is associated to the diagram type(s) it touches via the
// (`type`) markers and diagram keywords already present in the headings.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveDiagramType, DIAGRAM_REGISTRY, type DiagramType } from 'schematex/ai';

export interface ChangelogEntry {
  kind: string; // Added | Fixed | Changed | Removed | Security | Deprecated
  title: string;
  body: string[];
  diagrams: DiagramType[];
}

export interface ChangelogVersion {
  version: string; // "0.5.2" | "Unreleased"
  date: string | null;
  unreleased: boolean;
  entries: ChangelogEntry[];
}

function changelogPath(): string | null {
  const candidates = [
    join(process.cwd(), 'CHANGELOG.md'),
    join(process.cwd(), '..', 'CHANGELOG.md'),
    join(process.cwd(), 'node_modules', 'schematex', 'CHANGELOG.md'),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

// Keyword → diagram type, for headings that name a diagram without a (`type`)
// marker. Order matters: more-specific phrases first. The `function block`
// vs `block diagram` overlap is handled by a negative lookbehind.
const KEYWORD_TO_TYPE: Array<[RegExp, DiagramType]> = [
  [/\bstage ?plot\b|\binput list\b/i, 'stageplot'],
  [/\buse case\b/i, 'usecase'],
  [/\bsingle-line\b|\bsld\b/i, 'sld'],
  [/\bp&id\b|\bpiping & instrumentation\b/i, 'pid'],
  [/\bstate diagram\b|\bstatechart\b/i, 'state'],
  [/\bdecision tree\b/i, 'decisiontree'],
  [/\bfunction block\b|\bfbd\b/i, 'fbd'],
  [/(?<!function )block diagram\b/i, 'blockdiagram'],
  [/\bsequential function\b|\bsfc\b/i, 'sfc'],
  [/\borg ?chart\b/i, 'orgchart'],
  [/\bladder\b/i, 'ladder'],
  [/\bgenogram\b/i, 'genogram'],
  [/\becomap\b/i, 'ecomap'],
  [/\bpedigree\b/i, 'pedigree'],
  [/\bphylogenetic\b|\bphylo\b/i, 'phylo'],
  [/\bsociogram\b/i, 'sociogram'],
  [/\bfishbone\b|\bishikawa\b/i, 'fishbone'],
  [/\bflowchart\b/i, 'flowchart'],
  [/\bcircuit\b/i, 'circuit'],
  [/\btiming\b|\bwaveform\b/i, 'timing'],
  [/\blogic gate\b/i, 'logic'],
  [/\bbreadboard\b/i, 'breadboard'],
  [/\bentity[- ]relationship\b|\berd\b/i, 'erd'],
  [/\bentity structure\b/i, 'entity'],
  [/\bbpmn\b/i, 'bpmn'],
  [/\bsequence\b/i, 'sequence'],
  [/\bpetri\b/i, 'petri'],
  [/\bnetwork (diagram|topolog)/i, 'network'],
  [/\bprisma\b/i, 'prisma'],
  [/\bpert\b|\bcpm\b|\bcritical[- ]path\b/i, 'pert'],
  [/\bvenn\b|\beuler\b/i, 'venn'],
  [/\bmatrix\b|\bquadrant\b/i, 'matrix'],
  [/\bmindmap\b/i, 'mindmap'],
  [/\btimeline\b/i, 'timeline'],
];

function detectDiagrams(title: string): DiagramType[] {
  const found = new Set<DiagramType>();
  // 1. backtick code tokens that resolve to a type (most reliable)
  for (const m of title.matchAll(/`([^`]+)`/g)) {
    const t = resolveDiagramType(m[1]);
    if (t) found.add(t);
  }
  // 2. keyword fallback
  for (const [re, t] of KEYWORD_TO_TYPE) {
    if (re.test(title)) found.add(t);
  }
  return [...found];
}

let cache: ChangelogVersion[] | null = null;

export function parseChangelog(): ChangelogVersion[] {
  if (cache) return cache;
  const path = changelogPath();
  if (!path) return [];
  const md = readFileSync(path, 'utf8');
  const lines = md.split('\n');

  const versions: ChangelogVersion[] = [];
  let version: ChangelogVersion | null = null;
  let entry: ChangelogEntry | null = null;

  const pushEntry = () => {
    if (version && entry) {
      entry.diagrams = detectDiagrams(entry.title);
      version.entries.push(entry);
    }
    entry = null;
  };

  for (const raw of lines) {
    const vMatch = raw.match(/^##\s+\[([^\]]+)\](?:\s*[—-]\s*(.+))?/);
    if (vMatch) {
      pushEntry();
      const ver = vMatch[1].trim();
      version = {
        version: ver,
        date: vMatch[2]?.trim() ?? null,
        unreleased: /unreleased/i.test(ver),
        entries: [],
      };
      versions.push(version);
      continue;
    }
    const eMatch = raw.match(/^###\s+(Added|Fixed|Changed|Removed|Security|Deprecated)\b\s*[—-]?\s*(.*)/);
    if (eMatch && version) {
      pushEntry();
      entry = { kind: eMatch[1], title: eMatch[2].trim(), body: [], diagrams: [] };
      continue;
    }
    if (entry && raw.trim()) {
      entry.body.push(raw);
    }
  }
  pushEntry();

  cache = versions;
  return versions;
}

export const ALL_DIAGRAM_TYPES = DIAGRAM_REGISTRY.map((d) => d.type);
