# BPMN exemplar — customer return and refund (single pool)

**Scenario.** An online store handles one customer return request. Customer service checks
eligibility; an ineligible request gets a rejection notice. An eligible request gets a return
label by e-mail, and the warehouse waits for the parcel. If no parcel arrives within 14 days the
interrupting timer cancels the wait, the customer is told the return has expired, and the case
ends. A received parcel is inspected, then restocking and the refund run in parallel. If the
payment provider declines the automatic refund, the interrupting error boundary cancels that
task and Finance refunds by hand. An exclusive merge brings the automatic and manual refund
paths back together, so the parallel join always receives exactly one token from each branch.
The whole process belongs to one participant, so the diagram is one pool divided into three
lanes and has no message flows; the customer is not drawn.

**Palette.** Five literal colours, identical to the collaboration exemplar. Ink `#263238` for all
process outlines, triggers, flows and primary labels. Secondary `#59656B` for boundary-event
captions and the subtitle. Rule `#A8B1B5` for the pool and lane divisions. Band `#F0F3F4` for the
pool and lane header strips. Paper `#FFFFFF` for the canvas and symbol interiors. No accent hue.

**Type scale.** 26px/600 title, 16px activity labels and 16px/600 pool and lane names (rotated in
their header strips), 14px event, gateway and flow labels. Multiline baselines are 20px apart.
One stack: Inter, Helvetica Neue, Helvetica, Arial, sans-serif. Text ink boxes are measured with
resvg using its explicit Helvetica Neue / Helvetica / Arial font files, then padded by 2px.

**Symbol geometry.** Same as the collaboration exemplar: activities 84px high with 10px corner
radii, events 36px in diameter, boundary events 32px, 48px gateway diamonds; outlines 1.6px,
flows 1.5px, icon details 1.2px, frame rules 1px, end rings 3.2px. Task-type markers (User,
Service, Send, Receive) sit in the upper-left marker slot. The timer boundary sits on the bottom
edge of Receive returned parcel and the error boundary on the bottom edge of Refund payment; both
are interrupting, so their double rings are solid. The catching error bolt is hollow; the
throwing message envelope on Label e-mailed is filled. The default slash marks the No flow from
Eligible?. Return completed is a Terminate End.

**Layout and collision checks.** Each lane keeps its normal path on one baseline (200, 470 and
740px). Exceptions drop into a second row below the activity that raised them. Hand-offs between
lanes are vertical runs in dedicated channels (x = 675, 1150 and 1440), and every flow crosses a
lane divider only between elements it connects. The generator checks every text box against every
other text box, every symbol body, every frame and flow segment, every arrowhead or marker and the
canvas; checks every flow endpoint on the actual circle, diamond or straight activity edge; checks
boundary events are mounted on their activity's edge; checks body/body overlap, lane containment,
orthogonality and flow/flow contact. It refuses to write any deliverable on failure.

**Coverage.** Start (message), intermediate throw (message), interrupting boundary timer and
error, end and Terminate End; User, Service, Send and Receive tasks; exclusive gateway as split
with default flow and as merge; parallel split and join; labelled sequence flows; one pool with
three lanes. Message flows, data objects, stores, annotations and subprocesses are left to the
collaboration exemplar.

**Standard and departures.** The authority is [OMG BPMN 2.0.2, formal/13-12-09](https://www.omg.org/spec/BPMN/2.0.2/PDF):
§7.4 and §10.7 (pools and lanes; a process fully contained in one pool may omit the other
participants), §10.4.3 and Table 10.89 (boundary events: interrupting solid rings,
non-interrupting dashed), §10.4 timer and error triggers, §10.5 gateways and §8.3.13 default
flow marker. There is no intentional notation departure. Absolute pixel dimensions are house style.

**DSL losses.** The parser has no boundary events and no error trigger. The 14-day timer is kept
as a free-standing timer intermediate event after Receive returned parcel, which cannot cancel the
wait as the drawing does. The error boundary on Refund payment is approximated by an exclusive
gateway Payment declined? with a Yes branch to Refund manually. The Terminate End marker is lost.
Comments in source.sx mark both approximations.

**Verification result.** 0 collisions and 0 flow/flow contacts. The SVG was rasterised at 2× and
reviewed by eye; source.sx renders through `render()` without throwing.

Palette: ink #263238 · secondary #59656B · rule #A8B1B5 · band #F0F3F4 · paper #FFFFFF
