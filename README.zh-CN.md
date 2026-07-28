<p align="center">
  <strong>Schematex</strong><br>
  <em>Every diagram a doctor, engineer, or lawyer would actually use.</em><br>
  <em>Free. Fully open source. Made for AI.</em>
</p>

<p align="center">
  McGoldrick 家系图 · NSGC 遗传谱系图 · IEC 61131-3 梯形图 · IEEE 315 单线图 · Newick 系统发育树 · Howard-Raiffa 决策树 · Moreno 社交图 —— 全部由一套极简文本 DSL 生成，零运行时依赖。
</p>

<p align="center">
  <a href="https://schematex.js.org">官网</a> ·
  <a href="https://schematex.js.org/playground">Playground</a> ·
  <a href="https://schematex.js.org/docs">文档</a> ·
  <a href="https://www.npmjs.com/package/schematex">npm</a>
</p>

<p align="center">
  <a href="./README.md">English</a> · <strong>简体中文</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/schematex"><img src="https://img.shields.io/npm/v/schematex.svg?color=cb3837&label=npm" alt="npm"></a>
  <a href="https://bundlephobia.com/package/schematex"><img src="https://img.shields.io/bundlephobia/minzip/schematex?label=gzip" alt="bundle size"></a>
  <img src="https://img.shields.io/badge/deps-0-brightgreen" alt="zero deps">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6" alt="typescript strict">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="license"></a>
</p>

<p align="center">
  <img src="./website/public/hero-demo.gif" alt="Schematex demo — genogram, pedigree, ladder logic, phylo, entity structure, fishbone, circuit, ecomap, timing" width="720">
</p>

---

**Schematex** 是一个开源渲染与编辑引擎，专门画那些专业人士**真正在用**的图 —— 医学、电气、法律、现场制作与分析领域。**52 种图**，覆盖医学、工程、法律、现场制作与分析：

- 👪 **关系类** —— 家系图（genogram）、生态图（ecomap）、遗传谱系图（pedigree）、社交图（sociogram）、系统发育树（phylo）
- ⚡ **电气与工业** —— 梯形图（ladder）、单线图（SLD）、电路原理图（circuit）、逻辑门（logic）、时序图（timing）、方框图（block）、**FBD**、**SFC**、面包板（breadboard）、**P&ID**（ISA-5.1）
- 🔄 **行为与流程建模** —— UML 2.5 / Harel **状态图**（Mermaid 兼容超集）、**BPMN 2.0**（OMG）、**用例图**（UML 2.5.1 §18）、**时序图**（UML 2.5.1 §17 —— 全部 12 种组合片段 + `ref`）
- 🧩 **软件与数据建模** —— **UML 类图**（UML 2.5.1 §9–§11，命名空间 + 6 种关系）、**ERD** 鸦爪记法
- 🏢 **公司与法律** —— 实体结构图（entity）、股权结构表（cap table）、组织架构图（orgchart）
- 🐟 **因果与分析** —— 鱼骨图 / Ishikawa（fishbone）、决策树（Howard-Raiffa EV · CART/sklearn · 分类法）、Venn / Euler 图
- 🛡️ **风险与可靠性** —— **故障树**（NUREG-0492 / IEC 61025），引擎*计算* MOCUS 最小割集 + P(top)；**领结图 bowtie** 基于屏障的风险管理（CCPS / Energy Institute 2018）
- 🗓️ **项目管理** —— **PERT / CPM** 网络图（PMBOK 7），引擎*计算*进度：ES/EF/LS/LF、时差、关键路径、三点估算、泳道、时间刻度布局
- 🖧 **网络与基础设施** —— **网络拓扑图**（Cisco 约定图标），设备 / 链路 / 端口完整性校验、IP 网络摄像机系统、三层园区网、spine-leaf 架构、子网与 VLAN
- 🏠 **建筑与空间** —— 可量测的单层 / 多层平面图、标准化疏散图，以及自动生成 input list 的正式 stage plot
- ◉ **并发** —— **Petri 网**（Murata 1989 / ISO-IEC 15909），引擎*计算*使能状态并按序列触发 token
- 🔬 **研究综述** —— **PRISMA 2020** 系统综述流程图
- 📅 **时间线** —— 比例 / 等距 / 对数轴 · 泳道 · 甘特 · 棒棒糖 · 公元前日期 · 地质 Ma 刻度
- 🧠 **知识与策略** —— 思维导图（mindmap）、2×2 / N×M 矩阵（matrix）、流程图（flowchart）

