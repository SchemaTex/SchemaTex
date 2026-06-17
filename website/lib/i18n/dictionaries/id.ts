import type { Dictionary } from './en';

const id: Dictionary = {
  nav: {
    docs: 'Dokumentasi',
    gallery: 'Galeri',
    icons: 'Ikon',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: 'Bahasa' },
  meta: {
    title: 'Schematex — Diagram yang benar-benar digunakan dokter, insinyur, dan pengacara',
    description: (count) =>
      `Semua diagram yang benar-benar digunakan dokter, insinyur, atau pengacara. Gratis. Sepenuhnya open source. Dibuat untuk AI. ${count} diagram standar industri dari DSL teks. SVG murni, nol dependensi.`,
  },
  hero: {
    eyebrow: '01 / MEMPERKENALKAN SCHEMATEX · GRATIS · OPEN SOURCE · DIBUAT UNTUK AI',
    headlineBefore: 'Semua diagram yang benar-benar digunakan ',
    headlineAccent: 'dokter, insinyur, dan pengacara',
    headlineAfter: '.',
    subhead: (count) =>
      `Schematex menggambar ${count} diagram yang sudah digambar tangan oleh dokter, insinyur, dan pengacara — genogram klinis, logika tangga IEC 61131-3, pedigree NSGC, tabel kapitalisasi. Teks DSL sebagai input, SVG sesuai standar sebagai output.`,
    ctaPlayground: 'Buka playground',
    docsLink: 'dokumentasi ↗',
  },
  standardsRail: { ariaLabel: 'Standar yang didukung' },
  cases: {
    eyebrow: '02 / DIAGRAM YANG BENAR-BENAR DIGUNAKAN PROFESIONAL',
    heading: 'Diagram yang benar-benar digunakan dokter, insinyur, atau pengacara Anda.',
    body: 'Setiap keluarga diagram dibangun untuk praktisi yang menguasainya — dari beberapa baris DSL hingga versi yang akan dimasukkan ahli domain ke dalam catatan, memo, atau izin. Setiap output mematuhi standar yang diterbitkan.',
    openInPlayground: '→ buka di playground',
    browseGallery: 'Lihat galeri lengkap →',
  },
  why: {
    eyebrow: '03 / MENGAPA',
    heading: 'Gratis. Sepenuhnya open source. Dibuat untuk AI.',
    body: 'Alat diagram generik tidak bisa menggambar diagram profesional. Schematex memperlakukan setiap standar sebagai warga kelas satu — semuanya AGPL-3.0, tanpa dependensi, dirancang agar LLM dapat menghasilkannya dalam percobaan pertama.',
    cards: {
      families: {
        unit: 'KELUARGA',
        title: 'Diagram yang benar-benar digunakan profesional',
        body: 'Setiap jenis diagram mengimplementasikan spesifikasi yang diterbitkan — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. Dokter, insinyur, dan pengacara sudah menggambarnya dengan tangan; kini bisa dibuat dari kode.',
      },
      free: {
        stat: '100%',
        unit: 'GRATIS · OPEN SOURCE',
        title: 'AGPL-3.0, nol dependensi runtime',
        body: 'Tanpa D3, tanpa dagre, tanpa generator parser, tanpa telemetri, tanpa fitur terkunci. Bundle ukuran KB, aman untuk SSR, lisensi komersial tersedia untuk penggunaan kode tertutup.',
      },
      ai: {
        stat: 'AI',
        unit: 'KELAS SATU',
        title: 'Dirancang untuk diemanasikan LLM',
        body: 'Tata bahasa minimal yang dirancang mengikuti cara LLM benar-benar menulis teks — tanda kutip CJK, ambiguitas bersarang, kesalahan yang dapat dibaca AI. Tempel output dari ChatGPT atau Claude dan dapatkan diagram profesional di percobaan pertama.',
      },
    },
  },
  positioning: {
    eyebrow: '04 / POSITIONING',
    heading: 'Bukan pustaka diagram alur biasa.',
    body: 'Perbandingan Schematex dengan alat yang sudah digunakan orang.',
    columns: {
      tool: 'Alat',
      domain: 'Diagram domain profesional',
      price: 'Harga',
      forDevelopers: 'Untuk pengembang',
      aiFriendly: 'Ramah AI',
    },
    free: 'gratis',
    partial: 'sebagian',
    rows: {
      mermaid: { domain: 'hanya diagram alur', dev: '✓ (npm)' },
      d2: { domain: 'hanya arsitektur', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'hanya timing', dev: '✓ (npm)' },
      plantuml: { domain: 'hanya UML', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} keluarga · mengutip spesifikasi`,
      dev: '✓ (0 deps, npm)',
      ai: 'dirancang untuk itu',
    },
  },
  quickstart: {
    eyebrow: '05 / MULAI CEPAT',
    heading: 'Pasang dalam 10 detik.',
    body: 'Satu fungsi, satu string masuk, satu SVG keluar. Berfungsi di mana saja TypeScript berjalan.',
    snippets: {
      vanilla: { title: 'Vanilla TypeScript', hint: 'universal' },
      nextjs: { title: 'Next.js (Server)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (Client)', hint: 'interaktif' },
    },
    fullDocs: 'Dokumentasi lengkap →',
  },
  finalCta: {
    starNote: "Gratis & open source — sebuah bintang membantu developer lain menemukannya.",
    heading: 'Mulai dengan satu string.',
    body: (count) =>
      `Buka playground untuk merender salah satu dari ${count} jenis diagram secara langsung — atau telusuri galeri untuk DSL yang bisa Anda salin, tempel, dan adaptasi.`,
    openPlayground: 'Buka Playground →',
    browseGallery: 'Lihat Galeri',
  },
  footer: {
    tagline:
      'Semua diagram yang benar-benar digunakan dokter, insinyur, atau pengacara. Gratis. Sepenuhnya open source. Dibuat untuk AI. AGPL-3.0.',
    cols: {
      product: {
        heading: 'Produk',
        playground: 'Playground',
        gallery: 'Galeri',
        examples: 'Contoh',
      },
      docs: {
        heading: 'Dokumentasi',
        gettingStarted: 'Memulai',
        diagramTypes: 'Jenis diagram',
        apiReference: 'Referensi API',
      },
      community: {
        heading: 'Komunitas',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'Berkontribusi',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'Salin' },
};

export default id;
