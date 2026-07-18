import { InteractivePreviewLab } from './InteractivePreviewLab';

export const metadata = {
  title: 'Interactive editing preview',
  description: 'Edit diagram text and reposition safe geometry while the Schematex DSL stays in sync.',
};

const STEPS = [
  ['01', 'Select', 'On editable specimens, click a node or edge label to highlight its exact DSL range.'],
  ['02', 'Rename', 'Text-enabled tabs support direct label editing—even when their layout must remain automatic.'],
  ['03', 'Reposition', 'Drag-enabled tabs expose only safe visual axes; drop writes native DSL or @overrides.'],
] as const;

export default function InteractiveEditingPreview() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-12">
      <div className="mb-8" style={{ maxWidth: 760 }}>
        <p className="type-eye mb-3">/ INTERACTIVE EDITING PREVIEW</p>
        <h1
          className="mb-3 text-[40px] font-semibold leading-none"
          style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
        >
          Edit the diagram. Keep the source.
        </h1>
        <p className="text-[15px] leading-6" style={{ color: 'var(--text-muted)' }}>
          Every gesture writes deterministic DSL—no hidden canvas state and no LLM call.
          Monaco keeps the edit in its normal undo history.
        </p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--positive)' }}>
          20 parser-native Canvas engines · 17 with safe position editing · all 50 available as test specimens
        </p>
      </div>

      <div className="sx-interactive-steps mb-5 grid gap-3 md:grid-cols-3">
        {STEPS.map(([number, title, detail]) => (
          <section
            key={number}
            className="p-4"
            style={{
              border: '1px solid var(--line)',
              borderRadius: 'var(--r)',
              background: 'var(--fill)',
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
              <span className="font-mono text-[12px]" style={{ color: 'var(--accent)' }}>{number}</span>
            </div>
            <p className="text-[12px] leading-5" style={{ color: 'var(--text-muted)' }}>{detail}</p>
          </section>
        ))}
      </div>

      <InteractivePreviewLab />
    </main>
  );
}
