# 01 — Genogram Standard Reference (Comprehensive)

*McGoldrick et al. (2020) 符号系统 + GenoPro emotional taxonomy + Bennett 2022 gender inclusivity + 临床医疗条件系统 + Cultural Heritage genogram 支持。*

> **Primary References:**
> - McGoldrick, M., Gerson, R., & Petry, S. (2020). *Genograms: Assessment and Treatment.* 4th ed.
> - Bennett, R.L. et al. (2022). *Standardized human pedigree nomenclature: Update and assessment of the recommendations of the National Society of Genetic Counselors.* J Genet Couns.
> - Hardy, K.V. & Laszloffy, T.A. (1995). The cultural genogram: Key to training culturally competent family therapists. *J Marital Fam Ther*, 21(3), 227-237.
> - GenoPro symbol reference: https://genopro.com/genogram/
> - GenogramAI symbol catalog (~150 symbols): https://genogramai.com

---

## 1. Individual Symbols

### 1.1 Core Shapes

| Symbol | Shape | SVG Element | 含义 |
|--------|-------|-------------|------|
| □ | Square (40×40) | `<rect>` | Male |
| ○ | Circle (r=20) | `<circle>` | Female |
| ◇ | Diamond (40×40) | `<polygon>` | Unknown sex / Nonbinary (Bennett 2022) |
| △ | Triangle (small, 20×20) | `<polygon>` | Pregnancy (current) |
| Concentric shape | Double outline (gap=3px) | Two shapes, inner + outer | Index Person (IP) / Identified Patient |

### 1.2 Status Modifiers

| Status | Visual | SVG Implementation |
|--------|--------|-------------------|
| Deceased | X through shape, corner to corner | Two `<line>` elements crossing shape |
| Stillborn | 50% size shape + SB label | Scaled shape with text |
| Miscarriage | Small triangle (△, 12×12) | `<polygon>` small |
| Spontaneous abortion | Small × (12×12) | Two short `<line>` elements |
| Induced abortion | Small × with horizontal line through | `<line>` elements + cross bar |
| Pregnancy | Dashed outline | `stroke-dasharray="4,3"` on shape |

### 1.3 Bennett 2022 Gender/Sex Inclusivity Update

Bennett 2022 引入了 sex 与 gender 分离的符号系统，Lineage 必须支持：

| Notation | 含义 | Visual |
|----------|------|--------|
| AMAB | Assigned Male at Birth | Square (传统 male symbol) |
| AFAB | Assigned Female at Birth | Circle (传统 female symbol) |
| UAAB | Unknown/Ambiguous at Birth / Intersex | Diamond |
| Nonbinary | Gender identity = nonbinary | Diamond + optional gender label |
| Transgender | Gender ≠ assigned sex | Shape = assigned sex, label indicates gender identity |

**DSL 表示：**
```
alex [nonbinary, 1995]           # → diamond
sam [male, transgender, 1988]    # → square (AMAB) + transgender marker
jordan [intersex, 1990]          # → diamond (UAAB)
```

**实现规则：**
- `sex` property 控制 shape（male→□, female→○, unknown/nonbinary/intersex→◇）
- `transgender` property 添加一个小三角标记在 shape 角落
- `gender` property 可选，用于 label 显示

### 1.4 Multiple Births

| Type | Visual | DSL |
|------|--------|-----|
| Identical twins | V-shape: two child lines meet at single point on sibship line | `[twin-identical]` |
| Fraternal twins | Inverted-V with horizontal bar connecting at top | `[twin-fraternal]` |
| Triplets+ | Same pattern, 3+ lines from single point or bar | `[triplet-identical]` / `[triplet-fraternal]` |

### 1.5 SVG Implementation Notes

- All shapes: `stroke-width: 2`, `fill: white` (default), `stroke: #333`
- CSS classes: `lineage-node`, `lineage-male`, `lineage-female`, `lineage-unknown`, `lineage-nonbinary`
- Deceased overlay: `class="lineage-deceased-marker"`
- Index person: outer shape `stroke-width: 1`, inner shape `stroke-width: 2`, gap 3px
- Data attributes: `data-individual-id`, `data-sex`, `data-status`, `data-generation`

---

## 2. Medical/Psychological Condition System

### 2.1 Condition Display: Quadrant Fill System

Conditions 通过填充 individual shape 的不同区域来表示。最多同时显示 4 个条件（quadrant system），超过 4 个时切换到 radial pie display 或 legend 系统。

| Fill Position | Quadrant | SVG Implementation |
|---------------|----------|-------------------|
| Full fill | 整个 shape | `fill: {color}` |
| Top-left quarter | 左上 1/4 | `<clipPath>` top-left quadrant |
| Top-right quarter | 右上 1/4 | `<clipPath>` top-right quadrant |
| Bottom-left quarter | 左下 1/4 | `<clipPath>` bottom-left quadrant |
| Bottom-right quarter | 右下 1/4 | `<clipPath>` bottom-right quadrant |
| Half-left | 左半 | `<clipPath>` left half |
| Half-right | 右半 | `<clipPath>` right half |
| Half-top | 上半 | `<clipPath>` top half |
| Half-bottom | 下半 | `<clipPath>` bottom half |
| Striped/hatched | 斜线填充 | `<pattern>` diagonal lines |
| Dotted | 点状填充 | `<pattern>` dots |

