import type { Dictionary } from './en';

const tr: Dictionary = {
  nav: {
    docs: 'Belgeler',
    gallery: 'Galeri',
    icons: 'İkonlar',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: 'Dil' },
  meta: {
    title: 'Schematex — Doktorların, mühendislerin ve avukatların gerçekten kullandığı diyagramlar',
    description: (count) =>
      `Bir doktorun, mühendisin veya avukatın gerçekten kullanacağı her diyagram. Ücretsiz. Tamamen açık kaynak. AI için tasarlandı. Metin DSL'den ${count} endüstri standardı diyagram. Saf SVG, sıfır bağımlılık.`,
  },
  hero: {
    eyebrow: '01 / SCHEMATEX\'İ TANIYUN · ÜCRETSİZ · AÇIK KAYNAK · AI İÇİN YAPILDI',
    headlineBefore: '',
    headlineAccent: 'Doktorların, mühendislerin ve avukatların',
    headlineAfter: ' gerçekten kullandığı her diyagram.',
    subhead: (count) =>
      `Schematex, doktorların, mühendislerin ve avukatların zaten elle çizdiği ${count} diyagramı oluşturur — klinik genogramlar, IEC 61131-3 merdiven mantığı, NSGC pedigriler, sermaye tabloları. Metin DSL giriş, standartlara uygun SVG çıkış.`,
    ctaPlayground: 'Playground\'ı aç',
    docsLink: 'belgeler ↗',
  },
  standardsRail: { ariaLabel: 'Desteklenen standartlar' },
  cases: {
    eyebrow: '02 / PROFESYONELLERİN GERÇEKTEN KULLANDIĞI DİYAGRAMLAR',
    heading: 'Doktorunuzun, mühendisinizin veya avukatınızın gerçekten kullandığı diyagramlar.',
    body: 'Her diyagram ailesi, onu bilen uygulayıcı için inşa edilmiştir — birkaç DSL satırından, bir alan uzmanının bir grafiğe, notaya veya izne koyacağı versiyona kadar. Her çıktı yayımlanmış bir standarda uygundur.',
    openInPlayground: '→ playground\'da aç',
    browseGallery: 'Tam galeriyi incele →',
  },
  why: {
    eyebrow: '03 / NEDEN',
    heading: 'Ücretsiz. Tamamen açık kaynak. AI için tasarlandı.',
    body: 'Genel amaçlı diyagram araçları profesyonel diyagramlar çizemez. Schematex her standardı birinci sınıf vatandaş olarak ele alır — ve tamamı AGPL-3.0, bağımlılıksız, LLM\'lerin ilk denemede üretmesi için tasarlanmış.',
    cards: {
      families: {
        unit: 'AİLE',
        title: 'Profesyonellerin gerçekten kullandığı diyagramlar',
        body: 'Her diyagram türü yayımlanmış bir spesifikasyonu uygular — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. Doktorlar, mühendisler ve avukatlar zaten bunları elle çiziyor; artık koddan üretebilirler.',
      },
      free: {
        stat: '%100',
        unit: 'ÜCRETSİZ · AÇIK KAYNAK',
        title: 'AGPL-3.0, sıfır çalışma zamanı bağımlılığı',
        body: 'D3 yok, dagre yok, ayrıştırıcı oluşturucu yok, telemetri yok, kilitli özellik yok. KB boyutunda paket, SSR güvenli, kapalı kaynak kullanım için ticari lisans mevcut.',
      },
      ai: {
        stat: 'AI',
        unit: 'BİRİNCİ SINIF',
        title: 'LLM\'lerin üretmesi için tasarlandı',
        body: 'LLM\'lerin gerçekte metin yazma biçimine göre tasarlanmış minimal dilbilgisi — CJK alıntıları, iç içe geçme belirsizliği, AI tarafından okunabilir hatalar. ChatGPT veya Claude çıktısını yapıştır, ilk denemede profesyonel bir diyagram al.',
      },
    },
  },
  positioning: {
    eyebrow: '04 / KONUMLANDIRMA',
    heading: 'Bir akış diyagramı kütüphanesi daha değil.',
    body: 'Schematex\'in insanların zaten kullandığı araçlarla karşılaştırması.',
    columns: {
      tool: 'Araç',
      domain: 'Profesyonel alan diyagramları',
      price: 'Fiyat',
      forDevelopers: 'Geliştiriciler için',
      aiFriendly: 'AI uyumlu',
    },
    free: 'ücretsiz',
    partial: 'kısmi',
    rows: {
      mermaid: { domain: 'yalnızca akış diyagramları', dev: '✓ (npm)' },
      d2: { domain: 'yalnızca mimari', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'yalnızca zamanlama', dev: '✓ (npm)' },
      plantuml: { domain: 'yalnızca UML', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} aile · spesifikasyon atıflı`,
      dev: '✓ (0 deps, npm)',
      ai: 'bunun için tasarlandı',
    },
  },
  quickstart: {
    eyebrow: '05 / HIZLI BAŞLANGIÇ',
    heading: '10 saniyede kur.',
    body: 'Bir fonksiyon, bir string giriş, bir SVG çıkış. TypeScript\'in çalıştığı her yerde çalışır.',
    snippets: {
      vanilla: { title: 'Vanilla TypeScript', hint: 'evrensel' },
      nextjs: { title: 'Next.js (Sunucu)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (İstemci)', hint: 'etkileşimli' },
    },
    fullDocs: 'Tam belgeler →',
  },
  finalCta: {
    starNote: "Ücretsiz ve açık kaynak — bir yıldız diğer geliştiricilerin onu bulmasına yardımcı olur.",
    heading: 'Tek bir string ile başla.',
    body: (count) =>
      `${count} diyagram türünden herhangi birini canlı olarak oluşturmak için playground'ı aç — ya da kopyalayıp yapıştırabileceğin ve uyarlayabileceğin DSL için galeriyi incele.`,
    openPlayground: 'Playground\'ı Aç →',
    browseGallery: 'Galeriyi İncele',
  },
  footer: {
    tagline:
      'Bir doktorun, mühendisin veya avukatın gerçekten kullanacağı her diyagram. Ücretsiz. Tamamen açık kaynak. AI için tasarlandı. AGPL-3.0.',
    cols: {
      product: {
        heading: 'Ürün',
        playground: 'Playground',
        gallery: 'Galeri',
        examples: 'Örnekler',
      },
      docs: {
        heading: 'Belgeler',
        gettingStarted: 'Başlarken',
        diagramTypes: 'Diyagram türleri',
        apiReference: 'API referansı',
      },
      community: {
        heading: 'Topluluk',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'Katkıda bulun',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'Kopyala' },
};

export default tr;
