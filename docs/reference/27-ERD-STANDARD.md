# 27 — Entity-Relationship Diagram (ERD) Standard Reference

*Academic and production data-modelling diagrams: **Chen notation** (1976, weak entities, ternary relationships, ISA hierarchies, multivalued/derived attributes) and **Crow's-Foot / Information Engineering notation** (1976 Everest, popularized by Martin & Finkelstein, codified by Barker — the de-facto modern notation in MySQL Workbench, dbdiagram.io, Mermaid erDiagram, ERDPlus, draw.io). Distinct from the existing `entity` engine (§12), which models corporate / legal / tax ownership hierarchies — different domain, different layout, different audience.*

> **Naming note.** The DSL keyword and engine id is **`erd`** to avoid collision with the existing `entity` engine (corporate ownership). When users say "ERD" they almost always mean a database / data-model diagram in the sense of this document.

> **Primary References:**
> - **Chen, P. P. S.** (1976). "The Entity-Relationship Model—Toward a Unified View of Data." *ACM Transactions on Database Systems* **1**(1), 9–36. DOI 10.1145/320434.320440. — *The foundational paper.* MIT preprint at https://dspace.mit.edu/bitstream/handle/1721.1/47432/entityrelationshx00chen.pdf.
> - **Everest, G. C.** (1976). "Basic Data Structure Models Explained with a Common Example." *Proceedings of the Fifth Texas Conference on Computing Systems*, IEEE, pp. 39–46. — *Origin of crow's foot ("fork") notation.*
> - **Martin, J. & Finkelstein, C.** (1981). *Information Engineering*. Savant Institute. (Multi-volume Prentice-Hall edition: Martin, J. *Information Engineering*, vols. I–III, 1989–1990.)
> - **Barker, R.** (1990). *CASE\*Method: Entity Relationship Modelling*. Addison-Wesley. ISBN 0-201-41696-4. — *Oracle Barker notation.*
> - **Elmasri, R. & Navathe, S. B.** (2015). *Fundamentals of Database Systems*, 7th ed., Pearson. ISBN 978-0-13-397077-7. (Ch. 3 on the ER model — the Chen-faithful reference textbook.)
> - **Silberschatz, A., Korth, H. F., Sudarshan, S.** (2019). *Database System Concepts*, 7th ed., McGraw-Hill. (Ch. 6.)
> - **Date, C. J.** (2003). *An Introduction to Database Systems*, 8th ed., Addison-Wesley.
> - **Batini, C., Ceri, S. & Navathe, S. B.** (1992). *Conceptual Database Design: An Entity-Relationship Approach*. Benjamin/Cummings.
> - **Halpin, T.** (2007). "Entity Relationship Modeling from an ORM Perspective: Part 3." *Journal of Conceptual Modeling*, Issue 13.
> - **NIST.** (1993). *Federal Information Processing Standards Publication 184 — Integration Definition for Information Modeling (IDEF1X)*. December 21, 1993. Withdrawn 2008-09-02; folded into ISO/IEC/IEEE 31320-2:2012.
> - **ISO/IEC/IEEE 31320-2:2012** — *Information technology — Modeling Languages — Part 2: Syntax and Semantics for IDEF1X*.
> - **Holistics.** *DBML — Database Markup Language*. https://github.com/holistics/dbml (Apache-2.0). — *The leading text-DSL precedent for crow's foot.*
> - **Mermaid.** *Entity Relationship Diagram syntax*. https://mermaid.js.org/syntax/entityRelationshipDiagram.html — *De-facto Markdown ERD.*

**Positioning.** ERDs are taught in every CS / IS / DBA course, used by every backend engineer documenting a relational schema, and required for every DBA designing one. The two notations co-exist: **Chen** is the academic / pedagogical standard (weak entities, ternary, ISA), **Crow's foot** is the production standard (DBML, Mermaid, MySQL Workbench, Lucidchart). No existing free zero-dependency text-DSL library does **both**. Schematex closes that gap with one engine that supports both notations from the same DSL via a `notation:` switch, plus first-class Chen extensions (multivalued / derived / composite attributes, ternary, ISA disjoint/total) that DBML and Mermaid cannot express.

**Relation to existing schematex engines.**

| Engine | Coverage | Why ERD is different |
|---|---|---|
| `entity` (§12) | **Corporate / legal / tax ownership** hierarchies | Subsidiaries, percentage rollup, trusts. Different domain, different layout, different audience. Naming overlap is unfortunate; we pick `erd` for this engine. |
| `flowchart` (§14) | Process / decision / architecture | Generic graph; no relational semantics, no cardinality glyphs. |
| `mindmap` (§20) | Idea hierarchies | Tree, not graph. |
| `state` (§21) | UML 2.5 state machine | Behavioral, not structural. |

