import type { Dictionary } from './en';

const es: Dictionary = {
  nav: {
    docs: 'Documentación',
    gallery: 'Galería',
    icons: 'Iconos',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: 'Idioma' },
  meta: {
    title: 'Schematex — Diagramas que médicos, ingenieros y abogados realmente usan',
    description: (count) =>
      `Todos los diagramas que un médico, ingeniero o abogado usaría de verdad. Gratis. Completamente open source. Hecho para IA. ${count} diagramas estándar de la industria desde un DSL de texto. SVG puro, sin dependencias.`,
  },
  hero: {
    eyebrow: '01 / PRESENTANDO SCHEMATEX · GRATIS · OPEN SOURCE · HECHO PARA IA',
    headlineBefore: 'Todos los diagramas que ',
    headlineAccent: 'médicos, ingenieros y abogados',
    headlineAfter: ' realmente usan.',
    subhead: (count) =>
      `Schematex dibuja los ${count} diagramas que médicos, ingenieros y abogados ya trazan a mano — genogramas clínicos, lógica de escalera IEC 61131-3, pedigríes NSGC, tablas de capitalización. Texto DSL como entrada, SVG conforme a estándares como salida.`,
    ctaPlayground: 'Abrir playground',
    docsLink: 'documentación ↗',
  },
  standardsRail: { ariaLabel: 'Estándares cubiertos' },
  cases: {
    eyebrow: '02 / DIAGRAMAS QUE LOS PROFESIONALES REALMENTE USAN',
    heading: 'Los diagramas que tu médico, ingeniero o abogado realmente usa.',
    body: 'Cada familia de diagramas está construida para el profesional que la domina — desde unas pocas líneas de DSL hasta la versión que un experto pondría en un expediente, un memo o un permiso. Cada salida cumple un estándar publicado.',
    openInPlayground: '→ abrir en playground',
    browseGallery: 'Ver la galería completa →',
  },
  why: {
    eyebrow: '03 / POR QUÉ',
    heading: 'Gratis. Completamente open source. Hecho para IA.',
    body: 'Las herramientas genéricas de diagramas no pueden dibujar diagramas profesionales. Schematex trata cada estándar como ciudadano de primera clase — y todo es AGPL-3.0, sin dependencias, diseñado para que los LLMs lo emitan al primer intento.',
    cards: {
      families: {
        unit: 'FAMILIAS',
        title: 'Diagramas que los profesionales realmente usan',
        body: 'Cada tipo implementa una especificación publicada — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. Médicos, ingenieros y abogados ya los trazan a mano; ahora pueden generarlos desde código.',
      },
      free: {
        stat: '100%',
        unit: 'GRATIS · OPEN SOURCE',
        title: 'AGPL-3.0, sin dependencias de runtime',
        body: 'Sin D3, sin dagre, sin generadores de parsers, sin telemetría, sin funciones bloqueadas. Bundle de KB, compatible con SSR, licencia comercial disponible para uso de código cerrado.',
      },
      ai: {
        stat: 'IA',
        unit: 'DE PRIMERA CLASE',
        title: 'Diseñado para que los LLMs lo emitan',
        body: 'Gramáticas mínimas diseñadas en torno a cómo los LLMs realmente escriben texto — comillas CJK, ambigüedad de anidado, errores legibles por IA. Pega la salida de ChatGPT o Claude y obtén un diagrama profesional al primer intento.',
      },
    },
  },
  positioning: {
    eyebrow: '04 / POSICIONAMIENTO',
    heading: 'No es otra librería de diagramas de flujo.',
    body: 'Cómo Schematex se compara con las herramientas que la gente ya usa.',
    columns: {
      tool: 'Herramienta',
      domain: 'Diagramas de dominio profesional',
      price: 'Precio',
      forDevelopers: 'Para desarrolladores',
      aiFriendly: 'Amigable con IA',
    },
    free: 'gratis',
    partial: 'parcial',
    rows: {
      mermaid: { domain: 'solo diagramas de flujo', dev: '✓ (npm)' },
      d2: { domain: 'solo arquitectura', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'solo timing', dev: '✓ (npm)' },
      plantuml: { domain: 'solo UML', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} familias · spec citada`,
      dev: '✓ (0 deps, npm)',
      ai: 'diseñado para ello',
    },
  },
  quickstart: {
    eyebrow: '05 / INICIO RÁPIDO',
    heading: 'Instala en 10 segundos.',
    body: 'Una función, una cadena de entrada, un SVG de salida. Funciona en cualquier lugar donde TypeScript funcione.',
    snippets: {
      vanilla: { title: 'TypeScript puro', hint: 'universal' },
      nextjs: { title: 'Next.js (Servidor)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (Cliente)', hint: 'interactivo' },
    },
    fullDocs: 'Documentación completa →',
  },
  finalCta: {
    starNote: "Gratis y de código abierto: una estrella ayuda a que otros desarrolladores lo encuentren.",
    heading: 'Empieza con una sola cadena.',
    body: (count) =>
      `Abre el playground para renderizar cualquiera de los ${count} tipos de diagramas en vivo — o navega la galería para DSL que puedes copiar, pegar y adaptar.`,
    openPlayground: 'Abrir el Playground →',
    browseGallery: 'Ver la Galería',
  },
  footer: {
    tagline:
      'Todos los diagramas que un médico, ingeniero o abogado usaría de verdad. Gratis. Completamente open source. Hecho para IA. AGPL-3.0.',
    cols: {
      product: {
        heading: 'Producto',
        playground: 'Playground',
        gallery: 'Galería',
        examples: 'Ejemplos',
      },
      docs: {
        heading: 'Documentación',
        gettingStarted: 'Primeros pasos',
        diagramTypes: 'Tipos de diagrama',
        apiReference: 'Referencia de API',
      },
      community: {
        heading: 'Comunidad',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'Contribuir',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'Copiar' },
};

export default es;
