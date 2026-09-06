# Engineering visual review — 2026-09-06 PT

This preview now includes a local implementation candidate on `codex/engineering-visual-correctness`. The baseline files remain unchanged; `after/` contains actual renders of the same source. No npm release or production deployment has been performed.

## Implementation audit

Final validation: 199 test files / 2,976 tests passed, including all 221 published SVG XML-conformance fixtures. Typecheck and ESM/CJS/declaration builds passed. ESLint exited successfully with zero errors and 1,664 warnings (including non-null assertion warnings; this is not a warning-free change). The 13 candidate files match direct renderer output; browser selection, stale-binding, keyboard, modal, English-only, ideal-second and desktop/mobile overflow checks passed.

- Implemented: Logic obstacle routing, opaque symbols, same-net junctions, crossing clearance, measured terminal labels and pin-spacing-driven gate height; Breadboard DIP geometry/numbering/leads, title/alias translation, neutral styling and two-terminal span transforms; Floorplan external electrical labels, two-stroke US duplex glyph and authored ID exposure.
- Not implemented: powered op-amp grammar repair; P&ID package membership/service presentation; electrical connectivity/ERC for breadboards; arbitrary DIP rotation; persistent shared-document state.
- Regression strategy: preserve the 13 original fixtures, compare the candidate against those exact sources, retain invalid/partial statuses, test renamed/reordered logic and 3/8/16-input gates, DIP-8/14/16/28, reversed/vertical/diagonal spans, all four fixture wall orientations, and all supported themes in Logic.
- Browser checks: ideal remains second, English-only page, desktop/mobile overflow, both-view selection, keyboard, layer visibility, stale-binding rejection and image dialog.
- The earlier two-pitch Breadboard ideal was incorrect. The replacement uses three pitches, consistent with the supported 0.3-inch DIP footprint. The numbered lead model and resolved-hole table are authoritative; generated images are not a netlist or engineering certification.

The remaining sections document the earlier research/proposal stage, not additional shipped capabilities.

## Evidence and limits

Baseline: SchemaTex 1.0.14, repository commit `5009338`, rebuilt locally. Thirteen sources were replayed. Results: ten valid, two partial, one invalid. These are parser/renderer statuses, not a quality score or a random production sample.

The previous 165 users / 253 electrical quotes describe a use-case signal, not a failure rate. UserSay quotes can be duplicated across extracted signals; they must not be treated as independent complaints. User metrics exclude the owner account.

The three original production artifacts below were read from ChatDiagram in a read-only transaction. Their relationship to particular UserSay sessions was not assumed. Preview copies contain generic electronic circuits, no user email/name. The HC32 title alone was translated from Japanese to English; its electrical DSL was preserved.

| Source | Provenance | Current replay | Interpretation |
|---|---|---|---|
| `user-opamp.sx` | Artifact `private reference omitted`, 2026-08-03 PT | partial | Disconnected feedback; five positional op-amp nets exceed the supported three-pin symbol contract. |
| `user-555.sx` | Artifact `private reference omitted`, 2026-08-03 PT | partial | Unknown ic555 and several floating nets. Do not silently infer the bin sensor/relay wiring. |
| `user-hc32.sx` | Artifact `private reference omitted`, 2026-06-30 PT | invalid | Bare `dip 14` sets a value, not pins=14. Default eight-pin footprint cannot resolve pin14. |
| `logic.sx` | Published `logic-full-adder`; GitHub #93 | valid | Wire paths visibly pass through transparent gate bodies. |
| `pullup.sx` | Published example named in GitHub #94 | valid | Retain for visual regression; earlier label-placement work already exists. |
| `transistor.sx` | Published common-emitter example named in #92 | valid | Small routing baseline. |
| `opamp-example.sx` | Published inverting op-amp named in #95 | valid | Opaque body already exists; explicit supply-pin semantics remain separate. |
| `sld.sx` | Published consumer unit named in #96 | valid | Seven feeders including EV; retain exact source for routing regression. |
| `arduino.sx` | Published blink example | valid | LED anode at 10e is not in the same contact strip as resistor endpoint 9e; endpoint existence alone is insufficient. |
| `pid.sx` | Existing issue-113 water-treatment reproduction | valid | Symbols/ports/actuator shipped; package and service style follow-ups remain. |
| `breadboard.sx` | Minimal reconstruction from TL072 UserSay report | valid | Reproduces pin marker / pin coordinates / row-spacing mismatch. Not the user's original DSL. |
| `floorplan.sx`, `linked-sld.sx` | Minimal workflow reconstruction of #99 | valid | Both views render; no public shared-selection contract. Not the reporter's house. |

## UserSay source messages

