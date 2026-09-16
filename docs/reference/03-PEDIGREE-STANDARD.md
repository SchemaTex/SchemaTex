# 03 — Pedigree Chart Standard Reference (Comprehensive)

*遗传学 pedigree chart 标准——追踪特定性状/疾病在家族中的遗传模式。*

> **References:**
> - Bennett, R.L. et al. (1995). Recommendations for standardized human pedigree nomenclature. *Am J Hum Genet*, 56(3), 745-752.
> - Bennett, R.L. et al. (2008). Standardized human pedigree nomenclature: Update and assessment. *J Genet Couns*, 17(5), 424-433.
> - **Bennett, R.L. (2022). The evolving pedigree: Updating to reflect modern family structures, sex, and gender.** *J Genet Couns*, 31(6), 1267-1275. ← 最新标准
> - NSGC (National Society of Genetic Counselors) pedigree standardization committee

---

## 1. Key Differences from Genogram

| 方面 | Genogram | Pedigree Chart |
|------|----------|---------------|
| 主要用途 | 家庭关系 + 医疗 + 心理 + 社工评估 | 纯遗传追踪（单一或少量 trait） |
| Condition 表示 | 多条件 fill patterns (22 categories) | 只有 affected/carrier/unaffected (1-3 traits) |
| 关系质量 | 有（emotional relationships 34 types） | 无（只有 mated/not mated） |
| 代标记 | 无 | Roman numeral (I, II, III...) |
| 个体标记 | 名字 + birth year | Generation-number (II-3) + optional name |
| Proband | 无（有 Index Person） | 有（箭头指向 index case，P 标记） |
| Consultand | 无 | 有（箭头 + C 标记） |
| Consanguinity | 可选标注 | 关键信息（双线，必须标注） |
| Sex vs Gender | 传统 binary | Bennett 2022: sex ≠ gender，diamond for unknown/DSD |
| 关系表示 | 详细（divorce, separation, cohabitation） | 简化（mated line, no longer together, consanguinity） |

---

## 2. Individual Symbols

### 2.1 Core Shapes (Bennett 2022 Updated)

| Symbol | Shape | 含义 | DSL |
|--------|-------|------|-----|
| □ | Square | AMAB (Assigned Male at Birth) | `[male]` or `[amab]` |
| ○ | Circle | AFAB (Assigned Female at Birth) | `[female]` or `[afab]` |
| ◇ | Diamond | UAAB (Unknown/Ambiguous at Birth) / DSD / Non-disclosed | `[unknown]` or `[uaab]` |

**Bennett 2022 重要更新：**
- Square/Circle 现在正式代表 **assigned sex at birth**，不是 gender identity
- Diamond 用于：sex unknown, differences of sex development (DSD/intersex), non-disclosed, or still in utero (sex unknown)
- Gender identity 如果与 assigned sex 不同，用 label 标注（不改变 shape）
- 例：transgender woman (AMAB) → square shape + "TW" label or gender annotation

### 2.2 Affected Status

| Status | Fill Pattern | SVG | DSL |
|--------|-------------|-----|-----|
| Unaffected | Empty (white fill) | `fill: white` | (default) |
| Affected (single trait) | Full fill (black/dark) | `fill: #333` | `[affected]` |
| Carrier (autosomal) | Key-defined diagonal hatch fill | SVG `<pattern>` rotated 45° | `[carrier]` |
| Carrier (X-linked) | Key-defined diagonal hatch fill | Same SVG hatch pattern | `[carrier-x]` |
| Obligate carrier | Key-defined diagonal hatch fill | Same SVG hatch pattern | `[obligate-carrier]` |
| Asymptomatic/presymptomatic | Vertical line from edge to edge | `<line>` through center, spanning the full symbol height | `[presymptomatic]` |
| Multiple traits | Quadrant fill (like genogram) | See below | `[affected: trait1 + trait2]` |

Carrier 填充依据 NSGC Bennett 2022 §4.5：用 key 定义填充含义；Schematex 对 `carrier`、`carrier-x` 和 `obligate-carrier` 统一绘制 diagonal hatch，并在 key 中分别标明状态。

