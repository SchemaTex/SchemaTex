# 11a — State Diagram Standard Reference

*UML 2.5 State Machine Diagram + Harel 1987 Statechart. Covers simple states, composite/nested states, pseudo-states, transitions with trigger/guard/action, and orthogonal regions.*

> **Primary References:**
> - OMG UML 2.5.1 §14 (State Machines): https://www.omg.org/spec/UML/2.5.1/
> - Harel, D. (1987). *Statecharts: A visual formalism for complex systems.* Sci. Comp. Programming, 8(3).
> - ISO/IEC 19505-2:2012 (UML Superstructure)
> - SysML v1.6 §13 (reuse of UML state machines)

**Positioning:** Mermaid/PlantUML 把 state diagram 当成"圆角矩形 + 箭头"；Schematex 按 UML 2.5 具体节元素 (pseudo-state kinds, composite regions, internal activities) 完整渲染，让软件工程师、controls engineer、reactive-system designer 画的图能直接用于规范评审。

**相对 Mermaid 的差异化（我们是严格超集）：**

| 特性 | Mermaid | Schematex |
|------|---------|-----------|
| Simple / composite state | ✅ | ✅ |
| Initial / final (`[*]`) | ✅ | ✅（同时兼容 `[*]` 作为别名） |
| Choice / fork / join | ✅（stereotype 语法） | ✅（一等关键字） |
| Notes on state (left/right) | ✅ | ✅ |
| Concurrent regions | ✅（`--`） | ✅（`---`） |
| Direction (LR/TB) | ✅ | ✅ |
| **Entry / exit / do activities** | ❌ | ✅（UML 14.2.3.4.3） |
| **Trigger [guard] / action transition label** | ❌ | ✅（UML 14.2.4.9 完整形式） |
| **Internal transitions** | ❌ | ✅ |
| **History / Deep history (H / H\*)** | ❌ | ✅ |
| **Junction pseudo-state** | ❌ | ✅ |
| **Entry / exit point (on composite border)** | ❌ | ✅ |
| **Terminate (✕)** | ❌ | ✅ |
| **Cross-composite transitions** | ❌（明确限制） | ✅（按 ID 直连） |
| Self-transition arc | 有限 | ✅（UML 风格弧线） |

Schematex 覆盖 Mermaid 的**所有已有特性**，并实现 Mermaid 文档明确不支持的 UML 2.5 元素。Mermaid-style DSL 片段可直接移植（见 §11 兼容性）。

---

## 1. State & Pseudo-State Symbol Set

所有坐标基于 **120×60px 归一化空间**（典型 simple state），pseudo-states 为 `20×20` 或更小。

### 1.1 Simple State

圆角矩形 + 状态名称（顶部）+ 可选 activity compartment。

- **形状**: rounded rect, `rx=ry=8`
- **默认尺寸**: `width=120, height=40`（仅名称）/ `height≥60`（带 activities）
- **SVG**:
  ```svg
  <rect class="lt-state-body" x="0" y="0" width="120" height="60" rx="8" ry="8"/>
  <text class="lt-state-name" x="60" y="16" text-anchor="middle">StateName</text>
  <line class="lt-state-div" x1="0" y1="22" x2="120" y2="22"/>
  <text class="lt-state-activity" x="6" y="36">entry / startTimer()</text>
  <text class="lt-state-activity" x="6" y="50">do / poll()</text>
  ```
- **Activity labels (UML 14.2.3.4.3)**:
  - `entry / action` — 进入时执行
  - `exit / action` — 退出时执行
  - `do / activity` — 驻留期间持续执行
  - `trigger [guard] / action` — 内部 transition（不离开 state）

### 1.2 Composite State (Nested)

外框圆角矩形 + 内部包含 sub-states。标题栏分隔线。

- **形状**: 同 simple state 但尺寸大，内部嵌套 layout
- **Padding**: 外框内至少 `24px top`（标题栏）+ `16px` 四周给 nested states
- **SVG**:
  ```svg
  <g class="lt-state lt-composite" data-id="Active">
    <rect class="lt-state-body" x="0" y="0" width="300" height="180" rx="10" ry="10"/>
    <text class="lt-state-name" x="12" y="18">Active</text>
    <line class="lt-state-div" x1="0" y1="24" x2="300" y2="24"/>
    <!-- nested sub-states rendered inside with transform="translate(px, py)" -->
  </g>
  ```

### 1.3 Orthogonal (Parallel) Regions

Composite state 内部通过**虚线**分隔为多个并发 region（UML 14.2.3.8）。

