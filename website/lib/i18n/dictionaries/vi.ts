import type { Dictionary } from './en';

const vi: Dictionary = {
  nav: {
    docs: 'Tài liệu',
    gallery: 'Thư viện',
    icons: 'Biểu tượng',
    playground: 'Playground',
    changelog: 'Changelog',
  },
  localeSwitcher: { label: 'Ngôn ngữ' },
  meta: {
    title: 'Schematex — Sơ đồ mà bác sĩ, kỹ sư và luật sư thực sự dùng',
    description: (count) =>
      `Tất cả ${count} sơ đồ mà bác sĩ, kỹ sư hoặc luật sư thực sự cần. Miễn phí. Hoàn toàn mã nguồn mở. Được tạo ra cho AI. SVG thuần túy từ DSL văn bản. Không phụ thuộc.`,
  },
  hero: {
    eyebrow: '01 / GIỚI THIỆU SCHEMATEX · MIỄN PHÍ · MÃ NGUỒN MỞ · LÀM CHO AI',
    headlineBefore: 'Mọi sơ đồ mà ',
    headlineAccent: 'bác sĩ, kỹ sư và luật sư',
    headlineAfter: ' thực sự dùng.',
    subhead: (count) =>
      `Schematex vẽ ${count} sơ đồ mà bác sĩ, kỹ sư và luật sư đã phác thảo tay — biểu đồ gia phả lâm sàng, logic thang IEC 61131-3, phả hệ NSGC, bảng vốn hóa. Nhập DSL văn bản, xuất SVG chuẩn.`,
    ctaPlayground: 'Mở playground',
    docsLink: 'tài liệu ↗',
  },
  standardsRail: { ariaLabel: 'Các tiêu chuẩn được hỗ trợ' },
  cases: {
    eyebrow: '02 / SƠ ĐỒ MÀ CHUYÊN GIA THỰC SỰ DÙNG',
    heading: 'Sơ đồ mà bác sĩ, kỹ sư hoặc luật sư của bạn thực sự dùng.',
    body: 'Mỗi họ sơ đồ được xây dựng cho người thực hành sở hữu nó — từ vài dòng DSL đến phiên bản mà chuyên gia sẽ đưa vào hồ sơ, bản ghi nhớ hoặc giấy phép. Mỗi đầu ra tuân thủ một tiêu chuẩn đã được công bố.',
    openInPlayground: '→ mở trong playground',
    browseGallery: 'Xem toàn bộ thư viện →',
  },
  why: {
    eyebrow: '03 / TẠI SAO',
    heading: 'Miễn phí. Hoàn toàn mã nguồn mở. Làm cho AI.',
    body: 'Các công cụ sơ đồ tổng quát không thể vẽ sơ đồ chuyên nghiệp. Schematex coi mỗi tiêu chuẩn là công dân hạng nhất — toàn bộ là AGPL-3.0, không phụ thuộc, được thiết kế để LLM có thể xuất ra ở lần thử đầu tiên.',
    cards: {
      families: {
        unit: 'HỌ SƠ ĐỒ',
        title: 'Sơ đồ mà chuyên gia thực sự dùng',
        body: 'Mỗi loại sơ đồ triển khai một đặc tả đã được công bố — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. Bác sĩ, kỹ sư và luật sư đã phác thảo bằng tay; nay có thể tạo ra từ code.',
      },
      free: {
        stat: '100%',
        unit: 'MIỄN PHÍ · MÃ NGUỒN MỞ',
        title: 'AGPL-3.0, không phụ thuộc runtime',
        body: 'Không D3, không dagre, không trình tạo parser, không telemetry, không tính năng bị khóa. Bundle cỡ KB, an toàn cho SSR, giấy phép thương mại cho mã nguồn đóng.',
      },
      ai: {
        stat: 'AI',
        unit: 'HẠNG NHẤT',
        title: 'Thiết kế cho LLM xuất ra',
        body: 'Ngữ pháp tối giản thiết kế theo cách LLM thực sự viết văn bản — dấu ngoặc CJK, sự mơ hồ lồng nhau, lỗi đọc được bởi AI. Dán kết quả từ ChatGPT hoặc Claude và nhận sơ đồ chuyên nghiệp ngay lần đầu.',
      },
    },
  },
  positioning: {
    eyebrow: '04 / ĐỊNH VỊ',
    heading: 'Không phải thêm một thư viện lưu đồ nữa.',
    body: 'So sánh Schematex với các công cụ người dùng đã quen dùng.',
    columns: {
      tool: 'Công cụ',
      domain: 'Sơ đồ miền chuyên nghiệp',
      price: 'Giá',
      forDevelopers: 'Cho nhà phát triển',
      aiFriendly: 'Thân thiện AI',
    },
    free: 'miễn phí',
    partial: 'một phần',
    rows: {
      mermaid: { domain: 'chỉ lưu đồ', dev: '✓ (npm)' },
      d2: { domain: 'chỉ kiến trúc', dev: '✗ (Go CLI)' },
      wavedrom: { domain: 'chỉ timing', dev: '✓ (npm)' },
      plantuml: { domain: 'chỉ UML', dev: '✗ (Java)' },
    },
    schematex: {
      domain: (count) => `${count} họ · trích dẫn đặc tả`,
      dev: '✓ (0 deps, npm)',
      ai: 'thiết kế cho điều đó',
    },
  },
  quickstart: {
    eyebrow: '05 / BẮT ĐẦU NHANH',
    heading: 'Cài đặt trong 10 giây.',
    body: 'Một hàm, một chuỗi đầu vào, một SVG đầu ra. Hoạt động ở bất kỳ đâu TypeScript chạy được.',
    snippets: {
      vanilla: { title: 'Vanilla TypeScript', hint: 'phổ quát' },
      nextjs: { title: 'Next.js (Máy chủ)', hint: 'RSC / SSR' },
      reactClient: { title: 'React (Client)', hint: 'tương tác' },
    },
    fullDocs: 'Tài liệu đầy đủ →',
  },
  finalCta: {
    heading: 'Bắt đầu với một chuỗi duy nhất.',
    body: (count) =>
      `Mở playground để render bất kỳ ${count} loại sơ đồ nào trực tiếp — hoặc duyệt thư viện để tìm DSL bạn có thể sao chép, dán và tùy chỉnh.`,
    openPlayground: 'Mở Playground →',
    browseGallery: 'Xem Thư viện',
  },
  footer: {
    tagline:
      'Mọi sơ đồ mà bác sĩ, kỹ sư hoặc luật sư thực sự cần. Miễn phí. Hoàn toàn mã nguồn mở. Làm cho AI. AGPL-3.0.',
    cols: {
      product: {
        heading: 'Sản phẩm',
        playground: 'Playground',
        gallery: 'Thư viện',
        examples: 'Ví dụ',
      },
      docs: {
        heading: 'Tài liệu',
        gettingStarted: 'Bắt đầu',
        diagramTypes: 'Loại sơ đồ',
        apiReference: 'Tham chiếu API',
      },
      community: {
        heading: 'Cộng đồng',
        github: 'GitHub',
        npm: 'npm',
        contributing: 'Đóng góp',
      },
    },
    copyright: (year) => `© ${year} Schematex · AGPL-3.0`,
  },
  common: { copy: 'Sao chép' },
};

export default vi;
