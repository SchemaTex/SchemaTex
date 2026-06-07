import type { Dictionary } from './en';

const it: Dictionary = {
  nav: {
    docs: 'Documentazione',
    gallery: 'Galleria',
    icons: 'Icone',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: 'Lingua' },
  meta: {
    title: 'Schematex — I diagrammi che medici, ingegneri e avvocati usano davvero',
    description: (count) =>
      `Tutti i diagrammi che un medico, un ingegnere o un avvocato userebbe davvero. Gratuito. Completamente open source. Fatto per l'IA. ${count} diagrammi standard del settore da un DSL testuale. SVG puro, zero dipendenze.`,
  },
  hero: {
    eyebrow: '01 / PRESENTANDO SCHEMATEX · GRATUITO · OPEN SOURCE · FATTO PER L\'IA',
    headlineBefore: 'Tutti i diagrammi che ',
    headlineAccent: 'medici, ingegneri e avvocati',
    headlineAfter: ' usano davvero.',
    subhead: (count) =>
      `Schematex disegna i ${count} diagrammi che medici, ingegneri e avvocati già tracciano a mano — genogrammi clinici, logica ladder IEC 61131-3, pedigree NSGC, cap table. Testo DSL in ingresso, SVG conforme agli standard in uscita.`,
    ctaPlayground: 'Apri il playground',
    docsLink: 'documentazione ↗',
  },
  standardsRail: { ariaLabel: 'Standard coperti' },
  cases: {
    eyebrow: '02 / DIAGRAMMI CHE I PROFESSIONISTI USANO DAVVERO',
    heading: 'I diagrammi che il tuo medico, ingegnere o avvocato usa davvero.',
    body: 'Ogni famiglia di diagrammi è costruita per il professionista che la padroneggia — da poche righe di DSL fino alla versione che un esperto del settore metterebbe in una cartella, un memo o un permesso. Ogni output è conforme a uno standard pubblicato.',
    openInPlayground: '→ apri nel playground',
    browseGallery: 'Sfoglia la galleria completa →',
  },
  why: {
    eyebrow: '03 / PERCHÉ',
    heading: 'Gratuito. Completamente open source. Fatto per l\'IA.',
    body: 'Gli strumenti di diagrammi generici non sanno disegnare diagrammi professionali. Schematex tratta ogni standard come cittadino di prima classe — il tutto è AGPL-3.0, senza dipendenze, progettato per essere emesso dai LLM al primo tentativo.',
    cards: {
      families: {
        unit: 'FAMIGLIE',
        title: 'Diagrammi che i professionisti usano davvero',
        body: 'Ogni tipo implementa una specifica pubblicata — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. Medici, ingegneri e avvocati li tracciano già a mano; ora possono generarli dal codice.',
      },
      free: {
        stat: '100%',
        unit: 'GRATUITO · OPEN SOURCE',
        title: 'AGPL-3.0, zero dipendenze a runtime',
        body: 'Niente D3, niente dagre, niente generatori di parser, niente telemetria, niente funzionalità bloccate. Bundle in KB, compatibile con SSR, licenza commerciale disponibile per uso in codice chiuso.',
      },
      ai: {
        stat: 'IA',
        unit: 'NATIVA',
        title: 'Progettato per essere emesso dai LLM',
        body: 'Grammatiche minimali progettate attorno a come i LLM scrivono testo — virgolette CJK, ambiguità di annidamento, errori leggibili dall\'IA. Incolla l\'output di ChatGPT o Claude e ottieni un diagramma professionale al primo colpo.',
      },
    },
  },
  positioning: {
    eyebrow: '04 / POSIZIONAMENTO',
    heading: 'Non l\'ennesima libreria di flowchart.',
    body: 'Come Schematex si confronta con gli strumenti già usati.',
    columns: {
      tool: 'Strumento',
      domain: 'Diagrammi di dominio professionale',
      price: 'Prezzo',
      forDevelopers: 'Per sviluppatori',
      aiFriendly: 'Compatibile con IA',
    },
    free: 'gratuito',
    partial: 'parziale',
    rows: {
      mermaid: { domain: 'solo flowchart', dev: '✓ (npm)' },
      d2: { domain: 'solo architettura', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'solo timing', dev: '✓ (npm)' },
      plantuml: { domain: 'solo UML', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} famiglie · spec citata`,
      dev: '✓ (0 deps, npm)',
      ai: 'progettato per questo',
    },
  },
  quickstart: {
    eyebrow: '05 / AVVIO RAPIDO',
    heading: 'Installa in 10 secondi.',
    body: 'Una funzione, una stringa in ingresso, un SVG in uscita. Funziona ovunque funzioni TypeScript.',
    snippets: {
      vanilla: { title: 'TypeScript puro', hint: 'universale' },
      nextjs: { title: 'Next.js (Server)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (Client)', hint: 'interattivo' },
    },
    fullDocs: 'Documentazione completa →',
  },
  finalCta: {
    heading: 'Inizia con una singola stringa.',
    body: (count) =>
      `Apri il playground per renderizzare uno qualsiasi dei ${count} tipi di diagrammi in tempo reale — o sfoglia la galleria per DSL da copiare, incollare e adattare.`,
    openPlayground: 'Apri il Playground →',
    browseGallery: 'Sfoglia la Galleria',
  },
  footer: {
    tagline:
      'Tutti i diagrammi che un medico, ingegnere o avvocato userebbe davvero. Gratuito. Completamente open source. Fatto per l\'IA. AGPL-3.0.',
    cols: {
      product: {
        heading: 'Prodotto',
        playground: 'Playground',
        gallery: 'Galleria',
        examples: 'Esempi',
      },
      docs: {
        heading: 'Documentazione',
        gettingStarted: 'Per iniziare',
        diagramTypes: 'Tipi di diagramma',
        apiReference: 'Riferimento API',
      },
      community: {
        heading: 'Comunità',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'Contribuire',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'Copia' },
};

export default it;
