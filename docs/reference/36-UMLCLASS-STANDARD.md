# 36 — UML Class Diagram Standard Reference

*The OMG UML class diagram — the canonical static-structure notation of object-oriented design. A **classifier** (class, abstract class, interface, enumeration, data type) is a three-compartment box (name / attributes / operations); classifiers are joined by six relationship kinds (association, aggregation, composition, generalization, realization, dependency) carrying multiplicities, roles, navigability and adornments. Schematex implements the visual subset that engineers, architects, and CS students actually draw, with a single-word `umlclass` keyword and a PlantUML-flavoured text DSL that also accepts Mermaid `classDiagram` glyph aliases — designed for LLM generation rather than XMI serialization. This is the engine the C4 reference (§30) defers its "Code" level to.*

> **Primary References:**
> - **OMG.** *Unified Modeling Language (UML), Version 2.5.1.* Document **formal/2017-12-05**, December 2017 — https://www.omg.org/spec/UML/2.5.1/ — *§9 "Classification" and §10 "Classifiers" are the normative spec for classes, attributes, operations, visibility, generalization, and the structured classifiers; §11.5 "Associations" defines association ends, multiplicity, navigability, aggregation kind (none/shared/composite). When this doc says "the standard", it means these clauses.*
> - **ISO/IEC 19505-2:2012** — *Information technology — Object Management Group Unified Modeling Language (OMG UML) — Part 2: Superstructure* (technically equivalent to UML 2.4.1) — https://www.iso.org/standard/52854.html — *The ISO ratification of the same metamodel.*
> - **Fowler, Martin** (2003). *UML Distilled: A Brief Guide to the Standard Object Modeling Language*, 3rd ed. Addison-Wesley. ISBN 978-0321193681. — *§3 "Class Diagrams: The Essentials" + §5 "Class Diagrams: Advanced Concepts"; the most-cited pragmatic reference for what practitioners actually draw.*
> - **Booch, Grady; Rumbaugh, James; Jacobson, Ivar** (2005). *The Unified Modeling Language User Guide*, 2nd ed. Addison-Wesley. ISBN 978-0321267979. — *The "Three Amigos" reference; §4 Classes, §5 Relationships, §8 Class Diagrams.*
> - **Larman, Craig** (2004). *Applying UML and Patterns*, 3rd ed. Prentice Hall. ISBN 978-0131489066. — *The standard university OOAD textbook; source of the canonical worked examples in §9.*
> - **Rumbaugh, J.; Jacobson, I.; Booch, G.** (2004). *The Unified Modeling Language Reference Manual*, 2nd ed. Addison-Wesley. ISBN 978-0321245625. — *Encyclopaedic notation reference.*
> - **PlantUML class-diagram syntax** — https://plantuml.com/class-diagram — *The de-facto text-DSL leader; the source of the relationship-glyph vocabulary Schematex adopts as primary (`<|--`, `<|..`, `*--`, `o--`, `-->`, `..>`).*
> - **Mermaid `classDiagram` syntax** — https://mermaid.js.org/syntax/classDiagram.html — *The Markdown-native DSL; Schematex accepts its glyphs as aliases for one-line migration.*
> - **Wikipedia, "Class diagram (UML)"** — https://en.wikipedia.org/wiki/Class_diagram — *Useful cross-check on relationship adornment depiction (diamond ends, triangle heads, arrow heads).*
>
> *Notes on the standard landscape.* UML fixes the **meaning** of every element (a hollow triangle points to the more general classifier; a filled diamond marks the composite end) but, like most OMG specs, leaves exact pixel rendering to convention. Schematex therefore treats **OMG 2.5.1 §9–§11 as the semantic baseline** and **Fowler / Booch published figures as the visual baseline**, documenting every deviation explicitly in §10.

---

## 0. Positioning

**The UML class diagram is the single most-drawn diagram in software engineering.** It is the structural heart of UML: it appears in essentially every OOAD course, every design review, every "explain this codebase" onboarding doc, and every textbook from Larman to the Gang of Four. A class diagram answers *what are the types in this system, what data and behaviour do they carry, and how are they related?* The notation is compact — a labelled three-compartment box and six line styles — but it carries genuine semantics: visibility, abstractness, multiplicity, navigability, and the part-of vs is-a distinction that the diamond-vs-triangle adornments encode.

**Naming decision: `umlclass`, not `uml` or `class`.** This is settled by precedent set in the use-case reference (§29 "Positioning"): Schematex diagram keywords are single words, and **`uml` is deliberately reserved as a future-namespace prefix, never a keyword**, because UML 2.5.1 specifies fourteen diagram types and Schematex already ships three (`state` §21, `usecase` §29, `sequence` §33) with more to come. A bare `class` keyword is rejected for two reasons: it collides with the universal programming-language keyword (terrible for AI-disambiguation and `grep`), and it does not say *which* diagram — UML has class diagrams, but "class" alone is meaningless out of context. The unspaced compound **`umlclass`** is the most common written variant in PlantUML communities and draw.io stencils, mirrors the `usecase` decision exactly, and keeps the diagram-type union single-word. Marketing copy describes the growing set as "the UML family"; the engine id and `detect()` keyword are `umlclass`.

**Why this engine exists (the C4 hand-off).** The C4 reference (§30 "Out of Scope") states plainly that the C4 *Code* level "is just a UML class diagram" and **permanently delegates it to a future `umlclass` engine** rather than re-implementing UML inside `c4`. This is that engine. It is also the answer to the largest unfilled gap in the text-DSL diagramming space below: Mermaid *has* a `classDiagram`, but it rides dagre with weak standard fidelity — multiplicity labels float, stereotypes render as raw `<<>>` strings, association classes do not exist, abstract italics are inconsistent, and the layered hierarchy is not driven by generalization. PlantUML's class diagram is faithful but needs a JVM and is awkward to embed. **Schematex's edge is standard-correct adornments + a generalization-driven layered layout + zero-dependency embeddable SVG.** A 6-class diagram is ~25 lines of DSL the LLM can emit in one shot.

---

## 1. Relation to Existing Schematex Engines