Mermaid 画的是通用流程图。Schematex 画的是医生、工程师、律师真正会用的图 —— 一张遗传咨询师在临床上认可的家系图、一份与 IEC 61131-3 一一对应的梯形图、一张能扛过 Series A 尽调的股权结构表。

🆓 **免费且完全开源** · 📐 **10+ 行业标准** · 🤖 **为 AI 而生** · 🌱 **SSR 友好的纯 SVG · 零依赖**

## 安装

```bash
npm install schematex
```

## 快速开始

```ts
import { render } from 'schematex';

const svg = render(`
genogram "The Smiths"
  john [male, 1950]
  mary [female, 1952]
  john -- mary
    alice [female, 1975, index]
    bob [male, 1978]
`);
```

图的类型由第一个关键字自动推断。按需引入即可 tree-shake：

```ts
import { render } from 'schematex/genogram';
```

### React Editor

同一个 npm 包内置受控的开源 Canvas Editor。你的应用负责 DSL state、持久化、undo 和协作；Schematex 负责安全的 SVG 手势和所见即所得文字编辑。

```tsx
'use client';

import { useState } from 'react';
import { InteractiveSchematexDiagram } from 'schematex/react';

export function DiagramEditor() {
  const [dsl, setDsl] = useState('flowchart "发布流程"\n  draft [草稿]\n  draft -> shipped [发布]');

  return <InteractiveSchematexDiagram value={dsl} onChange={setDsl} />;
}
```

