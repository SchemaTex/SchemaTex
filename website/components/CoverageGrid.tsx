// Right-column "coverage grid" in the hero — 20 diagram families laid out as a
// 4×5 catalog tile wall, colored by domain cluster. Replaces the earlier icon
// cloud: same primitive (line icons), but this version is keyed by cluster so
// it reads as "here's our scope" instead of decoration.
//
// Clusters map to the --cat-N tokens declared in global.css:
//   cat-0 Relationships · cat-1 Causality · cat-2 Electrical · cat-3 Corporate
//   cat-5 Time-based    · cat-7 Generic process

type Cluster = 0 | 1 | 2 | 3 | 5 | 7;

interface Tile {
  name: string;
  cluster: Cluster;
  paths: string;
}

const TILES: Tile[] = [
  // 👪 Relationships
  {
    name: 'genogram',
    cluster: 0,
    paths: `<rect x="3" y="4" width="5" height="5"/><circle cx="18.5" cy="6.5" r="2.5"/><path d="M8 6.5 H16"/><path d="M12 6.5 V12"/><rect x="9.5" y="15" width="5" height="5"/><path d="M9.5 15 L14.5 20"/>`,
  },
  {
    name: 'pedigree',
    cluster: 0,
    paths: `<rect x="3" y="3" width="4" height="4"/><circle cx="19" cy="5" r="2"/><path d="M7 5 H17"/><path d="M13 7 V11"/><path d="M8 11 H18"/><rect x="6" y="11" width="4" height="4" fill="currentColor"/><circle cx="16" cy="13" r="2" fill="currentColor"/><rect x="3" y="18" width="4" height="4"/><circle cx="11" cy="20" r="2" fill="currentColor"/><path d="M8 15 V18 M8 18 H5 M16 15 V18 H11"/>`,
  },
  {
    name: 'ecomap',
    cluster: 0,
    paths: `<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="5" r="1.8"/><circle cx="20" cy="5" r="1.8"/><circle cx="4.5" cy="19" r="1.8"/><circle cx="20" cy="19" r="1.8"/><path d="M10 10 L6 6"/><path d="M14 10 L18 6" stroke-dasharray="1.5 2"/><path d="M10 14 L6 18"/><path d="M14 14 L18 18"/>`,
  },
  {
    name: 'phylo',
    cluster: 0,
    paths: `<path d="M3 12 H8"/><path d="M8 5 V19"/><path d="M8 5 H13 M8 13 H13 M8 19 H21"/><path d="M13 3 V7 M13 3 H21 M13 7 H21"/><path d="M13 11 V15 M13 11 H21 M13 15 H21"/>`,
  },
  {
    name: 'sociogram',
    cluster: 0,
    paths: `<circle cx="12" cy="12" r="2"/><circle cx="4" cy="6" r="1.8"/><circle cx="20" cy="7" r="1.8"/><circle cx="5" cy="19" r="1.8"/><circle cx="19" cy="18" r="1.8"/><path d="M10.5 10.8 L5.5 7"/><path d="M13.5 11 L18.3 7.6"/><path d="M10.8 13.4 L6.3 17.8"/><path d="M13.4 13.2 L17.6 16.8"/><path d="M5.3 7.5 L18.6 7.5"/>`,
  },

  // 🐟 Causality
  {
    name: 'fishbone',
    cluster: 1,
    paths: `<path d="M2 12 H20"/><path d="M20 12 L22 10 M20 12 L22 14"/><path d="M6 12 L9 5 M10 12 L13 5 M14 12 L17 5"/><path d="M6 12 L9 19 M10 12 L13 19 M14 12 L17 19"/>`,
  },
  {
    name: 'venn',
    cluster: 1,
    paths: `<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>`,
  },
  {
    name: 'decision',
    cluster: 1,
    paths: `<path d="M12 3 L16 7 L12 11 L8 7 Z"/><path d="M9.5 9 L5 14 M14.5 9 L19 14"/><path d="M3 14 L5 12 L7 14 L5 16 Z"/><path d="M17 14 L19 12 L21 14 L19 16 Z"/><rect x="3" y="18" width="4" height="3"/><rect x="10" y="18" width="4" height="3"/><rect x="17" y="18" width="4" height="3"/><path d="M5 16 V18 M12 11 V18 M19 16 V18"/>`,
  },

  // ⚡ Electrical & Industrial
  {
    name: 'timing',
    cluster: 2,
    paths: `<path d="M3 7 H6 V3 H11 V7 H14 V3 H19 V7 H22"/><path d="M3 17 H8 V13 H13 V17 H16 V13 H20 V17 H22"/><path d="M3 11 H22" stroke-dasharray="1 2"/>`,
  },
  {
    name: 'logic gate',
    cluster: 2,
    paths: `<path d="M4 6 H11 A6 6 0 0 1 11 18 H4 Z"/><path d="M1 9 H4 M1 15 H4 M17 12 H22"/>`,
  },
  {
    name: 'circuit',
    cluster: 2,
    paths: `<path d="M3 12 H7"/><rect x="7" y="10" width="6" height="4"/><path d="M13 12 H16"/><circle cx="19" cy="12" r="3"/><path d="M19 9 V15 M17 12 H21"/><path d="M3 6 V12 M21 12 V18 M3 18 H21"/>`,
  },
  {
    name: 'ladder',
    cluster: 2,
    paths: `<path d="M3 3 V21 M21 3 V21"/><path d="M3 7 H8 M10 5 V9 M12 5 V9 M14 7 H21"/><path d="M3 13 H8 M10 11 V15 M10 11 L12 15 M12 11 L10 15 M14 13 H17"/><circle cx="19" cy="13" r="1.6"/><path d="M3 19 H10 M12 17 V21 M14 19 H21"/>`,
  },
  {
    name: 'single-line',
    cluster: 2,
    paths: `<path d="M12 2 V5"/><circle cx="12" cy="7.5" r="2.5"/><path d="M12 10 V12"/><path d="M8 12 H16"/><path d="M12 12 V15"/><rect x="9.5" y="15" width="5" height="3"/><path d="M12 18 V20 M9 20 H15 M10 22 H14 M11 22 L11 20"/>`,
  },
  {
    name: 'block',
    cluster: 2,
    paths: `<rect x="3" y="9" width="5" height="6"/><rect x="10" y="4" width="5" height="6"/><rect x="10" y="14" width="5" height="6"/><rect x="17" y="9" width="4" height="6"/><path d="M8 11 H10 M8 13 H10 M15 7 H17 V11 M15 17 H17 V13"/><path d="M12.5 10 V14"/>`,
  },

  // 🏢 Corporate & Legal
  {
    name: 'entity',
    cluster: 3,
    paths: `<rect x="8" y="3" width="8" height="4"/><path d="M12 7 V10 M5 10 H19"/><path d="M5 10 V12 M12 10 V12 M19 10 V12"/><rect x="3" y="12" width="4" height="4"/><rect x="10" y="12" width="4" height="4"/><rect x="17" y="12" width="4" height="4"/>`,
  },
  {
    name: 'orgchart',
    cluster: 3,
    paths: `<rect x="9" y="2" width="6" height="4"/><path d="M12 6 V9 M4 9 H20 M4 9 V12 M12 9 V12 M20 9 V12"/><rect x="2" y="12" width="5" height="3"/><rect x="9.5" y="12" width="5" height="3"/><rect x="17" y="12" width="5" height="3"/><path d="M4.5 15 V18 M19.5 15 V18"/><rect x="2.5" y="18" width="4" height="3"/><rect x="17.5" y="18" width="4" height="3"/>`,
  },

  // 🔀 Generic process
  {
    name: 'flowchart',
    cluster: 7,
    paths: `<rect x="4" y="3" width="6" height="4" rx="1"/><rect x="14" y="3" w="6" height="4" rx="1"/><rect x="14" y="3" width="6" height="4" rx="1"/><rect x="4" y="17" width="6" height="4" rx="1"/><rect x="14" y="17" width="6" height="4" rx="1"/><path d="M12 9 L15 12 L12 15 L9 12 Z"/><path d="M10 5 H12 V9 M17 7 V12 H15 M9 12 H7 V19 H10 M15 12 H17 V17"/>`,
  },
  {
    name: 'mindmap',
    cluster: 7,
    paths: `<circle cx="12" cy="12" r="2.5"/><path d="M9.8 11 Q5 10 4 5"/><path d="M9.8 13 Q5 14 4 19"/><path d="M14.2 11 Q19 10 20 5"/><path d="M14.2 13 Q19 14 20 19"/><path d="M12 9.5 Q12 5 7 4"/><path d="M12 9.5 Q12 5 17 4"/><circle cx="4" cy="5" r="1" fill="currentColor"/><circle cx="4" cy="19" r="1" fill="currentColor"/><circle cx="20" cy="5" r="1" fill="currentColor"/><circle cx="20" cy="19" r="1" fill="currentColor"/>`,
  },

  // 📅 Time / data
  {
    name: 'timeline',
    cluster: 5,
    paths: `<path d="M2 12 H22"/><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="11" cy="12" r="1.6" fill="currentColor"/><circle cx="17" cy="12" r="1.6" fill="currentColor"/><path d="M5 12 V7 M11 12 V17 M17 12 V7"/><path d="M2 8 H7 M8 18 H14 M14 8 H19"/>`,
  },
  {
    name: 'matrix',
    cluster: 5,
    paths: `<rect x="3" y="3" width="18" height="18"/><path d="M9 3 V21 M15 3 V21"/><path d="M3 9 H21 M3 15 H21"/><rect x="9" y="9" width="6" height="6" fill="currentColor"/>`,
  },
];