---

## 1. Users & Needs

### 1.1 Personas

| Role | Scenario | Frequency | Why existing tools fall short |
|---|---|---|---|
| **CS / IS student** | DB course assignment (Elmasri ch.3, Silberschatz ch.6) | Term-paced | Mermaid/DBML are crow's foot only; Chen-faithful Lucidchart is paywalled past 3 docs |
| **Database educator / textbook author** | Course slides, exam figures | Weekly during term | Needs Chen with weak entity, ternary, ISA — no free tool supports all three |
| **Data architect** | Schema design before DDL | Per project | DBML is good but production-only; Chen needed for conceptual phase |
| **Backend engineer** | Document existing relational schema | One-shot per project | Wants to copy-paste DDL → ERD; current options = MySQL Workbench (heavy) or Lucidchart (paid) |
| **Technical writer** | ORM and platform docs (Prisma, Drizzle, SQLAlchemy, Django) | Per release | Mermaid erDiagram is good but limited; needs better visual quality |
| **DBA / data engineer** | Audit, ETL design, data lineage | Weekly | Needs both notations across teams (academic colleagues use Chen; engineers use crow's foot) |
| **LLM (ChatDiagram generation)** | "Generate the schema for an e-commerce app" | Daily, thousands of times | Mermaid erDiagram works for crow's foot; nothing works for Chen |

### 1.2 What Schematex must do

1. **Both notations from one DSL.** A `notation: chen | crowsfoot | barker` switch flips the visual without rewriting the DSL.
2. **Chen extensions DBML can't express.** Multivalued attributes, derived attributes, composite attributes, weak entities + identifying relationships, ternary relationships, ISA hierarchies with disjoint/overlapping + total/partial.
3. **DBML-like compactness for crow's foot.** Engineers should write `Table users { id int [pk]; ... }` style without learning a new DSL.
4. **Cardinality alias support.** Accept Mermaid ASCII glyphs (`}o--||`) as aliases for `0..N -- 1..1` so users coming from Mermaid have a one-line learning curve.
5. **Zero ASCII line-noise as primary form.** Default DSL form uses named cardinalities (`many-mandatory`, `one-optional`) or compact Min-Max (`0..1`, `1..N`) — readable and LLM-generatable.
6. **AI-friendly errors.** When a Chen ternary is referenced from crow's-foot mode, suggest the associative-entity rewrite.
7. **Embeddable SVG output.** No Java applet, no browser, no Lucidchart paywall.

---

## 2. Market Need

### 2.1 Demand signal (qualitative)

I do not quote precise keyword-tool numbers in this doc; magnitudes below are training-corpus impressions. Re-validate with Ahrefs before any go-to-market decision.

| Term cluster | Volume tier | Intent |
|---|---|---|
| `er diagram`, `entity relationship diagram`, `erd` | **High** (head term) | Educational + production |
| `erd online`, `free erd tool`, `erd maker` | **High** (transactional / commercial) | Looking to buy or to use a free tool |
| `crow's foot notation` | **Mid** evergreen | Lucidchart, Gleek, draw.io blog mid-tail |
| `chen notation` | **Mid** evergreen | Academic mid-tail; CS course pages, homework-help |
| `mermaid er diagram` | **Mid → rising** | Developer-doc cluster as Mermaid integrates into GitHub, Notion, Obsidian |
| `dbml`, `dbdiagram` | **Niche-high** | Loyal data-engineer community |
| `idef1x` | **Niche** | US federal / defense |

Implication: the Schematex `erd` page can rank for the head terms by being the only AGPL/free/zero-dep TS library that does **both notations from a text DSL** and combines academic Chen credibility with crow's-foot production fluency.

### 2.2 Competitive landscape

| Product | Notation | DSL | License | Key gap |
|---|---|---|---|---|
| **Mermaid `erDiagram`** | Crow's foot | yes | MIT | No Chen; attributes are typed columns only; no ternary, no ISA |
| **dbdiagram.io / DBML** | Crow's foot | yes (DBML) | Apache | No Chen; production-schema-focused |
| **PlantUML ER** | Crow's foot | yes | GPL | Limited Chen support; aging UX |
| **D2 sql_table** | Crow's foot | yes | MPL | Crow's foot only; no Chen |
| **Lucidchart** | Both | no (GUI) | Commercial / paywalled | No DSL; paid past 3 docs |
| **MySQL Workbench EER** | Crow's foot | reverse-engineer DDL | GPL | Desktop only; no Chen |
| **Oracle SQL Developer Data Modeler** | Barker | reverse from DB | Commercial | Oracle-only |
| **ERDPlus** | Both (with Chen + relational) | no (GUI) | Free for students | No DSL |
| **draw.io** | Both (shape libraries) | no | Apache | No semantics; shapes only |
| **ChartDB** | Crow's foot | reverse from DB | OSS | Crow's foot only |
| **dbeaver / DBSchema** | Crow's foot | no | Free / commercial | Database-tool first; no DSL |
| **TikZ ER** | Both | yes (LaTeX) | LaTeX-only | LaTeX-only |

**Schematex differentiation**: only **zero-dependency text-DSL library** with first-class **Chen + crow's foot + Barker** in one engine, with Chen-faithful weak/ternary/ISA support. AGPL-clean, Markdown-embeddable, AI-native.

---

## 3. Standard Compliance

### 3.1 What we implement

- **Chen 1976 notation** as taught by Elmasri & Navathe and Silberschatz: rectangle / double rectangle / diamond / double diamond / oval / double oval / dashed oval / underlined-key oval / ISA triangle with `d`/`o` and total/partial participation. n-ary relationships first-class. Edge cardinality labelled with `1`, `N`, `M`.
- **Crow's foot / IE notation** as standardised across MySQL Workbench, dbdiagram.io, Mermaid, ERDPlus: tabular entity boxes with PK/FK/UK row markers; relationship line endpoint glyphs `┃`, `○`, `┃<`, `○<`.
- **Barker notation** as a stylistic refinement of crow's foot (Oracle CASE\*Method): same endpoint glyphs but solid line = mandatory, dashed line = optional, plus arc-based subtype (category) clusters. Selectable as `notation: barker`.

### 3.2 What we deliberately omit

| Omitted | Why |
|---|---|
| **IDEF1X** | Heavy semantics (round vs square corners on child entities, categorisation clusters); niche US-DoD use case. Future engine if demand justifies. |
| **UML class diagram as data model** | Different engine (UML class) — overlaps but is structurally different; deserves its own plugin. |
| **Min-Max ("look-here") notation as primary** | European academic variant; supported as a label-position alias on edges. |
| **ORM / Object-Role Modeling** | Different formalism; out of scope. |
| **Physical-design artifacts** (indexes, partitions, tablespaces) | Schematex is a renderer; physical DB design is a separate concern. |

### 3.3 Optional reverse-engineering

Future post-v1: an importer that parses standard SQL DDL (`CREATE TABLE`, `FOREIGN KEY ... REFERENCES`) and emits ERD DSL. Not in v1 scope.

---

## 4. Symbol Catalog

### 4.1 Chen notation

| Symbol | Meaning | DSL kind |
|---|---|---|
| Rectangle | Strong (regular) entity set | `entity` |
| **Double** rectangle | Weak entity set | `weak entity` |
| Diamond | Relationship set | `rel` (auto-shaped) |
| **Double** diamond | Identifying relationship | `rel identifying` |
| Oval / ellipse | Attribute | `attr` |
| **Double** oval | Multivalued attribute | `attr multi` |
| **Dashed** oval | Derived attribute | `attr derived` |
| Oval, **underlined** text | Key (primary) attribute | `attr key` |
| Oval, **dashed-underlined** text | Partial key (on weak entity) | `attr partial-key` |
| Composite oval (sub-ovals branching) | Composite attribute | `attr composite { ... }` |
| Triangle labelled `ISA` | Generalization / specialization | `isa` |
| Circle with `d` / `o` inside ISA | Disjoint / overlapping subtype | `disjoint` / `overlapping` |
| Single line entity↔diamond | Partial participation | `participation: partial` |
| **Double** line entity↔diamond | Total participation | `participation: total` |
| Edge labels `1`, `N`, `M` | Cardinality | `cardinality: 1` / `N` / `M` |

### 4.2 Crow's foot / IE notation

**Endpoint glyph table** (the part that matters):

| Glyph at line end | Reading | Min..Max | DSL token |
|---|---|---|---|
| `─┃` (perpendicular bar) | Exactly one (mandatory one) | 1..1 | `one-mandatory` / `1..1` |
| `─○` (open circle) | Zero or one (optional one) | 0..1 | `one-optional` / `0..1` |
| `─┃<` (bar + crow's foot) | One or more (mandatory many) | 1..N | `many-mandatory` / `1..N` |
| `─○<` (circle + crow's foot) | Zero or more (optional many) | 0..N | `many-optional` / `0..N` |

Both ends of the line are independently annotated. A typical 1:N relationship reads "exactly one CUSTOMER places zero-or-more ORDERs."

**Entity rendering** (crow's foot):
- Tabular box: header bar (entity name) + body (one row per attribute).
- Attribute row format: `name : type [marker]`, where `marker` ∈ `PK | FK | UK | NN | *`.
- `*` marks NOT NULL (Barker style).
- FK arrow can be drawn separately or implied by relationship line.

**Mermaid ASCII alias** (always accepted as input, never the primary form):

| Mermaid token | Schematex meaning |
|---|---|
| `\|o` left / `o\|` right | 0..1 |
| `\|\|` | 1..1 |
| `}o` left / `o{` right | 0..N |
| `}\|` left / `\|{` right | 1..N |
| `--` | identifying / solid line |
| `..` | non-identifying / dashed line |

### 4.3 Barker overlay

When `notation: barker`:
- Solid relationship line = mandatory side.
- **Dashed** relationship line half = optional side.
- Subtype clusters drawn with an arc + crow's foot on the subtype side.
- Mandatory attribute prefix `*`, optional attribute prefix `o`, primary-key prefix `#`.

---

## 5. DSL Grammar

### 5.1 Header

```
erd
notation: chen | crowsfoot | barker     // default crowsfoot
direction: LR | TB                       // default LR
title: "University Schema"
```

### 5.2 Crow's-foot tabular form (DBML-compatible-ish)

```
table Student {
  student_id  int       PK
  name        varchar
  email       varchar   UK
  birthdate   date
  major_id    int       FK -> Major.major_id
}

table Major {
  major_id    int   PK
  name        varchar
  department  varchar
}

table Course {
  course_id   int       PK
  title       varchar
  credits     int
}

table Enrollment {
  student_id  int  PK FK -> Student.student_id
  course_id   int  PK FK -> Course.course_id
  semester    varchar
  grade       char(2)
}

ref Student.major_id  many-mandatory -- one-mandatory  Major.major_id : "majors in"
ref Enrollment.student_id  many-mandatory -- one-mandatory  Student.student_id
ref Enrollment.course_id   many-mandatory -- one-mandatory  Course.course_id
```

`ref` syntax: `<source> <left-card> -- <right-card> <target> : "label"`. Cardinalities accept named tokens (`one-mandatory`), Min-Max (`1..1`), or Mermaid glyphs (`}o`, `||`). The `--` is identifying (solid); `..` is non-identifying (dashed).

### 5.3 Chen explicit form

```
chen entity Student {
  ssn          key
  name         composite { first, middle, last }
  phones       multi
  age          derived
  email
}

chen weak entity Dependent owner Employee via has {
  name         partial-key
  relationship
}

chen relationship Enrollment between
  Student[1..N],
  Course[1..N],
  Term[1..1] {
  grade
}

chen isa Employee { Manager, Engineer, Accountant } disjoint total
```

`chen entity` blocks accept attribute modifiers DBML cannot express. `chen relationship` is n-ary (any arity ≥ 2). `chen isa` is generalization with `disjoint | overlapping` and `total | partial`.

In **Chen mode**, `table` and `ref` are also accepted but rendered with the Chen visual conventions (rectangles + diamond + oval attributes), with cardinality labelled as `1` / `N` / `M`. In **crow's-foot mode**, `chen weak entity` / `chen relationship` / `chen isa` blocks emit warnings ("ternary relationship not natively expressible in crow's foot — promoting Enrollment to associative entity").

### 5.4 Mermaid-compat alias

```
ref Student }o--|| Major : "majors in"
```

Treated as `Student many-mandatory -- one-mandatory Major`. Always accepted; emits a hint that the named form is preferred for Schematex docs.

### 5.5 Validation rules

- Every `FK -> X.y` must reference an existing table column with a matching type.
- A `ref` line's source/target must reference an existing entity / column.
- In crow's-foot mode, Chen-only constructs (multivalued attribute, derived attribute, ternary, ISA) emit warnings or are auto-rewritten with explanation.
- Ternary or higher-arity relationships must declare each role's cardinality explicitly.
- Weak entity must have at least one identifying relationship and at least one partial-key attribute.

### 5.6 Theme tokens

```ts
interface ErdTokens {
  entity: { headerFill: string; headerText: string; bodyFill: string; stroke: string };
  weakEntity: { stroke: string; strokeDouble: string };  // double-line offset
  relationship: { fill: string; stroke: string };
  attribute: { fill: string; stroke: string; keyUnderline: string };
  pk: string; fk: string; uk: string;
  cardinalityGlyph: string;         // crow's foot color
  identifyingLine: string;          // solid
  nonIdentifyingLine: string;       // dashed
  isa: { triangleFill: string; arcStroke: string };
}
```

Three presets: `default` (academic blue-grey), `monochrome` (BW / textbook), `dark`.

---

## 6. Layout Rules

### 6.1 Crow's-foot mode

- Entities laid out with **layered orthogonal layout** — same Sugiyama primitives as `flowchart` (§14): cycle removal → layering → barycenter ordering → Brandes-Köpf x-coordinate.
- Tabular boxes: header bar 24px, attribute row 18px. Width fits the longest attribute string + 32px padding.
- Relationship lines: orthogonal (Manhattan), right-angle bends, snap 10px.
- Endpoint glyphs (crow's foot, bar, circle) drawn at line endpoints, offset 14px from entity edge.
- FK arrows from many-side to one-side; conventionally many-side is below/right of one-side.
- M:N pre-resolved to two 1:N via associative entity at parse time (warning emitted suggesting the explicit associative form).

### 6.2 Chen mode

- Entities (rectangles), relationships (diamonds), and attributes (ovals) laid out with **modified force-directed** placement: relationships sit between their participating entities; attributes radiate outward from their parent entity in a small radial corona.
- Attribute corona: ovals placed at angles `2π·i/n` around entity center, distance ≈ 1.6 × entity radius, with collision avoidance against other entities.
- Weak entity rendered with double-stroke 4px offset.
- Identifying relationship (double diamond) rendered with double-stroke 4px offset.
- ISA triangle placed midway between supertype and subtypes; supertype connected to triangle apex, subtypes to triangle base. Disjoint = `d` text inside triangle; overlapping = `o`. Total participation = double line from supertype.
- Cardinality labels (`1`, `N`, `M`) placed near each entity end of the relationship line, offset 8px outward.

### 6.3 Barker mode

- Same tabular entity rendering as crow's foot.
- Relationship lines: each half rendered solid (mandatory side) or dashed (optional side); the dashedness convention is per-half, so a 1..1 to 0..N relationship has the source half solid and target half dashed.
- Subtype clusters: arc with crow's foot on subtype side; subtype entities rendered as nested boxes inside the supertype box (Barker's "block" convention) when `barker-subtype-style: nested`, or as separate boxes when `barker-subtype-style: separated`.

### 6.4 Routing details

- Self-referential (recursive) relationships: rendered as a **C-shaped loop** exiting the right side of the entity, looping back to the bottom side.
- Multi-arity relationships (Chen ternary): the diamond is the geometric center; participating entities radiate at angles equidistant.
- Edge labels: rendered near the cardinality glyph (crow's foot) or near the diamond (Chen) with a 4px halo background.

---

## 7. Canonical Test Cases

### 7.1 University schema (the textbook canonical)

Student / Course / Section / Instructor / Enrollment(Student × Section, with `grade` attribute). The Enrollment-with-attribute is the canonical Chen example and the canonical "M:N → associative" crow's-foot example. ~5 entities, 6 relationships. **Best in Chen mode** (relationship-with-attributes is Chen-natural); also valid in crow's foot via associative entity.

### 7.2 Library

Member / Book / Copy (weak entity owned by Book, identified by `(book_id, copy_no)`) / Loan / Reservation. Classic weak-entity example. ~5 entities; `Copy` has partial key `copy_no`. **Best in Chen mode** — weak entity + identifying relationship + partial key are visually distinct in Chen and difficult to convey in crow's foot.

### 7.3 E-commerce (the DBML showcase)

Customer / Order / OrderLine / Product / Category / Address. Pure 1:N and M:N, FK-heavy, attribute-rich. Cardinalities: Customer 1..N → Order, Order 1..N → OrderLine, Product 1..N → OrderLine, Product N..1 → Category. **Best in crow's foot** — production-realistic, FK + cascade rules.

### 7.4 Hospital with ternary

Patient / Doctor / Appointment / Treatment(Patient × Doctor × Date as ternary relationship). Classic Chen ternary example: Treatment is irreducibly 3-ary. ~4 entities + 1 ternary relationship. **Best in Chen mode** — the n-ary relationship is the textbook reason Chen still exists; in crow's foot it's promoted to an associative entity with three FKs.

### 7.5 Banking with ISA

Person → Employee (ISA) → {Manager, Engineer, Accountant} disjoint total; Account → {Checking, Savings} disjoint total. Classic generalization/specialization example. ~6 entities + 2 ISA hierarchies. **Best in Chen mode** (triangle + `d`/`o` + total/partial), with Barker arc as the alternative rendering.

A sixth nice-to-have for the gallery: **the original Chen 1976 SPJ example** (Suppliers / Parts / Projects, with the SPJ ternary supplies). The most cited ER diagram in history; lends historical credibility.

---

## 8. Pitfalls & Gotchas

1. **Naming conflict with `entity` engine.** This engine is `erd`, not `entity`. The existing `entity` engine (§12) is **corporate / legal ownership**, completely different domain. The two engines must never share parser detection rules.
2. **M:N must be an associative entity in crow's foot.** Schematex auto-rewrites and emits a warning suggesting the explicit form. In Chen mode, M:N is rendered natively.
3. **Ternary in crow's foot doesn't exist.** Auto-rewrite to associative entity with three FKs; warning includes the Chen recommendation if educational use is signaled.
4. **Mermaid ASCII glyphs are read-only (input-only).** Schematex pretty-prints in the named form (`one-mandatory`, `many-optional`); ASCII glyphs are accepted for input compat but not produced for output.
5. **Identifying vs non-identifying** in Barker / IDEF1X is line solid vs dashed; in DBML/Mermaid the distinction is sometimes lost. We preserve it explicitly via `--` (identifying) vs `..` (non-identifying) in the DSL.
6. **Weak entity + partial key.** A weak entity must have a partial-key attribute and an identifying relationship to its owner. Validator enforces both. The partial key is rendered with a **dashed underline** in Chen and with a special `PPK` row marker in crow's foot.
7. **Composite vs multivalued attribute.** Composite is structural decomposition (name → first/middle/last); multivalued is collection (phones is a list). DBML cannot express either; Chen DSL `composite { ... }` and `multi` cover both.
8. **Derived attributes** are not stored — they are computed. Rendered with **dashed oval** in Chen; rendered with `/` prefix in crow's foot (e.g. `/age`) by Schematex convention. SQL DDL does not directly express derived attributes (computed columns exist but the conceptual flag is separate).
9. **Total vs partial participation** is encoded by **single vs double line** between entity and diamond in Chen. Easy to miss visually if rendered in monochrome.
10. **Disjoint vs overlapping subtype.** Disjoint = each instance belongs to exactly one subtype; overlapping = an instance can belong to multiple. Chen renders `d` or `o` inside the ISA triangle.
11. **Recursive (self-referential) relationships** must label both role names (e.g. `Employee — supervises → Employee` with roles `supervisor` and `subordinate`). Validator requires role names on self-edges.
12. **Cardinality reading direction.** In Chen, the `N` next to entity X means "X participates with up to N instances of the relationship"; in crow's foot, the glyph at the entity-X end describes how many X relate to one of the other side. These are mathematically equivalent but the **placement** differs — easy source of confusion.
13. **DBML's `>` operator means many-to-one** (the FK side is many, the target is one). This is the reverse direction of Mermaid `}o--||`. We accept both, document the difference, and pretty-print in named form.
14. **ASCII glyph rendering in monochrome theme.** Crow's foot is rendered as a triangular fan; bar / circle preserved; in monochrome, line thickness alone distinguishes mandatory (thick bar) from optional (thin circle). Color is decoration, not semantic.

---

## 9. Out of Scope (Deferred)

- **IDEF1X engine** — separate plugin if demand justifies (US-DoD modelling).
- **SQL DDL importer** (`CREATE TABLE` → ERD DSL) — post-v1; valuable but separable.
- **Prisma / Drizzle / SQLAlchemy / Django importers** — same.
- **Schema diff / migration visualization** — different problem; not v1.
- **Physical-design artifacts** (indexes, partitions, tablespaces) — out of scope.
- **ORM (Object-Role Modeling)** — different formalism.

---

## 10. Implementation Status

Not yet implemented. Tracked as `erd` engine; impl docs land in `../CoCEO/schematex/impl/27.X-erd-*.md`.

The engine is **distinct from `entity` (§12)**. The `entity` engine remains for corporate / legal / tax ownership hierarchies; the `erd` engine is for relational data modelling.
