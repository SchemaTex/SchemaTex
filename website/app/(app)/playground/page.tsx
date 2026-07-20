import { PlaygroundWorkspace } from '@/components/PlaygroundWorkspace';
import type {
  DiagramExampleOption,
  DiagramTypeOption,
} from '@/components/DiagramExampleBrowser';
import { allExamples } from '@/lib/examples-source';
import { DIAGRAM_TYPE_COUNT } from '@/lib/diagram-stats';
import { resolveUseCase, USE_CASE_LABELS } from '@/lib/use-cases';
import { getInteractiveCapabilities, type InteractiveCapabilities } from 'schematex';
import { getDiagramMeta, listDiagrams } from 'schematex/ai';

const registry = listDiagrams();
const examplesByType = new Map<string, typeof allExamples>();
for (const example of allExamples) {
  const type = getDiagramMeta(example.diagram)?.type;
  if (!type) continue;
  const entries = examplesByType.get(type) ?? [];
  entries.push(example);
  examplesByType.set(type, entries);
}

const types: DiagramTypeOption[] = registry.map((entry) => {
  const type = entry.type as InteractiveCapabilities['type'];
  const starters = [...(examplesByType.get(entry.type) ?? [])]
    .sort((a, b) => a.complexity - b.complexity || a.dsl.length - b.dsl.length);
  return {
    type,
    name: entry.name,
    cluster: entry.cluster,
    standard: entry.standard,
    standardAlso: entry.standardAlso,
    starterSlug: starters[0]?.slug,
    capability: getInteractiveCapabilities(type),
  };
});

const galleryExamples: DiagramExampleOption[] = allExamples.flatMap((example) => {
  const meta = getDiagramMeta(example.diagram);
  if (!meta) return [];
  const type = meta.type as InteractiveCapabilities['type'];
  const useCase = resolveUseCase(example.industry);
  return [{
    id: example.slug,
    title: example.title,
    type,
    typeName: meta.name,
    cluster: meta.cluster,
    standard: meta.standard,
    useCases: [{ id: useCase, label: USE_CASE_LABELS[useCase].label }],
    note: example.description,
  }];
}).sort((a, b) => {
  const capabilityRank = (entry: DiagramExampleOption) => {
    const capability = getInteractiveCapabilities(entry.type);
    if (capability.position === 'free') return 0;
    if (capability.position !== 'none') return 1;
    return capability.text.length > 0 ? 2 : 3;
  };
  return capabilityRank(a) - capabilityRank(b) || a.title.localeCompare(b.title);
});

export const metadata = {
  title: 'Playground — edit industry-standard diagrams',
  description:
    `Full-screen Schematex editor with round-trip source and canvas editing, ${DIAGRAM_TYPE_COUNT} diagram engines, standards-aware position constraints, SVG, PNG, and PDF export.`,
  alternates: { canonical: 'https://schematex.js.org/playground' },
};

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ example?: string }>;
}) {
  const { example } = await searchParams;
  const initialExample = example
    ? galleryExamples.find((entry) => entry.id === example) ?? galleryExamples[0]
    : undefined;
  const initialDsl = initialExample
    ? allExamples.find((entry) => entry.slug === initialExample.id)?.dsl ?? 'flowchart'
    : '';
  return (
    <div className="sx-playground-page">
      <PlaygroundWorkspace
        examples={galleryExamples}
        types={types}
        initialId={initialExample?.id}
        initialDsl={initialDsl}
      />

      <section className="sx-playground-seo" aria-labelledby="playground-heading">
        <p className="type-eye">/ ROUND-TRIP DIAGRAM EDITOR</p>
        <h1 id="playground-heading">Edit industry-standard diagrams without losing the source.</h1>
        <p>
          Schematex keeps every canvas gesture as deterministic DSL. The editor exposes only the
          labels, axes, and native geometry that each diagram standard can change safely; all
          other structure remains explicit and reviewable in source.
        </p>
        <div className="sx-standards-table-wrap">
          <table className="sx-standards-table">
            <caption>{registry.length} engines and their canonical editing contracts</caption>
            <thead>
              <tr><th>Diagram</th><th>Standard</th><th>Canvas contract</th><th>Why constrained</th></tr>
            </thead>
            <tbody>
              {registry.map((entry) => {
                const capability = getInteractiveCapabilities(entry.type as InteractiveCapabilities['type']);
                return (
                  <tr key={entry.type}>
                    <th scope="row">{entry.name}</th>
                    <td>§ {entry.standard}</td>
                    <td>{capability.text.join(', ') || 'source only'} · {capability.position}</td>
                    <td>{capability.reason ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
