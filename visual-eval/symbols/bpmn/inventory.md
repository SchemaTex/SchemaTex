# BPMN symbol inventory

Tier 1 is the vocabulary needed for a basic professional BPMN diagram; Tier 2 adds everyday notation; Tier 3 completes the drafted vocabulary, including Conversation and Choreography. The authority is [OMG BPMN 2.0.2, formal/13-12-09](https://www.omg.org/spec/BPMN/2.0.2/PDF), Chapters 7–10, with Choreography forms introduced in §7.3.2, Table 7.2. Event outlines, triggers, activity markers and connector adornments are composable; the library does not repeat every legal combination. Event combinations follow Tables 10.84–10.90. ChatDiagram usage has not been counted yet: usage would mean the number of distinct users whose generated BPMN DSL names a symbol during a stated measurement period, excluding `victor@mymap.ai`, rather than the number of occurrences. Every manifest `usageUsers` remains null.

All drawings use the accepted `visual-eval/exemplars/bpmn/ideal.svg` style. The eight accepted seeds are unchanged. Engine support describes the actual types, parser, layout and renderer; “Yes” describes an available graphic, not complete semantic validation. BPMN has no engine symbol catalog, so every manifest `engine` is null even when the DSL can draw the graphic. “Drawn” records the library SVG, independently of engine support. Unsupported DSL is recorded as “— (not expressible)”; ignored keywords do not count as support.

Participant-band entries are merged into `choreography-task`: its notes name both merged ids. Markers drawn on different host shapes remain separate because their complete contextual drawings differ. The accepted `intermediate-message-catch` seed is retained in addition to the inventory's Message Start catch example. Containers are shortened to sample size without shrinking their internal symbols; expanded containers grow vertically to preserve the exemplar's activity and event scale.


## Tier 1

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [Start event outline](start-event-outline.svg) | `start`, `start none` | §10.5.2, Fig. 10.70 | Yes | Drawn |
| [End event outline](end-event-outline.svg) | `end`, `end none` | §10.5.3, Fig. 10.71 | Yes | Drawn |
| [Task](task.svg) | `task "…"` | §10.3.3, Fig. 10.8 | Yes | Drawn |
| [Exclusive gateway](exclusive-gateway.svg) | `gateway xor` | §10.6.2, Fig. 10.106 | Yes | Drawn |
| [Parallel gateway](parallel-gateway.svg) | `gateway and` | §10.6.4, Fig. 10.110 | Yes | Drawn |
| [Sequence flow](sequence-flow.svg) | `A --> B` | §8.4.13, Fig. 8.32 | Yes | Drawn |
| [Default-flow slash](default-flow-marker.svg) | `A --* "…" --> B`, `A --*--> B` | §8.4.13, Fig. 8.34 | Yes | Drawn |
| [Message flow](message-flow.svg) | `A ~~> B`, `"Pool" ~~> A` | §9.4, Fig. 9.11 | Yes | Drawn |
| [Pool](pool.svg) | `pool "…" { … }`; `direction: LR`, `direction: TB` | §9.3, Fig. 9.2 | Yes | Drawn |
| [Black-box pool](black-box-pool.svg) | `pool "…" blackbox` | §9.3, Fig. 9.3 | Yes | Drawn |
| [Lane](lane.svg) | `lane "…" { … }` | §10.8, Figs. 10.123–10.124 | Yes | Drawn |

## Tier 2

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [Intermediate event outline](intermediate-event-outline.svg) | `intermediate`, `intermediate none` | §10.5.4, Fig. 10.72; Table 10.89 | Yes | Drawn |
| [Interrupting boundary event](interrupting-boundary-event.svg) | — (not expressible) | §10.5.4, Table 10.90 | No | Drawn |
| [Non-interrupting boundary event](non-interrupting-boundary-event.svg) | — (not expressible) | §10.5.4, Table 10.90 | No | Drawn |
| [Message catch glyph](message-catch-marker.svg) | `start message`, `intermediate message` | §10.5.5, Fig. 10.88 | Yes | Drawn |
| [Message throw glyph](message-throw-marker.svg) | `end message` | §10.5.5, Fig. 10.88 | Yes | Drawn |
| [Intermediate message throw](intermediate-message-throw.svg) | — (not expressible) | §10.5.4, Table 10.89 | No | Drawn |
| [Timer glyph](timer-marker.svg) | `start timer`, `intermediate timer` | §10.5.5, Fig. 10.96 | Yes | Drawn |
| [Error catch glyph](error-catch-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.79 | No | Drawn |
| [Error throw glyph](error-throw-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.79 | No | Drawn |
| [Signal catch glyph](signal-catch-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.94 | No | Drawn |
| [Signal throw glyph](signal-throw-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.94 | No | Drawn |
| [Conditional event glyph](conditional-event-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.77 | No | Drawn |
| [Terminate end glyph](terminate-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.95 | No | Drawn |
| [User task marker](user-task-marker.svg) | `task user "…"` | §10.3.3, Fig. 10.17 | Yes | Drawn |
| [Service task marker](service-task-marker.svg) | `task service "…"` | §10.3.3, Fig. 10.11 | Yes | Drawn |
| [Send task marker](send-task-marker.svg) | `task send "…"` | §10.3.3, Fig. 10.13 | Yes | Drawn |
| [Receive task marker](receive-task-marker.svg) | `task receive "…"` | §10.3.3, Fig. 10.15 | Yes | Drawn |
| [Manual task marker](manual-task-marker.svg) | `task manual "…"` | §10.3.3, Fig. 10.18 | Yes | Drawn |
| [Business Rule task marker](business-rule-task-marker.svg) | — (not expressible) | §10.3.3, Fig. 10.19 | No | Drawn |
| [Script task marker](script-task-marker.svg) | `task script "…"` | §10.3.3, Fig. 10.20 | Yes | Drawn |
| [Collapsed subprocess marker](collapsed-subprocess-marker.svg) | `subprocess "…"`, `subprocess "…" collapsed` | §10.3.5, Fig. 10.25 | Yes | Drawn |
| [Expanded subprocess](expanded-subprocess.svg) | — (not expressible) | §10.3.5, Fig. 10.26 | No | Drawn |
| [Call Activity border](call-activity-border.svg) | — (not expressible) | §10.3.6, Figs. 10.39–10.41 | No | Drawn |
| [Standard loop marker](standard-loop-marker.svg) | — (not expressible) | §10.3.8, Figs. 10.46–10.47 | No | Drawn |
| [Parallel multi-instance marker](parallel-multi-instance-marker.svg) | — (not expressible) | §10.3.8, Fig. 10.48 | No | Drawn |
| [Sequential multi-instance marker](sequential-multi-instance-marker.svg) | — (not expressible) | §10.3.8, Fig. 10.49 | No | Drawn |
| [Inclusive gateway](inclusive-gateway.svg) | `gateway or` | §10.6.3, Fig. 10.108 | Yes | Drawn |
| [Ordinary event-based gateway](event-based-gateway.svg) | `gateway event` | §10.6.6, Fig. 10.115 | Yes | Drawn |
| [Conditional-flow marker](conditional-flow-marker.svg) | `A --? "…" --> B`, `A --?--> B` | §8.4.13, Fig. 8.33 | Yes | Drawn |
| [Undirected association](association.svg) | — (not expressible) | §8.4.1, Fig. 8.9 | No | Drawn |
| [Directed association / Data Association](directed-association.svg) | — (not expressible) | §8.4.1, Fig. 8.11; §10.4.1, Fig. 10.65 | No | Drawn |
| [Data Object](data-object.svg) | — (not expressible) | §10.4.1, Fig. 10.52 | No | Drawn |
| [Data collection marker](data-collection-marker.svg) | — (not expressible) | §10.4.1, Fig. 10.53 | No | Drawn |
| [Data Input marker](data-input-marker.svg) | — (not expressible) | §10.4.1, Fig. 10.58 | No | Drawn |
| [Data Output marker](data-output-marker.svg) | — (not expressible) | §10.4.1, Fig. 10.60 | No | Drawn |
| [Data Store](data-store.svg) | — (not expressible) | §10.4.1, Fig. 10.54 | No | Drawn |
| [Text Annotation](text-annotation.svg) | — (not expressible) | §8.4.1, Fig. 8.16 | No | Drawn |
| [Group](group.svg) | — (not expressible) | §8.4.1, Fig. 8.13 | No | Drawn |
| [Intermediate message event (catching), accepted seed](intermediate-message-catch.svg) | `intermediate message` | §10.5.4, Fig. 10.72; §10.5.5, Fig. 10.88 | Yes | Drawn |

## Tier 3

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [Non-interrupting event-subprocess start outline](non-interrupting-start-outline.svg) | — (not expressible) | §10.5.2, Table 10.86 | No | Drawn |
| [Interrupting event-subprocess start](interrupting-event-subprocess-start.svg) | — (not expressible) | §10.5.2, Table 10.86 | No | Drawn |
| [Escalation catch glyph](escalation-catch-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.81 | No | Drawn |
| [Escalation throw glyph](escalation-throw-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.81 | No | Drawn |
| [Cancel catch glyph](cancel-catch-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.74 | No | Drawn |
| [Cancel throw glyph](cancel-throw-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.74 | No | Drawn |
| [Compensation catch glyph](compensation-catch-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.75 | No | Drawn |
| [Compensation throw glyph](compensation-throw-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.75 | No | Drawn |
| [Link catch glyph](link-catch-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.83 | No | Drawn |
| [Link throw glyph](link-throw-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.83 | No | Drawn |
| [Multiple catch glyph](multiple-catch-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.90 | No | Drawn |
| [Multiple throw glyph](multiple-throw-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.90 | No | Drawn |
| [Parallel Multiple catch glyph](parallel-multiple-marker.svg) | — (not expressible) | §10.5.5, Fig. 10.92; draft Table 10.93 corrected | No | Drawn |
| [Event subprocess border](event-subprocess-border.svg) | — (not expressible) | §10.3.5, Figs. 10.30–10.31 | No | Drawn |
| [Collapsed event-subprocess trigger adornment](event-subprocess-trigger-adornment.svg) | — (not expressible) | §10.3.5, Fig. 10.30 | No | Drawn |
| [Transaction border](transaction-border.svg) | — (not expressible) | §10.3.5, Figs. 10.33–10.34 | No | Drawn |
| [Ad-hoc subprocess marker](ad-hoc-marker.svg) | — (not expressible) | §10.3.5, Figs. 10.35–10.36 | No | Drawn |
| [Compensation activity marker](compensation-activity-marker.svg) | — (not expressible) | §10.3.3, Fig. 10.9; §10.7.1, Fig. 10.121 | No | Drawn |
| [Instantiating Receive task marker](instantiating-receive-marker.svg) | — (not expressible) | §10.3.3, Fig. 10.16 | No | Drawn |
| [Exclusive gateway without X](exclusive-gateway-unmarked.svg) | — (not expressible) | §10.6.2, Fig. 10.105 | No | Drawn |
| [Complex gateway](complex-gateway.svg) | — (not expressible) | §10.6.5, Fig. 10.113 | No | Drawn |
| [Instantiating exclusive event-based gateway](instantiating-exclusive-event-gateway.svg) | `gateway event` | §10.6.6, Fig. 10.118 | No: gateway event draws the ordinary double-circle form | Drawn |
| [Instantiating parallel event-based gateway](instantiating-parallel-event-gateway.svg) | — (not expressible) | §10.6.6, Fig. 10.119 | No | Drawn |
| [Bidirectional association](bidirectional-association.svg) | — (not expressible) | §8.4.1, Table 8.20, `associationDirection=Both` | No | Drawn |
| [Nested lane subdivision](nested-lane.svg) | — (not expressible) | §10.8, Fig. 10.125 | No | Drawn |
| [Participant multiplicity marker](participant-multiplicity-marker.svg) | — (not expressible) | §9.3.1, Fig. 9.8 | No | Drawn |
| [Initiating Message](initiating-message.svg) | — (not expressible) | §8.4.11, Fig. 8.26; §9.4, Fig. 9.12 | No | Drawn |
| [Non-initiating Message](non-initiating-message.svg) | — (not expressible) | §8.4.11, Figs. 8.27–8.28 | No | Drawn |
| [Conversation](conversation.svg) | — (not expressible) | §9.5.2, Fig. 9.23 | No | Drawn |
| [Sub-Conversation](sub-conversation.svg) | — (not expressible) | §9.5.3, Fig. 9.24 | No | Drawn |
| [Call Conversation](call-conversation.svg) | — (not expressible) | §9.5.4, Fig. 9.25 | No | Drawn |
| [Call Conversation invoking Collaboration](call-collaboration.svg) | — (not expressible) | §9.5.4, Fig. 9.26 | No | Drawn |
| [Conversation Link](conversation-link.svg) | — (not expressible) | §9.5.6, Fig. 9.27 | No | Drawn |
| [Call Conversation Link](call-conversation-link.svg) | — (not expressible) | §9.5.6, Fig. 9.30 | No | Drawn |
| [Choreography Task](choreography-task.svg) | — (not expressible) | §7.3.2, Table 7.2 | No | Drawn |
| [Initiating participant band (merged into `choreography-task`)](choreography-task.svg) | — (not expressible) | §7.3.2, Table 7.2 | No | Drawn |
| [Non-initiating participant band (merged into `choreography-task`)](choreography-task.svg) | — (not expressible) | §7.3.2, Table 7.2 | No | Drawn |
| [Collapsed Sub-Choreography](collapsed-sub-choreography.svg) | — (not expressible) | §7.3.2, Table 7.2 | No | Drawn |
| [Expanded Sub-Choreography](expanded-sub-choreography.svg) | — (not expressible) | §7.3.2, Table 7.2 | No | Drawn |
| [Call Choreography border](call-choreography-border.svg) | — (not expressible) | §7.3.2, Table 7.2 | No | Drawn |

## Engine gaps

- **Boundary events.** Neither attachment nor interrupting/non-interrupting outlines can be expressed, so timeouts, exceptions, and background notifications cannot be distinguished from ordinary process steps.
- **Expanded subprocesses and Call Activities.** The engine cannot show internal subprocess flow or distinguish reusable work from an ordinary task.
- **Loop and multi-instance markers.** Repetition, parallel batches, and sequential batches have no graphic representation; trailing task keywords are ignored.
- **Intermediate message throwing.** The renderer can fill an envelope, but the parser always makes intermediate message events catching events. There is no DSL switch for sending a message midway through a process.
- **Error, Signal, Conditional, and Terminate events.** These missing glyphs prevent ordinary failure handling, broadcasts, condition-based waiting, and termination of all remaining work. A plain `end` is not a Terminate event.
- **Data and explanatory artifacts.** Data Objects, collection/input/output markers, Data Stores, annotations, groups, and every association line form are unavailable, hiding what work consumes, produces, or depends on.
- **Business Rule tasks.** Decision-rule execution cannot be distinguished graphically from other task types.
- **Event subprocesses.** Dotted containers, embedded start-event adornments, and non-interrupting start outlines are missing; process-wide event handlers cannot be expressed.
- **Transactions and compensation.** Double borders, Cancel events, compensation glyphs and activity markers, and directed compensation associations are absent, preventing a correct depiction of cancellation and undo work.
- **Remaining event and activity markers.** Escalation, Link, Multiple, Parallel Multiple, ad-hoc subprocesses, and instantiating Receive tasks are unavailable.
- **Remaining gateway choices.** Empty exclusive diamonds, Complex gateways, and instantiating parallel event-based gateways cannot be expressed. The instantiating exclusive form is also unavailable; `gateway event` draws the ordinary double-circle gateway.
- **Participant detail.** Nested lanes, participant multiplicity, and attached initiating/non-initiating Message envelopes are missing.
- **Conversation and Choreography notation.** Conversation nodes and links, participant bands, Sub-Choreographies, and Call Choreographies cannot be expressed, leaving the corresponding Chapters 7–10 vocabulary uncovered.

Standard-reference note: the draft's Parallel Multiple citation to Table 10.93 is replaced with §10.5.5, Figure 10.92, which shows that notation. Choreography entries retain the draft's overview citation (§7.3.2, Table 7.2); no unverified detailed Chapter 11 clause is asserted. The supplied draft contains no literal “clause not verified” entries. Pixel sizes, stroke weights and the precise light-gray fill are exemplar style choices, not mandatory OMG dimensions or colors.
