# Professional visual contract — ImageGen prompt record

Generated with the built-in ImageGen workflow on 2026-09-03. The P&ID and SLD assets below are visual targets, not parser or renderer output.

## P&ID symbol coverage — accepted as composition reference

**Input:** `before-pid-water-treatment-symbols.png`

**Primary prompt:** Redraw the same water-treatment topology as a professional compact P&ID. Preserve the raw-water main process train, chemical dosing through a diaphragm pump, dedicated filter backwash and drain ports, and an electric command to a motor-operated outlet valve. Use crisp ISO/ISA-style linework and keep auxiliary services visually separate.

**Visual acceptance:** General and diaphragm pumps are distinguishable, filter service connections do not borrow the main inlet/outlet, and the motor actuator is legible before reading the labels.

**Engineering limitation:** ImageGen establishes visual hierarchy only. The authored DSL and deterministic renderer remain authoritative for every connection and symbol attribute.

**Final asset:** `after-pid-water-treatment-symbols.png`

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

## Circuit audit — load bank with auxiliary pilot branch

**Input:** `before-circuit-load-bank-pilot.png`

**Primary prompt:** Redraw the same 12 V automotive indicator circuit as a clean professional service schematic. Keep a left load bank, a centered pilot-indicator branch, and a right load bank beneath the battery, fuse, switch, flasher, and selector spine. Use orthogonal wiring, explicit junctions, and one continuous ground-return rail.

**Visual acceptance:** The three output groups are distinguishable before reading labels, the supply path remains above them, and all returns share one coherent lower rail.

**Engineering limitation:** The generated reference is used only for composition. Terminal labels and connectivity in the fixed renderer are judged from the authored DSL because ImageGen does not provide an electrical-net guarantee.

**Final asset:** `after-circuit-load-bank-pilot.png`

## SLD audit — two-stage side feeder

**Input:** `before-sld-side-feeder-threshold.png`

**Primary prompt:** Redraw the same two-stage photovoltaic single-line diagram as a professional IEC-style review sheet. Align the three PV arrays as one generation bank feeding a DC combiner, keep Utility in a separate lateral lane, and connect both sources cleanly to the main switchboard bus above the building load.

**Visual acceptance:** Utility is not grouped with the PV arrays, the independent feeder reaches the bus without crossing the generation chain, and the voltage zones remain readable.

**Final asset:** `after-sld-side-feeder-threshold.png`