- 2026-08-24 PT, session `private reference omitted`: “Yes the Diagram has put pin 8 on 15f, while putting counter clock wise it should be at 15e”; “whole top side flipped”. The surrounding conversation specifies TL072, horizontal placement on rows e/f starting at column 15.
- 2026-08-20 PT, session `private reference omitted`: user explains that pins 1–4 should occupy 15f–18f while pins 8–5 occupy 15e–18e. This is an orientation-sensitive claim, not permission to reverse all packages blindly.
- 2026-09-02 PT, session `private reference omitted`: “The drawing is simply a straight line. Impossible to read on a page.” This predates the latest release and establishes readability demand, not proof of a current regression.
- 2026-08-14 PT, session `private reference omitted`: the user supplied an allowed gate list but the AI produced an unavailable `buf`. This is intent/available-parts enforcement, distinct from routing.
- 2026-07-25 PT, session `private reference omitted`: the user could not identify transistor part numbers in the output. This motivates preserving fields and their visible labels.
- 2026-08-14 PT, session `private reference omitted`: user describes cleaning overlapping lines in a generator/ATS/solar-inverter switchboard drawing.

## Structure, with concrete ownership

### Circuit / Logic

1. Live component catalog defines exact pins, their roles, optional/required connections and symbol bounds. Generation prompts, parser validation, layout ports and visible labels consume that same definition.
2. Preserve an electrical net graph separately from geometric wire segments. A bend is not a junction. A crossing is not a connection. Intentional no-connect is explicit.
3. Domain layout produces symbol positions and legal port departure directions. Reusable geometry operates on obstacles and candidate label bounds. Reuse only where at least two engines need the same primitive; do not build a speculative universal solver.
4. Route around obstacles, then score label/route interactions together. A label scoring pass in isolation cannot repair an edge through a symbol.
5. Theme-aware opaque fills prevent show-through, but cannot conceal a true unrelated route through a component: routing must still be corrected.
6. A broken user netlist remains partial/invalid until the intent is resolved. The LM741 generated reference proposes a conventional non-inverting circuit; it is not a same-input correction or validated circuit simulation.

### P&ID

Package: ID + label + explicit member IDs. Compute frame bounds from layout members plus padding; reserve label space; draw behind equipment. Do not infer ownership from labels such as “SKID” or from proximity. Initially reject unsupported nesting/overlap explicitly.

Service: semantic identity separate from engineering line type. Start with text labels, color and width in a drawing-level mapping. Any dash/pattern choices need checks against existing signal conventions so a chemical process line cannot be mistaken for a pneumatic signal. The generated reference's legend is illustrative, not an endorsed standard.

Reuse relevant existing Network/UML grouping primitives only after reviewing their assumptions. Do not import their graph layout wholesale into process equipment placement.

### Floorplan + SLD

Start with document entities and a scene-reference index, not a combined DSL for every engine. Entity identity persists across label edits; each view owns its geometry. Host manages selection and layer visibility. Circuit membership determines selection sets. Missing references are reported, not joined by matching text.

One circuit may contain multiple outlets and each outlet may appear in multiple views. Layer visibility changes presentation only. Hiding control lines must not delete electrical relationships. Print/export should respect selected visibility while retaining metadata.

### Breadboard

Current source evidence: `parts.ts` generates DIP pin 1 at local y=0 and pin 8 at y=3*pitch, while the rendered pin-1 dot is near the bottom. `layout.ts` maps e/f distance to 2*pitch. With anchor 15e, pin 8 lands at 15g. This is a physical footprint inconsistency, not a label placement issue.

The footprint must own pin-number positions, marker position, body bounds and one explicit orientation transform. A board model owns hole/contact groups and rail segmentation. Physical-net validation then joins contact groups through explicit wires and conductive components as appropriate; a resistor must not be treated as a zero-ohm short.

Do not assume every full board has the same rail segmentation: expose a supported board profile and validate against that actual profile. Produce a mapping table from resolved geometry, not independently authored prose.

## Regression criteria before an actual after

- Save immutable original DSL alongside explicitly corrected-intent variants.
- Rename IDs, reorder declarations and lengthen labels; domain relations must be invariant.
- Add/remove branches around motif thresholds; no whole-layout collapse or component loss.
- Sparse/dense/feedback/multi-source cases; intentional open pins versus accidental missing connections.
- Light/dark/grayscale, desktop/mobile/print viewport. Compute minimum projected text size using the intended view bounds.
- DIP-8/DIP-14, both orientations, half/full board profiles, broken rails and missing jumpers.
- Logic: check all eight full-adder input combinations against Sum=(A+B+Cin)%2, Cout=floor((A+B+Cin)/2), then separately verify render geometry. A correct equation alone does not validate its SVG.

## External primary references

