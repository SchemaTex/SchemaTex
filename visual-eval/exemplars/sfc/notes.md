A batch oven sequence drawn as an IEC 61131-3:2013 sequential function chart, which uses the same graphic conventions as IEC 60848 GRAFCET. The oven starts at the initial step S0 and heats up. It then bakes and cools the chamber jacket at the same time: the bake action is delayed 15 minutes and the cooling action stops after 5 minutes. When both are finished it announces completion and returns to S0.

Why it works as the exemplar for this type:

- Steps are plain rectangles with the step name centred in bold. The initial step has a double outline. The main sequence runs down one vertical centre line.
- Each transition is a short, thick horizontal bar across the link, with its condition written directly to the right. The condition never sits on a line or a box.
- Actions hang to the right of their step on a short horizontal link. Each action block is split into cells: qualifier (N, D, L), action name, and a time cell only when the qualifier needs one (T#15m, T#5m).
- Simultaneous branches open and close with a pair of parallel lines that extend slightly past the outer branches. The shared transition sits above the opening pair and below the closing pair, as the standard requires. The branches are spaced far enough apart that each one's action block stays clear of the other branch.
- The return to the initial step is drawn as a routed orthogonal link along the left margin, with an arrowhead on the upward segment because the flow runs against the normal top-to-bottom direction. Every label stays inside the canvas.
- A two-line key at the bottom explains the outline, bar and double-line conventions and the three qualifiers used.

Palette: ink #20272B (steps, links, transitions, text), muted #59636B (subtitle, key), rule #CBD1D6 (key separator), paper #FFFFFF.
