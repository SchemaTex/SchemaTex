import Link from 'next/link';
import { render } from 'schematex';
import { CopyButton } from '@/components/CopyButton';
import { HeroShowcase, type HeroSlide } from '@/components/HeroShowcase';
import { GithubStarButton } from '@/components/GithubStarButton';
import { REPO_URL } from '@/lib/repo';
import { LocaleSwitcher } from '@/lib/i18n/LocaleSwitcher';
import { localizedPath, type SupportedLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import { allExamples } from '@/lib/examples-source';
import { DIAGRAM_TYPE_COUNT } from '@/lib/diagram-stats';
import { ThemedSvg } from '@/components/ThemedSvg';
import { DiagramContactSheet } from '@/components/home/DiagramContactSheet';
import { en } from '@/lib/i18n/dictionaries/en';

// Featured cases — each tying a real diagram to the professional who ships it.
// Order optimized for cluster coverage: relationships / industrial / corporate / causality.
const FEATURED_SLUGS = [
  'genogram-medical-history',
  'pedigree-hemophilia',
  'ecomap-substance-recovery',
  'ladder-motor-start-stop',
  'sld-generator-ats',
  'logic-full-adder',
  'entity-international-tax',
  'fishbone-website-traffic',
  'sociogram-playground-dynamics',
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

// Standards names are brand/spec identifiers — not translated.
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
  'PRISMA 2020',
  'OMG BPMN 2.0',
  'UML 2.5.1',
  'PMI PMBOK 7',
  'Chen 1976',
  'IEC 60617',
];

// ───────────────────────────────────────────────────────────────────
// Server-side safe render — never throws into the page
// ───────────────────────────────────────────────────────────────────

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" role="img" aria-label="Diagram preview unavailable"><rect width="200" height="120" fill="transparent"/><text x="100" y="64" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="#999">preview unavailable</text></svg>`;

function safeRender(dsl: string, theme: 'default' | 'dark'): string {
  try {
    return render(dsl, { theme });
  } catch {
    return FALLBACK_SVG;
  }
}

// ───────────────────────────────────────────────────────────────────
// Install tabs — static, server-rendered snippets (code, not chrome)
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
import { useState } from 'react';
import { InteractiveSchematexDiagram } from 'schematex/react';

export function DiagramEditor({ initialDsl }: { initialDsl: string }) {
  const [dsl, setDsl] = useState(initialDsl);
  return <InteractiveSchematexDiagram value={dsl} onChange={setDsl} />;
}`;

// ───────────────────────────────────────────────────────────────────
// Page body — shared by the English `(home)` route and the localized
// `[lang]` route. Every user-facing string comes from `dict`.
// ───────────────────────────────────────────────────────────────────

export function HomeContent({
  dict,
  lang,
  stars,
}: {
  dict: Dictionary;
  lang: SupportedLocale;
  stars: number;
}) {
  const positioningProof = (
    dict.positioning as Dictionary['positioning'] & { proof?: typeof en.positioning.proof }
  ).proof ?? en.positioning.proof;
  // Hero rotates through the same 9 professional cases used in the grid below.
  const heroSlides: HeroSlide[] = FEATURED_SLUGS.flatMap((slug) => {
    const ex = allExamples.find((g) => g.slug === slug);
    if (!ex) return [];
    return [
      {
        label: ex.diagram,
        standard: ex.standard ?? '—',
        dsl: ex.dsl,
      },
    ];
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Schematex',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: 'https://schematex.js.org',
    downloadUrl: 'https://www.npmjs.com/package/schematex',
    codeRepository: REPO_URL,
    license: 'https://spdx.org/licenses/AGPL-3.0-only.html',
    description:
      `Every diagram a doctor, engineer, or lawyer would actually use. ${DIAGRAM_TYPE_COUNT} industry-standard diagram types from a text DSL — genogram, pedigree, ladder logic, SLD, FBD, SFC, UML use case, PRISMA, fishbone, entity structure. Free, fully open source, made for AI. Pure SVG, zero dependencies.`,
    keywords:
      'genogram, pedigree, ladder logic, single-line diagram, phylogenetic tree, fishbone, entity structure, text to diagram, mermaid alternative, open source diagram library',
  };

  const homeHref = localizedPath(lang, '/');

  return (
    <main className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ────────────── HERO (2-col, DS) ────────────── */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden border-b border-fd-border px-6 pt-16 pb-20 md:pt-24 md:pb-24"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-fd-border to-transparent"
        />

        {/* Draft-board backdrop — blueprint dot grid masked diagonally. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(circle, color-mix(in srgb, var(--text-muted) 35%, transparent) 1.1px, transparent 1.4px)',
            backgroundSize: '18px 18px',
            WebkitMaskImage:
              'linear-gradient(125deg, transparent 25%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,1) 100%)',
            maskImage:
              'linear-gradient(125deg, transparent 25%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,1) 100%)',
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-[960px]">
            <p className="type-eye mb-5">{dict.hero.eyebrow}</p>

            <h1
              id="hero-heading"
              className="text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.025em] text-fd-foreground md:text-[58px]"
            >
              {dict.hero.headlineBefore}
              <em className="not-italic" style={{ color: 'var(--accent)' }}>
                {dict.hero.headlineAccent}
              </em>
              {dict.hero.headlineAfter}
            </h1>

            <p className="mt-6 max-w-[860px] text-[17px] leading-[1.6] text-fd-muted-foreground">
              {dict.hero.subhead(DIAGRAM_TYPE_COUNT)}
            </p>

            {/* CTAs — unified height (h-10) and radius (var(--r-sm)) */}
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <Link
                href="/playground"
                className="group inline-flex h-10 items-center gap-2 px-4 text-sm font-medium transition hover:opacity-95"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--color-fd-primary-foreground)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--r-sm)',
                }}
              >
                {dict.hero.ctaPlayground}
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
                className="inline-flex h-10 items-center gap-2 px-3 font-mono text-[13px] text-fd-foreground"
                style={{
                  background: 'var(--fill)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-sm)',
                }}
              >
                <span className="select-none text-fd-muted-foreground/60">$</span>
                <span>npm i schematex</span>
                <CopyButton variant="ghost" text="npm install schematex" label={dict.common.copy} />
              </div>
              <GithubStarButton stars={stars} source="hero" />
              <Link
                href="/docs"
                className="inline-flex h-10 items-center px-2 font-mono text-xs text-fd-muted-foreground transition hover:text-fd-foreground"
              >
                {dict.hero.docsLink}
              </Link>
            </div>
          </div>

          <div className="mt-12 md:mt-14">
            <HeroShowcase slides={heroSlides} />
          </div>
        </div>
      </section>

      {/* ────────────── STANDARDS RAIL (marquee) ────────────── */}
      <section
        aria-label={dict.standardsRail.ariaLabel}
        className="overflow-hidden border-b py-3.5"
        style={{ borderColor: 'var(--line)', borderTopWidth: 1, background: 'var(--fill)' }}
      >
        <div className="marquee-track font-mono text-xs text-fd-muted-foreground">
          {[...STANDARDS_RAIL, ...STANDARDS_RAIL].map((s, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              <span aria-hidden style={{ color: 'var(--accent)' }}>
                ◆
              </span>
              {s}
            </span>
          ))}
        </div>
      </section>

      <DiagramContactSheet />

      {/* ────────────── PROFESSIONAL USE CASES ────────────── */}
      <section
        aria-labelledby="cases-heading"
        className="border-b border-fd-border px-6 py-28 md:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-3 type-eye">{dict.cases.eyebrow}</p>
            <h2
              id="cases-heading"
              className="text-balance text-4xl font-semibold tracking-tight text-fd-foreground md:text-5xl"
            >
              {dict.cases.heading}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-fd-muted-foreground">
              {dict.cases.body}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURED_SLUGS.map((slug) => {
              const ex = allExamples.find((g) => g.slug === slug);
              if (!ex) return null;
              const persona = ex.persona ?? '';
              const color = DIAGRAM_TO_CAT[ex.diagram] ?? 'var(--cat-7)';
              const lightSvg = safeRender(ex.dsl, 'default');
              return (
                <Link
                  key={ex.slug}
                  href={`/playground?example=${ex.slug}`}
                  className="group flex flex-col overflow-hidden bg-fd-card transition hover:border-[color:var(--accent)]"
                  style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)' }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2 font-mono text-xs text-fd-muted-foreground"
                    style={{ borderBottom: '1px solid var(--line)' }}
                  >
                    <span aria-hidden className="size-2" style={{ background: color, borderRadius: 2 }} />
                    <span className="text-fd-foreground">{ex.diagram}</span>
                    <span className="opacity-40">·</span>
                    <span style={{ color: 'var(--accent)' }}>§ {ex.standard}</span>
                  </div>
                  <div
                    className="dot-grid flex aspect-[4/3] items-center justify-center overflow-hidden p-4"
                    style={{ background: 'var(--fill)' }}
                  >
                    <ThemedSvg
                      light={lightSvg}
                      darkSrc={`/api/example-svg/${ex.slug}?theme=dark`}
                      className="flex h-full w-full items-center justify-center [&>div]:h-full [&>div]:w-full [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:max-w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 p-4" style={{ borderTop: '1px solid var(--line)' }}>
                    <div
                      className="font-mono text-[11px] uppercase tracking-[0.08em]"
                      style={{ color: 'var(--accent)' }}
                    >
                      {persona}
                    </div>
                    <div className="text-[15px] font-semibold tracking-tight text-fd-foreground">
                      {ex.title}
                    </div>
                    <p className="line-clamp-2 text-[13px] leading-relaxed text-fd-muted-foreground">
                      {ex.description ?? ex.title}
                    </p>
                    <div
                      className="mt-1 font-mono text-xs transition-opacity"
                      style={{ color: 'var(--accent)', opacity: 0.7 }}
                    >
                      {dict.cases.openInPlayground}
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
              style={{ background: 'var(--fill)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}
            >
              {dict.cases.browseGallery}
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
            <p className="mb-3 type-eye">{dict.why.eyebrow}</p>
            <h2
              id="why-heading"
              className="text-balance text-4xl font-semibold tracking-tight text-fd-foreground md:text-5xl"
            >
              {dict.why.heading}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-fd-muted-foreground">{dict.why.body}</p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            <StatCard
              stat={String(DIAGRAM_TYPE_COUNT)}
              unit={dict.why.cards.families.unit}
              title={dict.why.cards.families.title}
              body={dict.why.cards.families.body}
            />
            <StatCard
              stat={dict.why.cards.free.stat}
              unit={dict.why.cards.free.unit}
              title={dict.why.cards.free.title}
              body={dict.why.cards.free.body}
            />
            <StatCard
              stat={dict.why.cards.ai.stat}
              unit={dict.why.cards.ai.unit}
              title={dict.why.cards.ai.title}
              body={dict.why.cards.ai.body}
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
          <p className="mb-3 type-eye">{dict.positioning.eyebrow}</p>
          <h2
            id="vs-heading"
            className="text-balance text-4xl font-semibold leading-tight tracking-tight text-fd-foreground md:text-5xl"
          >
            {dict.positioning.heading}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-fd-muted-foreground">
            {dict.positioning.body}
          </p>

          <div
            className="mt-12 overflow-x-auto"
            style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--fill)' }}
          >
            <table className="w-full min-w-[720px] font-mono text-[13px]">
              <thead>
                <tr
                  className="text-left text-fd-muted-foreground"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  <th className="px-5 py-3 font-normal">{dict.positioning.columns.tool}</th>
                  <th className="px-5 py-3 font-normal">{positioningProof.columns.domain}</th>
                  <th className="px-5 py-3 font-normal">{positioningProof.columns.standards}</th>
                  <th className="px-5 py-3 font-normal">{positioningProof.columns.roundTrip}</th>
                  <th className="px-5 py-3 font-normal">{positioningProof.columns.aiFriendly}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tool: 'Mermaid', ...positioningProof.rows.mermaid },
                  { tool: 'D2', ...positioningProof.rows.d2 },
                  { tool: 'draw.io / Excalidraw', ...positioningProof.rows.canvas },
                  { tool: 'PlantUML', ...positioningProof.rows.plantuml },
                ].map((row) => (
                  <tr
                    key={row.tool}
                    style={{ borderBottom: '1px solid var(--line)' }}
                    className="text-fd-muted-foreground"
                  >
                    <td className="px-5 py-3 text-fd-foreground">{row.tool}</td>
                    <td className="px-5 py-3">{row.domain}</td>
                    <td className="px-5 py-3">{row.standards}</td>
                    <td className="px-5 py-3">{row.roundTrip}</td>
                    <td className="px-5 py-3">{row.ai}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>
                  <td className="px-5 py-3 font-semibold">
                    <span aria-hidden className="mr-1.5" style={{ color: 'var(--accent)' }}>
                      ▸
                    </span>
                    schematex
                  </td>
                  <td className="px-5 py-3">{positioningProof.schematex.domain(DIAGRAM_TYPE_COUNT)}</td>
                  <td className="px-5 py-3 font-semibold">{positioningProof.schematex.standards(DIAGRAM_TYPE_COUNT)}</td>
                  <td className="px-5 py-3">{positioningProof.schematex.roundTrip}</td>
                  <td className="px-5 py-3 font-semibold">{positioningProof.schematex.ai}</td>
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
          <p className="mb-3 type-eye">{dict.quickstart.eyebrow}</p>
          <h2
            id="install-heading"
            className="text-balance text-3xl font-semibold tracking-tight text-fd-foreground md:text-4xl"
          >
            {dict.quickstart.heading}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-fd-muted-foreground">{dict.quickstart.body}</p>

          <div className="relative mt-10 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
            <div className="flex items-center gap-2 border-b border-fd-border bg-fd-background/40 px-4 py-2.5">
              <span className="font-mono text-xs text-fd-muted-foreground">$</span>
              <code className="font-mono text-sm text-fd-foreground">npm install schematex</code>
              <CopyButton text="npm install schematex" className="ml-auto" label={dict.common.copy} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Snippet
              title={dict.quickstart.snippets.vanilla.title}
              hint={dict.quickstart.snippets.vanilla.hint}
              code={SNIPPET_VANILLA}
              copyLabel={dict.common.copy}
            />
            <Snippet
              title={dict.quickstart.snippets.nextjs.title}
              hint={dict.quickstart.snippets.nextjs.hint}
              code={SNIPPET_NEXTJS}
              copyLabel={dict.common.copy}
            />
            <Snippet
              title={dict.quickstart.snippets.reactClient.title}
              hint={dict.quickstart.snippets.reactClient.hint}
              code={SNIPPET_REACT_CLIENT}
              copyLabel={dict.common.copy}
            />
          </div>

          <div className="mt-8">
            <Link href="/docs" className="text-sm font-medium text-fd-primary hover:underline">
              {dict.quickstart.fullDocs}
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
            {dict.finalCta.heading}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-fd-muted-foreground">
            {dict.finalCta.body(DIAGRAM_TYPE_COUNT)}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/playground"
              className="inline-flex items-center gap-1.5 px-6 py-3 text-sm font-medium transition hover:opacity-95"
              style={{ background: 'var(--accent)', color: 'var(--color-fd-primary-foreground)', border: '1px solid var(--accent)', borderRadius: 'var(--r-sm)' }}
            >
              {dict.finalCta.openPlayground}
            </Link>
            <Link
              href="/gallery"
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-fd-foreground transition hover:border-[color:var(--stroke)]"
              style={{ background: 'var(--fill)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}
            >
              {dict.finalCta.browseGallery}
            </Link>
            <GithubStarButton stars={stars} source="final_cta" />
          </div>
          <p className="mt-5 text-sm text-fd-muted-foreground">{dict.finalCta.starNote}</p>
        </div>
      </section>

      {/* ────────────── FOOTER ────────────── */}
      <footer className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link href={homeHref} className="text-lg font-semibold tracking-tight text-fd-foreground">
              Schematex
            </Link>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-fd-muted-foreground">
              {dict.footer.tagline}
            </p>
            <div className="mt-5">
              <p className="type-eye">USED IN PRODUCTION</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                {[
                  { name: 'ChatDiagram', href: 'https://chatdiagram.com', logo: '/logos/chatdiagram.svg' },
                  { name: 'FreeDiagram', href: 'https://freediagram.app', logo: '/logos/freediagram.svg' },
                  { name: 'FloorPlan Maker', href: 'https://www.floorplanmaker.app', logo: '/logos/floorplanmaker.svg' },
                ].map((p) => (
                  <a
                    key={p.name}
                    href={p.href}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground transition hover:text-fd-foreground"
                  >
                    <img src={p.logo} alt={p.name} width={16} height={16} className="shrink-0" />
                    {p.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <FooterCol
            heading={dict.footer.cols.product.heading}
            links={[
              { label: dict.footer.cols.product.playground, href: '/playground' },
              { label: dict.footer.cols.product.gallery, href: '/gallery' },
              { label: dict.footer.cols.product.examples, href: '/examples' },
            ]}
          />
          <FooterCol
            heading={dict.footer.cols.docs.heading}
            links={[
              { label: dict.footer.cols.docs.gettingStarted, href: '/docs' },
              { label: dict.footer.cols.docs.diagramTypes, href: '/docs' },
              { label: dict.footer.cols.docs.apiReference, href: '/docs/api' },
            ]}
          />
          <FooterCol
            heading={dict.footer.cols.community.heading}
            links={[
              { label: dict.footer.cols.community.github, href: REPO_URL, external: true },
              { label: dict.footer.cols.community.npm, href: 'https://www.npmjs.com/package/schematex', external: true },
              { label: dict.footer.cols.community.contributing, href: `${REPO_URL}/blob/main/CONTRIBUTING.md`, external: true },
            ]}
          />
        </div>
        <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-4 border-t border-fd-border pt-6 text-xs text-fd-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{dict.footer.copyright(new Date().getFullYear())}</span>
          <LocaleSwitcher current={lang} variant="footer" label={dict.localeSwitcher.label} />
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
      style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--fill)' }}
    >
      <div
        className="text-[64px] font-semibold leading-none tracking-tight text-fd-foreground"
        style={{ letterSpacing: '-0.03em' }}
      >
        {stat}
      </div>
      <div className="mt-3 font-mono text-[11px] tracking-[0.08em] text-fd-muted-foreground">{unit}</div>
      <div className="mt-8 text-[16px] font-semibold tracking-tight text-fd-foreground">{title}</div>
      <p className="mt-2 text-[14px] leading-relaxed text-fd-muted-foreground">{body}</p>
    </div>
  );
}

function Snippet({
  title,
  hint,
  code,
  copyLabel,
}: {
  title: string;
  hint: string;
  code: string;
  copyLabel: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      <div className="flex items-center justify-between border-b border-fd-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-fd-foreground">{title}</span>
          <span className="text-[10px] uppercase tracking-wider text-fd-muted-foreground">{hint}</span>
        </div>
        <CopyButton text={code} className="" label={copyLabel} />
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
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-fd-foreground">{heading}</div>
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
              <Link href={l.href} className="text-fd-muted-foreground transition hover:text-fd-foreground">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
