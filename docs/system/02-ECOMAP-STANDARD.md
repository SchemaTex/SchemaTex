# 02 — Ecomap Standard Reference

*Hartman (1978) ecomap model — 个体/家庭与外部环境系统的关系可视化。*

> Reference: Hartman, A. (1978). Diagrammatic assessment of family relationships. *Social Casework*, 59(8), 465-476.

---

## 1. Structure

Ecomap 由三层组成：
1. **中心** — 个体或家庭单元（用圆或方框表示）
2. **外部系统** — 工作、学校、教会、朋友、医疗、政府机构等（用圆表示）
3. **连接线** — 表示关系质量和能量流向

---

## 2. Symbols

| 元素 | Shape | SVG |
|------|-------|-----|
| Central person/family | Large circle (r=40) | `<circle>` class="lineage-center" |
| External system | Medium circle (r=30) | `<circle>` class="lineage-system" |
| System label | Text inside circle | `<text>` centered |

---

## 3. Connection Line Types

| Type | Line Style | DSL Syntax | 含义 |
|------|-----------|------------|------|
| Strong/positive | Solid thick (stroke-width: 4) | `===` | 紧密、有力的关系 |
| Moderate | Solid normal (stroke-width: 2) | `---` | 一般关系 |
| Weak/tenuous | Dashed thin (stroke-width: 1) | `- -` | 薄弱的关系 |
| Stressful | Wavy/zigzag line | `~~~` | 充满压力的关系 |
| Energy flow (one-way) | Arrow on one end | `-->` or `<--` | 能量/资源单向流动 |
| Energy flow (mutual) | Arrows on both ends | `<->` | 双向能量流动 |

**组合：** 线型和箭头可组合，如 `====>` 表示强关系 + 单向能量流。

---

## 4. Layout Rules

### 4.1 Radial Layout
- 中心人物/家庭在画布正中
- 外部系统按类别/亲密度分布在周围
- 越亲密的系统越靠近中心
- 默认：系统均匀分布在圆周上
- 可选：按类别分区（上方=工作/学校，下方=家庭，左=社区，右=专业服务）

### 4.2 Spacing
- Center circle radius: 40px
- System circle radius: 30px
- Minimum distance from center: 120px
- Maximum distance from center: 250px
- Minimum distance between systems: 80px

### 4.3 Connection Lines
- 线从 center circle 边缘到 system circle 边缘（不是中心到中心）
- Wavy line: SVG `<path>` 用 sine wave 实现
- Arrow: SVG `<marker>` arrowhead

---

## 5. DSL Grammar (Ecomap)

```ebnf
document       = header center_def system_def* connection_def*
header         = "ecomap" quoted_string? NEWLINE
center_def     = "center:" ID properties? NEWLINE
system_def     = ID properties? NEWLINE
connection_def = ID connection_op ID NEWLINE
connection_op  = "===" | "---" | "- -" | "~~~" | "-->" | "<--" | "<->" | "===>" | "<===" | "<=>"
properties     = "[" property ("," property)* "]"
```

---

## 6. Test Cases

### Case 1: Basic Ecomap
```
ecomap "Maria's Support"
  center: maria [female, age: 34]
  work [label: "Tech Company"]
  church [label: "St. Mary's"]
  mother [label: "Mom"]
  maria === mother
  maria --- church
  maria === work
```

### Case 2: With Energy Flow
```
ecomap
  center: family [label: "The Johnsons"]
  school [label: "Oak Elementary"]
  therapist [label: "Dr. Smith"]
  ex [label: "Ex-spouse"]
  family === school
  therapist --> family
  family ~~~ ex
```
