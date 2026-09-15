A web shop's checkout with a saved card, drawn as a UML 2.5.1 sequence diagram (OMG UML 2.5.1 §17 Interactions): a shopper places an order, the web store calls the checkout service, the checkout service asks the payment gateway to authorize the card, and an `alt` fragment splits the approved path (create an Order object, insert each cart line inside a `loop`, publish an event inside an `opt`, reply 201) from the declined path (reply 402). Seven lifelines, three combined fragments, one created lifeline.

Why it works as the exemplar for this type:

- Every message kind is told apart by its line and head alone, as §17 specifies: a synchronous call is a solid line with a filled triangle, an asynchronous signal a solid line with an open arrowhead, a reply a dashed line with an open arrowhead, and a create message a dashed line whose arrowhead touches the side of the new lifeline's head box, drawn at the height where the object comes into existence.
- Lifeline heads are tinted boxes with the participant kind as a small blue keyword above a bold name; the actor is a stick figure. Lifelines are thin dashed grey, and activation bars are narrow white rectangles, with every message starting and ending on the bar edge rather than the dashed line.
- Combined fragments are light grey frames with the operator in a tinted pentagon tab at the top-left corner; each operand's guard sits in square brackets just right of the lifeline it concerns, and `alt` operands are divided by a dashed separator across the full frame. Nested frames keep a visible inset from their parent.
- Message labels sit above their line, centred between the two lifelines they join; a long message that crosses several lifelines puts its label near its sender so it never lands on a dashed lifeline.
- Rows have even vertical rhythm (about 35–40px per message, extra space where a frame opens or closes), so nothing stacks and the bottom of the drawing is as clean as the top. A one-line legend repeats the notation.

Palette: ink #0F172A, line #334155, muted #475569, faint #64748B, frame grey #94A3B8, head tint #EEF2F7, paper #FFFFFF, keyword blue #2563EB.

Reference: OMG, *Unified Modeling Language 2.5.1* (formal/17-12-05) §17.4–17.6, https://www.omg.org/spec/UML/2.5.1/ ; uml-diagrams.org, *UML Sequence Diagrams*, https://www.uml-diagrams.org/sequence-diagrams.html
