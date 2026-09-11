Promoted from the case `petri-semaphore-mutex` after Victor reviewed it: two processes A and B each cycle Ready → Enter → Critical → Exit, and a single Semaphore token lets exactly one of them into its critical section at a time.

Why it works as the exemplar for this type:

- It is the Murata (1989) textbook look: white places, solid black bar transitions, black token dots, black arcs with filled arrowheads, serif labels — the way place/transition nets are printed in papers and lecture notes.
- The layout is symmetric about the shared semaphore, so the mutual-exclusion structure is the first thing the eye reads: two identical vertical cycles mirrored left and right, with the semaphore's arcs fanning to both Enter transitions and back from both Exit transitions.
- Every arc is orthogonal with one or two bends; return arcs run outside their cycle in a clear channel; the semaphore arcs use two separate horizontal lanes so the give and take never overlap.
- Labels sit clear of every line (the Critical labels are placed inside the loop, the Enter labels outside the return channel), and a caption records the firing sequence the engine will simulate.

Palette: pure monochrome by design (#000 on white); the engine's default theme may add its blue body and green "enabled" highlight, but the geometry is what this drawing fixes.
