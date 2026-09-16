An event tree for a large-break loss-of-coolant accident (LOCA) in a nuclear plant, drawn in the style of NUREG/CR-2300 *PRA Procedures Guide* (1983) and IEC 62502:2010. The accident happens about once in ten thousand reactor-years. It then depends on four safety functions in response order: reactor trip, emergency core cooling (ECCS) injection, containment heat removal and containment integrity. The tree splits into five sequences, and each ends in an end state with its computed frequency.

Why it works as the exemplar for this type:

- A header band across the top names each safety function, with its failure probability on a second line. Dashed column dividers run down through the tree, so every branch point sits under its own heading.
- Success continues straight on and failure drops down to its own row. The upper branch is therefore always success, every line is horizontal or vertical, and each sequence ends on its own evenly spaced row. A sequence that fails early runs flat to the right edge without further branching.
- Each branch leg carries its sequence code and probability just above the line, right after the branch point (for example `3f 0.02`). The code is muted and the number is blue, so the arithmetic is readable without crowding the tree.
- A results table sits to the right of the tree with the same row height: sequence number, the path code (`1s 2s 3f`), the end state and the frequency in blue E-notation, with light rules between rows.
- Colour is used only for severity. A small green, amber or red square marks each end state as no release, late release, or early release and core damage, matching the bowtie's green / amber / red meanings. A one-line summary below gives the total release frequency and names the largest contributor.

Palette: ink #0f172a, branch lines #334155, muted text #64748b, dividers #cbd5e1, row rules #e2e8f0, header band #f1f5f9, computed numbers #2563eb, no release #16a34a, late release #d97706, early release or core damage #dc2626, paper #ffffff.
