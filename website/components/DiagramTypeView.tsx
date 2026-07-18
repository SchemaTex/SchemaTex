import Link from 'next/link';
import { DiagramIcon } from '@/components/DiagramIcon';
import { ClusterIcon } from '@/components/ClusterIcon';
import {
  buildDiagramIndex,
  type DiagramIndexEntry,
  type DiagramClusterGroup,
} from '@/lib/diagrams-index';

// The "By diagram type" view of the gallery: every diagram type, grouped by
// cluster, each rendering all of its example forms. Data comes entirely from
// the package registry + the examples MDX collection (see lib/diagrams-index).
export function DiagramTypeView() {
  const groups = buildDiagramIndex();
  return (
    <div>
      <nav className="mb-10 flex flex-wrap gap-2">
        {groups.map((g) => (
          <a
            key={g.cluster}
            href={`#${g.cluster}`}
            className="ds-badge inline-flex items-center gap-1.5 hover:border-[color:var(--accent)]"
          >
            <ClusterIcon cluster={g.cluster} size={13} />
            {g.label} <span style={{ opacity: 0.5 }}>{g.entries.length}</span>
          </a>
        ))}
      </nav>

      {groups.map((g) => (
        <ClusterSection key={g.cluster} group={g} />
      ))}
    </div>
  );
}

function ClusterSection({ group }: { group: DiagramClusterGroup }) {
  return (
    <div id={group.cluster} className="scroll-mt-20 pt-14 first:pt-0">
      <div
        className="mb-6 flex items-center gap-2.5 border-b pb-3"
        style={{ borderColor: 'var(--line)' }}
      >
        <ClusterIcon cluster={group.cluster} size={20} style={{ color: 'var(--accent)' }} />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{group.label}</h2>
        <span className="ds-badge">{group.entries.length}</span>
      </div>
      <div className="flex flex-col gap-12">
        {group.entries.map((e) => (
          <DiagramTypeBlock key={e.type} entry={e} />
        ))}
      </div>
    </div>
  );
}

function DiagramTypeBlock({ entry }: { entry: DiagramIndexEntry }) {
  return (
    <div className="scroll-mt-20" id={`type-${entry.type}`}>
      {/* Type header */}
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link href={`/docs/${entry.docSlug}`} className="group inline-flex items-center gap-2">
          <DiagramIcon type={entry.type} size={18} style={{ color: 'var(--accent)' }} />
          <span
            className="text-[17px] font-semibold group-hover:text-[color:var(--accent)]"
            style={{ color: 'var(--text)' }}
          >
            {entry.name}
          </span>
        </Link>
        {entry.since ? (
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
            since v{entry.since}
            {entry.updatedIn.length > 0 ? (
              <span style={{ opacity: 0.7 }}>
                {' · upd '}
                {entry.updatedIn.map((v) => (v === 'Unreleased' ? 'next' : `v${v}`)).join(', ')}
              </span>
            ) : null}
          </span>
        ) : null}
        <span className="truncate font-mono text-[11px]" style={{ color: 'var(--accent)' }}>
          § {entry.standard}
        </span>
        <span className="ml-auto flex items-center gap-3 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {entry.hasSymbolSheet ? (
            <Link href={`/icons#${entry.type}`} className="hover:text-[color:var(--accent)]">symbols</Link>
          ) : null}
          <Link href={`/docs/${entry.docSlug}`} className="hover:text-[color:var(--accent)]">Docs →</Link>
        </span>
      </div>
      <p className="mb-3 max-w-3xl text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {entry.tagline}
      </p>

      {/* Example forms grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entry.examples.map((ex) => (
          <ExampleThumb key={ex.slug} type={entry.type} ex={ex} />
        ))}
      </div>
    </div>
  );
}

function ExampleThumb({
  type,
  ex,
}: {
  type: string;
  ex: DiagramIndexEntry['examples'][number];
}) {
  return (
    <Link href={`/examples/${ex.slug}`} className="gal-card">
      <div
        className="dot-grid flex items-center justify-center p-3"
        style={{ height: 150, color: 'var(--stroke)', background: '#ffffff' }}
      >
        {ex.svg ? (
          <div
            className="h-full w-full [&_svg]:mx-auto [&_svg]:max-h-full [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: ex.svg }}
          />
        ) : (
          <DiagramIcon type={type} size={40} style={{ color: 'var(--text-muted)', opacity: 0.35 }} />
        )}
      </div>
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span className="truncate text-[12.5px]" style={{ color: 'var(--text)' }}>{ex.title}</span>
        <span className="ml-auto flex shrink-0 gap-0.5" title={`complexity ${ex.complexity}`}>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className="size-[5px] rounded-full"
              style={{ background: n <= ex.complexity ? 'var(--accent)' : 'var(--fill-muted)' }}
            />
          ))}
        </span>
      </div>
    </Link>
  );
}
