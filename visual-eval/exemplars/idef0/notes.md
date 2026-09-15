A warehouse's order fulfilment, drawn as an IDEF0 A0 decomposition diagram (FIPS PUB 183, *Integration Definition for Function Modeling*, 1993; IEEE 1320.1-1998): four functions — Allocate stock, Pick items, Pack order, Ship parcel — each transforming its inputs into outputs under controls and using mechanisms, with a short-pick report from packing fed back as a control on allocation. The diagram sits in the standard diagram form with a Node / Title / Number block along the bottom.

Why it works as the exemplar for this type:

- Function boxes step down a diagonal staircase from upper left to lower right in order of dominance, each a plain rectangle with a verb-phrase name centred and its box number (1–4) in the lower-right corner.
- ICOM placement is exact: inputs enter the left edge, controls enter the top edge pointing down, outputs leave the right edge, mechanisms enter the bottom edge pointing up. Every arrow is orthogonal with a small filled arrowhead.
- Boundary arrows run to the frame and carry their ICOM code (I1, C1, O1, M1…) in small bold grey next to the frame, with the noun-phrase label beside it; box-to-box arrows are labelled beside their vertical run, in the clear space above the next box.
- The feedback arrow follows the IDEF0 rule for a control feedback — out of the right edge, up and over the top, down into the earlier box — and bridges each control arrow it crosses with a small hop, so no crossing reads as a junction.
- One ink colour, one stroke weight for arrows, a slightly heavier box outline and a pale box fill; the drawing works in black and white, as the standard's paper forms require.

Palette: ink #0F172A, line #1E293B, muted #475569, faint #64748B, box fill #F1F5F9, paper #FFFFFF.

Reference: NIST, FIPS PUB 183 (1993), §3 Syntax and Semantics and Annex B diagram form, https://www.idef.com/wp-content/uploads/2016/02/idef0.pdf ; IEEE Std 1320.1-1998, *IEEE Standard for Functional Modeling Language — Syntax and Semantics for IDEF0*.
