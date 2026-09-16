A four-state discrete-time Markov chain for a subscription customer, month to month: a Prospect converts to Active, an Active customer can slip to At risk, an At-risk customer can be won back, and either of the last two can churn. Churned is absorbing. The drawing follows the textbook state-transition convention of Norris, *Markov Chains* (1997), and Grinstead & Snell, *Introduction to Probability*, ch. 11: states are circles, every one-step transition with non-zero probability is a directed arc labelled with that probability, a state's own probability of staying put is a self-loop, and an absorbing state is drawn with a double ring.

Why it works as the exemplar for this type:

- Each probability sits at the midpoint of its own arc, pushed a fixed small distance out along the arc's normal on the side the curve bows toward, so a number can never be read as belonging to a neighbouring arc.
- A pair of opposite transitions between the same two states (Active and At risk) is drawn as two arcs bowing to opposite sides, never as one double-headed line, because the two directions carry different probabilities.
- Self-loops leave and re-enter the circle on the side facing open space, and their probability sits just beyond the loop's apex.
- The absorbing state is the only double-ringed, lightly filled circle and carries only its 1.0 self-loop; every state's outgoing numbers visibly sum to 1.
- Arcs are one weight and one slate colour with small solid arrowheads that touch the circle; blue is kept for the probabilities alone, so the numbers read first.
- A single legend row explains the two state kinds and the arc label, and nothing crosses.

Palette: state ink #1f2937, arc slate #475569, probability blue #1e40af, absorbing fill #f1f5f9, caption grey #64748b, rule #e2e8f0.
