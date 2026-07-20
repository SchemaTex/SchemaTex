// ───────────────────────────────────────────────────────────────────
// English — the source of truth for every UI-chrome string on the homepage.
//
// `Dictionary` is derived from this object, so every established locale key is
// type-checked. Newly launched positioning proof copy intentionally falls back
// to English until it is ready for a dedicated translation pass.
//
// Interpolated strings are modelled as functions (e.g. `(count) => string`)
// so word order stays translatable. Proper nouns / brand terms / standards
// names (Schematex, IEC 61131-3, Mermaid, npm) are intentionally NOT
// translated and stay inline in the components.
// ───────────────────────────────────────────────────────────────────

export const en = {
  // ── Site chrome (header nav + locale switcher) ──
  nav: {
    docs: 'Docs',
    gallery: 'Gallery',
    icons: 'Icons',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: {
    label: 'Language',
  },

  // ── <head> metadata (localized <title> / description for SEO) ──
  meta: {
    title: 'Schematex — Diagrams doctors, engineers, and lawyers actually use',
    description: (count: number) =>
      `Every diagram a doctor, engineer, or lawyer would actually use. Free. Fully open source. Made for AI. ${count} industry-standard diagrams from a text DSL. Pure SVG, zero dependencies.`,
  },

  // ── Hero ──
  hero: {
    eyebrow: '01 / INTRODUCING SCHEMATEX · FREE · OPEN SOURCE · MADE FOR AI',
    // Spacing is baked into before/after (CJK wants none, English wants a
    // space on each side of the accent) — render as {before}<em>{accent}</em>{after}.
    headlineBefore: 'Every diagram a ',
    headlineAccent: 'doctor, engineer, or lawyer',
    headlineAfter: ' would actually use.',
    subhead: (count: number) =>
      `Schematex draws the ${count} diagrams doctors, engineers, and lawyers already draw by hand — clinical genograms, IEC 61131-3 ladder logic, NSGC pedigrees, cap tables. Text DSL in, standards-compliant SVG out.`,
    ctaPlayground: 'Open playground',
    docsLink: 'docs ↗',
  },

  // ── Standards rail ──
  standardsRail: {
    ariaLabel: 'Standards covered',
  },

  // ── Professional use cases ──
  cases: {
    eyebrow: '02 / DIAGRAMS PROFESSIONALS ACTUALLY USE',
    heading: 'The diagrams your doctor, engineer, or lawyer actually uses.',
    body: 'Each diagram family is built for the practitioner who owns it — from a few lines of DSL to the version a domain expert would put in a chart, a memo, or a permit. Every output conforms to a published standard.',
    openInPlayground: '→ open in playground',
    browseGallery: 'Browse the full gallery →',
  },

  // ── Why ──
  why: {
    eyebrow: '03 / WHY',
    heading: 'Free. Fully open source. Made for AI.',
    body: "Generic flowchart tools can't draw professional diagrams. Schematex treats each standard as a first-class citizen — and the whole thing is AGPL-3.0, zero-dep, and designed for LLMs to emit on the first try.",
    cards: {
      families: {
        unit: 'FAMILIES',
        title: 'Diagrams professionals actually use',
        body: 'Every diagram type implements a published spec — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. Doctors, engineers, and lawyers already draw these by hand; now they can ship them from code.',
      },
      free: {
        stat: '100%',
        unit: 'FREE · OPEN SOURCE',
        title: 'AGPL-3.0, zero runtime deps',
        body: 'No D3, no dagre, no parser generators, no telemetry, no locked features. KB-level bundle, SSR-safe, commercial license available for closed-source use.',
      },
      ai: {
        stat: 'AI',
        unit: 'FIRST-CLASS',
        title: 'Made for LLMs to emit',
        body: 'Minimal grammars designed around how LLMs actually write text — CJK quotes, nesting ambiguity, AI-readable errors. Paste the output from ChatGPT or Claude and get a professional diagram back, first try.',
      },
    },
  },

  // ── Positioning (comparison table) ──
  positioning: {
    eyebrow: '04 / POSITIONING',
    heading: 'Not another flowchart library.',
    body: 'How Schematex compares to the tools people already reach for.',
    columns: {
      tool: 'Tool',
      domain: 'Pro domain diagrams',
      price: 'Price',
      forDevelopers: 'For developers',
      aiFriendly: 'AI-friendly',
    },
    free: 'free',
    partial: 'partial',
    rows: {
      mermaid: { domain: 'flowcharts only', dev: '✓ (npm)' },
      d2: { domain: 'architecture only', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'timing only', dev: '✓ (npm)' },
      plantuml: { domain: 'UML only', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count: number) => `${count} families · spec-cited`,
      dev: '✓ (0 deps, npm)',
      ai: 'designed for it',
    },
    proof: {
      columns: {
        domain: 'Domain',
        standards: 'Standards-compliant types',
        roundTrip: 'Edit the render, keep the source',
        aiFriendly: 'AI-friendly',
      },
      rows: {
        mermaid: { domain: 'General flow/UML', standards: '—', roundTrip: '✗ text only', ai: 'partial' },
        d2: { domain: 'General diagrams', standards: '—', roundTrip: '✗ text only', ai: 'partial' },
        canvas: { domain: 'Freeform canvas', standards: '—', roundTrip: '✗ canvas only, no source', ai: '✗' },
        plantuml: { domain: 'UML', standards: 'UML subset', roundTrip: '✗ text only', ai: '—' },
      },
      schematex: {
        domain: (count: number) => `${count} professional families`,
        standards: (count: number) => String(count),
        roundTrip: '✓ round-trip',
        ai: '✓ MCP + llms.txt',
      },
    },
  },

  // ── Quickstart ──
  quickstart: {
    eyebrow: '05 / QUICKSTART',
    heading: 'Install in 10 seconds.',
    body: 'One function, one string in, one SVG out. Works anywhere TypeScript does.',
    snippets: {
      vanilla: { title: 'Vanilla TypeScript', hint: 'universal' },
      nextjs: { title: 'Next.js (Server)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (Client)', hint: 'interactive' },
    },
    fullDocs: 'Full documentation →',
  },

  // ── Final CTA ──
  finalCta: {
    starNote: "Free & open source — a star helps other developers find it.",
    heading: 'Start with a single string.',
    body: (count: number) =>
      `Open the playground to render any of ${count} diagram types live — or browse the gallery for DSL you can copy, paste, and adapt.`,
    openPlayground: 'Open the Playground →',
    browseGallery: 'Browse the Gallery',
  },

  // ── Footer ──
  footer: {
    tagline:
      'Every diagram a doctor, engineer, or lawyer would actually use. Free. Fully open source. Made for AI. AGPL-3.0.',
    cols: {
      product: {
        heading: 'Product',
        playground: 'Playground',
        gallery: 'Gallery',
        examples: 'Examples',
      },
      docs: {
        heading: 'Docs',
        gettingStarted: 'Getting started',
        diagramTypes: 'Diagram types',
        apiReference: 'API reference',
      },
      community: {
        heading: 'Community',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'Contributing',
      },
    },
    copyright: (year: number) => `© ${year} Schematex · AGPL-3.0`,
  },

  // ── Shared affordances ──
  common: {
    copy: 'Copy',
  },
};

// NOTE: intentionally NOT `as const`. We want `Dictionary` to widen each value
// to `string` (and keep the function signatures) so a translated locale like
// '文档' satisfies the type. `as const` would pin every key to its English
// literal and reject all translations.
/** Structural type every locale dictionary must satisfy; `proof` is English-fallback copy. */
export type Dictionary = Omit<typeof en, 'positioning'> & {
  positioning: Omit<typeof en.positioning, 'proof'>;
};

export default en;