**多 trait pedigree（最多 4 traits）：**
```
# Legend defines what each quadrant means
pedigree "Breast/Ovarian Cancer Family"
  legend: trait1 = "Breast cancer" (fill: quad-tl)
  legend: trait2 = "Ovarian cancer" (fill: quad-tr)
  legend: trait3 = "Prostate cancer" (fill: quad-bl)

  I-1 [male, affected: trait3]         # bottom-left quadrant filled
  I-2 [female, affected: trait1]       # top-left quadrant filled
  II-3 [female, affected: trait1+trait2]  # top-left + top-right filled
```

### 2.3 Life Status Symbols

| Status | Visual | SVG | DSL |
|--------|--------|-----|-----|
| Alive | Normal shape | Default rendering | (default) |
| Deceased | Diagonal slash through shape (/) | Single `<line>` top-right to bottom-left | `[deceased]` |
| Stillborn (SB) | Sex shape + deceased slash + SB text | Normal-size shape + diagonal `<line>` + label "SB" | `[stillborn]` |
| Pregnancy (P) | P inside the sex shape (diamond if unknown) | Centered "P" text inside shape | `[pregnancy]` |
| Spontaneous abortion (SAB) | Small triangle + SAB label | `<polygon>` + text | `[sab]` |
| Induced abortion (TAB) | Small triangle with diagonal termination slash | `<polygon>` + `<line>` | `[tab]` |
| Ectopic pregnancy (ECT) | Small triangle + diagonal termination slash + ECT label | `<polygon>` + `<line>` + text | `[ectopic]` |
| Affected SAB | Filled small triangle | `<polygon>` filled | `[sab, affected]` |

**Bennett 2022 注意：** 
- Deceased 标记从传统的 "X through shape" 更新为 "diagonal slash (/)"，与 genogram 的 X 标记不同
- 这是 pedigree 与 genogram 的重要视觉区别

### 2.4 Special Markers

| Marker | Symbol | 位置 | DSL |
|--------|--------|------|-----|
| Proband | Arrow (↗) pointing to shape + "P" | 左下方 | `[proband]` |
| Consultand | Arrow (↗) pointing to shape + "C" | 左下方 | `[consultand]` |
| Evaluated | "E" above or inside shape | 上方 | `[evaluated]` |

这三个是全部的 special marker。方括号里出现 parser 不认识的词，会报 `Unknown property` 并拒绝整张图，不会静默忽略。

### 2.5 Assisted Reproduction (Bennett 2022)

`donor-egg`、`donor-sperm`、`donor-embryo` 标在孩子身上，记录这是一次借助捐赠配子的生育。它们不指认捐赠者、也不建立遗传亲子关系——引擎不会凭空画出一个捐赠者节点或一条连线。lint 结果里会出现 `PEDIGREE_DONOR_LINK_UNSPECIFIED` 提示这一点。

| Type | Meaning | DSL |
|------|---------|-----|
| Donor egg | 孩子由捐赠卵子受孕 | `[donor-egg]` |
| Donor sperm | 孩子由捐赠精子受孕 | `[donor-sperm]` |
| Donor embryo | 孩子由捐赠胚胎受孕 | `[donor-embryo]` |

---

## 3. Relationship Lines (Pedigree-Specific)

Pedigree 的关系线比 genogram **简单得多**——没有 emotional relationships，只有遗传学相关的结构线。

### 3.1 Partnership Lines

| Type | Line Style | DSL | 含义 |
|------|-----------|-----|------|
| Mated (together) | Single horizontal solid line | `A -- B` | 有后代的配偶 |
| Mated (no longer together) | Continuous line + two diagonal slashes | `A -/- B` | 分开（不区分 divorce/separation） |
| Consanguinity | Double horizontal line | `A == B` | 近亲婚配（遗传学关键！） |
| Relationship line (no offspring) | Single horizontal dashed | `A ~ B` | 配偶但无后代 |

### 3.2 Parent-Child Lines

