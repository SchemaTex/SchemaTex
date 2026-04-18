# 20 — Mindmap Diagram Standard Reference

*Tony Buzan 放射式 mindmap + markmap 风格 outline tree 的统一标准。面向学习笔记、读书摘要、头脑风暴、会议记录、写作大纲、教学备课。Schematex 覆盖两种形态——默认 `radial`（放射式，Buzan 原教旨）、可选 `tree-lr` / `tree-tb`（markmap 兼容的水平/垂直大纲树）。*

> **References (学科惯例 + 工具 de-facto 约定):**
> - **Buzan, Tony (1974)** *Use Your Head*. BBC Books — mindmap 原始方法论，定义"中心图像 + 主干放射 + 关键词 + 色彩 + 图像"五原则
> - **Buzan, Tony & Buzan, Barry (2010)** *The Mind Map Book: Unlock Your Creativity, Boost Your Memory, Change Your Life*. BBC Active — 完整的 mindmap 法则（ToMBM — The Mind Map Book 7 Laws）
> - **Farrand, P., Hussain, F., & Hennessy, E. (2002)** *The efficacy of the "mind map" study technique.* Medical Education 36(5), 426–431 — mindmap 在学习中的实证研究
> - **markmap.js.org (Gera Zhang, MIT License)** — markdown-heading 驱动的 outline tree mindmap de-facto 实现
> - **MindMeister, XMind, MindNode, Coggle, Miro, SimpleMind, MindManager** — 商业 mindmap 工具的视觉约定（放射式 + 有机曲线 + 分支颜色 + 锥形 branch）
> - **MarkMind (2024+)** — AI 驱动的新一代 mindmap 工具，兼容 markmap DSL
>
> 注：mindmap 无单一 ISO/IEEE 标准；Buzan 本人注册了 "Mind Map"® 商标但方法论已成公共知识。本 standard 综合 Buzan 7 Laws + markmap grammar + 主流 SaaS 工具渲染约定，形成可程序化的统一规范。

---

## 1. 用户与需求（第一性原理）

### 1.1 用户画像

| 画像 | 场景 | 偏好形态 |
|------|------|---------|
| **学生** | 学习笔记、读书摘要、考试复习 | Radial（Buzan 原教旨，视觉记忆增强） |
| **知识工作者 / 研究者** | 头脑风暴、outline 结构化、文献梳理 | Radial（发散阶段）→ Tree（收敛阶段） |
| **会议主持人 / 引导师** | 实时捕捉 ideation、工作坊白板 | Radial（视觉冲击、分支彩色） |
| **写作者 / 编剧** | 情节结构、章节大纲、角色关系 | Tree-LR（内容密集、层级清晰） |
| **教育者 / 培训师** | 课程设计、概念讲解、知识图谱 | Radial（课堂展示） + Tree（讲义） |
| **产品 / 工程** | spec 大纲、技术文档 TOC、架构分解 | Tree-LR（markmap 风格，代码友好） |

### 1.2 两种形态的本质区别

Schematex 同时实现两种 mindmap 形态，因为它们解决不同场景：

| 维度 | Radial（Buzan 风格） | Outline Tree（markmap 风格） |
|------|---------------------|------------------------------|
| 视觉中心 | 中心主题放射所有方向 | 左侧根节点，向右水平展开 |
| 组织哲学 | 模仿大脑神经元放射结构 | 模仿文件系统 / 大纲目录树 |
| 分支线条 | Bezier 有机曲线，锥形渐细 | 直线 / 贝塞尔连接，等宽 |
| 色彩使用 | 每主干一色，子树继承 | 可选着色，主要靠缩进与文字 |
| 关键词密度 | 低（每 branch 1-3 词，强调视觉） | 高（支持长文本、列表、富文本） |
| 适用节点数 | ≤ 50（超过即视觉混乱） | 100+（大纲可折叠） |
| 适用场景 | 创意发散、演示、记忆 | 文档结构、技术 TOC、知识库 |
| 生成方式 | 手工 or AI 生成 | markdown 自然产出 |

**Schematex 定位：** 用户通过 DSL 顶部的 `style:` 关键字选择形态。默认 `radial`（与 markmap 区分的差异化核心），markmap 用户可切 `tree-lr` 实现 100% outline-tree 兼容。

### 1.3 与相关图的边界

- **与 fishbone 区别**：fishbone 强制"水平脊 + 倾斜主骨"，表达多因→单果；mindmap 无方向约束，表达一核心→多发散
- **与 sociogram 区别**：sociogram 节点是人，边是社会关系；mindmap 节点是概念，边是从属/联想
- **与 phylo 区别**：phylo 分支长度有进化距离语义；mindmap 分支长度无度量语义，仅视觉
- **与 concept map（非本 standard）区别**：concept map 边带有谓词标签（"is-a", "causes"），是有向图；mindmap 是无标签放射树
- **与 org chart 区别**：org chart 强制从上至下严格层级；mindmap 可任意放射

---

## 2. 市场与商业定位

### 2.1 搜索需求（Ahrefs 2026-04）

