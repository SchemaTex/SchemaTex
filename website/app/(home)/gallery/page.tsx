import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  DIAGRAM_LABELS,
  INDUSTRY_LABELS,
  type GalleryExample,
  type DiagramType,
  type Industry,
} from '@/lib/gallery-examples';
import { allExamples } from '@/lib/examples-source';
import { GalleryGrid } from '@/components/GalleryGrid';
import { GalleryFilterBar } from '@/components/GalleryFilterBar';

export const metadata: Metadata = {
  title: 'Gallery — the diagrams doctors, engineers, and lawyers actually use',
  description:
    '20 real-world Schematex diagrams across healthcare, industrial, legal, education, and research. Every example follows a published standard — copy the DSL, open in playground, ship. Free, fully open source, made for AI.',
  alternates: { canonical: 'https://schematex.js.org/gallery' },
};

interface SearchParamsShape {
  type?: string;
  industry?: string;
  q?: string;
}

function parseDiagram(v: string | undefined): DiagramType | null {
  if (!v) return null;
  return v in DIAGRAM_LABELS ? (v as DiagramType) : null;
}

function parseIndustry(v: string | undefined): Industry | null {
  if (!v) return null;
  return v in INDUSTRY_LABELS ? (v as Industry) : null;
}

function toGalleryExample(ex: (typeof allExamples)[number]): GalleryExample {
  return {
    slug: ex.slug,
    title: ex.title,
    description: ex.description ?? ex.title,
    diagram: ex.diagram as DiagramType,
    industry: (ex.industry[0] ?? 'healthcare') as Industry,
    complexity: ex.complexity as 1 | 2 | 3,
    standard: ex.standard ?? '',
    dsl: ex.dsl,
    hasDetailPage: true,
  };
}

const galleryExamples: GalleryExample[] = allExamples.map(toGalleryExample);

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const params = await searchParams;
  const activeDiagram = parseDiagram(params.type);
  const activeIndustry = parseIndustry(params.industry);
  const activeQuery = (params.q ?? '').trim();
  const q = activeQuery.toLowerCase();

  const filtered = galleryExamples.filter((ex) => {
    if (activeDiagram !== null && ex.diagram !== activeDiagram) return false;
    if (activeIndustry !== null && ex.industry !== activeIndustry) return false;
    if (q) {
      const hay = `${ex.title} ${ex.description} ${ex.standard}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <main className="flex flex-1 flex-col">
      {/* Header */}
      <section className="border-b px-6 pb-8 pt-12" style={{ borderColor: 'var(--fill-muted)' }}>
        <div className="mx-auto max-w-6xl">
          <p className="type-eye mb-3">/ GALLERY</p>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="ds-badge">{galleryExamples.length} examples</span>
            <span className="ds-badge">14 diagram types</span>
            <span className="ds-badge">4 clusters</span>
          </div>
          <h1
            className="text-3xl font-semibold"
            style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
          >
            The diagrams doctors, engineers, and lawyers actually use.
          </h1>
          <p className="mt-2 max-w-xl text-sm" style={{ color: 'var(--text-muted)' }}>
            20 real-world Schematex diagrams — clinical genograms, IEC 61131-3 ladder
            logic, NSGC pedigrees, cap tables, and more. Every one follows a published
            standard. Copy the DSL, open in playground, ship.
          </p>
        </div>
      </section>

      {/* Filter bar + grid */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<div className="py-6" />}>
            <GalleryFilterBar
              examples={galleryExamples}
              totalCount={galleryExamples.length}
              visibleCount={filtered.length}
              activeDiagram={activeDiagram}
              activeIndustry={activeIndustry}
              activeQuery={activeQuery}
            />
          </Suspense>

          <div className="mt-8">
            {filtered.length > 0 ? (
              <GalleryGrid examples={filtered} />
            ) : (
              <EmptyState />
            )}
          </div>

          {filtered.length > 0 && (
            <div className="mt-16 rounded-2xl border border-fd-border bg-fd-muted/20 p-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">
                Need a diagram type we don&apos;t cover yet?
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-fd-muted-foreground">
                Schematex is built around published standards. If your domain has one,
                we&apos;d like to hear about it — open an issue or a PR.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link
                  href="/playground"
                  className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition hover:opacity-90"
                >
                  Try the playground →
                </Link>
                <a
                  href="https://github.com/victorzhrn/Schematex/issues"
                  className="rounded-lg border border-fd-border bg-fd-card px-4 py-2 text-sm font-medium text-fd-foreground transition hover:border-fd-primary"
                >
                  Request a diagram type
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center"
      style={{
        border: '1px dashed var(--fill-muted)',
        borderRadius: 'var(--r)',
        background: 'var(--fill)',
      }}
    >
      <div
        className="mb-4 font-mono text-2xl"
        style={{ color: 'var(--text-muted)', opacity: 0.5 }}
      >
        / 0
      </div>
      <p className="font-mono text-sm" style={{ color: 'var(--text)' }}>No examples match</p>
      <p className="mt-1 max-w-sm text-xs" style={{ color: 'var(--text-muted)' }}>
        Try removing one of the filters, or start fresh.
      </p>
      <Link href="/gallery" className="ds-badge mt-4 hover:border-[color:var(--accent)]">
        Clear filters
      </Link>
    </div>
  );
}
