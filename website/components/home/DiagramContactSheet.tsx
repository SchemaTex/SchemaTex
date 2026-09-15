import Link from 'next/link';
import { DIAGRAM_TYPE_COUNT } from '@/lib/diagram-stats';
import { buildDiagramEntries } from '@/lib/diagrams-index';
import type { DiagramType } from 'schematex/ai';

// A cell shows the example that reads best at thumbnail size: a fuller, real-world
// case where one stays legible at 150px; otherwise the type's simplest example.
const SHOWCASE_SLUG: Partial<Record<DiagramType, string>> = {
  genogram: 'genogram-bennett-three-generation',
  pedigree: 'pedigree-haemophilia-a-cousin-union',
  logic: 'logic-2bit-magnitude-comparator',
  matrix: 'matrix-bcg-consumer-health',
  petri: 'petri-semaphore-mutex-fire-sequence',
  phylo: 'phylo-bacterial-diversity-rectangular',
  floorplan: 'floorplan-linden-house-ground-floor',
  decisiontree: 'decisiontree-subscriber-renewal-churn',
  evacuation: 'evacuation-office-wing-level-2',
  playbook: 'playbook-basketball-horns-skip',
  mindmap: 'mindmap-revenue-growth-issue-tree',
  comparison: 'comparison-distribution-centre-site',
};

export function DiagramContactSheet() {
  const entries = buildDiagramEntries();
  if (entries.length !== DIAGRAM_TYPE_COUNT) {
    throw new Error(`Contact sheet registry mismatch: expected ${DIAGRAM_TYPE_COUNT}, got ${entries.length}.`);
  }

  return (
    <section className="sx-contact-sheet-section" aria-labelledby="contact-sheet-heading">
      <div className="sx-contact-sheet-copy">
        <p className="type-eye">/ THE FULL SET</p>
        <h2 id="contact-sheet-heading">
          All {DIAGRAM_TYPE_COUNT} of them. Every one follows a published standard.
        </h2>
        <p>Choose any diagram to open its example in the playground.</p>
      </div>
      <div className="sx-contact-sheet" data-diagram-count={entries.length}>
        {entries.map((entry) => {
          const showcase = SHOWCASE_SLUG[entry.type];
          const example = entry.examples.find((ex) => ex.slug === showcase) ?? entry.examples[0];
          if (!example?.svg) {
            throw new Error(`Contact sheet requires a renderable example for ${entry.type}.`);
          }
          return (
            <Link
              key={entry.type}
              href={`/playground?example=${example.slug}`}
              className="sx-contact-sheet-cell"
              aria-label={`${entry.name} — ${entry.standard}`}
            >
              <div className="sx-contact-sheet-svg" dangerouslySetInnerHTML={{ __html: example.svg }} />
              <span className="sx-contact-sheet-label">
                <b>{entry.name}</b>
                <span>§ {entry.standard}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