| Keyword | US 月搜 | Global 月搜 | KD | 备注 |
|---------|--------:|------------:|---:|------|
| mind map | 60,000 | 565,000 | 90 | 核心大词，SEO 饱和 |
| mindmap | 14,000 | 135,000 | 80 | 变体拼写 |
| mind map maker | 6,500 | 48,000 | 70 | 明确需求 |
| free mind map | 4,800 | 32,000 | 65 | 价格敏感 |
| online mind map | 3,900 | 28,000 | 68 | SaaS 流量入口 |
| mind mapping software | 2,700 | 18,000 | 60 | 决策型长尾 |
| brainstorming mind map | 1,900 | 12,000 | 45 | 场景词 |
| radial mind map | 210 | 1,300 | 18 | ★ 差异化机会，KD 极低 |
| markmap | 1,500 | 9,500 | 15 | 开发者长尾 |

**分析：**
- 核心词 KD 90 = MindMeister、XMind、Lucidchart、Coggle 高权重域名垄断；**SEO landing page ROI 中等**（独立站需大量外链才能排进 top 10）。
- **差异化入口：** "radial mind map" / "Buzan style mind map" 搜索量小但 KD 极低（18），可作为独立站流派站位。
- **产品战略：** MyMap.ai / ChatDiagram / ConceptMap 内嵌 mindmap 是转化漏斗的核心输出格式之一（尤其 ConceptMap 的品牌语义本身就是放射式概念图）——**mindmap 是集成产品的标配功能，而非独立 SEO 赌注**。
- **开源分发：** 纯 TypeScript + 零依赖的 mindmap 渲染器目前仅 markmap 一家占优，但 markmap 不做 radial；Schematex 以"radial + markmap-compat 双形态"切入开发者市场。

### 2.2 竞品矩阵

| 工具 | 形态 | 开源 | Runtime 依赖 | Radial | Tree | 本 standard 的差异 |
|------|------|------|-------------|:------:|:----:|-------------------|
| markmap.js.org | Tree-LR | MIT | d3, d3-flextree | — | ✓ | 缺 radial |
| XMind | 两者兼有 | 闭源 | 客户端 | ✓ | ✓ | 非 web 库 |
| MindMeister | Tree-LR 为主 | 闭源 | SaaS | — | ✓ | 非渲染库 |
| Coggle | Radial | 闭源 | SaaS | ✓ | — | 非渲染库 |
| mindmap (npm) | Radial | MIT | raphael.js | ✓ | — | 老旧，非 TS |
| jsmind | Tree-LR | BSD | 自有 | — | ✓ | 非 SVG 原生 |
| **Schematex** | **两者兼有** | MIT | **零依赖** | ✓ | ✓ | 本 standard |

---

## 3. Style Modes (核心抽象)

DSL 顶部 `style: <mode>` 决定整张图的布局与渲染风格。

| Mode | 默认 | 方向 | 适用场景 | 布局算法 |
|------|:----:|------|---------|---------|
| `radial` | ★ | 放射（360°） | 创意、教学、笔记 | §8 Radial Layout |
| `tree-lr` | — | 左→右水平 | markmap-compat、TOC、大纲 | §9 Reingold-Tilford |
| `tree-tb` | — | 上→下纵向 | 层级组织、分类树 | §9 Reingold-Tilford |
| `org` | — | 放射（紧凑扇区） | 宽扇出（主干 ≥ 10）单位 | §8 + sector compact |

**如果 DSL 未指定，默认 `radial`。** Mode 之间可通过 re-layout 互转；渲染器对 mode 感知，parser 不感知。

---

## 4. Node 类型

Mindmap 所有节点同属一个递归树，但根据在树中的深度与语义标注区分渲染：

| Node 种类 | 深度 | 视觉特征 | 默认配色 |
|-----------|-----:|---------|---------|
| **Central topic** | 0 | 圆角矩形或椭圆，字号最大，强调填充 | `accent` |
| **Main branch (level-1)** | 1 | 字号第二大，**独立配色**（每个 main branch 一色） | `palette[i % N]` |
| **Sub-branch (level 2+)** | ≥ 2 | 字号渐小，继承父 main branch 的色系 | 父色淡化 20% / 层 |
| **Leaf keyword** | 末层 | 小字号，无容器，仅文字 + 下划线小横线 | 父色 |
| **Image node** | 任意 | `<image>` 或 `<g>` 嵌入，矩形槽 | 无描边 |
| **Icon node** | 任意 | 16×16 emoji / icon 内联于 label 前 | 文字色 |
| **Note / annotation** | 任意 | 小字灰色，紧贴 label 下方；可多行 | `textMuted` |
| **Folded node** | 任意 | Label 后缀 `▸` 指示子树折叠；实际不渲染子树 | 同 leaf |

**特殊规则：**
- 中心主题只能有 1 个；根节点出现多次是非法 DSL。
- Main branch（level-1）数量建议 3–8；< 3 则改用 `tree-lr` 更合适，> 8 则切 `org` mode。
- 深度建议 ≤ 5；超过 5 层通常意味着应该拆分为独立 mindmap。

---

## 5. Edge (Branch) 类型

### 5.1 Branch 种类

