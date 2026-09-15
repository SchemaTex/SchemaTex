# Single-line diagram exemplar (IEC) — 11 kV primary service with standby generator

**Scenario.** The IEC counterpart of the ANSI exemplar: the same commercial distribution centre
and the same topology, drawn the way a European, Middle-Eastern or Asian consultant would issue
it. An 11 kV network infeed with revenue metering, an incoming disconnector and a vacuum
circuit-breaker tripped by overcurrent and earth-fault relays, a 1600 kVA Dyn11 service
transformer, a 2500 A main switchboard with four feeders, and a 500 kW standby generator reaching
the standby panel through an automatic transfer switch (ATS). Ratings are restated in IEC terms
— 11 kV / 400/230 V at 50 Hz, cable sizes in mm², IEC 81346 device designations (-Q, -F, -T, -P)
— and kept mutually consistent: -T1 delivers about 2200 A at 420 V, which the 2500 A main
breaker carries, and its 6 % impedance limits the secondary fault to about 37 kA, inside the
50 kA ratings. Two things differ from the ANSI sheet on purpose: the T-2 feeder is a
disconnector and fuse instead of a breaker, so the sheet shows both IEC switching symbols and the
fuse; and there is an incoming disconnector ahead of -Q1, as IEC switchgear normally draws.

**Layout.** Identical to the ANSI sheet: one vertical trunk from the infeed at the top to the
switchboard bus; relays to the left of the trunk on the CT secondary with dashed trip linkages up
to -Q1; a dashed rule between medium and low voltage below -T1 that only the trunk crosses; four
feeders dropping from the bus on 260 px centres; the generator right of the bus end, its
conductor running down and left into the ATS emergency contact without crossing anything. Names
and ratings sit to the right of each device; terminal loads carry theirs centred underneath.

**Palette.** The same five colours as the ANSI sheet, no accent hue: names `#0f172a`; conductors,
bus and symbol outlines `#1e293b`; rating lines `#475569`; cable annotation, earthing captions,
section captions and notes `#64748b`; title and section rules `#dbe2ea`. Symbol interiors are
paper white `#ffffff`.

**Type scale.** Inter, Helvetica Neue, Helvetica, Arial. Title 18/700; deck line 9.5/600 upper
case, letter-spacing 1.3. Device names 12/600, rating lines 11/400 on a 15 px pitch. Cable
annotation, earthing captions, section captions and notes 10/400. Lettering inside symbols:
`G`/`M` 13/700 with `3~` 8.5/600, relay functions 11/700, `Wh` 10/600.

**Symbols (IEC 60617).** Stroke weights: conductor 1.5, bus 3, symbol outline 1.5, CT secondary,
earthing leads and trip linkages 1.2, trip linkages dashed 5/4.
- *Circuit-breaker:* a make contact whose moving blade is hinged on the lower terminal, with a
  small cross (×) on the fixed contact.
- *Disconnector:* the same blade with a short bar across the fixed contact.
- *Fuse:* a 12 × 32 rectangle with the conductor running through it.
- *Two-winding transformer:* two overlapping r = 16 circles; the vector group Dyn11 and the
  impedance uk are written in the rating lines. The star point leaves the secondary circle and
  runs to an earth symbol with the earthing-conductor size beside it.
- *Current transformer:* an r = 9 ring threaded by the conductor, its secondary taken off sideways.
- *Protection relays:* rectangles lettered with their measured quantity and function — `I>  I>>`
  for definite-time and instantaneous overcurrent, `I₀>` for earth fault — instead of IEEE
  device numbers.
- *Earth:* a lead ending in three bars of decreasing length.
- *Generator and motor:* circles lettered `G` or `M` over `3~`.
- *Integrating meter:* a rectangle with a bar across its top, lettered `Wh`.
- *ATS:* a two-way (changeover) contact — solid blade to the normal contact N, dashed blade to the
  emergency contact E — drawn in its normal position.
- *Distribution board:* an 80 × 32 rectangle with a hairline near the top.

**Collisions.** The generator measures every string with resvg and refuses to write unless every
label keeps 4 px clear of every other label, every symbol, every conductor, CT secondary, earthing
lead, trip linkage, bus and section rule and the canvas edge; symbol lettering stays inside its
own symbol; no run passes through a symbol it does not connect to; and all runs are orthogonal
except the switch blades. **0 collisions.**

**Departures.**
1. The network infeed is a circle with a sine wave, as on the ANSI sheet. IEC 60617 has no
   dedicated "utility" symbol; the infeed's voltage and short-circuit power carry the information.
2. The 1500 kVA / 12.47 kV / 480Y/277 V ratings of the ANSI sheet become 1600 kVA / 11 kV /
   400/230 V, the nearest standard IEC values, and every downstream rating is rescaled to match.
3. The ATS is drawn as a changeover contact; IEC 60617 has no single ATS symbol.
4. As on the ANSI sheet there is no legend or title block; those belong to the drawing border.

**Source.** `source.sx` selects IEC symbols with `[standard: iec]` in the header. Relay function
text goes in `device:`; the relay-to-breaker connections are the trip linkages; every other
`->` is a power conductor with its size in `cable:`.

## References

- IEC 60617, *Graphical symbols for diagrams* (online database: circuit-breaker, disconnector, fuse, transformer, current transformer and earth symbols) — https://webstore.iec.ch/en/iec_catalog/product/preview/?id=L3B1Yi9wZGYvcHJldmlldy9pbmZvX2llYzYwNjE3e2VkMS4wfWIucGRm
- IEC 60076-1, *Power transformers — General* (vector group notation such as Dyn11; impedance voltage uk)
- IEC 81346-2, *Industrial systems — Structuring principles — Classification of objects and codes for classes* (-Q, -F, -T, -P letter codes)
- "IEC Symbols for Isolators, Disconnectors, Fuses, Contactors", Radica Software symbol library — https://symbols.radicasoftware.com/228/iec-isolators-disconnectors-fuses-contactors-overloads
- "Electrical Schematic Symbols Reference (IEEE C37.2 and IEC)", Industrial Monitor Direct — https://industrialmonitordirect.com/blogs/knowledgebase/electrical-schematic-symbols-complete-ansiieee-reference
- "How to Read a Single Line Diagram", Cable Hero (IEC-style one-lines, breaker and isolator symbols, transformer vector groups) — https://www.cablehero.com.au/how-to-read-a-single-line-diagram
- "Single-line diagram", Wikipedia — https://en.wikipedia.org/wiki/Single-line_diagram

Palette: names #0f172a · conductors #1e293b · ratings #475569 · notes #64748b · rules #dbe2ea · paper #ffffff
