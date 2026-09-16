An online bookstore's functional scope, drawn as a UML 2.5.1 use case diagram (OMG UML 2.5.1 §18 UseCases): a Customer browses the catalog and checks out, a Member (a kind of Customer) tracks orders, an external Payment Provider takes part in processing payment, and Warehouse Staff ship orders. Check Out always includes Process Payment and Sign In, Track Order also includes Sign In, and Apply Discount Code optionally extends Check Out at its `discount code` extension point when a code is entered.

Why it works as the exemplar for this type:

- The subject is one lightly tinted rounded rectangle named at its top-left; human actors stand outside it on the left, and the supporting actors (the external system and warehouse staff) on the right, each level with the use case it talks to, so every association is short and none crosses another line.
- Use cases sit in two tidy columns of ellipses sized to their name, with the base use case nearest its primary actor and included use cases one column further in; the shared included use case Sign In sits between its two callers so both arrows are short and straight.
- `«include»` and `«extend»` are dashed lines with an open arrowhead and the keyword in small grey text beside the line, never on it. Include points from the base to the included case; extend points from the extension to the base, with its condition in brackets under the keyword.
- The base use case that is extended shows an `extension points` compartment under a rule inside its ellipse, naming the point the extend refers to.
- Actor generalization is a solid line with a hollow triangle at the parent actor; an external system actor is a classifier box with the `«actor»` keyword, while people are stick figures with bold names below.

Palette: ink #0F172A, line #334155, muted #475569, faint #64748B, boundary grey #94A3B8, boundary tint #F8FAFC, actor box tint #EEF2F7, paper #FFFFFF, keyword blue #2563EB.

Reference: OMG, *Unified Modeling Language 2.5.1* (formal/17-12-05) §18.1–18.2, https://www.omg.org/spec/UML/2.5.1/ ; uml-diagrams.org, *UML Use Case Diagrams*, https://www.uml-diagrams.org/use-case-diagrams.html
