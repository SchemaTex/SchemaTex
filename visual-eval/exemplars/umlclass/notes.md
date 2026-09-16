# UML class diagram exemplar — online store ordering and payments

**Scenario.** An online store's domain model, drawn the way a backend engineer would put it in a
design review: customers place orders, an order is made of order lines, each line points at a
product, products are grouped into categories, and an order is settled by payments that go through a
pluggable payment gateway. Twelve classifiers in two packages. It is the same storefront the ERD
exemplar draws as database tables, so the two drawings show a type model and a schema of one system.
Every relationship kind appears because the domain needs it, not for show:

- order lines are deleted with their order, so that link is composition;
- a product can sit in several categories and survives without them, so that link is shared aggregation;
- a line knows its product but a product does not track its lines, so that link is navigable one way;
- `Payment.process()` takes a gateway as a parameter, so that link is a usage dependency;
- card, wallet and bank transfer are kinds of payment, so they are generalizations;
- the Stripe adapter implements the gateway contract, so that link is a realization.

**What was kept from the current design.** The engine already gets these right, and the drawing keeps them:

- Three-compartment boxes: a tinted name compartment (`#EEF2F7`, the engine's header colour) over a white body, with a 1.5px slate outline.
- Visibility as text glyphs (`+ - #`) in a lighter grey so member names read first, never icons.
- The compact `name: Type` member form.
- Attribute and operation compartments are still drawn when empty.
- One neutral ink for every line, so each relationship is identified by the shape of its line end alone and the drawing still works in black and white.
- The line-end shapes and roughly the engine's sizes: one shared hollow triangle for several subclasses, a dashed line for realization and dependency, diamonds at the whole end.
- Multiplicities sit at the box end of the line, not at its midpoint.
- Parents drawn above children.
- A lightly tinted frame per package.

What changes is placement and legibility. Every line is orthogonal instead of diagonal, the package
frames no longer overlap, and edge text is bigger. Role names and multiplicities go on opposite sides
of the line, and the association name gets its reading-direction arrow.

**Layout.** The two packages sit side by side as UML tabbed folders on shared row lines. `ordering` is
two columns and three rows:

| | left column | right column |
|---|---|---|
| top row | `OrderStatus` | `Customer` |
| middle row | `Category` | `Order` |
| bottom row | `Product` | `OrderLine` |

In `payments`, `«interface» PaymentGateway` sits above `StripeGateway`. The abstract `Payment` sits on
the middle row, level with `Order`, so the only link between the packages is one straight horizontal
line. Its three subclasses sit on the bottom row. `Payment` is centred over the middle subclass, so
the inheritance trunk runs straight down into `WalletPayment` and a bar reaches the other two.

All nine lines are straight except the dependency, which bends once. `OrderStatus` has no line
because `Order` already lists `status: OrderStatus`. In UML an attribute and an association end are
the same property, so drawing both would say it twice. For the same reason `Order` does not list its
lines or payments as attributes.

**Palette (nine named colours, no others).**

| Name | Hex | Used for |
|---|---|---|
| paper | `#FFFFFF` | canvas and class bodies |
| ink | `#0F172A` | title, class names, member names, enumeration literals, multiplicities |
| line | `#334155` | box outlines, compartment rules, every relationship line and line-end shape; also fills the composition diamond |
| muted | `#475569` | member types, role names, association names, legend captions |
| faint | `#64748B` | visibility glyphs, `{abstract}`, the subtitle |
| frame | `#94A3B8` | package outlines and tabs, the rules under the title and above the legend |
| header | `#EEF2F7` | name compartments |
| package | `#F8FAFC` | package bodies |
| accent | `#2563EB` | the `«interface»` and `«enumeration»` keywords, and nothing else |

**Type scale.**

- 20px semibold title; 11px uppercase subtitle tracked 0.6px.
- 12px semibold package names.
- 13.5px semibold class names, italic for the abstract class; 11px keywords and `{abstract}`.
- 12px members.
- 12px medium-weight multiplicities; 11.5px role names; 12px association names (italic) and `«use»`.
- 11.5px legend captions.

Stroke weights: 1.5px box outlines, 1px compartment rules, 1.4px relationship lines, 1.25px package
frames. Dashes are 6px on, 4px off. Line-end shapes: triangle 18px wide by 15px deep, diamond 24px
long by 13px wide, open arrowhead 12px long and 12px across.

**Notation (UML 2.5.1).**

- **Compartments.** Each class is name / attributes / operations. An empty compartment is a 10px band, so it reads as "present but empty". Keywords `«interface»` and `«enumeration»` are upright, above the name. Enumeration literals fill the attribute compartment.
- **Abstract, static, derived.** The abstract class name is italic with `{abstract}` beneath it (UML allows both at once). The abstract operation `refund()` is italic. The static constant `MAX_QUANTITY` is underlined from its name to its default value. The derived attribute is written `/total`. Attribute multiplicity is written `[0..1]` after the type.
- **Association ends.** Multiplicity sits on one side of the line and the role name on the other, both next to the box they describe. On horizontal lines the multiplicity is above and the role below; on vertical lines the multiplicity is right and the role left. The association name `places` sits at the middle of its line with a small filled triangle pointing the reading direction.
- **Line ends.**
  - plain association: nothing at either end;
  - navigable association: open arrowhead at the target;
  - aggregation: hollow diamond at the whole;
  - composition: filled diamond at the whole;
  - generalization: hollow triangle at the parent, with the three subclasses sharing one triangle through a trunk and bar;
  - realization: dashed line with a hollow triangle at the interface;
  - dependency: dashed line with an open arrowhead at the supplier, labelled with the standard `«use»` keyword.

  Every line end touches the box edge exactly. A legend along the bottom repeats all seven against a stub of box edge.

**Collisions.** Positions come from `scripts/visual-eval/draw-umlclass-exemplar.mjs`. The script
measures text in Chromium and refuses to write the file if any check fails. Results for this
drawing:

- All 18 relationship ends lie on the edge of the right box.
- No line passes through a box.
- No two lines cross.
- None of the 23 labels overlaps another label, a box, a line, a line-end shape, a package frame or the canvas edge.
- No member text overflows its box.
- Lines cross a package frame edge exactly twice: the `Order`–`Payment` association leaving `ordering` and entering `payments`, which is the point of drawing packages.

**Departures from the standard doc** (`docs/reference/36-UMLCLASS-STANDARD.md`).

- **Packages.** They use the UML tabbed folder with the name in the tab. The doc and engine draw a rounded frame with a centred label and list the folder as deferred.
- **Abstract class.** `{abstract}` is added under the italic name. Italics alone are easy to miss at 13px and vanish in some fonts.
- **Role names.** They go on the opposite side of the line from the multiplicity. The doc (§5.4) puts them further along the same side, which stacks two labels in one corner.
- **Keywords.** They are upright and blue. The doc reserves blue for `«interface»`; it is extended to `«enumeration»`, the only other keyword used. The engine sets keywords in italic, but UML keywords are ordinary text in guillemets.
- **Type sizes.** Sizes and weights are larger than §6.4, which calls for 12px names, 9px edge labels and 2px strokes. At those sizes multiplicities are hard to read on a 1,500px drawing.
- **Member types.** Types are a lighter grey than member names. The doc's tokens give member rows a single colour.
- **Legend.** A seven-item legend is included, matching the ERD and state exemplars. §7 leans toward no legend for an expert audience; it is editorial and carries no meaning of its own.

**References.**

- OMG, *Unified Modeling Language 2.5.1* (formal/17-12-05), §9–11 Classification, Classifiers, Structured Classifiers — https://www.omg.org/spec/UML/2.5.1/
- uml-diagrams.org, *UML Class and Interface Notation* — https://www.uml-diagrams.org/class.html
- uml-diagrams.org, *UML Association* (end names, navigability, reading direction) — https://www.uml-diagrams.org/association.html
- uml-diagrams.org, *UML Generalization* (shared target style) — https://www.uml-diagrams.org/generalization.html
- uml-diagrams.org, *UML Composite Aggregation* — https://www.uml-diagrams.org/composition.html
- uml-diagrams.org, *UML Package Diagrams* (tabbed folder, name in tab when members shown) — https://www.uml-diagrams.org/package-diagrams.html
- Martin Fowler, *UML Distilled*, 3rd ed., ch. 3 and 5 on class diagrams — https://www.informit.com/store/uml-distilled-a-brief-guide-to-the-standard-object-9780321193681
- Wikipedia, *Class diagram* — https://en.wikipedia.org/wiki/Class_diagram
- Visual Paradigm, *UML Class Diagram Tutorial* — https://www.visual-paradigm.com/guide/uml-unified-modeling-language/uml-class-diagram-tutorial/
- PlantUML, *Class Diagram* — https://plantuml.com/class-diagram
- Mermaid, *Class diagrams* — https://mermaid.js.org/syntax/classDiagram.html
