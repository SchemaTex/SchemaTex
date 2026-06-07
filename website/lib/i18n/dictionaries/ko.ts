import type { Dictionary } from './en';

const ko: Dictionary = {
  nav: {
    docs: '문서',
    gallery: '갤러리',
    icons: '아이콘',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: '언어' },
  meta: {
    title: 'Schematex — 의사, 엔지니어, 법률가가 실제로 사용하는 다이어그램',
    description: (count) =>
      `의사, 엔지니어, 법률가가 실제로 사용하는 ${count}가지 다이어그램을 텍스트 DSL로 생성. 무료. 완전한 오픈소스. AI에 최적화. 순수 SVG, 의존성 없음.`,
  },
  hero: {
    eyebrow: '01 / SCHEMATEX 소개 · 무료 · 오픈소스 · AI 최적화',
    headlineBefore: '',
    headlineAccent: '의사, 엔지니어, 법률가',
    headlineAfter: '가 실제로 사용하는 모든 다이어그램.',
    subhead: (count) =>
      `Schematex는 의사, 엔지니어, 법률가가 이미 손으로 그리고 있는 ${count}가지 다이어그램을 생성합니다 — 임상 가계도, IEC 61131-3 래더 로직, NSGC 족보도, 자본표. 텍스트 DSL 입력, 표준 준수 SVG 출력.`,
    ctaPlayground: 'Playground 열기',
    docsLink: '문서 ↗',
  },
  standardsRail: { ariaLabel: '지원 표준' },
  cases: {
    eyebrow: '02 / 전문가가 실제로 사용하는 다이어그램',
    heading: '당신의 의사, 엔지니어, 법률가가 실제로 사용하는 다이어그램.',
    body: '각 다이어그램 패밀리는 해당 분야의 실무자를 위해 설계되었습니다 — 몇 줄의 DSL에서 전문가가 차트, 메모, 허가서에 기재하는 버전까지. 모든 출력은 공개된 표준을 준수합니다.',
    openInPlayground: '→ Playground에서 열기',
    browseGallery: '전체 갤러리 보기 →',
  },
  why: {
    eyebrow: '03 / 왜 Schematex인가',
    heading: '무료. 완전한 오픈소스. AI에 최적화.',
    body: '범용 다이어그램 도구는 전문 다이어그램을 그릴 수 없습니다. Schematex는 각 표준을 일급 시민으로 취급하며, 전체가 AGPL-3.0, 의존성 없음, LLM이 첫 번째 시도에 출력하도록 설계되었습니다.',
    cards: {
      families: {
        unit: '패밀리',
        title: '전문가가 실제로 사용하는 다이어그램',
        body: '각 다이어그램 타입은 공개된 사양을 구현합니다 — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. 의사, 엔지니어, 법률가가 이미 손으로 그리는 것을 이제 코드로 생성할 수 있습니다.',
      },
      free: {
        stat: '100%',
        unit: '무료 · 오픈소스',
        title: 'AGPL-3.0, 런타임 의존성 없음',
        body: 'D3 없음, dagre 없음, 파서 생성기 없음, 텔레메트리 없음, 잠긴 기능 없음. KB 수준 번들, SSR 안전, 클로즈드 소스 사용을 위한 상용 라이선스 제공.',
      },
      ai: {
        stat: 'AI',
        unit: '일급 지원',
        title: 'LLM이 출력하도록 설계',
        body: 'LLM이 실제로 텍스트를 작성하는 방식에 맞춘 최소 문법 — CJK 따옴표, 중첩 모호성, AI 가독 오류. ChatGPT나 Claude의 출력을 붙여넣으면 첫 번째 시도에 전문적인 다이어그램을 얻을 수 있습니다.',
      },
    },
  },
  positioning: {
    eyebrow: '04 / 포지셔닝',
    heading: '또 하나의 플로우차트 라이브러리가 아닙니다.',
    body: 'Schematex와 기존 도구와의 비교.',
    columns: {
      tool: '도구',
      domain: '전문 도메인 다이어그램',
      price: '가격',
      forDevelopers: '개발자용',
      aiFriendly: 'AI 친화적',
    },
    free: '무료',
    partial: '일부',
    rows: {
      mermaid: { domain: '플로우차트만', dev: '✓ (npm)' },
      d2: { domain: '아키텍처만', dev: '✗ (Go CLI)' },
      wavedrom: { domain: '타이밍만', dev: '✓ (npm)' },
      plantuml: { domain: 'UML만', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count}개 패밀리 · 사양 인용`,
      dev: '✓ (0 deps, npm)',
      ai: '전용 설계',
    },
  },
  quickstart: {
    eyebrow: '05 / 빠른 시작',
    heading: '10초 만에 설치.',
    body: '함수 하나, 문자열 입력, SVG 출력. TypeScript가 동작하는 모든 환경에서 사용 가능.',
    snippets: {
      vanilla: { title: 'Vanilla TypeScript', hint: '유니버설' },
      nextjs: { title: 'Next.js (서버)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (클라이언트)', hint: '인터랙티브' },
    },
    fullDocs: '전체 문서 →',
  },
  finalCta: {
    heading: '단 하나의 문자열로 시작하세요.',
    body: (count) =>
      `Playground를 열어 ${count}가지 다이어그램 타입을 실시간으로 렌더링하거나 — 갤러리에서 복사, 붙여넣기, 수정할 수 있는 DSL을 확인해 보세요.`,
    openPlayground: 'Playground 열기 →',
    browseGallery: '갤러리 보기',
  },
  footer: {
    tagline:
      '의사, 엔지니어, 법률가가 실제로 사용하는 모든 다이어그램. 무료. 완전한 오픈소스. AI에 최적화. AGPL-3.0.',
    cols: {
      product: {
        heading: '제품',
        playground: 'Playground',
        gallery: '갤러리',
        examples: '예시',
      },
      docs: {
        heading: '문서',
        gettingStarted: '시작하기',
        diagramTypes: '다이어그램 타입',
        apiReference: 'API 레퍼런스',
      },
      community: {
        heading: '커뮤니티',
        github: 'GitHub',
        npm: 'npm',
        contributing: '기여하기',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: '복사' },
};

export default ko;
