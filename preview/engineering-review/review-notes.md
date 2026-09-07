# Logic-only visual review

Only the Logic changes from the engineering review are retained. Circuit, P&ID, Breadboard and Floorplan source, tests and public documentation are restored to the main-branch baseline (5009338). The linked-view experiment and non-Logic candidate assets are removed. Existing 1.0.14 released features are untouched.

## Retained

- Gate-body/caption obstacle avoidance and orthogonal routes.
- Opaque theme-aware symbols, same-net junction dots and crossing clearance.
- Measured terminal labels, crowded gate input spacing, aligned outputs and separated rows.
- ANSI/IEC, renamed/reordered nets, active-low signals, long labels and 3/8/16-input regression coverage.
- Original full-adder source, eight truth-table combinations and all twelve connections.

The geometry router is local to Logic, not a new cross-engine abstraction. No example names or authored IDs choose a production route.

## Comparison

Verification: 199 test files / 2,959 tests passed, including 221 published SVG XML-conformance fixtures. Typecheck, ESM/CJS/declaration builds and the desktop/mobile browser check passed. Non-Logic engine source, tests and public docs have no diff against main. The AI content generator reproduces a pre-existing P&ID example drift in main; that unrelated generated change is excluded from this PR.

Left: actual 1.0.14 output at 5009338. Middle: manually authored SVG using the same gates, not renderer output. Right: actual candidate from the identical input, with its revision in after/results.json. The ideal remains second at every viewport.

Generate the candidate with `node_modules/.bin/vite-node scripts/generate-engineering-review-after.ts`, after building run `node scripts/verify-engineering-review.mjs`. The browser check verifies source/output identity, all three images, English-only copy, image enlargement, keyboard interaction and desktop/mobile overflow.

Related issue: #93, internal wires visible through Logic gate bodies. Circuit issues #92, #94 and #95, and P&ID/shared-view requests, are not resolved by this PR.

This is drawing behavior, not arbitrary Boolean simulation, electrical certification or a guarantee of globally optimal routing.
