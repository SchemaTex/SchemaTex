import { Playground } from '@/components/Playground';
import { DiagramIcon } from '@/components/DiagramIcon';
import { galleryExamples, heroDefault } from '@/lib/gallery-data';
import Link from 'next/link';

export const metadata = {
  title: 'Playground — paste LLM output, see SVG live',
  description:
    'Interactive Schematex playground. Edit the text DSL on the left, see the rendered SVG diagram on the right. Made for AI — paste ChatGPT or Claude output, get a professional diagram back. Works for all 20 diagram types.',
};

const CLUSTER_COLOR: Record<string, string> = {
  genogram: 'var(--cat-0)',
  ecomap: 'var(--cat-0)',
  pedigree: 'var(--cat-0)',
  sociogram: 'var(--cat-0)',
  phylo: 'var(--cat-1)',
  block: 'var(--cat-1)',
  fishbone: 'var(--cat-1)',
  decision: 'var(--cat-1)',
  timing: 'var(--cat-2)',
  logic: 'var(--cat-2)',
  circuit: 'var(--cat-2)',
  ladder: 'var(--cat-2)',
  sld: 'var(--cat-2)',
  entity: 'var(--cat-3)',
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
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-12">
      {/* Page header */}
      <div className="mb-8 pb-8" style={{ borderBottom: '1px solid var(--fill-muted)' }}>
        <p className="type-eye mb-3">/ PLAYGROUND</p>
        <h1
          className="mb-3 text-[40px] font-semibold leading-none"
          style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
        >
          Live editor
        </h1>
        <p className="text-[15px]" style={{ color: 'var(--text-muted)', maxWidth: 640 }}>
          Edit the DSL on the left. Diagram re-renders on the right. Pick a preset below
          to start from a real example, or paste output from ChatGPT / Claude — the DSL
          is designed for LLMs to emit on the first try.
        </p>
      </div>

      {/* Preset rail — bordered card wrap */}
      <div
        className="mb-5 grid items-center gap-3"
        style={{
          gridTemplateColumns: 'auto 1fr',
          border: '1px solid var(--fill-muted)',
          borderRadius: 'var(--r)',
          background: 'var(--fill)',
          padding: '10px 14px',
        }}
      >
        <span
          className="type-eye shrink-0 pr-3"
          style={{ borderRight: '1px solid var(--fill-muted)' }}
        >
          PRESETS ·
        </span>
        <div className="flex gap-1.5 overflow-x-auto py-0.5" style={{ scrollbarWidth: 'thin' }}>
          {galleryExamples.map((ex) => {
            const isActive = ex.slug === example || (!example && ex.slug === 'genogram');
            const dotColor = CLUSTER_COLOR[ex.icon] ?? 'var(--neutral)';
            return (
              <Link
                key={ex.slug}
                href={`/playground?example=${ex.slug}`}
                className="flex shrink-0 flex-col p-1.5 transition"
                style={{
                  width: 92,
                  border: '1px solid var(--fill-muted)',
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--bg)',
                  ...(isActive
                    ? { borderColor: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' }
                    : {}),
                }}
              >
                {/* Thumbnail */}
                <div
                  className="dot-grid mb-1.5 flex items-center justify-center rounded-sm"
                  style={{ height: 60, color: 'var(--stroke)' }}
                >
                  <DiagramIcon
                    type={ex.icon}
                    size={26}
                    style={{ color: isActive ? 'var(--text)' : 'var(--stroke)' }}
                  />
                </div>
                {/* Name row */}
                <div
                  className="flex items-center gap-1 font-mono text-[11px]"
                  style={{ color: isActive ? 'var(--accent-ink)' : 'var(--text-muted)' }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <span className="truncate">{ex.slug}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Editor panel */}
      <Playground key={example ?? 'default'} initial={initial} height={640} />
    </div>
  );
}
