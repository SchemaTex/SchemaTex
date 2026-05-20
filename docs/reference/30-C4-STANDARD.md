# 30 — C4 Model Standard Reference

*Simon Brown's C4 model — a hierarchical notation for software architecture organised into four nested zoom levels (System Context, Container, Component, Code). Schematex implements the visual subset that architects and engineers actually draw, with a text DSL designed for LLM generation rather than the verbose Structurizr DSL or PlantUML-C4 macro forest. v0.1 ships **Context** and **Container** diagrams; **Component** is deferred to v0.2, and the **Code** level is delegated to a future `umlclass` engine.*

> **Primary References:**
> - **Brown, Simon** (2018). *The C4 Model for Software Architecture* (InfoQ minibook). InfoQ. — https://www.infoq.com/minibooks/c4-model-software-architecture
> - **Brown, Simon.** *The C4 model for visualising software architecture* — canonical site, https://c4model.com (continually updated; 2018 → present).
> - **Brown, Simon** (2015). *Software Architecture for Developers, Vol. 2: Visualise, document and explore your software architecture.* Leanpub. ISBN 978-1326251503.
> - **Structurizr DSL** — Brown's reference textual notation: https://docs.structurizr.com/dsl. The most complete machine-readable expression of the C4 metamodel.
> - **C4-PlantUML** (plantuml-stdlib) — community macro library that reproduces C4 notation inside PlantUML: https://github.com/plantuml-stdlib/C4-PlantUML
> - **IcePanel** — commercial C4 modelling tool, useful for terminology cross-reference: https://icepanel.io
> - **arc42** (Starke, Hruschka). *Pragmatic Architecture Documentation* — companion documentation template; arc42 §5 ("Building Block View") aligns with C4 Container/Component levels.
> - **ISO/IEC/IEEE 42010:2022** *Systems and software engineering — Architecture description* — the umbrella standard within which C4 is a *viewpoint* (Brown maps C4 to 42010 viewpoints explicitly in his minibook §9).
> - **Mermaid C4 (experimental)** — https://mermaid.js.org/syntax/c4.html. Documented as experimental since 2021; chronically lags the rest of Mermaid and is widely cited as broken — see GitHub issues mermaid-js/mermaid#3251, #4504, #5210. Schematex closes that gap with a maintained, conformant implementation.

**Positioning.** C4 is the most widely adopted text-friendly notation for software architecture among practising software architects. It is taught in every major architecture course (O'Reilly, Pluralsight, the SEI's SAD curriculum), recommended by ThoughtWorks Tech Radar (Adopt, multiple editions), and used as the architecture-diagram standard at companies that publish their internal handbooks (Spotify, GitLab, Cloudflare). The notation has **two reference implementations**: the Structurizr DSL/SaaS (commercial, by Brown himself) and the PlantUML-based C4-PlantUML macro library (open-source, but requires a Java runtime). **No widely-adopted, dependency-free, embeddable JavaScript renderer exists.** Schematex closes that gap.

**Brown's published claim** is that the four nested levels collectively answer four distinct questions: *who uses the system?* (Context) → *what are its high-level building blocks?* (Container) → *what does one building block look like inside?* (Component) → *how is one component implemented?* (Code). The same DSL primitives — `person`, `system`, `container`, `component`, `->` — appear at every level; the diagram type is set by a single `level:` directive. This makes C4 unusually well suited to AI generation: an LLM can emit the same five primitives and let the renderer pick the right visual conventions per level.

**Relation to existing schematex engines.**

