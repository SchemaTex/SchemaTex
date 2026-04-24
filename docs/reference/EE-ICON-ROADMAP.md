# EE Icon Roadmap

*基于 2026-04-21 的 icon 覆盖度评估，列出按优先级的 icon 增补建议。*

> **审议原则（必读）：** 每个新增 icon 必须能回答两个问题：
> 1. **哪个发布的标准要求它？**（IEEE / IEC / ANSI / ISA / ISO / NEMA / UML / McGoldrick / …）
> 2. **哪群职业用户画这种图时，没它就画不对？**
>
> 不满足以上两条的 icon 一律不加——Schematex 的差异化是「专业标准合规」，不是「图形丰富度」。如果单纯为了"好看"或"功能齐全"扩充，会把项目带向 Mermaid / draw.io 的通用路线，失去市场定位。
>
> **另一条硬约束：** 不做中央 `Icon` 接口。每种 diagram 保留自己 `src/diagrams/{type}/symbols.ts`（circuit 用 `SymbolDef.svg()`，SLD 用 `SymbolGeometry`，logic 用 `GateGeometry`），三种模型本质不同（pin 语义 / 垂直 bus / 参数化输入数）。真正共享的只有 `src/core/svg.ts` 的 SVG builder。

---

## 优先级总览

| 档 | 用途 | 数量 | 目标时间 |
|----|------|------|---------|
| 🔴 **P0** | 阻塞新 diagram（state / P&ID） | 约 50 | 跟 state + P&ID 同期 |
| 🟡 **P1** | 补现有 diagram 的明显短板 | 约 20 | state + P&ID 之后 |
| 🟢 **P2** | 窄领域 / 工程量大 / 可延后 | 约 10 | 有具体用户需求再做 |

---

## 🔴 P0 — 阻塞新 diagram

### P0.1 State Diagram — Pseudo-states（UML 2.5 §14.2.3.6）

详见 [16-STATE-DIAGRAM-STANDARD.md](16-STATE-DIAGRAM-STANDARD.md) §1.4。

| # | Icon | 标准 | 实现复杂度 |
|---|------|------|-----------|
| 1 | Initial pseudo-state（实心圆 `r=6`） | UML 2.5 | 极低 |
| 2 | Final state（同心圆 outer `r=10` + 实心 `r=5`） | UML 2.5 | 极低 |
| 3 | Choice pseudo-state（空心菱形 20×20） | UML 2.5 | 低 |
| 4 | Junction pseudo-state（实心小圆 `r=4`） | UML 2.5 | 极低 |
| 5 | Fork bar / Join bar（粗黑长条 4×60 或 60×4） | UML 2.5 | 低 |
| 6 | Shallow history（`H` 内圆） | UML 2.5 | 低 |
| 7 | Deep history（`H*` 内圆） | UML 2.5 | 低 |
| 8 | Entry point / Exit point（空心小圆 + ✕ 叠加） | UML 2.5 | 低 |
| 9 | Terminate pseudo-state（✕ 12×12） | UML 2.5 | 极低 |
| 10 | Note body（淡黄矩形 + 虚线 leader） | UML convention | 低 |

**工作量：** ~8-10h（几何简单，主要在 layout 内定位）
**用户价值：** 软件工程师、reactive-system designer、controls engineer。Mermaid 只支持其中 5 个，Schematex 做完后是严格超集。

### P0.2 P&ID — ISA-5.1 核心符号

详见 [17-PID-STANDARD.md](17-PID-STANDARD.md) §1–§4。

**Equipment（P0: 5 种）：**
| # | Icon | 标准 | 说明 |
|---|------|------|------|
| 11 | Centrifugal pump（圆 + 右三角） | ISO 10628 | Core |
| 12 | Vertical vessel（圆柱 + 2:1 椭球端封） | ISO 10628 | Core |
| 13 | Atmospheric tank（矩形 + 顶 dome） | ISO 10628 | Core |
| 14 | Shell & tube HX（横圆柱 + tube bundle） | ISO 10628 | Core |
| 15 | Tray column（竖圆柱 + N 条水平线） | ISO 10628 | Core |

**Valves（P0: 4 种 + control）：**
| # | Icon | 标准 |
|---|------|------|
| 16 | Gate valve（bowtie） | ISA-5.1 |
| 17 | Globe valve（bowtie + 顶小圆） | ISA-5.1 |
| 18 | Ball valve（bowtie + 中心实心圆） | ISA-5.1 |
| 19 | Check valve（bowtie + 向心弧） | ISA-5.1 |
| 20 | Control valve（valve body + diaphragm actuator） | ISA-5.1 |

**Instrument bubbles（P0: 4 变体）：**
| # | Icon | ISA-5.1 分类 |
|---|------|-----|
| 21 | Field discrete（圆，无穿线） | §4.5.1 |
| 22 | Control-room shared / DCS（圆 + 内六边形 + 横线） | §4.5.2 |
| 23 | Computer function（圆 + 内菱形 + 横线） | §4.5.3 |
| 24 | PLC logic（圆 + 内方形 + 横线） | §4.5.4 |

**Line types（P0: 3 种）：**
| # | Icon | 标准 |
|---|------|------|
| 25 | Major process line（粗实线） | ISA-5.1 §5.1 |
| 26 | Pneumatic signal（实线 + 斜杠 hatch） | ISA-5.1 §5.2 |
| 27 | Electric signal（虚线） | ISA-5.1 §5.2 |

**工作量：** ~40-50h（几何比 state 复杂；column 和 HX 要参数化）
**用户价值：** 化工 / 石化 / 制药 / 水处理 / 发电过程工程师 + 安全工程师 + OSHA PSM 合规交付。

---

## 🟡 P1 — 补现有 diagram 的明显短板

