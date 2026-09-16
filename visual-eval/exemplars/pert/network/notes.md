The project is a warehouse management system rollout: ten activities from requirements to go-live, with a critical path of requirements, WMS configuration, ERP integration, system test, staff training and go-live that takes 43 working days. All four PERT exemplars draw this same schedule, so their numbers must agree. This drawing is the activity-on-node precedence network defined in the PMI Practice Standard for Scheduling (3rd ed., 2019) and the PMBOK Guide, using the six-field node box popularised by Moder, Phillips and Davis, *Project Management with CPM, PERT and Precedence Diagramming* (3rd ed., 1983): early start, duration and early finish across the top; activity ID and name in the middle; late start, total float and late finish across the bottom.

Why it works as the exemplar for this type:

- Every node carries all six schedule fields in the same fixed positions, so a reader can check the forward pass (top row) and backward pass (bottom row) without a legend; the legend repeats the key once with the field names spelled out.
- Columns follow the longest-path rank from kickoff, and the critical path is laid out as one straight horizontal spine; activities with float sit above or below it so no dependency line crosses another.
- Red is reserved for zero total float: critical node borders, their numbers and the spine links are red; everything else is blue boxes with grey links.
- Links are orthogonal and enter the left edge of their successor. A fan-out shares one trunk with a dot at each branch, and a merge joins the incoming line just before the arrowhead, so splits and joins never look like crossings.
- The go-live milestone keeps the full box (duration 0) with a small diamond beside its name.

Palette: ink #0F172A, muted #475569, link grey #64748B, activity blue #1D4ED8 with tint #EFF6FF, critical red #C62828 with tint #FDECEC, divider #E2E8F0, paper #FFFFFF.
