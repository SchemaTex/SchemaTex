# 29 — UML Use Case Diagram Standard Reference

*OMG Unified Modeling Language 2.5.1 §18 (UseCases) — actors, use cases, subject system boundary, association / include / extend / generalization relationships. Schematex implements the visual subset of the UML use-case notation that software engineers, business analysts, and CS students actually draw, with a single-word `usecase` keyword and a text DSL designed for LLM generation rather than the verbose XMI serialization.*

> **Primary References:**
> - **OMG.** *Unified Modeling Language (UML), Version 2.5.1.* Document **formal/2017-12-05**, December 2017 — https://www.omg.org/spec/UML/2.5.1/ — *§18 "UseCases" is the normative spec for actors, use cases, subject, and the include/extend/generalization relationships.*
> - **ISO/IEC 19505-2:2012** — *Information technology — Object Management Group Unified Modeling Language (OMG UML) — Part 2: Superstructure* (April 2012, technically equivalent to UML 2.4.1) — https://www.iso.org/standard/52854.html
> - **Bittner, Kurt & Spence, Ian** (2003). *Use Case Modeling*. Addison-Wesley Object Technology Series. ISBN 978-0201709131. *De-facto modelling style guide; cited more in practice than the spec.*
> - **Cockburn, Alistair** (2000). *Writing Effective Use Cases.* Addison-Wesley. ISBN 978-0201702255. — *Authoritative on the textual use-case form that complements the diagram.*
> - **Jacobson, Ivar; Booch, Grady; Rumbaugh, James** (1999). *The Unified Software Development Process.* Addison-Wesley. ISBN 978-0201571691. — *Original "Three Amigos" reference; Jacobson introduced use cases in OOSE (1992).*
> - **Larman, Craig** (2004). *Applying UML and Patterns*, 3rd ed. Prentice Hall. ISBN 978-0131489066. — *Widely-used university textbook.*
> - **Pressman, Roger S. & Maxim, Bruce R.** (2019). *Software Engineering: A Practitioner's Approach*, 9th ed. McGraw-Hill. ISBN 978-1259872976. — *Source of the canonical ATM use-case example used in §11.1.*
> - **Fowler, Martin** (2003). *UML Distilled*, 3rd ed. Addison-Wesley. ISBN 978-0321193681. — *Pragmatic short reference; widely cited.*
> - **PlantUML use-case syntax docs** — https://plantuml.com/use-case-diagram — *De-facto reference for text-DSL UML use cases.*

---

## 1. Positioning

**Use case diagrams sit at the front of nearly every software-engineering curriculum and every requirements engagement.** They were introduced by Ivar Jacobson in 1992 (OOSE), folded into UML 1.x in 1997, and have remained the most-taught UML diagram for thirty years. The notation is small — actor stick figures, ellipses, a system rectangle, three line types — but the diagram itself is the lingua franca for "what does this system do, from whose point of view." When a product manager turns a backlog of user stories into a system-scope picture, when a business analyst hands off requirements to engineering, when a CS student learns OOAD for the first time, the artifact they reach for is the use case diagram.

**Naming decision: `usecase`, not `uml`.** Schematex's diagram keywords are single words (`bpmn`, `erd`, `sld`, `pid`, `state`, `fbd`, `sfc`). The natural reading of this notation in industry is "use case diagram," and the unspaced form `usecase` is the single most common written variant in PlantUML, draw.io stencils, and Stack Overflow tags. We deliberately reserve `uml` as a future-namespace prefix rather than a keyword — UML 2.5.1 specifies fourteen distinct diagram types, of which Schematex already implements one (`state`, §21 — UML statechart) and intends to implement more (class, sequence, activity, component, deployment). If `uml` were a keyword it would either collide with those future engines or force them under sub-flags, breaking the single-word convention. The diagram-type union therefore gets `usecase`, and Schematex's UML coverage is described as "the UML family" in marketing copy without ever needing a `uml` keyword.

**What "made for AI" buys here.** UML use case is one of the few diagram families where an LLM can reliably extract structure from prose: actors are nouns that "do" something, use cases are verb phrases, includes and extends fall out of "as part of" and "if … then also" patterns. PlantUML is the existing text-DSL leader, but its Java runtime is a non-starter for embedded SaaS and its grammar — actor brackets, parenthesis-wrapped use cases, optional `as` aliases — is fiddly enough that LLMs misparse it under load. Schematex's job is the PlantUML developer experience without the JVM and without the grammar paper cuts.

---

## 2. Relation to Existing Schematex Engines

| Engine | UML coverage | Why `usecase` is different |
|---|---|---|
| `state` (§21) | UML 2.5 state machine — behavior of a single object | Behavior-level, intra-object. `usecase` is system-scope, captures actor-system interaction, not state lifecycles. |
| `flowchart` (§14) | Generic Sugiyama DAG | No actor concept, no subject boundary, no include/extend semantics. Generic decision/process. |
| `bpmn` (§25) | OMG BPMN business processes | Activity-flow with pools/lanes; describes *how* a process executes, not *what* a system does for *whom*. |
| `orgchart` (§16) | Reporting hierarchy | Organizational structure, not system behavior. |
| `entity` (§12) | Corporate ownership | Legal/structural, not behavioral. |

**`usecase` is Schematex's first dedicated *structural* UML engine.** `state` is the only other UML engine, and it lives in the behavioral half of UML. A use case diagram is technically a *behavior diagram* in the UML taxonomy (§18 sits in the Behavior package), but visually and editorially it functions as a structural overview of system scope — which is why we group it alongside `entity`, `orgchart`, and the future UML class/component engines in roadmap framing.

---

## 3. Users & Needs

### 3.1 Personas