| Branch | Mode | 形态 | 用途 |
|--------|------|------|------|
| **Organic curve** | radial / org | 三次 Bezier，锥形（根粗→叶细） | Buzan 风格默认 |
| **Straight** | tree-lr / tree-tb | 直线或一段 L 形 | markmap 风格默认 |
| **Smooth step** | tree-lr / tree-tb | L 形带圆角拐点 | 可选视觉变体 |
| **Dashed connector** | 任意 | 虚线 branch | 标记"弱关联"或"引用" |

### 5.2 Bezier Control-Point 计算（radial 模式）

对于 parent `P(px, py)`，child `C(cx, cy)`，分支沿 parent→child 方向：

```
dx = cx - px
dy = cy - py
len = sqrt(dx² + dy²)

// 控制点 1：距 parent 40% 长度，沿 parent 切线方向偏转
cp1_x = px + dx * 0.4
cp1_y = py + dy * 0.4 - (radial tangent offset)

// 控制点 2：距 child 20% 长度，沿 child 径向方向
cp2_x = cx - dx * 0.2
cp2_y = cy - dy * 0.2
```

切线偏转量 = `sin(parent_angle) * len * 0.15`，保证 branch 离开中心时略微上扬/下弯，形成有机感。

### 5.3 Thickness Tapering（锥形）

Radial 模式的 branch 必须实现**根粗叶细**的锥形。

**实现方式：** 将一条 branch 拆分为 N=8 个等长短段，每段 stroke-width 线性递减：

```
w(i) = w_start + (w_end - w_start) * (i / N)
```

默认：`w_start = 6px`（main branch 从中心出发）→ `w_end = 2px`（到 level-1 头）；level-2 以上 branch `w_start = 2px` → `w_end = 1px`。

参数通过 `branchWidth`, `branchTaperRatio` 主题 token 覆盖。

### 5.4 Color Inheritance

- Main branch（level-1）从 `palette[index]` 取色，index = main branch 声明顺序
- Sub-branch 继承父 main branch 色；可每层 lightness +8%，避免视觉饱和
- Leaf label 文字颜色 = 父 branch 色的 darkened 20%
- 用户可通过 `{color: "#xxx"}` 对任意节点覆盖

---

## 6. DSL Grammar

### 6.1 核心语法（markmap-compatible）

Schematex mindmap 默认采用 **markdown-heading + bullet-list 语法**，与 markmap 无缝兼容：

```
# Central Topic

## Main Branch 1
- keyword a
- keyword b
  - sub keyword
  - another sub
- keyword c

## Main Branch 2
- ...
```

**映射规则：**
- `#`（H1）= 中心主题（仅 1 个）
- `##`（H2）= Main branch（level-1），按声明顺序分配 palette 颜色
- `###`（H3）= Sub-branch（level-2），继承父色
- `- item` 缩进列表 = 更深层 sub-branches，缩进每 2 空格 = 1 层

### 6.2 Schematex 扩展（可选）

DSL 顶部支持 directive 行（以 `%%` 开头）覆盖默认行为：

```
%% style: radial
%% direction: tb
%% theme: default
%% fold-depth: 3
```

Node 后可追加属性块：

```
## Main Branch 2 {color: "#A32D2D", icon: "star"}
- keyword a {note: "memo text"}
- keyword b {fold: true}
- keyword c {image: "https://..."}
- keyword d {link: "https://..."}
```

### 6.3 EBNF

```ebnf
document        = directive* heading (heading | bullet)*

directive       = "%%" key ":" value NEWLINE

heading         = H1_prefix text properties? NEWLINE   # 中心主题
                | H2_prefix text properties? NEWLINE   # main branch
                | H3_prefix text properties? NEWLINE   # level-2

bullet          = INDENT "-" text properties? NEWLINE sub_bullet*
sub_bullet      = INDENT "-" text properties? NEWLINE

H1_prefix       = "# "
H2_prefix       = "## "
H3_prefix       = "### "
INDENT          = /  */                                # 0+ 空格，2 空格 = 1 层

properties      = "{" prop ("," prop)* "}"
prop            = "color:" QUOTED
                | "icon:" QUOTED
                | "image:" QUOTED
                | "note:" QUOTED
                | "link:" QUOTED
                | "fold:" ("true" | "false")

text            = /[^{\n]+/
QUOTED          = '"' /[^"]*/ '"'
```

### 6.4 可选的替代语法（explicit-tree）

对于程序化生成（AI、外部工具），支持显式缩进语法，不依赖 markdown heading：

```
%% style: radial
root: "Central Topic"
  branch: "Main 1" {color: indigo}
    - keyword a
    - keyword b
      - sub keyword
  branch: "Main 2"
    - keyword c
```

两种语法**二选一，不混用**；parser 按首行判断采用哪个。

---

## 7. AST 结构

Mindmap 使用独立的 `MindmapAST`（不复用 `DiagramAST`，因为 Individual/Relationship 模型不适配）：

