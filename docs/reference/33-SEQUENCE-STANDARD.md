# 33 — Sequence Diagram Standard

> UML 2.5.1 §17 *Interactions*. A sequence diagram shows how participants
> exchange messages **over time**: lifelines run top→bottom, messages run
> left→right between them, and the vertical axis is order (not duration).
>
> Schematex implements the UML notation **natively** — not the PlantUML/Mermaid
> dialects. Where Mermaid stops at the common subset (alt/opt/loop/par), we carry
> the full combined-fragment vocabulary and interaction-use (`ref`) frames,
> because those are the parts professionals reach for when an interaction gets
> real.

---

## 1. Scope & References

| Ref | Source |
|-----|--------|
| **Primary** | OMG Unified Modeling Language (UML) v2.5.1, §17 *Interactions* — [omg.org/spec/UML/2.5.1](https://www.omg.org/spec/UML/2.5.1/About-UML) |
| Combined fragments | UML 2.5.1 §17.6 *CombinedFragment*, `InteractionOperatorKind` |
| Lifelines / messages | UML 2.5.1 §17.3 *Lifeline*, §17.4 *Message* |
| Notation reference | uml-diagrams.org — sequence diagrams overview + combined fragments |
| Prior art (DSL ergonomics only, **not** semantics) | PlantUML sequence, Mermaid `sequenceDiagram` |

**Non-goal:** we are not Mermaid-compatible. We borrow ergonomic ideas (e.g. `+`/`-`
activation shorthand) but the arrow→semantics mapping follows UML, and the DSL
header is `sequence`, never `sequenceDiagram`.

---

## 2. The UML Vocabulary (what "the standard" actually contains)

This is the full notation. The **v0.1 column** marks what this release renders;
everything else is specified here so the DSL and types don't have to change to
add it later.

| Concept | UML meaning | Notation | v0.1 |
|---------|-------------|----------|:----:|
| **Lifeline** | one participant; a head box + dashed time axis | rect (or actor stick figure) + dashed vertical line | ✅ |
| Lifeline head kinds | object / actor / boundary / control / entity / database / collections / queue | head shape varies | ✅ all eight — `boundary`/`control`/`entity` render as Jacobson robustness icons; `actor` as a stick figure; `database` as a cylinder; the rest as classifier boxes |
| **Stereotype** | classifier stereotype on any participant/actor | `«…»` above the name | ✅ — `«…»` or `<<…>>` after a declaration (e.g. `actor Printer «system»`) |
| **Synchronous message** | blocking call | solid line, **filled** triangle arrowhead | ✅ |
| **Asynchronous message** | signal / non-blocking | solid line, **open** (thin) arrowhead | ✅ |
| **Reply message** | return from a call | **dashed** line, open arrowhead | ✅ |
| **Self message** | call to own lifeline | bent arrow back to same lifeline | ✅ |
| **Create message** | instantiates a participant | dashed line, open arrowhead, ends at a head drawn lower | ✅ |
| **Destroy** | terminates a lifeline | ✕ at the foot of the lifeline | ✅ |
| **Lost message** | recipient unknown/outside scope | line ending in a **filled circle** | ✅ |
| **Found message** | sender unknown/outside scope | line starting from a **filled circle** | ✅ |
| **Execution specification** | activation; participant is active | thin rectangle on the lifeline, **nestable** | ✅ |
| **Combined fragment** | a framed region with an operator | labelled frame, operator tag top-left | ✅ (see §2.1) |
| **Interaction use** (`ref`) | reference to another interaction | frame tagged `ref`, name centered | ✅ |
| **State invariant** | constraint true at a point on a lifeline | `{...}` or rounded box on the lifeline | ✅ |
| **Note / comment** | annotation | folded-corner rectangle | ✅ |
| **Divider** | section break across all lifelines | full-width labelled bar | ✅ |
| **Gate** | message endpoint on the fragment frame | point on the frame border | ⬜ deferred |
| **Coregion** | parallel events on one lifeline | `[ ... ]` brackets on the lifeline | ⬜ deferred |
| **Time / duration constraint** | timing annotation | `{t..t+3}`, duration bars | ⬜ deferred |

### 2.1 Combined fragment operators (`InteractionOperatorKind`)

Twelve operators are defined by UML. Mermaid implements five. We implement **all
twelve** — the complete `InteractionOperatorKind` vocabulary.

| Operator | Tag | Meaning | Operands | v0.1 |
|----------|-----|---------|----------|:----:|
| Alternatives | `alt` | if/else-if/else; first true guard runs | ≥1, guarded | ✅ |
| Option | `opt` | runs iff guard true | 1, guarded | ✅ |
| Loop | `loop` | repeat; guard may carry `(min,max)` bounds | 1, guarded | ✅ |
| Parallel | `par` | operands interleave concurrently | ≥2 | ✅ |
| Break | `break` | exceptional exit; replaces remainder of encloser | 1, guarded | ✅ |
| Critical | `critical` | atomic region; no interleaving | 1 | ✅ |
| Weak sequencing | `seq` | order kept only per shared lifeline | ≥2 | ✅ |
| Strict sequencing | `strict` | operands in textual order | ≥2 | ✅ |
| Negative | `neg` | invalid traces (rendered tinted) | 1 | ✅ |
| Ignore | `ignore` | listed messages are noise | 1 + `{msgs}` | ✅ |
| Consider | `consider` | only listed messages matter | 1 + `{msgs}` | ✅ |
| Assertion | `assert` | the only valid continuation | 1 | ✅ |

Operands are separated by `else` (alt) / `and` (par/seq/strict). A guard is a
boolean condition in `[...]`; for `loop` it may also be `(n)` or `(min,max)`.

---

## 3. Symbol Table

```
Lifeline head (object)      Lifeline head (actor)     dashed time axis
┌──────────────┐                  O                          ╎
│  :Object     │                 ╱│╲                         ╎
└──────────────┘                  │                          ╎
       ╎                         ╱ ╲                         ╎

Synchronous       A ───────────────▶ B     solid line, filled triangle
Asynchronous      A ───────────────› B     solid line, open arrowhead
Reply             A ┄┄┄┄┄┄┄┄┄┄┄┄┄┄› B     dashed line, open arrowhead
Self              A ───┐
                       │  (label)
                  A ◀──┘
Lost              A ───────────────● (filled circle, no target)
Found             ● ───────────────▶ B
Create            A ┄┄┄┄┄┄┄┄┄┄┄┄┄┄› ┌──────┐  (head drawn at arrival y)
Destroy                              ╎  ✕

Execution spec    ▕▏ thin bar on the lifeline (nested = offset bar)

Combined fragment           Interaction use            Note
┌─alt─────────────┐         ┌─ref──────────┐           ┌────────────┐╲
│ [guard]         │         │              │           │  note text │ │
│   …             │         │  Authenticate│           └────────────┘─┘
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤         └──────────────┘
│ [else]          │
│   …             │         Divider:  ══════ Section ══════
└─────────────────┘
```

CSS class prefix: `sx-seq-*`. All strokes/fills come from the theme; no inline
styles (hard constraint #3).

---

## 4. DSL Grammar

UML-native, indentation-tolerant, AI-friendly. Header keyword is `sequence`.

### 4.1 Worked example

```
sequence "Login flow"
  actor User
  participant Web as "Web App"
  control Auth
  database DB

  User -> Web : submit(credentials)
  activate Web
  Web ->+ Auth : verify(credentials)
  Auth ->+ DB : SELECT user
  DB --> Auth : row
  deactivate DB

  alt [credentials valid]
    Auth --> Web : token
    Web --> User : 200 OK
  else [invalid]
    Auth --> Web : 401
    Web --> User : error
  end
  deactivate Auth
  deactivate Web

  note over User, Web : session cookie set
```

### 4.2 EBNF

```ebnf
diagram      = header , { statement } ;
header       = "sequence" , [ string ] , newline ;        (* optional title *)

statement    = participant
             | message
             | activation
             | note
             | fragment
             | ref
             | divider
             | invariant
             | destroy
             | autonumber
             | comment ;

(* ---- participants ---- *)
participant  = kind , id , [ "as" , label ] , [ stereotype ] , newline ;
kind         = "participant" | "actor" | "boundary" | "control"
             | "entity" | "database" | "collections" | "queue" ;
stereotype   = "«" , text , "»" | "<<" , text , ">>" ;   (* classifier stereotype, e.g. «system» *)
                                  (* declaration optional: first use auto-creates a `participant` *)

(* ---- messages ---- *)
message      = id , [ act ] , arrow , [ act ] , id , [ ":" , text ] , newline ;
arrow        = "->"      (* synchronous : solid, filled head        *)
             | "->>"     (* asynchronous: solid, open head          *)
             | "-->"     (* reply       : dashed, open head         *)
             | "-x"      (* lost        : ends at filled circle     *)
             | "o->" ;   (* found       : starts at filled circle   *)
act          = "+" | "-" ;        (* +: activate target  -: deactivate source after send *)
                                  (* `create X` form: arrow whose right id is `*X` instantiates X *)

(* ---- activation (explicit form) ---- *)
activation   = ( "activate" | "deactivate" ) , id , newline ;

(* ---- notes ---- *)
note         = "note" , placement , id , [ "," , id ] , ":" , text , newline ;
placement    = "over" | "left of" | "right of" ;

(* ---- combined fragments ---- *)
fragment     = simple_frag | alt_frag | multi_frag ;
simple_frag  = ("opt"|"loop"|"break"|"critical") , [ guard ] , newline ,
                 { statement } , "end" , newline ;
alt_frag     = "alt" , [ guard ] , newline , { statement } ,
                 { "else" , [ guard ] , newline , { statement } } ,
               "end" , newline ;
multi_frag   = ("par"|"seq"|"strict") , [ guard ] , newline , { statement } ,
                 { "and" , [ label ] , newline , { statement } } ,
               "end" , newline ;
guard        = "[" , text , "]" | "(" , number , [ "," , number ] , ")" ;

(* ---- interaction use ---- *)
ref          = "ref" , "over" , id , { "," , id } , ":" , text , newline ;

(* ---- misc ---- *)
divider      = "==" , text , "==" , newline ;
invariant    = "state" , id , ":" , text , newline ;   (* state invariant on lifeline *)
destroy      = "destroy" , id , newline ;
autonumber   = "autonumber" , [ number ] , [ number ] , newline ;  (* start, step *)
comment      = ( "#" | "//" ) , text , newline ;

id           = letter , { letter | digit | "_" } ;
label        = string | text ;
string       = '"' , { char } , '"' | "「" , { char } , "」" ;  (* CJK quotes accepted *)
```

### 4.3 AI-friendliness rules

These mirror the project-wide "Made for AI" pillar:

- **CJK quotes** (`「…」`, `『…』`, `"…"`) accepted wherever `"…"` is, so a model
  emitting Chinese labels doesn't break the parse.
- **Forgiving arrows**: surrounding whitespace optional (`A->B` == `A -> B`).
- **Auto-declared participants**: an undeclared id used in a message becomes a
  plain `participant` in first-seen order — no "unknown participant" hard error.
- **Readable errors**: `end` without a matching fragment, or `else` outside an
  `alt`, report the opening line number and the operator involved.
- **`end` is not reserved as an id** the way it is in Mermaid; we only treat a
  bare `end` at statement position as a fragment terminator.

---

## 5. Layout Rules

The vertical axis is **event order**, not real time (UML is explicit on this).
Layout is deterministic — no force simulation, no randomness.

### 5.1 Coordinate model

```
Constants (px):
  HEAD_W min            = 90      head box min width (grows to fit label)
  HEAD_H                = 36
  LIFELINE_GAP min      = 140     min center-to-center between lifelines
  TOP_PAD               = 16
  HEAD_TO_FIRST         = 28      head bottom → first event y
  EVENT_GAP             = 38      vertical step between consecutive events
  SELF_GAP              = 26      vertical height of a self-message loop
  ACT_W                 = 10      execution-spec bar width
  ACT_NEST_DX           = 6       horizontal offset per activation nesting level
  FRAG_PAD_X            = 10      fragment frame inset beyond covered lifelines
  FRAG_LABEL_H          = 18      operator-tag pentagon height
  FRAG_PAD_TOP/BOTTOM   = 14 / 10
  NOTE_PAD              = 8
```

### 5.2 Horizontal pass (lifeline columns)

1. Participants get column indices in **declaration / first-use order**.
2. Each column center `x[i]`. Spacing between adjacent columns is the max of
   `LIFELINE_GAP` and the width needed by the widest message label crossing that
   gap (so labels never overlap the neighbouring lifeline). This is the single
   biggest visual win over Mermaid, which uses a fixed gap and lets labels collide.
3. Head box width grows to fit its label; column center is the head center.

### 5.3 Vertical pass (event timeline)

1. Walk statements in order, assigning each event an increasing `y` (`EVENT_GAP`
   step). Self-messages consume `SELF_GAP` extra.
2. **Activation bars**: `activate` pushes a bar start at the current `y` on that
   lifeline; `deactivate` (or the `-` suffix) closes it at the current `y`.
   Overlapping bars on one lifeline nest with `ACT_NEST_DX` offset. A message
   arriving/leaving an active lifeline attaches to the bar edge, not the axis.
3. **Create**: the target head box is drawn at the create message's `y` (not at
   the top), and its time axis starts there.
4. **Destroy**: the lifeline axis stops at the destroy `y`, capped with an ✕.

### 5.4 Combined fragments

1. A fragment's vertical span = from just above its first inner event to just
   below its last (plus `FRAG_PAD_TOP/BOTTOM`).
2. Horizontal span = covers every lifeline referenced by any inner event,
   extended by `FRAG_PAD_X` each side. A fragment that contains a single
   self-message still spans at least that one lifeline's column.
3. Operands (`else`/`and`) get a dashed separator at the operand boundary `y`,
   with the guard/label rendered just below-right of the separator.
4. Fragments **nest**: inner fragments inset and their `y`-span sits inside the
   parent's. Nesting depth has no fixed cap.
5. The operator tag is a pentagon (5-point "folded tab") at the top-left of the
   frame holding the operator name; guards render top-left of the first operand.

### 5.5 `ref` and notes

- `ref over A..B : Name` draws a frame across the named lifelines occupying one
  `EVENT_GAP` slot (taller if the name wraps), tag `ref`, name centered.
- `note over A` centers on A's column; `note over A, B` spans A→B; `left of` /
  `right of` sit beside the column. Notes grow to fit text and never overlap the
  axis they annotate.

---

## 6. Canonical Test Cases

These are the fixtures the implementation must satisfy (parser + layout +
golden-string e2e). Each lists the DSL and the assertions that matter.

### TC-1 — Minimal two-party request/reply
```
sequence
  Alice -> Bob : Authentication Request
  Bob --> Alice : Authentication Response
```
*Assert:* 2 auto-declared participants in order [Alice, Bob]; msg-0 solid+filled,
msg-1 dashed+open; both labels fit between columns; `y(msg1) > y(msg0)`.

### TC-2 — Activation + self message + async
```
sequence
  participant Client
  participant Server
  Client ->+ Server : request()
  Server ->> Server : validate()
  Server -->- Client : response
```
*Assert:* one activation bar on Server opening at msg-0 y and closing at msg-2 y;
self-message reserves `SELF_GAP`; msg-1 is solid+open (async); reply is dashed.

### TC-3 — alt with else (the Mermaid-parity case)
```
sequence
  actor User
  participant API
  User -> API : GET /resource
  alt [authorized]
    API --> User : 200 + body
  else [forbidden]
    API --> User : 403
  end
```
*Assert:* one fragment, tag `alt`, two operands; dashed operand separator between
them; guards `[authorized]` / `[forbidden]` placed top-left of each operand;
frame spans both User and API columns.

### TC-4 — Nested fragments + ref (beyond Mermaid)
```
sequence
  participant A
  participant B
  participant C
  ref over A, B : Establish session
  loop [while queue not empty]
    A -> B : poll()
    opt [item present]
      B -> C : process(item)
    end
  end
```
*Assert:* `ref` frame spans A→B; `loop` contains `opt`; inner `opt` frame inset
inside `loop`; nesting depth 2 renders without overlap; C only entered inside opt.

### TC-5 — Create / destroy + found/lost
```
sequence
  participant Factory
  Factory -> *Worker : «create»
  o-> Worker : external trigger
  Worker -x : fire-and-forget
  destroy Worker
```
*Assert:* Worker head drawn at create-message y, not at top; found message starts
at a filled circle left of Worker; lost message ends at a filled circle; Worker
axis terminates with ✕ at destroy y.

---

## 7. Output Contract

- Root `<svg>` carries `data-diagram-type="sequence"`, `role="img"`,
  `aria-label` = title or "UML sequence diagram".
- `<title>`/`<desc>` summarise participant + message + fragment counts.
- Lifelines: `<g class="sx-seq-lifeline" data-id="…">`; messages
  `data-from`/`data-to`/`data-kind`; fragments `data-op`.
- Theme tokens via `resolveBaseTheme`; reply lines use `strokeMuted`, fragment
  frames use `strokeMuted`, the critical-path-free house blue for heads.

---

## 8. Deferred (post-v0.1)

Gates · coregion · time/duration constraints & observations · message-to-message
general ordering · continuations. Each has a row in §2 so adding it is additive —
no DSL or type breakage. (All twelve combined-fragment operators now ship; the
analytical four — `neg`/`ignore`/`consider`/`assert` — render their frames and
operator tags but their trace-validation *semantics* are notation-only, as in
every other diagramming tool.)
```

