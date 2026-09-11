# EV charge point lifecycle — ideal drawing

**The scenario.** A public EV charging station, drawn the way a controls engineer would
specify it for review: the station idles in `Available` and keeps reporting itself with a
heartbeat, a plugged-in cable sends it to `Authorizing`, and the authorization response is
resolved at a choice point that either starts a charging session or bounces back to
`Available`. `Charging` is a composite state holding the session itself (ramp up, hold
steady, suspend and resume at the vehicle's request). Unplugging finishes the session;
a ground fault diverts to `Faulted`, which either recovers or ends the machine's life
under service lockout.

**Palette (six colours, no others).** `#16202E` ink for state outlines, state names and
pseudo-states; `#FFFFFF` paper for state fill and label halos; `#4A5568` for transition
strokes; `#64708A` slate for transition labels and captions; `#EEF2F7` mist for the
composite state's body, so a container reads as a container without a second outline; and
`#A4442F` ember used on exactly one thing — the `Faulted` state — to mark the exception
branch. Colour carries no other meaning.

**Type scale.** 19px semibold title, 11.5px subtitle, 13px state names, 11px transition
labels, 10.5px legend. One corner radius (10px) and one spacing unit (10px) everywhere.
Two stroke weights only: 1.5px for anything that bounds a state, 1.25px for transitions.

**Symbol geometry** follows UML 2.5 §14: initial is a filled disc (r=6), final is a
bull's-eye (r=10 ring with an r=5 filled core), choice is a hollow diamond (26px half-
diagonal) whose outgoing transitions carry the guards, the composite state is a rounded
rectangle with a name compartment ruled off above its substates, and every transition ends
in an *open* (unfilled) arrowhead — the UML arrow, not a solid triangle. The self-transition
is a true circular loop pinned to `Available`'s top-right corner, leaving the top edge and
returning to the right edge. Transition labels are the full `event [guard] / action` form.

**Layout and collisions.** Positions are computed, not eyeballed. The lifecycle runs as one
clockwise cycle — Available → Authorizing → choice → Charging → Finishing → Available — so
the two long feedback edges (`Finishing` returning along the top, `Faulted` returning along
the bottom and up the left margin) never cross each other or any other edge; the drawing has
zero edge crossings. Labels sit beside the midpoint of their edge, never on it, each on a
white (or mist, inside the composite) halo, and each label box was checked against every
other label, every state box, every line segment and the canvas margin: 0 collisions.

**Departures from the standard doc.** The reference file specifies a two-line stacked label
for anything over 80px wide; here labels are kept on one line unless stacking is what avoids
a collision, because a single line reads faster and the layout has room. The `Faulted` tint
and the bottom legend are editorial, not UML — they help a reviewer, and neither carries
semantics a reader could misread.
