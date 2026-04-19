import { Playground } from '@/components/Playground';
import { DiagramIcon } from '@/components/DiagramIcon';
import { galleryExamples, heroDefault } from '@/lib/gallery-data';
import Link from 'next/link';

export const metadata = {
  title: 'Playground — edit DSL, see SVG live',
  description:
    'Interactive Schematex playground. Edit the text DSL on the left, see the rendered SVG diagram on the right. Works for all 20 diagram types.',
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
      {/* Example rail — DS ex-tile style */}
      <div
        className="shrink-0 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--fill-muted)' }}
      >
        <div className="flex min-w-max gap-0 px-4 py-3">
          {galleryExamples.map((ex) => {
            const isActive = ex.slug === example || (!example && ex.slug === 'genogram');
            return (
              <Link
                key={ex.slug}
                href={`/playground?example=${ex.slug}`}
                className="group flex w-[130px] shrink-0 flex-col items-center gap-2 px-3 py-2.5 transition"
                style={{
                  border: '1px solid transparent',
                  borderRadius: 'var(--r-sm)',
                  borderColor: isActive ? 'var(--accent)' : 'transparent',
                  boxShadow: isActive ? 'inset 0 0 0 1px var(--accent)' : 'none',
                }}
              >
                <DiagramIcon
                  type={ex.icon}
                  size={28}
                  className={isActive ? 'text-fd-foreground' : 'text-fd-muted-foreground'}
                />
                <span
                  className="font-mono text-[11px]"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {ex.slug}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-3">
        <Playground key={example ?? 'default'} initial={initial} fill />
      </div>
    </div>
  );
}