const CLUSTERS: { id: Cluster; emoji: string; label: string; count: number }[] = [
  { id: 0, emoji: '👪', label: 'Relationships', count: 5 },
  { id: 2, emoji: '⚡', label: 'Electrical & Industrial', count: 6 },
  { id: 1, emoji: '🐟', label: 'Causality & Analysis', count: 3 },
  { id: 3, emoji: '🏢', label: 'Corporate & Legal', count: 2 },
  { id: 7, emoji: '🔀', label: 'Generic process', count: 2 },
  { id: 5, emoji: '📅', label: 'Time / data', count: 2 },
];

export function CoverageGrid() {
  return (
    <div className="hidden select-none lg:block" aria-hidden>
      {/* Header — anchors the grid as a deliberate catalog, not decoration */}
      <div className="mb-3 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-fd-muted-foreground">
        <span>§ 20 FAMILIES</span>
        <span className="opacity-60">4 clusters</span>
      </div>

      {/* 4×5 tile grid */}
      <div
        className="grid grid-cols-4 gap-2"
        style={{
          border: '1px solid var(--fill-muted)',
          borderRadius: 'var(--r)',
          padding: 10,
          background:
            'repeating-linear-gradient(0deg, var(--fill) 0 11px, transparent 11px 12px), repeating-linear-gradient(90deg, var(--fill) 0 11px, transparent 11px 12px), var(--bg)',
          backgroundSize: '12px 12px',
        }}
      >
        {TILES.map((t) => {
          const cat = `var(--cat-${t.cluster})`;
          return (
            <div
              key={t.name}
              title={t.name}
              className="group relative flex aspect-square items-center justify-center transition"
              style={{
                background: `color-mix(in srgb, ${cat} 6%, var(--fill))`,
                border: `1px solid color-mix(in srgb, ${cat} 20%, var(--fill-muted))`,
                borderRadius: 'var(--r-sm)',
                color: cat,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={22}
                height={22}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: t.paths }}
              />
            </div>
          );
        })}
      </div>

      {/* Legend — cluster dot + count + name. Two rows so copy alongside has room */}
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px] text-fd-muted-foreground">
        {CLUSTERS.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: `var(--cat-${c.id})`,
              }}
            />
            <span className="text-fd-foreground">{c.count}</span>
            <span className="truncate">{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