**多条件叠加规则：**
1. 1 条件 → full fill 或 half fill
2. 2 条件 → left half + right half
3. 3 条件 → top-left + top-right + bottom half
4. 4 条件 → 四个 quadrant
5. 5+ 条件 → radial pie（等分扇形）or numbered legend
6. Carrier (无症状) → striped/hatched pattern，不占 quadrant

### 2.2 Standard Medical Condition Categories (22 Categories)

基于 GenogramAI + 临床实践的标准颜色编码系统。每个 category 有推荐颜色，用户可自定义。

| Category | Default Color | Hex | 常见疾病 |
|----------|--------------|-----|---------|
| Cardiovascular | Red | `#E53935` | Heart disease, hypertension, stroke, CHF |
| Cancer | Dark Blue | `#1E88E5` | All malignancies (可按类型细分) |
| Diabetes | Orange | `#FB8C00` | Type 1, Type 2, gestational |
| Mental Health (General) | Purple | `#8E24AA` | Schizophrenia, psychosis, other |
| Depression | Indigo | `#5C6BC0` | Major depressive disorder, dysthymia |
| Anxiety | Teal | `#26A69A` | GAD, panic disorder, phobias, OCD |
| Bipolar | Violet | `#AB47BC` | Bipolar I, Bipolar II |
| PTSD | Dark Teal | `#00897B` | Post-traumatic stress disorder |
| Substance Abuse (Alcohol) | Amber | `#FFB300` | Alcohol use disorder |
| Substance Abuse (Drugs) | Deep Orange | `#F4511E` | Drug use disorder (opioids, stimulants, etc.) |
| Substance Abuse (Tobacco) | Brown | `#795548` | Nicotine dependence |
| Neurological | Gray-Blue | `#546E7A` | Alzheimer's, Parkinson's, epilepsy, MS |
| Respiratory | Light Blue | `#42A5F5` | Asthma, COPD, cystic fibrosis |
| Autoimmune | Pink | `#EC407A` | Lupus, rheumatoid arthritis, Crohn's |
| Genetic/Chromosomal | Dark Green | `#2E7D32` | Down syndrome, sickle cell, Huntington's |
| Reproductive | Rose | `#F48FB1` | Infertility, PCOS, endometriosis |
| Eating Disorders | Light Purple | `#CE93D8` | Anorexia, bulimia, BED |
| Learning/Developmental | Lime | `#9CCC65` | ADHD, autism spectrum, dyslexia |
| Kidney/Urological | Olive | `#827717` | CKD, kidney stones |
| Liver/GI | Yellow-Green | `#C0CA33` | Hepatitis, cirrhosis, IBD |
| Obesity | Dark Amber | `#FF8F00` | BMI ≥ 30 |
| Other/Custom | Gray | `#757575` | Any unlisted condition |

### 2.3 Condition SVG Defs

每个使用的 condition 需要在 `<defs>` 中定义对应的 `<clipPath>` 和可选 `<pattern>`：

```xml
<defs>
  <!-- Quadrant clip paths for squares (40×40) -->
  <clipPath id="quad-tl-rect"><rect x="0" y="0" width="20" height="20"/></clipPath>
  <clipPath id="quad-tr-rect"><rect x="20" y="0" width="20" height="20"/></clipPath>
  <clipPath id="quad-bl-rect"><rect x="0" y="20" width="20" height="20"/></clipPath>
  <clipPath id="quad-br-rect"><rect x="20" y="20" width="20" height="20"/></clipPath>
  <clipPath id="half-left-rect"><rect x="0" y="0" width="20" height="40"/></clipPath>
  <clipPath id="half-right-rect"><rect x="20" y="0" width="20" height="40"/></clipPath>
  <clipPath id="half-top-rect"><rect x="0" y="0" width="40" height="20"/></clipPath>
  <clipPath id="half-bottom-rect"><rect x="0" y="20" width="40" height="20"/></clipPath>

  <!-- Quadrant clip paths for circles (r=20) -->
  <!-- Use rect clips centered at circle center, intersected with circle -->

  <!-- Carrier pattern (diagonal stripes) -->
  <pattern id="carrier-stripe" patternUnits="userSpaceOnUse" width="6" height="6">
    <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#333" stroke-width="1"/>
  </pattern>

  <!-- Dotted pattern -->
  <pattern id="dotted" patternUnits="userSpaceOnUse" width="6" height="6">
    <circle cx="3" cy="3" r="1" fill="#333"/>
  </pattern>
</defs>
```

### 2.4 DSL Syntax for Conditions

