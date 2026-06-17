import type { Dictionary } from './en';

const ar: Dictionary = {
  nav: {
    docs: 'التوثيق',
    gallery: 'المعرض',
    icons: 'الأيقونات',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: 'اللغة' },
  meta: {
    title: 'Schematex — المخططات التي يستخدمها الأطباء والمهندسون والمحامون فعلاً',
    description: (count) =>
      `جميع المخططات التي سيحتاجها طبيب أو مهندس أو محامٍ فعلاً. مجاني. مفتوح المصدر بالكامل. مصنوع للذكاء الاصطناعي. ${count} مخططاً وفق معايير الصناعة من DSL نصي. SVG نقي، بلا تبعيات.`,
  },
  hero: {
    eyebrow: '01 / نقدم SCHEMATEX · مجاني · مفتوح المصدر · مصنوع للذكاء الاصطناعي',
    headlineBefore: 'كل مخطط يحتاجه ',
    headlineAccent: 'الأطباء والمهندسون والمحامون',
    headlineAfter: ' فعلاً.',
    subhead: (count) =>
      `يرسم Schematex ${count} مخططاً يرسمها الأطباء والمهندسون والمحامون يدوياً بالفعل — الجينوغرامات السريرية، منطق السلم IEC 61131-3، نسب NSGC، جداول الرسملة. أدخل DSL نصياً، واحصل على SVG متوافقاً مع المعايير.`,
    ctaPlayground: 'افتح Playground',
    docsLink: 'التوثيق ↗',
  },
  standardsRail: { ariaLabel: 'المعايير المدعومة' },
  cases: {
    eyebrow: '02 / مخططات يستخدمها المحترفون فعلاً',
    heading: 'المخططات التي يستخدمها طبيبك أو مهندسك أو محاميك فعلاً.',
    body: 'بُنيت كل عائلة مخططات للممارس الذي يتقنها — من بضعة أسطر DSL وصولاً إلى النسخة التي سيضعها خبير المجال في ملف أو مذكرة أو تصريح. كل مخرج يلتزم بمعيار منشور.',
    openInPlayground: '→ افتح في Playground',
    browseGallery: 'تصفح المعرض الكامل →',
  },
  why: {
    eyebrow: '03 / لماذا',
    heading: 'مجاني. مفتوح المصدر بالكامل. مصنوع للذكاء الاصطناعي.',
    body: 'أدوات المخططات العامة لا تستطيع رسم مخططات احترافية. يعامل Schematex كل معيار كمواطن من الدرجة الأولى — والكل AGPL-3.0، بلا تبعيات، مصمم ليتمكن النماذج اللغوية الكبيرة من إصداره في المحاولة الأولى.',
    cards: {
      families: {
        unit: 'عائلة',
        title: 'مخططات يستخدمها المحترفون فعلاً',
        body: 'كل نوع مخطط ينفذ مواصفة منشورة — McGoldrick، IEC 61131-3، IEEE 315، NSGC، Newick. الأطباء والمهندسون والمحامون يرسمونها يدوياً بالفعل؛ الآن يمكنهم توليدها من الكود.',
      },
      free: {
        stat: '100%',
        unit: 'مجاني · مفتوح المصدر',
        title: 'AGPL-3.0، بلا تبعيات وقت التشغيل',
        body: 'بلا D3، بلا dagre، بلا مولدات محلل، بلا قياس عن بُعد، بلا ميزات مقفلة. حزمة بحجم KB، آمنة للـ SSR، ترخيص تجاري متاح للاستخدام في الكود المغلق.',
      },
      ai: {
        stat: 'ذكاء اصطناعي',
        unit: 'درجة أولى',
        title: 'مصمم ليصدره النموذج اللغوي',
        body: 'قواعد نحو بسيطة مصممة وفق الطريقة الحقيقية التي تكتب بها النماذج اللغوية — علامات اقتباس CJK، غموض التداخل، أخطاء يقرأها الذكاء الاصطناعي. الصق مخرجات ChatGPT أو Claude واحصل على مخطط احترافي من المحاولة الأولى.',
      },
    },
  },
  positioning: {
    eyebrow: '04 / التموضع',
    heading: 'ليست مجرد مكتبة مخططات انسيابية أخرى.',
    body: 'كيف يقارن Schematex بالأدوات التي يستخدمها الناس بالفعل.',
    columns: {
      tool: 'الأداة',
      domain: 'مخططات المجال الاحترافي',
      price: 'السعر',
      forDevelopers: 'للمطورين',
      aiFriendly: 'ملائم للذكاء الاصطناعي',
    },
    free: 'مجاني',
    partial: 'جزئي',
    rows: {
      mermaid: { domain: 'مخططات انسيابية فقط', dev: '✓ (npm)' },
      d2: { domain: 'هندسة معمارية فقط', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'توقيت فقط', dev: '✓ (npm)' },
      plantuml: { domain: 'UML فقط', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} عائلة · مستشهد بالمواصفة`,
      dev: '✓ (0 deps, npm)',
      ai: 'مصمم لذلك',
    },
  },
  quickstart: {
    eyebrow: '05 / البدء السريع',
    heading: 'ثبِّت في 10 ثوانٍ.',
    body: 'دالة واحدة، سلسلة نصية مدخلة، SVG مخرج. يعمل في أي مكان يعمل فيه TypeScript.',
    snippets: {
      vanilla: { title: 'Vanilla TypeScript', hint: 'عالمي' },
      nextjs: { title: 'Next.js (خادم)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (عميل)', hint: 'تفاعلي' },
    },
    fullDocs: 'التوثيق الكامل →',
  },
  finalCta: {
    starNote: "مجاني ومفتوح المصدر — نجمة واحدة تساعد المطوّرين الآخرين على اكتشافه.",
    heading: 'ابدأ بسلسلة نصية واحدة.',
    body: (count) =>
      `افتح Playground لعرض أي من ${count} نوعاً من المخططات مباشرةً — أو تصفح المعرض للحصول على DSL يمكنك نسخه ولصقه وتكييفه.`,
    openPlayground: 'افتح Playground →',
    browseGallery: 'تصفح المعرض',
  },
  footer: {
    tagline:
      'كل مخطط يحتاجه طبيب أو مهندس أو محامٍ فعلاً. مجاني. مفتوح المصدر بالكامل. مصنوع للذكاء الاصطناعي. AGPL-3.0.',
    cols: {
      product: {
        heading: 'المنتج',
        playground: 'Playground',
        gallery: 'المعرض',
        examples: 'الأمثلة',
      },
      docs: {
        heading: 'التوثيق',
        gettingStarted: 'البدء',
        diagramTypes: 'أنواع المخططات',
        apiReference: 'مرجع API',
      },
      community: {
        heading: 'المجتمع',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'المساهمة',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'نسخ' },
};

export default ar;
