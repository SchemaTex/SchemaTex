import type { Dictionary } from './en';

const de: Dictionary = {
  nav: {
    docs: 'Dokumentation',
    gallery: 'Galerie',
    icons: 'Icons',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: 'Sprache' },
  meta: {
    title: 'Schematex — Diagramme, die Ärzte, Ingenieure und Juristen wirklich nutzen',
    description: (count) =>
      `Alle Diagramme, die ein Arzt, Ingenieur oder Jurist tatsächlich verwenden würde. Kostenlos. Vollständig open source. Für KI gemacht. ${count} branchenstandardisierte Diagramme aus einem Text-DSL. Reines SVG, null Abhängigkeiten.`,
  },
  hero: {
    eyebrow: '01 / SCHEMATEX VORSTELLEN · KOSTENLOS · OPEN SOURCE · FÜR KI GEMACHT',
    headlineBefore: 'Alle Diagramme, die ',
    headlineAccent: 'Ärzte, Ingenieure und Juristen',
    headlineAfter: ' wirklich nutzen.',
    subhead: (count) =>
      `Schematex zeichnet die ${count} Diagramme, die Ärzte, Ingenieure und Juristen schon von Hand zeichnen — klinische Genogramme, IEC 61131-3-Leiterlogi, NSGC-Stammbäume, Cap-Tables. Text-DSL rein, normenkonformes SVG raus.`,
    ctaPlayground: 'Playground öffnen',
    docsLink: 'Dokumentation ↗',
  },
  standardsRail: { ariaLabel: 'Abgedeckte Normen' },
  cases: {
    eyebrow: '02 / DIAGRAMME, DIE PROFIS WIRKLICH NUTZEN',
    heading: 'Die Diagramme, die Ihr Arzt, Ingenieur oder Jurist wirklich nutzt.',
    body: 'Jede Diagrammfamilie ist für den Praktiker gebaut, der sie beherrscht — von wenigen DSL-Zeilen bis zur Version, die ein Fachexperte in eine Akte, ein Memo oder einen Antrag setzen würde. Jede Ausgabe entspricht einem veröffentlichten Standard.',
    openInPlayground: '→ im Playground öffnen',
    browseGallery: 'Die vollständige Galerie durchsuchen →',
  },
  why: {
    eyebrow: '03 / WARUM',
    heading: 'Kostenlos. Vollständig open source. Für KI gemacht.',
    body: 'Generische Diagramm-Tools können keine professionellen Diagramme zeichnen. Schematex behandelt jeden Standard als First-Class-Citizen — und das Ganze ist AGPL-3.0, ohne Abhängigkeiten, konzipiert, damit LLMs es beim ersten Versuch ausgeben.',
    cards: {
      families: {
        unit: 'FAMILIEN',
        title: 'Diagramme, die Profis wirklich nutzen',
        body: 'Jeder Diagrammtyp implementiert eine veröffentlichte Spezifikation — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. Ärzte, Ingenieure und Juristen zeichnen sie schon von Hand; jetzt können sie sie aus Code generieren.',
      },
      free: {
        stat: '100 %',
        unit: 'KOSTENLOS · OPEN SOURCE',
        title: 'AGPL-3.0, null Runtime-Abhängigkeiten',
        body: 'Kein D3, kein dagre, keine Parser-Generatoren, keine Telemetrie, keine gesperrten Funktionen. KB-Bundle, SSR-sicher, kommerzielle Lizenz für Closed-Source-Nutzung verfügbar.',
      },
      ai: {
        stat: 'KI',
        unit: 'ERSTKLASSIG',
        title: 'Für LLM-Ausgabe konzipiert',
        body: 'Minimale Grammatiken, die darauf ausgelegt sind, wie LLMs tatsächlich Text schreiben — CJK-Anführungszeichen, Verschachtelungs-Ambiguität, KI-lesbare Fehler. Einfach die Ausgabe von ChatGPT oder Claude einfügen und beim ersten Versuch ein professionelles Diagramm erhalten.',
      },
    },
  },
  positioning: {
    eyebrow: '04 / POSITIONIERUNG',
    heading: 'Nicht noch eine Flowchart-Bibliothek.',
    body: 'So unterscheidet sich Schematex von den Tools, die man bereits kennt.',
    columns: {
      tool: 'Tool',
      domain: 'Professionelle Fachdiagramme',
      price: 'Preis',
      forDevelopers: 'Für Entwickler',
      aiFriendly: 'KI-freundlich',
    },
    free: 'kostenlos',
    partial: 'teilweise',
    rows: {
      mermaid: { domain: 'nur Flowcharts', dev: '✓ (npm)' },
      d2: { domain: 'nur Architektur', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'nur Timing', dev: '✓ (npm)' },
      plantuml: { domain: 'nur UML', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} Familien · spec-zitiert`,
      dev: '✓ (0 deps, npm)',
      ai: 'dafür gemacht',
    },
  },
  quickstart: {
    eyebrow: '05 / SCHNELLSTART',
    heading: 'In 10 Sekunden installiert.',
    body: 'Eine Funktion, ein String rein, ein SVG raus. Funktioniert überall, wo TypeScript läuft.',
    snippets: {
      vanilla: { title: 'Vanilla TypeScript', hint: 'universell' },
      nextjs: { title: 'Next.js (Server)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (Client)', hint: 'interaktiv' },
    },
    fullDocs: 'Vollständige Dokumentation →',
  },
  finalCta: {
    starNote: "Kostenlos und Open Source – ein Stern hilft anderen Entwicklern, es zu finden.",
    heading: 'Starte mit einem einzigen String.',
    body: (count) =>
      `Öffne den Playground, um jeden der ${count} Diagrammtypen live zu rendern — oder durchsuche die Galerie nach DSL zum Kopieren, Einfügen und Anpassen.`,
    openPlayground: 'Den Playground öffnen →',
    browseGallery: 'Die Galerie durchsuchen',
  },
  footer: {
    tagline:
      'Alle Diagramme, die ein Arzt, Ingenieur oder Jurist tatsächlich verwenden würde. Kostenlos. Vollständig open source. Für KI gemacht. AGPL-3.0.',
    cols: {
      product: {
        heading: 'Produkt',
        playground: 'Playground',
        gallery: 'Galerie',
        examples: 'Beispiele',
      },
      docs: {
        heading: 'Dokumentation',
        gettingStarted: 'Erste Schritte',
        diagramTypes: 'Diagrammtypen',
        apiReference: 'API-Referenz',
      },
      community: {
        heading: 'Community',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'Mitwirken',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'Kopieren' },
};

export default de;