```
# 单条件
father [male, 1945, conditions: heart-disease(full, #E53935)]

# 多条件（自动分配 quadrant）
mother [female, 1948, conditions: diabetes + cancer + anxiety]

# 指定 fill position + color
uncle [male, 1950, conditions: heart-disease(half-left, #E53935) + diabetes(half-right, #FB8C00)]

# Carrier（无症状）
son [male, 1975, conditions: diabetes(carrier)]

# 使用 category shorthand
daughter [female, 1978, conditions: cardiovascular + mental-health]
```

**解析规则：**
- 没有指定 fill position 时，自动按条件数量分配（见 2.1 叠加规则）
- 没有指定 color 时，使用 category 默认颜色
- `carrier` fill → striped pattern
- Category shorthand（如 `cardiovascular`）映射到默认颜色
- 自定义条件名（不在标准 category 中）使用 gray 默认色

---

## 2B. Cultural/Heritage Genogram (Ethnicity Color System)

Cultural genogram（Hardy & Laszloffy, 1995）使用**与医疗 genogram 相同的 shape + fill 机制**，但颜色含义不同——表示**种族/文化/民族背景**而非医疗条件。

这是社工领域的重要变体，用于多元文化评估。

### 2B.1 Heritage Color Coding

每种文化背景对应一个颜色。用户通过 `legend` 自定义映射（没有固定标准，因文化背景因地而异）：

```
genogram "Anna Maria's Heritage"
  legend: colombian = "Colombian" (#9C27B0)
  legend: dominican = "Dominican Republic" (#FFEB3B)
  legend: french = "French" (#1565C0)
  legend: greek = "Greek" (#80DEEA)
  legend: irish = "Irish" (#4CAF50)
  legend: italian = "Italian" (#E91E63)
  legend: puerto-rican = "Puerto Rican" (#FF9800)
```

### 2B.2 Mixed Heritage Display

当一个人有多种文化背景时，使用**与医疗条件相同的 quadrant/half fill 系统**：

```
# 单一背景 → full fill
jose [male, heritage: colombian]

# 双重背景 → half-left + half-right
anna-maria [female, heritage: puerto-rican + italian]

# 三重背景 → quadrant fill
child [male, heritage: irish + italian + french]
```

**渲染机制完全复用 Section 2.1 的 quadrant fill system**，只是颜色来源不同（heritage legend vs. medical category）。

### 2B.3 Heritage vs. Medical Conditions

一个 genogram 可以**同时**展示 heritage 和 medical conditions，但不能在同一个 shape 上混用（会视觉冲突）。解决方案：

1. **分层展示：** heritage 用 shape fill color，medical conditions 用 shape border 上的小标记（dots/icons）
2. **模式切换：** DSL header 声明 `genogram [mode: heritage]` 或 `genogram [mode: medical]`，渲染器据此决定 fill 含义
3. **推荐：** 默认 mode=medical（最常见），heritage mode 需显式声明

### 2B.4 DSL Syntax

```
genogram "Heritage Example" [mode: heritage]
  legend: colombian = "Colombian" (#9C27B0)
  legend: irish = "Irish" (#4CAF50)
  
  father [male, 1960, heritage: colombian]
  mother [female, 1962, heritage: irish]
  father -- mother
    child [female, 1990, heritage: colombian + irish]
```

---

## 2C. Label & Annotation System

基于真实 genogram 使用场景（临床评估、教学案例、案例展示），individual nodes 需要丰富的标注系统。

### 2C.1 In-Shape Display

**Age number 显示在 shape 内部**（常见于临床展示型 genogram）：

| Display | 位置 | DSL | 含义 |
|---------|------|-----|------|
| Age number | Shape 中心 | `[age: 57]` or auto-calculated from birth year | 当前年龄或去世时年龄 |
| Initials | Shape 中心 | `[initials: "JG"]` | 名字缩写 |

**实现：**
- Age/initials 作为 `<text>` 渲染在 shape 中心
- Font: bold, 12-14px, class="lineage-in-shape-text"
- 如果同时有 condition fill，text 颜色自动调整为白色（深色 fill 时）或黑色（浅色/无 fill 时）
- DSL 中 `age` 可以省略——如果有 birth year，renderer 可自动计算

### 2C.2 Below-Shape Labels

**标准 label 位置（shape 下方），支持多行：**

| Line | 内容 | 示例 |
|------|------|------|
| Line 1 | Name (required) | "Ross" |
| Line 2 | Birth/death years | "(1966)" or "(1930-2020)" |
| Line 3+ | Annotations | "Paleontologist", "Smoking", "Diabetes" |

### 2C.3 Rich Annotations

Individual 可以附加多行文字注释，用于临床评估记录：

```
ross [male, 1966, label: "Ross"]
  @occupation: "Paleontologist, College Professor"
  @traits: "Geeky, Quirky"  
  @notes: "Golden Child/Favorite"
```

**或 inline 简化语法：**
```
ross [male, 1966, occupation: "Professor", notes: "Golden Child"]
```

