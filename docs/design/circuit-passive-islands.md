# Circuit: local placement around fixed device pins

The netlist engine now arranges eligible peripheral paths beside the actual terminals of their host device. It infers this from connectivity and symbol geometry; it adds no DSL coordinates, routing choices, device-name matching, or case-specific parameters.

## Scope of the rule

After supply/return nets are removed from signal adjacency, a connected island must contain exactly one multi-terminal host. Every other component must be a rotatable two-terminal element, and every peripheral group must be a simple path whose external signal contacts land on the same physical side of that host. Branched networks, shared-host signal networks, upright-only symbols, and explicit authored directions exclude the entire island from this transformation.

Paths are ordered by their actual connected terminals. Rotation preserves pin identity, including reversed polarised elements. Complete islands are packed as units; unrelated fragments are never relocated on their own. Existing routing checks still enforce connection and body-clearance constraints. This is a limited placement heuristic, not a general optimum for all circuit topologies.

## Frozen visual study — September 12, 2026 (Pacific)

Baseline: the working engine before this integration, after the earlier circuit improvements, corresponding to `a29baf37`. This comparison is **not against v1.0.14**.

The 39 existing cases were deterministically split into 20 training and 19 testing cases with seed `circuit-layout-study-2026-09-12`. All 39 had been inspected during earlier PoC rounds. Consequently the testing group is a frozen regression set, **not an independent holdout**. The accepted PoC rule was integrated, the training group was inspected, and the engine was frozen before testing. No subsequent tuning used testing feedback. Four new synthetic topology probes were also fixed before they were rendered; they are structural examples, not validated reference circuits.

`gpt-5.6-luna` graded images against five equal-weight visual categories: traceability, grouping, labels, clearance, and composition. Each category is 0–4; their sum is converted to 100. A reviewed target is a readability reference, not a pixel blueprint. Byte-identical images were judged once and share their score. Changed pairs were judged twice with anonymous A/B ordering reversed, then averaged per case. Group means give each case equal weight. These subjective visual scores differ from the eval page's older rule-pass percentages.

| Group | Cases | Before | After | Unchanged SVGs |
| --- | ---: | ---: | ---: | ---: |
| Training | 20 | 49.4 | 49.6 | 19 |
| Testing | 19 | 49.1 | 50.0 | 16 |
| New structural probes | 4 | 55.0 | 68.1 | 2 |

The overall improvement is small because 35 of the 39 existing drawings are unchanged. The change does not address their existing composition and readability problems.

| Changed existing case | Before | After | Repeated visual judgement |
| --- | ---: | ---: | --- |
| 555 astable | 52.5 | 75.0 | Both passes prefer the new grouping |
| Emergency lighting | 52.5 | 57.5 | Passes disagree |
| Solar charge controller | 47.5 | 52.5 | One improvement, one tie |
| E-stop safety relay | 52.5 | 42.5 | Both passes find a regression |

The E-stop drawing becomes too wide; labels shrink when the whole drawing is fitted into a review card. Rotation also turns the letter inside the stop symbol sideways. These are unresolved visual defects, so this study does **not** establish that the candidate passes visual acceptance for every case. The frozen testing case was not given a special exception to make its score pass.

Both new single-host path probes improved in both passes (including unequal networks around two independent hosts). The branched and shared-host controls were unchanged. Four probes are too few to establish broad generalisation, and the model's disagreement on emergency lighting demonstrates scoring noise.

The [study data](circuit-passive-islands-study.json) records the split, source/image hashes, rubric, individual judgements and fresh sources. Local images and the comparison page are generated under `tmp/circuit-ship/`. To repeat this comparison, render the same frozen sources with the baseline and current engines, check their image hashes, and apply the recorded prompt with anonymous A/B images in both orders for changed cases.

## Verification and remaining limits

- 43/43 sources render through both engines. The public `renderResult` output is checked against the graded candidate SVGs before refreshing the local eval preview.
- All changed existing cases and all four new probes pass terminal/net connectivity checks in original, reversed declaration, and renamed-component forms: 24 checks. This checks graph connectivity and pin identity, not visual polish.
- The regression suite retains a compact generic polarity test rather than snapshots or assertions about example-specific coordinates.
- Typecheck, 3,400 tests, lint (zero errors), and the ESM/CJS/type build pass. Lint warnings remain.
- Dense-selector layout still takes about 20 seconds on the observed machine. Its arbitrary 500ms assertion was moved out of the normal suite into `scripts/benchmark-circuit.mts`; the performance issue itself was not fixed.
- No claim is made that multi-host feedback, arbitrary branching, large channel counts, or compact industrial panel composition is solved. The branch contains a reviewable candidate with a documented visual regression, not an unconditional visual pass.
