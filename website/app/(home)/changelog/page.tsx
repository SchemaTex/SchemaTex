import Link from 'next/link';
import type { Metadata } from 'next';
import { DiagramIcon } from '@/components/DiagramIcon';
import { parseChangelog, type ChangelogEntry, type ChangelogVersion } from '@/lib/changelog';
import { getDiagramEntryMap } from '@/lib/diagrams-index';
import { resolveDiagramType, type DiagramType } from 'schematex/ai';
import { ThemedSvg } from '@/components/ThemedSvg';

export const metadata: Metadata = {
  title: 'Changelog — what shipped in each Schematex release',
  description:
    'Every Schematex release, the diagram engines and fixes it shipped, and the rendered output for each diagram it touched. Filter by diagram type to see its full history.',
  alternates: { canonical: 'https://schematex.js.org/changelog' },
};

const KIND_COLOR: Record<string, string> = {
  Added: 'var(--accent)',
  Fixed: '#16a34a',
  Changed: '#d97706',
  Removed: '#dc2626',
  Security: '#dc2626',
  Deprecated: '#6b7280',
};

const versions = parseChangelog();
const entryMap = getDiagramEntryMap();

function renderInline(text: string) {
  const parts = text.replace(/\*\*/g, '').split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith('`') && p.endsWith('`') ? (
      <code key={i} className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[11px]">{p.slice(1, -1)}</code>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

// Unique diagrams touched across all entries of a version, preserving order.
function versionDiagrams(version: ChangelogVersion): DiagramType[] {
  const seen = new Set<DiagramType>();
  const out: DiagramType[] = [];
  for (const e of version.entries) {
    for (const t of e.diagrams) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out;
}

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<{ diagram?: string }>;
}) {
  const params = await searchParams;
  const filterType: DiagramType | null = params.diagram
    ? resolveDiagramType(params.diagram) ?? null
    : null;

  const filtered = filterType
    ? versions
        .map((v) => ({ ...v, entries: v.entries.filter((e) => e.diagrams.includes(filterType)) }))
        .filter((v) => v.entries.length > 0)
    : versions;

  const filterName = filterType ? entryMap.get(filterType)?.name ?? filterType : null;

  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b px-6 pb-8 pt-12" style={{ borderColor: 'var(--line)' }}>
        <div className="mx-auto max-w-4xl">
          <p className="type-eye mb-3">/ CHANGELOG</p>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="ds-badge">{versions.length} releases</span>
            {filterType ? (
              <span className="ds-badge inline-flex items-center gap-1" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                <DiagramIcon type={filterType} size={12} />
                {filterName}
                <Link href="/changelog" className="ml-1" style={{ opacity: 0.7 }}>✕</Link>
              </span>
            ) : null}
          </div>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
            What shipped, release by release.
          </h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
            Every release, the diagram engines and fixes it shipped — with the rendered output for
            each diagram it touched. {filterType ? 'Showing one diagram’s full history.' : 'Click any render, or open the gallery’s by-type view.'}
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          {filtered.map((v, i) => (
            <VersionBlock key={`${v.version}-${i}`} version={v} />
          ))}
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No changelog entries for this diagram yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function VersionBlock({ version }: { version: ChangelogVersion }) {
  const diagrams = versionDiagrams(version);
  return (
    <div className="scroll-mt-20 border-b py-9" style={{ borderColor: 'var(--line)' }}>
      <div className="mb-5 flex items-baseline gap-3">
        <h2 className="font-mono text-xl font-semibold" style={{ color: 'var(--text)' }}>
          {version.unreleased ? 'Unreleased' : `v${version.version}`}
        </h2>
        {version.date ? (
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{version.date}</span>
        ) : null}
        {diagrams.length > 0 ? (
          <span className="ds-badge ml-auto">{diagrams.length} diagram{diagrams.length === 1 ? '' : 's'}</span>
        ) : null}
      </div>

      {/* Rendered grid of every diagram this release touched */}
      {diagrams.length > 0 ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {diagrams.map((t) => {
            const meta = entryMap.get(t);
            const svg = meta?.examples[0]?.svg ?? null;
            const exampleSlug = meta?.examples[0]?.slug;
            return (
              <Link key={t} href={`/gallery?view=type#type-${t}`} className="gal-card">
                <div
                  className="dot-grid flex items-center justify-center p-2"
                  style={{ height: 120, color: 'var(--stroke)', background: 'var(--fill)' }}
                >
                  {svg && exampleSlug ? (
                    <ThemedSvg
                      light={svg}
                      darkSrc={`/api/example-svg/${exampleSlug}?theme=dark`}
                      className="h-full w-full [&_svg]:mx-auto [&_svg]:max-h-full [&_svg]:max-w-full"
                    />
                  ) : (
                    <DiagramIcon type={t} size={34} style={{ color: 'var(--text-muted)', opacity: 0.35 }} />
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px]" style={{ borderTop: '1px solid var(--line)', color: 'var(--text-muted)' }}>
                  <DiagramIcon type={t} size={12} />
                  <span className="truncate" style={{ color: 'var(--text)' }}>{meta?.name ?? t}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {version.entries.map((e, i) => (
          <EntryBlock key={i} entry={e} />
        ))}
      </div>
    </div>
  );
}

function EntryBlock({ entry }: { entry: ChangelogEntry }) {
  const color = KIND_COLOR[entry.kind] ?? 'var(--text-muted)';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="font-mono text-[10px] uppercase tracking-wider"
          style={{ padding: '2px 7px', borderRadius: 'var(--r-sm)', background: color, color: 'var(--color-fd-primary-foreground)' }}
        >
          {entry.kind}
        </span>
        <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
          {renderInline(entry.title)}
        </span>
        {entry.diagrams.map((t) => {
          const meta = entryMap.get(t);
          return (
            <Link
              key={t}
              href={`/gallery?view=type#type-${t}`}
              className="inline-flex items-center gap-1 font-mono text-[11px] hover:text-[color:var(--accent)]"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '1px 6px' }}
            >
              <DiagramIcon type={t} size={12} />
              {meta?.name ?? t}
            </Link>
          );
        })}
      </div>

      {entry.body.length > 0 ? (
        <ul className="flex flex-col gap-1 pl-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {entry.body
            .filter((l) => /^\s*[-*]/.test(l))
            .slice(0, 4)
            .map((l, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: 'var(--accent)', opacity: 0.5 }}>·</span>
                <span>{renderInline(l.replace(/^\s*[-*]\s*/, ''))}</span>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
