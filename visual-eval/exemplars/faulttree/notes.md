A pressure-vessel rupture fault tree in NUREG-0492 *Fault Tree Handbook* (1981) and IEC 61025 notation. The top event needs sustained over-pressure AND failure of both relief valves. Over-pressure comes from a pump runaway through an INHIBIT gate whose condition is "heater energised". Relief failure is a 2-out-of-2 voting gate over two stuck relief valves. The engine computes the single minimal cut set {PUMP, PRV_A, PRV_B} and a top-event probability of 1.60e-6.

Why it works as the exemplar for this type:

- The shapes follow the handbook exactly: rectangles for top and intermediate events, circles for basic events, a flat-bottomed dome for AND, a curved-base shield carrying "2/2" for the voting gate, and a hexagon for INHIBIT with its condition in an oval on a short side lead. A later target should not invent substitute glyphs.
- The tree is strictly top-down with orthogonal connectors. Each gate sits directly under the event it explains, and children fan out from one horizontal bar, so every path from a basic event to the top reads as a vertical staircase.
- Gates share one green outline and tint. Events are neutral slate boxes, and the top event is set apart only by a heavier border. Colour is not used to rank events.
- Computed results use two reserved accents. Probabilities are blue: `p=` under each basic event and P(top) above the top event. The minimal cut set is drawn as one red rounded frame around its basic events.
- Basic events carry a short ID inside the circle, with the plain-English description and probability beneath. The circles stay small and aligned on one row while the meaning stays readable.

Palette: ink #334155, top-event border #1e293b, event fill #eef2f7, gate #dcfce7 / #059669, condition oval #f1f5f9, probability blue #2563eb, cut-set frame #dc2626 over a 5% red tint, paper #ffffff.
