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
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-fd-border px-4 py-2 text-xs">
        <span className="shrink-0 text-fd-muted-foreground">Templates:</span>
        {galleryExamples.map((ex) => {
          const isActive = ex.slug === example;
          return (
            <Link
              key={ex.slug}
              href={`/playground?example=${ex.slug}`}
              className={
                'shrink-0 rounded-md border px-2 py-1 transition ' +
                (isActive
                  ? 'border-fd-primary bg-fd-primary/10 text-fd-foreground'
                  : 'border-fd-border bg-fd-card text-fd-muted-foreground hover:border-fd-primary hover:text-fd-foreground')
              }
            >
              <span className="mr-1">{ex.icon}</span>
              {ex.title}
            </Link>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 p-3">
        <Playground key={example ?? 'default'} initial={initial} fill />
      </div>
    </div>
  );
}
