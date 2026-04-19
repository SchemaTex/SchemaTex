import Link from 'next/link';
import { render } from 'schematex';
import { CopyButton } from '@/components/CopyButton';
import { HeroShowcase, type HeroSlide } from '@/components/HeroShowcase';
import { ClusterCard } from '@/components/ClusterCard';
import { GithubStarButton } from '@/components/GithubStarButton';
import { getRepoStats } from '@/lib/github-stats';
import { galleryExamples } from '@/lib/gallery-examples';

const FEATURED_SLUGS = [
  'harry-potter-family',
  'substation-13kv',
  'brca1-hereditary-cancer',
  'fishbone-website-traffic',
  'motor-start-stop',
  'bacterial-diversity',
] as const;

const DIAGRAM_TO_CAT: Record<string, string> = {
  genogram: 'var(--cat-0)',
  ecomap: 'var(--cat-0)',
  pedigree: 'var(--cat-0)',
  phylo: 'var(--cat-0)',
  sociogram: 'var(--cat-0)',
  fishbone: 'var(--cat-1)',
  venn: 'var(--cat-1)',
  timing: 'var(--cat-2)',
  logic: 'var(--cat-2)',
  circuit: 'var(--cat-2)',
  ladder: 'var(--cat-2)',
  sld: 'var(--cat-2)',
  block: 'var(--cat-2)',
  entity: 'var(--cat-3)',
};

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

const CLUSTER_CORPORATE_DSL = `entity-structure "Acme Holdings"
entity trust "Founder Trust" trust@SD
entity parent "Acme Inc." corp@DE
entity uk "Acme UK Ltd." llc@UK
entity fund "Acme Growth Fund" fund@KY
trust -> parent : 100%
parent -> uk : 100%
parent -> fund : 60%`;

const STANDARDS_RAIL = [
  'McGoldrick 2020',
  'IEC 61131-3',
  'IEEE 315',
  'ANSI Y32.2',
  'Newick / NHX',
  'NSGC pedigree',
  'Moreno sociometry',
  'Ishikawa 1968',
  'WaveDrom',
  'ISO 5807',
];

const CLUSTER_CAUSALITY_DSL = `fishbone "Website traffic drop"

effect "Traffic decline"

category content     "Content"
category tech        "Technical"
category links       "Backlinks"
category ux          "UX"
category competition "Competition"
category algo        "Algorithm"

content : "Publishing frequency down"
content : "Content too generic"
content : "Low-quality AI content"

tech : "Core Web Vitals failing"
tech : "Crawl coverage drop"
tech : "Missing structured data"

links : "High-DR backlinks lost"
links : "Referring domain growth stalled"

ux : "Bounce rate rising"
ux : "Slow above-fold load"

competition : "New competitors entering"
competition : "AI tools replacing search"

algo : "Core Update penalty"
algo : "Weak E-E-A-T signals"`;

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

