import Link from 'next/link';
import { render } from 'schematex';
import { CopyButton } from '@/components/CopyButton';
import { HeroShowcase, type HeroSlide } from '@/components/HeroShowcase';
import { ClusterCard } from '@/components/ClusterCard';

// ───────────────────────────────────────────────────────────────────
// Hero slides — 3 diagrams rotating every ~6.5s
// ───────────────────────────────────────────────────────────────────

const HERO_GENOGRAM = `genogram "The Potters"
  fleamont [male, 1909, deceased]
  euphemia [female, 1920, deceased]
  fleamont -- euphemia
    james [male, 1960, deceased]
  evans_m [male, 1925, deceased]
  evans_f [female, 1928, deceased]
  evans_m -- evans_f
    lily [female, 1960, deceased]
    petunia [female, 1958]
  james -- lily "m. 1978"
    harry [male, 1980, index]
  petunia -- vernon [male, 1951]
    dudley [male, 1980]
  harry -close- lily
  harry -hostile- dudley`;

const HERO_LADDER = `ladder "Motor Control"
rung 1 "Start/Stop seal-in":
  XIC(START, "I:0.0/0", name="Start PB")
  XIO(STOP, "I:0.0/1", name="Stop PB")
  XIC(MOTOR_RUN, "O:0.0/0", name="Motor Run")
  OTE(MOTOR_RUN, "O:0.0/0", name="Motor Coil")
rung 2 "Fault indicator":
  XIC(OL_TRIP, "I:0.0/2", name="OL Relay")
  OTE(FAULT_LAMP, "O:0.0/1", name="Fault Lamp")`;

const HERO_ENTITY = `entity-structure "Acme Holdings"
entity trust "Founder Trust" trust@SD
entity parent "Acme Inc." corp@DE
entity uk "Acme UK Ltd." llc@UK
entity fund "Acme Growth Fund" fund@KY
trust -> parent : 100%
parent -> uk : 100%
parent -> fund : 60%`;

// ───────────────────────────────────────────────────────────────────
// Cluster preview DSLs
// ───────────────────────────────────────────────────────────────────

const CLUSTER_RELATIONSHIPS_DSL = `genogram "Family"
  j [male, 1950]
  m [female, 1952]
  j -- m
    a [female, 1975, index]
    b [male, 1978]
  a -close- m
  a -hostile- b`;

const CLUSTER_INDUSTRIAL_DSL = `ladder "Start/Stop"
rung 1 "Seal-in":
  XIC(START)
  XIO(STOP)
  OTE(MOTOR)`;

const CLUSTER_CORPORATE_DSL = `entity-structure "Holdings"
entity parent "Acme Inc." corp@DE
entity sub "Acme UK" llc@UK
entity fund "Growth Fund" fund@KY
parent -> sub : 100%
parent -> fund : 60%`;

const CLUSTER_CAUSALITY_DSL = `fishbone "Traffic drop"
effect "Traffic drop"
category content "Content"
category tech "Tech"
category links "Links"
content : "Publishing cadence slipped"
tech : "Core Web Vitals regressed"
links : "Lost 2 high-DR backlinks"`;

// ───────────────────────────────────────────────────────────────────
// Server-side safe render — never throws into the page
// ───────────────────────────────────────────────────────────────────

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" role="img" aria-label="Diagram preview unavailable"><rect width="200" height="120" fill="transparent"/><text x="100" y="64" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="#999">preview unavailable</text></svg>`;

function safeRender(dsl: string): string {
  try {
    return render(dsl);
  } catch {
    return FALLBACK_SVG;
  }
}

// ───────────────────────────────────────────────────────────────────
// Install tabs — static, server-rendered snippets
// ───────────────────────────────────────────────────────────────────

const SNIPPET_VANILLA = `import { render } from 'schematex';

const svg = render(\`
genogram "Smiths"
  john [male, 1950]
  mary [female, 1952]
  john -- mary
    alice [female, 1975, index]
\`);`;

