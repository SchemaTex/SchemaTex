import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  CLUSTER_TO_TYPES,
  INDUSTRY_LABELS,
  galleryExamples,
  type Industry,
} from '@/lib/gallery-examples';

type ClusterKey = keyof typeof CLUSTER_TO_TYPES;
import { GalleryGrid } from '@/components/GalleryGrid';
import { GalleryFilterBar } from '@/components/GalleryFilterBar';

export const metadata: Metadata = {
  title: 'Gallery — 20 real-world diagrams · Schematex',
  description:
    '20 real-world Schematex diagrams across healthcare, industrial, legal, education, and research. Every example follows a published standard — copy the DSL, open in playground, ship.',
  alternates: { canonical: 'https://schematex.dev/gallery' },
};

interface SearchParamsShape {
  cluster?: string;
  industry?: string;
  q?: string;
}

function parseCluster(v: string | undefined): ClusterKey | null {
  if (!v) return null;
  return v in CLUSTER_TO_TYPES ? (v as ClusterKey) : null;
}

function parseIndustry(v: string | undefined): Industry | null {
  if (!v) return null;
  return v in INDUSTRY_LABELS ? (v as Industry) : null;
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const params = await searchParams;
  const activeCluster = parseCluster(params.cluster);
  const activeIndustry = parseIndustry(params.industry);
  const activeQuery = (params.q ?? '').trim();
  const clusterTypes = activeCluster ? CLUSTER_TO_TYPES[activeCluster] : undefined;
  const q = activeQuery.toLowerCase();

  const filtered = galleryExamples.filter((ex) => {
    if (clusterTypes !== undefined && !clusterTypes.includes(ex.diagram)) return false;
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
      <section className="border-b border-fd-border bg-gradient-to-b from-fd-background to-fd-muted/20 px-6 pb-8 pt-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs text-fd-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {galleryExamples.length} examples · 14 diagram types · 6 industries
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-fd-foreground md:text-5xl">
            Gallery
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-fd-muted-foreground">
            20 real-world diagrams across 4 domains. Every one follows a published
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
              activeCluster={activeCluster}
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-fd-border bg-fd-card/40 py-20 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-fd-muted/40 text-xl">
        🔎
      </div>
      <h2 className="text-lg font-semibold text-fd-foreground">No examples match</h2>
      <p className="mt-1 max-w-sm text-sm text-fd-muted-foreground">
        Try removing one of the filters, or start fresh.
      </p>
      <Link
        href="/gallery"
        className="mt-4 inline-flex items-center gap-1 rounded-md border border-fd-border bg-fd-card px-3 py-1.5 text-sm font-medium text-fd-foreground transition hover:border-fd-primary"
      >
        Clear filters
      </Link>
    </div>
  );
}
