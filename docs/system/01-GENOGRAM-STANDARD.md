# 01 — Genogram Standard Reference

*McGoldrick et al. (2020) 符号系统 + 布局规则。这是 genogram 渲染的唯一权威标准。*

> Reference: McGoldrick, M., Gerson, R., & Petry, S. (2020). *Genograms: Assessment and Treatment.* 4th ed.
> Online: https://genopro.com/genogram/rules/

---

## 1. Individual Symbols

| Symbol | Shape | 含义 |
|--------|-------|------|
| □ | Square (40×40 default) | Male |
| ○ | Circle (r=20 default) | Female |
| ◇ | Diamond (40×40) | Unknown sex / Other |
| ✕ through shape | X overlaid | Deceased |
| Small □/○ | 50% size | Stillborn |
| ▲ (small triangle) | Triangle pointing up | Miscarriage |
| × (small) | Small X | Abortion (spontaneous) |
| ×. (small, with dot) | Small X with line | Abortion (induced) |
| Concentric shape | Double outline | Index person (IP) / Identified patient |
| Dotted outline | Dashed border | Pregnancy |

### SVG Implementation Notes
- Male: `<rect>` with `class="lineage-node lineage-male"`
- Female: `<circle>` with `class="lineage-node lineage-female"`
- Unknown: `<polygon>` (diamond) with `class="lineage-node lineage-unknown"`
- Deceased: overlay `<line>` X from corner to corner of shape
- All shapes: stroke-width 2, fill white (default), stroke black

---

## 2. Medical/Psychological Condition Fills

Conditions are shown by **filling portions** of the individual's shape:

| Fill Pattern | SVG Implementation | 含义 |
|-------------|-------------------|------|
| Full fill | `fill: #333` | Affected (primary condition) |
| Half-left | `clip-path` left half filled | Second condition |
| Half-right | `clip-path` right half filled | Third condition |
| Half-bottom | `clip-path` bottom half filled | Fourth condition |
| Quarter (top-left) | `clip-path` quarter filled | Additional conditions |
| Striped/hatched | `<pattern>` with diagonal lines | Carrier (asymptomatic) |

### Fill Pattern SVG Defs

每个 condition 需要在 `<defs>` 中定义 `<clipPath>` 或 `<pattern>`。例：

```xml
<defs>
  <!-- Half-left fill for squares -->
  <clipPath id="half-left-rect">
    <rect x="0" y="0" width="20" height="40"/>
  </clipPath>

  <!-- Striped pattern -->
  <pattern id="striped" patternUnits="userSpaceOnUse" width="4" height="4">
    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#333" stroke-width="1"/>
  </pattern>
</defs>
```

**多条件叠加规则：**
- 最多 4 个条件可同时显示（full + half-left + half-right + quarter）
- 超过 4 个条件时，使用 legend + 数字标注
- 条件颜色可自定义（默认全部 #333 黑色）

---

## 3. Relationship Lines

### 3.1 Couple Relationships

| Relationship | Line Style | DSL Syntax |
|-------------|-----------|------------|
| Marriage | Solid horizontal line | `A -- B` |
| Cohabitation/LTR | Dashed horizontal line | `A ~ B` |
| Engagement | Solid + small diamond | `A -o- B` |
| Separation | Solid + single slash | `A -/- B` |
| Divorce | Solid + double slash | `A -x- B` |
| Remarriage (after divorce) | New marriage line from same individual | Second `A -- C` |
| Consanguinity | Double horizontal line | `A == B` |

**SVG Implementation:**
- Marriage: `<line>` solid, stroke-width 2
- Divorce: `<line>` solid + two short diagonal `<line>` elements crossing it
- Separation: `<line>` solid + one short diagonal
- Cohabitation: `<line>` stroke-dasharray="6,4"
- Vertical drop from couple line to children line

### 3.2 Parent-Child Relationships

| Relationship | Line Style | DSL Syntax |
|-------------|-----------|------------|
| Biological child | Solid vertical line | Indented under couple |
| Adopted child | Dashed vertical line + brackets | `[adopted]` property |
| Foster child | Dotted vertical line | `[foster]` property |
| Identical twins | Lines meet at a single point (V shape) | `[twin-identical]` |
| Fraternal twins | Lines connect with short horizontal bar | `[twin-fraternal]` |