- **分隔线**: 虚线 `stroke-dasharray="6 4"`
- **每个 region** 有独立的 initial pseudo-state 和 final state
- **SVG（水平分隔 2 region）**:
  ```svg
  <line class="lt-region-div" x1="0" y1="100" x2="300" y2="100"
        stroke-dasharray="6 4"/>
  ```

### 1.4 Pseudo-States (UML 14.2.3.6)

| Kind | Symbol | Geometry | SVG |
|------|--------|----------|-----|
| **Initial** | 实心黑圆 | `r=6` | `<circle r="6" class="lt-ps-initial"/>` |
| **Final** | 同心圆（外圆 + 实心小圆） | outer `r=10`, inner `r=5` | `<circle r="10" .../><circle r="5" class="lt-ps-final-dot"/>` |
| **Terminate** | ✕ 叉 | `12×12` | 两条对角 `<line>` |
| **Choice** | 菱形（空心） | 20×20 | `<polygon points="10,0 20,10 10,20 0,10"/>` |
| **Junction** | 实心小圆 | `r=4` | `<circle r="4" class="lt-ps-junction"/>` |
| **Fork / Join** | 粗黑长条 | `4×60`（竖）或 `60×4`（横） | `<rect class="lt-ps-bar"/>` |
| **Shallow History** | 带 `H` 的圆 | `r=10` | `<circle r="10"/><text>H</text>` |
| **Deep History** | 带 `H*` 的圆 | `r=10` | `<circle r="10"/><text>H*</text>` |
| **Entry Point** | 空心小圆（stuck on border） | `r=5`, fill=white | `<circle r="5" fill="white"/>` |
| **Exit Point** | 空心小圆 + ✕ 叠加 | `r=5` | circle + `<line>` ✕ |
| **Submachine ref** | 圆角矩形 + `:Submachine` stereotype | 同 simple state | text with italic stereotype |

---

## 2. Transitions

### 2.1 Transition Arrow

- **单向箭头**: 开放三角 arrowhead, `stroke-width=2`
- **Path**: 正交优先，允许单一斜线用于 self-transition loop
- **Label placement**: 线段中点上方 `6px`（长横段）或右侧 `8px`（长竖段）

```svg
<marker id="lt-state-arrow" markerWidth="10" markerHeight="10"
        refX="9" refY="3" orient="auto">
  <polygon points="0,0 10,3 0,6" fill="#333"/>
</marker>
<path class="lt-transition" d="M x1,y1 L x_bend,y1 L x_bend,y2 L x2,y2"
      marker-end="url(#lt-state-arrow)"/>
<text class="lt-transition-label" x="x_mid" y="y_mid-6">
  event [guard] / action
</text>
```

### 2.2 Trigger [Guard] / Action Format（UML 14.2.4.9）

```
<trigger> [<guard>] / <action>
```

- 三段**全部可选**（空 transition = completion / anonymous）
- 多 trigger 用逗号：`tick, tock [count > 0] / reset()`
- Action 可多条，分号分隔：`/ log(); increment()`
- Guard 在方括号中，布尔表达式

### 2.3 Self-Transition

箭头从 state 边界出发绕回同一 state。

- **几何**: 右上角四分之一圆弧，半径 20px
- **Path**: `M x_right, y_top Q x_right+30, y_top-10  x_right+20, y_top-30 T x_top_near_right, y_top`

### 2.4 Internal Transition

不离开 state，写在 state 内部 activity compartment：
```
StateName
--
entry / init()
tick [ready] / count++   ← internal transition
exit / cleanup()
```

### 2.5 Completion (Anonymous) Transition

无 trigger 的箭头 — 当 state 的 `do` activity 完成或所有内部条件满足时自动触发。标签可省略或仅写 `/ action`。

### 2.6 Fork / Join Semantics

- **Fork bar**: 1 input → N parallel outputs（进入 orthogonal regions）
- **Join bar**: N inputs → 1 output（等所有 region 完成）
- 条形宽度由最远 source/target 决定

### 2.7 Choice vs Junction

| 元素 | 语义 | 守卫位置 |
|------|------|---------|
| **Choice (菱形)** | Dynamic — 在到达时评估 | 每个出口 transition 的 `[guard]` |
| **Junction (小圆)** | Static merge — 合并入口/分流 | 同上，但组合式静态 |

---

## 3. Layout Conventions

### 3.1 Primary Flow

- **默认方向**: 左 → 右 或 上 → 下（和 composite state 内部保持一致）
- **Initial pseudo-state**: 通常放在左上或顶部
- **Final state**: 通常放在右下或底部

### 3.2 Layout Algorithm

State diagram 布局 ≈ **layered DAG with nested containers + self-loop handling**：

