import type { Dictionary } from './en';

const ja: Dictionary = {
  nav: {
    docs: 'ドキュメント',
    gallery: 'ギャラリー',
    icons: 'アイコン',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: '言語' },
  meta: {
    title: 'Schematex — 医師・エンジニア・法律家が実際に使う図解',
    description: (count) =>
      `医師、エンジニア、法律家が実際に使う${count}種類の図解をテキストDSLから生成。無料・完全オープンソース・AI対応。依存ゼロのピュアSVG出力。`,
  },
  hero: {
    eyebrow: '01 / SCHEMATEX 紹介 · 無料 · オープンソース · AI対応',
    headlineBefore: '',
    headlineAccent: '医師・エンジニア・法律家',
    headlineAfter: 'が実際に使う、すべての図解。',
    subhead: (count) =>
      `Schematexは、医師・エンジニア・法律家がすでに手書きしている${count}種類の図解を描きます — 臨床ジェノグラム、IEC 61131-3ラダーロジック、NSGCペディグリー、資本政策表。テキストDSLを入力すると、標準準拠のSVGが出力されます。`,
    ctaPlayground: 'Playgroundを開く',
    docsLink: 'ドキュメント ↗',
  },
  standardsRail: { ariaLabel: '対応規格' },
  cases: {
    eyebrow: '02 / プロが実際に使う図解',
    heading: 'あなたの医師・エンジニア・法律家が実際に使う図解。',
    body: '各図解ファミリーは、その分野の実務者のために構築されています — 数行のDSLから、専門家がカルテ、メモ、許可書に記載するバージョンまで。すべての出力は公開された規格に準拠しています。',
    openInPlayground: '→ Playgroundで開く',
    browseGallery: 'ギャラリーを全て見る →',
  },
  why: {
    eyebrow: '03 / なぜSchematexか',
    heading: '無料。完全オープンソース。AI対応。',
    body: '汎用のフローチャートツールはプロ仕様の図解を描けません。Schematexは各規格をファーストクラスとして扱い、全体がAGPL-3.0・依存ゼロで、LLMが一発で出力できるよう設計されています。',
    cards: {
      families: {
        unit: 'ファミリー',
        title: 'プロが実際に使う図解',
        body: '各図解タイプは公開された仕様を実装しています — McGoldrick、IEC 61131-3、IEEE 315、NSGC、Newick。医師・エンジニア・法律家がすでに手書きしているものを、コードから生成できるようになります。',
      },
      free: {
        stat: '100%',
        unit: '無料 · オープンソース',
        title: 'AGPL-3.0、ランタイム依存ゼロ',
        body: 'D3なし、dagreなし、パーサージェネレーターなし、テレメトリーなし、機能制限なし。KBサイズのバンドル、SSR対応、クローズドソース向け商用ライセンスも利用可能。',
      },
      ai: {
        stat: 'AI',
        unit: 'ファーストクラス',
        title: 'LLMが出力しやすい設計',
        body: 'LLMが実際にテキストを書く方法に合わせた最小限の文法 — CJK引用符、ネスト曖昧さ、AI可読エラー。ChatGPTやClaudeの出力をそのまま貼り付けて、一発でプロ仕様の図解を得られます。',
      },
    },
  },
  positioning: {
    eyebrow: '04 / 位置づけ',
    heading: 'ただのフローチャートライブラリではありません。',
    body: 'Schematexと既存ツールの比較。',
    columns: {
      tool: 'ツール',
      domain: '専門分野の図解',
      price: '価格',
      forDevelopers: '開発者向け',
      aiFriendly: 'AI対応',
    },
    free: '無料',
    partial: '一部',
    rows: {
      mermaid: { domain: 'フローチャートのみ', dev: '✓ (npm)' },
      d2: { domain: 'アーキテクチャのみ', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'タイミングのみ', dev: '✓ (npm)' },
      plantuml: { domain: 'UMLのみ', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count}ファミリー · 仕様準拠`,
      dev: '✓ (0 deps, npm)',
      ai: '専用設計',
    },
  },
  quickstart: {
    eyebrow: '05 / クイックスタート',
    heading: '10秒でインストール。',
    body: '関数1つ、文字列を渡すとSVGが返ります。TypeScriptが動く環境ならどこでも使えます。',
    snippets: {
      vanilla: { title: 'Vanilla TypeScript', hint: 'ユニバーサル' },
      nextjs: { title: 'Next.js (サーバー)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (クライアント)', hint: 'インタラクティブ' },
    },
    fullDocs: 'ドキュメント全文 →',
  },
  finalCta: {
    starNote: "無料・オープンソース — スターを付けると、ほかの開発者が見つけやすくなります。",
    heading: '1つの文字列から始めましょう。',
    body: (count) =>
      `Playgroundを開いて${count}種類の図解をライブでレンダリング — またはギャラリーでDSLをコピー・貼り付け・アレンジしてみてください。`,
    openPlayground: 'Playgroundを開く →',
    browseGallery: 'ギャラリーを見る',
  },
  footer: {
    tagline:
      '医師・エンジニア・法律家が実際に使う図解を、すべて。無料・完全オープンソース・AI対応。AGPL-3.0。',
    cols: {
      product: {
        heading: 'プロダクト',
        playground: 'Playground',
        gallery: 'ギャラリー',
        examples: 'サンプル',
      },
      docs: {
        heading: 'ドキュメント',
        gettingStarted: 'はじめに',
        diagramTypes: '図解の種類',
        apiReference: 'APIリファレンス',
      },
      community: {
        heading: 'コミュニティ',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'コントリビュート',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'コピー' },
};

export default ja;