**渲染：**
- Annotations 显示在 name + year 下方
- Font: italic, 10px, class="lineage-annotation"  
- 最多显示 3 行 annotation，超出部分 truncate + tooltip
- 可通过 render config 控制是否显示 annotations

### 2C.4 Relationship Labels on Lines

Couple 和 emotional relationship lines 可以附加文字标签：

```
jack -- judy [label: "Married 35 yrs"]
ross -close- monica [label: "Competitive"]
ross -hostile- rachel [label: "On and off"]
```

**渲染：**
- Label 显示在 line 中点上方（couple lines）或沿着 line（emotional lines）
- Font: 10px, class="lineage-edge-label"
- 背景色：white with slight opacity，避免与 line 混淆

---

## 2D. In-Law & Extended Family Notation

### 2D.1 In-Law Relationships

In-law（姻亲）关系通过 marriage 自动推导，不需要单独的 relationship type。但在 label 显示时需要标注：

| Relationship | 如何标注 | 说明 |
|-------------|---------|------|
| Father-in-law / Mother-in-law | 通过 spouse 的 parent 自动推导 | 不需要额外 DSL |
| Brother-in-law / Sister-in-law | 通过 spouse 的 sibling 自动推导 | 不需要额外 DSL |
| Son-in-law / Daughter-in-law | 通过 child 的 spouse 自动推导 | 不需要额外 DSL |

**显示可选：** Renderer 可以在 label 中显示 in-law relationship（如 "Brother-in-law"），通过 render config `showInLawLabels: true` 控制。

### 2D.2 Non-Family Members in Genogram

有些 genogram 包含非家庭成员（如 therapist, friend, mentor），这些人的 shape 通常用**虚线边框**表示：

```
therapist [other, label: "Dr. Smith", external: true]
ross -close- therapist
```

- `external: true` → dashed border on shape
- 不参与 generation alignment（浮动定位在相关 individual 附近）

---

## 2E. Legend Box

复杂 genogram 必须包含 legend box 解释颜色/符号含义。

### 2E.1 Auto-Generated Legend

Renderer 自动生成 legend，包含图中实际使用的：
- Condition categories + 对应颜色
- Heritage colors (if heritage mode)
- Emotional relationship line styles
- Special symbols (adopted, foster, deceased, etc.)

### 2E.2 Legend Positioning

| Position | 何时使用 |
|----------|---------|
| Bottom-right (default) | 大多数情况 |
| Right side | 图表较宽时 |
| Bottom center | 图表较高时 |
| External (separate SVG group) | 嵌入到网页时可单独定位 |

### 2E.3 DSL

```
genogram "Family Study" [legend: bottom-right]
  # ... individuals and relationships ...
```

Legend 内容自动从图中使用的 conditions/heritage/relationships 推导，不需要手动指定每一项。但 `legend:` 定义（见 2B.1）可覆盖自动推导的颜色/标签。

---

## 3. Relationship Lines

### 3.1 Couple/Partnership Relationships

| Relationship | Line Style | DSL Syntax | SVG |
|-------------|-----------|------------|-----|
| Marriage | Solid horizontal line | `A -- B` | `<line>` stroke-width: 2 |
| Cohabitation/LTR | Dashed line | `A ~ B` | stroke-dasharray="6,4" |
| Engagement | Solid + small diamond midpoint | `A -o- B` | line + small diamond marker |
| Separation | Solid + single slash | `A -/- B` | line + one diagonal slash |
| Divorce | Solid + double slash | `A -x- B` | line + two diagonal slashes |
| Consanguinity | Double horizontal line | `A == B` | Two parallel lines, gap 4px |
| Remarriage | New marriage line from same person | Second `A -- C` | Additional horizontal line |
| Same-sex marriage | Same as marriage | `A -- B` (both same sex) | Same rendering, positioning by age |
| Domestic partnership | Dashed + DP label | `A ~dp~ B` | stroke-dasharray + text label |

### 3.2 Emotional Relationship Types (GenoPro 34-Type Taxonomy)

这是 genogram 临床使用中最重要的扩展。GenoPro 定义了 34 种 emotional relationship types，分为 7 大类：

#### Category 1: Positive/Close Relationships
| Type | Line Style | DSL | 含义 |
|------|-----------|-----|------|
| Harmony | Single green solid line | `A -harmony- B` | 和谐关系 |
| Close | Two parallel green lines | `A -close- B` | 亲密 |
| Best friends | Three parallel green lines | `A -bestfriends- B` | 最好的朋友 |
| Love | Heart symbol on line | `A -love- B` | 爱 |
| In love | Double heart on line | `A -inlove- B` | 热恋 |
| Friendship | Single blue line | `A -friendship- B` | 友谊 |

