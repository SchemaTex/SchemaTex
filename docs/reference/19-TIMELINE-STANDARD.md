# 19 — Timeline Diagram Standard Reference

*Static event timeline on a time axis. 面向历史 / 传记 / 产品路线图 / 新闻事件 / 科学时间尺度的结构化时间轴图。*

> **References (no single authoritative standard — timeline is a conventional form synthesized from below):**
> - **Joseph Priestley (1765)** *A Chart of Biography* — 传记条形时间轴（lifeline bar）的奠基样式，横向按比例
> - **Charles Joseph Minard (1869)** *Napoleon's March* — 按时间 + 空间 + 量级的多维时间轴代表作
> - **TimelineJS (Knight Lab, Northwestern University)** — 互联网时代新闻 / 叙事型 timeline 的 de facto 模板（水平 + 按时间比例 + 图标 + 年代背景带）
> - **Vis-timeline (https://visjs.github.io/vis-timeline/)** — JS timeline 库的结构约定：item / group / range / point / background
> - **Preceden, Office Timeline, Sutori** — 历史教学 / 商业汇报领域的 SaaS timeline 惯例
> - **International Commission on Stratigraphy (ICS) — Geologic Time Scale (v2023/09)** — 地质年代图的 era / period / epoch 层次 + 颜色 CMYK 规范
> - **Wikipedia "Graphical timeline" templates** — 维基百科上 "{{Graphical timeline}}" 模板约定的 era band + event marker 视觉
> - **Aha! / Roadmunk / ProductPlan roadmap conventions** — 产品路线图的 swimlane + quarter grid 约定
> - **Tufte, Edward R. (1983)** *The Visual Display of Quantitative Information*, Ch. 5 — data-ink ratio 对时间轴密度设计的指导
>
> 本 standard 综合上述来源 + 业内 SaaS 工具惯例，形成可程序化渲染的约定。**与 Gantt 的区别：** Gantt 是交互式项目管理工具（task dependencies / critical path / resource loading）；timeline 是静态展示工具（events on an axis）。本 standard **不覆盖** Gantt（依赖关系、拖拽编辑、关键路径等），参见 §1.3。

---

## 1. 用户与需求（第一性原理）

### 1.1 用户画像 × 场景

| 画像 | 场景 | 典型需求 |
|------|------|---------|
| **历史学家 / 教师** | 课堂历史时间轴、历史专著插图 | 按比例年代、era 背景带、BC/AD、人物 lifeline bar |
| **传记作者 / 人物研究者** | 名人生平、科学家 / 艺术家传记 | 多轨道（career / personal / publications）并行 lifeline |
| **记者 / 研究员** | 事件溯源（疫情、选举、战争、司法案件） | 高密度事件点 + 精确日期 + 注释气泡 |
| **产品经理** | 产品路线图、发布历史 | 按季度 / 月分组、主题 swimlane、milestone 标星 |
| **科学家** | 演化时间尺度、地质年代、天文时间尺度 | 对数刻度、era 背景色（ICS 标准配色）、十亿年跨度 |
| **项目汇报者** | OKR / 里程碑回顾（非 Gantt） | 静态里程碑标记 + 分类图标 + 时间段 highlight |
| **教育教材编写** | 历史 / 文学 / 科学教材插图 | 清晰、印刷可读、单色友好 |

### 1.2 Mermaid timeline 为何不够

Mermaid 的 `timeline` 语法是一个**退化的纵向文本大纲**：
- **无图标**：只有文字点位，视觉单调
- **无横向布局**：强制垂直堆叠（移动端被迫滚动，桌面端浪费横向空间）
- **无按比例时间轴**：所有事件等距，1000 年跨度与 1 天跨度视觉相同，严重误导
- **无并行轨道**：无法表达同一时段的多条线（人物 lifeline × 事件 × 背景 era）
- **无 era 背景带**：无法表达 "文艺复兴期间发生的事件"
- **无 lifespan bar**：无法表达人物生卒、政权跨度
- **CD 数据点**：Timeline 是 ChatDiagram 第 3 高 Mermaid 错误来源，1,189 errors/month —— 用户真实地试图画 timeline，但语法过于简陋导致他们不断触发错误。

Schematex timeline 的目标：**填补 Mermaid timeline 的所有断层**。

### 1.3 与 Gantt 的边界

| 维度 | Timeline（本 standard） | Gantt（**不覆盖**）|
|------|----------------------|-------------------|
| 定位 | 静态展示 | 交互式项目管理 |
| 节点 | Event / milestone / era / lifespan | Task with duration |
| 边 | 无（独立事件） | Task dependencies（finish-to-start 等） |
| 交互 | 无（SVG 静态输出） | 拖拽、依赖线、关键路径高亮 |
| 输出 | 单个静态 SVG | 需运行时交互 |
| Schematex 支持 | ✓ | ✗（用户明确排除）|

若用户需求含 "dependencies / critical path / drag" 则 timeline 不适用；若只是 "events on a timeline" 则适用。

---

## 2. 市场需求数据

- **Ahrefs keyword volume**：`timeline` 100K US monthly / 434K global, KD 82
  - **Caveat**: "timeline" 是歧义词（social media feed timeline、legal statute of limitations、project timeline），真实 diagram-intent 流量远小于原始值。保守估计 15–25% 即 diagram 意图（~15–25K US monthly）。
- **ChatDiagram 内部数据**：`timeline` 是 Mermaid 产生错误的第 3 高图表类型，1,189 errors/month —— 表明用户频繁尝试但受限于语法。
- **关联关键词**：`historical timeline` / `biography timeline` / `project timeline` / `product roadmap timeline` / `geologic timeline` 各自 KD 30–60，合计可观。
- **竞品签名流量**：TimelineJS 项目页月访问 ~40K（SimilarWeb 估计），证明开源 timeline 渲染器有稳定需求。

**结论**：即便按保守口径打 20% 折扣，timeline 仍是 Schematex 优先级 TOP 3 的图表之一。

---

## 3. 标准合规（Convention, not Standard）

Timeline 无 ISO/IEEE 标准。Schematex 采用以下行业惯例组合：

1. **方向**：默认 **左→右 chronological**（与读写方向一致，西方印刷惯例）
2. **年代标注**：BC/AD 或 BCE/CE（公元前 / 公元后），负数表示 BC（e.g. `-753` = 公元前 753 年）
3. **Era 背景带**：借鉴 ICS Geologic Time Scale 的分层背景色方案（era 最浅、period 中、epoch 最深）
4. **Lifeline bar**：借鉴 Priestley 1765，每条 lifeline 为一条水平条形，宽度按比例 = 寿命长度
5. **Milestone 标记**：借鉴产品路线图惯例（五角星 ★ / 旗帜 🚩 / 菱形 ◆）
6. **Roadmap swimlane**：借鉴 Aha! / Roadmunk 的 theme-based lane layout
7. **Callout annotation**：借鉴 TimelineJS 的 connector-line + text-box 注释样式
8. **对数刻度时**：借鉴天文 / 地质惯例的 10 倍单位 gridline（1 / 10 / 100 / 1000 Ma）

---

## 4. Orientation & Scale

### 4.1 Orientation

| 模式 | 默认 | 适用场景 |
|------|------|---------|
| `horizontal` | **✓ 默认** | 桌面、宽屏、大多数用例 |
| `vertical` | — | 移动端、长时间轴（> 50 events）、博客长文 |

`vertical` 时整个 geometry 旋转 90°，时间轴从上到下，左右变为上下两侧 track 槽位。

### 4.2 Scale

| 模式 | 说明 | 何时用 |
|------|------|--------|
| `proportional` | **默认** | 事件 x 坐标 = `linear_map(date → canvas_x)`。准确反映时间间隔。 |
| `equidistant` | 所有事件等距，无论日期间隔 | 事件密集且间隔差异巨大时（e.g. 21 个 2024 事件中有 1 个发生于 1900）|
| `log` | 对数刻度 | 地质 / 天文 / 史前时间尺度（跨度 10⁹）|

### 4.3 Scale mapping 公式

**Proportional (linear):**
```
x(t) = padding_left + (t - t_min) / (t_max - t_min) * plot_width
```

**Log:**
```
x(t) = padding_left + (log(t - t_shift) - log_min) / (log_max - log_min) * plot_width
```
`t_shift` 用于使最早日期对应 `log(1)`（避免 log(0)）。

**Equidistant:**
```
x(i) = padding_left + i / (n - 1) * plot_width       # i = event index after sort
```

### 4.4 Tick granularity 自动选择

根据 `t_max - t_min` 跨度自动：

| 跨度 | Major tick | Minor tick | 示例 |
|------|-----------|-----------|------|
| < 1 day | hour | 10 min | 新闻时段图 |
| < 1 month | day | 6 h | 事故时间线 |
| < 2 years | month | week | 2024 选举 timeline |
| < 20 years | year | quarter | 产品路线图 |
| < 200 years | decade | year | 传记 |
| < 2000 years | century | decade | 朝代、历史 |
| > 2000 years | millennium | century | 古代文明 |
| > 10⁶ years | Ma (million years) | — | 地质 / 演化 |

---

## 5. Node / Event 类型

### 5.1 Point event（瞬时事件）

- 一个时间点 + 一个 label
- 渲染：circle / square / diamond marker 在时间轴上 + label（above / below axis 自动避让）
- DSL：`1969-07-20: "Apollo 11 lunar landing"`

### 5.2 Range event / Lifespan（区间事件）

- 有 start + end 两个时间点
- 渲染：水平 bar（height 16px）横跨 `x(start)` 到 `x(end)`，bar 中心带 label（若长度足够）或 bar 右侧 label
- 应用：人物生卒、政权起止、战争时段、产品版本生命周期
- DSL：`1879 - 1955: "Albert Einstein"` 或 `range 1879..1955: "Einstein"`

### 5.3 Milestone（强调点）

- 特殊 point event，视觉更强
- 渲染：默认五角星 ★ / 旗帜 🚩 / 菱形 ◆，比普通 marker 大 50%，带 accent color stroke
- DSL：`1905: milestone "Annus Mirabilis — 4 breakthrough papers"`

### 5.4 Era / Period（背景带）

- 跨越某时段的**背景色带**，不占 track 空间（在轴后面画）
- 渲染：半透明 `<rect>` 覆盖整个 plot 高度，顶部有 era 标签（在 axis 上方）
- 应用：历史时代（文艺复兴 1400–1600）、产品阶段（Alpha / Beta / GA）、地质纪元（Cambrian）
- DSL：`era 1400 - 1600: "Renaissance"` 或 `era 2020-03 - 2023-05: "Pandemic"`

### 5.5 Annotation（注释气泡）

- Point / range 附加的更长文字说明
- 渲染：从 marker 引出 connector line 到 side callout box
- DSL：
  ```
  1905: milestone "Annus Mirabilis"
    note: "Einstein published 4 papers transforming physics: photoelectric effect, Brownian motion, special relativity, mass-energy equivalence."
  ```

### 5.6 Icon（可选视觉增强）

- 每个 point / range 可附带 emoji 或命名 icon
- 渲染：icon 画在 marker 位置替代 default shape，或 marker 左侧 16×16px
- DSL：`1969-07-20: "Moon landing" [icon:🚀]`

---

## 6. Multi-track Layout

### 6.1 动机

并发事件 / 人物 lifeline 无法全部挤在单一轴线上。Timeline 支持**多条 track**（水平方向时为上下堆叠的 lane），每 track 可显式命名。

### 6.2 自动 track packing（无命名 track 时）

算法：greedy interval scheduling
1. 将所有 range event 按 start ascending 排序
2. 维护 `tracks: {endX: number}[]`
3. 对每个 range event，找第一条 `endX < event.start` 的 track 放入；若无则新建 track
4. Point event 可放入任意 track 的空隙（一般放在独立的 "point lane"）

目标：最小化 track 数量；结果是最大并行重叠数 = track 数（区间图的 chromatic number 下界）。

### 6.3 命名 track（swimlane）

DSL 显式声明 track：
```
track "Career":
  1879 - 1895: "Patent clerk era"
  1905: milestone "Annus Mirabilis"
  ...
track "Personal":
  1903 - 1919: "Married Mileva"
  1919 - 1936: "Married Elsa"
```
渲染：每 track 一条独立水平 lane，track label 画在左侧，lane 之间 4px gap。不做 packing（用户已指定）。

### 6.4 Track geometry

- Lane height：`range` 类 lane 32px, `point-only` lane 24px
- Lane 之间 gap：4px
- Track label 宽度：120px（左列，右对齐）
- Axis 穿过每条 lane 的垂直方向（range bar 中心线为 axis 在该 lane 的投影）—— **或** axis 只在 canvas 底部画一条（更简洁，主推）

### 6.5 轴位置选择

- `axis: bottom`（默认）：所有 tracks 在画布上半部分，axis 在底部，ticks 引到每条 track 顶部作为参考
- `axis: center`：axis 中间，point events 交替上下（teeth pattern）—— 经典 Wikipedia 样式
- `axis: per-track`：每条 track 自己一条 axis —— 仅当 tracks 有不同时间范围时（罕见）

---

## 7. DSL Grammar (EBNF)

```ebnf
document        = header? config_def* top_level+
header          = "timeline" quoted_string NEWLINE

config_def      = "config" ":" config_key "=" config_value NEWLINE
config_key      = "orientation" | "scale" | "axis" | "dateFormat"
                | "tickGranularity" | "start" | "end"
                | "canvasWidth" | "canvasHeight" | "theme"

top_level       = era_def | event_def | track_def | annotation_block

era_def         = "era" date_range ":" quoted_string properties? NEWLINE

track_def       = "track" quoted_string ":" NEWLINE
                  ( INDENT event_def )+

event_def       = point_event | range_event | milestone_event
point_event     = date ":" quoted_string properties? NEWLINE note_block?
range_event     = date_range ":" quoted_string properties? NEWLINE note_block?
                | "range" date_range ":" quoted_string properties? NEWLINE note_block?
milestone_event = date ":" "milestone" quoted_string properties? NEWLINE note_block?

note_block      = INDENT "note:" quoted_string NEWLINE

date_range      = date "-" date
                | date ".." date

date            = iso_date | year | bc_year | relative_date
iso_date        = /[0-9]{4}-[0-9]{2}-[0-9]{2}(T[0-9:]+)?/
year            = /[0-9]{1,4}/
bc_year         = "-" /[0-9]+/
                | /[0-9]+/ "BC"
                | /[0-9]+/ "BCE"
relative_date   = /[0-9.]+/ ("Ma" | "Ga" | "ka")    # mega/giga/kilo years ago

properties      = "[" property ("," property)* "]"
property        = "color:" HEX
                | "icon:" ( EMOJI | IDENTIFIER )
                | "shape:" ( "circle" | "square" | "diamond" | "star" | "flag" )
                | "track:" quoted_string                    # assign to track from flat list
                | "category:" IDENTIFIER
                | "data:" quoted_string

IDENTIFIER      = /[a-zA-Z][a-zA-Z0-9_-]*/
HEX             = /#[0-9a-fA-F]{3,8}/
quoted_string   = '"' /[^"]*/ '"'
INDENT          = /  +/
EMOJI           = /\p{Extended_Pictographic}/u
```

### 7.1 DSL 完整示例

```
timeline "Einstein — life and work"

config: orientation = horizontal
config: scale = proportional
config: axis = bottom

era 1879 - 1919: "German Empire"           [color: #fef3c7]
era 1919 - 1933: "Weimar Republic"          [color: #dbeafe]
era 1933 - 1955: "Post-Germany era"         [color: #fce7f3]

track "Career":
  1879 - 1895: "Early education"
  1896 - 1900: "ETH Zurich"
  1902 - 1909: "Swiss Patent Office"
  1905: milestone "Annus Mirabilis — 4 papers"
    note: "Photoelectric effect (Nobel 1921), Brownian motion, special relativity, E=mc²."
  1909 - 1914: "University of Zurich → Prague"
  1914 - 1933: "Berlin (Kaiser Wilhelm Institute)"
  1915: milestone "General Relativity published"
  1921: milestone "Nobel Prize in Physics" [icon:🏆]
  1933 - 1955: "Institute for Advanced Study, Princeton"

track "Personal":
  1903 - 1919: "Married to Mileva Marić"
  1919 - 1936: "Married to Elsa Einstein"

track "Public":
  1939: "Einstein–Szilárd letter to FDR"  [icon:✉️]
  1952: "Declined presidency of Israel"
  1955-04-18: "Died in Princeton"          [icon:🕯]
```

### 7.2 紧凑 DSL（无 track, 自动 pack）

```
timeline "Apollo program"
config: scale = proportional

1961-05-25: milestone "Kennedy Moon speech"
1967-01-27: "Apollo 1 fire (tragedy)"
1968-12-21 - 1968-12-27: "Apollo 8 (first lunar orbit)"
1969-07-16 - 1969-07-24: "Apollo 11 — Moon landing"  [icon:🚀]
1970-04-11 - 1970-04-17: "Apollo 13 (abort)"
1972-12-07 - 1972-12-19: "Apollo 17 (last crewed Moon mission)"
```

---

## 8. Layout Algorithm

### 8.1 输入

- `events`: Point[] ∪ Range[] ∪ Milestone[]
- `eras`: Era[]（背景带，独立于 events）
- `tracks`: 命名 tracks 或 auto-pack 决定

### 8.2 步骤

**Step 1 — 时间范围检测：**
```
t_min = min(event.start for event in events ∪ eras.start)
t_max = max(event.end ?? event.date for event in events ∪ eras.end)
# 可被 config.start/end 覆盖
# 两侧各加 2% padding 避免贴边
```

**Step 2 — 轴缩放选择：**
- 默认 `linear`。若跨度 > 10⁴ 且事件密度高度不均，建议用户切换 `log`
- 建立 `xScale(t) → canvas_x`

**Step 3 — Tick 生成：**
- 根据跨度选择 granularity（§4.4）
- 生成 major ticks（年份 / 十年 / 世纪）
- Label 每个 major tick（overflow 时自动 rotate 30° 或跳格显示）

**Step 4 — Track 分配：**
- 命名 track：按 DSL 顺序创建 lanes
- 未分配 track 的 range events：greedy interval scheduling
- Point events：分配到独立 "points lane" 或挂在最近 range 的同一 lane

**Step 5 — Lane layout：**
```
lane_y(i) = padding_top + i * (lane_h + lane_gap)
```

**Step 6 — Event 几何：**
- Point：`(xScale(date), lane_y + lane_h / 2)`，marker radius 5
- Range：`rect (xScale(start), lane_y + 4, xScale(end) - xScale(start), lane_h - 8)`
- Milestone：marker radius 8，五角星 path

**Step 7 — Label 放置 + 碰撞避让：**
- Point label 默认在 marker 上方 8px，`text-anchor=middle`
- 若与前一个 label 的 bbox 重叠：
  - 策略 A：cascade（向上偏移 14px，最多 3 级）
  - 策略 B：alternate sides（上下交替）
  - 策略 C：leader line（画斜线 connector 指向远离的 label 位置）
- Range 中心 label：若 `xScale(end) - xScale(start) < label_width + 8`，label 放到 range 右侧

**Step 8 — Era band 渲染：**
- 在 plot 区域底层画 `<rect x="xScale(start)" y="plot_y" width="xScale(end)-xScale(start)" height="plot_h"` fill 为 era.color（半透明 0.25）
- Era label 画在 axis 上方 region，使用 era.color 加深 30%

**Step 9 — Axis rendering：**
- 主 axis line 在 `axis: bottom` 模式下位于 plot 底部
- Major ticks 向下延伸 6px + label
- Minor ticks 向下延伸 3px 无 label

### 8.3 Canvas 尺寸

- 默认 `width = 960`, `height = auto`
- `auto height = padding_top + n_tracks * (lane_h + lane_gap) + axis_h + padding_bottom`
- 若事件 label overflow, height 自动增加以容纳 cascade lanes

---

## 9. Rendering

### 9.1 SVG 结构

```xml
<svg class="st-timeline" data-diagram-type="timeline">
  <defs>
    <style>
      .st-axis-line   { stroke: var(--schematex-stroke); stroke-width: 1.5; }
      .st-axis-tick   { stroke: var(--schematex-stroke-muted); stroke-width: 1; }
      .st-axis-label  { font: 11px sans-serif; fill: var(--schematex-text-muted); }
      .st-era-rect    { opacity: 0.25; }
      .st-era-label   { font: 12px sans-serif; font-weight: 500; }
      .st-event-dot   { stroke-width: 1.5; }
      .st-event-label { font: 12px sans-serif; fill: var(--schematex-text); }
      .st-range-bar   { rx: 4; opacity: 0.85; }
      .st-milestone   { stroke-width: 2; }
      .st-track-label { font: 12px sans-serif; font-weight: 600; fill: var(--schematex-text); }
      .st-callout     { font: 11px sans-serif; fill: var(--schematex-text-muted); }
      .st-callout-line{ stroke: var(--schematex-stroke-muted); stroke-width: 0.8; stroke-dasharray: 2,2; }
    </style>
  </defs>
  <title>Timeline — [name]</title>
  <desc>[description]</desc>

  <!-- Era background bands -->
  <g id="st-eras">...</g>

  <!-- Track labels (left column) -->
  <g id="st-track-labels">...</g>

  <!-- Lane backgrounds (optional subtle stripe) -->
  <g id="st-lanes">...</g>

  <!-- Events (ranges first so points render on top) -->
  <g id="st-ranges">...</g>
  <g id="st-points">...</g>
  <g id="st-milestones">...</g>

  <!-- Labels + callouts -->
  <g id="st-labels">...</g>

  <!-- Axis (bottom) -->
  <g id="st-axis">...</g>
</svg>
```

### 9.2 Event marker shapes

| Type | 默认 shape | SVG |
|------|-----------|-----|
| Point | circle r=5 | `<circle cx="x" cy="y" r="5"/>` |
| Milestone | 5-pt star | `<path d="M x,y-9 ..." />` |
| Range | rounded rect | `<rect rx="4" ... />` |
| Range (lifespan) | capsule | `<rect rx="lane_h/2" ... />` |

### 9.3 Data attributes (交互 hook)

- `data-event-id` on every marker / bar / label
- `data-track-id` on every lane group
- `data-era-id` on every era rect
- `data-date` (ISO 8601) on markers for consumer scripting

---

## 10. Theme 集成

扩展 `src/core/theme.ts` 新增 `TimelineTokens`：

```ts
export interface TimelineTokens {
  timeAxis: string;              // axis line color
  timeAxisMuted: string;         // minor ticks
  lifespanBar: string;           // default range bar fill
  eventDot: string;              // default point marker
  milestoneMarker: string;       // milestone accent color
  eraFill: readonly string[];    // era background palette (8 colors, low saturation)
  calloutLine: string;           // annotation connector
}
```

### 10.1 Default theme tokens

```ts
const DEFAULT_TIMELINE: TimelineTokens = {
  timeAxis: "#37474f",
  timeAxisMuted: "#90a4ae",
  lifespanBar: "#1565c0",
  eventDot: "#1565c0",
  milestoneMarker: "#e65100",     // orange-accent for standout
  eraFill: [
    "#fef3c7", // amber-100
    "#dbeafe", // blue-100
    "#fce7f3", // pink-100
    "#dcfce7", // green-100
    "#ede9fe", // violet-100
    "#ccfbf1", // teal-100
    "#fee2e2", // red-100
    "#e5e7eb", // grey-200
  ],
  calloutLine: "#90a4ae",
};
```

### 10.2 Monochrome theme

Era 使用不同 pattern（斜线密度 / 点密度）区分而非颜色，适配印刷与学术。

### 10.3 CSS custom properties

```
--schematex-timeline-axis
--schematex-timeline-event-dot
--schematex-timeline-milestone
--schematex-timeline-era-0 ... --schematex-timeline-era-7
--schematex-timeline-lifespan
```

---

## 11. Test Cases

### Case 1: Basic horizontal 10-event（smoke test）

```
timeline "US Space Firsts"
config: scale = proportional

1957-10-04: "Sputnik 1"
1961-04-12: "Gagarin first human in space"
1961-05-05: "Shepard first US human"
1962-02-20: "Glenn orbits Earth"
1965-03-18: "Leonov first spacewalk"
1966-02-03: "Luna 9 Moon landing (robotic)"
1969-07-20: milestone "Apollo 11 Moon landing"
1971-04-19: "Salyut 1 first space station"
1981-04-12: "STS-1 Space Shuttle"
1998-11-20: "ISS first module"
```

**验证：** 10 个点，proportional 放置，axis ticks 为每 5 年，labels 无 overlap。

### Case 2: Einstein biographical multi-track（§7.1 样例）

**验证：** 3 named tracks，range bars 准确对应年份，milestones 带 ★，eras 背景半透明且不遮挡 marker，annotation callout 从 "Annus Mirabilis" 引出侧边 box。

### Case 3: WWII European Front events

```
timeline "WWII European Front"
config: scale = proportional

era 1939-09 - 1940-05: "Phoney War" [color: #e5e7eb]
era 1940-05 - 1941-06: "Fall of France + Blitz"
era 1941-06 - 1943-02: "Eastern Front early"
era 1943-02 - 1944-06: "Turning point"
era 1944-06 - 1945-05: "Allied advance"

1939-09-01: milestone "Germany invades Poland"
1940-05-10 - 1940-06-25: "Battle of France"
1940-07 - 1940-10: "Battle of Britain"
1941-06-22: milestone "Operation Barbarossa"
1942-08 - 1943-02: "Battle of Stalingrad"
1944-06-06: milestone "D-Day"
1945-05-08: milestone "VE Day"
```

**验证：** 5 个 era 背景带连续覆盖时间轴，milestones 在关键节点，range events 精确。

### Case 4: Geological timescale log

```
timeline "Life on Earth"
config: scale = log
config: tickGranularity = Ma

4600Ma: milestone "Earth forms"
4000Ma: "Oldest rocks"
3500Ma: "First life (cyanobacteria)"
2400Ma: "Great Oxidation Event"
540Ma: milestone "Cambrian Explosion"
252Ma: milestone "Permian-Triassic extinction"
66Ma: milestone "K-Pg extinction (dinosaurs)"
0.3Ma: "Homo sapiens emerges"
0.012Ma: "Holocene begins"
```

**验证：** Log axis 把 4600Ma → 0 分布合理，否则 Holocene 会贴在最右 1px 内不可见。

### Case 5: Product roadmap 4-quarter

```
timeline "Schematex 2026 roadmap"
config: scale = equidistant

track "Diagrams":
  2026-Q1: "Timeline v1 launch"
  2026-Q2: "Gantt interactive"
  2026-Q3: "Mindmap + concept map"
  2026-Q4: "Swimlane / user journey"

track "Platform":
  2026-Q1: "Theme v2 API"
  2026-Q2: "MDX embed"
  2026-Q3: "CLI + Node.js API"
  2026-Q4: "Figma plugin"

track "Community":
  2026-Q1: milestone "500 GitHub stars"
  2026-Q3: milestone "1000 stars + first external contributor"
```

**验证：** 3 swimlanes 整齐，equidistant 下 Q1–Q4 均分，milestones 带 ★。

### Case 6: Historical eras (Roman / Medieval / Renaissance)

```
timeline "Europe 500 BC – 1700 AD"
config: scale = proportional

era -753 - -509: "Roman Kingdom"
era -509 - -27: "Roman Republic"
era -27 - 476: "Roman Empire (West)"
era 476 - 1000: "Early Middle Ages"
era 1000 - 1300: "High Middle Ages"
era 1300 - 1500: "Late Middle Ages"
era 1400 - 1600: "Renaissance"
era 1517 - 1648: "Reformation"

-753: milestone "Founding of Rome (legend)"
-44: milestone "Caesar assassinated"
476: milestone "Fall of Western Rome"
800: "Charlemagne crowned"
1066: milestone "Norman Conquest"
1215: "Magna Carta"
1347 - 1353: "Black Death"
1453: milestone "Fall of Constantinople"
1492: milestone "Columbus reaches Americas"
1517: "Luther's 95 Theses"
```

**验证：** BC 年份用负数正确渲染，era 背景带**允许重叠**（Renaissance 与 Late Middle Ages 交叠），overlap 采用不同 lane 在 axis 上方堆叠。

### Case 7: Proportional vs Equidistant comparison (same data)

```
# Test: same DSL, rendered twice with different scale
timeline "Covid milestones"
config: scale = proportional     # or equidistant

2019-12-01: "First cases Wuhan"
2020-01-30: "WHO PHEIC"
2020-03-11: milestone "WHO pandemic"
2020-12-11: milestone "First vaccine EUA"
2021-01-20: "Biden inauguration"
2023-05-05: milestone "WHO ends PHEIC"
```

**验证：** Proportional 下 2019-12 到 2020-03 贴近，2020-12 到 2023-05 大片空白；Equidistant 下所有事件均匀分布。两图并排在 docs 示例中。

### Case 8: Dense 50-event packing

生成 50 个 range event，随机重叠 0–5 个并发，无 track 声明 → 触发 auto-pack。

**验证：** `trackCount ≤ maxConcurrent`（区间图色数下界），无 overlap bar，label overflow 时触发 cascade。

### Case 9: Vertical orientation (mobile)

```
timeline "Company history"
config: orientation = vertical
config: scale = proportional

2018: "Founded in garage"
2019: milestone "Seed round $2M"
2020-03: "Pandemic pivot"
2021: milestone "Series A $15M"
2023: milestone "Series B $50M"
2025: "IPO"
```

**验证：** 轴从上到下，事件 marker 左右交替（teeth），移动端宽度下可读。

### Case 10: Single event edge case

```
timeline
2024-11-05: "Election day"
```

**验证：** 单事件不崩溃，canvas 尺寸合理，axis 显示单一 tick。

### Case 11: Icon + shape + color overrides

```
timeline "Custom styled timeline"

1969: milestone "Moon landing" [icon:🚀, color:#fb8c00]
1977: "Voyager launch" [shape:diamond, icon:🛰]
2012: "Curiosity on Mars" [shape:star, color:#d32f2f]
```

**验证：** 自定义 shape / color / icon 正确渲染，不被 theme 覆盖。

### Case 12: Note / annotation callout

```
timeline
1905: milestone "Annus Mirabilis"
  note: "4 breakthrough papers in a single year."
1915: milestone "General Relativity"
  note: "Published 'Die Feldgleichungen der Gravitation' — relativity of gravitation."
```

**验证：** Callout box 在 marker 右上方偏移，带 dashed connector line。

### Case 13: Relative date (Ma)

```
timeline "Human evolution"
config: scale = log
config: tickGranularity = Ma

7Ma: "Sahelanthropus"
4.4Ma: "Ardipithecus"
3.2Ma: "Lucy (Australopithecus afarensis)"
2.8Ma: milestone "Genus Homo emerges"
0.3Ma: "Homo sapiens"
0.07Ma: "Out of Africa"
0.012Ma: "Agriculture begins"
```

**验证：** Relative date 正确解析，log 轴处理 7Ma → 0.012Ma 的 3 个量级跨度。

### Case 14: Monochrome theme

Case 2（Einstein）的 monochrome 渲染：eras 使用 pattern 而非颜色，markers 全黑，ranges 不同灰度，print-ready。

### Case 15: Overlapping eras

```
timeline "Music eras"
era 1820 - 1910: "Romantic"
era 1890 - 1975: "Modernist"      # overlaps Romantic
era 1945 - 2000: "Postmodern"     # overlaps Modernist

1824: "Beethoven 9th"
1913: milestone "Rite of Spring"
1952: "4'33"
```

**验证：** Era 重叠时上下堆叠 band（每个 era 占 axis 上方独立子 lane），背景带依然画在 plot 底层但透明度叠加。

---

## 12. Implementation Plan

**Total: ~2 weeks (10 working days)**

| Phase | Days | 任务 |
|-------|------|------|
| 19.0 Parser | 3d | DSL lex + parse：config / era / track / event（point/range/milestone）+ note/properties；日期规范化（ISO / year / BC / Ma）；EBNF 测试 20+ |
| 19.1 Layout | 3d | 时间范围检测 + 3 种 scale（linear/log/equidistant）+ tick granularity 自动选择 + track auto-pack（greedy interval）+ label collision cascade |
| 19.2 Renderer | 3d | SVG 结构：axis + ticks + ranges + points + milestones + labels + eras + callouts；theme 集成；SVG builder 用 `src/core/svg.ts` |
| 19.3 Eras + Tracks | 2d | Era band 分层渲染（重叠堆叠）+ named swimlane + vertical orientation；icon 支持 |
| 19.4 Tests + polish | 1d | 15 个 test case 全部过，视觉回归用 preview HTML 对比 |

### 12.1 Types 添加（`src/core/types.ts`）

```ts
// Add to DiagramType:
| "timeline"

export type TimelineOrientation = "horizontal" | "vertical";
export type TimelineScale = "proportional" | "equidistant" | "log";
export type TimelineAxisPosition = "bottom" | "center" | "per-track";
export type TimelineEventShape = "circle" | "square" | "diamond" | "star" | "flag";

export interface TimelineDate {
  /** Parsed JS Date for comparison (or approximate for BC/Ma) */
  value: number;    // Unix ms, or negative for BC, or Ma-expressed as negative seconds
  /** Original raw string from DSL, for display fallback */
  raw: string;
  /** Precision: "day" | "month" | "year" | "decade" | "Ma" */
  precision: "day" | "month" | "year" | "decade" | "Ma";
}

export interface TimelineEvent {
  id: string;
  label: string;
  start: TimelineDate;
  end?: TimelineDate;                // undefined → point event
  kind: "point" | "range" | "milestone";
  trackId?: string;
  icon?: string;
  shape?: TimelineEventShape;
  color?: string;
  note?: string;
  category?: string;
}

export interface TimelineEra {
  id: string;
  label: string;
  start: TimelineDate;
  end: TimelineDate;
  color?: string;
}

export interface TimelineTrack {
  id: string;
  label: string;
}

export interface TimelineAST {
  type: "timeline";
  title?: string;
  orientation: TimelineOrientation;
  scale: TimelineScale;
  axis: TimelineAxisPosition;
  events: TimelineEvent[];
  eras: TimelineEra[];
  tracks: TimelineTrack[];                      // explicit; auto-pack fills in for un-tracked
  metadata?: Record<string, string>;
}
```

### 12.2 Plugin dir

```
src/diagrams/timeline/
├── index.ts          # DiagramPlugin
├── parser.ts         # DSL → TimelineAST (w/ date normalization)
├── dates.ts          # Date parsing utilities (ISO / year / BC / Ma / relative)
├── layout.ts         # Scale + track packing + collision avoidance
└── renderer.ts       # LayoutResult → SVG
```

---

## 13. Accessibility

- SVG 带 `<title>` + `<desc>`
- 每个 event marker 带 `<title>` 说明 `{label} @ {date}`
- 每个 era 带 `<title>` 说明 `{label} ({start}–{end})`
- Axis 带 `role="graphics-symbol"` + 语义标签
- ARIA: `role="graphics-document"` on root SVG
- 颜色不是唯一区分手段（milestones 除了 accent color 还有 ★ 形状；era 除了背景色 monochrome 模式还用 pattern）

---

## 14. Interaction Hooks (future)

保持静态输出原则，以下 hook 仅供消费者（MyMap / ChatDiagram）扩展用：

- `data-event-id` / `data-era-id` / `data-track-id` on elements
- `data-date` ISO 8601 attribute on markers for JS lookup
- CSS hover classes: `.st-event:hover` / `.st-era:hover` 由消费者定制
- 不内建 zoom / pan / tooltip —— 若需，在消费者层面加 JS 即可
- **不支持拖拽 / 编辑** —— 属于 Gantt / 编辑器范畴，超出本 standard

---

## 15. Coverage Matrix

| Feature | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 | C13 | C14 | C15 |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Horizontal layout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vertical layout | — | — | — | — | — | — | — | — | ✓ | — | — | — | — | — | — |
| Proportional scale | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Log scale | — | — | — | ✓ | — | — | — | — | — | — | — | — | ✓ | — | — |
| Equidistant | — | — | — | — | ✓ | — | ✓ | — | — | — | — | — | — | — | — |
| Point event | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| Range event | — | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — | — | — | — | ✓ | — |
| Milestone | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Era band | — | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — | ✓ | ✓ |
| Overlapping eras | — | — | — | — | — | ✓ | — | — | — | — | — | — | — | — | ✓ |
| Named tracks | — | ✓ | — | — | ✓ | — | — | — | — | — | — | — | — | ✓ | — |
| Auto-pack tracks | — | — | — | — | — | — | — | ✓ | — | — | — | — | — | — | — |
| BC dates | — | — | — | — | — | ✓ | — | — | — | — | — | — | — | — | — |
| Ma (geological) | — | — | — | ✓ | — | — | — | — | — | — | — | — | ✓ | — | — |
| Icon custom | — | ✓ | — | — | — | — | — | — | — | — | ✓ | — | — | — | — |
| Shape/color override | — | — | — | — | — | — | — | — | — | — | ✓ | — | — | — | — |
| Annotation callout | — | ✓ | — | — | — | — | — | — | — | — | — | ✓ | — | ✓ | — |
| Monochrome theme | — | — | — | — | — | — | — | — | — | — | — | — | — | ✓ | — |
| Label collision cascade | — | — | — | — | — | — | ✓ | ✓ | — | — | — | — | — | — | — |

**结论：** 15 个 test case 覆盖 orientation（horizontal / vertical）× scale（proportional / log / equidistant）× event kind（point / range / milestone）× structural（era / track / callout）× edge（single / dense / overlapping）所有组合，可驱动 parser + layout + renderer 的完整实现。

---

## 16. Open Questions / ⚠️ NEEDS VICTOR INPUT

### 16.1 Date parsing flexibility

**问题**：DSL 支持多严格的日期格式？
- **Option A**（严格）：仅 ISO 8601 + 纯年份 + BC 数字 + Ma 后缀。语法简单，错误信息明确。
- **Option B**（宽松）：接受 `"July 20, 1969"` / `"1969/07/20"` / `"Q3 2024"` / `"mid-1800s"`。用户体验友好，但需引入 date parser（仍零依赖，但实现复杂度 +1.5d）。

**推荐**：**A 为 v1，B 作为 v2**。v1 加上明确的错误提示指向 ISO。

**⚠️ NEEDS VICTOR INPUT**：确认 v1 只支持严格格式？

### 16.2 BC/AD 支持深度

**问题**：`-753` 表示公元前 753 年。但日期 arithmetic 在跨 BC/AD 边界（无公元 0 年）时有 off-by-one 风险。
- 需要严谨处理还是忽略该细节（对大多数用户无感）？

**推荐**：**忽略**（用 astronomical year numbering，公元前 1 年 = -1, 公元 1 年 = 1, 公元 0 年虚拟存在）。历史学家少数用户可能注意，但不影响视觉。

**⚠️ NEEDS VICTOR INPUT**：是否接受 astronomical year convention？

### 16.3 Interactive zoom（out of scope）

用户已明确：Schematex timeline 为**静态 SVG**，不做交互 zoom / pan。

**确认**：本 standard **不实现** zoom / pan / 可编辑 / 拖拽。若消费者（MyMap / ChatDiagram）需要，自行在 SVG 之上加 JS。Gantt 的交互性需求留给未来独立图表类型（若未来实现）。

### 16.4 Date range operator choice

DSL 使用 `start - end` 还是 `start .. end`？
- `-` 与 BC 日期的 `-753` 冲突 → 需要 tokenizer 区分
- `..` 清晰但 Mermaid 风格用户可能陌生

**推荐**：**两者都支持**，`..` 作为规范，`-` 作为兼容。

### 16.5 Icon 集成

Emoji icon 完全依赖系统字体渲染 → 跨平台视觉不一致。
- **Option A**：仅接受 emoji（Unicode），渲染由系统决定
- **Option B**：内建一个 named icon set（参考 Lucide / Feather，~50 个 inline SVG paths）—— 但违反 "手写一切、无依赖" 精神
- **Option C**：仅 emoji + 自定义 `[icon:url:...]` 指向外部 SVG（消费者注入）

**推荐**：**A**（emoji only in v1）。v2 可考虑 C。

**⚠️ NEEDS VICTOR INPUT**：v1 锁定 emoji-only？

---

**End of standard.** Implementation 开始前请对照 `../CoCEO/schematex/impl/19.0-timeline.md`（若不存在则创建），记录上述 Open Questions 的最终决策。