同一对父母下，同一 zygosity 的 `twin-mz` / `twin-dz` 必须**正好标两个人**才能配成一对。layout 会把这一对排到相邻位置，即使 DSL 里两人中间还声明了别的兄弟姐妹。只标了一个人、或同一组标了三个以上，都是 error——引擎不会在几种可能的配对里替你猜一个。三胞胎及以上没有对应写法。

| Type | Line | DSL |
|------|------|-----|
| Biological | Solid vertical | (default) |
| Identical twins | Meet at a single point, **with a horizontal bar joining the two sibling lines** | `[twin-mz]` (monozygotic) |
| Fraternal twins | Meet at a single point, **no bar** | `[twin-dz]` (dizygotic) |

---

## 4. Generation and Individual Labeling

### 4.1 Generation Labels
- 左侧显示 Roman numeral（I, II, III, IV...）
- I = 最年长的一代
- 对齐到该代的中心 Y 坐标
- Font: bold, 14px, class="schematex-generation-label"

### 4.2 Individual Labels
- 每代内从左到右编号：1, 2, 3...
- 完整标识：`II-3` = 第二代第 3 个人
- 显示在 shape 下方
- Proband 和 consultand 额外有箭头标记

### 4.3 Legend (Auto-Derived; Trait Legend Required for Multi-Trait Pedigrees)

Pedigree uses the unified legend system (see [`LEGEND-SYSTEM.md`](./LEGEND-SYSTEM.md)). It is **on by default**, mode `auto` — emits no legend when nothing non-trivial varies.

**Auto-derived sections:**

| Section | Items emitted | Source |
|---|---|---|
| `status` | one row per used genetic status | `individual.geneticStatus` ∈ {`affected`, `carrier`, `carrier-x`, `obligate-carrier`, `presymptomatic`} (`unaffected` dropped — universal default) |
| `traits` | one row per legacy trait | the legacy `legend: id = "Label" (fill: ...)` directive — feeds explicit multi-trait charts |
| `symbols` | deceased slash, proband (P), consultand (C), non-obvious sex shapes | only when used |

Standard McGoldrick conventions everyone reads at a glance — square=Male, circle=Female, ── = married, │ = parent-child — are excluded by default. The legend remains *signal* of the chart's unique encoding.

**Legacy trait DSL still works** for explicit multi-trait pedigrees:

```dsl
pedigree "BRCA Family"
  legend: brca1 = "BRCA1 (breast)" (fill: quad-tl)
  legend: brca2 = "BRCA2 (ovarian)" (fill: quad-tr)
  ...
```

**New unified DSL overrides** also available:

```dsl
pedigree "..."
  legend: off                           # disable
  legend.position: bottom-right          # corner overlay
  legend.label status.affected: "..."   # rename
  legend.hide: status.carrier-x          # hide a row
```

Row keys:

| Item type | Key format | Example |
|---|---|---|
| Genetic status | `status.<status>` | `status.affected`, `status.carrier` |
| Trait (legacy) | the trait id | `brca1`, `cf` |
| Marker | `marker.<id>` | `marker.proband`, `marker.consultand` |
| Status overlay | `status.deceased` | (only when present) |

---

## 5. Layout Rules

与 genogram 共享大部分布局逻辑（generation alignment, male-left, children ordering），区别：

### 5.1 Pedigree-Specific Layout
1. **Generation label 列：** 左侧留出 40px 列宽显示 Roman numeral
2. **Individual numbering：** Shape 下方显示 "II-3" 格式的标识
3. **No emotional lines：** 不需要 emotional relationship routing
4. **Consanguinity emphasis：** 双线要明显可见，因为这是遗传学的关键信息
5. **Proband / consultand arrow：** 从左下 45° 指向实际 shape 轮廓，尖端留出 3px；总长 24px，箭头头部 6×5px，直接绘制 shaft + triangle，避免 SVG marker 的缩放和方向差异。P/C 标签在尾部左侧；长名字与箭头相交时下移至独立一行。图例显示相同方向的箭头。
6. **Legend box：** 右下角或底部，包含 trait 说明