#### Category 2: Negative/Hostile Relationships
| Type | Line Style | DSL | 含义 |
|------|-----------|-----|------|
| Hostile | Zigzag red line | `A -hostile- B` | 敌对 |
| Conflict | Zigzag line + hash marks | `A -conflict- B` | 冲突 |
| Enmity | Thick zigzag red line | `A -enmity- B` | 仇恨 |
| Distant-hostile | Dotted zigzag line | `A -distant-hostile- B` | 疏远+敌对 |
| Cutoff | Broken line with gap | `A -cutoff- B` | 断绝关系 |

#### Category 3: Ambivalent/Complex Relationships
| Type | Line Style | DSL | 含义 |
|------|-----------|-----|------|
| Close-hostile | Two parallel + zigzag | `A -close-hostile- B` | 亲密但敌对 |
| Fused | Three parallel lines (intense) | `A -fused- B` | 融合（over-involved） |
| Fused-hostile | Three parallel + zigzag | `A -fused-hostile- B` | 融合+敌对 |

#### Category 4: Distance Relationships
| Type | Line Style | DSL | 含义 |
|------|-----------|-----|------|
| Distant | Dotted thin line | `A -distant- B` | 疏远 |
| Plain/Normal | Single solid line (default) | `A -normal- B` | 普通关系 |
| Never met | No line (gap symbol) | `A -nevermet- B` | 从未见面 |

#### Category 5: Abuse Relationships
| Type | Line Style | DSL | 含义 |
|------|-----------|-----|------|
| Abuse (general) | Arrow + red zigzag | `A -abuse-> B` | 虐待（方向性） |
| Physical abuse | Arrow + thick red zigzag | `A -physical-abuse-> B` | 身体虐待 |
| Emotional abuse | Arrow + wavy red line | `A -emotional-abuse-> B` | 情感虐待 |
| Sexual abuse | Arrow + red zigzag + dot | `A -sexual-abuse-> B` | 性虐待 |
| Neglect | Arrow + thin dotted red | `A -neglect-> B` | 忽视 |

**注意：** 虐待关系有**方向性**（`->` 表示 A 对 B 施虐）。

#### Category 6: Control/Power Relationships
| Type | Line Style | DSL | 含义 |
|------|-----------|-----|------|
| Manipulative | Arrow + curved line | `A -manipulative-> B` | 操控 |
| Controlling | Arrow + thick line + bar | `A -controlling-> B` | 控制 |
| Jealous | Arrow + green zigzag | `A -jealous-> B` | 嫉妒 |

#### Category 7: Special Relationships
| Type | Line Style | DSL | 含义 |
|------|-----------|-----|------|
| Focused on | Arrow + magnifying symbol | `A -focused-> B` | 关注（正面） |
| Focused on negatively | Arrow + negative magnifying | `A -focused-neg-> B` | 负面关注 |
| Distrust | Dotted line + X | `A -distrust- B` | 不信任 |
| Fan/Admirer | Arrow + star | `A -admirer-> B` | 崇拜/粉丝 |
| Limerence | Arrow + heart + question | `A -limerence-> B` | 单恋/迷恋 |

### 3.3 Emotional Relationship SVG Implementation

**Line rendering priority：**
1. Base line shape: straight / zigzag / wavy / dotted / dashed
2. Color coding: green (positive), red (negative/abuse), blue (neutral), orange (control)
3. Multiplicity: 1 line (normal), 2 lines (close), 3 lines (fused/best friends)
4. Directional markers: arrowhead for abuse/control/focused relationships
5. Special symbols: heart, X, star (rendered as small SVG markers at line midpoint)

**SVG markers in `<defs>`：**
```xml
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#333"/>
  </marker>
  <marker id="heart" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="8" markerHeight="8">
    <path d="M6,10 C2,6 0,4 2,2 C4,0 6,2 6,4 C6,2 8,0 10,2 C12,4 10,6 6,10z" fill="#E53935"/>
  </marker>
</defs>
```

**Zigzag path generation（for hostile/conflict）：**
```
M x1,y1 L x1+10,y1-5 L x1+20,y1+5 L x1+30,y1-5 ... L x2,y2
```

### 3.4 Parent-Child Relationships

| Relationship | Line Style | DSL Property | 含义 |
|-------------|-----------|-------------|------|
| Biological child | Solid vertical line | (default) | 亲生 |
| Adopted child | Dashed line + brackets | `[adopted]` | 收养 |
| Foster child | Dotted vertical line | `[foster]` | 寄养 |
| Identical twins | Lines meet at single point (V) | `[twin-identical]` | 同卵双胞胎 |
| Fraternal twins | Lines connect with bar | `[twin-fraternal]` | 异卵双胞胎 |
| Triplets+ | 3+ lines from single point/bar | `[triplet-identical]` | 三胞胎+ |
| Surrogacy | Dotted line + S label | `[surrogate]` | 代孕 |
| Donor gamete | Dotted line + D label | `[donor]` | 供体配子 |
| Step-child | Step-shaped line (two right angles) | `[step]` | 继子女 |

### 3.5 Modern Family Structures

Lineage 必须支持现代非传统家庭结构：

