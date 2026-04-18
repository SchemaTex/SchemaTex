import { Playground } from '@/components/Playground';
import { galleryExamples, heroDefault } from '@/lib/gallery-data';
import Link from 'next/link';

export const metadata = {
  title: 'Playground — edit DSL, see SVG live',
  description:
    'Interactive Schematex playground. Edit the text DSL on the left, see the rendered SVG diagram on the right. Works for all 13 diagram types.',
};

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ example?: string }>;
}) {
  const { example } = await searchParams;
  const active = galleryExamples.find((ex) => ex.slug === example);
  const initial = active?.dsl ?? heroDefault;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
          <p className="text-fd-muted-foreground">
            Edit the DSL on the left — SVG renders live on the right.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {galleryExamples.map((ex) => {
            const isActive = ex.slug === example;
            return (
              <Link
                key={ex.slug}
                href={`/playground?example=${ex.slug}`}
                className={
                  'rounded-md border px-2.5 py-1 transition ' +
                  (isActive
                    ? 'border-fd-primary bg-fd-primary/10 text-fd-foreground'
                    : 'border-fd-border bg-fd-card text-fd-muted-foreground hover:border-fd-primary hover:text-fd-foreground')
                }
              >
                {ex.icon} {ex.title}
              </Link>
            );
          })}
        </div>
      </div>
      <Playground key={example ?? 'default'} initial={initial} height={600} />
    </main>
  );
}