| Engine | Coverage | Why C4 is different |
|---|---|---|
| `flowchart` (§14) | Generic process / decision / architecture (Sugiyama DAG) | No notion of system/container/component levels, no Person element, no required `[Type: Tech]` notation, no boundary semantics. |
| `entity` (§13, ownership) | Corporate ownership trees with percentage rollup | C4 is technical containment, not legal/financial ownership; semantics and layout are different. |
| `bpmn` (§25, OMG 2.0.2) | Business processes, pools/lanes/events | BPMN models *runtime activity*; C4 models *static structure*. |
| `erd` (§27, crow's-foot) | Data model entities + relationships | ERD is data-level; C4 Container/Component is service-level. |
| `state` (§21, UML 2.5 / Harel) | State machines for one runtime object | Different abstraction entirely. |

C4 specifically reuses **~60% of the flowchart Sugiyama implementation** (cycle removal → layer assignment → barycenter ordering → Brandes-Köpf x-coords), parameterised with cluster constraints to honour Boundary boxes. The novel work is the symbol catalog (labelled rectangles with `[Type: Tech]` headers), the Person glyph option, and the dashed-boundary cluster geometry — all of which are small additions on top of the existing layered-DAG kernel.

---

## 1. Users & Needs

### 1.1 Personas

| Role | Scenario | Frequency | Why a generic flowchart isn't enough |
|---|---|---|---|
| **Software Architect** (senior / staff / principal) | "As-is" and "to-be" architecture for design reviews, ADRs, RFCs, architecture decision councils | Weekly | Needs the C4 hierarchy itself (Context vs Container), `[Type: Tech]` notation, dashed boundaries — these *are* the conventions reviewers expect |
| **DevOps / SRE** | Infra topology in incident write-ups, runbooks, on-call wikis | Weekly | Needs to distinguish *external systems* (third-party SaaS, OAuth providers) from *internal containers* visually |
| **Engineering Manager** | Onboarding new engineers ("here's how our system fits together") | Per-hire | Context diagram is the single most-printed onboarding artefact; needs colour palette that prints well |
| **Tech Lead in a microservices org** | Service maps, dependency review, deprecation planning | Daily | Container-level view of 10–50 services; needs grid-layout hint and stable IDs across versions |
| **Solutions Architect at a consulting firm** | Client-facing proposals, "current state" / "future state" decks | Per-engagement | Needs printable monochrome theme + clean PNG/SVG export |
| **Platform Engineer** | Internal developer platform diagrams in `golden-paths` docs | Monthly | Needs containers grouped by Boundary (Platform Boundary, Application Boundary, etc.) |
| **Compliance / Security Architect** | Data-flow / trust-boundary diagrams for SOC 2, ISO 27001, PCI audits | Quarterly | Needs to overlay trust-boundary dashed boxes around containers; needs external-system desaturation to draw the auditor's eye |
| **OSS Project Maintainer** | "How does this project work?" diagrams in `README.md` and `ARCHITECTURE.md` | Once per major release | Wants a few lines of DSL committed alongside the code that always re-renders correctly |
| **Architecture Course Student** | Coursework, capstone projects | Term-paced | Textbook C4 notation per Brown's minibook is required |
| **LLM (ChatDiagram generation side)** | "Diagram our system: a Next.js front-end calling a FastAPI backend with Postgres and Redis" | Daily, thousands of times | Cannot reliably emit Structurizr DSL (model/views block separation, identifier scoping, `relationship` keyword) or PlantUML-C4 macros (`!include` URLs, `Boundary()` vs `System_Boundary()` collisions); needs a compact, position-tolerant DSL |

### 1.2 What Schematex must do better than the alternatives

1. **Compact text DSL.** A 12-element Container diagram should be ~20 lines. Structurizr DSL splits the same diagram across `model { }` and `views { }` blocks (~50 lines); PlantUML-C4 requires per-file `!includeurl` of GitHub-hosted macro libraries (~60 lines plus runtime resolution).
2. **No external runtime.** PlantUML needs Java. Structurizr needs the Structurizr CLI or SaaS. Schematex needs `npm install schematex` and renders in the browser, in Node SSR, or in a Cloudflare Worker.
3. **Embeddable SVG output.** No PNG round-trip; no iframe; no server-side render call.
4. **Notation discipline enforced.** Every C4 element must carry a `[Type]` tag (Brown's hallmark convention) — the parser refuses to emit a node without one rather than silently dropping the convention.
5. **Levels are first-class.** `level: context | container | component` is a single directive. Switching levels keeps the same identifiers and relationships, only changing what is shown — matching Brown's "zoom in / zoom out" mental model.
6. **AI-friendly error messages.** When a relationship label is missing, the error says *"every relationship needs a purpose label, e.g. `A -> B \"Reads from\"`"* — not a parse-position byte offset.
7. **Themeable to corporate brand.** Brown's reference palette (`#08427B` person, `#1168BD` system, `#438DD5` container, `#85BBF0` component, `#999999` external) is the default; any token can be overridden via CSS custom properties.
8. **SSR-safe.** Renders without `window`, `document`, or canvas measurement APIs.

---

## 2. Market Need

### 2.1 Search-volume signal (Ahrefs 2026 Q1)

| Keyword | US monthly | Global monthly | KD |
|---|---:|---:|---:|
| `c4 model` | 1,100 | 13,000 | 8 |
| `c4 diagram` | 900 | 7,200 | 9 |

**Interpretation.** The volume is modest compared to `flowchart` (US 103,000) or `bpmn` (high six-figure global), but **competition is uniquely low**: Keyword Difficulty of 8 and 9 is in the rare *"newer technical community, no SEO incumbent"* tier. The audience is also dense in the right way — these searches are dominated by senior engineers in companies that pay for tooling, not students. Acquisition cost per qualified L2/L3 user should be markedly lower than for `flowchart`.

A second observation: a meaningful share of `c4 diagram` traffic currently lands on the *Mermaid C4 docs page*, which is labelled "experimental" and is plainly broken (see the open issues cited above). That traffic is unmet demand for a working open-source implementation.

### 2.2 Competitive landscape

| Product | Positioning | License | Key gap |
|---|---|---|---|
| **Structurizr DSL + Lite/Cloud/On-Premises** (by Simon Brown) | Canonical authoring; same author as C4 | Apache 2.0 DSL + freemium SaaS | DSL is verbose (split `model`/`views`); SaaS / on-prem renderer is the value-add and is paywalled past the free tier |
| **C4-PlantUML** | PlantUML macro library | MIT macros + GPL/MIT runtime | Requires Java + PlantUML server / local jar; `!includeurl` resolves over the network; macro library is large and surprising |
| **Mermaid C4Context** | Markdown DSL | MIT | Marked experimental since 2021; broken on common inputs; not maintained at the cadence of the rest of Mermaid |
| **IcePanel** | Modern C4 SaaS with collaboration | Commercial (free tier limited) | Paywalled; closed; not embeddable as a library |
| **draw.io C4 shape library** | Free shape library inside draw.io | Apache 2.0 | Shapes only — no DSL, no auto-layout, no validation |
| **Lucidchart C4 templates** | Templates inside Lucidchart | Commercial | Manual placement; not text-first |
| **Miro C4 templates** | Templates inside Miro | Commercial | Manual placement; not text-first |
| **ilograph** | Multi-perspective architecture diagrams | Freemium | Adjacent format, not strict C4 |
| **draw.io + plantuml-server self-host** | Self-hosted alternative | Apache + GPL | Two services to run; still no embeddable JS library |

**Schematex differentiation:**

- The only **dependency-free, zero-Java, embeddable TypeScript** C4 renderer.
- DSL closer in spirit to Structurizr than to PlantUML-C4 (block-scoped model with implicit views), but compressed and more forgiving than either.
- AGPL-3.0 community track plus a commercial-licence track for SaaS embedders — matching Schematex's project-wide dual-licensing.
- AI-native: a 12-element Container diagram is ~20 lines of DSL.
- Output-only renderer (no XML/JSON round-trip), avoiding the chronic Structurizr/PlantUML diff churn around generated coordinates.

---

## 3. Standard Compliance

### 3.1 What we implement (v0.1)

The **C4 model as published by Simon Brown** at c4model.com and in the InfoQ minibook (2018). Specifically:

- **Two of the four levels:** *System Context* and *Container*.
- All four primary element types: **Person**, **Software System**, **Container**, and **Relationship**.
- Element scoping: a Container is rendered only inside a Software System Boundary.
- The notation discipline: every visible element bears a **type tag** (`[Person]`, `[Software System]`, `[Container: <tech>]`) and an optional description line.
- Two boundary types: **System Boundary** (dashed rectangle around the system being detailed) and **Enterprise Boundary** (outermost dashed rectangle representing the modelling organisation; optional).
- External/Internal distinction by colour desaturation, following Brown's reference palette.
- Relationship labelling: every relationship carries a **purpose** label and an optional **technology** tag in brackets.

### 3.2 What v0.1 deliberately defers

| Deferred | Target | Why |
|---|---|---|
| **Component level** | v0.2 | Reuses the Container kernel verbatim; needs only one more `level:` value and a stricter rule on what may appear inside a Container Boundary |
| **Code level** | future `umlclass` engine | The Code level *is* a UML class diagram (Brown 2018, ch.4); it belongs in a dedicated UML engine, not in `c4` |
| **Dynamic / Runtime / Deployment diagrams** | v0.3+ | C4 has three supplementary diagram types (Dynamic shows runtime collaboration; Deployment maps containers to infrastructure; Runtime is a hybrid) that share the C4 vocabulary but add new conventions (numbered sequence arrows, deployment-node nesting) |
| **System Landscape diagram** | v0.2 | An optional *zoom-out* view above Context, showing multiple software systems together |
| **Filtered views** (Structurizr concept) | not planned | Showing a subset of the model in different diagrams; Schematex's model-per-file approach makes this less necessary |
| **`workspace.dsl` parity with Structurizr** | not planned | Importing existing Structurizr workspaces is a transformation tool, not a renderer |

### 3.3 Notation discipline rules (parser-enforced)

Following Brown's published guidance:

1. **Every element has a type tag.** The parser rejects `person User` without an associated `[Person]` rendering; the type is derived from the DSL keyword. This is the C4 hallmark and is not optional.
2. **Every relationship has a purpose label.** A relationship line with no quoted label triggers a validation error with a remediation hint.
3. **A Container only exists inside a Software System.** A bare top-level `container` is rejected.
4. **A Component only exists inside a Container.** (v0.2.)
5. **Levels are explicit.** Omitting `level:` is a warning (defaults to `container`).
6. **External systems are explicitly tagged.** `system_external` is a distinct keyword; the renderer desaturates the fill.

---

## 4. Symbol Catalog

C4 elements are deliberately simple — labelled rectangles, the occasional stick-figure for Person, and directed arrows. The discipline is in the *labelling convention* and the *colour semantics*, not in shape variety.

### 4.1 Element shapes

| Element | Shape | Default size | Header line | Body line(s) |
|---|---|---|---|---|
| **Person** | Rounded rectangle (corner radius 8) with optional stick-figure glyph above | 200 × 130 | `[Person]` (small caps, top) | Name (bold), description (muted) |
| **Software System** | Rectangle, corner radius 6 | 240 × 130 | `[Software System]` | Name, description |
| **Software System (external)** | Rectangle, corner radius 6 | 240 × 130 | `[Software System]` | Name, description |
| **Container** | Rectangle, corner radius 4 | 240 × 130 | `[Container: <tech>]` | Name, description |
| **Container (external)** | Same as above, desaturated palette | 240 × 130 | `[Container: <tech>]` | Name, description |
| **Component** (v0.2) | Rectangle, corner radius 2 | 220 × 110 | `[Component: <tech>]` | Name, description |
| **System Boundary** | Dashed rectangle around child elements | auto | `<name>` label at top-left inside the rectangle | "[System]" or "[Container Boundary]" italic muted label below |
| **Enterprise Boundary** | Dashed rectangle, outermost; thicker dash | auto | `<organisation name>` | "[Enterprise]" italic |

The label layout inside each box is canonical:

```
┌───────────────────────────────────┐
│         [Container: Spring Boot]  │  ← type header, 10px, small-caps
│                                   │
│            API Application        │  ← name, 14px, bold
│                                   │
│   Provides JSON/HTTPS API for     │  ← description, 11px, regular
│   web and mobile clients          │
└───────────────────────────────────┘
```

Three text rows with consistent vertical rhythm; the type header is always present even when the description is omitted. This is the visual signature of C4 — Brown insists on it in every published diagram.

### 4.2 Stick-figure glyph (Person)

For Person elements, Schematex offers a binary toggle:

- `person User "..."` — labelled rectangle only (the default; renders well at small scale).
- `person User "..." figure` — labelled rectangle with a small stick-figure (circle head + line body + arms + legs) above the rectangle, centred. The figure is decorative; the rectangle still carries the canonical three-row label.

Brown's published examples show both forms. The figure is more recognisable at presentation scale; the bare rectangle is denser for tight layouts. Default is **figure-on**, with the figure suppressed below a 0.6× zoom factor.

### 4.3 Relationship arrows

| Style | Line | Arrowhead | When used |
|---|---|---|---|
| **Solid arrow** | solid 1.5px | filled triangle | Synchronous calls, data flow with response |
| **Dashed arrow** | dashed 4-3 | filled triangle | Asynchronous calls, events, messaging |
| **Bidirectional** | solid 1.5px | filled triangle at both ends | Symmetric collaboration (use sparingly — Brown discourages this) |

DSL syntax:

| DSL | Meaning |
|---|---|
| `A -> B "label"` | Synchronous |
| `A ..> B "label"` | Asynchronous |
| `A <-> B "label"` | Bidirectional |
| `A -> B "label" [HTTPS]` | With explicit technology |
| `A -> B "label" [JSON/HTTPS, async]` | Multi-tag technology |

Every relationship label is a quoted string describing the **purpose** ("Reads from", "Sends mail using", "Publishes events to"). The optional `[...]` tag describes the **technology**.

### 4.4 Boundary conventions

| Boundary | DSL | Visual |
|---|---|---|
| **System Boundary** | `system Foo "..." { container ... }` | Dashed rectangle drawn around all child containers; label "Foo" top-left; sub-label "[System]" italic |
| **Container Boundary** (v0.2) | `container Foo "..." { component ... }` | Dashed rectangle around child components; label "Foo" top-left; sub-label "[Container]" italic |
| **Enterprise Boundary** | `enterprise "BigBank plc" { ... }` | Dashed rectangle, outermost; thicker dash pattern (8-4 vs 4-3) |
| **Deployment Boundary** | (v0.3) | Solid rectangle with rounded outer corners; encloses containers running on the same infrastructure node |

Boundary geometry: the bounding rectangle is computed as the union of child rectangles inflated by an 18px padding on all sides; the label sits at `(boundary.x + 12, boundary.y + 18)`.

### 4.5 Colour palette

Brown's reference palette, mapped to Schematex theme tokens:

| Element | Brown's hex | BaseTheme token | Notes |
|---|---|---|---|
| Person | `#08427B` (deep blue) | `theme.colors.primary.dark` | Strongest hue; Brown rationalises this as "people are the most important element" |
| Software System | `#1168BD` (mid blue) | `theme.colors.primary.base` | One shade lighter than person |
| Container | `#438DD5` (lighter blue) | `theme.colors.primary.light` | One shade lighter than system |
| Component | `#85BBF0` (palest blue) | `theme.colors.primary.lighter` | Used at v0.2 |
| External (any level) | `#999999` (mid grey) | `theme.colors.muted.base` | Desaturated to draw the reader's eye to what the team owns |
| Boundary stroke | `#666666` (dark grey) | `theme.colors.stroke.muted` | Dashed |
| Relationship | `#707070` | `theme.colors.stroke.relationship` | Slightly lighter than boundary stroke |
| Label text on filled box | `#FFFFFF` | `theme.colors.text.inverted` | Always white on the blue palette for AAA contrast |

Two preset themes ship in v0.1:

- **`brown`** (default) — Brown's reference palette verbatim.
- **`monochrome`** — Black/white/grey for print and accessibility-strict environments. Hierarchy encoded by stroke weight (Person: 2px, System: 1.5px, Container: 1px) rather than hue.

A `dark` preset is planned for v0.2.

---

## 5. DSL Grammar

### 5.1 Header

```
c4
level: context | container | component       # required for v0.1; component reserved
title: "Internet Banking System — Container View"
direction: lr | td | grid                    # layout hint; default td
theme: brown | monochrome                    # default brown
```

### 5.2 Element declarations

```
person User "A customer of the bank, with personal banking accounts"
person Admin "Bank operations staff" figure

system_external EmailSystem "Microsoft Exchange" "The internal Microsoft Exchange e-mail system"
system_external MainframeBanking "Stores all of the core banking information"

system BankingSystem "Allows customers to view information about their bank accounts" {
  container WebApp "Java, Spring MVC" "Delivers the static content and the Internet banking single page application"
  container SPA "JavaScript, Angular" "Provides all of the Internet banking functionality to customers via their web browser"
  container MobileApp "C#, Xamarin" "Provides a limited subset of the Internet banking functionality to customers via their mobile device"
  container API "Java, Spring Boot" "Provides Internet banking functionality via a JSON/HTTPS API"
  container Database "Oracle Database" "Stores user registration information, hashed authentication credentials, access logs, etc."
}
```

Element syntax forms (case-insensitive keywords; identifiers are case-sensitive):

```
person          <Id> "<Name>" ["<Description>"] [figure]
system          <Id> "<Name>" ["<Description>"] [ { containers } ]
system_external <Id> "<Name>" ["<Description>"]
container       <Id> "<Tech>" ["<Description>"]
container_external <Id> "<Tech>" ["<Description>"]    # rare; for borrowed containers from another team's system
component       <Id> "<Tech>" ["<Description>"]       # v0.2
```

**Identifiers** are alphanumeric (plus `_`); they are referenced by the relationships section.

**`Tech`** is a free-form string (`"Spring Boot"`, `"Postgres 15"`, `"React + Next.js"`). It is rendered inside the `[Container: ...]` header. There is no enum of allowed technologies — C4 is deliberately tech-agnostic.

### 5.3 Relationships

```
User       -> WebApp        "Visits using"              [HTTPS]
User       -> MobileApp     "Uses"
WebApp     -> SPA           "Delivers"                  [HTTPS]
SPA        -> API           "Makes API calls to"        [JSON/HTTPS]
MobileApp  -> API           "Makes API calls to"        [JSON/HTTPS]
API        -> Database      "Reads from and writes to"  [JDBC]
API        -> MainframeBanking "Makes API calls to"     [XML/HTTPS]
API        ..> EmailSystem  "Sends e-mail using"        [SMTP]
```

The arrow keywords are:

| Arrow | Style | Use |
|---|---|---|
| `->` | solid | synchronous |
| `..>` | dashed | asynchronous |
| `<->` | solid both heads | bidirectional |

Quoted label is **mandatory**. Bracketed technology tag is optional; comma-separated multi-tag is allowed (`[JSON/HTTPS, async]`).

### 5.4 Enterprise boundary

```
enterprise "BigBank plc" {
  system BankingSystem "..." { ... }
  system_external MainframeBanking "..."   # external to the BankingSystem, internal to the enterprise
}
person User "..."                          # outside the enterprise → outside the box
```

The Enterprise Boundary is a *visual* wrapper; it has no impact on relationship semantics. It is useful in slide-deck-quality landscape diagrams to communicate organisational scope.

### 5.5 Manual position hints

The default Sugiyama layout is good enough for ~90% of diagrams. For the residual cases — usually high-stakes architecture-review slides where the architect insists on a specific layout — there are three escape hatches:

```
direction: lr           # left-to-right (default for Container views)
direction: td           # top-down (default for Context views)
direction: grid         # explicit grid: each element declares its cell

container API "Spring Boot" "..." { position: 2, 3 }    # column 2, row 3 in grid layout
```

When `direction: grid` is set, every element **must** declare `position: col, row`. The parser fails fast otherwise. This is intentionally rigid — grid mode is the "I know what I'm doing" mode.

### 5.6 Comments and whitespace

- `#` to end of line is a comment.
- Indentation is ignored; the parser uses braces for nesting.
- Quoted strings may contain spaces and most printable Unicode; embedded quotes use `\"`.

### 5.7 Validation rules (parser-enforced)

1. Every relationship references existing element identifiers.
2. Every relationship has a quoted purpose label.
3. A `container` declaration is illegal at the top level — it must be inside a `system`.
4. A `component` declaration (v0.2) is illegal outside a `container`.
5. `level: context` hides containers; `level: container` hides components; `level: component` hides everything below.
6. In `direction: grid`, every visible element must declare `position`.
7. An element may not be both internal and external (no double-declaration).
8. Cycles in `system`/`container` containment are rejected at parse time.
9. Self-loop relationships (`A -> A`) are warned about but not rejected (Brown's published examples occasionally use them for "polls itself" cases).

---

## 6. Layout Rules

C4 layout is a *constrained Sugiyama layered DAG*, with two domain-specific extensions over the generic `flowchart` kernel: **cluster constraints** (Boundary boxes are first-class layout regions) and **role-based ordering biases** (Persons gravitate to the top of a Context view; Databases sink to the bottom of a Container view).

### 6.1 Algorithm pipeline

Identical primitives to `flowchart` (§14), with the C4-specific additions noted:

1. **Cycle removal.** Reverse edges in a feedback arc set so the residual graph is a DAG. Bidirectional `<->` edges are split into two opposing edges before this step and reunited at render time.
2. **Layer assignment.** Longest-path layering by default. C4-specific: Persons are weighted to layer 0 in `level: context`; Databases (a soft heuristic based on the tech tag matching `/database|sql|postgres|mysql|oracle|sqlite|mongo|redis|cassandra|dynamo/i`) are weighted toward the deepest layer in `level: container`.
3. **Cluster constraint propagation.** Every child element of a Boundary is constrained to the same contiguous range of layers and the same contiguous range of x-positions. The Boundary box is laid out as a single super-node in a higher-level Sugiyama pass, then expanded recursively. This is the canonical *layered-and-clustered* approach (Sander 1996; Forster 2002).
4. **Crossing minimisation.** Barycenter heuristic; up to 24 iterations.
5. **x-coordinate assignment.** Brandes-Köpf with vertical alignment of medians.
6. **Edge routing.** Orthogonal Manhattan with dummy nodes for long edges, snapped to a 10px grid. Edges entering/leaving a Boundary cross the dashed border at right angles where possible.

### 6.2 Direction modes

| `direction:` | Default for | Layer axis | Element spacing |
|---|---|---|---|
| `td` (top-down) | `level: context` | Layers stack vertically | 80px between layers; 40px between siblings |
| `lr` (left-right) | `level: container` | Layers stack horizontally | 120px between layers; 40px between siblings |
| `grid` | manual layouts | Explicit `position: col,row` | 280px column width; 180px row height; uniform |

The defaults match Brown's typical published examples: Context diagrams read top-down (users at the top, system in the middle, external systems below), and Container diagrams read left-right (front-ends on the left, back-ends in the middle, data stores on the right).

### 6.3 Boundary geometry

For each Boundary:

- Compute the bounding box of all child element rectangles.
- Inflate by **18px** on all sides.
- Stroke: dashed `4-3` pattern (System Boundary) or `8-4` (Enterprise Boundary); 1.5px stroke weight.
- Label: top-left, inside the boundary, font-size 12px, weight 500.
- Sub-label: directly below the label, italic, muted, font-size 10px, content `"[System]"` / `"[Container]"` / `"[Enterprise]"`.

When two Boundaries would overlap, the layout backs off the offending element by one barycenter step. If overlap persists after the iteration cap, the renderer warns and emits the diagram anyway (graceful degradation).

### 6.4 Edge label placement

C4 edges carry two strings — purpose and (optional) technology — that should not be confused. The renderer stacks them as a two-line label centred on the edge's first-bend midpoint:

```
  ┌─────────────┐                  ┌──────────────┐
  │  WebApp     │  Delivers SPA     │   SPA        │
  │  Spring MVC │  ───────────────▶ │  Angular     │
  │             │  [HTTPS]          │              │
  └─────────────┘                   └──────────────┘
```

The purpose label is regular 11px; the technology tag below it is muted 10px in monospace. Each line has a 4px halo background to avoid line overlap, matching the flowchart engine's convention.

For long edges (3+ layers), the label sits at the midpoint of the longest straight segment. If that segment is shorter than the label width, the label is moved to the second-longest segment.

### 6.5 Person rendering

When `person Foo "..." figure` is used, the figure is drawn above the labelled box:

```
        ○
       /|\
       / \
   ┌────────────┐
   │  [Person]  │
   │  User      │
   │  A customer│
   └────────────┘
```

Figure dimensions: head r=8, body height 16, arm span 18, leg span 14. Total figure column adds 40px to element height. In a grid layout this affects row pitch; in Sugiyama this widens the layer.

### 6.6 Theme integration

The renderer reads `BaseTheme` and the `c4` extension namespace:

```ts
interface C4Tokens {
  person: { fill: string; stroke: string; text: string; figure: string };
  system: { fill: string; stroke: string; text: string };
  container: { fill: string; stroke: string; text: string };
  component: { fill: string; stroke: string; text: string };
  external: { fill: string; stroke: string; text: string };
  boundary: { stroke: string; label: string; sublabel: string; dashArray: string };
  enterpriseBoundary: { stroke: string; label: string; dashArray: string };
  relationship: { stroke: string; arrow: string; label: string; tech: string };
}
```

Brown's palette is the `brown` preset's literal contents. The `monochrome` preset overrides all fills to white and all strokes to grey-scale gradations; the `external` token in monochrome uses a 4-pixel diagonal hatching fill instead of the desaturated grey.

---

## 7. Canonical Test Cases

All five must round-trip through the rendering pipeline (parser → layout → SVG) without warnings.

### 7.1 Minimal Context — single system, single user

The smallest publishable C4 diagram: one Person, one Software System, one Relationship. Used as the "hello world" example in Brown's tutorials.

- 1 person ("User"), 1 system ("MyApp"), 1 relationship ("Uses").
- `level: context`, `direction: td`.
- Should render as a top-down pair with the user above, the system below, and a single arrow labelled "Uses" between them.

This test exercises the minimum-viable rendering path and is the example shown in the Schematex landing page.

### 7.2 Brown's "Big Bank plc" — Container view

Simon Brown's canonical Container diagram, reproduced verbatim from c4model.com:

- 1 external person ("Personal Banking Customer").
- 1 enterprise boundary ("Big Bank plc") containing:
  - 1 system boundary ("Internet Banking System") containing:
    - 5 containers: Web Application (Java/Spring MVC), Single-Page Application (JavaScript/Angular), Mobile App (Xamarin), API Application (Java/Spring Boot), Database (Oracle).
  - 2 external systems inside the enterprise boundary: Mainframe Banking System, E-mail System.
- 8 relationships with technology tags (HTTPS, JSON/HTTPS, JDBC, XML/HTTPS, SMTP).

This is the **must-match** reference. Schematex's output must be visually equivalent to Brown's published diagram modulo whitespace and exact pixel positions. It exercises: every element type, the enterprise boundary, the system boundary, both internal and external containers, multiple technologies on relationships, and a dense (5-into-1) fan-in to the database. ~14 elements.

### 7.3 Modern SaaS architecture with externals

A realistic 2026 SaaS stack:

- 1 person (End User).
- 1 system boundary ("SaaS Product") containing:
  - 6 containers: Marketing Site (Next.js on Vercel), Application Frontend (Next.js on Vercel), Application API (FastAPI on Fly.io), Background Worker (Celery on Fly.io), Operational DB (Postgres on Neon), Cache (Redis on Upstash).
- 5 external systems: Stripe (billing), Auth0 (authentication), Anthropic API (LLM), Resend (transactional email), Sentry (observability).
- ~14 relationships covering synchronous HTTPS calls, async event publishing, and webhook receipt.

Exercises: many externals, the `..>` async arrow, technology tags with slashes (`HTTPS/JSON`), and a realistic fan-out from the API container.

### 7.4 Microservices stress test — 12 containers, 1 system

A microservices architecture inside a single system boundary:

- 1 person (Customer).
- 1 system boundary ("E-commerce Platform") with 12 containers: API Gateway, Auth Service, Catalogue Service, Inventory Service, Cart Service, Checkout Service, Order Service, Payment Service, Shipping Service, Notification Service, Search Service (Elasticsearch), Event Bus (Kafka).
- 3 data stores: Product DB (Postgres), Order DB (Postgres), Session Cache (Redis).
- 2 external systems: Stripe, Twilio.
- ~22 relationships, including a fan-out from the Event Bus to 6 consumers and 4 producers publishing into it.

This is the **layout stress test**. The expected output is an `lr` layout where the Gateway and Auth sit on the left, business services in the middle, and data stores plus externals on the right. Crossing minimisation should keep the Event Bus near the centre so that its many edges do not produce a hairball. ~17 elements (plus relationships).

### 7.5 Multi-system landscape

A landscape view showing three related software systems within one enterprise:

- 1 enterprise boundary ("Acme Corp").
- 3 internal systems: Customer Portal, Internal Admin Tool, Reporting Pipeline.
- 2 external systems: Salesforce, AWS S3.
- 2 persons: Customer (external to enterprise), Employee (internal to enterprise).
- ~10 relationships between systems.
- `level: context`.

Exercises the multi-system Context view, the optional enterprise boundary, and the layout of persons both inside and outside the boundary.

---

## 8. Theme Integration

### 8.1 Mapping to BaseTheme

C4 introduces no new tokens at the BaseTheme level; every C4 colour is a derivative of the BaseTheme primary scale (Brown's palette happens to be a single-hue progression, which matches the BaseTheme primary scale design). The `brown` preset registers literal hex values; the `monochrome` preset replaces them with grey-scale gradations and increases stroke weights to preserve hierarchy.

### 8.2 External vs internal

The internal/external split is encoded in the BaseTheme `muted` namespace:

- Internal element: `theme.colors.primary.*` (saturated blue scale).
- External element: `theme.colors.muted.*` (desaturated grey scale).

This is structural — the renderer never hard-codes external as grey — so a user who themes Schematex with a green primary palette will get green internal elements and (still) grey externals automatically. The grey is fixed because *contrast against the primary palette* is the load-bearing property, not absolute hue.

### 8.3 Dashed-stroke patterns

| Boundary | Dash pattern (CSS `stroke-dasharray`) |
|---|---|
| System Boundary | `4 3` |
| Container Boundary (v0.2) | `4 3` |
| Enterprise Boundary | `8 4` |
| Async relationship | `4 3` |

The Enterprise Boundary uses a larger dash specifically to remain visually distinct when nested inside a System Boundary at smaller print sizes.

### 8.4 Accessibility

- All text colour pairs meet WCAG AA at 11px and AAA at 14px (verified against Brown's reference palette).
- The `monochrome` preset adds a 4-pixel diagonal hatching to external systems to keep them distinguishable from internal systems in greyscale print.
- `<title>` and `<desc>` elements are emitted on every node so that screen readers read out the C4 type, name, and description.

---

## 9. Pitfalls & Gotchas

The C4-specific footguns that the parser and renderer must catch — or, where they cannot, warn about:

1. **Missing type tag on a relationship.** The most common LLM mistake: emitting `A -> B` without a label. Schematex rejects unlabelled relationships outright with a remediation hint.
2. **Confusing `[Type]` with `[Technology]`.** Some users (and many LLMs) write `[Spring Boot]` next to a container's *name* instead of its tech header. Schematex auto-promotes a bracketed string in the second slot to `tech`.
3. **Forgetting the difference between Person and Software System.** PlantUML-C4 users sometimes use `System(User, ...)` for end users. Schematex's `person` vs `system` are not interchangeable; using `system User` will render a blue rectangle without a stick-figure and confuse readers.
4. **Container outside a System.** The parser rejects top-level containers; Brown's C4 explicitly requires containment.
5. **`level: context` with containers declared.** Containers are silently hidden, not rejected. A warning is emitted.
6. **Bidirectional arrows used as a shortcut for two services that call each other.** Brown discourages `<->` in published guidance — it usually means the architect has not thought about which call is upstream. Schematex emits a soft warning.
7. **External system inside a System Boundary.** Visually allowed and sometimes intentional (the external system is logically inside the enterprise but external to the modelled system); the renderer applies the external desaturation regardless of containment.
8. **Hard-coding `direction: grid` for everything.** Tempting because it gives pixel-perfect output, but defeats the layered layout. Use sparingly; the `grid` mode is for the boss-presentation override case.
9. **Long tech strings overflowing the rectangle.** The renderer truncates at 32 characters with an ellipsis and exposes the full string in the SVG `<title>`.
10. **Person glyph hidden at low zoom.** When the diagram is embedded at < 0.6× zoom, the stick figure becomes pixel-noise; the renderer auto-suppresses it below this threshold but keeps the rectangle.
11. **Container Boundary collisions with sibling boundaries.** The crossing-minimisation pass treats each Boundary as a super-node; if the user manually mixes `direction: grid` for some boundaries and not others, the result can be ugly. Mixed-direction layouts are not supported in v0.1.
12. **Identifier collisions across levels.** A `container API` and a `component API` in different files conflict if both are loaded into the same model. Identifiers are scoped to the enclosing parent; the parser emits a path-qualified identifier (`BankingSystem.API`) when ambiguity arises.
13. **Empty system boundaries.** A `system Foo { }` with no containers is legal at `level: context` (it renders as a single Software System rectangle without a boundary) and ill-formed at `level: container` (warning).
14. **Whitespace in identifiers.** `container "My Service"` is invalid; quoted strings are *names*, not IDs. The parser hints to use `container MyService "My Service"`.

---

## 10. Out of Scope (Deferred)

- **Component diagrams.** v0.2. The parser reserves the keyword and the level.
- **Code-level diagrams.** Permanently delegated to a future `umlclass` engine. The C4 level itself is just a UML class diagram, and conflating it with C4 would re-implement UML inside this engine — the wrong layer for the abstraction.
- **Dynamic / Runtime diagrams.** Optional C4 supplementary types. v0.3+; will require numbered sequence arrows and shared identifiers with the Container view.
- **Deployment diagrams.** Optional C4 supplementary type that maps containers onto infrastructure (Kubernetes nodes, AWS regions, on-prem racks). v0.3+; requires deployment-node nesting and a richer external/infra palette.
- **System Landscape diagrams.** v0.2. A zoom-out view above Context.
- **Structurizr DSL import.** Not planned. A separate `structurizr2schematex` CLI tool may eventually exist but is outside this engine's remit.
- **PlantUML-C4 import.** Not planned. PlantUML-C4 macros embed positional information that does not round-trip cleanly through a layered-layout renderer.
- **Filtered views.** Structurizr's concept of multiple views over one shared model. Schematex's file-per-diagram model is intentional and obviates the feature.
- **Tag-based styling.** Structurizr supports user-defined tags with per-tag styles. Schematex defers this to BaseTheme overrides via CSS custom properties.

---

## 11. Implementation Status

**v0.1 (planned for next release).** Context and Container diagrams; `person`, `system`, `system_external`, `container`, `container_external`, `enterprise`, `system` boundary; relationships `->`, `..>`, `<->` with mandatory purpose label and optional technology tag; `direction: lr|td|grid`; `theme: brown|monochrome`; manual `position: col, row` override in grid mode; full set of validation rules from §5.7; Sugiyama layered layout with cluster constraints from §6.

**v0.2 (planned).** Component level; System Landscape view; the `component` and `container_external` containment rules.

**v0.3+ (deferred).** Dynamic, Runtime, and Deployment diagrams; richer themes; tag-based per-element styling via DSL.

**Permanently out of scope.** Code-level diagrams (delegated to a future `umlclass` engine).

---

## 12. Future Expansion

### 12.1 Component diagrams (v0.2)

Components are the natural next step. The grammar extension is minimal:

```
container API "Spring Boot" "Provides JSON/HTTPS API" {
  component AuthController "Spring MVC Controller" "Handles auth endpoints"
  component AccountController "Spring MVC Controller" "Handles account endpoints"
  component SecurityComponent "Spring Bean" "Handles JWT verification"
  component AuditComponent "Spring Bean" "Writes audit records"
}
```

Layout-wise, components reuse the System Boundary geometry from v0.1; the only novel rendering is the slightly smaller corner radius (2 vs 4) and the slightly paler default fill (`#85BBF0`).

### 12.2 `umlclass` engine (separate diagram type)

The Code level of C4 is a UML class diagram with the four classic compartments (name, attributes, operations, inner classes) and the seven relationship types (association, aggregation, composition, generalisation, realisation, dependency, nested). UML class diagrams have their own published standard (OMG UML 2.5.1, ISO/IEC 19505) and their own dedicated layout heuristics (Battista's orthogonal grid layouts for UML are unrelated to Sugiyama). The right engineering decision is to keep `c4` clean and ship `umlclass` as a separate engine in a later milestone.

### 12.3 System Landscape (v0.2)

A landscape diagram is a Context diagram with multiple Software Systems shown at the same level. The grammar already supports this implicitly — a single `c4` file with multiple top-level `system` declarations *is* a landscape diagram in v0.1. The v0.2 work is mainly about labelling and tutorial documentation, not new syntax.

### 12.4 Tag-based styling (v0.3+)

Structurizr's tags let an architect mark all `Microservice` containers with a custom colour. The Schematex equivalent will be:

```
container Foo "Spring Boot" "..." tags: [Microservice, Critical]
```

With per-tag styles registered in the theme. Deferred until the v0.1/v0.2 base is stable.

### 12.5 Adapters

Future post-v0.3 adapter work that is **not** within this engine but is enabled by it:

- `structurizr-import` — read a Structurizr `workspace.dsl` and emit Schematex DSL.
- `c4-plantuml-import` — read a C4-PlantUML file and emit Schematex DSL (best-effort; PlantUML coordinates do not round-trip).
- `schematex-c4 -> structurizr-export` — emit a Structurizr workspace JSON from a Schematex C4 file, for users who want Structurizr's hosted views.

These belong in separate packages and are not in scope for this reference doc.

---

## 13. Open Questions (NEEDS VICTOR INPUT)

These design choices have a defensible default but warrant explicit confirmation before v0.1 implementation begins.

1. **DSL keyword `c4` vs `c4model`.** This doc uses `c4`. Structurizr uses `workspace`; PlantUML uses `@startuml` with included macros. Short keyword reads better and lines up with `bpmn`/`erd`/`pid`. Confirm.
2. **Person glyph default: figure-on or figure-off?** This doc proposes figure-on (matches Brown's published examples). Figure-off renders denser and may suit Container views better. Confirm — and consider whether the default should depend on `level:`.
3. **Default direction.** Top-down for Context, left-right for Container. Some practitioners prefer top-down for both (matches the user-funnel mental model). Confirm.
4. **Should `<->` be allowed at all?** Brown discourages it in published guidance; some renderers omit it entirely. We propose: allow with a soft warning. Confirm.
5. **Theme name `brown` vs `c4-classic` vs `default`.** Naming it after Simon Brown is a tribute but couples the theme name to a person. `c4-classic` is more neutral. `default` collides with cross-diagram convention. Confirm.
6. **Async arrow keyword: `..>` or `->>` or `~~>`?** This doc proposes `..>` (dotted-then-solid arrow, mirrors PlantUML). `~~>` is used by `bpmn` for message flow. `->>` is Mermaid's async convention. Choosing `..>` keeps `~~>` reserved for `bpmn` and avoids the Mermaid sequence-diagram overload. Confirm.
7. **Identifier path syntax for nested elements.** When two systems both declare a `container API`, references resolve to the nearest enclosing system. To reference across systems, this doc proposes dotted syntax (`BankingSystem.API`). Structurizr uses the same. Confirm.
8. **Should `level: component` enforce that only one container is visible?** Brown's published Component diagrams always show one container's interior. Enforcing this prevents misuse; allowing multiple containers in a Component diagram could be a useful escape hatch. Confirm.
9. **Whether to ship `monochrome` in v0.1 or defer to v0.2.** The print/accessibility case for shipping it day-one is strong, but it doubles the theme test surface. Confirm.
10. **Bundling the canonical Brown "Big Bank plc" example as a built-in.** Useful for `npx schematex example c4` and for the docs site landing page. Confirm whether to ship this as a code example or only as a docs example (no source bundling).
11. **Whether to surface a `notes:` or `description:` block per element beyond the inline description string.** Structurizr supports per-element notes. Schematex's inline two-line description may not be enough for long-form notes. Confirm whether to add a multi-line `notes { ... }` block.
12. **Should the Enterprise Boundary be opt-out by default?** When a diagram has only one system, the enterprise boundary adds no information. Auto-suppress when there is only one system? Confirm.

---

## 14. Appendix — Canonical Example (DSL → Render Spec)

The Internet Banking System reference. This text is the single input file; the diagram is the single SVG output.

```
c4
level: container
title: Internet Banking System — Container View
direction: lr
theme: brown

person Customer "Personal Banking Customer" "A customer of the bank, with personal banking accounts" figure

enterprise "Big Bank plc" {

  system InternetBanking "Internet Banking System" "Allows customers to view information about their bank accounts and make payments" {
    container WebApp "Java, Spring MVC" "Delivers the static content and the Internet banking single page application"
    container SPA "JavaScript, Angular" "Provides all of the Internet banking functionality to customers via their web browser"
    container MobileApp "C#, Xamarin" "Provides a limited subset of the Internet banking functionality to customers via their mobile device"
    container API "Java, Spring Boot" "Provides Internet banking functionality via a JSON/HTTPS API"
    container Database "Oracle Database" "Stores user registration information, hashed authentication credentials, access logs, etc."
  }

  system_external Mainframe "Mainframe Banking System" "Stores all of the core banking information about customers, accounts, transactions, etc."
  system_external EmailSystem "E-mail System" "The internal Microsoft Exchange e-mail system"
}

Customer  -> WebApp     "Visits bigbank.com using"      [HTTPS]
Customer  -> MobileApp  "Uses"
WebApp    -> SPA        "Delivers to the customer's web browser"
SPA       -> API        "Makes API calls to"            [JSON/HTTPS]
MobileApp -> API        "Makes API calls to"            [JSON/HTTPS]
API       -> Database   "Reads from and writes to"      [JDBC]
API       -> Mainframe  "Makes API calls to"            [XML/HTTPS]
API       ..> EmailSystem "Sends e-mail using"          [SMTP]
EmailSystem ..> Customer "Sends e-mails to"
```

**Expected layout (left-to-right):**

Layer 0: Customer (with stick-figure).
Layer 1: WebApp, MobileApp (stacked vertically).
Layer 2: SPA.
Layer 3: API.
Layer 4: Database, Mainframe, EmailSystem (stacked vertically).

The enterprise boundary wraps the InternetBanking system, Mainframe, and EmailSystem. The InternetBanking system boundary wraps WebApp, SPA, MobileApp, API, and Database. Customer sits outside both boundaries. The async arrow from EmailSystem to Customer crosses the enterprise boundary, drawn dashed.

This is the expected pixel-accurate output of the v0.1 renderer when given this DSL input. It is the **definition of done** for the initial release.
