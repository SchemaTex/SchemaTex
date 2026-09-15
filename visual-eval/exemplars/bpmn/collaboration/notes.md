# BPMN exemplar — food lot release

**Scenario.** A contract laboratory registers a finished-product sample. The food manufacturer
orders testing, waits for the report, and acknowledges receipt. QA reviews the collection of
batch records while Quality Systems validates the laboratory results. A parallel join waits
for both before the collapsed disposition subprocess authorizes release or rejection. Stock
remains on hold until that decision. The default path blocks the lot in the ERP (enterprise
resource planning system); its Terminate End cancels any still-active overdue-flag work.
The 48-hour timer fires once without cancelling the report wait. Unit-mapping failures are
integration errors, not out-of-specification product results: the expanded subprocess throws
UNIT_MAPPING_ERROR, its interrupting boundary catches it, and an operator repairs the mapping
before retrying. A failed release specification is ordinary decision data for QA.

**Palette.** Five literal colours. Ink `#263238` for all process outlines, triggers, flows and
primary labels. Secondary `#59656B` for message names, data names and explanatory text. Rule
`#A8B1B5` for pool/lane divisions. Band `#F0F3F4` for participant and responsibility headers.
Paper `#FFFFFF` for the canvas and symbol interiors. No accent hue: business success, failure,
and ownership remain readable in monochrome; no colour is a second, competing notation.

**Type scale.** 26px/600 title, 16px activity and participant labels (600 for the title of the
expanded subprocess and participant/lane names), 14px secondary labels. Multiline baselines
are 20px apart. One stack: Inter, Helvetica Neue, Helvetica, Arial, sans-serif. Weight and size
supply the hierarchy; the sans-serif letterforms keep long operational names legible. Actual
text ink boxes are measured with resvg using its explicit Helvetica Neue / Helvetica / Arial font files, then padded by 2px.

**Symbol geometry.** Activity bodies are 84px high with 10px corner radii. Events are 36px in
diameter, boundary events 32px; intermediate rings have a 4px gap. Gateways are 48px diamonds.
Outlines use 1.6px, flow lines 1.5px, icon details 1.2px, structural rules 1px, end rings 3.2px.
Every task type uses the same upper-left marker slot. Service tasks use two toothed gears;
Script tasks a scroll; Business Rule tasks a ruled table. Multi-instance review uses three
vertical bars. Collapsed subprocesses use a boxed plus; the expanded subprocess has no plus.
Message envelopes are hollow when catching and filled when throwing. Error bolts follow the
same rule. The non-interrupting timer has two dashed rings. Message flows have a hollow source
circle tangent to the source and a hollow triangular target. Data associations have dotted
lines and open V heads; the annotation association is dotted and undirected. Default slashes
sit 11px beyond the gateway vertex and remain fully visible. Data collections have a folded
corner and three bars; stores have stacked cylinder rims.

**Layout and collision checks.** A single main baseline carries the normal process. The
laboratory messages occupy separate vertical channels. Exception work and data sit below the
main row; the expanded validation scope fills the Systems lane. Its completion returns in the
right-hand gutter, and mapping repair returns to the subprocess boundary, never an internal
node. The generator checks every text box against every other text box, every symbol body,
every frame/connector segment, every arrow or marker and the canvas. Text belonging to an
activity must fit inside it and avoid its icon. Enclosure membership is checked instead of
mistaking legitimate contained text for a collision. Every connector endpoint is checked on
its actual circle, diamond, straight activity edge or data shape. Every connector segment is
checked against unrelated symbols; only declared containment and boundary attachment are
allowed. Body/body intersections, connector/connector crossings, nested-scope containment
and orthogonality are also checked.
The generator refuses to write any deliverable on failure. The 1600px resvg PNG is the visual
inspection artifact, kept outside the repository at the requested scratchpad path.

**Coverage.** All twelve Tier 1 entries appear, including the black-box laboratory participant.
Twenty-five of the thirty-eight Tier 2 entries appear: intermediate outline; both boundary
outlines; message catch/throw and intermediate throw; timer; error catch/throw; terminate;
User, Service, Send, Receive, Business Rule and Script task markers; collapsed and expanded
subprocesses; parallel multi-instance; undirected and directed associations; Data Object,
collection marker, Data Store and Text Annotation. (The enumerated list is the source of
truth; composable markers may occur together on one object.) Signal/conditional events,
Manual tasks, Call Activities, loop/sequential-instance markers, inclusive/event-based
gateways, activity-origin conditional-flow diamonds, data input/output arrows and groups are
omitted because this scenario does not need them. This is a business model, not a symbol key.

**Standard and departures.** The authority is [OMG BPMN 2.0.2, formal/13-12-09](https://www.omg.org/spec/BPMN/2.0.2/PDF),
especially Chapters 8–10. There is no intentional notation or semantic departure. Unlike the
repository reference document's default corporate-blue theme, this house style is neutral.
The reference document's event-based gateway description is incorrect for an ordinary
non-instantiating gateway; that symbol is not used here. Absolute pixel dimensions are house
style, not OMG-mandated measurements.

**DSL losses.** The actual parser supports less than the reference document's proposed grammar.
The expanded validation subprocess is kept as a collapsed subprocess in source.sx; its nested
start, Script task, mapping gateway, Business Rule task, normal end and Error End cannot be
expressed with nested ownership. The Error Boundary/repair route is approximated by an added exclusive gateway
with a labelled default route to repair. This is not equivalent error propagation. The non-interrupting
boundary timer is approximated by a timer branch after Request testing: it cannot be cancelled
when Await lab report completes, unlike the drawing. Intermediate message throw becomes a
Send task. Multi-instance bars and the Terminate End marker are lost. Data objects, stores,
associations and the text annotation have no supported declarations and are omitted. Source
comments expose these losses; unsupported keywords are never passed off as implemented syntax.

**Verification result.** 61 text boxes, 34 symbol/enclosure bodies and 32 connections: zero
collisions, zero connector crossings. The final SVG was rasterised at 1600px width and visually
reviewed. DSL validation with renderResult returned `true []`. The requested vite-node -e
command was attempted, but installed vite-node 2.1.9 does not implement -e; the equivalent
code was run through ViteNodeRunner with the same src/index.ts entry point instead.