- [TI TL07xx datasheet](https://www.ti.com/lit/ds/symlink/tl072h.pdf): TL072 pin functions, especially V−=4 and V+=8. A notch-left top view determines the concrete board-hole ordering used here.
- [TI LM555 datasheet](https://www.ti.com/lit/ds/symlink/lm555.pdf): exact pin naming and astable topology for future 555 fixtures.
- [SparkFun breadboard guide](https://learn.sparkfun.com/tutorials/how-to-use-a-breadboard): terminal strips and rail segmentation.
- [KiCad schematic capture](https://www.kicad.org/discover/schematic-capture/): electrical rule checks distinguish connectivity problems from drawing appearance.

## ImageGen review policy

Built-in image generation was used. Prompts and iterative edits are saved in `imagegen-prompts.json`. The first logic and op-amp images had incorrect connections; first P&ID drafts mixed or disconnected service routes. They are not acceptance references. Selected images and remaining limitations are documented beside each image in the preview.

Generated imagery sets composition and readability expectations. Exact domain correctness must come from the semantic contract, deterministic geometry and tests. No ImageGen image is labelled as SchemaTex renderer output.

## Preview verification

Verified locally on 2026-09-06 PT using Chrome and agent-browser. All 18 displayed diagram images loaded, all five ideal references occupy the second comparison position, and no runtime page errors were observed. Desktop (1536 px) and mobile (390 px) had no document-level horizontal overflow. Image enlargement and Escape-to-close passed. All eight full-adder input combinations matched the expected Sum/Cout equations; this validates the written equations only, not generated raster wiring. The engine build passed; this preview makes no engine-source changes.

Initial references were ImageGen images. After user feedback, the active references are `target-logic-native.svg`, `ideal-opamp-v3.png`, `target-pid-native.svg`, `ideal-linked.png`, and `target-breadboard-native.svg`. Earlier ImageGen drafts remain archived locally; they are not the style specification for Logic, P&ID or Breadboard.

## Feedback revision: smaller scope, faithful style

- **Full adder:** electrical connectivity is required. Same-name nets can legitimately replace drawn wire runs in schematic notation ([KiCad manual](https://docs.kicad.org/9.0/en/eeschema/eeschema.html)), but that shortcut does not prove better routing. The revised reference draws every signal, shows branch dots and non-connecting hops, and reuses current gate paths. The preview generator checks all gate ports and orthogonal wire segments. Its authored positions are a design composition, never production routing rules.
- **P&ID:** no new icon families are required for this fixture. Pumps, filter service ports, motor actuator and FIC already exist. The revised target reuses them and preserves eight process connections plus the instrument control connection. Keep service labels for grayscale; do not repurpose signal dash patterns. This is a package/layout/presentation task, not an icon redesign. Equipment IDs appear on symbols; four equipment descriptions are placed in a separate key to avoid overflowing symbols.
- **Linked outlets:** issue #99 remains one explicit request with no comments at this check, not evidence of broad demand. The current `SceneItem` type already has `semanticId`; Floorplan's `ItemGeom` carries `instanceId`, but its rendered scene keys are line-based and omit semanticId. SLD exposes `data-id` without equivalent scene collection. A narrow fix should expose existing identities consistently, then let the host own an explicit circuit-to-outlet map. Do not add a universal entity graph or new modelRef DSL before this existing path is exercised.
- **Working host experiment:** current SVGs are mounted inline and selected by source-derived bindings. Bindings are resolved from authored IDs, never equal labels. A SHA-256 of both exact sources rejects stale bindings. It supports circuit selection, either-view outlet selection and hiding the floorplan electrical overlay. It is local preview code, not a shipped API. No persistence, editing, arbitrary document import, cross-page reconciliation or automatic circuit inference is implemented.
- **Breadboard:** retain current beige board, rail colors, black IC body, hole grid and wire CSS. The native target reuses the actual substrate and DIP body, with proposed e/f coordinates, visible leads and pin numbers. Keep a readable mapping table outside the board image. Do not redesign Arduino, LEDs, resistors or the wider parts catalog just to resemble generated artwork. General footprint orientation/validation still requires a tested engine implementation.

Regeneration: `node node_modules/vite-node/vite-node.mjs scripts/generate-engineering-review-targets.ts` with Node 24. The generator lives outside engine source, asserts five-gate port coverage, eight process links, eight physical pin mappings and three host identity bindings. Its fixture-specific composition coordinates are deliberately not reusable engine code.

Feedback verification: `node scripts/verify-engineering-review.mjs` passed. All 13 current replay SVGs and statuses are byte-for-byte unchanged. Both circuit selectors, both-view outlet selection, keyboard activation, label-independent identity, layer hiding without selection loss, stale-source rejection, image dialog, English content, middle-reference order and desktop/mobile overflow checks passed. The SVG host demo needed explicit hit areas for thin schematic symbols and non-intercepting overlay labels; both are confined to preview code.