```ts
export type MindmapStyle = "radial" | "tree-lr" | "tree-tb" | "org";

export interface MindmapNode {
  id: string;                    // 自动生成（稳定 hash）
  label: string;                 // 显示文本
  children: MindmapNode[];
  /** 显式覆盖色；否则从 palette 按 main-branch index 继承 */
  color?: string;
  /** 可选 icon（emoji 或 icon name） */
  icon?: string;
  /** 可选 image URL（http/https/data:） */
  image?: string;
  /** 备注，紧贴 label 下方渲染 */
  note?: string;
  /** 可选外链 */
  link?: string;
  /** 折叠子树（DSL 中声明 fold:true 时子树不参与 layout） */
  fold?: boolean;
  /** 节点深度（parser 计算，layout 读取） */
  depth: number;
}

export interface MindmapAST {
  type: "mindmap";
  title?: string;
  style: MindmapStyle;
  root: MindmapNode;
  /** 可选显式 canvas 尺寸 */
  width?: number;
  height?: number;
  /** 折叠阈值——自动折叠超过该深度的子树 */
  foldDepth?: number;
  metadata?: Record<string, string>;
}
```

布局后输出 `MindmapLayoutNode[]`：

```ts
export interface MindmapLayoutNode {
  node: MindmapNode;
  x: number;
  y: number;
  /** radial/org 模式下的角度（弧度），从正右为 0 */
  angle?: number;
  /** radial/org 模式下的半径（px） */
  radius?: number;
  /** main-branch 归属 index（决定 palette 色），root 为 -1 */
  branchIndex: number;
}

export interface MindmapLayoutEdge {
  from: string;
  to: string;
  /** SVG path d 属性 */
  path: string;
  /** tapered branch: 起止 stroke-width */
  widthStart: number;
  widthEnd: number;
  /** 边颜色 */
  color: string;
}
```

---

## 8. Layout Algorithm — Radial（核心差异化）

### 8.1 输入

- `root`: 中心主题节点
- `root.children`: N 个 main branches
- 每个 main branch 下的子树（任意深度）

### 8.2 步骤

**Step 1 — 主干角度分配**

默认按 main branch 数量等分 360°：

```
angleStep = 2π / N
mainBranchAngle[i] = -π/2 + i * angleStep   // 从正上起顺时针
```

**按子树权重加权（可选，`weighted: true`）：**

每个 main branch 的扇区角度正比于其子树 leaf 数量：

```
weight[i] = leafCount(subtree_i) + 1
angleFraction[i] = weight[i] / Σ weight
angleStep[i] = 2π * angleFraction[i]
```

**Step 2 — 每 main branch 的子树递归布局**

对每个 main branch `B[i]`，分配到扇区 `[angleStart, angleEnd]`，中心角度 `(angleStart + angleEnd) / 2`。

递归布局 `layoutSubtree(node, angleRange, startRadius)`：

```
1. 计算当前 node 的坐标:
   angle = (angleRange.start + angleRange.end) / 2
   x = cx + startRadius * cos(angle)
   y = cy + startRadius * sin(angle)

2. 若 node 无子节点，返回 (x, y)

3. 将 node 的 angleRange 按子节点 leaf 数均分:
   childAngleRanges = split(angleRange, children, weight=leafCount)

4. 对每个子节点递归:
   nextRadius = startRadius + radiusStep(depth)
   layoutSubtree(child, childAngleRanges[k], nextRadius)
```

**Step 3 — Radius 递进**

默认：

```
radiusStep(depth) = 120 + 20 * depth     // depth=1 → 140, depth=2 → 160 ...
```

可由 `config.radiusStep` 覆盖。子树越深，每层半径增量越小（避免外层过度稀疏）。

**Step 4 — 碰撞检测与扇区扩展**

遍历所有同层 leaf 对 `(a, b)`：若 `arcDistance(a, b) < minLeafSpacing`（默认 12px），则：

1. 将 a 所在 main branch 的 angleFraction 乘以 1.15
2. 全局重新归一化 angleFraction（其余 main branch 按比例缩小）
3. 重跑 Step 2

循环最多 6 次；若仍冲突，将冲突层的 radius 增加 30px 重跑。

**Step 5 — Label 定位与旋转**

对每个非 root 节点：

- 若 node 位于右半圆（`-π/2 ≤ angle ≤ π/2`）：text-anchor="start"，label 放在 node 右侧，无旋转
- 若 node 位于左半圆：text-anchor="end"，label 放在 node 左侧

**可选 rotating label（`config.rotateLabels=true`）：** label 旋转与分支切线对齐；此时所有 label `text-anchor="middle"`，并根据 angle 决定是否整段旋转 180° 以保证可读（左半圆旋转以避免倒置）。

### 8.3 Bezier 生成

对每条 parent→child edge，使用 §5.2 的 control-point 公式输出 cubic Bezier path：

```
M px,py C cp1_x,cp1_y cp2_x,cp2_y cx,cy
```

Taper 需要将该 Bezier 在 t 空间均分为 N=8 段，对每段单独以递减 stroke-width 渲染（因 SVG 单一 path 不支持 width-taper，需拆分）。

### 8.4 Canvas 尺寸估算

```
maxRadius = max(node.radius + labelWidth(node)) 对所有 node
width  = 2 * maxRadius + 2 * padding
height = 2 * maxRadius + 2 * padding
cx = width / 2
cy = height / 2
```

---

## 9. Layout Algorithm — Tree Modes

### 9.1 Reingold-Tilford Tidy Tree

`tree-lr` 和 `tree-tb` 共享经典的 Reingold-Tilford 算法（与 decision tree / org chart 渲染器复用）：

