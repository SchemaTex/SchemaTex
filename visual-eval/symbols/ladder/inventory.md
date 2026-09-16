# Ladder symbol inventory

This lists the ladder-logic symbol library in the accepted ladder exemplar's style. Tier 1 contains the rails, links, contacts and coils needed for a basic ladder network. Tier 2 covers other everyday IEC symbols and common Allen-Bradley display conventions. Tier 3 covers the remaining execution-control, connection and editor-state vocabulary; these vendor editor adornments are not all IEC requirements. ChatDiagram usage has not been counted yet. Usage would mean distinct users whose production diagrams contain each symbol during a stated period, excluding victor@mymap.ai; automatically generated rails and links would need structural counting rather than keyword matching. Every manifest entry therefore has `usageUsers: null`.

Standards cited: **IEC 61131-3:2013**, especially §8.2 and the common graphical rules in §8.1 and §6.6.1.4, plus separately identified **Allen-Bradley / Rockwell** conventions. The [IEC preview](https://cdn.standards.iteh.ai/samples/16899/c7907e9a7e624f2185ff1f8d94e93f9f/IEC-61131-3-2013.pdf) does not include the full symbol tables; the [Siemens IEC compliance manual](https://cache.industry.siemens.com/dl/files/748/109476748/att_845621/v1/IEC_61131_compliance_en_US.pdf), pages 42–44, reproduces the contact and control forms. References inherited from the draft are not claims of independent clause verification. Every draft qualification **“clause not verified”** is retained, including NEMA attributions and vendor display conventions. The existing exemplar supersedes the draft's obsolete claim that it does not exist.

“Engine” describes the actual parser/renderer capability, not a symbol catalog id: ladder has no engine catalog, so `engine` is null for every entry and the supplied sheet says “engine: none” even for supported symbols. “Drawn” means an SVG is present, including the six unchanged accepted seeds; it does not claim engine support or independent verification of every cited clause. DSL names identify accepted inputs even where they render a different glyph. A dash means the requested glyph has no DSL representation.


## Tier 1

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [Left power rail](left-power-rail.svg) | `ladder` (automatic) | IEC 61131-3:2013 §8.2.2, Table 74 — left power rail | Yes; automatic | Drawn |
| [Right power rail](right-power-rail.svg) | `ladder` (automatic) | IEC 61131-3:2013 §8.2.2, Table 74 — right power rail | Yes; automatic | Drawn |
| [Horizontal rung / series link](horizontal-link.svg) | `rung N:` (automatic) | IEC 61131-3:2013 §8.2.3, Table 74 — horizontal link | Yes; automatic | Drawn |
| [Parallel split and merge](vertical-link.svg) | `parallel:` with each path under `branch:` | IEC 61131-3:2013 §8.2.3, Table 74 — vertical link | Yes; branch wrappers required | Drawn |
| [Normally open contact (XIC)](normally-open-contact.svg) | `XIC(tag)` | IEC 61131-3:2013 §8.2.4, Table 75 no. 1 — normally open contact | Yes | Drawn |
| [Normally closed contact (XIO)](normally-closed-contact.svg) | `XIO(tag)` | IEC 61131-3:2013 §8.2.4, Table 75 no. 2 — normally closed contact | Yes | Drawn |
| [Output coil (OTE)](output-coil.svg) | `OTE(tag)` | IEC 61131-3:2013 §8.2.5, Table 76 no. 1 — coil | Yes | Drawn |

## Tier 2

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [Negated coil (OTN)](negated-coil.svg) | `OTN(tag)` | IEC 61131-3:2013 §8.2.5, Table 76 — negated coil | Yes | Drawn |
| [IEC set coil (S)](set-coil.svg) | `OTL(tag)` | IEC 61131-3:2013 §8.2.5, Table 76 — set coil | No S glyph: OTL draws L | Drawn |
| [IEC reset coil (R)](reset-coil.svg) | `OTU(tag)`, `RES(tag)` | IEC 61131-3:2013 §8.2.5, Table 76 — reset coil | No R glyph: OTU draws U; RES uses brackets | Drawn |
| [Positive-transition contact (P)](positive-transition-contact.svg) | `ONS(tag)` | IEC 61131-3:2013 §8.2.4, Table 75 — positive-transition contact; vendor arrow form clause not verified | No P glyph: ONS uses brackets | Drawn |
| [Negative-transition contact (N)](negative-transition-contact.svg) | `OSF(tag)` | IEC 61131-3:2013 §8.2.4, Table 75 — negative-transition contact; vendor arrow form clause not verified | Yes | Drawn |
| [Comparison contact](comparison-contact.svg) | `EQU`, `NEQ`, `GRT`, `LES`, `GEQ`, `LEQ` (e.g. `GEQ(value, IN1=A, IN2=B)`) | IEC 61131-3:2013 §8.2.4, Table 75 nos. 5a–5b — typed / overloaded compare contact; typed/overloaded merged | Yes | Drawn |
| [Rectangular instruction body](instruction-block.svg) | `TON`, `TOFF`, `TP`, `CTU`, `CTD`, `CTUD`, `ADD`, `SUB`, `MUL`, `DIV`, `MOV` | IEC 61131-3:2013 §8.2.6 and §6.6.1.4.3 — rectangular body; Allen-Bradley operand-row presentation | Yes: ruled header and parameter rows; no named pins | Drawn |
| [IEC block input / output pins](block-terminal.svg) | — (not expressible) | IEC 61131-3:2013 §8.2.6 and §6.6.1.4.3 — block terminals, EN / ENO | No | Drawn |
| [Boolean pin negation](pin-negation.svg) | — (not expressible) | IEC 61131-3:2013 §6.6.1.4.3 rule 9 — negated Boolean terminal | No | Drawn |
| [Edge-sensitive input pin](edge-sensitive-pin.svg) | — (not expressible) | IEC 61131-3 standard function-block diagrams — edge-sensitive input; clause not verified | No | Drawn |
| [Latch coil (OTL)](ab-latch-coil.svg) | `OTL(tag)` | Allen-Bradley Logix OTL; IEC 61131-3 §8.2.5 Table 76 no. 3 is the equivalent set coil (S); NEMA clause not verified | Yes | Drawn |
| [Allen-Bradley unlatch coil (U)](ab-unlatch-coil.svg) | `OTU(tag)` | Allen-Bradley Logix OTU; NEMA clause not verified | Yes | Drawn |
| [Allen-Bradley inline instruction (retained ab-one-shot; merged ab-inline-instruction)](ab-one-shot.svg) | `ONS(tag)`, `RES(tag)` | Rockwell ONS ladder figure; RES clause not verified | Yes | Drawn |
| [Allen-Bradley block status terminal](ab-status-terminal.svg) | — (not expressible) | Allen-Bradley timer / counter status-terminal convention; clause not verified | No | Drawn |
| [Energized / true highlight](energized-overlay.svg) | — (not expressible) | Rockwell online-monitoring convention, clause not verified; IEC 61131-3:2013 §8.2.3 defines state, not highlight colour | No | Drawn |
| [Rung number](rung-number.svg) | `rung N:` | US ladder-editor numbering convention; clause not verified | Yes; automatic | Drawn |
| [Tag, address and description](element-annotation.svg) | First argument `tag`; `address=`, `name=` on contact/coil | IEC 61131-3:2013 §8.1.2 — graphical variable representation; US addressing convention clause not verified | Yes | Drawn |
| [Rung comment](rung-comment.svg) | `rung N "comment":` | IEC 61131-3:2013 §8.1.1 — network comments; US rung-comment convention clause not verified | Yes | Drawn |
| [Accepted TON block with status terminals](timer-on-delay-block.svg) | `TON(timer, PRE=3000, ACC=0)` | IEC §8.2.6 body; Rockwell TON status convention, clause not verified | Partial: ruled header and parameter rows; no EN/DN status terminals | Drawn |

**Notes for retained `ab-one-shot`:** Merged id `ab-inline-instruction`. ONS and RES share the same bracket outline and differ only in mnemonic, so there is no duplicate SVG; the accepted seed drawing is preserved. The `ab-label-marker` uses the same bracket parts in a different relationship: at the left rail, before the next contact. The `routine-end-marker` uses them on a dedicated final rung whose rails end below it. The generic `instruction-block` records the rectangular body family; `timer-on-delay-block` is the retained composite example with two status terminals.

## Tier 3

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [Positive-transition coil (P)](positive-transition-coil.svg) | — (not expressible) | IEC 61131-3:2013 §8.2.5, Table 76 — positive-transition coil | No | Drawn |
| [Negative-transition coil (N)](negative-transition-coil.svg) | — (not expressible) | IEC 61131-3:2013 §8.2.5, Table 76 — negative-transition coil | No | Drawn |
| [IEC jump terminal](jump-terminal.svg) | — (not expressible) | IEC 61131-3:2013 §8.1.6, Table 73 — jump | No | Drawn |
| [IEC jump target / network label](network-label.svg) | — (not expressible) | IEC 61131-3:2013 §8.1.4 and Table 73 — network label | No | Drawn |
| [IEC return terminal](return-terminal.svg) | — (not expressible) | IEC 61131-3:2013 §8.1.6, Table 73 — RETURN | No | Drawn |
| [Named connection continuation](connection-continuation.svg) | — (not expressible) | IEC 61131-3:2013 §8.1.3 — named connections; specific glyph clause not verified | No | Drawn |
| [Connected four-way crossing](connected-crossing.svg) | — (not expressible) | IEC 61131-3:2013 §8.1.3 — connection relationships; specific glyph clause not verified | No | Drawn |
| [Unconnected crossing](unconnected-crossing.svg) | — (not expressible) | IEC 61131-3:2013 §8.1.3 — connection relationships; specific glyph clause not verified | No | Drawn |
| [VAR_IN_OUT terminal pair](in-out-terminal-pair.svg) | — (not expressible) | IEC 61131-3:2013 §6.6.1.4, Figure 10 — VAR_IN_OUT pair | No | Drawn |
| [Allen-Bradley jump marker (JMP)](ab-jump-marker.svg) | — (not expressible) | Allen-Bradley JMP convention; clause not verified | No | Drawn |
| [Allen-Bradley label marker (LBL)](ab-label-marker.svg) | — (not expressible) | Allen-Bradley LBL convention; clause not verified | No | Drawn |
| [Routine end marker](routine-end-marker.svg) | — (not expressible) | Rockwell ladder-editor END convention; clause not verified | No | Drawn |
| [Forced I/O indicator](forced-io-overlay.svg) | — (not expressible) | Rockwell online-monitoring forced-I/O convention; clause not verified | No | Drawn |
| [Online edit rung margin marker](online-edit-marker.svg) | — (not expressible) | Rockwell online-editing convention; clause not verified | No | Drawn |

The reviewed [contact sheet](contact-sheet.png) contains all 40 drawings in three columns at exactly 2× exemplar scale. The supplied scratch renderer was also run as requested, but its fixed 520-pixel cells clip the accepted timer and overlap wide blocks. This additional sheet only widens the columns and moves catalog captions to the header; the symbol SVGs are unchanged. The six seed SVG hashes match the original files, and 37 new DSL examples or contextualized fragments pass the current ladder parser.

## Engine gaps

- **Independent block pins and pin-to-pin connections.** Blocks have a ruled mnemonic header, parameter rows and two unnamed inline leads. They cannot represent timer IN/PT/Q/ET pins, multiple counter inputs/outputs, or EN/ENO. This is the largest gap for complete industrial logic; parameter text does not establish a connection.
- **Pin negation, edge-sensitive inputs and VAR_IN_OUT pairs.** The engine cannot draw the external negation circle, input triangle or shared through-block variable mark. These change how inputs are handled and cannot be replaced by labels.
- **Jump, network label and return.** There are no corresponding AST or DSL elements. JMP and LBL mentioned in reference material are actually rejected by the parser.
- **Positive- and negative-transition coils.** The engine has no P or N coil. ONS draws a bracketed inline instruction; OSF draws an N contact.
- **Connection continuation and explicit crossing relationships.** Named continuations, four-way junctions and unconnected crossings cannot be specified. Complex networks remain limited to automatically generated series/parallel structures.
- **Unselectable coil/contact forms and block status terminals.** IEC S/R coils and the P contact have no DSL selection. OTL/OTU draw L/U coils, ONS/RES use brackets, and OSF draws an N contact. EN/DN/TT block status terminals and JMP/LBL forms are unavailable.
- **Runtime and edit-state overlays.** The engine has no energized highlight, forced-I/O marker, online-edit margin state or routine-end marker. The monochrome grey highlight and ink force triangle in this library preserve the exemplar palette; they do not prescribe Rockwell's configurable display colours.
