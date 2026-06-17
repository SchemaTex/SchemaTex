import type { Dictionary } from './en';

const fr: Dictionary = {
  nav: {
    docs: 'Documentation',
    gallery: 'Galerie',
    icons: 'Icônes',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: 'Langue' },
  meta: {
    title: 'Schematex — Les diagrammes qu\'utilisent vraiment médecins, ingénieurs et juristes',
    description: (count) =>
      `Tous les diagrammes qu'un médecin, un ingénieur ou un juriste utiliserait vraiment. Gratuit. Entièrement open source. Conçu pour l'IA. ${count} diagrammes aux normes industrielles depuis un DSL textuel. SVG pur, zéro dépendance.`,
  },
  hero: {
    eyebrow: '01 / DÉCOUVREZ SCHEMATEX · GRATUIT · OPEN SOURCE · CONÇU POUR L\'IA',
    headlineBefore: 'Tous les diagrammes que ',
    headlineAccent: 'médecins, ingénieurs et juristes',
    headlineAfter: ' utilisent vraiment.',
    subhead: (count) =>
      `Schematex trace les ${count} diagrammes que médecins, ingénieurs et juristes dessinent déjà à la main — génogrammes cliniques, schémas ladder IEC 61131-3, pedigrees NSGC, tableaux de capitalisation. Texte DSL en entrée, SVG conforme aux normes en sortie.`,
    ctaPlayground: 'Ouvrir le playground',
    docsLink: 'documentation ↗',
  },
  standardsRail: { ariaLabel: 'Normes couvertes' },
  cases: {
    eyebrow: '02 / LES DIAGRAMMES QUE LES PROFESSIONNELS UTILISENT VRAIMENT',
    heading: 'Les diagrammes que votre médecin, ingénieur ou juriste utilise vraiment.',
    body: 'Chaque famille de diagrammes est conçue pour le praticien qui en a la maîtrise — de quelques lignes de DSL jusqu\'à la version qu\'un expert mettrait dans un dossier, un mémo ou un permis. Chaque sortie respecte une norme publiée.',
    openInPlayground: '→ ouvrir dans le playground',
    browseGallery: 'Parcourir la galerie complète →',
  },
  why: {
    eyebrow: '03 / POURQUOI',
    heading: 'Gratuit. Entièrement open source. Conçu pour l\'IA.',
    body: 'Les outils génériques de diagrammes ne savent pas dessiner des diagrammes professionnels. Schematex traite chaque norme comme un citoyen de première classe — le tout est AGPL-3.0, sans dépendances, conçu pour que les LLMs l\'émettent du premier coup.',
    cards: {
      families: {
        unit: 'FAMILLES',
        title: 'Les diagrammes que les professionnels utilisent vraiment',
        body: 'Chaque type implémente une spécification publiée — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. Médecins, ingénieurs et juristes les tracent déjà à la main ; ils peuvent désormais les générer depuis du code.',
      },
      free: {
        stat: '100 %',
        unit: 'GRATUIT · OPEN SOURCE',
        title: 'AGPL-3.0, zéro dépendance de runtime',
        body: 'Sans D3, sans dagre, sans générateurs de parsers, sans télémétrie, sans fonctionnalités verrouillées. Bundle en Ko, compatible SSR, licence commerciale disponible pour les usages en code fermé.',
      },
      ai: {
        stat: 'IA',
        unit: 'EN NATIF',
        title: 'Conçu pour être émis par les LLMs',
        body: 'Grammaires minimales pensées selon la façon dont les LLMs écrivent réellement — guillemets CJK, ambiguïté d\'imbrication, erreurs lisibles par l\'IA. Collez la sortie de ChatGPT ou Claude et obtenez un diagramme professionnel dès le premier essai.',
      },
    },
  },
  positioning: {
    eyebrow: '04 / POSITIONNEMENT',
    heading: 'Pas encore une bibliothèque de diagrammes de flux.',
    body: 'Comment Schematex se compare aux outils déjà utilisés.',
    columns: {
      tool: 'Outil',
      domain: 'Diagrammes de domaine professionnel',
      price: 'Prix',
      forDevelopers: 'Pour les développeurs',
      aiFriendly: 'Compatible IA',
    },
    free: 'gratuit',
    partial: 'partiel',
    rows: {
      mermaid: { domain: 'seulement des organigrammes', dev: '✓ (npm)' },
      d2: { domain: 'seulement l\'architecture', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'seulement le timing', dev: '✓ (npm)' },
      plantuml: { domain: 'seulement UML', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} familles · spec citée`,
      dev: '✓ (0 deps, npm)',
      ai: 'conçu pour ça',
    },
  },
  quickstart: {
    eyebrow: '05 / DÉMARRAGE RAPIDE',
    heading: 'Installation en 10 secondes.',
    body: 'Une fonction, une chaîne en entrée, un SVG en sortie. Fonctionne partout où TypeScript fonctionne.',
    snippets: {
      vanilla: { title: 'TypeScript pur', hint: 'universel' },
      nextjs: { title: 'Next.js (Serveur)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (Client)', hint: 'interactif' },
    },
    fullDocs: 'Documentation complète →',
  },
  finalCta: {
    starNote: "Gratuit et open source — une étoile aide les autres développeurs à le découvrir.",
    heading: 'Commencez avec une seule chaîne.',
    body: (count) =>
      `Ouvrez le playground pour rendre l'un des ${count} types de diagrammes en direct — ou parcourez la galerie pour du DSL à copier, coller et adapter.`,
    openPlayground: 'Ouvrir le Playground →',
    browseGallery: 'Parcourir la Galerie',
  },
  footer: {
    tagline:
      'Tous les diagrammes qu\'un médecin, ingénieur ou juriste utiliserait vraiment. Gratuit. Entièrement open source. Conçu pour l\'IA. AGPL-3.0.',
    cols: {
      product: {
        heading: 'Produit',
        playground: 'Playground',
        gallery: 'Galerie',
        examples: 'Exemples',
      },
      docs: {
        heading: 'Documentation',
        gettingStarted: 'Premiers pas',
        diagramTypes: 'Types de diagramme',
        apiReference: 'Référence API',
      },
      community: {
        heading: 'Communauté',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'Contribuer',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'Copier' },
};

export default fr;