| Structure | 处理方式 |
|-----------|---------|
| Same-sex parents | 两个同性 partner，standard couple line，children 连接方式相同 |
| Single parent by choice | 只有一个 parent node，直接 vertical line to children |
| Donor conception | Dotted line from donor node（可选显示/隐藏 donor） |
| Surrogacy | Surrogate 用 dotted line 连接到 child，biological parents 用 solid line |
| Co-parenting (non-couple) | Two individuals connected to children but no couple line between them |
| Blended family | Step-children connections + multiple marriage lines |
| Polyamorous family | Multiple concurrent couple lines from same individual (no divorce markers) |

**Children connection structure (standard):**
```
Father ────── Mother       (couple line)
       │                    
       ├──── Child 1        (sibship line + drop lines)
       ├──── Child 2
       └──── Child 3
```

---

## 4. Layout Rules

### 4.1 Generation Alignment
- **同代人物必须在同一 Y 坐标**——最重要的布局约束
- Generation 0（最年长一代）在最上方
- Y 坐标向下递增（SVG 坐标系）
- Generation 间距：默认 120px

### 4.2 Couple Positioning
- **Male left, female right**（McGoldrick 标准硬规则）
- 同性伴侣：按年龄排（年长左，年轻右）
- Nonbinary 伴侣：按 DSL 中出现顺序（第一个左）
- Couple line 水平，连接两人 shape 中心高度

### 4.3 Children Ordering
- 子女从左到右按**出生年份**排序（年长 → 年幼）
- 子女组居中对齐在 couple line 下方
- Sibship line 在 couple line 正下方

### 4.4 Multiple Marriages
- 按时间顺序从左到右排列
- 第一任配偶最内侧，后续向外
- 每段婚姻子女挂在各自 couple line 下

### 4.5 Edge Crossing Minimization
- Barycenter method 启发式
- 优先级：parent-child 不交叉 > couple 不交叉 > emotional relationship 不交叉

### 4.6 Spacing Rules
| Parameter | Default | 含义 |
|-----------|---------|------|
| Node width | 40px | Individual shape width |
| Node height | 40px | Individual shape height |
| Sibling spacing | 60px | Horizontal between siblings |
| Family unit spacing | 80px | Horizontal between family units |
| Generation spacing | 120px | Vertical between generations |
| Couple line length | 60px | Between partners |
| Drop line length | 40px | Couple to sibship line |
| Emotional line offset | 20px | Offset from structural lines (avoid overlap) |

### 4.7 Emotional Relationship Line Routing
- Emotional relationship lines 渲染在 structural lines（couple/parent-child）之上
- 如果 A 和 B 在不同 generation，line 绕过中间 nodes（避免穿过 shapes）
- 同 generation 内的 emotional lines 画在 nodes 下方（curved path）
- 不同 generation 的 emotional lines 画在右侧（避开 parent-child 区域）

---

## 5. DSL Grammar (Genogram — Expanded)

```ebnf
document       = header? legend_def* statement*
header         = "genogram" quoted_string? header_props? NEWLINE
header_props   = "[" header_prop ("," header_prop)* "]"
header_prop    = "mode:" MODE | "legend:" POSITION
MODE           = "medical" | "heritage"    # default: medical
POSITION       = "bottom-right" | "right" | "bottom-center" | "none"

legend_def     = "legend:" IDENTIFIER "=" quoted_string ( "(" color ")" )? NEWLINE

statement      = comment | individual_def | relationship_def
               | emotional_rel_def | annotation_def

comment        = "#" [^\n]* NEWLINE

individual_def = ID properties? NEWLINE
properties     = "[" property ("," property)* "]"
property       = sex_prop | gender_prop | status_prop | year_prop
               | condition_prop | heritage_prop | child_prop | kv_prop

sex_prop       = "male" | "female" | "unknown" | "nonbinary" | "intersex"
gender_prop    = "transgender"
status_prop    = "deceased" | "stillborn" | "miscarriage" | "abortion" | "pregnancy"
year_prop      = /[0-9]{4}/
condition_prop = "conditions:" condition ("+" condition)*
condition      = IDENTIFIER ( "(" fill_spec ")" )?
fill_spec      = (fill_position ("," color)?) | "carrier"
fill_position  = "full" | "half-left" | "half-right" | "half-top" | "half-bottom"
               | "quad-tl" | "quad-tr" | "quad-bl" | "quad-br"
heritage_prop  = "heritage:" IDENTIFIER ("+" IDENTIFIER)*
color          = "#" HEX{6} | NAMED_COLOR
child_prop     = "adopted" | "foster" | "surrogate" | "donor" | "step"
               | "twin-identical" | "twin-fraternal"
               | "triplet-identical" | "triplet-fraternal"
kv_prop        = IDENTIFIER ":" VALUE

annotation_def = INDENT "@" IDENTIFIER ":" quoted_string NEWLINE  # follows individual_def

relationship_def       = couple_rel | couple_with_children
couple_rel             = ID couple_op ID rel_label? NEWLINE
couple_with_children   = ID couple_op ID rel_label? NEWLINE INDENT child+ DEDENT
couple_op              = "--" | "-x-" | "-/-" | "~" | "==" | "-o-" | "~dp~"
rel_label              = "[" "label:" quoted_string "]"
child                  = individual_def

emotional_rel_def      = ID emotional_op ID rel_label? NEWLINE
emotional_op           = "-" EMOTIONAL_TYPE "-" ID
                       | "-" EMOTIONAL_TYPE "->" ID    # directional (abuse, control, focused)

EMOTIONAL_TYPE = "harmony" | "close" | "bestfriends" | "love" | "inlove"
               | "friendship" | "hostile" | "conflict" | "enmity"
               | "distant-hostile" | "cutoff" | "close-hostile"
               | "fused" | "fused-hostile" | "distant" | "normal" | "nevermet"
               | "abuse" | "physical-abuse" | "emotional-abuse"
               | "sexual-abuse" | "neglect"
               | "manipulative" | "controlling" | "jealous"
               | "focused" | "focused-neg" | "distrust"
               | "admirer" | "limerence"

ID             = /[a-zA-Z][a-zA-Z0-9_-]*/
IDENTIFIER     = /[a-zA-Z][a-zA-Z0-9_-]*/
VALUE          = /[^\],\n]+/
quoted_string  = '"' /[^"]*/ '"'
INDENT         = increase in leading whitespace (2+ spaces)
DEDENT         = decrease in leading whitespace
NEWLINE        = /\n/
```