| Role | Scenario | Frequency | Why generic flowchart isn't enough |
|---|---|---|---|
| **Software engineer / architect** | Sprint-zero requirements, scope diagrams in design docs, RFC framing | Weekly | Needs actor/use-case/system-boundary semantics, include/extend, generalization. Flowchart has none of these. |
| **Business analyst** | Requirements specifications, traceability matrices linking actors to use cases | Daily during discovery | Needs the actor column and the `«include»` / `«extend»` stereotypes auditors and reviewers recognise. |
| **Product manager** | Mapping user stories to system capabilities, scope negotiation with stakeholders | Weekly | Needs to show which actor a feature serves, and how supporting use cases compose. |
| **CS / SE student** | OOAD coursework, capstone reports, exams | Term-paced, very high volume | Curriculum mandates UML notation specifically — generic boxes-and-arrows fail rubrics. |
| **Technical writer** | System overview chapter of user manuals, on-boarding docs | Monthly | Needs a stable, professional-looking visual that survives PDF/print rendering. |
| **Solution architect / pre-sales** | Discovery slides, proposal decks, RFP responses | Weekly | Needs the canonical "actor → system" picture clients expect to see. |
| **QA / test lead** | Test-case enumeration anchored to use cases | Weekly | Use cases are the natural granularity for system-level test plans. |
| **Compliance / regulated industries** (FDA software-as-medical-device, ISO 26262, IEC 62304) | Requirements artefacts auditors expect | Project-paced | Auditors specifically expect UML, not Mermaid flowcharts. |
| **LLM (ChatDiagram generation side)** | "Generate a use case diagram for an online bookstore" | Daily, very high volume | Cannot reliably emit PlantUML's actor/usecase bracket gymnastics; needs a forgiving, declarative DSL. |

### 3.2 What Schematex must do better than the alternatives

1. **Compact text DSL.** A 12-element diagram should be ~20 lines, not a Visio file.
2. **First-class actor and subject.** Generic flowchart engines force you to pretend a stick figure is "just another shape"; Schematex makes them types.
3. **Stereotypes done right.** `«include»` and `«extend»` rendered with proper guillemets, dashed line, open arrowhead, midpoint pill — not raw `<<>>` strings dropped at random label positions.
4. **Generalization between actors and between use cases.** Both kinds, both rendered with the hollow-triangle arrowhead.
5. **Extension points.** Optional bulleted list inside the base use-case ellipse, with `extend` arrows referencing them.
6. **AI-friendly errors.** "include arrow points away from the included use case" should be reported in English, with the offending line number.
7. **Embeddable SVG output.** No JVM, no XMI round-trip, no desktop install. Drops into Next.js, Astro, Markdown.

---

## 4. Market Need

### 4.1 Search-volume signal

Sourced from Ahrefs (2026 Q1). Use case is the single largest software-engineering diagram opportunity on Schematex's roadmap.

| Keyword | US monthly | Global monthly | KD |
|---|---|---|---|
| `use case diagram` | 8,000 | **108,000** | 23 |
| `uml use case diagram` | 800 | 4,900 | 19 |
| `usecase diagram` | 100 | 7,200 | 19 |
| `uml diagram` (parent) | 13,000 | 77,000 | 68 |

108,000 global searches at KD 23 is exceptional — comparable in absolute volume to `flowchart` (589k) but with **less than half the keyword difficulty** and a more transactional intent ("how do I draw one, what tool"). The `uml use case diagram` long-tail and the no-space `usecase diagram` variant are both KD 19, which is the lowest-friction SEO surface in the entire UML family. The parent `uml diagram` query at KD 68 is a feeder topic — content that ranks for it tends to be tool-roundup listicles, and Schematex can ride that wave by being the obvious open-source answer.

For context, the volume here is **~13× larger than `genogram maker`** (4,700 global) and **~25× larger than `sociogram`** (1,400 US). Among Schematex's diagram families this is the highest-ROI piece of inventory to ship after `flowchart` and `bpmn`.

### 4.2 Competitive landscape

| Product | Positioning | License | Key gap |
|---|---|---|---|
| **PlantUML** | Text DSL, mature UML coverage including use case | GPL | Java runtime; awkward actor/usecase syntax; not embeddable as a JS library |
| **Mermaid** | Markdown-native DSL, broad diagram support | MIT | **Does not support use case diagrams** at all — only sequence, class, state, ER, flowchart. Largest unfilled gap in Mermaid's roadmap. |
| **draw.io / Lucidchart** | Manual GUI with UML stencils | Freemium / commercial | No DSL; no AI generation path; not embeddable as a library |
| **Visual Paradigm** | Desktop UML modeling suite | $99+ commercial | Heavy install; closed format; not AI-native |
| **StarUML** | Desktop UML modeler | $129 commercial | Desktop-only; closed |
| **Enterprise Architect (Sparx)** | Heavyweight enterprise UML modeling | $229+ commercial | Enterprise procurement; closed |
| **yUML** | Tiny web-based DSL | Freemium | Maintained intermittently; limited expressiveness; not embeddable |
| **Modelio** | Open-source desktop UML | GPL | Desktop install; aging UX |

**Schematex differentiation:**

- The **only** maintained, embeddable, text-DSL use-case renderer with **zero runtime dependencies**.
- The **Mermaid-shaped gap that Mermaid never filled** — every Mermaid user who ever asked "how do I draw a use case diagram in Mermaid" landed on a years-old GitHub issue.
- PlantUML's DSL ergonomics without the JVM, with stricter grammar and forgiving error messages.
- AI-native: a 12-use-case diagram is ~20 lines of DSL the LLM can emit in one shot.
- AGPL-3.0 open source with a commercial-licence escape hatch for SaaS that can't take AGPL.

---

## 5. Standard Compliance

### 5.1 What we implement (UML 2.5.1 §18 visual subset)

| Element | Spec reference | Notes |
|---|---|---|
| Actor (human / stick figure) | §18.1.5 *Notation* | Default actor presentation |
| Actor (external system) | §18.1.5 | Rectangle with `«actor»` stereotype, or alternative stick-figure variant |
| Actor (business actor) | Bittner & Spence convention | Stick figure with `/` diagonal across body |
| Use case | §18.1.5 | Ellipse with name centered; optional stereotype above name |
| Extension points | §18.1.4 | Compartment inside the ellipse listing named extension points |
| Subject (system boundary) | §18.1.5 | Rectangle (or rounded rectangle) containing use cases, with subject name at top |
| Association (actor ↔ use case) | §18.1.4 | Solid line; optional multiplicity at endpoints; optional directionality arrowhead |
| Include relationship | §18.1.3 | Dashed line with open arrowhead, `«include»` keyword, points *toward the included use case* |
| Extend relationship | §18.1.3 | Dashed line with open arrowhead, `«extend»` keyword, points *toward the base use case*. Optional `{condition}` and `extension point: <name>` |
| Generalization (actor) | §18.1.3 + §9.9 | Solid line with hollow triangle, points to parent actor |
| Generalization (use case) | §18.1.3 + §9.9 | Solid line with hollow triangle, points to parent use case |
| Stereotype labels | §7.4 (Profiles) | Rendered with guillemets `« »`, not `<<` `>>` ASCII |
| Multiplicity | §7.5 | Optional `1`, `*`, `0..1`, `1..*`, `m..n` at association endpoints |

