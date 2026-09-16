An I²C register read drawn as a digital timing diagram. The master writes register pointer 0x10 to the device at address 0x50, sends a repeated start, and reads two bytes. It acknowledges the first byte, leaves the second unacknowledged (NACK), and sends a stop. Signal and bus notation follow WaveDrom, which matches the textbook convention in Wakerly's *Digital Design: Principles and Practices*. Bus conditions and the ACK/NACK meaning follow the NXP I²C-bus specification, UM10204.

Why it works as the exemplar for this type:

- All lanes share one time grid with evenly spaced faint vertical guides. Every clock edge, bus transition and marker lands on a predictable fraction of a cell, so vertical relationships can be read directly.
- Bus values are drawn as hexagonal cells with crossed transitions. Every cell is wide enough for its label: one-bit fields (ACK, NACK) get one cell and byte fields get two. Labels use the specification's short forms and never touch a cell edge.
- Start (S), repeated start (Sr) and stop (P) are drawn as real SDA level changes while SCL is high. Each is marked with a dashed vertical line and a short bold label above the lanes.
- Signals are grouped (Bus lines, Decoded, Firmware) with muted group names on the left, bold signal names right-aligned against the waveform, and hairline rules between groups. A decoded "SDA driver" lane shows who drives the bus in each field, which is the detail teams most often argue about.
- Phase brackets above the waveforms name each part of the transaction in plain words. A two-line key explains S, Sr, P, ACK and NACK, and notes that byte fields are drawn compressed.

Palette: ink #20272B (waveforms, names, bus text), muted #59636B (groups, driver lane text, brackets, markers, key), rule #CBD1D6 (group separators), grid #E8ECEF (time guides), paper #FFFFFF.