const SNIPPET_NEXTJS = `import { render } from 'schematex';

export default function Page() {
  const svg = render(dsl);
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}`;

const SNIPPET_REACT_CLIENT = `'use client';
import { render } from 'schematex';
import { useMemo } from 'react';

export function Diagram({ dsl }: { dsl: string }) {
  const svg = useMemo(() => render(dsl), [dsl]);
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}`;

// ───────────────────────────────────────────────────────────────────
// Page
// ───────────────────────────────────────────────────────────────────

export default function HomePage() {
  const heroSlides: HeroSlide[] = [
    {
      label: 'Genogram',
      standard: 'McGoldrick 2020',
      dsl: HERO_GENOGRAM,
      svg: safeRender(HERO_GENOGRAM),
    },
    {
      label: 'Ladder logic',
      standard: 'IEC 61131-3',
      dsl: HERO_LADDER,
      svg: safeRender(HERO_LADDER),
    },
    {
      label: 'Entity structure',
      standard: 'Cap-table tier rollup',
      dsl: HERO_ENTITY,
      svg: safeRender(HERO_ENTITY),
    },
  ];

  return (
    <main className="flex flex-1 flex-col">
      {/* ────────────── HERO ────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden border-b border-fd-border px-6 pt-20 pb-24 md:pt-28 md:pb-32"
      >
        {/* Ambient backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-fd-primary)/6%,transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-fd-border to-transparent"
        />

        <div className="mx-auto max-w-6xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card/60 px-3 py-1 text-xs text-fd-muted-foreground backdrop-blur">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            v0.x — open source, AGPL-3.0
          </div>

          <h1
            id="hero-heading"
            className="max-w-4xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-fd-foreground md:text-6xl lg:text-7xl"
          >
            Standards-as-code
            <br />
            <span className="text-fd-muted-foreground">
              for professional diagrams.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-fd-muted-foreground">
            The open-source rendering engine for diagrams that follow real
            industry standards — McGoldrick genograms, IEC 61131-3 ladder
            logic, IEEE 315 single-line diagrams, Newick phylogenetic trees,
            and 10+ more.
          </p>

          {/* Pillar badges */}
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              'Zero runtime dependencies',
              '10+ industry standards',
              'LLM-native by design',
            ].map((p) => (
              <span
                key={p}
                className="rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs font-medium text-fd-foreground"
              >
                {p}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/playground"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-fd-foreground px-5 py-2.5 text-sm font-medium text-fd-background shadow-sm transition hover:opacity-90"
            >
              Try the Playground
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center rounded-lg border border-fd-border bg-fd-card px-5 py-2.5 text-sm font-medium text-fd-foreground transition hover:border-fd-foreground/30"
            >
              Read the docs
            </Link>
            <a
              href="https://github.com/victorzhrn/Schematex"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-fd-muted-foreground transition hover:text-fd-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="size-4 fill-current"
              >
                <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.35.96.1-.75.4-1.26.73-1.55-2.55-.3-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.2-3.1-.12-.3-.52-1.48.11-3.08 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.6.23 2.78.11 3.08.75.81 1.2 1.84 1.2 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
              </svg>
              GitHub
              <span className="rounded-md border border-fd-border bg-fd-background px-1.5 py-0.5 font-mono text-[11px]">
                ★
              </span>
            </a>
          </div>

          {/* Hero demo */}
          <div className="mt-14">
            <HeroShowcase slides={heroSlides} />
          </div>

          {/* Standards strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs uppercase tracking-wider text-fd-muted-foreground/80">
            {[
              'McGoldrick',
              'IEC 61131-3',
              'IEEE 315',
              'Newick',
              'NSGC',
              'Moreno',
              'Ishikawa',
              'WaveDrom',
              'ANSI Y32.2',
            ].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-x-5">
                <span>{s}</span>
                {i < arr.length - 1 && (
                  <span aria-hidden className="opacity-30">
                    ·
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────── CLUSTERS ────────────── */}
      <section
        aria-labelledby="clusters-heading"
        className="border-b border-fd-border px-6 py-28 md:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-fd-primary">
              Diagram library
            </p>
            <h2
              id="clusters-heading"
              className="text-balance text-4xl font-semibold tracking-tight text-fd-foreground md:text-5xl"
            >
              One library. Four domains.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-fd-muted-foreground">
              Each domain is a first-class citizen with its own parser, layout
              algorithm, and SVG symbols based on published standards. Not
              generic shapes with domain labels.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
            <ClusterCard
              icon="👪"
              title="Relationships"
              description="Family systems, social networks, and evolutionary trees — with the shapes, line styles, and layout conventions each discipline actually uses."
              diagrams={[
                'genogram',
                'ecomap',
                'pedigree',
                'sociogram',
                'phylogenetic',
              ]}
              href="/gallery?cluster=relationships"
              svg={safeRender(CLUSTER_RELATIONSHIPS_DSL)}
              accent="from-rose-500/10 via-transparent to-transparent"
            />
            <ClusterCard
              icon="⚡"
              title="Electrical & Industrial"
              description="Ladder logic that maps 1:1 to IEC 61131-3, SPICE-style schematics, IEEE 315 one-lines, timing waveforms, and signal-flow block diagrams."
              diagrams={[
                'ladder',
                'single-line',
                'circuit',
                'logic gate',
                'timing',
                'block',
              ]}
              href="/gallery?cluster=industrial"
              svg={safeRender(CLUSTER_INDUSTRIAL_DSL)}
              accent="from-amber-500/10 via-transparent to-transparent"
            />
            <ClusterCard
              icon="🏢"
              title="Corporate & Legal"
              description="Parent/subsidiary structures with entity-type shapes, jurisdiction clustering, and tier-aware ownership percentage rollup that survives a Series A review."
              diagrams={['entity structure', 'cap table']}
              href="/gallery?cluster=corporate"
              svg={safeRender(CLUSTER_CORPORATE_DSL)}
              accent="from-indigo-500/10 via-transparent to-transparent"
            />
            <ClusterCard
              icon="🐟"
              title="Causality & Analysis"
              description="Ishikawa cause-and-effect fishbones and Venn/Euler set diagrams — for root-cause analysis, decision memos, and teaching artifacts."
              diagrams={['fishbone', 'venn', 'euler']}
              href="/gallery?cluster=causality"
              svg={safeRender(CLUSTER_CAUSALITY_DSL)}
              accent="from-emerald-500/10 via-transparent to-transparent"
            />
          </div>
        </div>
      </section>

      {/* ────────────── WHY ────────────── */}
      <section
        aria-labelledby="why-heading"
        className="border-b border-fd-border bg-fd-muted/20 px-6 py-28 md:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-fd-primary">
              Why Schematex
            </p>
            <h2
              id="why-heading"
              className="text-balance text-4xl font-semibold tracking-tight text-fd-foreground md:text-5xl"
            >
              Built for diagrams people sign off on.
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3">
            <Pillar
              index="01"
              title="Standards-compliant, not standards-inspired"
              body="Genograms a genetic counselor accepts clinically. Ladder logic that maps 1:1 to IEC 61131-3. Cap tables that survive a Series A review. Each diagram is the published standard, in code."
            />
            <Pillar
              index="02"
              title="Zero runtime dependencies"
              body="No D3, no dagre, no parser generator. Hand-written TypeScript, strict. SSR-ready pure SVG — works in Node, Edge, Bun, and the browser with no DOM required."
            />
            <Pillar
              index="03"
              title="LLM-native by design"
              body="Small, consistent DSLs an LLM can learn from a single example. AI-readable error messages. Syntax hardened against common LLM failure modes — CJK quoting, nesting ambiguity, positional args."
            />
          </div>
        </div>
      </section>

      {/* ────────────── COMPARISON ────────────── */}
      <section
        aria-labelledby="vs-heading"
        className="border-b border-fd-border px-6 py-28 md:py-32"
      >
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-fd-muted-foreground">
            A quiet clarification
          </p>
          <h2
            id="vs-heading"
            className="text-balance text-3xl font-semibold leading-tight tracking-tight text-fd-foreground md:text-4xl"
          >
            Not all diagrams are flowcharts.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fd-muted-foreground">
            Mermaid is excellent for flowcharts, sequences, and class diagrams.
            Schematex is for the diagrams generic tools can&apos;t draw —
            because the symbols, the layout, and the grammar are part of the
            standard itself.
          </p>

          <div className="mt-12 overflow-hidden rounded-2xl border border-fd-border">
            <div className="grid grid-cols-3 border-b border-fd-border bg-fd-muted/30 text-xs font-medium uppercase tracking-wider text-fd-muted-foreground">
              <div className="p-4">Diagram</div>
              <div className="border-l border-fd-border p-4">
                Generic flowchart tool
              </div>
              <div className="border-l border-fd-border p-4 text-fd-foreground">
                Schematex
              </div>
            </div>
            {[
              {
                k: 'Genogram',
                m: 'Boxes labeled "male" / "female"',
                s: 'McGoldrick shapes, emotional relationship lines, index marker',
              },
              {
                k: 'Ladder logic',
                m: 'Not supported',
                s: 'IEC 61131-3 rails, Set/Reset coils, parallel branches, three-line labels',
              },
              {
                k: 'Single-line diagram',
                m: 'Not supported',
                s: 'IEEE 315 symbols, voltage-tier hierarchy, ANSI device numbering',
              },
              {
                k: 'Phylogenetic tree',
                m: 'Generic DAG',
                s: 'Newick / NHX roundtrip, clade coloring, proportional branch lengths',
              },
              {
                k: 'Entity structure',
                m: 'Org chart rectangles',
                s: 'Entity-type shapes, jurisdictions, tier-aware ownership rollup',
              },
            ].map((row, i, arr) => (
              <div
                key={row.k}
                className={`grid grid-cols-3 text-sm ${
                  i < arr.length - 1 ? 'border-b border-fd-border' : ''
                }`}
              >
                <div className="p-4 font-medium text-fd-foreground">
                  {row.k}
                </div>
                <div className="border-l border-fd-border p-4 text-fd-muted-foreground">
                  {row.m}
                </div>
                <div className="border-l border-fd-border p-4 text-fd-foreground">
                  {row.s}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────── QUICKSTART ────────────── */}
      <section
        aria-labelledby="install-heading"
        className="border-b border-fd-border bg-fd-muted/20 px-6 py-28 md:py-32"
      >
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-fd-primary">
            Quickstart
          </p>
          <h2
            id="install-heading"
            className="text-balance text-3xl font-semibold tracking-tight text-fd-foreground md:text-4xl"
          >
            Install in 10 seconds.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-fd-muted-foreground">
            One function, one string in, one SVG out. Works anywhere
            TypeScript does.
          </p>

          <div className="relative mt-10 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
            <div className="flex items-center gap-2 border-b border-fd-border bg-fd-background/40 px-4 py-2.5">
              <span className="font-mono text-xs text-fd-muted-foreground">
                $
              </span>
              <code className="font-mono text-sm text-fd-foreground">
                npm install schematex
              </code>
              <CopyButton
                text="npm install schematex"
                className="ml-auto"
                label="Copy"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Snippet
              title="Vanilla TypeScript"
              hint="universal"
              code={SNIPPET_VANILLA}
            />
            <Snippet
              title="Next.js (Server)"
              hint="RSC / SSR"
              code={SNIPPET_NEXTJS}
            />
            <Snippet
              title="React (Client)"
              hint="interactive"
              code={SNIPPET_REACT_CLIENT}
            />
          </div>

          <div className="mt-8">
            <Link
              href="/docs"
              className="text-sm font-medium text-fd-primary hover:underline"
            >
              Full documentation →
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────── FINAL CTA ────────────── */}
      <section
        aria-labelledby="final-heading"
        className="relative overflow-hidden border-b border-fd-border px-6 py-32 md:py-40"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,var(--color-fd-primary)/8%,transparent_70%)]"
        />
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="final-heading"
            className="text-balance text-4xl font-semibold tracking-tight text-fd-foreground md:text-5xl"
          >
            Start with a single string.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-fd-muted-foreground">
            Open the playground to render any of 13 diagram types live — or
            browse the gallery for DSL you can copy, paste, and adapt.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/playground"
              className="inline-flex items-center gap-1.5 rounded-lg bg-fd-foreground px-6 py-3 text-sm font-medium text-fd-background transition hover:opacity-90"
            >
              Open the Playground →
            </Link>
            <Link
              href="/gallery"
              className="inline-flex items-center rounded-lg border border-fd-border bg-fd-card px-6 py-3 text-sm font-medium text-fd-foreground transition hover:border-fd-foreground/30"
            >
              Browse the Gallery
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────── FOOTER ────────────── */}
      <footer className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <div className="text-lg font-semibold tracking-tight text-fd-foreground">
              Schematex
            </div>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-fd-muted-foreground">
              Standards-as-code for professional diagrams. Open source under
              AGPL-3.0.
            </p>
          </div>
          <FooterCol
            heading="Product"
            links={[
              { label: 'Playground', href: '/playground' },
              { label: 'Gallery', href: '/gallery' },
              { label: 'Examples', href: '/examples' },
            ]}
          />
          <FooterCol
            heading="Docs"
            links={[
              { label: 'Getting started', href: '/docs' },
              { label: 'Diagram types', href: '/docs' },
              { label: 'API reference', href: '/docs/api' },
            ]}
          />
          <FooterCol
            heading="Community"
            links={[
              {
                label: 'GitHub',
                href: 'https://github.com/victorzhrn/Schematex',
                external: true,
              },
              {
                label: 'npm',
                href: 'https://www.npmjs.com/package/schematex',
                external: true,
              },
              {
                label: 'Contributing',
                href: 'https://github.com/victorzhrn/Schematex/blob/main/CONTRIBUTING.md',
                external: true,
              },
            ]}
          />
        </div>
        <div className="mx-auto mt-12 max-w-6xl border-t border-fd-border pt-6 text-xs text-fd-muted-foreground">
          © {new Date().getFullYear()} Schematex · AGPL-3.0
        </div>
      </footer>
    </main>
  );
}

// ───────────────────────────────────────────────────────────────────
// Small section-level components
// ───────────────────────────────────────────────────────────────────

function Pillar({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-4 font-mono text-xs tracking-wider text-fd-muted-foreground">
        {index}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-fd-foreground">
        {title}
      </h3>
      <p className="mt-3 text-[15px] leading-relaxed text-fd-muted-foreground">
        {body}
      </p>
    </div>
  );
}

function Snippet({
  title,
  hint,
  code,
}: {
  title: string;
  hint: string;
  code: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      <div className="flex items-center justify-between border-b border-fd-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-fd-foreground">
            {title}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-fd-muted-foreground">
            {hint}
          </span>
        </div>
        <CopyButton text={code} className="" label="Copy" />
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-fd-foreground">
        {heading}
      </div>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            {l.external ? (
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fd-muted-foreground transition hover:text-fd-foreground"
              >
                {l.label}
              </a>
            ) : (
              <Link
                href={l.href}
                className="text-fd-muted-foreground transition hover:text-fd-foreground"
              >
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