### 5.2 What we deliberately omit (v0.1)

| Omitted | Why |
|---|---|
| Textual use-case descriptions (Cockburn fully-dressed form) | Out of scope for a *diagram* renderer; belongs in companion docs. |
| Scenario / step tables | Same — narrative form is not a diagram. |
| Activity-diagram drill-down per use case | Separate UML diagram type; future `activity` engine. |
| Sequence-diagram drill-down per use case | Future `sequence` engine. |
| Use-case realisation (collaboration) | Cross-diagram traceability; out of scope. |
| Packages and namespaces | Future engine; not part of the use-case diagram per spec. |
| XMI / EMF export | Standard XMI is verbose, fragile, and not the value-add. Future export adapter possible. |
| Bidirectional association arrows | UML 2.5 permits both ends with arrows; spec discourages it and Bittner & Spence advise plain undirected lines. |

### 5.3 Style adherence

By default we follow the Bittner & Spence style guide:

- Primary actors on the **left** of the subject; secondary/supporting actors on the **right**. Users override per actor with `actor "Customer" left|right`.
- Actor name **below** the stick figure (not beside).
- Stereotypes use **guillemets** (`«include»`, `«extend»`), never the ASCII `<<include>>` substitute. Parser accepts both; renderer always emits guillemets.
- `«include»` arrow points **toward the included use case** (the one being reused). Most-confused arrow direction in UML — validator enforces.
- `«extend»` arrow points **toward the base use case** (the one being extended). Opposite of `«include»`. Also enforced.
- Generalization arrows have **hollow triangle** heads (UML standard), never filled.

---

## 6. Symbol Catalog

All coordinates assume the default theme scale; tokens in `BaseTheme` + `UsecaseTokens` (§12) drive colors.

### 6.1 Actor — human (default)

Stick figure: head (circle), torso (vertical line), arms (horizontal line), legs (two diagonal lines).

```
SVG path (normalised to 40×60 bounding box, name label below):

<g class="sx-uc-actor" data-id="Customer">
  <circle class="sx-uc-actor-head"  cx="20" cy="8"  r="6"/>
  <line   class="sx-uc-actor-body"  x1="20" y1="14" x2="20" y2="36"/>
  <line   class="sx-uc-actor-arms"  x1="6"  y1="22" x2="34" y2="22"/>
  <line   class="sx-uc-actor-leg-l" x1="20" y1="36" x2="8"  y2="56"/>
  <line   class="sx-uc-actor-leg-r" x1="20" y1="36" x2="32" y2="56"/>
  <text   class="sx-uc-actor-name"  x="20" y="72" text-anchor="middle">Customer</text>
</g>
```

- Default bounding box: **40×60px**, name label adds ~14px below.
- Stroke 1.5px, fill none on body; head is filled with `theme.bg` (so it remains visible on dark themes).

### 6.2 Actor — external system

Rectangle with `«actor»` stereotype above the name. Used when the actor is another software system (payment gateway, third-party API).

```
<g class="sx-uc-actor sx-uc-actor-system" data-id="PaymentGateway">
  <rect x="0" y="0" width="100" height="44" rx="2"/>
  <text class="sx-uc-stereotype" x="50" y="16" text-anchor="middle">«actor»</text>
  <text class="sx-uc-actor-name" x="50" y="34" text-anchor="middle">Payment Gateway</text>
</g>
```

### 6.3 Actor — business actor (Bittner & Spence)

Standard stick figure plus a `/` diagonal stroke from upper-left to lower-right of the body. Convention used to distinguish in-organisation business actors from external customers.

### 6.4 Use case

Ellipse with the use case name centered. Optional stereotype line above name. Optional extension-point compartment below name, separated by a thin horizontal line.

| Layer | Geometry |
|---|---|
| Ellipse | `rx` auto-fits widest text + 18px padding; `ry` auto-fits text stack + 14px padding. Minimum `rx=70, ry=30`. |
| Stereotype label | Above name, italic, 10px, in `«guillemets»`. Optional. |
| Name | Centered, 12px sans-serif, single or wrapped line. |
| Divider | Inside the ellipse at `y = ry`; only drawn when extension points are present. |
| Extension points | List headed `extension points`, one per line, 10px, left-aligned with 16px inset from ellipse left edge. |

```
<g class="sx-uc-usecase" data-id="checkout">
  <ellipse cx="cx" cy="cy" rx="rx" ry="ry"/>
  <text class="sx-uc-stereotype" x="cx" y="cy-14" text-anchor="middle">«include»</text>  <!-- optional -->
  <text class="sx-uc-name"        x="cx" y="cy+4"  text-anchor="middle">Checkout</text>
  <line class="sx-uc-div" x1="cx-rx+6" y1="cy+10" x2="cx+rx-6" y2="cy+10"/>             <!-- optional -->
  <text class="sx-uc-extpoint" x="cx-rx+16" y="cy+24">extension points</text>
  <text class="sx-uc-extpoint" x="cx-rx+16" y="cy+38">payment failed</text>
</g>
```

### 6.5 Subject (system boundary)

Rounded rectangle, subject name at top-center, content padded.

| Property | Value |
|---|---|
| Corner radius | `rx = ry = 8` |
| Stroke | 1.5px, `theme.strokeMuted` |
| Fill | `theme.bgSubtle` or transparent |
| Title position | Top-center, 14px bold, 12px above the boundary's top edge (sitting on the rectangle's top line) |
| Padding | 24px top (for title), 20px sides and bottom |

### 6.6 Connectors