### 5.2 Spacing (Pedigree-Specific Adjustments)

| Parameter | Default | 与 Genogram 差异 |
|-----------|---------|-----------------|
| Left margin (for gen labels) | 50px | Genogram 无此需求 |
| Node width | 40px | 同 |
| Node height | 40px | 同 |
| Generation spacing | 100px | 略小于 genogram (120px)，因为无 emotional lines |
| Sibling spacing | 50px | 略小于 genogram (60px) |
| Legend box width | 150px | Genogram 无此需求 |
| Legend box height | auto (based on traits) | — |

---

## 6. DSL Grammar (Pedigree — Expanded)

```ebnf
document       = header legend_def* statement*
header         = "pedigree" (":" MODE)? quoted_string? NEWLINE

legend_def     = "legend:" IDENTIFIER "=" quoted_string legend_fill? NEWLINE
legend_fill    = "(" "fill:" FILL_SPEC ")"
FILL_SPEC      = "full" | "quad-tl" | "quad-tr" | "quad-bl" | "quad-br"
               | "half-left" | "half-right" | "striped" | "dotted"

statement      = comment | individual_def | couple_def

individual_def = ID properties? NEWLINE
properties     = "[" property ("," property)* "]"
property       = sex_prop | status_prop | genetic_prop | special_prop | kv_prop

sex_prop       = "male" | "female" | "unknown" | "amab" | "afab" | "uaab"
status_prop    = "deceased" | "stillborn" | "pregnancy"
               | "sab" | "tab" | "ectopic"
genetic_prop   = "affected" | "carrier" | "carrier-x" | "obligate-carrier"
               | "presymptomatic" | "unaffected"
               | "affected:" trait_list
trait_list     = IDENTIFIER ("+" IDENTIFIER)*
special_prop   = "proband" | "consultand" | "evaluated"
               | "donor-egg" | "donor-sperm" | "donor-embryo"
               | "twin-mz" | "twin-dz"

couple_def     = ID couple_op ID couple_label? NEWLINE (INDENT child+ DEDENT)?
couple_op      = "--" | "==" | "-/-" | "~"
couple_label   = "[" kv_prop "]"
child          = individual_def

comment        = ("#" | "//" | "%%") [^\n]* NEWLINE

ID             = /[a-zA-Z][a-zA-Z0-9_-]*/
IDENTIFIER     = /[a-zA-Z][a-zA-Z0-9_-]*/
VALUE          = /[^\],\n]+/
quoted_string  = '"' /[^"]*/ '"'
INDENT         = increase in leading whitespace (2+ spaces)
DEDENT         = decrease in leading whitespace
NEWLINE        = /\n/
```

---

## 7. Test Cases

### Case 1: Autosomal Recessive (Cystic Fibrosis)
```
pedigree "Cystic Fibrosis Family"
  I-1 [male, carrier]
  I-2 [female, carrier]
  I-1 -- I-2
    II-1 [male, unaffected]
    II-2 [female, carrier]
    II-3 [male, affected, proband]
    II-4 [female, unaffected]
```
验证：I-1/I-2 使用 key 中定义的 diagonal hatch fill (carrier)，II-3 full-filled + proband arrow，左侧有 "I" "II" 标记。

### Case 2: Consanguinity
```
pedigree "Consanguineous Marriage"
  I-1 [male, carrier]
  I-2 [female, unaffected]
  I-1 -- I-2
    II-1 [male, carrier]
    II-2 [female, unaffected]
  I-3 [male, unaffected]
  I-4 [female, carrier]
  I-3 -- I-4
    II-3 [female, carrier]
  II-1 == II-3
    III-1 [male, affected, proband]
```
验证：II-1 和 II-3 之间是双线（consanguinity），III-1 full-filled + proband arrow。