1. **Post-order**：为每个叶节点分配相对坐标 `x = 0`；对内部节点，根据子节点的 `x` 求平均并避免重叠
2. **Contour**：维护每子树的 left / right contour，保证不同子树间留 `nodeSpacing` 间距
3. **Pre-order**：将相对坐标转绝对坐标（累积 x 偏移）
4. 旋转：`tree-lr` 将 (x, y) → (y, x)（水平展开）；`tree-tb` 保持原样

### 9.2 与 markmap 的视觉兼容

`tree-lr` 模式输出与 markmap 等价（用户可无缝迁移）：

- 根节点在左，子节点在右，层间水平间距 `levelSpacing`（默认 80px）
- 同层节点按 y 排列，兄弟间距 `siblingSpacing`（默认 28px）
- Edge 用 cubic Bezier 左右对称连接（`d = "M x1,y1 C x1+k,y1 x2-k,y2 x2,y2"`, k = 0.5 * (x2-x1)）
- 根节点和 level-1 带颜色背景色块；深层仅文字 + 左侧短横线

### 9.3 Org Mode（radial + compact sector）

`org` mode 用于 main branch 数量极多（≥ 10）的情形：

1. 仍采用 radial 算法，但为每个 main branch 分配极窄扇区（angleStep < 36°）
2. 子树不允许回绕超过父 main branch 的扇区边界
3. Radius 更紧凑：`radiusStep = 80`
4. 禁用 organic Bezier，改用 **straight radial line** 以节省空间

---

## 10. Rendering

### 10.1 Central Topic

| 属性 | 默认 |
|------|------|
| Shape | `<rect rx="14">` 圆角矩形 or `<ellipse>`（由 `centralShape` 配置） |
| 尺寸 | 自适应文本 + padding 20px；最小 140×60 |
| Fill | `accent`（默认）或 `centralFill` 覆盖 |
| Stroke | 无（默认），`accent` + 2px（强调变体） |
| Text | `font-size * 1.6`，`font-weight: 700`，中心对齐 |
| Icon | 若 `icon` 存在，放在 label 左侧 22×22 |
| Image | 若 `image` 存在，替代 label 区域（保持 aspect ratio） |

### 10.2 Main Branch Node

| 属性 | 默认 |
|------|------|
| Shape | 无 shape（默认），仅文字 + 底部 underline |
| Underline | 2px 实线，长度 = label width + 8px，颜色 = branch color |
| Fill（强调变体） | `lighten(branch_color, 85%)`，rounded rect rx=8 |
| Text | `font-size * 1.2`，`font-weight: 600`，颜色 = `darken(branch_color, 15%)` |
| Icon | 16×16 预留 slot（label 前） |

### 10.3 Sub-branch / Leaf Node

| 属性 | 默认 |
|------|------|
| Shape | 无 |
| Underline | 1px，长度 = label width，颜色 = inherited branch color |
| Text | `font-size`，`font-weight: 400`，颜色 = `text` |
| Note | label 下方 `font-size * 0.85`，`textMuted`，最多 2 行 |

### 10.4 Branch Path

- Radial: cubic Bezier，锥形渐细（拆分 8 段模拟 taper）
- Tree: cubic Bezier S-curve，等宽 1.5px
- Dashed 变体: `stroke-dasharray="6 4"`

### 10.5 SVG 结构

```xml
<svg viewBox="0 0 W H" role="graphics-document" aria-label="Mindmap: {title}">
  <title>{title}</title>
  <desc>Mindmap with {N} nodes in {style} style</desc>
  <style>{CSS custom properties}</style>
  <defs>
    <!-- 可选 gradient for branch tapering fallback -->
  </defs>
  <g class="schematex-mindmap-edges">
    <!-- 每条 edge 为 <g class="schematex-branch"> 包含 8 段 <path> 实现 taper -->
  </g>
  <g class="schematex-mindmap-nodes">
    <g class="schematex-mindmap-central" data-node-id="root">...</g>
    <g class="schematex-mindmap-main" data-node-id="..." data-branch-idx="0">...</g>
    <g class="schematex-mindmap-leaf" data-node-id="..." data-branch-idx="0" data-depth="3">...</g>
  </g>
</svg>
```

### 10.6 Image 节点

- 若 `image` URL 是 `https://` / `http://`：生成 `<image href="...">`，设置 `width/height` 为节点 slot（120×80 默认）
- 若是 `data:image/...`：直接嵌入
- **⚠️ NEEDS VICTOR INPUT**：外部 image 加载策略——同步还是异步？是否允许 runtime fetch？（与 Org chart image slot 一致方案）

---

## 11. Theme Integration

新增 `MindmapTokens` 扩展到 `src/core/theme.ts`：

```ts
export interface MindmapTokens {
  /** 中心主题填充 */
  centralFill: string;
  /** 中心主题文字 */
  centralText: string;
  /** 中心主题描边 */
  centralStroke: string;
  /** Main branch 色板（N 色循环） */
  branchPalette: readonly string[];
  /** Branch 起始 stroke-width（靠近 root） */
  branchWidthStart: number;
  /** Branch 末端 stroke-width（靠近 leaf） */
  branchWidthEnd: number;
  /** Leaf label 透明度（视觉弱化） */
  leafOpacity: number;
  /** Note / annotation 文字色 */
  noteColor: string;
}
```

