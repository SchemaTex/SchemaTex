import Link from 'next/link';
import { render } from 'schematex';
import { DiagramFrame } from '@/components/DiagramFrame';
import { getExample } from '@/lib/examples-source';
import { CopyButton } from '@/components/CopyButton';

const PREVIEW_SLUGS = [
  {
    slug: 'matrix-eisenhower-week',
    note: 'Was scatter-plot before — now four-quadrant table. The "I MEANT TABLE" fix.',
  },
  {
    slug: 'matrix-impact-effort',
    note: 'New. PM backlog grouping into Quick Wins / Major Projects / Fill-ins / Thankless.',
  },
  {
    slug: 'matrix-johari-window',
    note: 'New. Coaching exercise: Open / Blind / Hidden / Unknown panes with bullet items.',
  },
  {
    slug: 'matrix-9-box-talent',
    note: 'New. 3×3 talent grid. Demonstrates style: table on 3×3 (not just 2×2).',
  },
  {
    slug: 'flowchart-prisma-systematic-review',
    note: 'New. PRISMA 2020 systematic review flow — uses subgraph + class for the canonical four-phase layout. No new engine, just flowchart.',
  },
];

export const metadata = {
  title: 'Preview — 2026-05-04 matrix table mode + PRISMA',
  robots: { index: false, follow: false },
};

interface RenderResult {
  ok: true;
  svg: string;
}
interface RenderError {
  ok: false;
  message: string;
}

function safeRender(dsl: string): RenderResult | RenderError {
  try {
    return { ok: true, svg: render(dsl) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export default function PreviewPage() {
  const items = PREVIEW_SLUGS.map(({ slug, note }) => {
    const ex = getExample(slug);
    if (!ex) return { slug, note, missing: true as const };
    return { slug, note, ex, render: safeRender(ex.dsl) };
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <p className="mb-1 text-xs uppercase tracking-wider text-fd-muted-foreground">
          internal preview · not indexed
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-fd-foreground md:text-4xl">
          Matrix table-mode + PRISMA flowchart
        </h1>
        <p className="mt-3 text-base leading-relaxed text-fd-muted-foreground">
          Five new / updated examples shipping with the {' '}
          <code className="rounded bg-fd-muted px-1.5 py-0.5 text-sm">style: table</code>{' '}
          matrix directive and the canonical PRISMA 2020 flowchart pattern. Goal: fix the
          production failure mode where AI emits a scatter-plot when the user wanted a
          four-cell table, and ship the systematic-review template the research market
          asks for.
        </p>
        <p className="mt-3 text-sm text-fd-muted-foreground opacity-80">
          See {' '}
          <Link href="/docs" className="text-fd-primary hover:underline">
            /docs
          </Link>
          {' '}or each example's{' '}
          <code className="rounded bg-fd-muted px-1.5 py-0.5 text-sm">/examples/&lt;slug&gt;</code>{' '}
          page for the full annotation. This page is just an at-a-glance preview before
          merging.
        </p>
      </header>

      <ul className="space-y-12">
        {items.map((item) => (
          <li key={item.slug} className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-xl font-semibold text-fd-foreground">
                {item.missing ? item.slug : item.ex.title}
              </h2>
              <Link
                href={`/examples/${item.slug}`}
                className="text-sm text-fd-primary hover:underline"
              >
                /examples/{item.slug} →
              </Link>
            </div>
            <p className="text-sm text-fd-muted-foreground">{item.note}</p>

            {item.missing ? (
              <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                MDX file not found at content/examples/{item.slug}.mdx — did the source
                rebuild fail?
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                <DiagramFrame
                  diagram={item.ex.diagram}
                  standard={item.ex.standard ?? ''}
                  actions={<CopyButton text={item.ex.dsl} label="Copy DSL" />}
                >
                  <div
                    className="flex w-full items-center justify-center overflow-auto p-4 [&_svg]:!max-w-full [&_svg]:!h-auto"
                    style={{ minHeight: 320 }}
                  >
                    {item.render.ok ? (
                      <div
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: item.render.svg }}
                        className="w-full"
                        style={{ maxWidth: '100%' }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm text-red-700">
                        Render error: {item.render.message}
                      </pre>
                    )}
                  </div>
                </DiagramFrame>
                <pre
                  className="overflow-auto rounded-md border bg-fd-muted/40 p-3 font-mono text-[12px] leading-relaxed text-fd-foreground"
                  style={{ maxHeight: 480, borderColor: 'var(--fill-muted)' }}
                >
                  {item.ex.dsl}
                </pre>
              </div>
            )}
          </li>
        ))}
      </ul>

      <footer className="mt-16 border-t pt-6 text-sm text-fd-muted-foreground" style={{ borderColor: 'var(--fill-muted)' }}>
        <p>
          When approved, the engine change (matrix renderer + parser) and 5 MDX files
          ship together. Reference docs already updated:{' '}
          <code>docs/reference/14-FLOWCHART-STANDARD.md §15.5</code> and{' '}
          <code>docs/reference/18-MATRIX-STANDARD.md §11.5</code>.
        </p>
      </footer>
    </main>
  );
}
