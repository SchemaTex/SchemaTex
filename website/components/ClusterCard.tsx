import Link from 'next/link';
import type { ReactNode } from 'react';

export type ClusterKey =
  | 'relationships'
  | 'industrial'
  | 'corporate'
  | 'causality';

/** DS cluster → --cat-N slot. Keep in sync with design-system.md. */
const CLUSTER_TO_CAT: Record<ClusterKey, string> = {
  relationships: 'var(--cat-0)', // blue
  causality: 'var(--cat-1)',     // emerald
  industrial: 'var(--cat-2)',    // amber
  corporate: 'var(--cat-3)',     // violet
};

const CLUSTER_INDEX: Record<ClusterKey, string> = {
  relationships: '01',
  industrial: '02',
  corporate: '03',
  causality: '04',
};

interface ClusterCardProps {
  cluster: ClusterKey;
  title: string;
  description: string;
  diagrams: { name: string; standard: string }[];
  href: string;
  icon?: ReactNode;
  svg: string;
}

export function ClusterCard({
  cluster,
  title,
  description,
  diagrams,
  href,
  icon,
  svg,
}: ClusterCardProps) {
  const color = CLUSTER_TO_CAT[cluster];
  return (
    <Link
      href={href}
      className="group flex min-h-[460px] flex-col overflow-hidden bg-fd-card transition hover:border-[color:var(--stroke)]"
      style={{
        border: '1px solid var(--fill-muted)',
        borderRadius: 'var(--r)',
      }}
    >
      {/* Header: mono meta row, cat-color dot, cluster index */}
      <div
        className="flex items-center gap-3 border-b px-4 py-3 font-mono text-xs text-fd-muted-foreground"
        style={{ borderColor: 'var(--fill-muted)' }}
      >
        <span className="text-fd-foreground">{CLUSTER_INDEX[cluster]}</span>
        <span
          aria-hidden
          className="size-2.5"
          style={{ background: color, borderRadius: '2px' }}
        />
        <span>{cluster}</span>
        <span className="ml-auto text-fd-muted-foreground/70">
          {diagrams.length} diagrams
        </span>
      </div>

      {/* Stage — dot-grid background, flat, no gradient wash.
          SVG fills the frame while preserving aspect ratio. */}
      <div
        className="dot-grid relative flex h-[200px] items-center justify-center overflow-hidden p-3"
        style={{ borderBottom: '1px solid var(--fill-muted)' }}
      >
        <div
          className="flex h-full w-full items-center justify-center [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1.5 flex items-center gap-2">
          {icon && <span aria-hidden>{icon}</span>}
          <h3 className="text-lg font-semibold tracking-tight text-fd-foreground">
            {title}
          </h3>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed text-fd-muted-foreground">
          {description}
        </p>

        {/* Diagram list — dashed separators, mono, standard name muted */}
        <ul className="mt-auto flex flex-col gap-0 font-mono text-xs">
          {diagrams.map((d, i) => (
            <li
              key={d.name}
              className="flex justify-between py-1.5"
              style={{
                borderTop: i === 0 ? 'none' : '1px dashed var(--fill-muted)',
              }}
            >
              <span className="text-fd-foreground">{d.name}</span>
              <span className="text-fd-muted-foreground">{d.standard}</span>
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