21 种具备 parser-native range 的图支持确定性的 Canvas 编辑，其中 18 种还支持稳定 ID 拖拽或 native geometry handle。其余 31 种仍可正常 render 和通过 DSL 源码编辑，但不会生成猜测式 Canvas handle。详见 [Interactive Editing 指南](https://schematex.js.org/docs/interactive-editing) 和 [在线测试 workspace](https://schematex.js.org/playground)。

开发型 LLM 可以从 [`llms.txt`](https://schematex.js.org/llms.txt) 开始，通过 [`llms-full.txt`](https://schematex.js.org/llms-full.txt) 读取完整 Markdown 文档，或查询 [machine-readable interactive capability registry](https://schematex.js.org/api/interactive-capabilities)。任意 docs URL 末尾加 `.md` 即可获得干净的 Markdown。

## 图库

全部 52 种图共用同一条渲染管线，下面展示其中一部分 —— **在 [schematex.js.org/playground](https://schematex.js.org/playground) 实时试用任意一种。**

### 👪 家系图 Genogram —— *McGoldrick 家庭系统标准*

用于治疗、社工、医学的多代家族树。性别专属形状、疾病填充、情感关系连线、索引人标记。

```
genogram "The Potter Family"
  fleamont [male, 1909, 1979, deceased]
  euphemia [female, 1920, 1979, deceased]
  fleamont -- euphemia
    james [male, 1960, 1981, deceased]
  mr_evans [male, 1925, deceased]
  mrs_evans [female, 1928, deceased]
  mr_evans -- mrs_evans
    lily [female, 1960, 1981, deceased]
    petunia [female, 1958]
  james -- lily "m. 1978"
    harry [male, 1980, index]
  petunia -- vernon [male, 1951]
    dudley [male, 1980]
  harry -cutoff- petunia
  harry -hostile- dudley
  harry -close- lily
```

![Harry Potter Genogram](examples/genogram/harry-potter.svg)

[家系图语法 →](https://schematex.js.org/docs/genogram)

---

### 🌐 生态图 Ecomap —— *Hartman 1978 标准*

把家庭系统嵌入到机构、社会、文化支持网络中。径向布局、加权连接强度、能量流向。

```
ecomap "Nguyen Family Resettlement"
  center: family [label: "Nguyen Family"]
  resettlement [label: "IRC Office", category: government]
  school [label: "Lincoln Elementary", category: education]
  clinic [label: "Community Clinic", category: health]
  temple [label: "Vietnamese Temple", category: cultural]
  neighbors [label: "Sponsor Family", category: community]
  family === resettlement [label: "active case"]
  family === school
  clinic --> family [label: "vaccinations"]
  family === temple [label: "anchor"]
  neighbors === family [label: "housing host"]
```

![Nguyen Family Ecomap](examples/ecomap/refugee-family.svg)

[生态图语法 →](https://schematex.js.org/docs/ecomap)

---

### 🧬 遗传谱系图 Pedigree —— *标准化人类谱系命名法*

临床遗传学的多代遗传图。患病 / 携带者 / 症状前状态填充、先证者箭头、近亲婚配。

```
pedigree "BRCA1 Family — Hereditary Breast/Ovarian Cancer"
  I-1 [male, unaffected]
  I-2 [female, affected, deceased]
  I-1 -- I-2
    II-1 [female, affected]
    II-3 [female, carrier]
  II-1 -- II-4 [male, unaffected]
    III-1 [female, affected, proband]
    III-3 [female, presymptomatic]
```

![BRCA1 Pedigree](examples/pedigree/brca-family.svg)

[谱系图语法 →](https://schematex.js.org/docs/pedigree)

---

### 🌿 系统发育树 Phylogenetic tree —— *Newick + NHX*

进化树，支持 clade 着色、自展支持值（bootstrap）、比例分支长度，以及基于缩进的 DSL 写法。

```
phylo "Bacterial Diversity"
  newick: "((((Ecoli:0.1,Salmonella:0.12):0.05[&&NHX:B=98],Vibrio:0.2):0.08,((Bacillus:0.15,Staph:0.18):0.06[&&NHX:B=92],Listeria:0.22):0.1):0.15,((Myco_tb:0.3,Myco_leprae:0.28):0.12[&&NHX:B=100],(Strepto:0.25,Lactobacillus:0.2):0.08):0.2);"
  clade Gamma = (Ecoli, Salmonella, Vibrio) [color: "#1E88E5", label: "γ-Proteobacteria"]
  clade Firmi = (Bacillus, Staph, Listeria) [color: "#E53935", label: "Firmicutes"]
  scale "substitutions/site"
```

![Bacterial Diversity Phylogenetic Tree](examples/phylo/bacterial-diversity.svg)

[系统发育树语法 →](https://schematex.js.org/docs/phylo)

---

### 🕸 社交图 Sociogram —— *Moreno 社会计量学*

社会网络图，支持互选、排斥、群组着色。力导向或层级布局。自动检测明星节点、孤立点、小团体。

```
sociogram "Operation Sunset - Communication Network"
  config: layout = force-directed
  boss [label: "Subject Alpha"]
  lt1 [label: "Lieutenant 1"]
  lt2 [label: "Lieutenant 2"]
  courier1 [label: "Courier A"]
  courier2 [label: "Courier B"]
  contact1 [label: "External Contact 1"]
  contact2 [label: "External Contact 2"]
  associate1 [label: "Associate 1"]
  associate2 [label: "Associate 2"]
  boss <-> lt1 [weight: 4]
  boss <-> lt2 [weight: 4]
  lt1 -> courier1
  lt1 -> courier2
  lt2 -> associate1
  lt2 -> associate2
  courier1 -> contact1 [label: "supplier"]
  courier2 -> contact2 [label: "distributor"]
  lt1 <-> lt2 [weight: 2]
  associate1 -.- courier1
```

![Operation Sunset Sociogram](examples/sociogram/criminal-network.svg)

[社交图语法 →](https://schematex.js.org/docs/sociogram)

---

### ⏱ 时序图 Timing diagram —— *WaveDrom 兼容*

数字波形，支持时钟脉冲、总线段、高阻态、分组标签。

```
timing "SPI Transaction"
CLK:   pppppppp
CS_N:  10000001
MOSI:  x=======  data: ["0xAB","0xCD","0xEF","0x01","0x02","0x03","0x04","0x05"]
MISO:  zzzz====  data: ["","","","","0xFF","0x12","0x34","0x56"]
```

![SPI Transaction Timing Diagram](examples/timing/spi-transaction.svg)

[时序图语法 →](https://schematex.js.org/docs/timing)

---

### 🔌 逻辑门 Logic gate —— *IEEE 91 & IEC 60617*

组合与时序逻辑，自动 DAG 布局 + 曼哈顿走线。

```
logic "1-bit Full Adder"
input A, B, Cin
output Sum, Cout
s1 = XOR(A, B)
Sum = XOR(s1, Cin)
c1 = AND(A, B)
c2 = AND(s1, Cin)
Cout = OR(c1, c2)
```

![1-bit Full Adder Logic Gate](examples/logic/full-adder.svg)

[逻辑门语法 →](https://schematex.js.org/docs/logic)

---

### ⚡ 电路原理图 Circuit schematic —— *SPICE 风格 netlist 或位置式 DSL*

模拟 / 数字电路，自动布线电源 / 地轨 + 正交信号走线。

```
circuit "CE Amp (netlist)" netlist
V1 vcc 0 9V
Rc vcc c 2.2k
Rb vcc b 100k
Q1 c b e npn
Re e 0 1k
```

![CE Amp Netlist Schematic](examples/circuit/ce-amp-netlist.svg)

[电路语法 →](https://schematex.js.org/docs/circuit)

---

### 🪜 梯形图 Ladder logic —— *IEC 61131-3 / Allen-Bradley*

工业 PLC 程序，支持「标签 + 地址 + 描述」三行标注、并联分支、Set/Reset 线圈对。

```
ladder "System Mode Selection"
rung 1 "Set Auto, reset Manual":
  XIC(AUTO_HMIPB, "BIT 5.10", name="Auto Mode HMI Pushbutton")
  XIO(MANL_HMIPB, "BIT 5.11", name="Manual Mode HMI Pushbutton")
  XIO(SYS_FAULT, "BIT 3.0", name="System Fault")
  parallel:
    branch: OTL(SYS_AUTO, "BIT 3.1", name="System Auto Mode")
    branch: OTU(SYS_MANUAL, "BIT 3.2", name="System Manual Mode")
```

![System Mode Selection Ladder](examples/ladder/mode-selection.svg)

[梯形图语法 →](https://schematex.js.org/docs/ladder)

---

### ⚡ 单线图 Single-line diagram —— *IEEE 315 电力一次接线图*

变电站与配电一次接线图，含变压器、断路器、母线、保护继电器。

```
sld "Utility with generator backup"
UTIL = utility [voltage: "480V", label: "Utility"]
GEN = generator [rating: "500 kW", voltage: "480V", label: "Emergency Gen"]
ATS1 = ats [rating: "800A", label: "ATS-1"]
BUS1 = bus [voltage: "480V", label: "Critical Load Bus"]
CB1 = breaker [rating: "200A"]
CB2 = breaker [rating: "200A"]
L1 = load [rating: "100A", label: "Critical Load 1"]
L2 = load [rating: "100A", label: "Critical Load 2"]
UTIL -> ATS1
GEN -> ATS1
ATS1 -> BUS1
BUS1 -> CB1
BUS1 -> CB2
CB1 -> L1
CB2 -> L2
```

![Utility with Generator Backup SLD](examples/sld/generator-ats.svg)

[单线图语法 →](https://schematex.js.org/docs/sld)

---

### 🏢 实体结构图 Entity structure —— *股权结构表与公司所有权*

公司母 / 子公司结构，含持股比例、按司法辖区聚类、实体类型形状（C-corp / LLC / trust / fund）。

```
entity "Acme Holdings"
  acme_inc [type: corp, jurisdiction: DE]
  acme_uk [type: ltd, jurisdiction: UK]
  acme_fund [type: fund, jurisdiction: KY]
  trust_a [type: trust, jurisdiction: SD]
  trust_a --100%--> acme_inc
  acme_inc --100%--> acme_uk
  acme_inc --60%--> acme_fund
```

![Acme Holdings Entity Structure](examples/entity/holding-company.svg)

[实体结构语法 →](https://schematex.js.org/docs/entity)

---

### 📦 方框图 Block diagram

信号流方框图，含求和节点、增益方块、反馈回路。

```
blockdiagram "Nested Feedback Loops"
G1 = block("G1(s)") [role: plant]
G2 = block("G2(s)") [role: plant]
G3 = block("G3(s)") [role: plant]
H1 = block("H1(s)") [role: sensor]
H2 = block("H2(s)") [role: sensor, route: above]
s1 = sum(+R, -h2)
s2 = sum(+a, -h1)
in -> s1 ["R(s)"]
s1 -> G1 -> s2
s2 -> G2 -> G3
G3 -> out ["Y(s)"]
G2 -> H1
H1 -> s2
G3 -> H2
H2 -> s1
```

![Nested Feedback Loops Block Diagram](examples/block/nested-feedback.svg)

[方框图语法 →](https://schematex.js.org/docs/block)

---

### 🐟 鱼骨图 Fishbone —— *Ishikawa 因果图*

因果分析图，自动分类分支 + 交替排布的鱼骨。

```
fishbone "Website Traffic Drop — Root Cause Analysis"
effect "Traffic Drop"
category content "Content"
category tech "Technical"
category links "Backlinks"
category ux "UX"
category competition "Competition"
category algo "Algorithm"
content : "Lower update frequency" : "Thin content" : "Keyword gaps"
tech : "Poor Core Web Vitals" : "WAF blocking crawlers"
links : "High-DA backlink loss" : "Referring domain plateau"
ux : "Bounce rate spike" : "Slow LCP" : "Intrusive interstitials"
competition : "New entrants" : "AI overviews displacing clicks"
algo : "Core Update penalty" : "Weak E-E-A-T signals" : "SGE traffic diversion"
```

![Website Traffic Drop Fishbone](examples/fishbone/website-traffic-drop.svg)

[鱼骨图语法 →](https://schematex.js.org/docs/fishbone)

### 🌳 决策树 Decision Tree —— *Howard-Raiffa · CART/sklearn · 分类法*

一套 DSL，三种模式：决策分析（Howard-Raiffa EV 回溯）、ML 树可视化（sklearn `plot_tree` 风格）、yes/no 分类树。对角边走线、收益对齐列、最优路径高亮。

**决策分析 —— EV 回溯：**
```
decisiontree:decision "Oil drilling"

decision "Drill or sell rights?"
  choice "Sell rights"
    end payoff=90000 "Guaranteed sale"
  choice "Drill"
    chance "Well outcome"
      prob 0.3 end payoff=500000 "Major strike"
      prob 0.5 end payoff=50000  "Minor strike"
      prob 0.2 end payoff=-200000 "Dry hole"
```

**ML 树 —— sklearn CART 风格：**
```
decisiontree:ml "Iris classification"
classes: setosa, versicolor, virginica
impurity: gini
branchLabels: relation

split feature=petal_width op=<= threshold=0.8 samples=120 value=[50,35,35] gini=0.66
  true leaf samples=50 value=[50,0,0] gini=0 class=setosa
  false split feature=petal_width op=<= threshold=1.75 samples=70 value=[0,35,35] gini=0.5
    true leaf samples=36 value=[0,32,4] gini=0.198 class=versicolor
    false leaf samples=34 value=[0,3,31] gini=0.162 class=virginica
```

**分类法 —— yes/no 分类：**
```
decisiontree:taxonomy "ED Triage Level"
direction: left-right

q "Airway compromise?"
  yes: a "Level 1 — Resuscitation"
  no: q "Vital signs unstable?"
    yes: a "Level 2 — Emergent"
    no: q "Multiple resources needed?"
      yes: a "Level 3 — Urgent"
      no: a "Level 4/5 — Less urgent"
```

[决策树语法 →](https://schematex.js.org/docs/decisiontree)

---

### 📅 时间线 Timeline

历史事件、人物生平、产品路线图、地质年代，落在比例 / 等距 / 对数轴上。三种视觉样式：**泳道**（多轨生平）、**甘特**（项目计划，含图钉 + 分类泳道 + 图例）、**棒棒糖**（中轴上下交替的卡片）。支持公元前 / 公元日期、季度日期（`2026-Q1`）、地质百万年（`Ma`）刻度。

```
timeline "Apollo program"

1961-05-25: milestone "Kennedy Moon speech"
1967-01-27: "Apollo 1 fire"
1968-12-21 - 1968-12-27: "Apollo 8 — first lunar orbit"
1969-07-16 - 1969-07-24: "Apollo 11 — Moon landing" [icon:🚀]
1970-04-11 - 1970-04-17: "Apollo 13 — abort"
1972-12-07 - 1972-12-19: "Apollo 17 — last crewed Moon mission"
```

```
timeline "Brand story"
config: style = lollipop

era 2015 - 2019: "Scrappy startup"
era 2019 - 2023: "Scale-up"
era 2023 - 2027: "Enterprise era"

2015: "Founded in a coffee shop" [icon:☕]
2017: milestone "First 1000 users" [icon:👥]
2019: "Series A" [icon:💰]
2021: "Opened NYC office" [icon:🏙]
2023: milestone "Crossed $50M ARR" [icon:📊]
2025: "Acquired Acme Inc." [icon:🤝]
```

```
timeline "Q2 Launch plan"
config: style = gantt

2026-04-01: milestone "Kickoff"
2026-06-30: milestone "GA launch" [icon:🚀]

2026-04-01 - 2026-04-30: "Research & specs" [category: "Design"]
2026-04-10 - 2026-06-10: "API build" [category: "Eng"]
2026-05-15 - 2026-06-25: "Campaign prep" [category: "Marketing"]
```

[时间线语法 →](https://schematex.js.org/docs/timeline)

### 🗓️ PERT / CPM —— *PMI PMBOK 7 活动节点网络图*

唯一一个**会计算进度**的文本 DSL PERT 工具。你写任务、工期、依赖关系 —— 引擎跑前向 / 后向遍历，返回最早 / 最迟开始与完成、总时差、项目工期，以及关键路径（红色高亮）。支持 FS/SS/FF/SF 依赖 + lag/lead、三点估算（`te + 方差`）、里程碑、泳道（`lane:`）和时间刻度布局。

```
pert
title: "Q3 Product Launch"
unit: days

task A "Market research"      duration: 5
task B "Design mockups"       duration: 8  after: A
task C "Backend API"          duration: 15 after: A
task D "Frontend build"       duration: 10 after: B, C
task E "QA / testing"         duration: 5  after: D
task F "Marketing collateral" duration: 7  after: B
task G "Launch event"         duration: 2  after: E, F
```

[PERT / CPM 语法 →](https://schematex.js.org/docs/pert)

---

### ◉ Petri 网 —— *Murata 1989 / ISO-IEC 15909 库所-变迁网*

唯一一个**理解动态语义**、而不只是画形状的文本 DSL Petri 网工具。你声明库所（装 token 的圆）、变迁（横条）和加权弧；引擎校验二部结构、计算当前标识下哪些变迁**使能**（绿色高亮），并能 `fire:` 一个序列前推到任意可达标识。即时 vs 定时变迁、弧权重、容量，以及抑制弧 / 读弧 / 复位弧 —— 完整的并发词汇。

```
petri "Mutual Exclusion — two processes, one resource"
  place idleA *1 "A idle"
  place idleB *1 "B idle"
  place mutex *1 "resource"
  place critA "A critical"
  place critB "B critical"
  transition enterA
  transition exitA
  transition enterB
  transition exitB
  idleA -> enterA
  mutex -> enterA
  enterA -> critA
  critA -> exitA
  exitA -> idleA
  exitA -> mutex
  idleB -> enterB
  mutex -> enterB
  enterB -> critB
  critB -> exitB
  exitB -> idleB
  exitB -> mutex
```

![Mutual Exclusion Petri Net](examples/petri/mutual-exclusion.svg)

[Petri 网语法 →](https://schematex.js.org/docs/petri)

---

### 🖧 网络拓扑图 Network topology —— *Cisco 约定图标 · 设备 / 链路 / 端口完整性*

免费、文本优先、零依赖的网络拓扑引擎。声明带类型的设备（路由器、交换机、防火墙、AP、服务器、**IP 摄像机 / NVR / PoE 交换机** ……）和带类型、带标注的链路（copper / fiber / wireless / serial / **PoE** / VPN / LAG，携带 VLAN / 速率 / 端口 / 模式），把它们组进站点、机柜、子网、VLAN，引擎按拓扑类别正确布局 —— `tiered`（三层园区网）、`star`、`ring`、`bus`、`mesh`、`spine-leaf`（自动 mesh 的 Clos）、`tree`。和直接吐原始 Mermaid 的 LLM 不同，它**绝不丢设备、丢端口、丢链路**，还校验 IP 是否在子网内、VLAN 范围是否合法。

```
network "Acme HQ — CCTV"
  layout: tiered
  internet net "Internet"
  firewall fw1 "Perimeter FW" tier: edge
  l3switch core1 "Core SW" tier: core
  poeswitch poe1 "PoE Switch A" tier: access
  poeswitch poe2 "PoE Switch B" tier: access
  nvr nvr1 "Video Recorder"
  monitor wall1 "Guard Station"
  subnet cams "192.168.20.0/24" {
    camera cam1 "Lobby Dome" type: dome ip: 192.168.20.11
    camera cam2 "Gate PTZ" type: ptz ip: 192.168.20.12
    camera cam3 "Dock Bullet" type: bullet ip: 192.168.20.13
    poe1
    poe2
  }
  net -- fw1 : wan "ISP 1Gbps"
  fw1 -- core1 : fiber 10G
  core1 -- poe1 : trunk vlan: 20 1G
  core1 -- poe2 : trunk vlan: 20 1G
  core1 -- nvr1 : 1G
  core1 -- wall1
  poe1 -- cam1 : poe
  poe1 -- cam2 : poe
  poe2 -- cam3 : poe
```

![CCTV camera network topology](examples/network/cctv-camera-network.svg)

[网络拓扑语法 →](https://schematex.js.org/docs/network)

---

### 📐 UML 类图 —— *UML 2.5.1 §9–§11*

分类器（class / interface / enum / datatype / primitive）、全部 6 种关系及标准正确的修饰符，以及**由泛化关系驱动的分层布局**（父类浮到顶部，连线绝不穿过方块）。命名空间渲染为嵌套的包含框。接受 Mermaid `classDiagram` 字形，一行即可迁移。

```
umlclass
title: "Shape hierarchy"

«interface» Shape {
  + area() : double
  + perimeter() : double
}

abstract class AbstractShape {
  # name : String
  + area() : double {abstract}
  + perimeter() : double {abstract}
  + describe() : String
}

class Circle {
  + radius : double
  + area() : double
}

class Square {
  + side : double
  + area() : double
}

Shape         <|.. AbstractShape
AbstractShape <|-- Circle
AbstractShape <|-- Square
```

![UML class shape hierarchy](examples/umlclass/shape-hierarchy.svg)

[UML 类图语法 →](https://schematex.js.org/docs/umlclass)

---

### 🛡️ 故障树 Fault tree —— *NUREG-0492 / IEC 61025 · MOCUS*

可靠性故障树，引擎**计算结果**：跑 MOCUS 枚举最小割集（红框）、标记单点失效、计算顶事件概率。AND 圆顶、OR/XOR 盾形、k-of-n 表决、INHIBIT、PAND。

```
faulttree "Both pumps fail"
  analysis: cutsets, probability
  top T "Both redundant pumps fail" = AND(PA, PB)
  basic PA "Pump A fails" p: 0.01
  basic PB "Pump B fails" p: 0.01
```

![Redundant pump fault tree](examples/faulttree/pump-redundancy.svg)

[故障树语法 →](https://schematex.js.org/docs/faulttree)

---

### 🎀 领结图 Bowtie —— *CCPS / Energy Institute 2018 屏障模型*

针对单个重大事故场景的、基于屏障的风险管理：威胁从左侧经预防性屏障链汇入，后果从右侧经缓解性屏障链发散，中间是顶事件「结」。**构造即正确** —— 任何没有屏障的威胁或后果会被拒绝，而不是悄悄画出来。

```
bowtie "LPG storage — loss of containment"
hazard "LPG stored under pressure"
topevent "Loss of containment"
threat "Corrosion of vessel wall"
  prevent "Corrosion-resistant coating"
  prevent "UT thickness inspection"
threat "Overpressure during filling"
  prevent "High-pressure trip (SIL 2)"
  prevent "Pressure relief valve"
consequence "Jet fire"
  mitigate "Gas detection + ESD"
  mitigate "Deluge / water spray"
consequence "Vapour cloud explosion"
  mitigate "Ignition-source control (ATEX)"
  mitigate "Blast-resistant control room"
```

![LPG loss-of-containment bowtie](examples/bowtie/lpg-loss-of-containment.svg)

[领结图语法 →](https://schematex.js.org/docs/bowtie)

## 为什么选 SchemaTex？

**通用流程图工具画不出专业图。** 每个图领域都有发布的标准 —— 符号约定、布局规则、标注文法 —— 一旦忽略，领域专家就不认：

- **家系图**遵循 [McGoldrick (2020)](https://en.wikipedia.org/wiki/Genogram) 标准 —— 性别专属形状、疾病填充图案、情感关系线型、按代布局。流程图里一个标着「女性」的圆圈不是家系图。
- **梯形图**遵循 [IEC 61131-3](https://en.wikipedia.org/wiki/IEC_61131-3) + Allen-Bradley 标签约定 —— 三行标注（标签 / 地址 / 描述）、Set/Reset 线圈、输入侧自锁、并联梯级。
- **单线图**遵循 [IEEE 315](https://standards.ieee.org/ieee/315/5052/) —— 保护设备聚类、电压层级、变压器符号。
- **谱系图**遵循 NSGC 人类谱系命名法；**系统发育树**与 Newick + NHX 双向往返；**股权结构表**计算层级感知的所有权汇总。

SchemaTex 把每个标准当作一等公民，配以自己的 parser、布局算法、SVG 渲染器 —— **标准即代码**，而不是套了领域标签的通用形状。

没有任何现存开源库覆盖这个广度。GoJS 有零散样例但 **$7k+/席位**。Schemdraw 只支持 Python。draw.io 是个重型 GUI。其余的要么闭源、要么已弃维护。

### 为 LLM 代码生成而设计

SchemaTex 的 DSL 小巧、一致，并且是按「LLM 常犯什么错」来塑形的：

- 每种图都有一份极简、文档化的文法，LLM 看一个示例就能学会。
- 错误信息对 AI 友好 —— 行号 + 具体修复建议，而不是 `Parse error at line 42`。
- 语法规避了常见的 LLM 失败模式（CJK 引号、模糊嵌套、位置参数 vs 命名参数）。

由人编写，由 LLM 的常见错误塑形。

## 特性

- **零运行时依赖。** 无 D3、无 dagre、无 parser 生成器。手写 parser 与布局引擎。自包含 TypeScript。
- **标准合规输出。** 每种图实现一份已发布的规范，而非我们自创。
- **语义化 SVG。** 每个元素都有可访问的 `<title>` / `<desc>`、可主题化的 CSS class、可交互的 `data-*` 属性。无 inline style。
- **可 tree-shake 的插件架构。** 每种图是独立插件，自带 parser、布局、渲染器。`schematex/genogram` → ~30 KB。
- **SSR 友好。** 纯字符串输出，不需要 DOM。可在 Node、edge runtime、浏览器中运行。
- **TypeScript strict。** 无 `any`，无未类型化的逃逸口子。

## API

```ts
// 通用入口 —— 从第一个关键字自动推断图类型
import { render, renderPreview, renderResult, parse, parseResult } from 'schematex';

const svg = render(text, config?);              // 严格模式 → SVG 字符串，否则抛错
const ast = parse(text, config?);               // 严格模式 → AST，否则抛错
const previewSvg = renderPreview(text, config?); // 总是 → SVG，含可见的诊断兜底
const renderState = renderResult(text, config?); // → SVG + 诊断 + valid/partial/invalid 状态
const parseState = parseResult(text, config?);   // → AST 或诊断，不抛错

// 按图 tree-shake
import { render } from 'schematex/genogram';

// 浏览器 DOM
import {
  renderToElement,
  renderToContainer,
  renderPreviewToElement,
  renderPreviewToContainer,
} from 'schematex/browser';
container.appendChild(renderToElement(dsl));

// React
import { SchematexDiagram } from 'schematex/react';
// <SchematexDiagram dsl="genogram ..." theme="monochrome" />

// 导出（浏览器 Canvas）
import { svgToPngBlob, downloadBlob, printSvgAsPdf } from 'schematex/export';
const blob = await svgToPngBlob(svg, { scale: 2 });           // 透明 PNG
const opaque = await svgToPngBlob(svg, { background: 'white' }); // 选择性填充背景
downloadBlob(blob, 'diagram.png');
```

参见 [API 参考 →](https://schematex.js.org/docs/api)。

### 背景与暗色模式

Schematex 的 SVG **默认与背景无关** —— 输出里不烘焙任何填充，所以图会继承宿主元素提供的颜色。同一个 SVG 因此能嵌入浅色页面、暗色画布或打印 PDF。

使用 `theme: "dark"` 时，图的描边和文字是为暗色表面设计的 —— 请把 SVG 包进一个暗色背景的容器，例如：

```html
<div style="background: #0f172a; padding: 16px;">
  <!-- 使用 theme: "dark" 的 schematex SVG -->
</div>
```

PNG 导出（`svgToPngBlob`）默认透明背景。传 `background: 'white'`（或任意颜色）来烘焙一个背景。

## 生态

- **React** —— `schematex/react` —— `<SchematexDiagram dsl="..." />` 组件
- **浏览器** —— `schematex/browser` —— `renderToElement()` / `renderToContainer()`
- **导出** —— `schematex/export` —— PNG（@2×）+ 经浏览器 Canvas 打印 PDF
- **Obsidian** —— 代码块渲染插件 *(即将推出)*
- **Markdown-it / remark** —— 图围栏支持 *(即将推出)*
- **CLI** —— `npx schematex input.txt > output.svg` *(即将推出)*

## 贡献

欢迎贡献。见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

新增一种图遵循 5 文件模式（parser、symbols、layout、renderer、集成）。每种类型在 [`docs/reference/`](./docs/reference/) 都有一份标准文档。

```bash
npm install
npm run typecheck
npm run test
npm run build
```

## 许可证

[AGPL-3.0](./LICENSE) 用于开源用途。若需无 AGPL 义务的商业使用（将 SchemaTex 嵌入专有 / 闭源产品），提供商业授权 —— 联系 **victor@mymap.ai**。

<p align="center"><sub>由 <a href="https://mymap.ai">MyMap.ai</a> 打造。</sub></p>