1. **容器展开**: composite state 递归 layout，得到 nested bbox
2. **层级分配**: 拓扑排序（忽略 self-loop），initial 为第 0 层
3. **同层排序**: 减少交叉的中位数 heuristic（参考 flowchart Brandes-Köpf）
4. **坐标赋值**:
   - `x = layer × 180 + padding`
   - `y = position_in_layer × 100 + padding`
   - Composite state 内部偏移 `(24, 32)`（标题栏 + padding）
5. **Transition routing**: Manhattan，绕开 state bbox
6. **Self-loop**: 预留右上角 40×40 区域

### 3.3 Label Collision

长 transition label（e.g. `request [authenticated && !rate_limited] / log("granted")`）超过 `80px` 时：
- 换行，`text-anchor=middle`，多 `<tspan>` 堆叠
- 整 label 块中心对齐到线段中点

---

## 4. DSL Grammar

```ebnf
document     = header statement*
header       = "state" quoted_string? props? NEWLINE
props        = "[" prop ("," prop)* "]"
prop         = "direction:" ("LR" | "TB")
             | "style:" ("uml" | "harel")

statement    = comment
             | state_def
             | composite_def
             | transition
             | pseudo_def
             | region_sep
             | note_def

comment      = "#" [^\n]* NEWLINE

state_def    = IDENT state_body? NEWLINE
state_body   = ":" quoted_string                      # display label
             | "{" activity_list "}"                  # activity block
activity_list = activity (";" activity)*
activity     = ("entry" | "exit" | "do") "/" action_text
             | trigger "[" guard "]" "/" action_text  # internal trans

composite_def = "composite" IDENT "{" NEWLINE
                   statement*
                "}" NEWLINE

region_sep   = "---" NEWLINE                          # orthogonal divider inside composite

pseudo_def   = "initial" IDENT NEWLINE
             | "final" IDENT NEWLINE
             | "choice" IDENT NEWLINE
             | "junction" IDENT NEWLINE
             | "fork" IDENT NEWLINE
             | "join" IDENT NEWLINE
             | "history" IDENT NEWLINE                # shallow
             | "dhistory" IDENT NEWLINE               # deep
             | "entry_point" IDENT NEWLINE
             | "exit_point" IDENT NEWLINE
             | "terminate" IDENT NEWLINE

transition   = (IDENT | "[*]") "->" (IDENT | "[*]") label_clause? NEWLINE
label_clause = ":" trans_label

note_def     = "note" ("left_of" | "right_of") IDENT ":" note_text NEWLINE
             | "note" IDENT "{" NEWLINE note_text_line+ "}" NEWLINE
note_text    = /[^\n]+/
note_text_line = /[^\n]*/ NEWLINE
trans_label  = trigger? ("[" guard "]")? ("/" action_text)?
trigger      = IDENT ("," IDENT)*
guard        = /[^\]]+/
action_text  = /[^\n;]+/ (";" /[^\n;]+/)*

IDENT        = /[a-zA-Z_][a-zA-Z0-9_]*/
quoted_string= '"' /[^"]*/ '"'
NEWLINE      = /\n/
```

---

## 5. DSL Examples

### 5.1 Simple Traffic Light

```
state "Traffic Light" [direction: LR]

initial i
final f

i -> Red
Red -> Green : timer
Green -> Yellow : timer
Yellow -> Red : timer
Red -> f : power_off
```

### 5.2 Login with Guard & Action

```
state "Login Flow"

initial i
i -> Idle

Idle -> Authenticating : submit [form_valid] / clearErrors()
Authenticating -> Authenticated : ok / storeToken()
Authenticating -> Idle : fail [retries < 3] / incrementRetries()
Authenticating -> Locked : fail [retries >= 3]

choice Decide
Authenticated -> Decide
Decide -> Admin : [role == "admin"]
Decide -> User  : [role == "user"]
```

### 5.3 Composite State with Entry/Exit Activities

```
state "Media Player"

initial i
i -> Stopped

Stopped -> Playing : play / loadSource()
Playing -> Paused : pause
Paused -> Playing : play
Playing -> Stopped : stop / releaseSource()

composite Playing {
  entry / startBuffer()
  exit / stopBuffer()
  do / decodeFrames()

  initial pi
  pi -> Buffering
  Buffering -> Streaming : buffer_full
  Streaming -> Buffering : underflow
}
```

### 5.4 Orthogonal Regions (Fork/Join)

