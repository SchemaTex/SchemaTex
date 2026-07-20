import Link from 'next/link';
import { DIAGRAM_TYPE_COUNT } from '@/lib/diagram-stats';
import { buildDiagramEntries } from '@/lib/diagrams-index';

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
        <p>Choose any diagram to open its simplest working example in the playground.</p>
      </div>
      <div className="sx-contact-sheet" data-diagram-count={entries.length}>
        {entries.map((entry) => {
          const example = entry.examples[0];
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
