import Link from 'next/link';
import { render } from 'schematex';
import {
  DIAGRAM_LABELS,
  INDUSTRY_LABELS,
  type Complexity,
  type GalleryExample,
} from '@/lib/gallery-examples';

function safeRender(dsl: string): string {
  try {
    return render(dsl);
  } catch {
    return '';
  }
}

function ComplexityDots({ level }: { level: Complexity }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Complexity ${level} of 3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={
            'block size-1.5 rounded-full ' +
            (i <= level ? 'bg-fd-foreground/80' : 'bg-fd-border')
          }
        />
      ))}
    </span>
  );
}

function GalleryCard({ ex }: { ex: GalleryExample }) {
  const svg = safeRender(ex.dsl);
  const diagram = DIAGRAM_LABELS[ex.diagram];
  const industry = INDUSTRY_LABELS[ex.industry];
  const detailHref = ex.hasDetailPage ? `/examples/${ex.slug}` : null;
  const playgroundHref = `/playground?example=${ex.slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card transition-all hover:border-fd-primary/50 hover:shadow-md">
      {/* Preview */}
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-white p-4">
        <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 backdrop-blur">
          <span>{diagram.icon}</span>
          <span>{diagram.label}</span>
        </div>
        {svg ? (
          <div
            className="h-full w-full [&_svg]:mx-auto [&_svg]:max-h-full [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="text-xs text-zinc-400">Preview unavailable</div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col border-t border-fd-border p-4">
        <h3 className="text-[15px] font-semibold leading-snug text-fd-foreground">
          {ex.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-fd-muted-foreground">
          {ex.description}
        </p>

        {/* Meta chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded border border-fd-border bg-fd-background px-1.5 py-0.5 font-medium text-fd-muted-foreground">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <span>{ex.standard}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-fd-border bg-fd-background px-1.5 py-0.5 font-medium text-fd-muted-foreground">
            <span>{industry.icon}</span>
            <span>{industry.label}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded border border-fd-border bg-fd-background px-1.5 py-0.5 font-medium text-fd-muted-foreground">
            <ComplexityDots level={ex.complexity} />
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-fd-border pt-3">
          <Link
            href={playgroundHref}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-fd-primary px-2.5 py-1.5 text-xs font-medium text-fd-primary-foreground transition hover:opacity-90"
          >
            Open in Playground
            <span aria-hidden>→</span>
          </Link>
          {detailHref && (
            <Link
              href={detailHref}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-fd-border bg-fd-card px-2.5 py-1.5 text-xs font-medium text-fd-foreground transition hover:border-fd-primary hover:text-fd-primary"
            >
              View details
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function GalleryGrid({ examples }: { examples: GalleryExample[] }) {
  if (examples.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {examples.map((ex) => (
        <GalleryCard key={ex.slug} ex={ex} />
      ))}
    </div>
  );
}