### P1.1 Circuit Schematic

| # | Icon | 标准 | 为什么缺失成问题 |
|---|------|------|-----------------|
| 28 | Op-amp topology preset（inverting / non-inverting / integrator / differentiator 完整连接图） | 教科书通识 | 现在只有单 op-amp symbol，实际使用必须手动连 R/C |
| 29 | Op-amp with ±V power rails（三角 + 顶/底 ±V 端子） | IEEE 315 | 现在的三角没有 power，专业评审过不去 |
| 30 | 555 timer pin-out block（8 pin DIP 矩形） | Philips/TI datasheet | 555 是入门电路高频元件 |
| 31 | Crystal oscillator（长椭圆 + 两端引脚） | IEEE 315 | 数字电路 clock source 必备 |
| 32 | Photodiode / Phototransistor（diode/transistor + 向内箭头） | IEC 60617 | 现有 diode/transistor 无光敏变体 |
| 33 | LED（diode + 向外双箭头） | IEC 60617 | LED 远比普通 diode 高频 |
| 34 | Ground 三变体（earth / chassis / signal）区分 | IEC 60617 §02-15 | 现在只有一种 ground，混用会引发调试问题 |

**工作量：** ~12-16h
**用户价值：** 电子工程师、教育、嵌入式开发者。

### P1.2 SLD（Single-Line Diagram）

| # | Icon | 标准 | 为什么缺失成问题 |
|---|------|------|-----------------|
| 35 | Battery bank（短+长交替水平线堆叠） | IEEE 315 | 储能 / UPS / 离网系统入图必备 |
| 36 | Inverter（方形 + 内 `DC/AC` 或方波-正弦） | IEEE 315 | 光伏 / 储能并网核心（不同于现有 VFD） |
| 37 | Disconnect switch / visible break（刀闸，45° 开路） | IEEE 315 + NEC 2023 | NEC 要求 visible break，现有 switch 未区分 |
| 38 | Neutral grounding resistor (NGR) / reactor | IEEE 32 | 中性点接地保护 |
| 39 | Lightning arrester（与 surge arrester 区分：伞形 vs 矩形） | IEEE 315 | 现有 surge_arrester 不覆盖户外线路防雷 |

**工作量：** ~6-8h
**用户价值：** 电力工程师、配电设计、光伏 / 储能 EPC。

### P1.3 Ladder Logic

| # | Icon | 标准 | 为什么缺失 |
|---|------|------|-----------|
| 40 | Timer function blocks 完整外框（TON / TOF / TP） | IEC 61131-3 §2.5.2.3.3 | 现有 timer 符号较基础，缺少 PT / ET / Q 端子展示 |
| 41 | Counter function blocks（CTU / CTD / CTUD） | IEC 61131-3 | 同上 |
| 42 | Compare instructions（GRT / LES / EQU / NEQ / LEQ / GEQ） | IEC 61131-3 / Rockwell | PLC 梯形图高频 |

**工作量：** ~5-7h
**用户价值：** PLC 工程师、工业自动化、SCADA 开发者。

---

## 🟢 P2 — 窄领域 / 工程量大 / 可延后

| # | Icon / 能力 | 说明 | 为什么延后 |
|---|-----------|------|-----------|
| 43 | 三相 Y/Δ 绕组完整展开图 | 细致三相变压器连接 | 多数 SLD 仅到 winding designator (Y/Δ) 级别已够；完整展开图工程量 ≈ 一个独立 diagram |
| 44 | PWM / Buck / Boost 开关波形 | 半导体 switching 分析 | 已有 timing diagram 能覆盖 80% 场景，补差专用 sub-diagram 不划算 |
| 45 | Protection relay coordination (TCC) 曲线 | 继电保护整定 | 这是 **独立 diagram（log-log plot）**，不是 icon，若做需新开 `relay-coord` 类型 |
| 46 | Smith chart / RF transmission line | 射频设计 | 窄领域 + 专业 RF 工具已饱和（ADS / Qucs），Schematex 进入收益低 |
| 47 | PCB layout / routing 符号 | PCB 设计 | 完全另一世界（KiCad / Altium），**建议明确不做** |
| 48 | Bode plot / Nyquist / root locus | 控制系统频域分析 | 独立 diagram，若做需新开 `frequency-response` 类型 |

---

## 建议的执行顺序

```
┌─────────────────────────┐
│ 1. State diagram        │  P0.1 (10 icons, ~8-10h)
│    + Mermaid 兼容层     │
└─────────────────────────┘
            ↓
┌─────────────────────────┐
│ 2. Evaluate & ship      │  用户反馈窗口
│    (blog / Show HN)     │
└─────────────────────────┘
            ↓
┌─────────────────────────┐
│ 3. Circuit P1 补强      │  P1.1 (7 icons, ~12-16h)
│    op-amp topology 优先 │
└─────────────────────────┘
            ↓
┌─────────────────────────┐
│ 4. P&ID MVP             │  P0.2 (~27 icons, ~40-50h)
│    一个典型 control loop│
└─────────────────────────┘
            ↓
┌─────────────────────────┐
│ 5. P&ID P1 extend       │  按用户反馈选择
│    + SLD P1.2           │
│    + Ladder P1.3        │
└─────────────────────────┘
```

---

## 决策日志

- **2026-04-21** — Victor 决定 state + P&ID 为下一阶段主要方向。P&ID 单独立项，不与 SLD 合并（符号集完全独立）。不扩充统一 Icon library（保留各 diagram 独立 symbols 文件）。SLD 的 `src/diagrams/sld/symbols.ts` 冗余 `lineEl` / 直接 `el("line", ...)` 调用已改为使用 `src/core/svg.ts` 的 `line()`。
