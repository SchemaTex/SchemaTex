# 00 — System Overview

*Lineage 是什么、为谁服务、核心管道、文件结构。*

---

## What is Lineage?

开源 TypeScript 库：Text DSL → SVG 渲染引擎，专注**关系图谱**（relationship diagrams）。

定位类似 Mermaid，但 Mermaid 做通用图表（flowchart、sequence、ER），Lineage 做 Mermaid 覆盖不到的**专业关系图表**——genogram、ecomap、pedigree chart。

**关键区别：** Mermaid 用通用图布局（dagre/ELK），Lineage 用**领域特定布局算法**（genogram → generation-based layered layout，ecomap → radial layout）。通用布局画不好这些图。

---

## Who Uses It?

### 直接用户（npm 消费者）
- 开发者在自己的应用中嵌入 genogram/ecomap/pedigree 渲染
- Markdown 工具（Obsidian、Notion-like）集成

### 终端用户（通过集成产品）
| 画像 | 场景 | 数据佐证 |
|------|------|---------|
| 社工/家庭治疗师 | 临床 genogram + ecomap（"标准三件套"） | 社工学生在学校必须做这三种图 |
| 医疗专业人士 | 家族病史 genogram、遗传风险评估 | Shemeeka Bayard 案例：临床 genogram，付费用户 |
| 遗传学研究者 | Pedigree chart 追踪遗传模式 | KD 2-5 低竞争关键词 |
| 学生 | 家庭治疗课程作业 | genogram maker 4,700 US 月搜 |

### 商业联动
Lineage 是 MyMap.ai 和 ChatDiagram.com 的渲染基础层。开源获取社区贡献和分发，商业产品在其上提供 AI 生成 + 编辑 + 导出。

---

## Pipeline Architecture

```
Text DSL ──→ Parser ──→ AST ──→ Layout Engine ──→ LayoutResult ──→ SVG Renderer ──→ SVG string
              │                    │                                    │
              │                    │                                    │
        diagram-specific     diagram-specific                    shared utility
        (hand-written        (genogram: generation-based)        (src/core/svg.ts)
         recursive descent)  (ecomap: radial/polar)
                             (pedigree: simplified generation)
```

每个图表类型实现 `DiagramPlugin` 接口（定义在 `src/core/types.ts`）：
```ts
interface DiagramPlugin {
  type: DiagramType;
  detect(text: string): boolean;       // 能否处理这段文本？
  parse(text: string): DiagramAST;     // 文本 → AST
  layout(ast, config): LayoutResult;   // AST → 带坐标的节点/边
  render(layout, config): string;      // LayoutResult → SVG 字符串
}
```

**API 入口（`src/core/api.ts`）：**
- `render(text, config?)` → SVG string（自动检测图表类型）
- `parse(text, config?)` → AST（高级用法，给需要自定义渲染的消费者）

---

## Directory Structure

```
lineage/
├── CLAUDE.md                    # CC 开发指令（入口文件）
├── README.md                    # GitHub 公开 README
├── package.json                 # 零 runtime dependency
├── tsconfig.json
├── tsup.config.ts               # 构建配置（ESM + CJS 双格式）
│
├── docs/
│   ├── system/                  # 你现在在看的：架构真相
│   │   ├── 00-OVERVIEW.md       # 本文件
│   │   ├── 01-GENOGRAM-STANDARD.md  # McGoldrick 符号标准 + 布局规则
│   │   ├── 02-ECOMAP-STANDARD.md    # Ecomap 标准 + 布局规则
│   │   └── 03-PEDIGREE-STANDARD.md  # Pedigree chart 标准
│   ├── impl/                    # 实施计划（CC 自主执行）
│   │   ├── 1.0-genogram-parser.md
│   │   ├── 1.1-genogram-symbols.md
│   │   ├── 1.2-genogram-layout.md
│   │   ├── 1.3-genogram-renderer.md
│   │   ├── 1.4-genogram-integration.md
│   │   ├── 2.0-ecomap.md
│   │   ├── 2.1-pedigree.md
│   │   └── 3.0-integrations.md
│   └── issues/                  # 问题追踪
│
├── src/
│   ├── index.ts                 # 公共 API re-export
│   ├── core/
│   │   ├── api.ts               # render(), parse()
│   │   ├── types.ts             # 所有共享类型（唯一真相源）
│   │   └── svg.ts               # SVG builder utility
│   └── diagrams/
│       ├── genogram/
│       │   ├── index.ts         # DiagramPlugin 实现
│       │   ├── parser.ts        # 递归下降解析器
│       │   ├── symbols.ts       # McGoldrick SVG 符号
│       │   ├── layout.ts        # Generation-based 布局算法
│       │   └── renderer.ts      # LayoutResult → SVG
│       ├── ecomap/
│       │   ├── index.ts
│       │   ├── parser.ts
│       │   ├── layout.ts        # Radial/polar 布局
│       │   └── renderer.ts
│       └── pedigree/
│           ├── index.ts
│           ├── parser.ts        # 复用 genogram ~70%
│           ├── layout.ts        # 简化版 genogram layout
│           └── renderer.ts
│
├── tests/
│   ├── genogram/
│   ├── ecomap/
│   ├── pedigree/
│   └── fixtures/                # 测试用例文本文件
│
└── examples/                    # 输出 SVG 示例
```

---

## Hard Constraints

1. **零 runtime dependency** — 无 D3、无 dagre、无外部 parser。手写一切。Bundle 小 + 无供应链风险。
2. **输出必须是有效语义 SVG** — 可访问性（title/desc）、CSS class 可主题化、data-* 属性可交互。
3. **Strict TypeScript** — 无 `any`，无未注释的 `as` cast。
4. **Test-first for layout** — 布局算法先写测试再写实现。
5. **标准合规** — Genogram: McGoldrick 2020, Ecomap: Hartman 1978, Pedigree: genetics standard。

---

## Quality Gates

每次 commit 前 CC 必须确认：
1. `npm run typecheck` → 零错误
2. `npm run test` → 全部通过
3. `npm run lint` → 零警告
4. `npm run build` → 产出有效 dist/
5. 至少渲染 3 个测试用例，目视验证 SVG 输出
