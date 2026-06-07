// ───────────────────────────────────────────────────────────────────
// 简体中文 (zh-Hans) — pilot translation validating the i18n foundation.
//
// Typed `: Dictionary`, so this file fails to compile if it drifts from the
// English source-of-truth shape. Brand terms / standards names (Schematex,
// IEC 61131-3, Mermaid, npm, AGPL-3.0) stay in English by design.
// ───────────────────────────────────────────────────────────────────

import type { Dictionary } from './en';

const zhHans: Dictionary = {
  nav: {
    docs: '文档',
    gallery: '示例库',
    icons: '图标',
    playground: '在线编辑器',
    changelog: '更新日志',
  },
  localeSwitcher: {
    label: '语言',
  },

  meta: {
    title: 'Schematex — 医生、工程师、律师真正会用的图',
    description: (count: number) =>
      `医生、工程师、律师真正会用的每一张图。免费。完全开源。为 AI 而生。${count} 种行业标准图，从文本 DSL 生成。纯 SVG，零依赖。`,
  },

  hero: {
    eyebrow: '01 / 隆重推出 SCHEMATEX · 免费 · 开源 · 为 AI 而生',
    headlineBefore: '医生、工程师、律师',
    headlineAccent: '真正会用',
    headlineAfter: '的每一张图。',
    subhead: (count: number) =>
      `Schematex 绘制医生、工程师、律师本来就在手绘的 ${count} 种图——临床家系图、IEC 61131-3 梯形逻辑图、NSGC 遗传图谱、股权结构表。输入文本 DSL，输出符合标准的 SVG。`,
    ctaPlayground: '打开编辑器',
    docsLink: '文档 ↗',
  },

  standardsRail: {
    ariaLabel: '已覆盖的标准',
  },

  cases: {
    eyebrow: '02 / 专业人士真正在用的图',
    heading: '你的医生、工程师、律师真正会用的那些图。',
    body: '每一类图都为它所属的从业者打造——从几行 DSL，到领域专家会放进病历、备忘录或许可证里的那一版。每一份输出都符合已发布的标准。',
    openInPlayground: '→ 在编辑器中打开',
    browseGallery: '浏览完整示例库 →',
  },

  why: {
    eyebrow: '03 / 为什么',
    heading: '免费。完全开源。为 AI 而生。',
    body: '通用流程图工具画不出专业图表。Schematex 把每一项标准都当作一等公民——而且整个项目采用 AGPL-3.0、零依赖，专为 LLM 一次生成而设计。',
    cards: {
      families: {
        unit: '种图族',
        title: '专业人士真正在用的图',
        body: '每种图都实现了一份已发布的规范——McGoldrick、IEC 61131-3、IEEE 315、NSGC、Newick。医生、工程师、律师本来就在手绘这些图；现在他们可以用代码生成。',
      },
      free: {
        stat: '100%',
        unit: '免费 · 开源',
        title: 'AGPL-3.0，零运行时依赖',
        body: '无 D3、无 dagre、无 parser generator、无遥测、无锁定功能。KB 级 bundle，SSR 安全，闭源使用可获取商业授权。',
      },
      ai: {
        stat: 'AI',
        unit: '一等公民',
        title: '为 LLM 生成而设计',
        body: '极简语法，围绕 LLM 真实的文本书写方式设计——CJK 引号、嵌套歧义、AI 可读的错误信息。把 ChatGPT 或 Claude 的输出粘进来，一次就能得到一张专业图。',
      },
    },
  },

  positioning: {
    eyebrow: '04 / 定位',
    heading: '这不是又一个流程图库。',
    body: 'Schematex 与人们已经在用的那些工具相比如何。',
    columns: {
      tool: '工具',
      domain: '专业领域图',
      price: '价格',
      forDevelopers: '面向开发者',
      aiFriendly: 'AI 友好',
    },
    free: '免费',
    partial: '部分',
    rows: {
      mermaid: { domain: '仅流程图', dev: '✓ (npm)' },
      d2: { domain: '仅架构图', dev: '✗ (Go CLI)' },
      wavedrom: { domain: '仅时序图', dev: '✓ (npm)' },
      plantuml: { domain: '仅 UML', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count: number) => `${count} 种图 · 标注规范`,
      dev: '✓ (零依赖, npm)',
      ai: '专为此设计',
    },
  },

  quickstart: {
    eyebrow: '05 / 快速上手',
    heading: '10 秒完成安装。',
    body: '一个函数，输入一个字符串，输出一张 SVG。TypeScript 跑得通的地方都能用。',
    snippets: {
      vanilla: { title: '纯 TypeScript', hint: '通用' },
      nextjs: { title: 'Next.js（服务端）', hint: 'RSC / SSR' },
      reactClient: { title: 'React（客户端）', hint: '可交互' },
    },
    fullDocs: '完整文档 →',
  },

  finalCta: {
    heading: '从一个字符串开始。',
    body: (count: number) =>
      `打开编辑器，实时渲染 ${count} 种图中的任意一种——或浏览示例库，复制、粘贴、改用现成的 DSL。`,
    openPlayground: '打开编辑器 →',
    browseGallery: '浏览示例库',
  },

  footer: {
    tagline:
      '医生、工程师、律师真正会用的每一张图。免费。完全开源。为 AI 而生。AGPL-3.0。',
    cols: {
      product: {
        heading: '产品',
        playground: '在线编辑器',
        gallery: '示例库',
        examples: '案例',
      },
      docs: {
        heading: '文档',
        gettingStarted: '快速开始',
        diagramTypes: '图表类型',
        apiReference: 'API 参考',
      },
      community: {
        heading: '社区',
        github: 'GitHub',
        npm: 'npm',
        contributing: '参与贡献',
      },
    },
    copyright: (year: number) => `© ${year} Schematex · AGPL-3.0`,
  },

  common: {
    copy: '复制',
  },
};

export default zhHans;