### 11.1 默认 palette（复用 BaseTheme.palette 增补到 8 色）

与 fishbone 同色系保持视觉一致：

| Index | 色名 | Hex |
|------:|------|------|
| 0 | Indigo | `#534AB7` |
| 1 | Teal | `#0F6E56` |
| 2 | Blue | `#185FA5` |
| 3 | Rust | `#993C1D` |
| 4 | Amber | `#854F0B` |
| 5 | Red | `#A32D2D` |
| 6 | Green | `#2E7D32` |
| 7 | Purple | `#7B3A9A` |

### 11.2 CSS Custom Properties

```
--schematex-mindmap-central-fill
--schematex-mindmap-central-text
--schematex-mindmap-branch-0
--schematex-mindmap-branch-1
... （至 7）
--schematex-mindmap-branch-width-start
--schematex-mindmap-branch-width-end
--schematex-mindmap-leaf-opacity
```

### 11.3 `monochrome` preset（学术/打印）

- 所有 main branch 同色（`text` 黑）
- Branch stroke 1.5px 直线，无 taper
- 通过缩进和字重区分层级
- 适合 LaTeX / PDF 打印

### 11.4 `dark` preset

- `centralFill` 为 Catppuccin mauve
- `branchPalette` 提升亮度（Catppuccin 彩色）
- 背景 `#1e1e2e`

---

## 12. Test Cases

### Case 1: Basic 3-branch Radial（最小 radial）

```
%% style: radial
# Project Plan
## Scope
- features
- non-goals
## Timeline
- milestones
- dependencies
## Team
- roles
- contacts
```

**验证要点：** 3 main branches 均分 360°（间隔 120°），palette 取 indigo/teal/blue，canvas ≈ 480×480。

### Case 2: Balanced 8-branch Radial（满板）

```
%% style: radial
# Company OKR 2026

## Product
- Q1 launch
- API v2
- Mobile app

## Engineering
- Reliability
- Tech debt
- Hiring

## Design
- System upgrade
- Research sprint

## Marketing
- Brand refresh
- SEO content

## Sales
- Enterprise motion
- Partnerships

## Ops
- Finance
- Legal

## People
- Performance review
- Training

## Customer
- NPS
- Support SLA
```

**验证要点：** 8 ribs 均分 45°；8 色 palette 完整使用；深度 2 子节点按半径 140 排布。

### Case 3: Unbalanced Radial（扇区加权）

```
%% style: radial
%% weighted: true
# Book Notes — Thinking Fast and Slow

## System 1
- intuition
- fast
- emotional
- biases
  - anchoring
  - availability
  - representativeness
  - confirmation
  - loss aversion
  - endowment
  - hindsight
  - planning fallacy
  - narrative fallacy
  - affect
  - framing
  - mental accounting
  - optimism
  - overconfidence
  - regression mean
  - base rate
  - conjunction
  - sunk cost
  - status quo
  - default

## System 2
- deliberate
- slow

## Prospect Theory
- reference dependence
- loss aversion

## The Two Selves
- experiencing
- remembering
```

**验证要点：** weighted 模式下 "System 1" 主干（含 23 leaves）扇区明显扩大（占 ≈ 60% 角度），其余 3 主干被压缩；无碰撞。

### Case 4: Deep Radial（5 层深）

```
%% style: radial
# ML Roadmap
## Supervised
- Classification
  - Linear models
    - Logistic regression
      - Regularization
        - L1 / L2
        - Elastic net
    - SVM
      - Kernels
        - RBF
- Regression
  - Ridge
  - Lasso
## Unsupervised
- Clustering
- Dim reduction
```

**验证要点：** 最深路径 Supervised→Classification→Linear models→Logistic regression→Regularization→L1/L2 渲染在 radius 280+，label 可读，无重叠；深度 5 时 radius 达 280（120+140+160+180+200）。

### Case 5: Tree-LR (markmap 等价)

```
%% style: tree-lr
# Markmap Migration Test
## Section A
- a1
- a2
  - a2-sub1
  - a2-sub2
## Section B
- b1
- b2
- b3
## Section C
- c1
```

**验证要点：** Canvas 宽度主导（800+），高度 ≈ 280；根在左、叶在右；同层 y 等距；Bezier edge 对称。与 markmap 对同一 markdown 渲染输出视觉基本一致（层级顺序、间距比例匹配）。

### Case 6: Tree-TB（组织分类）

```
%% style: tree-tb
# Animal Kingdom
## Vertebrata
- Mammals
- Birds
- Reptiles
- Amphibians
- Fish
## Invertebrata
- Arthropods
- Mollusks
- Annelids
```

**验证要点：** Root 在顶端，子树向下展开；高度主导，宽度约等于所有 leaf 总和 × spacing。

### Case 7: Radial with Colors + Icons

```
%% style: radial
# Daily Routine
## Morning {color: "#FFA726", icon: "☀️"}
- meditate
- exercise
## Work {color: "#185FA5", icon: "💻"}
- focus blocks
- meetings
## Evening {color: "#7B3A9A", icon: "🌙"}
- reading
- family
```

**验证要点：** 用户显式 color 覆盖 palette；icon 位于 main branch label 左侧 16×16；leaf 继承父色。

