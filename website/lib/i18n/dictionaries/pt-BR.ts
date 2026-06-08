import type { Dictionary } from './en';

const ptBR: Dictionary = {
  nav: {
    docs: 'Documentação',
    gallery: 'Galeria',
    icons: 'Ícones',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: 'Idioma' },
  meta: {
    title: 'Schematex — Diagramas que médicos, engenheiros e advogados realmente usam',
    description: (count) =>
      `Todos os diagramas que um médico, engenheiro ou advogado usaria de verdade. Gratuito. Totalmente open source. Feito para IA. ${count} diagramas padrão da indústria a partir de um DSL de texto. SVG puro, sem dependências.`,
  },
  hero: {
    eyebrow: '01 / APRESENTANDO SCHEMATEX · GRATUITO · OPEN SOURCE · FEITO PARA IA',
    headlineBefore: 'Todos os diagramas que ',
    headlineAccent: 'médicos, engenheiros e advogados',
    headlineAfter: ' realmente usam.',
    subhead: (count) =>
      `Schematex desenha os ${count} diagramas que médicos, engenheiros e advogados já traçam à mão — genogramas clínicos, lógica ladder IEC 61131-3, pedigrees NSGC, tabelas de capitalização. Texto DSL como entrada, SVG em conformidade com padrões como saída.`,
    ctaPlayground: 'Abrir playground',
    docsLink: 'documentação ↗',
  },
  standardsRail: { ariaLabel: 'Padrões cobertos' },
  cases: {
    eyebrow: '02 / DIAGRAMAS QUE OS PROFISSIONAIS REALMENTE USAM',
    heading: 'Os diagramas que seu médico, engenheiro ou advogado realmente usa.',
    body: 'Cada família de diagramas é construída para o profissional que a domina — de poucas linhas de DSL até a versão que um especialista colocaria num prontuário, memo ou licença. Cada saída obedece a um padrão publicado.',
    openInPlayground: '→ abrir no playground',
    browseGallery: 'Ver a galeria completa →',
  },
  why: {
    eyebrow: '03 / POR QUÊ',
    heading: 'Gratuito. Totalmente open source. Feito para IA.',
    body: 'Ferramentas genéricas de diagramas não conseguem desenhar diagramas profissionais. Schematex trata cada padrão como cidadão de primeira classe — e tudo é AGPL-3.0, sem dependências, projetado para LLMs emitirem na primeira tentativa.',
    cards: {
      families: {
        unit: 'FAMÍLIAS',
        title: 'Diagramas que os profissionais realmente usam',
        body: 'Cada tipo implementa uma especificação publicada — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. Médicos, engenheiros e advogados já os traçam à mão; agora podem gerá-los a partir de código.',
      },
      free: {
        stat: '100%',
        unit: 'GRATUITO · OPEN SOURCE',
        title: 'AGPL-3.0, sem dependências de runtime',
        body: 'Sem D3, sem dagre, sem geradores de parsers, sem telemetria, sem funcionalidades bloqueadas. Bundle em KB, compatível com SSR, licença comercial disponível para uso em código fechado.',
      },
      ai: {
        stat: 'IA',
        unit: 'DE PRIMEIRA CLASSE',
        title: 'Projetado para LLMs emitirem',
        body: 'Gramáticas mínimas projetadas em torno de como LLMs realmente escrevem texto — aspas CJK, ambiguidade de aninhamento, erros legíveis por IA. Cole a saída do ChatGPT ou Claude e obtenha um diagrama profissional de primeira.',
      },
    },
  },
  positioning: {
    eyebrow: '04 / POSICIONAMENTO',
    heading: 'Não é mais uma biblioteca de fluxogramas.',
    body: 'Como Schematex se compara às ferramentas que as pessoas já usam.',
    columns: {
      tool: 'Ferramenta',
      domain: 'Diagramas de domínio profissional',
      price: 'Preço',
      forDevelopers: 'Para desenvolvedores',
      aiFriendly: 'Compatível com IA',
    },
    free: 'gratuito',
    partial: 'parcial',
    rows: {
      mermaid: { domain: 'só fluxogramas', dev: '✓ (npm)' },
      d2: { domain: 'só arquitetura', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'só timing', dev: '✓ (npm)' },
      plantuml: { domain: 'só UML', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} famílias · spec citada`,
      dev: '✓ (0 deps, npm)',
      ai: 'projetado para isso',
    },
  },
  quickstart: {
    eyebrow: '05 / INÍCIO RÁPIDO',
    heading: 'Instale em 10 segundos.',
    body: 'Uma função, uma string de entrada, um SVG de saída. Funciona em qualquer lugar onde TypeScript funcione.',
    snippets: {
      vanilla: { title: 'TypeScript puro', hint: 'universal' },
      nextjs: { title: 'Next.js (Servidor)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (Cliente)', hint: 'interativo' },
    },
    fullDocs: 'Documentação completa →',
  },
  finalCta: {
    heading: 'Comece com uma única string.',
    body: (count) =>
      `Abra o playground para renderizar qualquer um dos ${count} tipos de diagramas ao vivo — ou navegue na galeria para DSL que você pode copiar, colar e adaptar.`,
    openPlayground: 'Abrir o Playground →',
    browseGallery: 'Ver a Galeria',
  },
  footer: {
    tagline:
      'Todos os diagramas que um médico, engenheiro ou advogado usaria de verdade. Gratuito. Totalmente open source. Feito para IA. AGPL-3.0.',
    cols: {
      product: {
        heading: 'Produto',
        playground: 'Playground',
        gallery: 'Galeria',
        examples: 'Exemplos',
      },
      docs: {
        heading: 'Documentação',
        gettingStarted: 'Introdução',
        diagramTypes: 'Tipos de diagrama',
        apiReference: 'Referência da API',
      },
      community: {
        heading: 'Comunidade',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'Contribuir',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'Copiar' },
};

export default ptBR;
