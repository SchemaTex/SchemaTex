# Circuit: functional structure before placement

The netlist engine now accepts optional functional groups, reading order, generic
IC interface roles, and physical bus order. It places complete functional units
before routing the full electrical graph. Existing connection, obstacle-avoidance,
net-tree and label-placement code remains responsible for the wires and captions.

A netlist cannot say whether parallel taps are a physical cable sequence, or which
components constitute one functional stage. These are useful authored facts.
Coordinates, bends, spacing, pin-side overrides and per-example templates are not.
The [public grammar](../../website/content/docs/circuit.mdx) documents the new
`group`, `flow`, `bus` and `pins="name:role,..."` forms, including their validation.

## Implementation boundary

- `classifyCircuit` derives electrical topology once for the complete drawing.
  Local group placement inherits supply identities without merging return nets.
- `placeConnected` retains the existing connectivity-based placement. Functional
  composition reuses it inside each group, then reserves the measured unit bounds
  and folds whole functional bands when needed. Ungrouped parts remain a separate unit.
- Physical bus members retain the declared cable order. Their main runs are reserved
  before ordinary routing; branches use the existing obstacle-avoiding router.
- Generic IC pin roles derive four-sided anchors while keeping positional net
  binding intact. Pin labels containing symbols such as `−` retain stable identities.
  External captions no longer inflate the empty interior of a generic device box.
- Terminal channels reserve space from the number of distinct connected nets;
  a fixed gap could previously fence a terminal behind already-routed conductors.

No case IDs, titles, model-name dispatch, target coordinates, new runtime dependencies,
or per-wire DSL controls were added. Existing fixed-symbol geometry is retained.
The functional placement is a heuristic, not a general circuit-composition solver.

## Visual review — September 12, 2026 (Pacific)

Baseline: `b392e90b`, immediately before this refactor, **not v1.0.14**.
The local comparison is at `/tmp/circuit-functional-ship/index.html`. It exposes
Target, baseline, new engine with original DSL, and new engine with semantic DSL.
All SVGs can be opened at full size; source annotations and observations are visible.
[Study records](circuit-functional-placement-study.json) preserve source/image hashes,
semantic sources, fresh probes and per-case observations.

All 39 existing cases were inspected as a whole using rendered contact sheets;
problematic and changed cases were also inspected individually. Twenty cases have
additional semantic versions with unchanged pin-to-net maps. With original DSL,
20 SVGs are unchanged and 19 change. Those counts measure change, not improvement.

The author reviewed the images. This is not an independent blind judge, no numeric
scores were assigned, and no existing eval scores or targets were overwritten.
All 39 cases had already participated in development. Six new synthetic probes were
frozen before their first visual inspection, but the two bus probes subsequently
informed the trunk fix; they are now development evidence, not independent holdout.

| Observed effect | Examples | Remaining visual problem |
| --- | --- | --- |
| Clearer functional order | E-stop, fire alarm, PLC, VFD | Wide drawings, long returns and terminal crossings remain |
| Physical topology becomes legible | RS485 and 2/5-node bus probes | Bias branches and labels are less compact than the target |
| Mixed result | 4–20 mA, flyback, H-bridge, Wheatstone, dual supply | Groups do not infer loop composition or bridge symmetry |
| Extra structure is unnecessary | 555, LC ladder, common-emitter, simple op-amp | Added whitespace or bends can make simple drawings worse |
| New size/branching pressure | Five-stage cascade and branched feedback probes | Cross-row supplies and stacked output groups remain too sparse |

A global spacing/centering experiment produced regressions on ordinary drawings
and was withdrawn. Functional annotations are not automatically added to every
case: the twenty variants deliberately retain the unsuccessful comparisons too.
This ships the semantic capability and a reviewed comparison, not a claim that
all circuit drawings now meet their targets.

## Verification

The focused tests cover net binding under role-derived sides, symbolic pin names,
group order under reversed declarations, physical bus trunks, invalid structure,
and the public `renderResult` preprocessing path. They do not lock target pixels
or device IDs into the implementation. The study checks rendered component counts,
anchor existence and unchanged net bindings across all 39 + 20 drawings. All 59
layouts also retain every connected terminal on a route belonging to its own net. The six
probes also reverse component declarations and verify terminal contact with routes.

`npm run typecheck`, `npm run test` (245 files / 3,411 tests), `npm run lint`,
and `npm run build` pass.
Lint still reports the repository's existing warnings; this change adds none to
production sources. The comparison page was checked in the in-app browser with
all four image versions and source controls.