**Parser 注意事项：**
- 缩进敏感（类似 Python/YAML），用于表示 parent-child 关系
- `#` 开头为行注释
- Properties 中逗号分隔，顺序无关
- ID 大小写不敏感（匹配时），但显示时保留原始大小写
- 同一 ID 可出现多次：第一次定义属性，后续为引用
- 空行忽略
- Emotional relationship 定义独立于 couple/parent-child 定义
- 宽容解析：多余空格、缺少逗号等尽量容错，给出友好错误信息

---

## 6. Test Cases

### Case 1: Nuclear Family (Basic)
```
genogram
  john [male, 1950]
  mary [female, 1955]
  john -- mary
    alice [female, 1980]
    bob [male, 1983]
```
验证：john 在 mary 左边，alice 在 bob 左边（年长），generation 0 / generation 1。

### Case 2: Three Generations
```
genogram "Smith Family"
  grandpa [male, 1930, deceased]
  grandma [female, 1932]
  grandpa -- grandma
    dad [male, 1955]
    aunt [female, 1958]
  dad -- mom [female, 1957]
    me [male, 1985]
    sister [female, 1988]
```

### Case 3: Divorce + Remarriage
```
genogram
  tom [male, 1950]
  jane [female, 1952]
  tom -x- jane
    child1 [male, 1975]
  tom -- susan [female, 1960]
    child2 [female, 1985]
```
验证：jane 和 susan 分别在 tom 不同侧，divorce 标记在 tom-jane 线上。

### Case 4: Medical Conditions (Color-coded)
```
genogram
  father [male, 1945, conditions: heart-disease(half-left, #E53935) + diabetes(half-right, #FB8C00)]
  mother [female, 1948, conditions: depression(full, #5C6BC0)]
  father -- mother
    son [male, 1970, conditions: diabetes(carrier)]
    daughter [female, 1973, conditions: anxiety(full, #26A69A) + heart-disease(carrier)]
```
验证：father 有两色半填充，mother 全填充 indigo，son 有 striped pattern，daughter 有 teal fill + stripe。

### Case 5: Single Individual
```
genogram
  solo [female, 1990]
```
验证：单人渲染不崩溃，居中显示。

### Case 6: Childless Couple
```
genogram
  husband [male, 1960]
  wife [female, 1962]
  husband -- wife
```
验证：只有 couple line，无 children line。

### Case 7: Emotional Relationships
```
genogram
  mom [female, 1955]
  dad [male, 1953]
  son [male, 1980]
  daughter [female, 1983]
  mom -- dad
    son
    daughter
  mom -close- daughter
  dad -hostile- son
  mom -fused- son
  dad -distant- daughter
```
验证：4 条 emotional relationship lines 叠加在 structural lines 上，各有正确的 line style 和 color。

### Case 8: Modern Family (LGBTQ+ / Donor)
```
genogram "Modern Family"
  alex [female, 1985]
  sam [female, 1987]
  alex -- sam
    child [male, 2015, donor]
  donor-d [male, 1980]
```
验证：同性 couple（按年龄排列），child 有 donor marker，donor-d 可选显示。

### Case 9: Abuse + Control Relationships
```
genogram
  father [male, 1950]
  mother [female, 1955]
  child [female, 1978]
  father -- mother
    child
  father -physical-abuse-> mother
  father -emotional-abuse-> child
```
验证：abuse lines 有方向箭头，red zigzag 样式，overlaid on structural connections。