export default async function HomePage() {
  const { stars } = await getRepoStats();

  const galleryDsl = (slug: string) =>
    galleryExamples.find((g) => g.slug === slug)?.dsl ?? '';

  const PEDIGREE_DSL = galleryDsl('cystic-fibrosis-pedigree');
  const PHYLO_DSL = galleryDsl('bacterial-diversity');
  const SLD_DSL = galleryDsl('substation-13kv');
  const FISHBONE_DSL = galleryDsl('fishbone-website-traffic');

  const heroSlides: HeroSlide[] = [
    {
      label: 'Genogram',
      standard: 'McGoldrick 2020',
      dsl: HERO_GENOGRAM,
      svg: safeRender(HERO_GENOGRAM),
    },
    {
      label: 'Pedigree',
      standard: 'NSGC nomenclature',
      dsl: PEDIGREE_DSL,
      svg: safeRender(PEDIGREE_DSL),
    },
    {
      label: 'Phylogenetic',
      standard: 'Newick / NHX',
      dsl: PHYLO_DSL,
      svg: safeRender(PHYLO_DSL),
    },
    {
      label: 'Ladder logic',
      standard: 'IEC 61131-3',
      dsl: HERO_LADDER,
      svg: safeRender(HERO_LADDER),
    },
    {
      label: 'Single-line',
      standard: 'IEEE 315',
      dsl: SLD_DSL,
      svg: safeRender(SLD_DSL),
    },
    {
      label: 'Fishbone',
      standard: 'Ishikawa 1968',
      dsl: FISHBONE_DSL,
      svg: safeRender(FISHBONE_DSL),
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
      {/* ────────────── HERO (2-col, DS) ────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden border-b border-fd-border px-6 pt-16 pb-20 md:pt-24 md:pb-24"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-fd-border to-transparent"
        />

        <div className="mx-auto grid max-w-[1320px] items-center gap-10 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-14">
          {/* LEFT — copy + CTAs */}
          <div>
            {/* Eye line: — 20 DIAGRAM FAMILIES · 10+ STANDARDS · 0 DEPS */}
            <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.04em] text-fd-muted-foreground">
              <span aria-hidden className="h-px w-6 bg-[color:var(--text-muted)]" />
              20 DIAGRAM FAMILIES · 10+ STANDARDS · 0 DEPS
            </div>

            <h1
              id="hero-heading"
              className="text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.025em] text-fd-foreground md:text-[58px]"
            >
              Standards-as-code
              <br />
              <em
                className="not-italic"
                style={{ color: 'var(--accent)' }}
              >
                for professional diagrams.
              </em>
            </h1>

            <p className="mt-6 max-w-[520px] text-[16px] leading-[1.6] text-fd-muted-foreground">
              Mermaid draws generic flowcharts. Schematex draws a genogram a
              genetic counselor accepts clinically, ladder logic that maps 1:1
              to IEC 61131-3, and a cap table that survives a Series A review —
               all from a tiny text DSL.
            </p>

            {/* Value tags */}
            <div className="mt-7 flex flex-wrap gap-1.5">
              <span className="ds-badge">20 diagram families</span>
              <span className="ds-badge">10+ published standards</span>
              <span className="ds-badge">zero runtime deps</span>
              <span className="ds-badge">LLM-native</span>
            </div>

            {/* CTAs — primary + secondary install pill + github star */}
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Link
                href="/playground"
                className="group inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition hover:opacity-95"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--r-sm)',
                }}
              >
                Open playground
                <kbd
                  className="font-mono text-[11px] leading-none"
                  style={{
                    border: '1px solid currentColor',
                    borderRadius: 'var(--r-sm)',
                    padding: '2px 5px',
                    opacity: 0.65,
                  }}
                >
                  ↵
                </kbd>
              </Link>
              <div
                className="inline-flex items-center gap-2 px-3 py-2 font-mono text-[13px] text-fd-foreground"
                style={{
                  background: 'var(--fill)',
                  border: '1px solid var(--fill-muted)',
                  borderRadius: 'var(--r-sm)',
                }}
              >
                <span className="select-none text-fd-muted-foreground/60">$</span>
                <span>npm i schematex</span>
                <CopyButton text="npm install schematex" label="Copy" />
              </div>
              <GithubStarButton stars={stars} />
            </div>

            {/* Tertiary — docs link */}
            <div className="mt-4">
              <Link
                href="/docs"
                className="font-mono text-xs text-fd-muted-foreground transition hover:text-fd-foreground"
              >
                docs ↗
              </Link>
            </div>
          </div>

          {/* RIGHT — showcase */}
          <div>
            <HeroShowcase slides={heroSlides} />
          </div>
        </div>
      </section>

      {/* ────────────── STANDARDS RAIL (marquee) ────────────── */}
      <section
        aria-label="Standards covered"
        className="overflow-hidden border-b py-3.5"
        style={{
          borderColor: 'var(--fill-muted)',
          borderTopWidth: 1,
          background: 'var(--fill)',
        }}
      >
        <div className="marquee-track font-mono text-xs text-fd-muted-foreground">
          {[
            ...STANDARDS_RAIL,
            ...STANDARDS_RAIL, // duplicate for seamless loop
          ].map((s, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              <span aria-hidden style={{ color: 'var(--accent)' }}>
                ◆
              </span>
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ────────────── CLUSTERS ────────────── */}
      <section
        aria-labelledby="clusters-heading"
        className="border-b border-fd-border px-6 py-28 md:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-3 type-eye">
              02 / WHERE SCHEMATEX IS THE PROFESSIONAL CHOICE
            </p>
            <h2
              id="clusters-heading"
              className="text-balance text-4xl font-semibold tracking-tight text-fd-foreground md:text-5xl"
            >
              The diagrams other libraries can&apos;t draw.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-fd-muted-foreground">
              Each domain is a first-class citizen with its own parser, layout
              algorithm, and SVG symbols based on published standards. Not
              generic shapes with domain labels.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
            <ClusterCard
              cluster="relationships"
              title="Clinical, Social Work & Life Sciences"
              description="Genograms a family therapist takes to a case review. NSGC pedigrees a genetic counselor uses in clinic. Ecomaps social workers chart with clients. Sociograms for classroom and organizational research. Newick phylogenies for evolutionary biology."
              diagrams={[
                { name: 'genogram', standard: 'McGoldrick — family therapy' },
                { name: 'pedigree', standard: 'NSGC — genetic counseling' },
                { name: 'ecomap', standard: 'Hartman — social work' },
                { name: 'sociogram', standard: 'Moreno — psychology' },
                { name: 'phylogenetic', standard: 'Newick — evolutionary biology' },
              ]}
              href="/gallery?cluster=relationships"
              svg={safeRender(CLUSTER_RELATIONSHIPS_DSL)}
            />
            <ClusterCard
              cluster="industrial"
              title="Electrical & Industrial"
              description="Ladder logic that maps 1:1 to IEC 61131-3, SPICE-style schematics, IEEE 315 one-lines, timing waveforms, and signal-flow block diagrams."
              diagrams={[
                { name: 'ladder', standard: 'IEC 61131-3' },
                { name: 'single-line', standard: 'IEEE 315' },
                { name: 'circuit', standard: 'ANSI Y32.2' },
                { name: 'logic gate', standard: 'IEEE 91' },
                { name: 'timing', standard: 'WaveDrom' },
                { name: 'block', standard: 'control' },
              ]}
              href="/gallery?cluster=industrial"
              svg={safeRender(CLUSTER_INDUSTRIAL_DSL)}
            />
            <ClusterCard
              cluster="corporate"
              title="Corporate & Legal"
              description="Parent/subsidiary structures with entity-type shapes, jurisdiction clustering, and tier-aware ownership percentage rollup that survives a Series A review."
              diagrams={[
                { name: 'entity structure', standard: 'cap-table' },
                { name: 'org chart', standard: 'hierarchical' },
              ]}
              href="/gallery?cluster=corporate"
              svg={safeRender(CLUSTER_CORPORATE_DSL)}
            />
            <ClusterCard
              cluster="causality"
              title="Causality & Analysis"
              description="Ishikawa cause-and-effect fishbones and Venn/Euler set diagrams — for root-cause analysis, decision memos, and teaching artifacts."
              diagrams={[
                { name: 'fishbone', standard: 'Ishikawa' },
                { name: 'venn', standard: 'Euler' },
              ]}
              href="/gallery?cluster=causality"
              svg={safeRender(CLUSTER_CAUSALITY_DSL)}
            />
          </div>
        </div>
      </section>

      {/* ────────────── FEATURED GALLERY ────────────── */}
      <section
        aria-labelledby="featured-heading"
        className="border-b border-fd-border px-6 py-24 md:py-28"
        style={{ background: 'var(--fill)' }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-3 type-eye">
              03 / IN THE WILD
            </p>
            <h2
              id="featured-heading"
              className="text-balance text-3xl font-semibold tracking-tight text-fd-foreground md:text-4xl"
            >
              Every diagram, reproducible from a string.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-fd-muted-foreground">
              Real-world examples — each renders from its DSL, each conforms to
              a published standard. Copy, open in the playground, adapt.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURED_SLUGS.map((slug) => {
              const ex = galleryExamples.find((g) => g.slug === slug);
              if (!ex) return null;
              const color = DIAGRAM_TO_CAT[ex.diagram] ?? 'var(--cat-7)';
              const svg = safeRender(ex.dsl);
              return (
                <Link
                  key={ex.slug}
                  href={`/playground?example=${ex.slug}`}
                  className="group flex flex-col overflow-hidden bg-fd-card transition hover:border-[color:var(--stroke)]"
                  style={{
                    border: '1px solid var(--fill-muted)',
                    borderRadius: 'var(--r)',
                  }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2 font-mono text-xs text-fd-muted-foreground"
                    style={{ borderBottom: '1px solid var(--fill-muted)' }}
                  >
                    <span
                      aria-hidden
                      className="size-2"
                      style={{ background: color, borderRadius: 2 }}
                    />
                    <span className="text-fd-foreground">{ex.diagram}</span>
                    <span className="opacity-40">·</span>
                    <span style={{ color: 'var(--accent)' }}>§ {ex.standard}</span>
                  </div>
                  <div className="dot-grid flex aspect-[4/3] items-center justify-center overflow-hidden p-4">
                    <div
                      className="flex h-full w-full items-center justify-center [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:max-w-full"
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  </div>
                  <div
                    className="flex flex-col gap-1 p-4"
                    style={{ borderTop: '1px solid var(--fill-muted)' }}
                  >
                    <div className="text-[15px] font-semibold tracking-tight text-fd-foreground">
                      {ex.title}
                    </div>
                    <p className="line-clamp-2 text-[13px] leading-relaxed text-fd-muted-foreground">
                      {ex.description}
                    </p>
                    <div
                      className="mt-1 font-mono text-xs transition-opacity"
                      style={{ color: 'var(--accent)', opacity: 0.7 }}
                    >
                      → open in playground
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-fd-foreground transition hover:border-[color:var(--stroke)]"
              style={{
                background: 'var(--fill)',
                border: '1px solid var(--fill-muted)',
                borderRadius: 'var(--r-sm)',
              }}
            >
              Browse the full gallery →
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────── WHY (DS stat cards) ────────────── */}
      <section
        aria-labelledby="why-heading"
        className="border-b border-fd-border bg-fd-muted/20 px-6 py-28 md:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-3 type-eye">04 / WHY</p>
            <h2
              id="why-heading"
              className="text-balance text-4xl font-semibold tracking-tight text-fd-foreground md:text-5xl"
            >
              Built for diagrams people sign off on.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-fd-muted-foreground">
              Generic flowchart tools can&apos;t draw professional diagrams.
              Schematex treats each standard as a first-class citizen.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            <StatCard
              stat="20"
              unit="FAMILIES"
              title="Standards-compliant output"
              body="Every diagram type implements a published spec — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. Domain experts accept it."
            />
            <StatCard
              stat="0"
              unit="RUNTIME DEPS"
              title="Hand-written everything"
              body="No D3, no dagre, no parser generators. Each diagram is an independent plugin with its own parser, layout, renderer."
            />
            <StatCard
              stat="LLM"
              unit="NATIVE DSL"
              title="Designed so AI gets it right"
              body="Minimal grammars an LLM can learn from one example. Copy a gallery DSL into ChatGPT or Claude and get a professional diagram back — first try."
            />
          </div>
        </div>
      </section>

      {/* ────────────── POSITIONING (comparison table) ────────────── */}
      <section
        aria-labelledby="vs-heading"
        className="border-b border-fd-border px-6 py-28 md:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 type-eye">05 / POSITIONING</p>
          <h2
            id="vs-heading"
            className="text-balance text-4xl font-semibold leading-tight tracking-tight text-fd-foreground md:text-5xl"
          >
            <span style={{ background: 'var(--accent-soft)', padding: '0 6px' }}>
              Not another flowchart library.
            </span>
          </h2>
          <p
            className="mt-5 max-w-2xl text-lg leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            <span style={{ background: 'var(--accent-soft)', padding: '0 4px' }}>
              How Schematex compares to the tools people already reach for.
            </span>
          </p>

          <div
            className="mt-12 overflow-x-auto"
            style={{
              border: '1px solid var(--fill-muted)',
              borderRadius: 'var(--r)',
              background: 'var(--fill)',
            }}
          >
            <table className="w-full min-w-[720px] font-mono text-[13px]">
              <thead>
                <tr
                  className="text-left text-fd-muted-foreground"
                  style={{ borderBottom: '1px solid var(--fill-muted)' }}
                >
                  <th className="px-5 py-3 font-normal">Tool</th>
                  <th className="px-5 py-3 font-normal">Domain standards</th>
                  <th className="px-5 py-3 font-normal">Deps</th>
                  <th className="px-5 py-3 font-normal">Pricing</th>
                  <th className="px-5 py-3 font-normal">LLM-shaped DSL</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    tool: 'Mermaid',
                    dom: 'generic flowcharts only',
                    deps: 'dagre-d3',
                    price: 'free',
                    llm: '—',
                  },
                  {
                    tool: 'GoJS',
                    dom: 'isolated samples',
                    deps: '—',
                    price: '$7k+ / seat',
                    llm: '—',
                  },
                  {
                    tool: 'Schemdraw',
                    dom: 'circuits only',
                    deps: 'matplotlib',
                    price: 'free',
                    llm: 'Python only',
                  },
                  {
                    tool: 'draw.io',
                    dom: 'GUI — no published spec',
                    deps: '—',
                    price: 'free',
                    llm: '—',
                  },
                ].map((row) => (
                  <tr
                    key={row.tool}
                    style={{ borderBottom: '1px solid var(--fill-muted)' }}
                    className="text-fd-muted-foreground"
                  >
                    <td className="px-5 py-3 text-fd-foreground">{row.tool}</td>
                    <td className="px-5 py-3">{row.dom}</td>
                    <td className="px-5 py-3">{row.deps}</td>
                    <td className="px-5 py-3">{row.price}</td>
                    <td className="px-5 py-3">{row.llm}</td>
                  </tr>
                ))}
                <tr
                  style={{
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-ink)',
                  }}
                >
                  <td className="px-5 py-3 font-semibold">
                    <span aria-hidden className="mr-1.5" style={{ color: 'var(--accent)' }}>
                      ▸
                    </span>
                    schematex
                  </td>
                  <td className="px-5 py-3">20 families · spec-cited</td>
                  <td className="px-5 py-3">0</td>
                  <td className="px-5 py-3">free</td>
                  <td className="px-5 py-3 font-semibold">designed for it</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ────────────── QUICKSTART ────────────── */}
      <section
        aria-labelledby="install-heading"
        className="border-b border-fd-border bg-fd-muted/20 px-6 py-28 md:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 type-eye">
            06 / QUICKSTART
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
            Open the playground to render any of 20 diagram types live — or
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

function StatCard({
  stat,
  unit,
  title,
  body,
}: {
  stat: string;
  unit: string;
  title: string;
  body: string;
}) {
  return (
    <div
      className="flex flex-col p-8"
      style={{
        border: '1px solid var(--fill-muted)',
        borderRadius: 'var(--r)',
        background: 'var(--fill)',
      }}
    >
      <div
        className="text-[64px] font-semibold leading-none tracking-tight text-fd-foreground"
        style={{ letterSpacing: '-0.03em' }}
      >
        {stat}
      </div>
      <div className="mt-3 font-mono text-[11px] tracking-[0.08em] text-fd-muted-foreground">
        {unit}
      </div>
      <div className="mt-8 text-[16px] font-semibold tracking-tight text-fd-foreground">
        {title}
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-fd-muted-foreground">
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
