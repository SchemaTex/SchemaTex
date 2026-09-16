# Logic symbol inventory

Tier 1 covers the basic gates, wires and connection marks needed for a readable logic diagram. Tier 2 covers everyday sequential elements, buses and pin qualifiers. Tier 3 completes the composable graphical vocabulary without enumerating every combination or text-only variant. The references are IEEE Std 91-1984 / 91a-1991 distinctive-shape and rectangular notation, IEC 60617-12, and supporting IEEE 315 / IEC 60617-2/-3 schematic conventions. Usage would count distinct ChatDiagram users whose generated logic DSL uses each symbol, excluding victor@mymap.ai; ChatDiagram usage has not been counted yet and every usageUsers value remains null.

All drawings copy the accepted logic/ansi exemplar scale, colors, font and weights. A 3-unit bus stroke is the only added weight, needed to distinguish a bus from a single signal. IEC function qualifiers and meaningful pin labels are used where required; ANSI gates carry no gate names. The Engine column describes actual DSL/parser/renderer support. Manifest `engine` fields name entries in the ANSI gate catalog; null means the library sample has no matching catalog entry, including IEC and contextual marks. Yes does not certify every engine layout, and unknown names that render as ? do not count as support. Gate names are case-insensitive; arguments bind by position and named argument names are discarded.

The six accepted seed drawings retain their ids: ansi-and → and, ansi-or → or, ansi-xor → xor, ansi-inverter → not, ansi-nor → nor, and junction-dot → junction. The tables describe their references and engine support. Identical contextual drawings are merged: output-negation-bubble into ansi-nand, three-state-output-marker into iec-three-state-gate, rising-edge-marker into edge-triggered-storage, and complementary-output-terminal into level-sensitive-storage. Each merged id is also stated in the retained symbol notes.

