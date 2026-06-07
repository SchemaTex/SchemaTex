import type { Dictionary } from './en';

const zhHant: Dictionary = {
  nav: {
    docs: '文件',
    gallery: '圖庫',
    icons: '圖示',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: '語言' },
  meta: {
    title: 'Schematex — 醫生、工程師、律師真正在用的每一種圖表',
    description: (count) =>
      `醫生、工程師、律師真正會用的所有圖表。免費。完全開源。專為 AI 設計。從文字 DSL 生成 ${count} 種業界標準圖表。純 SVG，零依賴。`,
  },
  hero: {
    eyebrow: '01 / 介紹 SCHEMATEX · 免費 · 開源 · 專為 AI 設計',
    headlineBefore: '醫生、工程師、律師',
    headlineAccent: '真正在用的',
    headlineAfter: '每一種圖表。',
    subhead: (count) =>
      `Schematex 能繪製醫生、工程師、律師已在手繪的 ${count} 種圖表——臨床家系圖、IEC 61131-3 階梯邏輯、NSGC 譜系圖、股權架構表。輸入文字 DSL，輸出符合標準的 SVG。`,
    ctaPlayground: '開啟 Playground',
    docsLink: '文件 ↗',
  },
  standardsRail: { ariaLabel: '涵蓋的標準' },
  cases: {
    eyebrow: '02 / 專業人士真正在用的圖表',
    heading: '你的醫生、工程師或律師真正在用的圖表。',
    body: '每個圖表家族都是為掌握它的實務工作者而建——從幾行 DSL，到領域專家會放在病歷、備忘錄或許可文件中的版本。每個輸出都符合公開發布的標準。',
    openInPlayground: '→ 在 Playground 中開啟',
    browseGallery: '瀏覽完整圖庫 →',
  },
  why: {
    eyebrow: '03 / 為什麼選擇 Schematex',
    heading: '免費。完全開源。專為 AI 設計。',
    body: '通用流程圖工具無法繪製專業圖表。Schematex 將每個標準視為一等公民——整個套件採用 AGPL-3.0、零依賴，並專為讓 LLM 一次就能正確輸出而設計。',
    cards: {
      families: {
        unit: '圖表家族',
        title: '專業人士真正在用的圖表',
        body: '每種圖表類型均實作已發布的規範——McGoldrick、IEC 61131-3、IEEE 315、NSGC、Newick。醫生、工程師、律師已在手繪這些圖表；現在可以用程式碼生成。',
      },
      free: {
        stat: '100%',
        unit: '免費 · 開源',
        title: 'AGPL-3.0，零執行時依賴',
        body: '無 D3、無 dagre、無解析器生成器、無遙測、無鎖定功能。KB 級 bundle、SSR 安全，閉源商業使用可申請商業授權。',
      },
      ai: {
        stat: 'AI',
        unit: '一等公民',
        title: '專為 LLM 輸出而設計',
        body: '最小化語法，專為 LLM 實際書寫文字的方式設計——CJK 引號、巢狀歧義、AI 可讀錯誤訊息。貼上 ChatGPT 或 Claude 的輸出，一次就能得到專業圖表。',
      },
    },
  },
  positioning: {
    eyebrow: '04 / 定位',
    heading: '不只是另一個流程圖函式庫。',
    body: 'Schematex 與現有工具的比較。',
    columns: {
      tool: '工具',
      domain: '專業領域圖表',
      price: '價格',
      forDevelopers: '開發者友善',
      aiFriendly: 'AI 友善',
    },
    free: '免費',
    partial: '部分',
    rows: {
      mermaid: { domain: '僅流程圖', dev: '✓ (npm)' },
      d2: { domain: '僅架構圖', dev: '✗ (Go CLI)' },
      wavedrom: { domain: '僅時序圖', dev: '✓ (npm)' },
      plantuml: { domain: '僅 UML', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} 種家族 · 引用規範`,
      dev: '✓ (0 deps, npm)',
      ai: '專為此設計',
    },
  },
  quickstart: {
    eyebrow: '05 / 快速開始',
    heading: '10 秒完成安裝。',
    body: '一個函式，傳入字串，回傳 SVG。適用於所有 TypeScript 環境。',
    snippets: {
      vanilla: { title: 'Vanilla TypeScript', hint: '通用' },
      nextjs: { title: 'Next.js（伺服器）', hint: 'RSC / SSR' },
      reactClient: { title: 'React（客戶端）', hint: '互動式' },
    },
    fullDocs: '完整文件 →',
  },
  finalCta: {
    heading: '從一個字串開始。',
    body: (count) =>
      `開啟 Playground，即時渲染 ${count} 種圖表——或瀏覽圖庫，複製、貼上並修改 DSL。`,
    openPlayground: '開啟 Playground →',
    browseGallery: '瀏覽圖庫',
  },
  footer: {
    tagline:
      '醫生、工程師、律師真正在用的每一種圖表。免費。完全開源。專為 AI 設計。AGPL-3.0。',
    cols: {
      product: {
        heading: '產品',
        playground: 'Playground',
        gallery: '圖庫',
        examples: '範例',
      },
      docs: {
        heading: '文件',
        gettingStarted: '入門指南',
        diagramTypes: '圖表類型',
        apiReference: 'API 參考',
      },
      community: {
        heading: '社群',
        github: 'GitHub',
        npm: 'npm',
        contributing: '貢獻指南',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: '複製' },
};

export default zhHant;
