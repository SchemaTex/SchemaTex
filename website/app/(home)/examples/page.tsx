import Link from 'next/link';
import { render } from 'schematex';
import { exampleSections, examplesBySlug, examples } from '@/lib/examples-data';

export const metadata = {
  title: 'Examples gallery — real-world Schematex diagrams',
  description:
    'Browse real-world Schematex diagrams across every domain — family therapy genograms, clinical pedigrees, PLC ladder logic, power single-line diagrams, cap tables. Copy the DSL, adapt it, ship it.',
};

const FALLBACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" role="img" aria-label="Preview unavailable"><rect width="200" height="120" fill="transparent"/><text x="100" y="64" text-anchor="middle" font-family="system-ui" font-size="11" fill="#999">preview unavailable</text></svg>`;

function safeRender(dsl: string): string {
  try {
    return render(dsl);
  } catch {
    return FALLBACK;
  }
}

export default function ExamplesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <header className="mb-12 max-w-3xl">
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-fd-foreground md:text-5xl">
          Examples gallery
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-fd-muted-foreground">
          Real-world Schematex diagrams across every domain. Each example
          includes the complete DSL source and a live, editable playground —
          copy, adapt, ship.
        </p>
        <p className="mt-4 text-sm text-fd-muted-foreground">
          Looking for syntax reference?{' '}
          <Link href="/docs" className="text-fd-primary hover:underline">
            Read the docs →
          </Link>
        </p>
      </header>

      {exampleSections.map((section) => {
        const items = section.slugs
          .map((s) => examplesBySlug.get(s))
          .filter((x): x is NonNullable<typeof x> => Boolean(x));
        if (items.length === 0) return null;
        return (
          <section key={section.label} className="mb-14">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-fd-muted-foreground">
              {section.label}
            </h2>
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((ex) => (
                <li key={ex.slug}>
                  <Link
                    href={`/examples/${ex.slug}`}
                    className="group block overflow-hidden rounded-xl border border-fd-border bg-fd-card transition hover:border-fd-foreground/30"
                  >
                    <div className="flex h-44 items-center justify-center overflow-hidden border-b border-fd-border bg-white p-3">
                      <div
                        className="[&_svg]:max-h-full [&_svg]:max-w-full"
                        dangerouslySetInnerHTML={{ __html: safeRender(ex.dsl) }}
                      />
                    </div>
                    <div className="p-4">
                      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-fd-muted-foreground">
                        <span>{ex.diagram}</span>
                        <span className="opacity-40">·</span>
                        <span>{ex.standard}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-fd-foreground group-hover:text-fd-primary">
                        {ex.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fd-muted-foreground">
                        {ex.description}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <footer className="border-t border-fd-border pt-8 text-sm text-fd-muted-foreground">
        {examples.length} examples · curated from the Schematex test suite.
      </footer>
    </main>
  );
}