### Case 8: Radial with Image Node

```
%% style: radial
# Trip to Japan
## Tokyo
- Shibuya {image: "https://example.com/shibuya.jpg"}
- Akihabara
## Kyoto
- Fushimi Inari
- Kinkaku-ji
```

**验证要点：** 图片节点渲染 120×80 image slot；label 移至图片下方；其余 leaf 正常文字。

### Case 9: markmap-compat Stress（与 markmap 对齐）

```
# Mind Maps
## Features
- Export
  - PDF
  - PNG
  - SVG
- Collaboration
- Versioning
## Design
- Colors
- Fonts
- Icons
## Usage
- Students
- Professionals
```

**验证要点：** 以 `tree-lr` 渲染；与 markmap.js.org 同 markdown 的输出截图相似度 > 90%（节点位置、层级顺序、edge 形态）。

### Case 10: Dense 100-node Stress

自动生成 100 leaf（10 main branch × 10 leaf each）radial layout。

**验证要点：** 布局耗时 < 100ms；无 leaf label 重叠；canvas < 1400×1400。

### Case 11: Narrow-Angle Sector（2 main branch）

```
%% style: radial
# Binary Decision
## Yes
- reason 1
- reason 2
- reason 3
## No
- reason a
- reason b
```

**验证要点：** 2 main branch 分别占据 180° 半圆（左右或上下）；不是恶化成直线。

### Case 12: Fold

```
%% style: radial
# Deep Topic
## Branch A
- v1 {fold: true}
  - hidden-1
  - hidden-2
  - hidden-3
- v2
## Branch B
- w1
```

**验证要点：** `v1` label 后缀 `▸`；其子节点不参与 layout 也不渲染。

### Case 13: Org Mode（多 main branch）

```
%% style: org
# Tech Stack
## Frontend
- React
- Vue
## Backend
- Node
- Go
## Database
- Postgres
## Cache
- Redis
## Queue
- Kafka
## Observability
- Sentry
- Datadog
## CI/CD
- GitHub Actions
## Infra
- AWS
## Testing
- Vitest
- Playwright
## Docs
- Fumadocs
```

**验证要点：** 10 main branch 分别占 36°；采用直线 branch 而非 Bezier；radius 紧凑。

### Case 14: Note Annotation

```
%% style: radial
# Essay Outline
## Thesis {note: "thesis is the core claim"}
- statement
- significance
## Arguments
- premise 1 {note: "cite Smith 2019"}
- premise 2
```

**验证要点：** Note 渲染在 label 下方，`textMuted` 色，font-size 0.85x，不参与 edge 终点定位。

### Case 15: Monochrome Theme

Case 1 + `%% theme: monochrome`。

**验证要点：** 所有 branch 黑色；无 taper；仅用缩进/字号/underline 区分层级；适合黑白打印。

---

## 13. DSL → AST 映射示例

Input:
```
%% style: radial
# Goals
## Work
- ship v1
- hire 2 engineers
## Life
- run marathon
```

Output AST:
```ts
{
  type: "mindmap",
  style: "radial",
  root: {
    id: "n0",
    label: "Goals",
    depth: 0,
    children: [
      {
        id: "n1",
        label: "Work",
        depth: 1,
        children: [
          { id: "n2", label: "ship v1", depth: 2, children: [] },
          { id: "n3", label: "hire 2 engineers", depth: 2, children: [] },
        ],
      },
      {
        id: "n4",
        label: "Life",
        depth: 1,
        children: [
          { id: "n5", label: "run marathon", depth: 2, children: [] },
        ],
      },
    ],
  },
}
```

---

## 14. Accessibility

- SVG `role="graphics-document"` + `aria-label="Mindmap: {title}"`
- 每节点 `<g>` 附 `<title>{label}</title>`（screen reader 读出）
- Edge 无语义标签，`aria-hidden="true"`
- Central topic 额外 `aria-level="1"`，main branch `aria-level="2"`, 等
- Fold 节点使用 `aria-expanded="false"`，子树 `aria-hidden="true"`

---

## 15. Interaction Hooks (future)

- `data-node-id`, `data-depth`, `data-branch-idx`, `data-fold` on every node `<g>`
- CSS `.schematex-mindmap-node:hover` → 高亮
- 点击 fold icon（`▸`）→ 消费者实现展开（纯 static SVG 不内建，但 DSL + data-* 足够让消费者加 JS）
- 导出时支持 `data-markmap-compat="true"` flag 以便转回 markmap 格式

---

## 16. Implementation Plan

预估 2–3 周，按 priority 分阶段：

