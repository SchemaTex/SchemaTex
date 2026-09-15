A reliability block diagram of a data centre built to Tier III redundancy, drawn to IEC 61078:2016. Four subsystems are in series. Power is the utility feed in parallel with a diesel generator and transfer switch. Cooling needs 2 of 3 CRAC (computer-room air conditioning) units. The network has two redundant core switches and storage has two storage nodes. The overall system reliability is 0.9972. The CRAC units have the highest Birnbaum importance, meaning improving them raises system reliability the most, and there is no single point of failure.

Why it works as the exemplar for this type:

- The success path reads left to right from an In terminal to an Out terminal. Series blocks chain end to end. Parallel and 2-of-3 groups hang between a split dot and a join dot on vertical rails, and every group enters and leaves on one shared centre line, so the structure nests without diagonal wiring.
- Each block is a rounded slate box with the component name in bold on the first line and its reliability in blue on the second. The value belongs inside the block it describes and cannot drift away from it.
- The k-out-of-n rule is written as `2/3` right beside the join it governs, and the group caption repeats it in words.
- A muted caption under each subsystem gives its name and computed reliability, and the system total stands out at top right. The numbers read from single block, to subsystem, to system.
- Colour is used only for computed results. Blue is for reliabilities, a green border marks the highest Birnbaum importance, and a red border is reserved for single points of failure. The legend explains both border colours even when no single point of failure exists.

Palette: ink #0f172a, wiring #334155, muted captions #64748b, block fill #eef2f7, reliability blue #2563eb, importance green #059669, single-point-of-failure red #dc2626, paper #ffffff.