### Case 10: Nonbinary / Transgender
```
genogram
  parent1 [male, 1960]
  parent2 [female, 1962]
  child1 [nonbinary, 1990]
  child2 [male, transgender, 1992]
  parent1 -- parent2
    child1
    child2
```
验证：child1 renders as diamond，child2 renders as square + transgender marker。

### Case 11: Cultural Heritage Genogram
```
genogram "Anna Maria's Heritage" [mode: heritage]
  legend: colombian = "Colombian" (#9C27B0)
  legend: dominican = "Dominican Republic" (#FFEB3B)
  legend: french = "French" (#1565C0)
  legend: irish = "Irish" (#4CAF50)
  legend: puerto-rican = "Puerto Rican" (#FF9800)

  jose [male, 1940, heritage: colombian]
  benita [female, 1942, heritage: dominican]
  jose -- benita
    felipa [female, 1965, heritage: colombian + dominican]
  patrick [male, 1938, heritage: irish]
  marie [female, 1940, heritage: french]
  patrick -- marie
    michael [male, 1966, heritage: irish + french]
  felipa -- michael
    anna-maria [female, 1990, heritage: colombian + dominican + irish + french]
```
验证：heritage mode 激活，legend box 显示 5 种颜色，anna-maria 的 shape 有 4-quadrant fill，每个 quadrant 颜色对应不同 heritage。

### Case 12: Rich Annotations + In-Shape Age
```
genogram "Clinical Assessment"
  jack [male, 1968, age: 57, occupation: "Veteran, Businessman"]
    @traits: "Tone Deaf Dad"
    @medical: "Smoking, Diabetes"
  judy [female, 1970, age: 55, occupation: "Homemaker"]
    @notes: "Good Wife, Good Mother"
  jack -- judy [label: "Married 35 yrs"]
    ross [male, 1989, age: 36, occupation: "Professor"]
    monica [female, 1991, age: 34, occupation: "Chef"]
      @traits: "Hardworking, Type A, Neat Freak"
  jack -close- ross [label: "Favoritism"]
  judy -close- monica [label: "Favoritism"]
  ross -hostile- monica [label: "Competitive"]
```
验证：age number (57, 55, 36, 34) 显示在 shape 内部，annotations 显示在 name 下方，relationship labels 显示在 lines 上。

### Case 13: Extended Family with In-Laws
```
genogram "Extended Family"
  # Paternal side
  gf1 [male, 1940]
  gm1 [female, 1942]
  gf1 -- gm1
    uncle1 [male, 1965]
    father [male, 1968]
  uncle1 -- aunt1 [female, 1967]
    cousin [male, 1992]

  # Maternal side
  gf2 [male, 1938]
  gm2 [female, 1940]
  gf2 -- gm2
    mother [female, 1970]
    uncle2 [male, 1972]
  uncle2 -- aunt2 [female, 1974]

  # Nuclear family
  father -- mother
    me [male, 1995]
    brother [male, 1997]
    sister [female, 2000]
  sister -- bro-in-law [male, 1998]
  brother -- sis-in-law [female, 1999]
```
验证：两个 grandparent couple 在 generation 0，parents + uncles/aunts 在 generation 1，me/siblings + in-laws 在 generation 2。

---

## 7. Implementation Priority

Phase 1 的 parser/layout/renderer 已经实现了基础功能（Cases 1-6）。以下是扩展优先级：

| Priority | Feature | Complexity | 用户价值 |
|----------|---------|------------|---------|
| P0 (Phase 1 ✅) | Basic symbols + couple + parent-child + conditions (simple fills) | Done | Core |
| P1 | Color-coded condition categories (22 categories) | Medium | High — 医疗专业用户核心需求 |
| P1 | Emotional relationships (at least top 10 types) | Medium | High — 社工/治疗师核心需求 |
| P1 | **In-shape age/text display** | Low | High — 几乎所有临床 genogram 都有 |
| P1 | **Relationship labels on lines** | Low | High — 临床 genogram 标配 |
| P1 | **Legend box auto-generation** | Medium | High — 复杂 genogram 必须 |
| P2 | Full 34 emotional relationship types | Medium | Medium — 专业级 genogram |
| P2 | Bennett 2022 gender inclusivity | Low | Medium — 现代化必须 |
| P2 | Abuse/control directional relationships | Medium | High — 临床评估核心 |
| P2 | Modern family structures (donor, surrogate, step) | Medium | Medium — 现代家庭 |
| P2 | **Cultural Heritage genogram mode** | Medium | Medium — 社工/多文化评估 |
| P2 | **Rich annotations (@occupation, @traits, @notes)** | Medium | Medium — 临床文档化 |
| P3 | Quadrant fill → radial pie for 5+ conditions | High | Low — edge case |
| P3 | Emotional line routing (avoid overlap) | High | Medium — 视觉质量 |
| P3 | External/non-family members (dashed border) | Low | Low — niche use case |
