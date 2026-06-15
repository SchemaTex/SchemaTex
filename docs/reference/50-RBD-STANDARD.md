# 50 — Reliability Block Diagram (RBD) Standard

> Engine: `rbd`. Cluster: risk-reliability (sibling of `faulttree` §37, `eventtree` §39, `bowtie` §38, `fmea` §40).
> Standard: **IEC 61078:2016** *Reliability block diagrams* · MIL-HDBK-338B.

## 0. Why RBD

An RBD models a system's **success logic**: components are blocks on a path from an input
node to an output node, and the system works while an unbroken path of working blocks
connects the two. It is the success-space dual of the fault tree (failure space).

The differentiator is **computation**, like the rest of the cluster: the engine reduces the
structure to a **system reliability**, derives the **Birnbaum importance** of each block, and
flags **single points of failure** — it does not merely draw boxes.

## 1. DSL grammar

```
rbd ["Title"]
  <structure>

structure := group | block
group     := ("series" | "parallel" | "kofn" k "/" n) "{" structure* "}"
block     := "block" ID ["Label"] [ R=value | p=value | value ]
```

- Header keyword `rbd` (alias `reliability`, `reliabilityblockdiagram`).
- Groups are **brace-delimited** and nest freely. A bare top-level list of structures is
  wrapped in an implicit `series`.
- `block` leaves: `ID`, optional quoted `Label` (CJK quotes folded), reliability as
  `R=0.99` (reliability), `p=0.01` (failure probability → R = 1−p), `R=99%`, or a bare number.
- The `block` keyword is required so attribute scanning terminates unambiguously at the next
  keyword/brace (a bare id is tolerated leniently).
- `key: value` lines (`title:`, `standard:`, `note:`) are metadata directives.

## 2. Computation (IEC 61078 §7)

| Group | Succeeds when | Reliability |
|-------|---------------|-------------|
| series | every child works | R = ∏ Rᵢ |
| parallel | any child works | R = 1 − ∏ (1 − Rᵢ) |
| kofn k/n | ≥ k of n children work | exact 2ⁿ state enumeration (n ≤ 18; else parallel bound) |

- **Birnbaum importance** Iᴮ(i) = R_sys(Rᵢ=1) − R_sys(Rᵢ=0). The highest-importance block is
  the improvement target (accented).
- **Single point of failure**: a block where R_sys(Rᵢ=0) = 0 — its failure alone fails the
  system (a non-redundant series block is always a SPOF). Drawn in the reserved red.
- If any reachable block lacks a reliability, the system figure is `n/a` (symbolic), with the
  offending ids reported.

## 3. Layout (§5)

Left-to-right success path. `series` lays children in a horizontal chain wired end-to-end;
`parallel`/`kofn` stack children on vertical rails fanning out of a split node and back into a
join node. Every structure exposes one entry/exit point on a common centre line, so groups
nest cleanly. The network is bracketed by input/output terminal nodes. A `kofn` group is
labelled `k/n` beside its join.

## 4. Rendering (§6)

Shares the risk-reliability colour cluster: neutral block bodies, **blue** for the computed
reliability numerals, **red** for single points of failure. `monochrome` falls back to border
weight for SPOF (regulator print); `dark` is the Catppuccin variant. Semantic SVG: `<title>` +
`<desc>` (computed summary), CSS classes from theme tokens, `data-id`/`data-r`/`data-spof`/
`data-critical` for interaction. No inline styles.

## 5. Validation

Non-fatal warnings (render proceeds): `kofn` threshold clamped to `1..n`; reliability clamped
to `0..1`; duplicate block id flagged; empty group ignored.

## 6. Deferred

Time-dependent reliability R(t)/Weibull, repairable availability with MTTR, standby (cold/warm)
redundancy with switch reliability, common-cause failure (β-factor), importance measures beyond
Birnbaum (Fussell-Vesely, criticality), and RBD↔fault-tree conversion.