| Connector | Stroke | Arrowhead | Label | DSL |
|---|---|---|---|---|
| Association (actor — use case) | solid 1.5px | none by default; optional open triangle if directed | optional multiplicity at each end | `--` |
| Association (directed) | solid 1.5px | open triangle, 8×6 | optional | `-->` |
| Include | **dashed 4-2 pattern** | open triangle, 8×6, pointing **to included use case** | `«include»` midpoint pill | `..>` |
| Extend | **dashed 4-2 pattern** | open triangle, 8×6, pointing **to base use case** | `«extend»` midpoint pill; optional `[condition]` below; optional `extension point: name` | `<..` (reverse direction) |
| Generalization (actor or use case) | solid 1.5px | **hollow triangle**, 12×10, pointing to parent | none | `--|>` |

**Arrowhead markers:**

```svg
<marker id="sx-uc-open-arrow" viewBox="0 0 10 8" refX="9" refY="4"
        markerWidth="10" markerHeight="8" orient="auto">
  <polyline points="0,0 9,4 0,8" fill="none" stroke="currentColor" stroke-width="1.5"/>
</marker>

<marker id="sx-uc-gen-arrow" viewBox="0 0 12 10" refX="11" refY="5"
        markerWidth="12" markerHeight="10" orient="auto">
  <polygon points="0,0 11,5 0,10" fill="white" stroke="currentColor" stroke-width="1.5"/>
</marker>
```

**Dash pattern for include/extend:** `stroke-dasharray="4 2"`. Stable at any zoom.

**Stereotype pill:** label rendered with a small rounded background rectangle (radius 6px, 3px padding, fill = `theme.bg`) to keep readable when crossing other lines.

---

## 7. DSL Grammar

### 7.1 Two equivalent forms

Schematex accepts both a **declarative form** (actors and use cases declared up-front, relationships listed below) and a **PlantUML-aligned form** (inline declarations interleaved with relationships). The two forms can be mixed inside one document. Parser treats them as syntactic sugar over the same AST.

### 7.2 Header

```
usecase
title: "Online Bookstore — Checkout"
system: "Bookstore System"
direction: LR | TB           // default LR
```

`system` is optional — if omitted, no subject rectangle is drawn and use cases float free.

### 7.3 Declarative form

```
actor:  Customer
actor:  Admin
actor:  "Payment Gateway" as PG (external)
actor:  Warehouse Staff (business)

usecase: "Browse Catalog"        as Browse
usecase: "Add to Cart"           as AddCart
usecase: "Checkout"              as Checkout {
  extension point: payment failed
  extension point: stock depleted
}
usecase: "Pay"                   as Pay
usecase: "Validate Card"         as ValidateCard
usecase: "Cancel Order"          as Cancel

Customer    -- Browse
Customer    -- AddCart
Customer    -- Checkout
Checkout    ..> Pay               : «include»
Pay         ..> ValidateCard      : «include»
Pay         -- PG
Cancel      <.. Checkout          : «extend» [payment failed] (extension point: payment failed)
Admin       -- "Manage Inventory"
```

### 7.4 PlantUML-aligned form

For users coming from PlantUML, inline declarations are accepted:

```
usecase
:Customer: as C
(Browse Catalog) as Browse
(Add to Cart)    as AddCart
(Checkout)       as Checkout
(Pay)            as Pay

C -- Browse
C -- AddCart
C -- Checkout
Checkout ..> Pay : «include»
```

`:Name:` declares an actor; `(Name)` declares a use case. `as ID` aliases an identifier for later reference. The aliases live in the same identifier namespace as the declarative form.

### 7.5 Stereotypes on actors and use cases

```
usecase: "Validate Card" as ValidateCard «secured»
actor:   "Audit Service" as Audit (external) «system»
```

Custom stereotypes are passed through verbatim (rendered in guillemets above the element name).

### 7.6 Multiplicity

```
Customer "1"    -- "*"  Checkout
Cashier  "1..*" -- "1"  Register
```

Multiplicities are quoted strings placed before the endpoint they belong to.

### 7.7 Generalization

```
actor: User as U
actor: "Premium User" as PU
PU --|> U

usecase: "Pay by Card"   as PayCard
usecase: "Pay by PayPal" as PayPaypal
usecase: "Pay"           as Pay
PayCard   --|> Pay
PayPaypal --|> Pay
```

`--|>` is the generalization arrow (hollow triangle), pointing from child to parent. Works between two actors or two use cases. Cross-type generalization (actor → use case) is a hard error.

### 7.8 Grouping (informational; no semantic effect)

```
note "Phase 1 — Browse" {
  Browse, AddCart
}
```

Notes/annotations are rendered as dashed rounded rectangles around their members. They are layout hints only and have no UML semantics.

### 7.9 Compact EBNF

```ebnf
document     = header statement*
header       = "usecase" NEWLINE (header_prop NEWLINE)*
header_prop  = "title:" quoted_string
             | "system:" quoted_string
             | "direction:" ("LR" | "TB")

statement    = comment
             | actor_decl
             | usecase_decl
             | relation
             | note_decl
             | plantuml_inline

comment      = "#" /[^\n]*/ NEWLINE

actor_decl   = "actor" ":" actor_name actor_alias? actor_kind? stereotype? NEWLINE
actor_name   = quoted_string | IDENT
actor_alias  = "as" IDENT
actor_kind   = "(" ("external" | "business" | "system") ")"

usecase_decl = "usecase" ":" quoted_string ("as" IDENT)? stereotype? extpoints? NEWLINE
extpoints    = "{" NEWLINE ("extension point:" /[^\n]+/ NEWLINE)+ "}" NEWLINE

plantuml_inline = (":" name ":" ("as" IDENT)?           # actor
                 | "(" name ")" ("as" IDENT)?)          # use case
                 NEWLINE

relation     = endpoint relop endpoint label_clause? NEWLINE
endpoint     = (quoted_string | IDENT) multiplicity?
multiplicity = quoted_string
relop        = "--"                 # association
             | "-->"                # directed association
             | "..>"                # include   (source includes target)
             | "<.."                # extend    (target extends source)  -- arrow points to base
             | "--|>"               # generalization (child to parent)
label_clause = ":" stereotype? condition? extpoint_ref?
stereotype   = "«" /[^»]+/ "»" | "<<" /[^>]+/ ">>"
condition    = "[" /[^\]]+/ "]"
extpoint_ref = "(extension point:" /[^)]+/ ")"

note_decl    = "note" quoted_string "{" NEWLINE
               (IDENT ("," IDENT)*) NEWLINE
               "}" NEWLINE

IDENT        = /[A-Za-z_][A-Za-z0-9_]*/
quoted_string= '"' /[^"]*/ '"'
NEWLINE      = /\n/
```