| Engine | Coverage | Why `umlclass` is different |
|---|---|---|
| `erd` (§27, Chen / crow's-foot) | **Data model**: tables, columns, PK/FK, cardinality between rows of data | ERD boxes look superficially similar but model *data*, not *types*. ERD rows are **columns with PK/FK markers**; umlclass rows are **typed attributes with visibility glyphs (`+ - # ~`) plus a separate operations compartment** — ERD has no operations, no methods, no `+`/`-` visibility, no inheritance triangle. ERD cardinality is crow's-foot (`}o--||`); umlclass multiplicity is `0..1`/`*`/`1..*` text at the line ends. ERD's "is-a" is a Chen ISA triangle on *entities*; umlclass generalization is between *classifiers* and carries method/attribute inheritance semantics. They are different diagrams for different audiences (DBA vs OO developer). |
| `entity` (§12, ownership) | Corporate / legal ownership trees with % rollup | Legal/financial containment, not type structure. |
| `state` (§21, UML 2.5 / Harel) | UML state machine — behaviour of **one** object over time | Behavioural UML (one object's lifecycle). `umlclass` is the **structural** counterpart — the static type graph the state machine's object is an instance of. |
| `usecase` (§29, UML 2.5.1 §18) | UML use cases — actor↔system scope | Schematex's first *structural-presenting* UML engine; `umlclass` is the first **truly structural** one (UML §9–§11, Structure package). Siblings in the UML family. |
| `sequence` (§33, UML 2.5.1 §17) | UML interactions — lifelines, messages | Behavioural UML; lifelines are *instances* of the classifiers `umlclass` declares. |
| `c4` (§30, Brown C4) | Software architecture (Context/Container) | C4's **Code** level *is* a UML class diagram and is explicitly delegated here. `c4` reuses ~60% of the flowchart Sugiyama kernel; `umlclass` reuses the same kernel (see §5), making it a natural neighbour. |
| `flowchart` (§14, Sugiyama) | Generic process / decision DAG | No classifier compartments, no inheritance semantics, no relationship adornments. Provides the **layout kernel** `umlclass` extends. |

**Layout reuse.** `umlclass` inherits the layered-DAG layout primitives from `flowchart` (§14) — greedy cycle-removal (FAS), longest-path layering, barycenter crossing reduction, Brandes-Köpf x-coordinate assignment, orthogonal/back-edge routing — exactly as `c4` (§30 §6) and `petri` (§34 §1) do. The novel work is small and additive: the three-compartment classifier box with measured text rows, the six relationship adornments (two diamond ends, two triangle heads, two arrow heads, solid vs dashed lines), and a layering bias that puts **generalization/realization parents above children** (see §5.2). No new layout engine.

---

## 2. The Vocabulary (what the standard contains)

The full notation. The **v0.1 column** marks the first release; everything else is specified so the DSL and AST do not have to change to add it later. Per the project's standard-completeness rule (MEMORY), **v0.1 covers the complete everyday class-diagram vocabulary** — all five classifier variants, full member syntax, and all six relationship kinds with adornments — not a partial subset. Only the genuinely advanced constructs (§11) are deferred.

### 2.1 Classifiers (OMG §9–§10)

| Concept | Meaning | Notation | v0.1 |
|---------|---------|----------|:----:|
| **Class** | a type with structural (attributes) + behavioural (operations) features | three-compartment rectangle; name **bold** | ✅ |
| **Abstract class** | cannot be instantiated | name in *italics* (or `{abstract}` after the name) | ✅ |
| **Interface** | a contract of operations | `«interface»` keyword above name; name plain | ✅ |
| **Enumeration** | an enumerated data type | `«enumeration»` keyword; literals listed in the attribute compartment | ✅ |
| **Data type** | a value type without identity | `«datatype»` keyword | ✅ |
| **Primitive type** | a built-in value type (Integer, Boolean…) | `«primitive»` keyword | ✅ |
| **Custom stereotype** | any user `«…»` keyword above the name (`«entity»`, `«service»`, `«controller»`) | guillemets above name | ✅ |
| **Active class** | has its own thread of control | double vertical side-bars on the box | ⬜ deferred (§11) |
| **Template / parameterised class** (generics) | a class parameterised by a type | dashed parameter box at the top-right corner | ⬜ deferred (§11) |
| **Association class** | an association that itself carries attributes | a class box joined to the association line by a dashed connector | ⬜ deferred (§11) |
| **Nested classifier** | a class declared inside another | nesting via an anchor (crossed-circle) line | ⬜ deferred (§11) |

### 2.2 Attributes (structural features — OMG §9.5)

Canonical attribute syntax (each line in the attributes compartment):

```
visibility name : Type [multiplicity] = default {property-string}
```

| Part | Meaning | Notation | v0.1 |
|------|---------|----------|:----:|
| **Visibility** | access level | `+` public · `-` private · `#` protected · `~` package | ✅ |
| **Name** | feature name | identifier | ✅ |
| **Type** | declared type | `: TypeName` | ✅ |
| **Multiplicity** | how many values | `[0..1]`, `[*]`, `[1..*]` after the type | ✅ |
| **Default value** | initial value | `= literal` | ✅ |
| **Static** (class-scope) | shared by all instances | **underlined** member | ✅ |
| **Derived** | computed, not stored | leading `/` (e.g. `/age`) | ✅ |
| **Property string** | `{readOnly}`, `{ordered}`, `{unique}`, `{frozen}` | `{…}` after the line | ✅ |
| **Enumeration literal** | a member of an `«enumeration»` | bare name in the attribute compartment | ✅ |

### 2.3 Operations (behavioural features — OMG §9.6)

```
visibility name(param : Type, …) : ReturnType {property-string}
```

| Part | Meaning | Notation | v0.1 |
|------|---------|----------|:----:|
| **Visibility** | access level | `+ - # ~` (same glyphs as attributes) | ✅ |
| **Name + parameter list** | signature | `name(p1: T1, p2: T2)` | ✅ |
| **Parameter direction** | in / out / inout | `in`/`out`/`inout` prefix on a parameter | ✅ (parsed; `in` is default and unshown) |
| **Return type** | result type | `: ReturnType` | ✅ |
| **Static** (class-scope) | class-level operation | **underlined** | ✅ |
| **Abstract** | no implementation | *italic* operation (or `{abstract}`) | ✅ |
| **Property string** | `{query}`, `{ordered}`, exceptions | `{…}` | ✅ |

### 2.4 Relationships (OMG §11.5, §9.9) — the six core kinds + adornments

| Relationship | Meaning | Line | End adornment | v0.1 |
|--------------|---------|------|---------------|:----:|
| **Association** | a structural link between instances | solid | plain (no head) — or **open arrowhead** for a *navigable / directed* association | ✅ |
| **Aggregation** (shared) | whole↔part, part may outlive whole | solid | **hollow diamond** at the *whole* (aggregate) end | ✅ |
| **Composition** (composite) | whole↔part, part dies with whole | solid | **filled diamond** at the *whole* end | ✅ |
| **Generalization** (inheritance) | child is-a parent | solid | **hollow triangle** pointing to the *parent* | ✅ |
| **Realization** (interface impl.) | class realises an interface | **dashed** | **hollow triangle** pointing to the *interface* | ✅ |
| **Dependency** | client uses supplier | **dashed** | **open arrowhead** pointing to the *supplier* | ✅ |

Adornments that decorate the **association/aggregation/composition** ends:

| Adornment | Meaning | Notation | v0.1 |
|-----------|---------|----------|:----:|
| **Multiplicity** | value count at an end | `1`, `0..1`, `*`, `1..*`, `0..*`, `n..m` near each end | ✅ |
| **Role name** | the part's role at an end | small text near the end (`+owner`, `-items`) | ✅ |
| **Association name** | label for the whole link | text at the line midpoint, optional `▸` reading direction | ✅ |
| **Navigability** | direction the link can be traversed | open arrowhead on the navigable end; small `✕` for explicitly non-navigable | ✅ (arrowhead; `✕` deferred) |
| **Qualifier** | a key that indexes the association | small box at the source end | ⬜ deferred (§11) |
| **N-ary association** | a link among 3+ classifiers | central diamond with spokes | ⬜ deferred (§11) |
| **Generalization set** | `{disjoint}` / `{overlapping}` / `{complete}` | constraint near the triangle | ⬜ deferred (§11) |

### 2.5 Computed structure (light validation, not a solver)

Unlike `pert`/`petri`, a class diagram has no "dynamics" to compute. The engine's value-add over a dumb shape tool is **structural validation and derivation**, mirroring how `network` (§35) refuses to silently drop elements:

| Derivation | Meaning | v0.1 |
|------------|---------|:----:|
| **Reference resolution** | every relationship endpoint names a declared (or arc-declared) classifier | ✅ (unknown id → readable error) |
| **Generalization-cycle detection** | `A <|-- B <|-- A` is illegal (a class cannot be its own ancestor) | ✅ (rejected with the cycle path) |
| **Realization-target check** | a realization (`<|..`) target should be an `«interface»`; warn otherwise | ✅ (warning) |
| **Diamond-end legality** | aggregation/composition diamonds sit at *one* end only | ✅ (validated) |
| **Duplicate-member warning** | two identical signatures in one classifier | ✅ (warning) |

---

## 3. Symbol Table

```
CLASS (3 compartments)            ABSTRACT CLASS                INTERFACE
┌───────────────────────┐         ┌───────────────────────┐    ┌───────────────────────┐
│        Animal         │ ← bold  │        Shape          │    │     «interface»       │ ← stereotype
├───────────────────────┤         │      (italic)         │    │      Comparable       │
│ + name : String       │ attrs   ├───────────────────────┤    ├───────────────────────┤
│ - age : int           │         │ # color : Color       │    │  (no attributes)      │
│ # legs : int = 4      │         ├───────────────────────┤    ├───────────────────────┤
├───────────────────────┤         │ + area() : double     │    │ + compareTo(o:Object) │
│ + makeSound() : void  │ ops     │   (italic = abstract) │    │       : int           │
│ + describe() : String │         └───────────────────────┘    └───────────────────────┘
└───────────────────────┘

ENUMERATION                    STATIC + DERIVED MEMBERS
┌───────────────────────┐      ┌───────────────────────┐
│    «enumeration»      │      │      Account          │
│       Suit            │      ├───────────────────────┤
├───────────────────────┤      │ + count : int         │  ← underline = static
│  HEARTS               │      │ ─────────             │
│  DIAMONDS             │      │ / balance : Money     │  ← leading / = derived
│  CLUBS                │      └───────────────────────┘
│  SPADES               │
└───────────────────────┘

RELATIONSHIPS                                                  reads toward →
Association (plain)      A ───────────────── B                 structural link
Directed association     A ───────────────▶ B                 navigable A→B (open arrow)
Aggregation              A ◇───────────────  B   ◇ at A        A aggregates B (hollow diamond)
Composition              A ◆───────────────  B   ◆ at A        A owns B       (filled diamond)
Generalization           Child ──────────▷ Parent              Child is-a Parent (hollow triangle)
Realization              Class ┄┄┄┄┄┄┄┄┄┄▷ Interface           Class realises Interface (dashed + triangle)
Dependency               Client ┄┄┄┄┄┄┄┄┄▶ Supplier            Client depends on Supplier (dashed + open arrow)

MULTIPLICITY + ROLE       Dog "1" ───────── "*" Bone           1 dog owns * bones
                              owner             owned          (role names near each end)
```

Visibility glyphs render as text prefixes (`+ - # ~`), **not** the PlantUML coloured icons — the text form is standard-faithful, prints in monochrome, and survives copy-paste. CSS class prefix: `sx-umlclass-*`. All strokes/fills come from the theme; no inline styles (hard constraint #3).

---

## 4. DSL Grammar

Hand-authorable, indentation-tolerant, AI-friendly. Header keyword is **`umlclass`** (also accepts `class-diagram`). `detect()` matches a first non-comment line beginning with `umlclass`. The DSL is **PlantUML-flavoured** (the dominant text precedent) and additionally accepts **Mermaid `classDiagram` glyph aliases** so a Mermaid user migrates with a one-line keyword change.

### 4.1 Worked example — classes, interface, inheritance, realization, association

```
umlclass
title: "Animals"

class Animal {
  + name : String
  - age : int
  # legs : int = 4
  + makeSound() : void
  + describe() : String
}

abstract class Mammal {
  + gestation : int
  + giveBirth() : void {abstract}
}

«interface» Comparable {
  + compareTo(o : Object) : int
}

«enumeration» Size {
  SMALL
  MEDIUM
  LARGE
}

class Dog {
  - breed : String
  + size : Size
  + makeSound() : void
}

Animal     <|--  Mammal          # generalization: Mammal is-a Animal
Mammal     <|--  Dog             # Dog is-a Mammal
Comparable <|..  Dog             # realization: Dog implements Comparable
Dog        "1" --> "*" Bone : owns      # directed association w/ multiplicity + name
```

*`Animal` is bold; `Mammal` is italic (abstract) and its `giveBirth()` is italic (`{abstract}`); `Comparable` carries the `«interface»` keyword; `Size` lists its literals in the attribute compartment. The generalization edges (`<|--`) drive the vertical layering — `Animal` at the top, `Dog` at the bottom — and `Dog --> Bone` is a cross-edge.*

### 4.2 Aggregation vs composition with roles, plus a dependency

```
umlclass
title: "Order model"
direction: tb

class Order {
  - id : String
  + total : Money       {readOnly}
  + place() : void
  + count : int         {static}
}
class LineItem {
  + qty : int
  + subtotal() : Money
}
class Customer { + name : String }
class Address  { + city : String }
class TaxPolicy { + rate(c : Country) : Percent }

Order   *-- "1..*" LineItem : contains   # composition: items die with the order (filled diamond at Order)
Customer o-- "0..*" Address  : has        # aggregation: addresses outlive the customer (hollow diamond at Customer)
Customer "1" -- "*" Order    : places     # plain association with multiplicity
Order   ..>  TaxPolicy : uses             # dependency (dashed open arrow)
```

*`Order.count` is underlined (static); `Order.total` carries `{readOnly}`. The filled diamond sits at the `Order` (whole) end of the composition; the hollow diamond at the `Customer` end of the aggregation; the dependency to `TaxPolicy` is dashed.*

### 4.3 EBNF

```ebnf
diagram      = header , { directive | classifier | namespace | relationship | member_line | comment } ;
header       = ("umlclass" | "class-diagram" | "classDiagram") , newline ;

directive    = "title:" , string , newline
             | "direction:" , ("tb" | "bt" | "lr" | "rl") , newline   (* default tb: parents on top *)
             | "theme:" , ident , newline ;

(* ---- packages / namespaces ---- *)
namespace    = "namespace" , (id | dotted_id) , [ "[" , string , "]" ] , "{" , newline
                       , { classifier | namespace | relationship | member_line | comment }
                       , "}" , newline ;
dotted_id    = id , { "." , id } ;                     (* auto-creates each ancestor package *)

(* ---- classifiers ---- *)
classifier   = [ stereotype ] , [ "abstract" ] , kind , id , [ "~" , type , "~" ] , [ alias ]
                       , [ "{" , { member } , "}" ] , newline ;
member_line  = id , ":" , ( member | stereotype ) , newline ;   (* Mermaid one-liner: append member / set annotation *)
kind         = "class" | "interface" | "enum" | "enumeration"
             | "datatype" | "primitive" | "" ;        (* empty kind ⇒ class, when a stereotype is present *)
stereotype   = "«" , word , "»" | "<<" , word , ">>" ;  (* «interface» «enumeration» «entity» … *)
alias        = "as" , id ;                              (* display name differs from reference id *)

member       = attribute | operation | literal | separator ;
separator    = "--" | ".." | "==" | "__" , newline ;    (* manual compartment divider (rare) *)

attribute    = [ visibility ] , [ "/" ] , name , [ ":" , type ]
                       , [ "[" , multiplicity , "]" ] , [ "=" , default ]
                       , { property } , [ classifier_suffix ] , newline ;
operation    = [ visibility ] , name , "(" , [ params ] , ")"
                       , [ [ ":" ] , type ] , { property } , [ classifier_suffix ] , newline ;
literal      = WORD , newline ;                         (* enum literal: bare name *)
classifier_suffix = "*" | "$" ;                         (* Mermaid: * = abstract, $ = static *)

visibility   = "+" | "-" | "#" | "~" ;                  (* public / private / protected / package *)
params       = param , { "," , param } ;
param        = [ direction ] , name , [ ":" , type ] ;
direction    = "in" | "out" | "inout" ;
property     = "{" , prop_word , "}" ;                  (* {abstract} {static} {readOnly} {query} {ordered} … *)
multiplicity = mult_term , [ ".." , mult_term ] ;
mult_term    = number | "*" ;
type         = type_name , [ ( "<" | "~" ) , type , { "," , type } , ( ">" | "~" ) ]  (* Mermaid `~T~` ≡ `<T>` *)
             | type , "[]" ;

(* ---- relationships ---- *)
relationship = id , [ end ] , connector , [ end ] , id , [ ":" , label ] , newline ;
end          = string ;                                 (* "1"  "0..*"  "*"  — multiplicity / role *)
connector    =                                           (* PRIMARY (PlantUML) | ALIAS (Mermaid)   *)
               "<|--" | "--|>"          (* generalization (hollow triangle → parent)        *)
             | "<|.." | "..|>"          (* realization   (dashed + hollow triangle → iface) *)
             | "*--"  | "--*"           (* composition   (filled diamond at whole end)      *)
             | "o--"  | "--o"           (* aggregation   (hollow diamond at whole end)      *)
             | "-->"  | "<--"           (* directed association (open arrow → target)       *)
             | "..>"  | "<.."           (* dependency    (dashed + open arrow → supplier)   *)
             | "--"                     (* plain association (no head)                      *)
             | ".." ;                   (* plain dependency link (dashed, no head)          *)

label        = string | bareword ;
comment      = ( "#" | "//" | "'" ) , text , newline ;   (* ' = PlantUML comment *)
id           = letter , { letter | digit | "_" | "." } ; (* dot allows qualified ids *)
string       = '"' , { char } , '"' | "「" , { char } , "」" | "“" , { char } , "”" ;  (* CJK quotes ok *)
number       = digit , { digit } ;
```

**Glyph-alias note.** PlantUML and Mermaid disagree on `-->`: PlantUML uses `-->` for *dependency* and `..>` for a weak dependency, while Mermaid uses `-->` for *association* and `..>` for *dependency*. Schematex resolves this in favour of **clarity over either tool**: `-->` is a **directed association** (the most common meaning, matching Mermaid and UML reading), and `..>` (dashed) is **dependency** (matching both Mermaid and PlantUML's dashed convention). This is documented as a §10 deviation. The `--|>` / `..|>` / `--*` / `--o` / `<--` / `<..` reversed forms are accepted as aliases and normalised so authors need not remember which end to type first.

### 4.4 AI-friendliness rules

Mirrors the project-wide "Made for AI" pillar (cf. §34 §4.4):

- **CJK quotes** (`「…」`, `『…』`, `“…”`, `"…"`) accepted wherever `"…"` is, for titles, labels, role names, and multiplicity ends — the single most common LLM-emitted-DSL failure mode.
- **Stereotype guillemets are interchangeable**: `«interface»` and `<<interface>>` parse identically; an LLM that cannot type guillemets is never penalised.
- **Forgiving connectors**: surrounding whitespace optional (`A<|--B` == `A <|-- B`); reversed forms auto-normalised (`B --|> A` ≡ `A <|-- B`).
- **Arc-declared classifiers, typed by context**: a relationship referencing an *undeclared* id auto-creates an empty `class` with that name (so a quick `A <|-- B` sketch renders), **but** the body-bearing form (`class B { … }`) always wins if present, and a typo that creates a stray one-box class surfaces as a *warning* listing the auto-created ids — never silent. This matches `network`'s "never silently drop, but tell the author" stance.
- **Visibility is optional**: a member with no leading glyph defaults to public (`+`) with a soft hint, matching how engineers actually sketch.
- **Readable structural errors**: a generalization cycle reports *"`Dog` cannot be a generalization of itself (cycle: Animal → Mammal → Dog → Animal)"*; an unknown endpoint reports *"relationship references `Bone`, which is not declared — did you mean `Bones`?"* with the offending line — never a byte offset.
- **Member-line tolerance**: `name: Type`, `name : Type`, and `Type name` (Java-field order) are all accepted; the parser normalises to `name : Type`.

### 4.5 Packages / namespaces + Mermaid-compatibility forms (v0.6.x)

These were added to close the gap with Mermaid's `classDiagram`; all are additive (no AST/DSL breakage).

**`namespace` containment** — classifiers may be grouped into a named frame:

```
namespace Auth {                 (* a block; classifiers inside belong to it *)
  class UserService { + login() }
}
namespace Company.Engineering.Backend {   (* dot-notation auto-creates Company + Company.Engineering *)
  class Developer
}
namespace plat["Platform Layer"] {         (* explicit display label *)
  class Gateway
}
```

- Blocks may **nest syntactically** (`namespace Outer { namespace Inner { … } }`); dot-notation and syntactic nesting compose (an inner block prefixes the outer id).
- Each package renders as a **labelled bounding frame** = the union of its member boxes + nested sub-frames, padded, with a top label band. Frames are computed post-layout (C4-style union+padding); the layered layout adds a *package-clustering* pass so same-package classifiers stay contiguous within each rank and the frame is a clean rectangle.
- **Deferred**: the OMG *tabbed-folder* glyph and package import/merge `«import»` dependencies (§11).

**Mermaid member forms** (all normalise into the same AST as the PlantUML block form):

| Form | Example | Normalises to |
|------|---------|---------------|
| Single-line member | `Animal : +int age` / `Animal : +mate()` | appends an attribute/operation to `Animal` |
| Single-line annotation | `Shape : <<interface>>` | sets `Shape`'s kind/stereotype |
| Tilde-generics | `List~int~`, `Map~String,int~`, `List~List~int~~`, `class Box~T~` | `List<int>`, `Map<String,int>`, `List<List<int>>`, name `Box<T>` |
| Member classifier `*` | `compute()*` | `isAbstract` (renders italic) |
| Member classifier `$` | `count$` / `count() int$` | `isStatic` (renders underlined) |
| Space-return-type | `getId() String` | return type `String` (no colon needed) |

A lone leading `~` is still the **package-visibility** glyph (`~ field : T`); tilde-generic conversion only fires on *balanced* `~…~` pairs inside a type, so the two never collide.

---

## 5. Layout Rules

Layout is deterministic — no force simulation, no randomness (so golden-string e2e tests are stable). It reuses the `flowchart` layered-DAG primitives, biased by the generalization hierarchy.

### 5.1 Coordinate model

```
Constants (px):
  BOX_MIN_W            = 120     minimum classifier box width (grows to fit text)
  BOX_PAD_X            = 12      horizontal text inset inside a compartment
  COMPARTMENT_PAD_Y    = 6       vertical padding top/bottom of a compartment
  ROW_H                = 18      one member (attribute/operation/literal) row height
  NAME_ROW_H           = 24      name-compartment row (taller for the bold name)
  STEREOTYPE_ROW_H     = 14      «stereotype» row above the name
  LAYER_GAP            = 70      gap between adjacent layers (rank direction)
  SIBLING_GAP          = 40      gap between boxes within a layer
  DIAMOND_W            = 16      aggregation/composition diamond width
  DIAMOND_H            = 10      diamond height
  TRIANGLE_W           = 16      generalization/realization triangle base width
  TRIANGLE_H           = 12      triangle height
  ARROW_LEN            = 9       open-arrowhead length (association/dependency)
  END_LABEL_GAP        = 6       multiplicity/role label offset from the box edge
  EDGE_LABEL_HALO      = 4       white halo behind midpoint association-name labels
```

### 5.2 Direction & layering

1. **Rank direction**: `direction: tb` (default — **parents/interfaces on top, children below**, the textbook orientation), or `bt`/`lr`/`rl`. The default is `tb` rather than C4's `lr` because the generalization triangle conventionally points *upward* to the parent.
2. **Layering is generalization-driven**: **generalization (`<|--`) and realization (`<|..`) edges define the rank hierarchy** — the more general classifier is assigned a strictly lower rank (higher on screen). These are the "tree edges." Associations, aggregations, compositions, and dependencies are **cross-edges** that influence within-layer ordering (barycenter) but do not force a rank change. This is the key domain bias over the generic flowchart kernel and is what makes a class diagram read correctly (an interface floats to the top, leaf concrete classes sink to the bottom).
3. **Cycle removal**: generalization/realization must be acyclic (validated in §2.5); association/dependency cycles are handled by the shared greedy FAS and routed as back-edges.
4. **Layer assignment**: longest-path layering on the generalization DAG; cross-edges are then added.
5. **Within-layer ordering**: barycenter / median crossing reduction (shared with flowchart), so siblings sharing a parent cluster under it.
6. **Coordinate assignment**: Brandes-Köpf for the cross-axis; layers evenly spaced `LAYER_GAP` on the rank axis. A parent is centred over the bounding span of its children where possible (the classic "balanced inheritance fan").

### 5.3 Compartment sizing

1. The box width is `max(BOX_MIN_W, widest measured text row + 2·BOX_PAD_X)`; every compartment shares the final width.
2. The **name compartment** always renders (height `NAME_ROW_H`, plus `STEREOTYPE_ROW_H` when a stereotype is present); the **attributes** and **operations** compartments render even when empty (an empty compartment is a thin band — this is the UML signal that the classifier *has* that section but it is unspecified, distinct from suppressing it). A compartment is *suppressed* (its divider line omitted) only via an explicit DSL flag (deferred — see §11).
3. Member rows are `ROW_H` tall; enumeration literals occupy the attribute compartment.
4. Text styling per OMG: class name **bold**; abstract class/operation name *italic*; static member **underlined**; derived attribute prefixed `/`. These are CSS classes, not inline styles.

### 5.4 Edge routing & adornment placement

1. Edges attach to box **boundary midpoints** (chosen per the rank direction), not centres; the shared orthogonal router produces single- or double-bend Manhattan paths snapped to a 10px grid.
2. **Adornment is drawn at the semantically-correct end**, decided by relationship kind, *independent of which id the author typed first* (reversed connectors are normalised in §4.3):
   - generalization/realization → **hollow triangle at the parent/interface end**; realization line dashed.
   - composition → **filled diamond at the whole end**; aggregation → **hollow diamond at the whole end**. The "whole" is the *source* id in `*--`/`o--` (and the target in the reversed `--*`/`--o`).
   - directed association/dependency → **open arrowhead at the target**; dependency line dashed.
3. **Shared generalization heads** (a "tree-merge"): when several children generalize the same parent, their triangles merge into one shared arrowhead at the parent with a branching trunk — the standard published look (mirrors the use-case `generalization` tree-merge in §29). Saves clutter on deep hierarchies.
4. **Multiplicity & role placement**: the multiplicity string sits just outside the box at the line's attachment point, offset `END_LABEL_GAP`; the role name sits slightly further along the line on the same side. Each end is placed on the box's outward side to avoid overlapping the line. This is the precise placement Mermaid gets wrong (its multiplicities float near the midpoint) and is a named differentiator.
5. **Association name** sits at the midpoint of the longest straight segment with a `EDGE_LABEL_HALO` halo; an optional reading-direction `▸`/`◂` triangle follows it.
6. Back-edges (association/dependency cycles reversed during FAS) route as a smooth curve around the outside of the layered band.

---

## 6. Styles & Theme Design

> How `umlclass` visuals derive from the existing two-layer Schematex token system (`00-OVERVIEW.md` §Theme System), consistently with the other 35 diagrams.

### 6.1 Where `umlclass` sits in the theme taxonomy

Schematex has two visual stances:

- **`IndustrialTokens`** — circuit / ladder / SLD / logic / FBD / SFC: *forced monochrome* under IEEE/IEC, no colourful variant by design.
- **`BaseTheme` + a semantic extension** — most others (flowchart, c4, petri, sequence): a tasteful house palette in `default`, true black/white in `monochrome`, Catppuccin in `dark`.

**`umlclass` belongs to the second group.** It is a software-engineering notation, not an IEC/IEEE compliance drawing; UML textbooks are black-and-white (so `monochrome` must reproduce the textbook look faithfully) but tools like PlantUML, draw.io, and StarUML use tasteful colour, so a `default` colour theme is legitimate and useful for the web gallery. This mirrors how its UML siblings `usecase` (§29) and `sequence` (§33) and its layout-cousin `c4` (§30) handle theming. The reserved-accent discipline here: **blue for the classifier body/header, the neutral stroke for relationship lines; no colour carries load-bearing meaning** (relationship semantics ride on *adornment shape*, which is the whole point of UML's notation and degrades perfectly to monochrome).

### 6.2 The `UmlClassTokens` semantic extension

Add to `src/core/theme.ts`, alongside `FlowchartTokens` / `PetriTokens` (matching the established `interface … Tokens` + `resolve…Theme(name)` pattern at lines 99, 596, 675):

```ts
export interface UmlClassTokens {
  /** Classifier box body + borders. */
  classifierFill: string;       // box interior
  classifierStroke: string;     // box border + compartment dividers
  /** Name-compartment header band (slightly tinted to set off the name). */
  headerFill: string;
  nameText: string;             // bold class name
  stereotypeText: string;       // «interface» / «enumeration» keyword (muted)
  memberText: string;           // attribute / operation rows
  /** Visibility glyphs (+ - # ~) — slightly muted so the name reads first. */
  visibilityText: string;
  /** Relationship lines + adornments (diamonds, triangles, arrowheads). */
  relationStroke: string;
  adornmentFill: string;        // filled composition diamond + filled arrowheads
  adornmentHollowFill: string;  // hollow aggregation diamond + hollow triangle interior (= box bg)
  /** Edge labels: association name, multiplicity, role. */
  edgeLabel: string;
  /** Interface / abstract accent (used sparingly for the «» keyword or italic tint). */
  abstractAccent: string;
}
```

`resolveUmlClassTheme(name)` follows the established pattern: `{ ...BASE_THEMES[name], ...UMLCLASS_TOKENS[name] }`, reusing `FONT_SIZE`, `STROKE_WIDTH`, `SPACING`, and `DEFAULT_FONT_FAMILY` from `theme.ts` — no new magic constants.

### 6.3 Per-theme values

**`default`** — house blue-grey, derived from `DEFAULT_THEME` tokens:

| Token | Value | Rationale |
|-------|-------|-----------|
| `classifierFill` | `#ffffff` (`fill`) | clean white box |
| `classifierStroke` | `#334155` (`stroke`) | slate body line + dividers |
| `headerFill` | `#eef2f7` (subtle blue-grey tint) | sets the name compartment apart |
| `nameText` | `#0f172a` (`text`) | strong bold name |
| `stereotypeText` | `#64748b` (`textMuted`) | muted «keyword» |
| `memberText` | `#0f172a` (`text`) | |
| `visibilityText` | `#64748b` (`textMuted`) | glyphs recede so names read first |
| `relationStroke` | `#334155` (`stroke`) | neutral lines — semantics live in the heads |
| `adornmentFill` | `#334155` (`stroke`) | filled diamond / filled arrow = body ink |
| `adornmentHollowFill` | `#ffffff` (`fill`) | hollow diamond / triangle interior = page bg |
| `edgeLabel` | `#475569` | readable but secondary |
| `abstractAccent` | `#2563eb` (`accent`) | the one house-blue accent, for «interface» keyword |

**`monochrome`** — faithful UML textbook (Fowler/Booch print stance):

| Token | Value |
|-------|-------|
| `classifierFill` | `#ffffff` |
| `classifierStroke` | `#000000` |
| `headerFill` | `#ffffff` (no tint; name set apart by **bold** + the divider only) |
| `nameText` | `#000000` |
| `stereotypeText` | `#000000` |
| `memberText` | `#000000` |
| `visibilityText` | `#000000` |
| `relationStroke` | `#000000` |
| `adornmentFill` | `#000000` (filled diamond/arrow solid black) |
| `adornmentHollowFill` | `#ffffff` (hollow diamond/triangle = white interior, black outline) |
| `edgeLabel` | `#000000` |
| `abstractAccent` | `#000000` (abstract carried by *italic* + `{abstract}`, never colour) |

> The §34/§15 principle applies: in `monochrome`, every distinction that rides on colour in `default` falls back to shape/weight — and UML is the ideal case because **its relationship semantics already ride entirely on adornment shape** (diamond vs triangle vs arrow, filled vs hollow, solid vs dashed). The monochrome theme is therefore the *reference* render, not a degraded one.

**`dark`** — Catppuccin Mocha, mirroring `DARK_THEME`:

| Token | Value |
|-------|-------|
| `classifierFill` | `#313244` (`fill`) |
| `classifierStroke` | `#cdd6f4` (`stroke`) |
| `headerFill` | `#45475a` |
| `nameText` | `#cdd6f4` |
| `stereotypeText` | `#a6adc8` |
| `memberText` | `#cdd6f4` |
| `visibilityText` | `#a6adc8` |
| `relationStroke` | `#cdd6f4` |
| `adornmentFill` | `#cdd6f4` |
| `adornmentHollowFill` | `#313244` |
| `edgeLabel` | `#bac2de` |
| `abstractAccent` | `#89b4fa` (`accent`) |

### 6.4 Stroke & type scale (reuse `theme.ts` constants)

- Box border, compartment divider, relationship line: `STROKE_WIDTH.normal` (2).
- Dashed lines (realization, dependency): `STROKE_WIDTH.normal`, dash `5 4`.
- Class name: `FONT_SIZE.label` (12) **bold**; stereotype + multiplicity + role + edge labels: `FONT_SIZE.small` (9); diagram title: `FONT_SIZE.title` (16).
- Member rows: `FONT_SIZE.label` (12). Font: `DEFAULT_FONT_FAMILY`.

### 6.5 House-style rule (one sentence to remember)

**Classifier boxes in house blue-grey neutrals; relationship semantics carried entirely by adornment shape (diamond / triangle / arrow, filled / hollow, solid / dashed) so the diagram is identical in `monochrome`; the only colour accent is house-blue for the `«interface»`/abstract keyword.** This keeps `umlclass` a member of the `c4`/`flowchart`/`sequence` family rather than the forced-mono industrial family.

---

## 7. Legend

By the project's auto-derive legend rules (`LEGEND-SYSTEM.md`): the universal conventions — box = class, `+ - # ~` = visibility, hollow triangle = inheritance, diamond = part-of — are textbook common knowledge for the OO audience and **not** listed. The legend auto-derives entries **only** for encodings actually used and non-obvious:

- composition (filled diamond) vs aggregation (hollow diamond) — when both appear (the most commonly-confused pair, worth disambiguating);
- realization (dashed + triangle) vs dependency (dashed + open arrow) — when both appear;
- `«stereotype»` keywords actually used (`«interface»`, `«enumeration»`, custom) — listed with their meaning;
- derived `/` and static-underline conventions — when used.

DSL controls follow the shared system: `legend: on/off/<position>`, `legend.title:`, `legend.hide:`, etc. Default position `bottom-inline`. The UML audience is expert, so the default leans toward a *terse* legend (often empty).

---

## 8. Output Contract

Semantic SVG (hard constraints #2/#3): `<title>`/`<desc>`, CSS classes, `data-*`, no inline styles, built via `src/core/svg.ts`.

- Root `<svg>` carries `data-diagram-type="umlclass"`, `role="img"`, `aria-label` = title or "UML class diagram".
- `<title>` / `<desc>` summarise classifier count by kind, relationship count by kind, and any detected hierarchy depth, plus warnings (auto-created classifiers, realization-target mismatches, duplicate members).
- Classifiers: `<g class="sx-umlclass-classifier" data-id="…" data-kind="class|abstract|interface|enum|datatype|primitive" [data-stereotype="…"] [data-abstract="true"]>` containing
  - `<g class="sx-umlclass-name">` (with `<text class="sx-umlclass-stereotype">` when present and `<text class="sx-umlclass-classname">`),
  - `<g class="sx-umlclass-attrs">` with one `<text class="sx-umlclass-member" data-visibility="public|private|protected|package" [data-static] [data-derived]>` per attribute/literal,
  - `<g class="sx-umlclass-ops">` likewise for operations (`[data-abstract]` on abstract operations).
- Relationships: `<g class="sx-umlclass-rel" data-from="…" data-to="…" data-kind="association|directed|aggregation|composition|generalization|realization|dependency" [data-source-mult="…"] [data-target-mult="…"] [data-name="…"]>` containing the path plus the adornment (`<polygon class="sx-umlclass-triangle|sx-umlclass-diamond">` or `<path class="sx-umlclass-arrowhead">`).
- Static members get `text-decoration: underline` via the `sx-umlclass-member[data-static]` CSS rule; abstract via the `sx-umlclass-*[data-abstract]` italic rule; derived via the leading `/` in the text node — all theme-controlled, no inline styles.
- Theme via `resolveUmlClassTheme`; strokes/fills from tokens only.

---

## 9. Canonical Test Cases

Fixtures the implementation must satisfy (parser + layout + golden-string e2e). Each lists the DSL and the assertions that matter.

### TC-1 — Minimal class with all member kinds
```
umlclass
class Account {
  + id : String
  - balance : Money = 0
  + owner : Customer
  / available : Money
  + count : int {static}
  + deposit(amount : Money) : void
  + transfer(to : Account, amount : Money) : boolean {query}
}
```
*Assert:* one `class`, three compartments rendered (name / 4 attrs incl. 1 derived + 1 static / 2 ops); `balance` shows `-` glyph and `= 0` default; `available` renders with leading `/`; `count` is underlined (`data-static`); name is bold; box width fits the longest row (`transfer(...)`). No relationships.

### TC-2 — Generalization + realization hierarchy, layering
```
umlclass
direction: tb
«interface» Shape { + area() : double }
abstract class AbstractShape {
  # name : String
  + area() : double {abstract}
}
class Circle { + radius : double + area() : double }
class Square { + side : double + area() : double }
Shape         <|.. AbstractShape
AbstractShape <|-- Circle
AbstractShape <|-- Square
```
*Assert:* `Shape` carries `«interface»`; `AbstractShape` name + `area()` are italic (`data-abstract`); realization edge `Shape <|.. AbstractShape` is **dashed** with a hollow triangle at `Shape`; the two generalization edges share a **merged triangle** at `AbstractShape`; layering puts `Shape` at rank 0 (top), `AbstractShape` rank 1, `Circle`+`Square` rank 2 (siblings, ordered to minimise crossings).

### TC-3 — Aggregation vs composition vs association, with multiplicities & roles
```
umlclass
class Library { + name : String }
class Book    { + title : String }
class Member  { + name : String }
class Loan    { + due : Date }
Library "1" *-- "0..*" Book   : catalogues
Library "1" o-- "0..*" Member : members
Member  "1" -- "*" Loan       : holds
```
*Assert:* `Library *-- Book` renders a **filled** diamond at the `Library` (whole) end and `data-kind="composition"`; `Library o-- Member` renders a **hollow** diamond at `Library`, `data-kind="aggregation"`; `Member -- Loan` is a plain line (no head), `data-kind="association"`; multiplicities `1` / `0..*` / `*` placed just outside the respective box edges (not at midpoint); association names at segment midpoints with halos.

### TC-4 — Mermaid glyph aliases + reversed connectors + dependency
```
umlclass
class Vehicle
class Car
class Engine
class Diagnostics
Vehicle <|-- Car          %% PlantUML generalization
Car *-- Engine            %% composition
Diagnostics <.. Car       %% reversed dependency: Car ..> Diagnostics
Car --|> Vehicle          %% reversed generalization alias (duplicate of edge 1 — dedup warning)
```
*Assert:* `Vehicle <|-- Car` and the reversed `Car --|> Vehicle` normalise to the **same** generalization (triangle at `Vehicle`) and the duplicate is reported as a *warning*, not rendered twice; `Diagnostics <.. Car` normalises to `Car ..> Diagnostics` (dashed open arrow at `Diagnostics`, `data-kind="dependency"`); `%%` (Mermaid comment) tolerated alongside `#`/`//`/`'`; `Car`, `Engine`, etc. declared as empty single-compartment classes render as name-only boxes.

### TC-5 — Enumeration + custom stereotype + CJK + structural error
```
umlclass
title: "「订单状态」"
«enumeration» OrderStatus {
  PENDING
  PAID
  SHIPPED
  CANCELLED
}
«entity» Order {
  + status : OrderStatus
  + total : 金额
}
Order --> "1" OrderStatus : has
```
*Assert:* `OrderStatus` carries `«enumeration»` and lists 4 literals in the attribute compartment (no visibility glyphs, no operations compartment populated); `Order` carries the custom `«entity»` stereotype; CJK title `「订单状态」` and CJK type `金额` round-trip; the directed association `Order --> OrderStatus` shows an open arrowhead at `OrderStatus` with multiplicity `1`. *Negative test:* adding `OrderStatus <|-- Order` then `Order <|-- OrderStatus` raises the **generalization-cycle** error naming the path; adding `Order <|.. PlainClass` (realization to a non-interface) raises a *warning* suggesting `PlainClass` be marked `«interface»`.

---

## 10. Deviations From the Standard

- **`-->` means directed association, not dependency.** PlantUML uses `-->` for dependency; Mermaid and the everyday UML reading use it for a navigable association. Schematex picks **directed association** (the common case) and reserves the dashed `..>` for dependency (where PlantUML and Mermaid agree). Documented here so PlantUML transplants are not surprised.
- **Visibility rendered as text glyphs, never icons.** PlantUML shows coloured lock/diamond icons for `+ - # ~` by default; UML 2.5.1's normative notation is the textual prefix. Schematex always uses the text glyph — standard-faithful, monochrome-safe, copy-pasteable.
- **Empty attribute/operation compartments still render.** UML allows suppressing a compartment, but a *suppressed* compartment (whole section hidden) and an *empty* one (section present, no features specified) mean different things. Schematex renders both compartments by default (the safer, more informative choice); explicit suppression is a deferred flag (§11). A name-only sketch class (`class Foo`) renders as a single compartment — the universally-understood shorthand.
- **Generalization heads are tree-merged.** When multiple children share a parent, UML permits separate or shared (tree) arrowheads; Schematex defaults to the **shared/merged** form to reduce clutter on deep hierarchies (matching its `usecase` engine). Separate-head mode is not offered in v0.1.
- **No formal model semantics.** The engine validates *structure* (reference resolution, generalization acyclicity, diamond-end legality) but does not check OO well-formedness beyond that (e.g. it does not verify that a realizing class implements every interface operation, nor type-check attribute types). It is a faithful renderer with light structural guards, not a model compiler — consistent with the project's "render + light derivation" stance.
- **Multiplicity placed at the box end, not the midpoint.** UML says multiplicity sits "near the end"; many tools (Mermaid) drift it toward the line centre. Schematex anchors it at the attachment point — a named fidelity improvement, not strictly a deviation, but called out because it visibly differs from Mermaid's output.

---

## 11. Deferred (post-v0.1)

Each has a slot in §2 so adding it is additive — no DSL or AST breakage:

- **Association classes** — a class box joined to an association line by a dashed connector (an association that carries its own attributes/operations). Needs a fourth connector form and a special routing pass; the highest-value deferred item.
- **Templates / generics (parameterised classifiers)** — the dashed parameter box at the top-right corner (`List<T>`, `Map<K,V>`). Generic *type names* in member signatures (`List<int>`) are parsed and rendered inline in v0.1; the parameterised-classifier box is deferred.
- **N-ary associations** — a central diamond with spokes to 3+ classifiers.
- **Qualified associations** — the small qualifier key-box at an association source end.
- **Generalization sets** — `{disjoint}` / `{overlapping}` / `{complete}` / `{incomplete}` constraints across a set of generalization edges.
- ~~**Packages & namespaces**~~ — **shipped (v0.6.x)**: `namespace Name { … }` containment frames with dot-notation auto-creation (`namespace A.B.C`), syntactic nesting, and explicit `["Label"]`. See §4.5. Still deferred: the *tabbed package folder* glyph and package import/merge dependencies.
- **Nested / inner classifiers** — a class declared inside another, with the anchor (crossed-circle) line.
- **Active classes** — double vertical side-bars for classifiers with their own thread of control.
- **Ports & provided/required interfaces** ("lollipop" / "socket" ball-and-socket notation) — really a composite-structure construct that often appears on class diagrams.
- **Compartment suppression flag** — explicit DSL to hide the attributes or operations compartment of a chosen classifier.
- **Constraints & notes** — `{constraint}` boxes and dog-eared note shapes anchored to elements (shared with other UML engines; candidate for a cross-engine `note` primitive).
- **Non-navigable `✕` end marker** — the explicit "cannot traverse this way" cross on an association end.
- **XMI / Mermaid / PlantUML round-trip import** — a `*2schematex` adapter; out of this engine's remit (parallels the deferred Structurizr import in §30).
```
