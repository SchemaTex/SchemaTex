import Link from 'next/link';
import { render } from 'schematex';
import { Playground } from '@/components/Playground';
import { DiagramCard } from '@/components/DiagramCard';
import { CopyButton } from '@/components/CopyButton';
import { galleryExamples, heroDefault } from '@/lib/gallery-data';

const INSTALL_SNIPPET = `npm install schematex

import { render } from 'schematex';

const svg = render(\`
genogram "Smiths"
  john [male, 1950]
  mary [female, 1952]
  john -- mary
    alice [female, 1975, index]
\`);`;

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="border-b border-fd-border bg-gradient-to-b from-fd-background to-fd-muted/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs text-fd-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500" />
            Zero runtime dependencies · TypeScript strict · 13+ diagram types
          </div>
          <h1 className="text-balance text-5xl font-bold tracking-tight text-fd-foreground md:text-6xl">
            Text → SVG for the diagrams <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
              Mermaid forgot.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-fd-muted-foreground">
            Genograms, ecomaps, pedigrees, phylogenetic trees, sociograms, ladder logic,
            single-line diagrams, circuit schematics, and more — from plain text, following
            published standards (McGoldrick, IEEE 315, IEC 61131-3, Newick).
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/playground"
              className="rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground transition hover:opacity-90"
            >
              Try the playground →
            </Link>
            <Link
              href="/docs"
              className="rounded-lg border border-fd-border bg-fd-card px-5 py-2.5 font-medium text-fd-foreground transition hover:border-fd-primary"
            >
              Read the docs
            </Link>
            <a
              href="https://github.com/victorzhrn/Schematex"
              className="rounded-lg border border-fd-border bg-fd-card px-5 py-2.5 font-medium text-fd-foreground transition hover:border-fd-primary"
            >
              GitHub
            </a>
          </div>
          <div className="mt-10">
            <Playground initial={heroDefault} height={440} />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight text-fd-foreground md:text-4xl">
            Thirteen diagrams. One DSL.
          </h2>
          <p className="mt-3 max-w-2xl text-fd-muted-foreground">
            Each diagram type implements a published domain standard — not our own invention.
            Click any tile to see the DSL, live playground, and real-world case studies.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {galleryExamples.map((ex) => (
              <DiagramCard
                key={ex.slug}
                title={ex.title}
                blurb={ex.blurb}
                icon={ex.icon}
                href={`/docs/${ex.slug}`}
                preview={
                  <div
                    dangerouslySetInnerHTML={{
                      __html: safeRender(ex.dsl, ex.fallback),
                    }}
                  />
                }
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-fd-border bg-fd-muted/20 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Why Schematex?</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Feature
              title="Zero dependencies"
              body="No D3, no dagre, no parser generators. Hand-written parsers and layout engines. Entire library is self-contained TypeScript."
            />
            <Feature
              title="Standards-compliant"
              body="Each diagram implements a published specification — McGoldrick, IEEE 315, IEC 61131-3, Newick, Hartman, Moreno."
            />
            <Feature
              title="Semantic SVG"
              body="Accessible <title>/<desc>, CSS classes for theming, data-* attributes for interactivity. SSR-ready, no DOM required."
            />
            <Feature
              title="Tree-shakable"
              body="Import only what you need. `schematex/genogram` ships ~30 KB. 13 plugins, one consistent API."
            />
            <Feature
              title="TypeScript strict"
              body="No any, no un-typed escape hatches. Types are the spec — editor gives you the whole grammar as autocomplete."
            />
            <Feature
              title="Production-tested"
              body="Powering diagram rendering in ChatDiagram, ConceptMap, and MyMap.ai."
            />
          </div>
        </div>
      </section>

      {/* Install */}
      <section className="border-t border-fd-border px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Install in 10 seconds</h2>
          <div className="relative mt-8 overflow-hidden rounded-lg border border-fd-border bg-fd-card text-left">
            <CopyButton text={INSTALL_SNIPPET} className="absolute right-3 top-3 z-10" />
            <pre className="overflow-x-auto p-5 text-sm">
              <code>{INSTALL_SNIPPET}</code>
            </pre>
          </div>
          <div className="mt-6">
            <Link
              href="/docs"
              className="font-medium text-fd-primary hover:underline"
            >
              Full documentation →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-fd-border bg-fd-card p-6">
      <h3 className="mb-2 font-semibold text-fd-foreground">{title}</h3>
      <p className="text-sm text-fd-muted-foreground">{body}</p>
    </div>
  );
}

function safeRender(dsl: string, fallback: string): string {
  try {
    return render(dsl);
  } catch {
    return fallback;
  }
}