Sources: [IEEE merged-edition preview](https://www.elecenghub.com/NewSamples/IEEE/114782866/IEEE-91-1984-IEEE-91a-1991-1.pdf), [TI logic-symbol explanation](https://www.ti.com/lit/ml/sdyz001a/sdyz001a.pdf), and [JIS C 0617-12:2011 with IEC figures](https://kikakurui.com/c0/C0617-12-2011-01.html). The IEEE preview contains introductory material, not the full symbol tables. Every draft reference labeled "clause not verified" remains qualified here, even when a TI or JIS figure corroborates the shape. Array simplification, isolation, bidirectional-switch and display constructions were checked against the IEC figures reproduced in JIS, while their exact IEEE clauses remain unverified. Array simplification omits repeated subdivisions and qualifiers while retaining the repeated element outline; no ellipsis is asserted as an IEEE mark. "Drawn" records completion of the artwork, not verification of every cited clause.

## Tier 1

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [ANSI AND](and.svg) (`and`) | `AND(A,B,…)` | IEEE Std 91-1984 §5.1; specific symbol clause not verified | Yes | Drawn |
| [ANSI OR](or.svg) (`or`) | `OR(A,B,…)` | IEEE Std 91-1984 §5.1; specific symbol clause not verified | Yes | Drawn |
| [ANSI XOR](xor.svg) (`xor`) | `XOR(A,B,…)` | IEEE Std 91-1984 §5.1; specific symbol clause not verified | Yes | Drawn |
| [ANSI buffer](ansi-buffer.svg) (`ansi-buffer`) | `BUF(A)` | IEEE Std 91-1984 §5.1; specific symbol clause not verified | Yes | Drawn |
| [ANSI inverter](not.svg) (`not`) | `NOT(A)` | IEEE Std 91-1984 §§3.1, 5.1 | Yes | Drawn |
| [ANSI NAND gate / output negation](ansi-nand.svg) (`ansi-nand`); includes `output-negation-bubble` | `NAND(A,B,…)` | IEEE Std 91-1984 §§3.1, 5.1 | Yes | Drawn |
| [ANSI NOR](nor.svg) (`nor`) | `NOR(A,B,…)` | IEEE Std 91-1984 §§3.1, 5.1 | Yes | Drawn |
| [ANSI XNOR gate](ansi-xnor.svg) (`ansi-xnor`) | `XNOR(A,B,…)` | IEEE Std 91-1984 §§3.1, 5.1 | Yes | Drawn |
| [IEC basic gate](iec-basic-gate.svg) (`iec-basic-gate`) | `logic [style: iec]`; `AND(A,B,…) / OR(A,B,…) / XOR(A,B,…) / BUF(A)` | IEEE Std 91-1984 §5.1; IEC 60617-12, specific clause not verified | Yes | Drawn |
| [IEC inverted gate](iec-inverted-gate.svg) (`iec-inverted-gate`) | `logic [style: iec]`; `NAND(A,B,…) / NOR(A,B,…) / XNOR(A,B,…) / NOT(A)` | IEEE Std 91-1984 §§3.1, 5.1; IEC 60617-12, specific clause not verified | Yes | Drawn |
| [Input negation bubble](input-negation-bubble.svg) (`input-negation-bubble`) | `AND(~A,B)` | IEEE Std 91-1984 §3.1 | Yes | Drawn |
| [Single-signal wire](signal-wire.svg) (`signal-wire`) | `gate argument references`; `output Y; Y <- G` | IEEE Std 91-1984 §2.1; IEEE 315 / IEC 60617-3 wiring, clause not verified | Yes | Drawn |
| [Connected junction](junction.svg) (`junction`) | `automatic net fan-out` | IEEE 315 / IEC 60617-3, clause not verified; repo §3.2 | Yes | Drawn |
| [Unconnected plain crossing](unconnected-plain-crossing.svg) (`unconnected-plain-crossing`) | — (not expressible) | IEEE 315 / IEC 60617-3, clause not verified; ANSI exemplar convention | No | Drawn |
| [Unconnected gap crossing](unconnected-gap-crossing.svg) (`unconnected-gap-crossing`) | `automatic crossing of different routed nets` | IEEE 315 / IEC 60617-3, clause not verified | Yes | Drawn |
| [External signal terminal](signal-terminal.svg) (`signal-terminal`) | `input A`; `output Y` | General logic diagram convention; IEEE/IEC clause not verified | Yes | Drawn |

## Tier 2

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [Controlled ANSI buffer](controlled-buffer.svg) (`controlled-buffer`) | `TRISTATE_BUF(A,EN)` | IEEE Std 91-1984 §5.2; specific symbol clause not verified | Yes | Drawn |
| [Controlled ANSI inverter](controlled-inverter.svg) (`controlled-inverter`) | `TRISTATE_INV(A,EN)` | IEEE Std 91-1984 §§3.1, 5.2; specific symbol clause not verified | Yes | Drawn |
| [IEC three-state gate / output marker](iec-three-state-gate.svg) (`iec-three-state-gate`); includes `three-state-output-marker` | `logic [style: iec]`; `TRISTATE_BUF(A,EN) / TRISTATE_INV(A,EN)` | IEEE Std 91-1984 §§3.3, 5.2; IEC 60617-12, clause not verified; TI Table 3 | Partial: three-state marker missing; inverted bubble is external | Drawn |
| [Open-drain output marker](open-drain-output-marker.svg) (`open-drain-output-marker`) | `OPEN_DRAIN(A)` | IEEE Std 91-1984 §3.3; specific symbol clause not verified; TI Table 3 | Wrong: ordinary controlled buffer without output marker | Drawn |
| [Hysteresis (Schmitt) marker](hysteresis-marker.svg) (`hysteresis-marker`) | `SCHMITT(A)` | IEEE Std 91-1984 §5.3, symbols 5.3-1 to 5.3-3 | Wrong: same geometry as BUF; hysteresis missing | Drawn |
| [Level-sensitive storage / complementary output](level-sensitive-storage.svg) (`level-sensitive-storage`); includes `complementary-output-terminal` | `LATCH_D(D,E)`; `LATCH_SR(S,R)`; `SRFF(S,R)` | IEEE Std 91-1984 §5.9 | Wrong: complementary output cannot be wired; SRFF is a latch | Drawn |
| [Edge-triggered storage / rising-edge marker](edge-triggered-storage.svg) (`edge-triggered-storage`); includes `rising-edge-marker` | `DFF(D,CLK)`; `JKFF(J,CLK,K)`; `TFF(T,CLK)` | IEEE Std 91-1984 §§3.1, 5.9 | Wrong: complementary output inaccessible; IEC dependency missing | Drawn |
| [Falling-edge clock marker](falling-edge-marker.svg) (`falling-edge-marker`) | `DFF(D,~CLK)`; `JKFF(J,~CLK,K)`; `TFF(T,~CLK)` | IEEE Std 91-1984 §3.1 | Yes | Drawn |
| [Asynchronous storage control](asynchronous-control-pin.svg) (`asynchronous-control-pin`) | — (not expressible) | IEEE Std 91-1984 §§3.3, 5.9 | No | Drawn |
| [Rectangular function block](rectangular-function-block.svg) (`rectangular-function-block`) | `MUX`; `DEMUX`; `DECODER`; `ENCODER`; `COUNTER`; `SHIFT_REG` | IEEE Std 91-1984 §§2.1, 5.4, 5.6, 5.7, 5.13, 5.14; coder symbol 5.4-1 | Wrong: generic inputs and a single output; functional pins missing | Drawn |
| [Bus line](bus-line.svg) (`bus-line`) | — (not expressible) | IEEE Std 91-1984 §6.2.2; IEC 60617-12, specific clause not verified; repo §3.3 | No | Drawn |
| [Bus width marker](bus-width-marker.svg) (`bus-width-marker`) | — (not expressible) | IEEE Std 91-1984 §6.1.9; specific graphic clause not verified; repo §3.3 | No | Drawn |
| [Single-bit bus breakout](bus-breakout.svg) (`bus-breakout`) | — (not expressible) | IEEE Std 91-1984 §6.2.2; IEC 60617-12, specific clause not verified | No | Drawn |
| [Signal-flow arrow](signal-flow-arrow.svg) (`signal-flow-arrow`) | — (not expressible) | IEEE Std 91-1984 §3.4 | No | Drawn |
| [Bidirectional signal flow](bidirectional-flow-marker.svg) (`bidirectional-flow-marker`) | — (not expressible) | IEEE Std 91-1984 §3.4 | No | Drawn |
| [Signal negation overbar](signal-negation-overbar.svg) (`signal-negation-overbar`) | `fixed Q̄ label on storage elements` | IEEE Std 91-1984 §3.1; general signal-label clause not verified | Yes, only the fixed storage label | Drawn |
| [Binary grouping bracket](binary-grouping-bracket.svg) (`binary-grouping-bracket`) | — (not expressible) | IEEE Std 91-1984 §3.3; specific symbol clause not verified; TI Table 3 | No | Drawn |
| [Dependency annotation](dependency-annotation.svg) (`dependency-annotation`) | — (not expressible) | IEEE Std 91-1984 §§4.2–4.4 | No | Drawn |
| [Complemented dependency annotation](dependency-negation-overbar.svg) (`dependency-negation-overbar`) | — (not expressible) | IEEE Std 91-1984 §4.3; specific subclause not verified | No | Drawn |
| [Fixed logic-state output](fixed-state-output.svg) (`fixed-state-output`) | — (not expressible) | IEEE Std 91-1984 §3.3; specific symbol clause not verified | No | Drawn |
| [Power rail terminal](power-rail-terminal.svg) (`power-rail-terminal`) | — (not expressible) | IEEE 315 / IEC 60617-2, clause not verified; repo §3.5; supporting schematic convention | No | Drawn |
| [Ground terminal](ground-terminal.svg) (`ground-terminal`) | — (not expressible) | IEEE 315 / IEC 60617-2, clause not verified; repo §3.5 | No | Drawn |

## Tier 3

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [Logic-polarity wedge](logic-polarity-marker.svg) (`logic-polarity-marker`) | — (not expressible) | IEEE Std 91-1984 §3.1 | No | Drawn |
| [Polarity and dynamic input](polarity-dynamic-input.svg) (`polarity-dynamic-input`) | — (not expressible) | IEEE Std 91-1984 §3.1 | No | Drawn |
| [Input special-amplification marker](input-amplification-marker.svg) (`input-amplification-marker`) | — (not expressible) | IEEE Std 91a-1991 symbol 3.3-9.5; IEC 12-09-08B illustrated in JIS C 0617-12:2011 p.48 | No | Drawn |
| [Output special-amplification marker](output-amplification-marker.svg) (`output-amplification-marker`) | — (not expressible) | IEEE Std 91-1984 §§3.3, 5.2; specific symbol clause not verified | No | Drawn |
| [Open-source output marker](open-source-output-marker.svg) (`open-source-output-marker`) | — (not expressible) | IEEE Std 91-1984 §3.3; specific symbol clause not verified; TI Table 3 | No | Drawn |
| [Passive pull-up output marker](passive-pullup-output-marker.svg) (`passive-pullup-output-marker`) | — (not expressible) | IEEE Std 91-1984 §3.3; specific symbol clause not verified; TI Table 3 | No | Drawn |
| [Passive pull-down output marker](passive-pulldown-output-marker.svg) (`passive-pulldown-output-marker`) | — (not expressible) | IEEE Std 91-1984 §3.3; specific symbol clause not verified; TI Table 3 | No | Drawn |
| [Postponed output marker](postponed-output-marker.svg) (`postponed-output-marker`) | — (not expressible) | IEEE Std 91-1984 §§3.3, 5.10 | No | Drawn |
| [Input line grouping](input-line-grouping.svg) (`input-line-grouping`) | — (not expressible) | IEEE Std 91-1984 §3.3; specific symbol clause not verified; TI Table 3 | No | Drawn |
| [Shift-direction marker](shift-direction-marker.svg) (`shift-direction-marker`) | — (not expressible) | IEEE Std 91-1984 §§3.3, 5.13 | No | Drawn |
| [Power-up state qualifier](initial-state-qualifier.svg) (`initial-state-qualifier`) | — (not expressible) | IEEE Std 91-1984 §§5.9–5.10; specific clause not verified | No | Drawn |
| [Common-control outline](common-control-outline.svg) (`common-control-outline`) | — (not expressible) | IEEE Std 91-1984 §2.3; TI Figure 2 | No | Drawn |
| [Common-output boundary](common-output-boundary.svg) (`common-output-boundary`) | — (not expressible) | IEEE Std 91-1984 §2.3; TI Figure 3 | No | Drawn |
| [Element array outline](element-array-outline.svg) (`element-array-outline`) | — (not expressible) | IEEE Std 91-1984 §2.3 | No | Drawn |
| [Embedded element outline](embedded-element-outline.svg) (`embedded-element-outline`) | — (not expressible) | IEEE Std 91-1984 §2.3 | No | Drawn |
| [Array omission marker](array-omission-marker.svg) (`array-omission-marker`) | — (not expressible) | IEEE Std 91-1984 §2.3.1.2; specific graphic clause not verified | No | Drawn |
| [Internal connection](internal-connection-marker.svg) (`internal-connection-marker`) | — (not expressible) | IEEE Std 91-1984 §3.2; TI Table 2 | No | Drawn |
| [Negated internal connection](internal-negation-marker.svg) (`internal-negation-marker`) | — (not expressible) | IEEE Std 91-1984 §3.2; TI Table 2 | No | Drawn |
| [Dynamic internal connection](internal-dynamic-marker.svg) (`internal-dynamic-marker`) | — (not expressible) | IEEE Std 91-1984 §3.2; TI Table 2 | No | Drawn |
| [Virtual input](virtual-input-marker.svg) (`virtual-input-marker`) | — (not expressible) | IEEE Std 91-1984 §3.2; TI Table 2 | No | Drawn |
| [Virtual output](virtual-output-marker.svg) (`virtual-output-marker`) | — (not expressible) | IEEE Std 91-1984 §3.2; TI Table 2 | No | Drawn |
| [Subsidiary / nonlogic connection](nonlogic-connection-marker.svg) (`nonlogic-connection-marker`) | — (not expressible) | IEEE Std 91-1984 §3.4 | No | Drawn |
| [Analog signal qualifier](analog-signal-marker.svg) (`analog-signal-marker`) | — (not expressible) | IEEE Std 91-1984 §3.4; specific symbol clause not verified; TI Table 2 | No | Drawn |
| [Digital signal qualifier](digital-signal-marker.svg) (`digital-signal-marker`) | — (not expressible) | IEEE Std 91-1984 §3.4; specific symbol clause not verified; TI Table 2 | No | Drawn |
| [Electrical-isolation separator](electrical-isolation-marker.svg) (`electrical-isolation-marker`) | — (not expressible) | IEEE Std 91-1984 §5.5; specific symbol clause not verified; IEC 60617-12 signal-level converter, JIS C 0617-12:2011 p.177 | No | Drawn |
| [Bidirectional transmission gate](transmission-gate.svg) (`transmission-gate`) | — (not expressible) | IEEE Std 91-1984 §5.2; specific symbol clause not verified; IEC 12-29-09, JIS C 0617-12:2011 p.158 | No | Drawn |
| [Monostable pulse qualifier](monostable-pulse-marker.svg) (`monostable-pulse-marker`) | — (not expressible) | IEEE Std 91-1984 §5.11; specific symbol clause not verified; TI Table 1 | No | Drawn |
| [Retriggerable monostable qualifier](retriggerable-pulse-marker.svg) (`retriggerable-pulse-marker`) | — (not expressible) | IEEE Std 91-1984 §5.11; specific symbol clause not verified; TI Table 1 | No | Drawn |
| [Astable waveform qualifier](astable-waveform-marker.svg) (`astable-waveform-marker`) | — (not expressible) | IEEE Std 91-1984 §5.12; specific symbol clause not verified; TI Table 1 | No | Drawn |
| [Binary delay qualifier](binary-delay-marker.svg) (`binary-delay-marker`) | — (not expressible) | IEEE Std 91-1984 §5.8; specific symbol clause not verified; IEC 12-40-01 illustrated in JIS C 0617-12:2011 p.211 | No | Drawn |
| [Display segment element](display-segment-symbol.svg) (`display-segment-symbol`) | — (not expressible) | IEEE Std 91-1984 §5.15; specific symbol clause not verified; IEC 12-53-02, JIS C 0617-12:2011 p.290 | No | Drawn |
| [Internal data path](internal-data-path.svg) (`internal-data-path`) | — (not expressible) | IEEE Std 91-1984 §6.2.2; IEC data-path illustration A00318 in JIS C 0617-12:2011 p.404 | No | Drawn |
| [Nonstandard annotation brackets](nonstandard-annotation-brackets.svg) (`nonstandard-annotation-brackets`) | — (not expressible) | IEEE/IEC symbol-construction convention; clause not verified; TI explanatory text | No | Drawn |
| [Subcircuit enclosure](subcircuit-enclosure.svg) (`subcircuit-enclosure`) | `module "Label" { … }` | Schematex grouping convention; not IEEE Std 91-1984 §2.3 common control or array | Yes | Drawn |
| [Off-page signal connector](off-page-connector.svg) (`off-page-connector`) | — (not expressible) | General schematic convention; IEEE 315 / IEC 60617-3, specific clause not verified | No | Drawn |
| [Explicit no-connect terminal](no-connect-marker.svg) (`no-connect-marker`) | — (not expressible) | General schematic convention; IEEE/IEC clause not verified | No | Drawn |

## Engine gaps

- **Independent and multiple outputs.** The DSL references only a gate’s first output. Complementary Q, decoder outputs, counter bits and shift-register serial outputs cannot be independently connected; G.Qn becomes another input signal rather than a reference to G’s complementary output.
- **Complete storage controls.** There are no asynchronous preset/clear pins, separate clock/control dependencies, or clocked SR flip-flops. Extra positional arguments do not create new pins.
- **Buses and bit taps.** There are no heavy buses, width slashes, bit breakouts or binary grouping brackets. The documented ~> syntax has no parser implementation, and width/mode attributes have no corresponding AST representation.
- **Electrical output qualifiers.** Three-state, open-drain, open-source and internal passive pull-up/pull-down marks cannot be composed with an output. Existing TRISTATE_* and OPEN_DRAIN names do not provide those independent qualifiers.
- **Hysteresis.** SCHMITT draws as an ordinary buffer. Neither a genuine Schmitt trace nor hysteresis on a selected gate input can be expressed.
- **Function-block interfaces and dependencies.** Select, enable, address, clock and data relationships cannot be configured. Standard register, arithmetic and memory interfaces need actual pin relationships, not merely a function name.
- **Polarity and signal flow.** Only circular negation is supported; polarity wedges, reverse flow and bidirectional interfaces are missing, limiting mixed-polarity and shared-data-bus diagrams.
- **Common control, common output and internal connections.** Shared-control outlines, double output boundaries, element arrays and virtual connections are absent. A dashed module enclosure has none of these logical meanings.
- **Fixed states and special timing.** Logic constants, power-up states, postponed outputs, delays, monostable and astable qualifiers cannot be expressed.
- **Nonlogic and isolated interfaces.** Subsidiary connections, analog/digital qualifiers and electrical-isolation marks are absent, leaving logic-to-external-circuit interfaces incomplete.
- **Cross-sheet and terminal vocabulary.** Power, ground, off-page connectors and explicit no-connect marks have no DSL expression. These are supporting schematic conventions whose exact standard clauses remain unverified.