### Case 3: X-Linked Recessive (Hemophilia)
```
pedigree "Hemophilia A"
  I-1 [male, unaffected]
  I-2 [female, carrier-x]
  I-1 -- I-2
    II-1 [male, affected]
    II-2 [female, carrier-x]
    II-3 [male, unaffected]
    II-4 [female, unaffected]
  II-2 -- II-5 [male, unaffected]
    III-1 [male, affected]
    III-2 [female, carrier-x]
    III-3 [male, unaffected]
```
验证：carrier-x females 使用 key 中定义的 diagonal hatch fill，affected males full-filled。

### Case 4: Multi-Trait Pedigree
```
pedigree "Cancer Family Syndrome"
  legend: breast = "Breast cancer" (fill: quad-tl)
  legend: ovarian = "Ovarian cancer" (fill: quad-tr)
  legend: prostate = "Prostate cancer" (fill: quad-bl)
  legend: colon = "Colon cancer" (fill: quad-br)

  I-1 [male, affected: prostate, deceased]
  I-2 [female, affected: breast, deceased]
  I-1 -- I-2
    II-1 [female, affected: breast+ovarian]
    II-2 [male, unaffected]
    II-3 [female, unaffected, evaluated]
  II-1 -- II-4 [male, unaffected]
    III-1 [female, unaffected, proband]
    III-2 [male, unaffected]
```
验证：legend box 显示 4 个 trait 对应的 quadrant fill，I-1 有 quad-bl filled，II-1 有 quad-tl + quad-tr filled，III-1 有 proband arrow。

### Case 5: Modern Family (Bennett 2022 — Assisted Reproduction)
```
pedigree "Donor Conception"
  I-1 [male]
  I-2 [female]
  I-1 -- I-2
    II-1 [female]
  
  donor [male, donor-sperm]
  II-1 -- II-2 [male]
    III-1 [female, proband]
```
验证：donor-sperm 标注在 donor 到 child 的连接线上，donor node 可选显示。

### Case 6: Pregnancy / Loss
```
pedigree "Reproductive History"
  I-1 [male]
  I-2 [female]
  I-1 -- I-2
    II-1 [male]
    II-2 [female, sab]
    II-3 [male, stillborn]
    II-4 [female, pregnancy]
    II-5 [female]
```
验证：II-2 是小三角 (SAB)，II-3 是小 shape + SB label + deceased slash，II-4 是 diamond/shape with "P"。

### Case 7: Large Pedigree (5 Generations)
```
pedigree "Huntington Disease"
  I-1 [male, affected, deceased]
  I-2 [female, deceased]
  I-1 -- I-2
    II-1 [male, affected, deceased]
    II-2 [female, unaffected]
    II-3 [male, unaffected, deceased]
  II-1 -- II-4 [female, unaffected]
    III-1 [female, affected]
    III-2 [male, presymptomatic]
    III-3 [female, unaffected]
  III-1 -- III-4 [male, unaffected]
    IV-1 [male, presymptomatic, proband]
    IV-2 [female, unaffected]
  III-3 -- III-5 [male, unaffected]
    IV-3 [male, unaffected]
    IV-4 [female, unaffected]
  IV-1 -- IV-5 [female, unaffected]
    V-1 [unknown, pregnancy]
```
验证：5 代 Roman numeral 标记（I-V），presymptomatic 有 vertical line 标记，V-1 是 pregnancy diamond。

---

## 8. Implementation Priority

| Priority | Feature | Complexity |
|----------|---------|------------|
| P0 (Phase 2.1) | Basic pedigree layout reusing genogram engine + Roman numeral labels + individual numbering | Medium |
| P0 | Affected/carrier/unaffected fill + proband arrow | Low |
| P1 | Consanguinity double line (already in genogram, but critical for pedigree) | Low |
| P1 | Deceased slash (/ not X), SAB/TAB/stillborn symbols | Medium |
| P1 | Legend box rendering | Medium |
| P2 | Multi-trait quadrant fill system | Medium |
| P2 | X-linked carrier key-defined hatch fill | Low |
| P2 | Bennett 2022 sex/gender annotation | Low |
| P2 | Assisted reproduction symbols (donor, surrogate) | Medium |
| P3 | Presymptomatic vertical line marker | Low |
| P3 | Adopted in/out bracket notation | Low |