### 7.10 Parser-enforced validation

| Rule | Error message |
|---|---|
| `«include»` arrow must point to a use case (not an actor) | `include relationship target must be a use case, not actor 'X' (line N)` |
| `«extend»` arrow must point to a use case (not an actor) | same |
| Generalization endpoints must be same kind (actor↔actor or usecase↔usecase) | `generalization must connect two actors or two use cases, not actor and use case (line N)` |
| Association cannot be between two actors | `association must connect an actor and a use case (line N)` |
| Association cannot be between two use cases (use include/extend instead) | `to relate two use cases use include or extend, not association (line N)` |
| Extension-point reference on `«extend»` must match an extension point declared in the base use case | `extension point 'payment failed' is not declared on use case 'Checkout' (line N)` |
| Identifier reused across actors and use cases | `identifier 'X' already declared (line N)` |
| Subject name is required if `system:` header is omitted but any use case is declared inside `{ ... }` block scope | parser hint |

These are the high-confidence mistakes LLMs and humans both make. Catching them at parse time saves the renderer from drawing semantically wrong but visually plausible diagrams.

---

## 8. Layout Rules

### 8.1 High-level algorithm

Two strategies are supported, selected by `direction` and diagram size:

1. **Anchored layout (default).** Actors are fixed external anchors on the left and right sides of the subject; use cases are placed inside the subject by a barycenter-style relaxation that pulls each use case toward its connected actors and toward use cases it includes/extends. Iteration count is bounded (≤ 60 passes for ≤ 30 use cases; deterministic seed).
2. **Grid layout (fallback for small diagrams, ≤ 6 use cases).** Use cases arranged in a 2- or 3-column grid inside the subject; actors flanking. Used when the anchored relaxation would visibly thrash on a sparse graph.

The chosen strategy is pure, deterministic, and seedless — relaxation is initialised by a deterministic order derived from declaration order, so the same DSL always produces byte-identical SVG.

### 8.2 Actor placement

- Actors classified as **primary** (declared first, or marked `left`) are stacked on the **left side** of the subject.
- Actors classified as **secondary/supporting** (declared after the first one with no left/right hint, or marked `right`) are stacked on the **right side**.
- Stick-figure pitch: **vertical gap = 90px** between actor centers.
- Horizontal offset from subject edge: **60px** (room for the association line + label).
- Actor name label sits 14px below the stick figure feet.
- External-system actors (rectangle) use the same anchor columns but their box width pushes the column outward by `max(0, boxWidth − 40px) / 2`.

### 8.3 Subject (system boundary)

- The subject rectangle is sized after the use cases are placed: `width = max(usecase right) − min(usecase left) + 2 × subjectPadding`; `height = max(usecase bottom) − min(usecase top) + topPadding + sidePadding`.
- `subjectPadding = 32`, `topPadding = 56` (room for title bar), `sidePadding = 32`.
- Title rendered top-center, 14px bold, inside the top padding band.

### 8.4 Use-case placement (anchored relaxation)

For each use case `u`:

1. **Initial x**: midpoint between the average x of its connected actors and the average x of use cases it includes/extends. Clamped to subject interior.
2. **Initial y**: declaration-order rank, mapped linearly to subject interior with 60px row pitch.
3. **Iterate** (up to 60 passes):
   - x ← weighted average of (connected actor x, connected use-case x), weight 1.0 for actor associations, 1.5 for include/extend (stronger pull).
   - y ← weighted average of connected nodes' y, plus a vertical-stratification term that keeps use cases in `«include»` chains on roughly the same row.
   - After every pass, resolve overlaps by pushing the lower use case down by the overlap amount + 12px.
4. **Snap to 4px grid** at the end.

Minimum **inter-ellipse gap**: 24px horizontally, 18px vertically.

### 8.5 Association routing

- Default: **straight line** from the closest point on the actor bounding box to the closest point on the use-case ellipse.
- If the straight line would cross more than one other use-case ellipse, switch to an **orthogonal three-segment path** (horizontal-vertical-horizontal) routed around the obstacles.
- Endpoints are clamped to the ellipse perimeter using parametric ellipse math (no rect approximation).
- Labels (multiplicity, optional) placed 8px from the endpoint along the line, on the outside of the subject.

### 8.6 Include / extend routing

- Always **orthogonal** with at most two bends.
- Stereotype label (`«include»` or `«extend»`) placed at the path midpoint with a 4px-radius rounded-rectangle background pill so it remains readable when crossing other lines.
- For `«extend»`: optional `[condition]` below the stereotype label, and optional `(extension point: name)` below the condition. All three lines are centered on the path midpoint.
- Arrowhead direction is **always toward the included (for include) or base (for extend) use case** — even if the DSL declared it in reverse with `<..`, the renderer normalises the arrowhead position.

### 8.7 Generalization routing

- Solid line with hollow-triangle arrowhead toward parent.
- For multi-child generalization (3+ children of the same parent), the renderer may merge the arrowhead into a **tree-with-shared-head** form: each child line terminates at a shared vertical stem, which carries a single triangle into the parent. This is the convention in UML 2.5 Figure 18.5 and matches what Visio/PlantUML/Visual Paradigm produce. Toggle: `generalization: tree | individual` in the header (default `tree` when ≥ 3 children share a parent).

### 8.8 Direction modes

- **`LR` (default).** Actors flank the subject horizontally; use cases laid out left-to-right within. Reading order matches Western/business-document convention.
- **`TB`.** Actors above and below the subject; use cases stack top-to-bottom. Used for narrow pages and print.

### 8.9 Collision metrics

Layout reports `LayoutDiagnostics` (per `src/core/types.ts`) with:

- `actorCount`, `useCaseCount`, `subjectWidth`, `subjectHeight`.
- `crossings`: number of edge-edge crossings after routing.
- `tightFit`: boolean, true if any pair of use cases ended at the 24×18px minimum gap (a hint that the user should consider splitting the diagram).

---

## 9. Theme Integration

Beyond `BaseTheme`, use case adds `UsecaseTokens`:

```ts
interface UsecaseTokens {
  actor:    { stroke: string; fill: string;     name: string };
  usecase:  { stroke: string; fill: string;     name: string; stereotype: string; extpoint: string };
  subject:  { stroke: string; fill: string;     title: string };
  assoc:    { stroke: string };
  include:  { stroke: string; dashArray: string };
  extend:   { stroke: string; dashArray: string };
  general:  { stroke: string; arrowFill: string };
  note:     { stroke: string; fill: string;     text: string };
}
```

**Defaults (light theme):**

- Actor stroke `theme.stroke`, head fill `theme.bg`, name in `theme.text`.
- Use case ellipse fill `theme.bgSubtle` (very light), stroke `theme.stroke`.
- Subject stroke `theme.strokeMuted` (deliberately softer than the use-case stroke so the system boundary recedes visually); subject fill transparent or `theme.bgVeryFaint`.
- Stereotype labels in `theme.textMuted`.
- Include arrows in `theme.stroke` (neutral); **extend arrows in `theme.accent`** (deliberately colored, because extends are semantically the rarer and more surprising relationship and benefit from visual distinction).
- Generalization triangle filled white (UML convention) on light themes; filled `theme.bg` on dark themes.
- Note background `theme.warningBgSubtle` (matches the cross-engine convention used by `state`'s notes — soft yellow on light, muted ochre on dark).

**Three presets:** `default`, `monochrome` (black & white for print/handout), `dark`.

---

## 10. SVG Output Structure

```xml
<svg class="sx-uc" data-diagram-type="usecase" viewBox="0 0 W H">
  <title>Use Case Diagram — Online Bookstore Checkout</title>
  <desc>Subject: Bookstore System. 3 actors, 6 use cases, 2 include, 1 extend.</desc>

  <defs>
    <style>
      .sx-uc-actor circle, .sx-uc-actor line { stroke: var(--sx-stroke); stroke-width: 1.5; fill: none; }
      .sx-uc-actor-head { fill: var(--sx-bg); }
      .sx-uc-actor-name { font: 11px sans-serif; fill: var(--sx-text); }
      .sx-uc-usecase ellipse { stroke: var(--sx-stroke); stroke-width: 1.5; fill: var(--sx-bg-subtle); }
      .sx-uc-name { font: 12px sans-serif; fill: var(--sx-text); }
      .sx-uc-stereotype { font: italic 10px sans-serif; fill: var(--sx-text-muted); }
      .sx-uc-extpoint { font: 10px sans-serif; fill: var(--sx-text-muted); }
      .sx-uc-subject rect { stroke: var(--sx-stroke-muted); stroke-width: 1.5; fill: none; }
      .sx-uc-subject-title { font: bold 14px sans-serif; fill: var(--sx-text); }
      .sx-uc-assoc { stroke: var(--sx-stroke); stroke-width: 1.5; fill: none; }
      .sx-uc-include { stroke: var(--sx-stroke); stroke-width: 1.5; fill: none; stroke-dasharray: 4 2; }
      .sx-uc-extend  { stroke: var(--sx-accent); stroke-width: 1.5; fill: none; stroke-dasharray: 4 2; }
      .sx-uc-general { stroke: var(--sx-stroke); stroke-width: 1.5; fill: none; }
      .sx-uc-pill    { fill: var(--sx-bg); }
      .sx-uc-note    { stroke: var(--sx-stroke-muted); stroke-dasharray: 3 3; fill: var(--sx-warn-bg-subtle); }
    </style>

    <marker id="sx-uc-open-arrow" viewBox="0 0 10 8" refX="9" refY="4"
            markerWidth="10" markerHeight="8" orient="auto">
      <polyline points="0,0 9,4 0,8" fill="none" stroke="currentColor" stroke-width="1.5"/>
    </marker>
    <marker id="sx-uc-gen-arrow" viewBox="0 0 12 10" refX="11" refY="5"
            markerWidth="12" markerHeight="10" orient="auto">
      <polygon points="0,0 11,5 0,10" fill="var(--sx-bg)" stroke="currentColor" stroke-width="1.5"/>
    </marker>
  </defs>

  <g class="sx-uc-subject" data-id="bookstore">
    <rect x="..." y="..." width="..." height="..." rx="8" ry="8"/>
    <text class="sx-uc-subject-title" x="..." y="..." text-anchor="middle">Bookstore System</text>
  </g>

  <g class="sx-uc-actors">
    <g class="sx-uc-actor" data-id="customer" transform="translate(x, y)">…stick figure…</g>
    <g class="sx-uc-actor sx-uc-actor-system" data-id="payment" transform="translate(x, y)">…box…</g>
  </g>

  <g class="sx-uc-usecases">
    <g class="sx-uc-usecase" data-id="checkout" transform="translate(cx, cy)">
      <ellipse rx="..." ry="..."/>
      <text class="sx-uc-name">Checkout</text>
    </g>
  </g>

  <g class="sx-uc-edges">
    <path class="sx-uc-assoc"   d="M...L..." data-source="customer" data-target="checkout"/>
    <path class="sx-uc-include" d="M...L..." data-source="checkout" data-target="pay"
          marker-end="url(#sx-uc-open-arrow)"/>
    <g class="sx-uc-edge-label" transform="translate(mx, my)">
      <rect class="sx-uc-pill" x="..." y="..." width="..." height="..." rx="6"/>
      <text class="sx-uc-stereotype" x="0" y="0" text-anchor="middle">«include»</text>
    </g>
  </g>
</svg>
```

---

## 11. Canonical Test Cases

All five must round-trip parser → layout → renderer without warnings.

### 11.1 Minimal — ATM (Pressman *Software Engineering* canonical example)

Two actors (Customer, Bank), four use cases (Withdraw Cash, Deposit Funds, Check Balance, Transfer Funds), no includes/extends, single subject "ATM System." ~6 elements. The hello-world for every SE textbook since 1992.

```
usecase
title: "ATM"
system: "ATM System"

actor: Customer
actor: Bank (external)

usecase: "Withdraw Cash"   as Withdraw
usecase: "Deposit Funds"   as Deposit
usecase: "Check Balance"   as Check
usecase: "Transfer Funds"  as Transfer

Customer -- Withdraw
Customer -- Deposit
Customer -- Check
Customer -- Transfer

Withdraw -- Bank
Deposit  -- Bank
Check    -- Bank
Transfer -- Bank
```

**Validates:** stick figure rendering, external-system rectangle variant, subject sizing, actor flanking (Customer left, Bank right), straight-line associations.

### 11.2 Online bookstore with include + extend (intermediate)

One primary actor (Customer), one external system (Payment Gateway), one supporting actor (Warehouse Staff). Use cases: Browse Catalog, Add to Cart, Checkout (with extension points), Pay, Validate Card, Cancel Order, Ship Order. Relationships: `Checkout «include» Pay`, `Pay «include» Validate Card`, `Cancel Order «extend» Checkout when {payment fails}`.

**Validates:** include-arrow direction, extend-arrow direction, extension-point compartment inside the ellipse, condition syntax, mixed primary/supporting actor placement.

### 11.3 Multi-actor, multi-system e-commerce

Four actors: Customer (primary, left), Admin (primary, left, secondary stack), Payment Gateway (external, right), Warehouse System (external, right). Eight use cases spanning catalog management, ordering, fulfilment, and refunds. At least two `«include»` and two `«extend»` relationships.

**Validates:** primary/secondary actor stacking, three-or-more-children generalization tree, dense include/extend network, label-pill collision avoidance.

### 11.4 Generalization between actors

Customer (parent), Premium Customer (child), Corporate Customer (child). Use cases: Browse Catalog, Place Order, Apply Premium Discount (associated with Premium Customer only), Negotiate Bulk Price (associated with Corporate Customer only).

**Validates:** actor generalization (hollow triangle), inheritance of associations (visual only — Schematex does not propagate associations), tree-shared-arrowhead rendering when 2+ children share a parent.

### 11.5 Stress test — 20+ use cases with dense include/extend

A library-management system or hospital-information system with 22 use cases, 4 actors, and 14 include/extend relationships. Designed to exercise the layout relaxation, edge-crossing minimisation, and the `tightFit` diagnostic flag.

**Validates:** layout robustness, deterministic output, label-pill collision-avoidance under dense routing, performance budget (< 50ms parse + layout + render for this case on a modern laptop).

---

## 12. Theme Tokens (full surface)

```ts
export interface UsecaseTokens {
  actor: {
    stroke: string;        // stick-figure stroke
    fill: string;          // head fill (= bg to read on dark themes)
    name: string;          // name label color
    systemFill: string;    // external-system rectangle fill
    systemStroke: string;
  };
  usecase: {
    stroke: string;
    fill: string;
    name: string;
    stereotype: string;    // italic, muted
    extpoint: string;
    divider: string;       // line between name and extpoint compartment
  };
  subject: {
    stroke: string;        // strokeMuted by default
    fill: string;          // transparent / bgVeryFaint
    title: string;         // 14px bold
  };
  assoc: { stroke: string };
  include: { stroke: string; dashArray: string };
  extend:  { stroke: string; dashArray: string };  // accent color by default
  general: { stroke: string; arrowFill: string };
  pill:    { fill: string };                       // stereotype-label background
  note:    { stroke: string; fill: string; text: string };
}
```

Presets:

- **`default`** — black strokes on white; subject in muted grey; extend arrows in `#1f6feb` (default accent blue).
- **`monochrome`** — all strokes black, all fills white; extend arrows drawn with a `4 2 1 2` dash pattern instead of accent color so the distinction survives B/W print.
- **`dark`** — light strokes (`#e4e4e7`) on dark canvas (`#0a0a0a`); extend arrows in a desaturated cyan accent; generalization triangle filled with bg color for the "hollow on dark" effect.

---

## 13. Future Expansion (UML family)

This is Schematex's first dedicated structural UML engine. The same infrastructure (actor stick figures, stereotype pills, hollow-triangle generalization marker, dashed-line dependency variants) will be reused across the rest of the UML family:

| Future engine | UML 2.5.1 § | Shared with `usecase` |
|---|---|---|
| `class`       | §11 (Classes) | Stereotype pills, generalization arrow, dashed-dependency arrow, multiplicity tokens |
| `sequence`    | §17 (Interactions, sequence form) | Actor stick figures, stereotypes |
| `activity`    | §15 (Activities) | None of the visual primitives; layout family closer to `flowchart` + `bpmn` |
| `component`   | §11.3 (Components) | Subject-like containers, generalization, dependencies |
| `deployment`  | §19 (Deployments) | Component reuse, subject-like nodes |
| `object`      | §11.5 (InstanceSpecifications) | Same primitives as `class` |

The `usecase` engine is therefore a load-bearing investment beyond its own market — it pays off the symbol catalog and stereotype pipeline that all subsequent UML engines depend on.

The `state` engine (§21) is the only other UML coverage today; it shares the arrowhead vocabulary (hollow-triangle generalization is identical) but otherwise has no overlap.

---

## 14. Pitfalls & Gotchas

1. **`«include»` arrow direction.** Source `includes` target ⇒ arrow points from source **to** target. The most-confused arrow in UML; documented contrary on multiple tutorial sites. Validator enforces.
2. **`«extend»` arrow direction.** Extension `extends` base ⇒ arrow points from extension **to** base. Opposite of include. Equally confused. Validator enforces.
3. **Guillemets vs ASCII.** Parser accepts `<<include>>`; renderer always emits `«include»`. Don't ship a diagram with raw ASCII brackets in the SVG — it looks unprofessional and breaks under font-substitution.
4. **Association between two use cases is illegal.** Use `«include»` or `«extend»`. Validator catches and gives a hint.
5. **Generalization between actor and use case is illegal.** Different metaclasses; spec disallows.
6. **Extension points are textual only in v0.1.** The base use case lists them inside the ellipse; the `«extend»` relationship can name one via `(extension point: name)`. We do not draw a connector from the extend label *to* the listed extension point line — that's a v0.2 nicety.
7. **External-system actor vs stick figure.** Both are legal UML; users choose by `(external)` or `(system)` modifier. Don't render `«actor»` stereotype label on the stick-figure variant — only on the rectangle variant.
8. **Tree-shared generalization arrowhead** is a rendering optimisation, not a semantic claim. The DSL still declares one generalization edge per child; the renderer merges them visually when ≥3 share a parent. Toggle via `generalization: individual` if you want unmerged arrows.
9. **Subject is optional but recommended.** Without a subject rectangle, the diagram is technically valid (the spec permits omitting it) but visually weak. Schematex warns (not errors) when `system:` is omitted and ≥ 3 use cases are declared.
10. **PlantUML compatibility is "inspired by," not "1:1."** `:Actor:` and `(UseCase)` work; aliases via `as` work; multiplicity syntax differs slightly (Schematex uses quoted strings on each end of the relation, not parenthesised inline). We do **not** provide a `plantuml2schematex` transpiler.

---

## 15. Implementation Priority

| Priority | Feature | Complexity | User value |
|---|---|---|---|
| P0 | Header + actor declarations (stick figure + external-system variant) | Low | Core |
| P0 | Use-case declarations (ellipse + name) | Low | Core |
| P0 | Subject rectangle with title | Low | Core |
| P0 | Association (`--`, `-->`) | Low | Core |
| P0 | Include (`..>`) with `«include»` label pill | Medium | Core |
| P0 | Extend (`<..`) with `«extend»` label pill | Medium | Core |
| P0 | Anchored layout with deterministic relaxation | High | Core |
| P0 | Parse-time validation for arrow-direction and metaclass rules | Medium | Core |
| P1 | Generalization (`--|>`) for actors and use cases | Medium | High — UML SE textbooks always use it |
| P1 | Extension points compartment inside ellipse | Low | High |
| P1 | Multiplicity at endpoints | Low | High |
| P1 | Tree-shared generalization arrowhead | Medium | High |
| P1 | PlantUML-aligned inline syntax (`:Actor:`, `(UseCase)`) | Medium | High — migration |
| P1 | Stereotypes on actors / use cases (custom strings) | Low | High |
| P2 | Notes / grouping (informational dashed rectangle) | Low | Medium |
| P2 | Business-actor variant (`/` diagonal) | Low | Medium |
| P2 | Direction TB | Medium | Medium |
| P2 | `monochrome` and `dark` theme presets | Low | Medium |
| P3 | Layout diagnostics (`crossings`, `tightFit`) exposed via JSON API | Low | Low |
| P3 | Extension-point connector (line from `«extend»` label to the named extension point line) | Medium | Low |
| P3 | Future XMI export adapter | High | Low |

---

## 16. Out of Scope (Deferred)

- Cockburn fully-dressed use-case **text** templates (companion document type, not a diagram)
- Scenario tables, pre/postcondition lists
- Realisation / collaboration cross-diagram links
- XMI / EMF / Eclipse UML2 import-export
- Package and namespace containment
- Live editing or animation (Schematex is render-only)
- Sequence / activity / class diagrams — separate engines (§13)

---

## 17. Open Questions — NEEDS VICTOR INPUT

1. **Stereotype color policy.** Default plan: include arrows in `theme.stroke` (neutral), extend arrows in `theme.accent` (colored). Rationale: extend is rarer and benefits from visual emphasis. Alternative: both neutral, distinguished only by the keyword label. Question: does the colored-extend convention play well with the existing Schematex theme palette across the three presets, especially `monochrome`? Confirm before locking the theme tokens.
2. **Default direction.** Plan: `LR` (actors flanking subject horizontally). PlantUML and most textbooks default `LR`. Visio templates default `TB`. Confirm `LR`.
3. **Generalization tree threshold.** Plan: auto-merge shared arrowhead when ≥ 3 children of the same parent. Lower threshold (≥ 2) is more aggressive but matches how Visual Paradigm renders pairs. Confirm threshold.
4. **PlantUML compatibility ambition.** Plan: "inspired by," not 1:1. We accept the `:Actor:` and `(UseCase)` declaration forms but diverge on multiplicity and relationship syntax. Acceptable, or should we go further to be a drop-in PlantUML use-case replacement?
5. **`uml` namespace reservation.** This doc treats `uml` as reserved for future UML engines (class, sequence, etc.). Confirm we want to lock that — once shipped, freeing the keyword is a breaking change.
6. **Extension-point connector (v0.1 or v0.2?).** The base use case lists extension points; the `«extend»` relationship can name one via `(extension point: name)`. Question: do we draw a thin connector from the extend label to the named extension-point line in v0.1, or defer to v0.2 as currently planned? Drawing it makes the diagram more semantically rich but adds non-trivial routing complexity.
7. **External-system actor stereotype rendering.** Plan: always render `«actor»` above the name on the rectangle variant. UML 2.5 §18.1.5 shows it both with and without the stereotype. Confirm we keep it for unambiguity.

---

## 18. Implementation Status

**v0.1 — Implemented.** Header (`title` / `system` / `direction` / `generalization`) + actor (human / external-system, with `(business)` slash variant) + use case (ellipse, optional extension-point compartment) + subject rectangle + associations (`--` / `-->`) + `«include»` (`..>`) + `«extend»` (`<..`, with `[condition]` and `(extension point: …)`) + generalization (`--|>`, between actors and between use cases, with shared-head tree merge for ≥3 siblings) + multiplicity + custom stereotypes + deterministic layered layout (depth columns from include/extend/generalization chains, barycenter ordering, outer-side actor generalization bus) + parser-side validation of arrow direction, metaclass rules, identifier uniqueness, and extension-point references. PlantUML-aligned inline declaration form (`:Actor:` / `(UseCase)` / `as ID`) accepted. Engine lives in `src/diagrams/usecase/`; tests in `tests/usecase/`.

**Implemented design decisions (resolving §17 open questions, pending final confirmation):**
- `A <.. B` reads as "**A extends B**" — the left endpoint is the extension, the right is the base. The renderer always points the arrowhead at the base. (Note: this follows the §11.2 worked example; the §7.9 EBNF inline comment "target extends source" is treated as a doc slip.)
- Default direction `LR`. `TB` is parsed but layout is deferred (renders as `LR`).
- Generalization tree-merge threshold ≥ 3 sibling children sharing a parent.
- `«extend»` arrows are drawn in the theme accent color; `«include»` in the neutral stroke.
- External-system actors always render the `«actor»` stereotype above the name.

**v0.2+ deferred.** `TB` layout, extension-point connector from the `«extend»` label to the named base extension point, layout diagnostics via JSON, XMI export, package/namespace containment, sibling UML engines.

**v0.2+ deferred.** Extension-point connector from `«extend»` label to base's listed extension point, business-actor `/` variant, `TB` direction polish for very tall diagrams, layout diagnostics exposed via JSON, XMI export adapter, package/namespace containment, sibling UML engines (class, sequence, activity, component).
