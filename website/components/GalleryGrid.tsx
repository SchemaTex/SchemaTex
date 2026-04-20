import Link from 'next/link';
import { render } from 'schematex';
import {
  DIAGRAM_LABELS,
  INDUSTRY_LABELS,
  CLUSTER_META,
  getDiagramCluster,
  type GalleryExample,
} from '@/lib/gallery-examples';

function safeRender(dsl: string): string {
  try {
    return render(dsl);
  } catch {
    return '';
  }
}

function GalleryCard({ ex }: { ex: GalleryExample }) {
  const svg = safeRender(ex.dsl);
  const cluster = getDiagramCluster(ex.diagram);
  const clusterColor = CLUSTER_META[cluster]?.color ?? 'var(--text-muted)';
  const industry = INDUSTRY_LABELS[ex.industry];
  const exampleHref = `/examples/${ex.slug}`;
  const playgroundHref = `/playground?example=${ex.slug}`;

  return (
    <article className="gal-card">
      {/* Primary link — card body → example detail page */}
      <Link href={exampleHref} className="flex flex-1 flex-col">
        {/* Card bar: cluster swatch · diagram type · § standard */}
        <div
          className="flex items-center gap-2 px-3 py-2 font-mono text-xs"
          style={{ borderBottom: '1px solid var(--fill-muted)', color: 'var(--text-muted)' }}
        >
          <span aria-hidden style={{ color: clusterColor, fontSize: 10 }}>■</span>
          <span style={{ color: 'var(--text)' }}>{ex.diagram}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span className="truncate">§ {ex.standard}</span>
        </div>

        {/* Diagram preview — dot-grid background, fixed height */}
        <div
          className="dot-grid flex items-center justify-center p-4"
          style={{ height: 180, color: 'var(--stroke)' }}
        >
          {svg ? (
            <div
              className="h-full w-full [&_svg]:mx-auto [&_svg]:max-h-full [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              preview unavailable
            </span>
          )}
        </div>

        {/* Card footer: title + description + use-case pill */}
        <div
          className="flex flex-1 flex-col gap-1.5 p-3"
          style={{ borderTop: '1px solid var(--fill-muted)' }}
        >
          <div
            className="text-[14px] font-medium leading-snug"
            style={{ color: 'var(--text)', letterSpacing: '-0.005em' }}
          >
            {ex.title}
          </div>
          <div
            className="line-clamp-2 text-[12px] leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {ex.description}
          </div>
          <div className="mt-auto flex flex-wrap gap-1 pt-1.5">
            <span
              className="font-mono text-[10px] tracking-[0.02em]"
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--r-sm)',
                background: 'var(--fill-muted)',
                color: 'var(--text-muted)',
              }}
            >
              {industry.label.toLowerCase()}
            </span>
          </div>
        </div>
      </Link>

      {/* Secondary link — playground strip */}
      <Link href={playgroundHref} className="gal-card-strip">
        open in playground →
      </Link>
    </article>
  );
}

export function GalleryGrid({ examples }: { examples: GalleryExample[] }) {
  if (examples.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {examples.map((ex) => (
        <GalleryCard key={ex.slug} ex={ex} />
      ))}
    </div>
  );
}