| Priority | Feature | Complexity | 预估 |
|----------|---------|------------|-----:|
| P0 | Parser: markdown-heading + bullet + `%%` directive + `{}` props | Medium | 2d |
| P0 | AST: MindmapNode/MindmapAST 类型 + stable id 生成 | Low | 0.5d |
| P0 | Layout: radial 基础（angleStep 均分，radiusStep 递增） | Medium | 2d |
| P0 | Layout: radial weighted 扇区 + collision detection | Medium | 1.5d |
| P0 | Renderer: central topic + underline-style branches + text | Low | 1d |
| P0 | Renderer: Bezier branch path (cubic) | Low | 0.5d |
| P0 | Renderer: thickness tapering（8-segment split） | Medium | 1d |
| P0 | Theme: MindmapTokens + 8-color palette + 3 presets | Low | 0.5d |
| P0 | Test case 1, 2, 3 视觉对齐 | — | 0.5d |
| P1 | Layout: tree-lr / tree-tb (Reingold-Tilford 复用) | Medium | 1.5d |
| P1 | Renderer: tree 模式 S-curve edge | Low | 0.5d |
| P1 | markmap-compat test (case 5, 9) | — | 0.5d |
| P1 | Explicit-tree 替代语法 parser | Low | 0.5d |
| P1 | Icon + image node 渲染 | Medium | 1d |
| P1 | Note / annotation 二行渲染 | Low | 0.5d |
| P2 | Org mode（narrow-sector radial） | Medium | 1d |
| P2 | Fold 节点（后缀 ▸ + 子树裁剪） | Low | 0.5d |
| P2 | Rotating label（沿分支切线） | Medium | 1d |
| P2 | Monochrome / dark theme 完成 | Low | 0.5d |
| P3 | Auto-switch radial → tree when N > 50 | Medium | 1d |
| P3 | Interactive fold/unfold（纯 SVG+CSS hack） | High | 2d |

---

## 17. Open Questions / ⚠️ NEEDS VICTOR INPUT

1. **Image 加载策略** — 同 Org chart / Entity structure 决定：是否允许 runtime fetch？还是仅允许 `data:` URL？（build-time 预处理是最稳方案）
2. **Auto-switch radial → tree** — 当节点数 > 50 时，是否自动切成 `tree-lr`？或在 DSL 中警告用户显式切换？倾向后者（尊重用户选择）。
3. **markmap 1:1 兼容度** — 是否要把 markmap 的 inline math / latex / inline code / highlight 特性也支持？短期 P2，若 ChatDiagram/ConceptMap 实际需要再加。
4. **Interactive fold** — 静态 SVG 是否内建 fold/unfold？技术上可用 CSS `:target` + `<a>` 实现，但会让 SVG 膨胀 30%。倾向 DSL 支持 `fold:true` 属性（只控制初始渲染），交互由消费者加 JS。
5. **Radial 主干顺序** — 当前按 DSL 声明顺序从正上起顺时针。是否需要 `startAngle` directive 允许用户指定首 branch 位置？优先级 P2。
6. **Label 旋转** — 默认水平 label 是安全选择；旋转 label 美但可能倒字。是否默认开启 `rotateLabels`？倾向默认关闭，进阶用户显式开启。
7. **Max depth warning** — 深度 > 5 时 parser 是否警告？布局能跑但视觉拥挤。建议 `warn` 级别（输出到 metadata.warnings），不阻断。

---

## 18. Coverage Matrix

验证本 standard 对 15 个 test case 的完整覆盖：

| Feature | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 | C13 | C14 | C15 |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Radial layout | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Tree-LR layout | — | — | — | — | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| Tree-TB layout | — | — | — | — | — | ✓ | — | — | — | — | — | — | — | — | — |
| Org mode | — | — | — | — | — | — | — | — | — | — | — | — | ✓ | — | — |
| Weighted sectors | — | — | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — | — |
| Collision detection | — | — | ✓ | ✓ | — | — | — | — | — | ✓ | — | — | — | — | — |
| Bezier organic branches | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | — |
| Thickness tapering | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | — |
| Straight branches | — | — | — | — | ✓ | ✓ | — | — | ✓ | — | — | — | ✓ | — | ✓ |
| Palette color cycling | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Custom colors | — | — | — | — | — | — | ✓ | — | — | — | — | — | — | — | — |
| Icon | — | — | — | — | — | — | ✓ | — | — | — | — | — | — | — | — |
| Image node | — | — | — | — | — | — | — | ✓ | — | — | — | — | — | — | — |
| Note / annotation | — | — | — | — | — | — | — | — | — | — | — | — | — | ✓ | — |
| Fold | — | — | — | — | — | — | — | — | — | — | — | ✓ | — | — | — |
| markmap-compat DSL | — | — | — | — | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| Monochrome theme | — | — | — | — | — | — | — | — | — | — | — | — | — | — | ✓ |
| Deep hierarchy (≥ 5) | — | — | — | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| Dense (≥ 50 nodes) | — | — | — | — | — | — | — | — | — | ✓ | — | — | — | — | — |

**结论：** 本 standard 定义的 radial layout（扇区分配 + 加权 + 碰撞 + Bezier + taper）+ tree-lr/tb（Reingold-Tilford）+ org mode + markmap-compat DSL + 8-色 palette + node 属性系统（icon/image/note/fold）+ 3 preset，共同覆盖 15 个 sample case 的全部视觉需求，可驱动 parser + layout + renderer 实现 `src/diagrams/mindmap/`。

与 markmap 的战略互补：Schematex 在 `tree-lr` 模式下实现 markmap 等价渲染（开发者零摩擦迁移），在 `radial` 模式下提供 markmap 缺失的 Buzan 放射形态（差异化核心），并通过 `org` mode 覆盖 markmap 回避的宽扇出场景。这让 Schematex 成为"mindmap 的 superset"，而非"markmap 的 clone"。
