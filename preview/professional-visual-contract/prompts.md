# Professional visual contract — ImageGen prompt record

Generated with the built-in ImageGen workflow on 2026-09-03. The P&ID and SLD assets below are visual targets, not parser or renderer output.

## P&ID — accepted after one topology correction

**Input:** `before-pid-hydraulic-test-stand.png`

**Primary prompt:** Redraw the same Duplex Hydraulic Test Stand as a professional, compact P&ID suitable for an engineering design review. Use ISA-5.1 / ISO 10628 linework, topology-aware parallel pump lanes, orthogonal routing, a duplex-pump scope boundary, service-color accents, and collision-free instrument signals.

**Correction:** Move the amber bypass takeoff to the pressure-filter outlet, before PCV-102, and return it to the teal reservoir header.

**Final asset:** `after-pid-hydraulic-test-stand.png`

## Circuit — ImageGen output rejected; target corrected deterministically

**Input:** `before-circuit-555-astable.png`

**Primary prompt:** Redraw the same 555 Astable LED Flasher as an electrically coherent schematic with shared +9 V / GND rails, a readable NE555 block, exact astable timing topology, orthogonal wires, explicit junctions, and collision-free labels.

**Why rejected:** Two ImageGen attempts preserved the visual direction but miswired RESET, GND, and TRIG. The final `after-circuit-555-astable.svg` is a deterministic vector target that keeps the desired visual grammar while enforcing the actual circuit topology.

**Rejected asset:** `rejected-imagegen-circuit.png`

**Final asset:** `after-circuit-555-astable.svg`

## SLD — accepted after one voltage-label correction

**Input:** `before-sld-commercial-solar.png`

**Primary prompt:** Redraw the same Commercial PV Interconnection as a professional IEC 60617 single-line diagram on a landscape A3-style sheet. Separate DC generation, power conversion, and AC distribution; align the three PV branches; keep Utility as an independent feeder; and create a clean switchboard bus hierarchy.

**Correction:** Change the DC generation zone label from `400 V` to `600 Vdc`.

**Final asset:** `after-sld-commercial-solar.png`