```
state "Session"

initial i
fork F
join J
final f

i -> F
composite Active {
  ---
  # Region 1: connection
  initial r1i
  r1i -> Connected
  Connected -> Disconnected : drop
  Disconnected -> Connected : retry
  ---
  # Region 2: activity
  initial r2i
  r2i -> Idle
  Idle -> Busy : request
  Busy -> Idle : done
}
F -> Active
Active -> J : logout
J -> f
```

### 5.5 Notes on States

```
state "Auth Flow"

initial i
i -> Idle
Idle -> Checking : submit
Checking -> Idle : fail
Checking -> Done : ok

note right_of Checking : Calls /api/verify synchronously.
note left_of Idle {
  Entry page for anonymous users.
  Redirect here on 401.
}
```

渲染：note 为淡黄色矩形（UML convention），通过虚线 leader 连到目标 state。Block form（`note ID { ... }`）支持多行。

### 5.6 Mermaid 兼容形式（`[*]` 初始/终止）

Schematex 接受 `[*]` 作为 `initial` / `final` 的别名（根据箭头方向自动解析）：

```
state

[*] -> Loading
Loading -> Ready : ok
Ready -> [*]
```

等价于：
```
state
initial i
final f
i -> Loading
Loading -> Ready : ok
Ready -> f
```

### 5.7 History Pseudo-State

```
state "Document Editor"

initial i
i -> Editing

composite Editing {
  history H

  initial ei
  ei -> Normal
  Normal -> Selecting : click_drag
  Selecting -> Normal : release
  Normal -> Inserting : key_press
  Inserting -> Normal : escape
}

Editing -> Paused : user_idle
Paused -> H : user_active   # resume at last sub-state
```

---

## 6. SVG Structure

```xml
<svg class="lt-state" data-diagram-type="state">
  <defs>
    <style>
      .lt-state-body     { fill: white; stroke: #333; stroke-width: 2; }
      .lt-state-name     { font: bold 12px sans-serif; fill: #333; }
      .lt-state-div      { stroke: #333; stroke-width: 1; }
      .lt-state-activity { font: 10px monospace; fill: #444; }
      .lt-composite .lt-state-body { fill: #fafafa; }
      .lt-region-div     { stroke: #888; stroke-dasharray: 6 4; }

      .lt-ps-initial     { fill: #333; }
      .lt-ps-final       { fill: white; stroke: #333; stroke-width: 2; }
      .lt-ps-final-dot   { fill: #333; }
      .lt-ps-choice      { fill: white; stroke: #333; stroke-width: 2; }
      .lt-ps-junction    { fill: #333; }
      .lt-ps-bar         { fill: #222; }
      .lt-ps-history     { fill: white; stroke: #333; stroke-width: 2; }
      .lt-ps-history-label { font: bold 11px serif; fill: #333; }

      .lt-transition     { stroke: #333; stroke-width: 1.5; fill: none; }
      .lt-transition-label { font: 10px sans-serif; fill: #333; }

      .lt-note-body      { fill: #fff8c5; stroke: #b79400; stroke-width: 1; }
      .lt-note-text      { font: 10px sans-serif; fill: #333; }
      .lt-note-leader    { stroke: #b79400; stroke-width: 1; stroke-dasharray: 3 3; fill: none; }
    </style>
    <marker id="lt-state-arrow" markerWidth="10" markerHeight="10"
            refX="9" refY="3" orient="auto">
      <polygon points="0,0 10,3 0,6" fill="#333"/>
    </marker>
  </defs>
  <title>State Diagram — [name]</title>
  <desc>[description]</desc>

  <g id="lt-states">
    <g class="lt-state" data-id="Idle" transform="translate(x, y)">
      <rect class="lt-state-body" .../>
      <text class="lt-state-name">Idle</text>
    </g>
    <g class="lt-state lt-composite" data-id="Active" transform="translate(x, y)">
      <!-- outer rect + nested states with nested transforms -->
    </g>
  </g>

  <g id="lt-pseudo">
    <circle class="lt-ps-initial" cx="x" cy="y" r="6" data-kind="initial"/>
  </g>

  <g id="lt-transitions">
    <path class="lt-transition" d="..." marker-end="url(#lt-state-arrow)"
          data-source="Idle" data-target="Active"/>
    <text class="lt-transition-label" x="x_mid" y="y_mid-6">
      login [valid] / token()
    </text>
  </g>
</svg>
```

---

## 7. Test Cases

### Case 1: Minimal (initial → state → final)
```
state
initial i
final f
i -> Running
Running -> f : done
```
验证：initial 实心圆、final 同心圆、transition 箭头、label 居中。

### Case 2: Guard + Action
```
state
initial i
i -> A
A -> B : tick [count > 0] / log()
```
验证：label 解析为 trigger=`tick`, guard=`count > 0`, action=`log()`；渲染为 `tick [count > 0] / log()`。

