Promoted from the reviewed case `threatmodel-web-app`: a customer's browser talks to a web application in a DMZ, which calls an authentication service, writes to a customer database and an audit log in the internal zone, and sends shipment requests out to a third-party shipping API. It is a STRIDE threat model drawn as a data-flow diagram, following Shostack, *Threat Modeling: Designing for Security* (2014), ch. 2–3, and the Microsoft Threat Modeling Tool stencil: a rectangle is an external entity, a circle is a process, two parallel lines are a data store, arrows are data flows, dashed frames are trust boundaries, and each element is tagged with the STRIDE-per-element threats that apply to its kind.

Why it works as the exemplar for this type:

- The three trust zones are equal-height dashed, lightly tinted columns laid out left to right from least to most trusted, so every boundary crossing is a line leaving one column for another.
- Each element carries its STRIDE badge inside its own shape, under its name, so a threat list can never be mistaken for a label on a nearby flow.
- Every flow is its own orthogonal line with its own entry point: no two flows share a trunk, merge, or cross, and each label sits in clear space beside its line in the line's colour.
- Red is reserved for the flows that cross a trust boundary; the one flow that stays inside the DMZ is drawn in ink, so the risky flows stand out without any extra marking.
- The legend row pairs a small drawn glyph with each notation, and two caption lines spell out the STRIDE letters and the conditional R? on data stores.

Palette: title #0f172a, element ink #1e293b, label slate #475569, caption grey #64748b, zone fill #f8fafc with #94a3b8 dashed border, boundary-crossing red #b02a37, badge #eef2f6 / #94a3b8.
