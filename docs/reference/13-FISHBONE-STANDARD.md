# 13 — Fishbone (Ishikawa) Diagram Standard Reference

*Cause-and-effect analysis diagram. 又名 Ishikawa diagram / Cause-and-Effect diagram / Herringbone diagram。面向质量管理、根因分析、DMAIC、5-Why 补充分析、OKR 回溯、增长诊断、事故复盘、教学领域的结构化因果图。*

> **References (学科惯例 + 相关标准):**
> - **Ishikawa, Kaoru (1968)** *Guide to Quality Control*. JUSE Press — 原始文献，定义 "脊—骨" 骨架和 category-first 发散方法
> - **Ishikawa, Kaoru (1985)** *What Is Total Quality Control? The Japanese Way*. Prentice-Hall — 引入 6M 分类法（Man / Machine / Method / Material / Measurement / Mother Nature）
> - **ASQ (American Society for Quality)** *Fishbone (Ishikawa) Diagram* — ASQ Quality Tools 的规范化定义（[asq.org/quality-resources/fishbone](https://asq.org/quality-resources/fishbone)）
> - **ISO 9001:2015 QMS, Clause 10.2** — 不合格与纠正措施要求根因分析；fishbone 是行业标准工具之一
> - **Six Sigma DMAIC — Analyze Phase** — Measure → Analyze 阶段的首选因果工具（Juran Institute, ASQ CSSBB Body of Knowledge 2022）
> - **IHI (Institute for Healthcare Improvement) — Cause and Effect Diagram Tool** — 医疗行业标准 RCA 工具
> - **NHS Improvement — Root Cause Analysis Using Five Whys & Fishbone** — 英国医疗系统公开模板
> - **Tague, Nancy R. (2005)** *The Quality Toolbox, 2nd Ed.* ASQ Quality Press — 6M / 4S / 8P category family 的整理
> - **Minitab / JMP / MS Visio fishbone template convention** — 软件产品的 de-facto 渲染约定
>
> 注：无单一 ISO/IEEE 标准统管 fishbone 外观，本 standard 综合上述来源 + 业内 SaaS 工具惯例（Miro, Lucidchart, EdrawMax, draw.io），形成可程序化渲染的约定。

---

## 1. Structure

Fishbone diagram 是一个 **发散型因果分析图**，结构由四层组成：

1. **Effect（鱼头 / Problem Statement）** — 被分析的问题、目标或结果（图右端）
2. **Spine（脊骨）** — 水平主干，从鱼尾延伸到鱼头
3. **Category ribs（主骨 / 6M 等分类骨）** — 从脊骨斜向延伸出的主分类
4. **Causes / Sub-causes（细刺）** — 在每条主骨上挂载的具体原因，可再嵌套子原因形成 3-4 层深度

**典型用途：**
- 质量管理：工序缺陷根因分析、8D / CAPA 报告
- Six Sigma：DMAIC 中 Analyze 阶段的穷举工具
- 产品运营：留存 / 转化下降、NPS 下滑、bug 频发
- 增长分析：网站流量下跌、漏斗转化漂移（本 reference SVG 的示例）
- 医疗事故：IHI / NHS RCA 框架
- 教育：辩论 / 写作中的结构化因果梳理
- Retrospective：团队回顾、事故复盘（通常与 5-Why 组合使用）

**与其他图的区别：**
- 不是 tree（tree 方向一致，fishbone 以中心主干放射双向分叉）
- 不是 mindmap（mindmap 放射无结构约束；fishbone 强制 "水平脊骨 + 倾斜主骨 + 细刺" 的鱼骨形态）
- 不是 flowchart（flowchart 表达顺序 / 逻辑分支；fishbone 表达静态的多原因汇聚到单一 effect）
- 不是 sociogram（sociogram 描述人与人关系；fishbone 描述 "多原因 → 单结果" 的因果结构）

---

## 2. Canonical Orientation

**默认画向：鱼头朝右（Effect on Right）**

这是 Ishikawa 原始文献、ASQ 模板、Minitab、Visio、Miro 的统一惯例。Spine 水平向右延伸到 Effect box，主骨呈 **斜向远离鱼头** 的形态（见 §5 Geometry）。

**可选：鱼头朝左**（`direction: left`），罕见但被某些欧洲 QMS 教材采纳；本 standard 支持但不默认。

**禁止：** 垂直方向（违反 "fishbone" 视觉隐喻，退化为 tree）。

---

## 3. Effect (Fish Head)

Effect 是分析的锚点 —— 问题 / 目标 / 结果。

### 3.1 渲染规范

| 属性 | 默认 | 说明 |
|------|------|------|
| Shape | 三角形（`<polygon>`） | 鱼头造型，尖端指向 spine 的反方向（右向鱼时尖端朝右） |
| 尺寸 | 80 × 80（宽度 × 高度） | 宽度 = spine 终点到尖端 |
| 填充 | `#faece7` (muted warm) | 可通过 `--schematex-fishbone-effect-fill` 覆盖 |
| 描边 | `#993c1d` 0.5px | 与 accent 主色调一致 |
| 文字 | 14px, 500 weight, 2 行最大 | 中心对齐，`dominant-baseline="central"` |
| 多行换行 | 基于 label length 自动 break | 超过 6 汉字 / 10 英文词自动二行 |

### 3.2 DSL

```
effect "<problem statement>"
```

示例：
```
effect "网站流量下跌"
effect "Q3 用户留存下滑 15%"
effect "Manufacturing line defect rate > 3%"
```

**位置强制约束：** effect 永远固定在 canvas 右端（或左端，视 direction），不随 layout 变化。

---

## 4. Spine & Tail

### 4.1 Spine

- 水平直线，stroke 2px
- 从 tail fork（x=30）出发，到 effect 三角形左边中点（x=effect_left）
- 颜色：`var(--color-text-primary)` 默认深灰黑
- **不可** 有弯曲、dash、箭头；这是骨架，非箭头

### 4.2 Tail Fork（可选，默认开启）

- 两条直线从 spine 起点（x=70, y=center）分别斜向 (30, center-40) 和 (30, center+40)
- stroke 2px, `stroke-linecap="round"`
- 视觉作用：强化 "鱼" 的隐喻；不承载语义

可通过 `tail: false` 关闭，退化为纯脊骨起点 dot。

---

## 5. Category Ribs (主骨)

### 5.1 几何约束

**关键约束：主骨必须斜向远离鱼头**（"rib slants away from the fish head"）。这是 Ishikawa 视觉的核心签名，区别于无序的 mindmap。

对于右向鱼（effect 在右）：
- **上半部 ribs**: 从 spine 的某点 `(sx, cy)` 出发，向 **左上** 延伸到 header box `(hx, hy)`，其中 `hx < sx` 且 `hy < cy`
- **下半部 ribs**: 从 spine 的某点 `(sx, cy)` 出发，向 **左下** 延伸到 header box `(hx, hy)`，其中 `hx < sx` 且 `hy > cy`

**斜率约定：** `dx/dy = 0.6`（典型值），即每向上/下 100px，向左平移 60px。这是 ASQ/Minitab 模板的经验斜率，既不过陡（视觉尖锐）也不过缓（细刺挂载空间不足）。

### 5.2 渲染规范

| 属性 | 默认 | 说明 |
|------|------|------|
| Line width | 1.5px | 比 spine 细 |
| 颜色 | 按 category index 从 palette 取色 | 见 §5.4 |
| Linecap | butt（默认） | — |
| Mask | 必须叠加 text-gap mask | 当 rib 穿过标签时挖空（见 §8） |
| Header label position | rib 末端 | 距 rib endpoint ±20px，视方位 |

### 5.3 Category Header Box

每条主骨末端挂载一个 pill-shape header box：

| 属性 | 默认 |
|------|------|
| Shape | `<rect>` rx=8（圆角矩形 / pill） |
| 尺寸 | 120 × 36 |
| 填充 | `lighten(category_color, 85%)` |
| 描边 | `category_color` 0.5px |
| 文字 | 14px, 500 weight, text-anchor=middle |
| 文字颜色 | `darken(category_color, 15%)` |

### 5.4 Category Color Palette

默认 6 色 palette（对应 6M 分类）：

| Index | Category（6M） | Stroke | Fill | Text |
|-------|----------------|--------|------|------|
| 0 | Man / People / 人 | `#534AB7` (indigo) | `#eeedfe` | `#3C3489` |
| 1 | Method / 方法 | `#0F6E56` (teal) | `#e1f5ee` | `#085041` |
| 2 | Machine / 机器 | `#185FA5` (blue) | `#e6f1fb` | `#0C447C` |
| 3 | Material / 材料 | `#993C1D` (rust) | `#faece7` | `#712B13` |
| 4 | Measurement / 测量 | `#854F0B` (amber) | `#faeeda` | `#633806` |
| 5 | Mother Nature / Environment / 环境 | `#A32D2D` (red) | `#fcebeb` | `#791F1F` |

**超过 6 个 category** 时循环使用 palette，但 **不推荐 > 8 个**（视觉 becoming noisy，违反 Ishikawa 初衷）。

所有颜色通过 CSS custom properties 可覆盖：`--schematex-fishbone-cat-0-stroke`, `--schematex-fishbone-cat-0-fill`, etc.

### 5.5 DSL

```
category <id> "<display name>"
```

示例：
```
category content "内容 Content"
category tech "技术 Technical"
category links "外链 Backlinks"
category ux "体验 UX"
category competition "竞争 Competition"
category algo "算法 Algorithm"
```

顺序决定 color palette 分配（第 0 个 category = indigo, 第 1 = teal ...）。

---

## 6. Category Families (推荐的分类体系)

以下是行业内被广泛接受的分类族。**DSL 不强制**，但 Schematex 在 DSL 使用 `category` 默认关键词时会按序分配颜色，推荐遵循某一族使视觉具备语义一致性。

### 6.1 Manufacturing / QMS — 6M（Ishikawa 原始）

Man · Method · Machine · Material · Measurement · Mother Nature（Environment）

### 6.2 Service / Marketing — 4S

Surroundings · Suppliers · Systems · Skills

### 6.3 Business / Marketing — 8P

Price · Promotion · People · Processes · Place · Policies · Procedures · Product

### 6.4 Healthcare — 4M + P（IHI 常用）

Methods · Materials · Machines · Manpower + Patients

### 6.5 Software / Growth（de-facto）

Content · Technical · Traffic Sources · UX · Competition · Algorithm / Platform

### 6.6 自定义

DSL 允许任意自定义分类名，类别数量 ≤ 8 最佳，≥ 10 则考虑先聚类再画图。

---

## 7. Causes / Sub-causes (细刺)

### 7.1 Level-1 Cause

挂在 category rib 上的具体原因。

**几何约束：**
- 水平短线（默认 30px 长度）
- 位于 rib 的 **朝向鱼头那一侧**（右向鱼：rib 右侧）
- line stroke 0.8px, opacity 0.6（弱化为辅助视觉）
- 颜色：同 category stroke
- Label 紧贴 branch 末端右侧 4px，12px font, 400 weight
- Label 颜色：`#3d3d3a` muted dark（**不用** category_color，避免与 header 竞争视觉权重）

**挂载点分布：**
- 每条 rib 默认 4 个槽位
- 槽位 Y 轴间距 30px
- 槽位 Y 从 rib 挂载端最近处起向远端（靠近 header）排列
- 例：rib 从 (260, 280) 到 (140, 80)，槽位 y = 230 / 200 / 170 / 140，对应 rib 上的 x 由斜率公式计算

### 7.2 Sub-cause (Level 2+)

对于根因深度分析，支持在 Level-1 cause 下再分出子原因。

**渲染：**
- 在 Level-1 branch 右端挂更短的 vertical tick（10px）
- 每个 tick 挂一个 Level-2 label（11px, 400 weight, muted）
- 多个 sub-causes 垂直堆叠，间距 18px

**深度限制：** 推荐 ≤ 3 层（Category → Cause → Sub-cause）。Ishikawa 原始文献警告超过 3 层意味着 "分析过早发散"，建议配合 5-Why 转移到独立分析。

### 7.3 DSL

Level 1（挂在 category rib 上）：
```
<category_id> : "<cause text>"
```

Level 2（挂在前一行 Level-1 cause 下）：
```
<category_id> : "<cause text>"
  - "<sub-cause 1>"
  - "<sub-cause 2>"
```

示例：
```
content : "更新频率下降"
content : "同质化严重"
content : "关键词未覆盖"
  - "长尾词无内容"
  - "竞品占位 H1"
content : "AI 内容质量低"

tech : "Core Web Vitals 差"
tech : "索引覆盖率下降"
tech : "爬虫被 WAF 拦截"
  - "Cloudflare Bot Fight 误伤"
  - "robots.txt 错误"
tech : "结构化数据缺失"
```

---

## 8. Text-Gap Mask (视觉关键细节)

当 rib 斜线穿过 label 所占矩形区域时，必须在 rib 上挖空（mask）避免线与文字重叠，否则文字可读性差。

### 8.1 Mask 生成策略

1. 对每个 text label 测量其 bounding box（基于字体度量近似，或 `getBBox()` 运行时测量）
2. 将所有 bbox 作为 `<mask>` 中的 `<rect fill="black">` 添加
3. `<mask>` 的 base 为 `<rect fill="white">` 占 full canvas
4. 所有 ribs / branches 使用 `mask="url(#fishbone-text-gaps)"` 应用该 mask
5. Text 本身不应用 mask（因为 mask 从白到黑，text 放在其上方正常显示）

### 8.2 实现约束

- Mask ID 必须带随机后缀（`fishbone-text-gaps-${nanoid(6)}`），避免多图同页冲突
- bbox 略膨胀 2px padding（上下各 1px，左右各 2px），保证视觉 gap 充裕
- `rx=2` 圆角使 gap 视觉柔和

参考 SVG（见本 standard 对应的 v6 sample）中 mask id 为 `imagine-text-gaps-7cr0ye`，实现此模式。

---

## 9. Layout Algorithm

### 9.1 输入

- `effect`: 1 个
- `categories`: n 个（推荐 4–8）
- 每个 category 下 `causes`: m 个（每 rib 默认最多 4 个 Level-1 cause 不溢出）

### 9.2 步骤

1. **Canvas 尺寸估算：**
   - 默认 canvas width = 680, height = 560
   - 每行 cause 占 30px 垂直空间；若某 rib 超过 4 个 cause，height 自适应增长

2. **Category 分配到上/下半：**
   - n 个 category 对半分：前 ⌈n/2⌉ 放上半，后 ⌊n/2⌋ 放下半
   - 若 n 为奇数，上半多 1 个
   - 上下半内按声明顺序从左到右排列

3. **Spine 几何：**
   - `spine_y = canvas_height / 2`
   - `spine_start_x = 70`
   - `spine_end_x = canvas_width - 140`（给 effect 三角 80px + padding）

4. **Rib 挂载点 x 均分：**
   - 上下半独立均分 spine 可用区段
   - 典型：上半 3 ribs → spine_x ∈ {260, 380, 500}
   - 下半 3 ribs → spine_x ∈ {260, 380, 500}（与上半对齐）

5. **Rib 终点（header center）：**
   - 上半：`(sx - 120, 80)`（rib 向左上）
   - 下半：`(sx - 120, 480)`（rib 向左下）
   - Header rect 居中于该点，rect width=120 height=36

6. **Sub-branch 挂载点：**
   - 每 rib 4 个槽位，Y 从 rib 靠 spine 端 30px 起，step 30px（上半向上，下半向下）
   - 对应 X 由斜率公式：上半 `x = sx - (spine_y - y) * 0.6`，下半 `x = sx - (y - spine_y) * 0.6`
   - Branch 水平线长度 30px（向右延伸 = 朝鱼头方向）

7. **Text placement**: label 在 branch 末端右侧 4px 位置，`dominant-baseline="central"`，`text-anchor="start"`

### 9.3 溢出处理

若某 category 下 cause 超过 4 个：
- **Option A**（默认）：rib 延长 + slot 数增加，自适应延伸 rib（延长 dy，重算 header 位置）
- **Option B**（`overflow: truncate`）：保留 4 个 + 显示 "+N more"
- **Option C**（`overflow: sub-branch`）：后续 cause 作为第 4 个 cause 的 sub-cause

---

## 10. DSL Grammar (EBNF)

```ebnf
document        = header (effect_def | category_def | cause_def | config_def)* NEWLINE
header          = "fishbone" quoted_string NEWLINE
                | "fishbone:" quoted_string NEWLINE

effect_def      = "effect" quoted_string properties? NEWLINE

category_def    = "category" ID quoted_string properties? NEWLINE

cause_def       = ID ":" quoted_string properties? NEWLINE sub_cause_list?

sub_cause_list  = ( INDENT "-" quoted_string properties? NEWLINE )+

config_def      = "config" ":" config_key "=" config_value NEWLINE

config_key      = "direction" | "tail" | "palette" | "overflow"
                | "maxCausesPerRib" | "canvasWidth" | "canvasHeight"

properties      = "[" property ("," property)* "]"
property        = "color:" HEX                      # 自定义 category / cause 颜色
                | "weight:" INTEGER                 # 1-5, 用于未来权重筛选
                | "note:" quoted_string             # tooltip 内容
                | "data:" quoted_string             # 外部数据 hook
                | kv_prop

ID              = /[a-zA-Z][a-zA-Z0-9_-]*/
INTEGER         = /[0-9]+/
HEX             = /#[0-9a-fA-F]{3,8}/
quoted_string   = '"' /[^"]*/ '"'
INDENT          = /  +/                              # ≥ 2 空格
```

---

## 11. Test Cases

### Case 1: Website Traffic Drop（6 categories · 24 causes · 本 reference SVG）

对应本 standard 的样例 SVG (`Fishbone Website Traffic Drop v6.svg`)。演示 6M 变体（增长分析版）+ 每 rib 4 cause + 文本 mask。

```
fishbone "Fishbone diagram — 网站流量下跌原因分析"

effect "流量下跌"

category content     "内容 Content"
category tech        "技术 Technical"
category links       "外链 Backlinks"
category ux          "体验 UX"
category competition "竞争 Competition"
category algo        "算法 Algorithm"

content : "更新频率下降"
content : "同质化严重"
content : "关键词未覆盖"
content : "AI 内容质量低"

tech : "Core Web Vitals 差"
tech : "索引覆盖率下降"
tech : "爬虫被 WAF 拦截"
tech : "结构化数据缺失"

links : "高质量外链流失"
links : "低质量链接占比高"
links : "引荐域名停滞"
links : "锚文本多样性低"

ux : "跳出率上升"
ux : "移动端体验差"
ux : "首屏加载慢"
ux : "弹窗广告过多"

competition : "新对手涌入"
competition : "AI 工具替代搜索"
competition : "品牌心智减弱"
competition : "对手内容更新快"

algo : "Core Update 惩罚"
algo : "E-E-A-T 信号不足"
algo : "AIO / SGE 截流"
algo : "意图匹配漂移"
```

**验证要点：**
- Canvas 680 × 560，spine 水平 y=280，effect 三角尖端 x=620
- 6 ribs：上半 content/tech/links，下半 ux/competition/algo
- 上半 rib 从 (260/380/500, 280) 斜向 (140/260/380, 80)
- 下半 rib 从 (260/380/500, 280) 斜向 (140/260/380, 480)
- 每条 rib 下 4 个短水平 branch（30px），各自 12px label
- 颜色 palette 精确匹配：indigo / teal / blue / rust / amber / red
- 所有 rib 与 branch 必须应用 text-gap mask，确保穿过 label 处挖空

### Case 2: Manufacturing 6M（QMS 经典例）

```
fishbone "Welding defect — surface porosity"

effect "表面气孔缺陷"

category man         "Man · 人"
category method      "Method · 方法"
category machine     "Machine · 机器"
category material    "Material · 材料"
category measurement "Measurement · 测量"
category env         "Environment · 环境"

man : "焊工培训不足"
man : "班次疲劳"

method : "电流参数偏低"
method : "预热温度不达标"
method : "保护气流量设置错误"

machine : "焊枪喷嘴磨损"
machine : "送丝机打滑"

material : "母材表面油污"
material : "焊丝受潮"
  - "仓储湿度 > 60%"
  - "开封后未回烘"

measurement : "游标卡尺未校准"
measurement : "气流表读数偏差"

env : "车间湿度过高"
env : "通风导致保护气扰动"
```

**验证要点：**
- 6 ribs 对称，每 category 下 cause 数量不等（2–3 个），rib 不需 "填满 4 槽"
- Material 下的 "焊丝受潮" 包含 2 个 sub-cause（Level 2），挂在 Level-1 branch 末端右侧的 vertical tick

### Case 3: Software Incident RCA（8P 变体）

```
fishbone "API P1 incident · latency spike 2026-03-12"

effect "API P99 latency 从 200ms → 3.2s"

category deploy   "Deploy"
category deps     "Dependencies"
category db       "Database"
category network  "Network"
category code     "Code"
category observe  "Observability"

deploy : "canary % 过高"
deploy : "回滚耗时 12min"

deps : "第三方 SDK 引入新版"
deps : "auth 服务 p95 飙升"

db : "连接池耗尽"
db : "慢查询（未加索引）"
  - "新 feature 未审 query plan"

network : "单 AZ 丢包"
network : "ALB 健康检查超时"

code : "N+1 query 回归"
code : "并发锁退化"

observe : "警报阈值过高"
observe : "dashboard 缺少 p99 指标"
```

**验证要点：**
- 6 ribs，颜色按声明顺序
- "慢查询" 节点带 1 个 sub-cause，验证深度 2 渲染
- 使用 Software 常用 category 名称（非 6M），验证 DSL 对自定义 category 的支持

### Case 4: Small Fishbone（4 categories, edge case）

```
fishbone "学生考试失利"

effect "期末不及格"

category study    "学习方法"
category health   "身心状态"
category external "外部"
category teach    "教学"

study : "复习不充分"
study : "笔记混乱"

health : "考前失眠"
health : "焦虑"

external : "家庭干扰"

teach : "考试范围未覆盖"
teach : "题型训练少"
```

**验证要点：**
- 4 ribs → 上半 2 + 下半 2
- 每 rib 的 cause 数不均（1–2 个），验证 overflow: auto 不展开空 slot
- 颜色 palette 取前 4 色（indigo / teal / blue / rust）

### Case 5: Healthcare RCA（IHI 4M + P）

```
fishbone "Medication administration error"

effect "Patient received wrong dose"

category methods  "Methods"
category material "Materials"
category machines "Machines"
category manpower "Manpower"
category patient  "Patients"

methods : "Double-check not performed"
methods : "Order transcription error"

material : "Similar-looking vial labels"
material : "Same strength multi-vial"

machines : "Pump default profile not updated"
machines : "Barcode scanner misread"

manpower : "Staffing shortage"
manpower : "Trainee unsupervised"

patient : "ID band missing"
patient : "Allergy not flagged"
```

**验证要点：**
- 5 categories，奇数：上半 3 + 下半 2
- 取前 5 色 palette
- 验证所有 cause 均为纯英文渲染正常

---

## 12. Accessibility

- 每个 SVG 必须带 `<title>` + `<desc>`
- Effect node 附加 `<title>` 说明（screen reader：读出 problem statement）
- 每个 category header 附加 `role="graphics-symbol"` 和 `<title>`
- 每个 cause label 为纯 `<text>`，避免 image 替代
- ARIA: `role="graphics-document"` on SVG

---

## 13. Interaction Hooks (future)

- `data-category-id` on category header rect + rib line
- `data-cause-idx` on cause branch + label
- `data-level` on sub-cause tick（"1" | "2" | "3"）
- `data-effect-id` on fish-head polygon
- CSS hover classes: `.schematex-fishbone-rib:hover`, `.schematex-fishbone-cause:hover` 由消费者定制
- 点击 category header 可高亮整条 rib（预留 `data-highlight` 属性）

---

## 14. Implementation Priority

| Priority | Feature | Complexity |
|----------|---------|------------|
| P0 (Phase 13.0) | Parser: effect + category + cause DSL | Low |
| P0 | Layout: spine + symmetric rib placement + 0.6 斜率 | Medium |
| P0 | Renderer: spine / tail fork / effect polygon / rib line / category header | Low |
| P0 | Level-1 cause 水平 branch + 右侧 label | Low |
| P0 | 6-color palette 循环分配（CSS custom properties） | Low |
| P0 | Text-gap mask 自动生成（防止 rib 穿字） | Medium |
| P0 | Test case 1 (6M website traffic) 视觉对齐 sample SVG | — |
| P1 | Sub-cause (Level 2) tick + label | Low |
| P1 | 3+ sub-cause 垂直堆叠渲染 | Low |
| P1 | Overflow: auto rib 延长（> 4 cause / rib） | Medium |
| P1 | Left-facing fishbone（direction: left） | Low |
| P1 | Test case 2, 3, 5 视觉通过 | — |
| P2 | Category icon（rib header 左侧预留 16×16 icon slot） | Medium |
| P2 | Cause weight（视觉强调 = 高权重 cause 字重加粗、color accent） | Low |
| P2 | Auto-layout 调整 when n categories 大（n > 8） | Medium |
| P3 | 动态折叠 category（交互式，展开 / 收起 ribs） | High |
| P3 | 从 5-Why 数据自动转 fishbone AST | Medium |

---

## 15. Coverage Matrix

验证本 standard 对 5 个 sample case 的完整覆盖：

| Feature | Case 1 (Traffic) | Case 2 (Welding) | Case 3 (RCA) | Case 4 (Small) | Case 5 (Healthcare) |
|---------|:-----:|:-----:|:-----:|:-----:|:-----:|
| Effect fish-head polygon | ✓ | ✓ | ✓ | ✓ | ✓ |
| Spine + tail fork | ✓ | ✓ | ✓ | ✓ | ✓ |
| 6 categories | ✓ | ✓ | ✓ | — | — |
| 5 categories (odd) | — | — | — | — | ✓ |
| 4 categories (min) | — | — | — | ✓ | — |
| Rib 0.6 斜率远离鱼头 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Category header pill | ✓ | ✓ | ✓ | ✓ | ✓ |
| Level-1 cause horizontal branch | ✓ | ✓ | ✓ | ✓ | ✓ |
| Level-2 sub-cause (vertical tick) | — | ✓ | ✓ | — | — |
| Uneven cause count per rib | — | ✓ | ✓ | ✓ | ✓ |
| Auto-rib-extend (overflow) | — | — | — | — | — |
| Text-gap mask | ✓ | ✓ | ✓ | ✓ | ✓ |
| Color palette 循环 | ✓ (6) | ✓ (6) | ✓ (6) | ✓ (4) | ✓ (5) |
| Custom category names | — | — | ✓ | ✓ | ✓ |
| Chinese + English labels | ✓ | ✓ | — | ✓ | — |
| Pure English labels | — | — | ✓ | — | ✓ |

**结论：** 本 standard 定义的 effect / spine / rib geometry / category palette / cause levels / text-gap mask / DSL grammar 共同覆盖 5 个 sample case 的全部视觉需求，可直接驱动 parser + renderer 实现 `src/diagrams/fishbone/`。
