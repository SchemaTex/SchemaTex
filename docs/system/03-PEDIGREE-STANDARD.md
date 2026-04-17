# 03 — Pedigree Chart Standard Reference

*遗传学 pedigree chart 标准——追踪特定性状/疾病在家族中的遗传模式。*

> Reference: Bennett, R.L. et al. (1995). Recommendations for standardized human pedigree nomenclature. *Am J Hum Genet*, 56(3), 745-752.

---

## 1. Key Differences from Genogram

| 方面 | Genogram | Pedigree Chart |
|------|----------|---------------|
| 用途 | 家庭关系 + 医疗 + 心理 | 纯遗传追踪 |
| Condition 表示 | 多条件 fill patterns | 只有 affected/carrier/unaffected |
| 关系质量 | 有（divorce, separation 等） | 无（只有 mated/not mated） |
| 代标记 | 无 | Roman numeral (I, II, III) |
| 个体标记 | 名字 | Generation + number (II-3) |
| Proband | 无 | 有（箭头指向 index case） |
| Consanguinity | 很少标注 | 重要（双线） |

---

## 2. Symbols

### 2.1 Individual Status
| Status | Fill | SVG |
|--------|------|-----|
| Unaffected | Empty (white fill) | `fill: white` |
| Affected | Fully filled | `fill: #333` |
| Carrier | Half-filled (left half) | `clip-path` left half |
| Obligate carrier | Dot in center | Small `<circle>` inside |
| Asymptomatic/pre-symptomatic | Vertical line through shape | `<line>` through center |

### 2.2 Special Markers
| Marker | Symbol | 含义 |
|--------|--------|------|
| Proband | Arrow (→) pointing to shape | 引起研究的人 |
| Consultand | Arrow + "C" | 来咨询的人 |
| Deceased | Slash through shape (/) | 已故 |

---

## 3. Layout Rules

与 genogram 共享大部分布局逻辑，区别：
1. **代标记：** 左侧显示 Roman numeral（I, II, III...）
2. **个体标记：** 每代内从左到右编号（1, 2, 3...），显示为 "II-3"
3. **无关系质量线**——所有配偶连线都是 solid line
4. **Proband 箭头**——从左下方指向 proband 的箭头

---

## 4. DSL Grammar (Pedigree)

```ebnf
document       = header statement*
header         = "pedigree" quoted_string? NEWLINE
statement      = individual_def | couple_def
individual_def = ID properties? NEWLINE
properties     = "[" property ("," property)* "]"
property       = sex_prop | status_prop | genetic_prop
sex_prop       = "male" | "female" | "unknown"
status_prop    = "deceased"
genetic_prop   = "affected" | "carrier" | "unaffected" | "obligate-carrier" | "proband"
couple_def     = ID couple_op ID NEWLINE (INDENT child+ DEDENT)?
couple_op      = "--" | "=="
child          = individual_def
```

---

## 5. Test Cases

### Case 1: Autosomal Recessive
```
pedigree "Cystic Fibrosis"
  I-1 [male, carrier]
  I-2 [female, carrier]
  I-1 -- I-2
    II-1 [male, unaffected]
    II-2 [female, carrier]
    II-3 [male, affected, proband]
    II-4 [female, unaffected]
```
验证：I-1 和 I-2 半填充，II-3 全填充 + proband 箭头，左侧有 "I" "II" 代标记。

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
    III-1 [male, affected]
```
验证：II-1 和 II-3 之间是双线（consanguinity），III-1 是 affected。