**Children connection structure:**
```
Father ────── Mother       (couple line)
       │                    
       ├──── Child 1        (vertical line down, then horizontal to each child)
       ├──── Child 2
       └──── Child 3
```

实际 SVG：couple line 中点向下画垂直线，底部画水平线（sibship line），每个 child 从 sibship line 向下连接到自己的 symbol。

---

## 4. Layout Rules (Critical for layout.ts)

### 4.1 Generation Alignment
- **同代人物必须在同一 Y 坐标**——这是最重要的布局约束
- Generation 0（最年长一代）在最上方
- Y 坐标向下递增（SVG 坐标系 Y 轴向下）
- Generation 间距：默认 120px

### 4.2 Couple Positioning
- **Male ALWAYS left, female ALWAYS right**（这是 McGoldrick 标准的硬规则）
- 已知例外：同性伴侣按年龄排（年长左，年轻右）
- Couple line 水平，连接两人 shape 的中心高度

### 4.3 Children Ordering
- 子女从左到右按**出生年份**排序（年长 → 年幼）
- 子女组居中对齐在父母 couple line 下方
- Sibship line（连接所有子女的水平线）在 couple line 正下方

### 4.4 Multiple Marriages
- 按时间顺序从左到右排列
- 第一任配偶在最内侧（靠近共同子女），后续配偶向外
- 离婚线（//）标注在旧关系上
- 每段婚姻的子女挂在各自的 couple line 下

### 4.5 Edge Crossing Minimization
- 同代内部排序应最小化跨代连线的交叉
- 优先级：parent-child 连线不交叉 > couple 连线不交叉 > 其他
- 这是 NP-hard 问题，使用启发式（barycenter method 或 median method）

### 4.6 Spacing Rules
- Node width: 40px (default)
- Node height: 40px (default)
- Horizontal spacing between siblings: 60px
- Horizontal spacing between family units: 80px
- Vertical spacing between generations: 120px
- Couple line length: 60px (between partners)
- Drop line from couple to sibship: 40px

---

## 5. DSL Grammar (Genogram)

```ebnf
document       = header? statement*
header         = "genogram" quoted_string? NEWLINE
statement      = comment | individual_def | relationship_def
comment        = "#" [^\n]* NEWLINE

individual_def = ID properties? NEWLINE
properties     = "[" property ("," property)* "]"
property       = sex_prop | status_prop | year_prop | condition_prop | kv_prop
sex_prop       = "male" | "female" | "unknown"
status_prop    = "deceased" | "stillborn" | "miscarriage" | "abortion"
year_prop      = /[0-9]{4}/
condition_prop = "conditions:" condition ("+" condition)*
condition      = IDENTIFIER "(" fill_pattern ")"
fill_pattern   = "full" | "half-left" | "half-right" | "half-bottom" | "quarter" | "striped"
kv_prop        = IDENTIFIER ":" VALUE

relationship_def = couple_rel | couple_with_children
couple_rel       = ID couple_op ID NEWLINE
couple_with_children = ID couple_op ID NEWLINE INDENT child+ DEDENT
couple_op        = "--" | "-x-" | "-/-" | "~" | "==" | "-o-"
child            = individual_def

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
- 宽容解析：多余空格、缺少逗号等尽量容错，给出友好错误信息

---

## 6. Test Cases (Must Pass)

### Case 1: Nuclear Family
```
genogram
  john [male, 1950]
  mary [female, 1955]
  john -- mary
    alice [female, 1980]
    bob [male, 1983]
```
验证：john 在 mary 左边，alice 在 bob 左边（年长），john/mary 在 generation 0，alice/bob 在 generation 1。

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
验证：jane 和 susan 分别在 tom 的不同侧；divorce 标记在 tom-jane 线上。

### Case 4: Medical Conditions
```
genogram
  father [male, 1945, conditions: heart-disease(full) + diabetes(half-left)]
  mother [female, 1948]
  father -- mother
    son [male, 1970, conditions: diabetes(striped)]
```
验证：father 的 shape 有 full fill + half-left fill 两个 pattern；son 的 shape 有 striped pattern。

### Case 5: Single Individual (Edge Case)
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
验证：只有 couple line，没有向下的 children line。