### Case 3: Composite with Entry/Exit
```
state
initial i
i -> Outer
composite Outer {
  entry / on()
  exit / off()
  initial oi
  oi -> Inner
}
```
验证：Outer 外框，内部显示 entry/exit activity compartment，Inner 嵌套居中。

### Case 4: Orthogonal Regions
```
state
composite P {
  ---
  initial a
  a -> X
  ---
  initial b
  b -> Y
}
```
验证：P 内部有虚线水平分隔，两 region 各有独立 initial 和 state。

### Case 5: Fork / Join
```
state
initial i
fork F
join J
final f
i -> F
F -> A
F -> B
A -> J
B -> J
J -> f
```
验证：F 和 J 画为粗黑竖线，多箭头汇入/发出。

### Case 6: Self-Transition
```
state
initial i
i -> Idle
Idle -> Idle : poll / refresh()
```
验证：Idle 右上角绘制自循环弧线，label 置于弧外侧。

### Case 7: History Pseudo-State
```
state
history H
composite Edit {
  initial ei
  ei -> A
  A -> B : next
}
Pause -> H
```
验证：H 圆内渲染 `H` 字形，从外部 Pause 到 H 的 transition 正确连到 composite 边界。

### Case 8: Choice Pseudo-State
```
state
choice C
initial i
i -> C
C -> Admin : [role == "admin"]
C -> User  : [role == "user"]
```
验证：C 渲染为菱形，两出口 transition label 含 guard。

---

## 8. Implementation Priority

| Priority | Feature | Complexity | 用户价值 |
|----------|---------|------------|---------|
| P0 (MVP) | Simple state (rounded rect + name) | Low | Core |
| P0 | Initial + final pseudo-state | Low | Core |
| P0 | Transition with trigger/guard/action label parsing | Medium | Core |
| P0 | Layered DAG layout + Manhattan routing | Medium | Core |
| P1 | Composite state (nested container + recursive layout) | High | High — UML 2.5 必备 |
| P1 | Activity compartment (entry / exit / do) | Medium | High |
| P1 | Internal transition (in-state) | Low | High |
| P1 | Choice pseudo-state (diamond) | Low | High |
| P1 | Self-transition arc routing | Medium | Medium |
| P2 | Orthogonal regions (dashed divider) | High | Medium — Harel statechart 区分点 |
| P2 | Fork / Join bars | Medium | Medium |
| P2 | Junction pseudo-state | Low | Medium |
| P2 | History (shallow + deep) | Medium | Medium |
| P2 | Notes on states (left/right + block) | Low | Medium — Mermaid 有 |
| P2 | Mermaid `[*]` alias parsing | Low | Medium — 迁移友好 |
| P3 | Entry / exit points on composite border | Medium | Low |
| P3 | Terminate pseudo-state (✕) | Low | Low |
| P3 | Submachine reference with stereotype | Medium | Low |

---

## 9. DSL 设计取舍（与其他 Schematex diagram 保持一致）

1. **声明式优先于图形化**：所有 state / pseudo-state 先声明，再写 transition，方便 LLM 生成。
2. **Composite 用 `{ }` 嵌套**：避免引入独立 scope 关键字。
3. **Pseudo-state 用关键字前缀**（`initial`, `final`, `choice`, ...）：避免让 parser 猜测 symbol 类型。
4. **Trigger/guard/action 整行 free-text**：不强制解析内部表达式语义——Schematex 不执行 state machine，只渲染。
5. **Orthogonal regions 用 `---`**：简短 + 视觉上与虚线对应。
6. **`~` 不用作特殊前缀**（和 logic gate 不同）：state diagram 没有 active-low 概念。

---

## 10. 与其他 Schematex EE Diagram 的差异

| | Logic Gate | Ladder | State Diagram |
|---|-----------|--------|---------------|
| 抽象层 | Gate-level | Rung-level (IEC 61131-3) | Behavior-level |
| 信号流 | 左 → 右 (DAG) | 左 → 右，每 rung 独立 | 任意方向 (cyclic allowed) |
| 节点类型 | 固定 gate 集合 | Contact / coil / FB | State / pseudo-state (多种) |
| 嵌套 | 无 | 无 | Composite states 递归 |
| 典型用户 | 数字电路工程师 | PLC / controls engineer | 软件架构师、reactive-system designer |

三者可以在同一份工业控制系统文档中并列（state diagram 描述高层 behavior，ladder 实现，logic gate 展开具体 combinational logic），Schematex 对这三种图统一渲染是差异化优势。
