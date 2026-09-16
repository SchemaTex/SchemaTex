A packaging-line bottle counter written as an IEC 61131-3:2013 function block diagram (the FBD graphical language). It has four networks. The first debounces the photo-eye with a 50 ms on-delay timer (TON). The second counts one bottle per rising edge, using R_TRIG to detect the edge and an up-counter (CTU) with a preset of 24. The third copies "counter reached preset" into BatchDone. The fourth runs the infeed conveyor only while it is commanded and the case is not yet full, using an AND block with a negated input.

Why it works as the exemplar for this type:

- Each network starts with a full-width hairline rule, a bold "Network n" label and a plain-English comment on the same line. The reader learns what a network does before reading its blocks.
- Every block follows the IEC layout. The instance name sits above the box, the block type is centred inside the top, and formal parameter names (IN, PT, CU, R, PV, Q, ET, CV) sit inside the box next to their pins. Plain Boolean functions like AND have no instance name and no pin names.
- Inputs enter on the left and outputs leave on the right as short, equal-length pin stubs. Wires are straight horizontal lines. Blocks that are chained share a pin row, so R_TRIG.Q runs to CTU.CU without any bend.
- Pin modifiers are drawn exactly. A small open circle on the box edge means a negated input (BatchDone into AND). An inward wedge on CTU.CU means the input reacts to a rising edge.
- Variables are bold and sit right-aligned against their wire. Literals such as T#50ms and 24 use regular weight, so the eye can tell a tag from a constant without colour.
- The drawing is monochrome with no data-type wire colours. A two-line key at the bottom explains the pin modifiers.

Palette: ink #20272B (blocks, wires, variables, titles), muted #59636B (comments, key), rule #CBD1D6 (network separators), paper #FFFFFF.
