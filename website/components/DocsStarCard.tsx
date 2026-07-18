import { GithubStarButton } from '@/components/GithubStarButton';

/**
 * Quiet "star us" card rendered at the foot of every docs page — the moment the
 * reader has just been helped. Reciprocity framing (free / open / zero-dep),
 * not a plea. Tagged `docs_footer` so we can compare it to other placements.
 */
export function DocsStarCard({ stars }: { stars: number }) {
  return (
    <div
      className="mt-12 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--r)',
        background: 'var(--fill)',
      }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fd-foreground">Found this useful?</p>
        <p className="mt-0.5 text-[13px] text-fd-muted-foreground">
          Schematex is free, fully open source, and zero-dependency. A star helps other
          developers discover it.
        </p>
      </div>
      <div className="shrink-0">
        <GithubStarButton stars={stars} source="docs_footer" />
      </div>
    </div>
  );
}
