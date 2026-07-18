import { PlaygroundWorkspace } from '@/components/PlaygroundWorkspace';
import type { DiagramExampleOption } from '@/components/DiagramExampleBrowser';
import { allExamples } from '@/lib/examples-source';
import { DIAGRAM_TYPE_COUNT } from '@/lib/diagram-stats';
import { getRepoStats } from '@/lib/github-stats';
import { getDiagramMeta } from 'schematex/ai';
import { getInteractiveCapabilities } from 'schematex';

const heroDefault = `genogram "The Smiths"
  john [male, 1950]
  mary [female, 1952]
  john -- mary
    alice [female, 1975, index]
    bob [male, 1978]
  alice -close- mary
  alice -hostile- bob`;

const galleryExamples: DiagramExampleOption[] = allExamples.map((example) => {
  const meta = getDiagramMeta(example.diagram);
  const capability = meta ? getInteractiveCapabilities(meta.type) : null;
  return {
    id: example.slug,
    title: example.title,
    type: meta?.name ?? example.diagram,
    group: meta?.cluster ?? 'other',
    status: !capability || capability.text.length === 0
      ? 'source editing only'
      : capability.position === 'none'
        ? 'canvas text editing'
        : `${capability.position} + text editing`,
    note: example.description,
    dsl: example.dsl,
  };
});

export const metadata = {
  title: 'Playground — paste LLM output, see SVG live',
  description:
    `Interactive Schematex playground. Edit the text DSL on the left, see the rendered SVG diagram on the right. Made for AI — paste ChatGPT or Claude output, get a professional diagram back. Works for all ${DIAGRAM_TYPE_COUNT} diagram types.`,
  alternates: { canonical: 'https://schematex.js.org/playground' },
};

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ example?: string }>;
}) {
  const { example } = await searchParams;
  const examples = galleryExamples.length > 0
    ? galleryExamples
    : [{ id: 'default', title: 'The Smiths', type: 'Genogram', group: 'relationships', status: 'text + drag', dsl: heroDefault }];
  const { stars } = await getRepoStats();

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-10 sm:px-6">
      {/* Page header */}
      <div className="mb-8 pb-8" style={{ borderBottom: '1px solid var(--line)' }}>
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

      <PlaygroundWorkspace examples={examples} initialId={example} stars={stars} />
    </div>
  );
}
