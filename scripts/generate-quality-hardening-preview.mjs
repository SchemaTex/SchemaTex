import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = resolve(
  ROOT,
  "examples/quality-hardening-preview.before.json"
);
const OUTPUT_PATH = resolve(
  ROOT,
  "examples/quality-hardening-preview.html"
);

const PEDIGREE = `pedigree "Diabetes Multi-Generational History"
  I-1 [male, unaffected]
  I-2 [female, unaffected]
  I-3 [male, unaffected]
  I-4 [female, affected]

  I-1 -- I-2
    II-1 [male, unaffected]
    II-2 [male, affected]

  I-3 -- I-4
    II-3 [female, unaffected]
    II-4 [male, affected]

  II-1 -- II-3
    III-1 [male, affected, proband]

  II-2 -- II-5 [female, unaffected]
    III-2 [male, unaffected]

  III-2 -- III-3 [female, unaffected]
    IV-1 [male, affected]
    IV-2 [male, affected]
    IV-3 [male, affected]`;

const SLD = `sld "Generator Backup With ATS and Critical Distribution"
UTIL = utility [voltage: "480V", label: "Utility Feed"]
GEN = generator [rating: "500 kW", voltage: "480V", label: "Diesel Gen-Set"]
ATS1 = ats [rating: "800A", label: "Automatic Transfer Switch"]
BUS1 = bus [voltage: "480V", label: "Critical Bus"]
CB1 = breaker [rating: "200A", label: "Emergency Lighting"]
CB2 = breaker [rating: "200A", label: "Fire / Life Safety"]
CB3 = breaker [rating: "200A", label: "IT / Data Center"]
L1 = load [rating: "100A", label: "Emergency Lighting"]
L2 = load [rating: "100A", label: "Fire / Life Safety"]
L3 = load [rating: "100A", label: "IT / Data Center"]
UTIL -> ATS1
GEN -> ATS1
ATS1 -> BUS1
BUS1 -> CB1
BUS1 -> CB2
BUS1 -> CB3
CB1 -> L1
CB2 -> L2
CB3 -> L3`;

const CIRCUIT = `circuit "MCU 3.3V to 24V Level Shifter" netlist
V_mcu sig_in 0 3.3Vdc type=vsource label="MCU GPIO"
R1 sig_in base 1k
Q1 collector base 0 type=npn label="2N2222"
R2 Vcc24 collector 10k
V_24 Vcc24 0 24Vdc type=vsource label="24V Supply"
T_out collector 0 type=terminal label="Vout (0–24V)"`;

const BLOCK = `blockdiagram "PID Control Loop"
C = block("PID C(s)") [role: controller]
G = block("Plant G(s)") [role: plant]
err = sum(+r, -y)
r = signal("Reference")
y = signal("Output")
in -> r
r -> err
err -> C
C -> G
G -> y
G -> err`;

const BREADBOARD_BEFORE = `breadboard
board: half
title: "ESP32 R3 + Relay + RTC DS3231"
parts
  esp32: mcu esp32 @beside-left
  relay: module l298n @12e
  rtc: dip pins=8 @24e
wires
  esp32:D26 --orange-- relay:IN1`;

const BREADBOARD_AFTER = `breadboard
board: half
title: "ESP32 R3 + Relay + RTC DS3231"
parts
  esp32: mcu esp32 @beside-left
  relay: module relay @11e
  rtc: module ds3231 @22e
wires
  esp32:D26 --orange-- relay:IN
  esp32:SDA --green-- rtc:SDA
  esp32:SCL --yellow-- rtc:SCL
  esp32:3V3 --red-- rtc:VCC
  esp32:GND --black-- rtc:GND`;

const FLOORPLAN_BEFORE = `floorplan "Sustainable Small Office — 72 m²" unit m
room reception at 0,0 size 3.5x3
room workspace right-of reception size 8.5x6
room meeting below reception size 3.5x3
room kitchenette right-of meeting size 3x3
room bath right-of kitchenette size 2x3
room storage right-of bath size 3.5x3
door between workspace kitchenette at 50%
door between workspace bath at 50%
door between workspace storage at 50%`;

const FLOORPLAN_AFTER = `floorplan "Sustainable Small Office — 70.5 m²" unit m
room reception "Reception" at 0,0 size 3.5x3
room workspace "Open Workspace" at 3.5,0 size 5.5x6
room meeting "Meeting Room" at 0,3 size 3.5x3
room kitchenette "Kitchenette" at 3.5,6 size 2x3
room bath "Accessible WC" at 5.5,6 size 1.5x3
room storage "Storage" at 7,6 size 2x3
door between reception workspace at 50%
door between reception meeting at 50%
door between workspace kitchenette at 50%
door between workspace bath at 50%
door between workspace storage at 50%
window workspace north at 50% width 2
furniture desk in reception at 0.4,0.5 size 2.2x0.8
furniture conference-table in meeting at 0.6,0.7 size 2.2x1.2
furniture desk-chair in workspace at 0.5,0.8
furniture desk-chair in workspace at 2.7,0.8
furniture plant in workspace at 4.7,4.8`;

const FLOORPLAN_CLASSROOM_BEFORE = `floorplan "Classroom — 30 desks" unit m
room class "Classroom" at 0,0 size 9x7 nolabel
door class south at 12% width 1
furniture whiteboard in class at 2.5,0.1 size 4x0.2
furniture teacher-desk "Teacher" in class at 0.5,0.6 size 1.8x0.8
grid desk-chair in class rows 5 cols 6 count 30 area 1.2,2.1 7.8,5.5 itemsize 1.3x1.1
furniture rug "Learning Zone — KEEP CLEAR" in class at 3,2.8 size 3x2`;

const FLOORPLAN_CLASSROOM_AFTER = `floorplan "Classroom — explicit fit and protected zone" unit m
room class "Classroom" at 0,0 size 9x7 nolabel
door class south at 12% width 1
fixture whiteboard in class on north at 55% size 4x0.2
furniture teacher-desk "Teacher" in class at 0.5,0.6 size 1.8x0.8
grid desk-chair in class rows 4 cols 4 count 16 within 0.5,1.8 5.6,6.5 itemsize 1x0.8 gap 0.25
zone reading "Learning Zone · KEEP CLEAR" in class at 6,2 size 2.4x3.5 keep-clear`;

const FLOORPLAN_REPEATED_HEADER = `floorplan "Victorian — Ground" unit m
floor 0 "Ground Floor"
room hall at -2,-1 size 5x4
floorplan "Victorian — First" unit m
floor 1 "First Floor"
room hall at 4,3 size 5x4`;

const FLOORPLAN_REPEATED_HEADER_AFTER = `floorplan "Victorian — Two Floors" unit m
floor 0 "Ground Floor"
room hall at -2,-1 size 5x4
floor 1 "First Floor"
room hall at 4,3 size 5x4`;

const FLOORPLAN_LABEL_BEFORE = `floorplan "Future Archives Exhibition" unit m
room gallery "Gallery 14 · Future Archives" at 0,0 size 14x9
furniture stage "Archive Timeline" in gallery at 1,1 size 12x1.5
grid shelving in gallery rows 2 cols 3 area 2,4 12,8 itemsize 1.8x0.6`;

const FLOORPLAN_LABEL_AFTER = `floorplan "Future Archives Exhibition" unit m
room gallery "Gallery 14 · Future Archives" at 0,0 size 14x9 label-role primary
furniture stage "Archive Timeline" in gallery at 1,1 size 12x1.5
grid shelving in gallery rows 2 cols 3 within 2,4 12,8 itemsize 1.8x0.6`;

const MINDMAP_WRAPPED = [
  "```",
  "mindmap",
  "",
  "# Lycanthropy Class Tree",
  "## Primal Archetypes",
  "### Moonbound",
  "- Lunar senses",
  "- Controlled shift",
  "### Bloodfang",
  "- Pack tactics",
  "- Relentless pursuit",
  "## Combat Paths",
  "### Berserker",
  "- Rage",
  "- Regeneration",
  "### Stalker",
  "- Silence",
  "- Ambush",
  "## Playstyles",
  "### Vanguard",
  "- Guard the pack",
  "- Break the line",
  "### Hunter",
  "- Track",
  "- Isolate",
  "```",
].join("\n");

const BLOCK_WASHER = `blockdiagram "Samsung Washer Control Board"
AC = block("120/240 VAC
Mains Input") [role: reference]
PSU = block("SMPS
DC41 Power Board") [role: plant]
MCU = block("MCU Principal
DC41-00285C") [role: controller]
UI = block("Display + Key Matrix
User Interface") [role: reference]
Motor = block("Direct Drive Motor
Hall Feedback") [role: actuator]
Heater = block("Heater + NTC
Temperature Loop") [role: actuator]
Pump = block("Drain Pump
Water Level Sensor") [role: actuator]
Lock = block("Door Lock
Safety Interlock") [role: sensor]
AC -> PSU ["rectified supply"]
PSU -> MCU ["5 V / 12 V"]
UI -> MCU ["keys"]
MCU -> Motor ["3-phase PWM"]
MCU -> Heater ["relay drive"]
MCU -> Pump ["triac drive"]
Lock -> MCU ["interlock"]`;

const BLOCK_SPI = `blockdiagram "SPI Bus Topology — 28× ADF4351"
CPU = block("STM32F407\\nSPI1 Peripheral\\nSCK · MOSI\\n+ 7× GPIO LE[1:7]") [role: controller]
TCXO = block("25 MHz TCXO\\nClock Distribution\\nBuffer Fanout ×7") [role: reference]
G1 = block("G1: GSM 850\\nU2→U3→U4→U5\\n4× Daisy-Chain")
G2 = block("G2: GSM 900\\nU6→U7→U8→U9\\n4× Daisy-Chain")
G3 = block("G3: DCS 1800\\nU10→U11→U12→U13\\n4× Daisy-Chain")
G4 = block("G4: PCS 1900\\nU14→U15→U16→U17\\n4× Daisy-Chain")
G5 = block("G5: LTE Low\\nU18→U19→U20→U21\\n4× Daisy-Chain")
G6 = block("G6: LTE Mid\\nU22→U23→U24→U25\\n4× Daisy-Chain")
G7 = block("G7: LTE High\\nU26→U27→U28→U29\\n4× Daisy-Chain")
in -> CPU
in -> TCXO
CPU -> G1 ["SCK, MOSI + LE1"]
CPU -> G2 ["SCK, MOSI + LE2"]
CPU -> G3 ["SCK, MOSI + LE3"]
CPU -> G4 ["SCK, MOSI + LE4"]
CPU -> G5 ["SCK, MOSI + LE5"]
CPU -> G6 ["SCK, MOSI + LE6"]
CPU -> G7 ["SCK, MOSI + LE7"]
TCXO -> G1 ["25 MHz REF"]
TCXO -> G2 ["25 MHz REF"]
TCXO -> G3 ["25 MHz REF"]
TCXO -> G4 ["25 MHz REF"]
TCXO -> G5 ["25 MHz REF"]
TCXO -> G6 ["25 MHz REF"]
TCXO -> G7 ["25 MHz REF"]`;

const CIRCUIT_AUTOMOTIVE_BEFORE = `circuit "Circuito de Intermitentes Automotriz 12V" netlist
B1 bat 0 12V label="Batería / Encendedor 12V"
F1 bat p1 15A label="Fusible 15A"
S1 p1 p2 type=switch_spst label="Interruptor Activación"
K1 p2 fl_out piloto type=flasher label="Flasher 3 Contactos"
S2 fl_out izq der type=switch_spdt label="Selector 3 Salidas (Izq/Der)"
L1 izq 0 type=lamp label="Ámbar Del. Izq"
L2 izq 0 type=lamp label="Ámbar Tras. Izq"
D1 izq l1 type=led label="LED Verde Izq 1"
R1 l1 0 500
D2 izq l2 type=led label="LED Verde Izq 2"
R2 l2 0 500
L3 der 0 type=lamp label="Ámbar Del. Der"
L4 der 0 type=lamp label="Ámbar Tras. Der"
D3 der r1 type=led label="LED Verde Der 1"
R3 r1 0 500
D4 der r2 type=led label="LED Verde Der 2"
R4 r2 0 500`;

const CIRCUIT_AUTOMOTIVE_AFTER = CIRCUIT_AUTOMOTIVE_BEFORE
  .replace("type=flasher", "type=automotive_flasher_3pin")
  .replace(
    'type=switch_spdt label="Selector 3 Salidas (Izq/Der)"',
    'type=switch_spdt_center_off label="Selector Izq / OFF / Der"'
  );

const STATE_REACHABILITY_BEFORE = `stateDiagram-v2
direction LR
[*] --> M0
state "M0: (1,0,0,0,0) Package Received from Seller" as M0
state "M1: (0,1,0,0,0) At Sorting Center" as M1
state "M2: (0,0,1,0,0) At Warehouse / Transit Hub" as M2
state "M3: (0,0,0,1,0) With Delivery Courier" as M3
state "M4: (0,0,0,0,1) Customer Received Package" as M4
M0 --> M1 : T1 — Pickup Package
M1 --> M2 : T2 — Sorting Process
M2 --> M3 : T3 — Transportation to Hub
M3 --> M4 : T4 — Last Mile Delivery
M4 --> [*]`;

const STATE_REACHABILITY_AFTER = `stateDiagram-v2
direction auto
[*] --> M0
state "M₀ · (1,0,0,0,0)\\nPackage received from seller" as M0
state "M₁ · (0,1,0,0,0)\\nAt sorting center" as M1
state "M₂ · (0,0,1,0,0)\\nAt warehouse / transit hub" as M2
state "M₃ · (0,0,0,1,0)\\nWith delivery courier" as M3
state "M₄ · (0,0,0,0,1)\\nCustomer received package" as M4
M0 --> M1 : T₁ — Pickup package
M1 --> M2 : T₂ — Sorting process
M2 --> M3 : T₃ — Transportation to hub
M3 --> M4 : T₄ — Last-mile delivery
M4 --> [*]`;

const CASES = [
  {
    id: "pedigree",
    type: "pedigree",
    number: "01",
    title: "Couple lines preserve kinship",
    beforeLabel: "Valid, but visually false",
    afterLabel: "Valid and topology-preserving",
    beforeDsl: PEDIGREE,
    afterDsl: PEDIGREE,
    spine: "SAME DSL",
    issue:
      "Two correct spouse edges crossed unrelated people, making the family history read as two different couples.",
    fix:
      "Couples stay adjacent, every descent path terminates at the named child, and unrelated sibship rails use separate tracks.",
  },
  {
    id: "sld",
    type: "sld",
    number: "02",
    title: "Title gets a real layout band",
    beforeLabel: "Title collides with source labels",
    afterLabel: "Title and sources are separated",
    beforeDsl: SLD,
    afterDsl: SLD,
    spine: "SAME DSL",
    issue:
      "The professional topology was correct, but the title occupied the same vertical band as Utility Feed and Diesel Gen-Set.",
    fix:
      "The content offset is derived from title descent, source-label ascent, and a named safety gap.",
  },
  {
    id: "circuit",
    type: "circuit",
    number: "03",
    title: "A terminal is no longer an unknown part",
    beforeLabel: "Valid with ?terminal placeholder",
    afterLabel: "Real terminal block",
    beforeDsl: CIRCUIT,
    afterDsl: CIRCUIT,
    spine: "SAME DSL",
    issue:
      "The positional parser knew the terminal alias, but the netlist parser did not share it.",
    fix:
      "Netlist aliases resolve through supported symbols; truly unknown types fail validation.",
  },
  {
    id: "blockdiagram",
    type: "blockdiagram",
    number: "04",
    title: "Boundary input renders once",
    beforeLabel: "Port plus phantom block",
    afterLabel: "One boundary port",
    beforeDsl: BLOCK,
    afterDsl: BLOCK,
    spine: "SAME DSL",
    issue:
      "The canonical in id was auto-declared as a generic block and then drawn again as a boundary port.",
    fix:
      "Undeclared in/out are reserved boundary ports; explicitly declared blocks still remain blocks.",
  },
  {
    id: "breadboard",
    type: "breadboard",
    number: "05",
    title: "Requested parts are now the parts shown",
    beforeLabel: "Relay → L298N, RTC → generic DIP",
    afterLabel: "Relay + DS3231 with real pins",
    beforeDsl: BREADBOARD_BEFORE,
    afterDsl: BREADBOARD_AFTER,
    spine: "SAME INTENT",
    issue:
      "A convincing board silently substituted a motor driver and a generic IC for the named components.",
    fix:
      "The catalog now exposes relay and DS3231 modules, including COM/NO/NC and SDA/SCL pin contracts.",
  },
  {
    id: "floorplan",
    type: "floorplan",
    number: "06",
    title: "Invalid geometry cannot masquerade as success",
    beforeLabel: "Six errors returned as partial success",
    afterLabel: "Valid adjacency-first office",
    beforeDsl: FLOORPLAN_BEFORE,
    afterDsl: FLOORPLAN_AFTER,
    spine: "SAME INTENT",
    issue:
      "Three room overlaps and three impossible interior doors produced an error-card SVG with ok=true.",
    fix:
      "Errors now block render before SVG generation; the corrected plan gives every interior door a shared wall.",
    gateDsl: FLOORPLAN_BEFORE,
  },
  {
    id: "floorplan-classroom",
    type: "floorplan",
    number: "07",
    title: "An array proves it fits before placing anything",
    beforeLabel: "24 pairwise warnings, rug still obstructed",
    afterLabel: "One fit contract, one protected zone",
    beforeDsl: FLOORPLAN_CLASSROOM_BEFORE,
    afterDsl: FLOORPLAN_CLASSROOM_AFTER,
    spine: "SAME INTENT",
    issue:
      "Area meant item centers, so footprints collided row after row; the rug looked protected but underlay semantics made obstruction invisible.",
    fix:
      "Within means physical bounds, gap is measurable, wall fixtures anchor to walls, and keep-clear zones reject obstructions.",
  },
  {
    id: "floorplan-header",
    type: "floorplan",
    number: "08",
    title: "A second document header stops at the source",
    beforeLabel: "Two documents silently became one",
    afterLabel: "One document, explicit floor sections",
    beforeDsl: FLOORPLAN_REPEATED_HEADER,
    afterDsl: FLOORPLAN_REPEATED_HEADER_AFTER,
    spine: "SAME INTENT",
    issue:
      "The parser mutated mode and title mid-document, then laid unrelated floors out as though the source were structurally valid.",
    fix:
      "One immutable document header now owns explicit floor sections; the original repeated-header source is rejected separately at line 4.",
    gateDsl: FLOORPLAN_REPEATED_HEADER,
  },
  {
    id: "floorplan-label",
    type: "floorplan",
    number: "09",
    title: "Primary room intent becomes visible hierarchy",
    beforeLabel: "Exhibit identity reads like metadata",
    afterLabel: "Primary identity reads first",
    beforeDsl: FLOORPLAN_LABEL_BEFORE,
    afterDsl: FLOORPLAN_LABEL_AFTER,
    spine: "SAME INTENT",
    issue:
      "The exhibition title existed in source but had exactly the same typographic weight as every ordinary room label.",
    fix:
      "A semantic label role changes typography without baking arbitrary font sizes into the DSL.",
  },
  {
    id: "mindmap-wrapper",
    type: "mindmap",
    number: "10",
    title: "A Markdown wrapper cannot invent a second root",
    beforeLabel: "One real root, reported as two",
    afterLabel: "Wrapper removed, tree preserved",
    beforeDsl: MINDMAP_WRAPPED,
    afterDsl: MINDMAP_WRAPPED,
    spine: "SAME DSL",
    issue:
      "Blanking the outer fence shifted the optional marker away from physical line 1, so the parser promoted “mindmap” into a fake center node.",
    fix:
      "Marker discovery skips blank wrapper lines without shifting source positions; a genuine second H1 still fails with MINDMAP_MULTIPLE_ROOTS.",
  },
  {
    id: "block-washer",
    type: "blockdiagram",
    number: "11",
    title: "A valid Block diagram cannot lose declarations",
    beforeLabel: "Valid, but detailed labels vanished",
    afterLabel: "Physical multiline labels survive",
    beforeDsl: BLOCK_WASHER,
    afterDsl: BLOCK_WASHER,
    spine: "SAME DSL",
    issue:
      "The line-regex parser discarded every physical multiline declaration, then recreated generic id-only nodes from edges and called the result valid.",
    fix:
      "A shared logical-line reader accumulates quoted statements; unknown lines and bare undeclared endpoints now fail instead of disappearing.",
  },
  {
    id: "block-spi",
    type: "blockdiagram",
    number: "12",
    title: "Fan-out peers receive real rows",
    beforeLabel: "Nine nodes collapsed into two coordinates",
    afterLabel: "Measured layered fan-out",
    beforeDsl: BLOCK_SPI,
    afterDsl: BLOCK_SPI,
    spine: "SAME DSL",
    issue:
      "CPU and TCXO shared one coordinate, G1–G7 shared another, and literal line breaks were squeezed into fixed 100×54 boxes.",
    fix:
      "Labels are measured before placement; each layer allocates independent rows, ports and label lanes, with structural collision checks.",
  },
  {
    id: "circuit-automotive",
    type: "circuit",
    number: "13",
    title: "Automotive intent gets automotive primitives",
    beforeLabel: "Unsupported flasher stops the render",
    afterLabel: "B/L/P flasher, center-off selector, branch lanes",
    beforeDsl: CIRCUIT_AUTOMOTIVE_BEFORE,
    afterDsl: CIRCUIT_AUTOMOTIVE_AFTER,
    spine: "SAME INTENT",
    issue:
      "Strict validation correctly refused the invented flasher type, but SchemaTex still could not represent the requested three-pin device or lay out eight parallel loads.",
    fix:
      "The capability now exists end-to-end; topology-driven planning aligns the series spine, separates left/right load banks, and shares one return rail.",
  },
  {
    id: "state-reachability",
    type: "state",
    number: "14",
    title: "A downward sequence stays printable",
    beforeLabel: "2037×128 horizontal strip",
    afterLabel: "Measured top-to-bottom state cards",
    beforeDsl: STATE_REACHABILITY_BEFORE,
    afterDsl: STATE_REACHABILITY_AFTER,
    spine: "SAME INTENT",
    issue:
      "The generated LR directive overruled the requested down arrows, while long labels remained single-line and stretched five states across the page.",
    fix:
      "Direction auto selects TB for long chains, state and transition labels share measured multiline bounds, and explicit extreme LR returns a warning.",
  },
];

function resultSummary(result) {
  return {
    ok: result.ok,
    status: result.status,
    type: result.type,
    svg: result.svg,
    diagnostics: result.diagnostics ?? [],
  };
}

async function loadEngine() {
  return import(resolve(ROOT, "dist/index.js"));
}

async function renderCases() {
  const { renderResult } = await loadEngine();
  return Object.fromEntries(
    CASES.map((entry) => [
      entry.id,
      resultSummary(renderResult(entry.beforeDsl, { type: entry.type })),
    ])
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function diagnosticCodes(result) {
  return (result.diagnostics ?? [])
    .map((entry) => entry.code)
    .filter(Boolean);
}

function isPortraitSvg(svg) {
  const viewBox = String(svg).match(
    /\bviewBox=["'](?:-?[\d.]+\s+){2}([\d.]+)\s+([\d.]+)["']/
  );
  if (!viewBox) return false;
  const width = Number(viewBox[1]);
  const height = Number(viewBox[2]);
  return width > 0 && height > 0 && width / height < 0.7;
}

function diagramCard(side, label, result, note) {
  const status = result.ok ? result.status : "invalid";
  const codes = diagnosticCodes(result);
  return `<article class="render-card ${side}">
    <header class="render-head">
      <span class="side-label">${side === "before" ? "Before · 1.0.6" : "After · hardening"}</span>
      <span class="status ${status}">${escapeHtml(status)}</span>
    </header>
    <p class="render-title">${escapeHtml(label)}</p>
    <div class="canvas">
      <img src="${svgDataUrl(result.svg)}" alt="${escapeHtml(label)}" loading="lazy">
    </div>
    <p class="render-note">${escapeHtml(note)}</p>
    ${
      codes.length
        ? `<div class="codes">${codes
            .slice(0, 6)
            .map((code) => `<code>${escapeHtml(code)}</code>`)
            .join("")}</div>`
        : ""
    }
  </article>`;
}

function caseSection(entry, before, after, gate) {
  const gateNote =
    gate && !gate.ok
      ? `<aside class="gate-note"><span>Same broken DSL now stops at the gate</span><strong>${diagnosticCodes(gate).length} structured diagnostics · status invalid</strong></aside>`
      : "";
  const portraitClass =
    isPortraitSvg(before.svg) || isPortraitSvg(after.svg)
      ? " portrait-comparison"
      : "";
  return `<section class="case" id="${entry.id}">
    <header class="case-head">
      <div class="case-number">${entry.number}</div>
      <div>
        <p class="case-kicker">${escapeHtml(entry.type)} invariant</p>
        <h2>${escapeHtml(entry.title)}</h2>
      </div>
    </header>
    <div class="comparison${portraitClass}">
      ${diagramCard("before", entry.beforeLabel, before, entry.issue)}
      <div class="spine" aria-hidden="true"><span>${entry.spine}</span></div>
      ${diagramCard("after", entry.afterLabel, after, entry.fix)}
    </div>
    ${gateNote}
    <details class="dsl">
      <summary>Inspect the ${entry.spine === "SAME DSL" ? "shared" : "before / after"} DSL</summary>
      <div class="dsl-grid">
        <div><span>Before</span><pre>${escapeHtml(entry.beforeDsl)}</pre></div>
        <div><span>After</span><pre>${escapeHtml(entry.afterDsl)}</pre></div>
      </div>
    </details>
  </section>`;
}

function htmlPage(baseline, current, gates) {
  const sections = CASES.map((entry) =>
    caseSection(
      entry,
      baseline.cases[entry.id],
      current[entry.id],
      gates[entry.id]
    )
  ).join("\n");
  const beforeAccepted = Object.values(baseline.cases).filter(
    (result) => result.ok
  ).length;
  const afterContract = CASES.filter((entry) => {
    const result = current[entry.id];
    return entry.expectInvalidAfter
      ? !result.ok && result.status === "invalid"
      : result.ok && result.status === "valid";
  }).length;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SchemaTex generation quality hardening · release inspection</title>
  <style>
    :root {
      --blueprint: #10233F;
      --signal: #1E6FE8;
      --pass: #0A8F78;
      --fault: #D94A4A;
      --paper: #F4F7FB;
      --ink: #172033;
      --muted: #64748B;
      --line: #CBD7E6;
      --radius-sm: 6px;
      --radius-lg: 18px;
      --shadow: 0 18px 48px rgba(16, 35, 63, .11);
      --space-1: 6px;
      --space-2: 12px;
      --space-3: 20px;
      --space-4: 32px;
      --space-5: 52px;
      --display: clamp(42px, 7vw, 92px);
      --headline: clamp(27px, 3.4vw, 46px);
      --body: 16px;
      --caption: 12px;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(rgba(30,111,232,.045) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30,111,232,.045) 1px, transparent 1px),
        var(--paper);
      background-size: 24px 24px;
      font-family: "IBM Plex Sans", "Avenir Next", "Helvetica Neue", sans-serif;
      font-size: var(--body);
      line-height: 1.55;
    }
    a { color: inherit; }
    a:focus-visible, summary:focus-visible {
      outline: 3px solid var(--signal);
      outline-offset: 4px;
      border-radius: var(--radius-sm);
    }
    .shell { width: min(1500px, calc(100% - 32px)); margin: 0 auto; }
    .hero {
      min-height: 78vh;
      display: grid;
      align-content: end;
      padding: 72px 0 58px;
      border-bottom: 1px solid var(--line);
    }
    .release-mark {
      display: inline-flex;
      width: fit-content;
      gap: 9px;
      align-items: center;
      padding: 7px 11px;
      border: 1px solid rgba(30,111,232,.35);
      border-radius: 999px;
      color: var(--signal);
      font: 700 var(--caption)/1 "IBM Plex Mono", "SFMono-Regular", monospace;
      letter-spacing: .07em;
      text-transform: uppercase;
      background: rgba(255,255,255,.72);
    }
    .release-mark::before { content: ""; width: 7px; height: 7px; background: var(--pass); border-radius: 50%; }
    h1 {
      max-width: 1100px;
      margin: 22px 0 18px;
      font-family: "Avenir Next", "Futura", sans-serif;
      font-size: var(--display);
      line-height: .98;
      letter-spacing: -.055em;
      font-weight: 750;
    }
    .hero-copy { max-width: 730px; margin: 0; color: var(--muted); font-size: 19px; }
    .hero-copy strong { color: var(--ink); }
    .meter {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1px;
      margin-top: 42px;
      border: 1px solid var(--line);
      background: var(--line);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .metric { padding: 22px; background: rgba(255,255,255,.94); }
    .metric strong {
      display: block;
      font: 750 34px/1 "Avenir Next", sans-serif;
      color: var(--blueprint);
    }
    .metric span { display: block; margin-top: 8px; color: var(--muted); font-size: 13px; }
    .jump {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 18px 0;
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(244,247,251,.92);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--line);
    }
    .jump a {
      text-decoration: none;
      padding: 7px 11px;
      border-radius: 999px;
      color: var(--muted);
      font: 650 12px/1 "IBM Plex Mono", monospace;
    }
    .jump a:hover { color: var(--signal); background: #fff; }
    .contract {
      display: grid;
      grid-template-columns: 1.1fr repeat(3, 1fr);
      margin: 54px 0 16px;
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: #fff;
    }
    .contract > div { padding: 22px; border-left: 1px solid var(--line); }
    .contract > div:first-child { border-left: 0; background: var(--blueprint); color: #fff; }
    .contract span { display: block; color: var(--muted); font: 700 var(--caption)/1 "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: .07em; }
    .contract > div:first-child span { color: #9FC4FF; }
    .contract strong { display: block; margin-top: 11px; font-size: 16px; line-height: 1.35; }
    .case { padding: 78px 0; border-bottom: 1px solid var(--line); scroll-margin-top: 72px; }
    .case-head { display: flex; gap: 18px; align-items: flex-start; margin-bottom: 24px; }
    .case-number {
      min-width: 52px;
      color: var(--signal);
      font: 700 14px/1 "IBM Plex Mono", monospace;
      padding-top: 9px;
    }
    .case-kicker { margin: 0 0 6px; color: var(--muted); font: 700 var(--caption)/1 "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: .08em; }
    h2 { margin: 0; font: 720 var(--headline)/1.08 "Avenir Next", sans-serif; letter-spacing: -.035em; }
    .comparison {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
      align-items: stretch;
    }
    .render-card {
      min-width: 0;
      padding: 18px;
      background: rgba(255,255,255,.96);
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
    }
    .render-card.before { border-radius: var(--radius-lg) 0 0 var(--radius-lg); }
    .render-card.after { border-radius: 0 var(--radius-lg) var(--radius-lg) 0; }
    .render-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .side-label { color: var(--muted); font: 700 var(--caption)/1 "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: .05em; }
    .status { padding: 5px 8px; border-radius: 999px; font: 700 11px/1 "IBM Plex Mono", monospace; }
    .status.valid { color: #056A59; background: #D9F4ED; }
    .status.partial { color: #8A4B08; background: #FFF0D3; }
    .status.invalid { color: #9F2929; background: #FCE1E1; }
    .render-title { margin: 14px 0 13px; font-weight: 700; }
    .canvas {
      height: clamp(310px, 41vw, 540px);
      display: grid;
      place-items: center;
      overflow: auto;
      padding: 16px;
      border: 1px solid #DCE5F0;
      border-radius: 10px;
      background:
        radial-gradient(circle at 1px 1px, #D5DEEA 1px, transparent 1px),
        #fff;
      background-size: 16px 16px;
    }
    .portrait-comparison .canvas {
      height: clamp(680px, 78vw, 900px);
    }
    .canvas img {
      display: block;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .render-note { min-height: 72px; margin: 15px 2px 0; color: var(--muted); font-size: 14px; }
    .before .render-note { border-left: 3px solid var(--fault); padding-left: 11px; }
    .after .render-note { border-left: 3px solid var(--pass); padding-left: 11px; }
    .spine {
      display: grid;
      place-items: center;
      position: relative;
      background: linear-gradient(90deg, rgba(255,255,255,.4), rgba(16,35,63,.055), rgba(255,255,255,.4));
    }
    .spine::before { content: ""; position: absolute; inset: 0 auto; width: 1px; background: var(--signal); }
    .spine span {
      z-index: 1;
      writing-mode: vertical-rl;
      padding: 10px 6px;
      color: var(--signal);
      background: var(--paper);
      font: 750 11px/1 "IBM Plex Mono", monospace;
      letter-spacing: .12em;
    }
    .codes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    code { padding: 4px 7px; border-radius: 4px; color: var(--blueprint); background: #E8F0FB; font: 600 11px/1.2 "IBM Plex Mono", monospace; }
    .gate-note {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      padding: 15px 18px;
      margin-top: 12px;
      color: #fff;
      background: var(--blueprint);
      border-radius: 9px;
    }
    .gate-note span { color: #B7CCE8; }
    .dsl { margin-top: 15px; }
    .dsl summary { cursor: pointer; width: fit-content; color: var(--signal); font-weight: 700; }
    .dsl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
    .dsl-grid > div { min-width: 0; }
    .dsl-grid span { display: block; margin-bottom: 6px; color: var(--muted); font: 700 var(--caption)/1 "IBM Plex Mono", monospace; text-transform: uppercase; }
    pre {
      max-height: 330px;
      overflow: auto;
      margin: 0;
      padding: 16px;
      color: #DCEBFF;
      background: var(--blueprint);
      border-radius: 9px;
      font: 12px/1.6 "IBM Plex Mono", "SFMono-Regular", monospace;
      white-space: pre;
    }
    footer { padding: 44px 0 76px; color: var(--muted); font-size: 13px; }
    footer strong { color: var(--ink); }
    @media (max-width: 860px) {
      .hero { min-height: auto; padding-top: 52px; }
      .meter, .contract { grid-template-columns: 1fr; }
      .contract > div { border-left: 0; border-top: 1px solid var(--line); }
      .contract > div:first-child { border-top: 0; }
      .comparison { grid-template-columns: 1fr; gap: 10px; }
      .render-card.before, .render-card.after { border-radius: var(--radius-lg); }
      .spine { height: 34px; }
      .spine::before { inset: auto 0; width: auto; height: 1px; }
      .spine span { writing-mode: horizontal-tb; }
      .dsl-grid { grid-template-columns: 1fr; }
      .gate-note { flex-direction: column; }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
    }
  </style>
</head>
<body>
  <header class="hero shell">
    <span class="release-mark">Release inspection · generated from real SVG</span>
    <h1>Same source.<br>Truthful diagram.</h1>
    <p class="hero-copy">SchemaTex used to prove that it could emit SVG. This hardening pass makes it prove something stricter: <strong>the SVG can be trusted.</strong> The left side is frozen from 1.0.6; the right side is rendered from this branch.</p>
    <div class="meter" aria-label="Release summary">
      <div class="metric"><strong>${CASES.length}</strong><span>production-shaped visual cases</span></div>
      <div class="metric"><strong>${beforeAccepted}/${CASES.length}</strong><span>before cases reported ok, including misleading output</span></div>
      <div class="metric"><strong>${afterContract}/${CASES.length}</strong><span>after outcomes satisfy the contract; invalid sources stop at the gate</span></div>
    </div>
  </header>
  <nav class="jump shell" aria-label="Preview cases">
    ${CASES.map((entry) => `<a href="#${entry.id}">${entry.number} ${entry.type}</a>`).join("")}
  </nav>
  <main class="shell">
    <section class="contract" aria-label="New result contract">
      <div><span>New contract</span><strong>valid means renderable and semantically representable</strong></div>
      <div><span>Error</span><strong>invalid · no successful diagram SVG</strong></div>
      <div><span>Warning</span><strong>partial · SVG remains usable</strong></div>
      <div><span>Export</span><strong>diagnostics stay out of the drawing</strong></div>
    </section>
    ${sections}
  </main>
  <footer class="shell"><strong>Generated by scripts/generate-quality-hardening-preview.mjs.</strong> Before SVGs come from the frozen 1.0.6 dist; After SVGs come from the current build. No visual panel is a hand-drawn mock.</footer>
</body>
</html>`;
}

async function captureBefore() {
  const cases = await renderCases();
  await mkdir(dirname(BASELINE_PATH), { recursive: true });
  await writeFile(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        version: "schematex@1.0.6",
        capturedAt: "2026-07-28 PT",
        cases,
      },
      null,
      2
    )}\n`
  );
  console.log(`Captured ${Object.keys(cases).length} before cases → ${BASELINE_PATH}`);
}

async function captureMissingBefore() {
  const baseline = JSON.parse(await readFile(BASELINE_PATH, "utf8"));
  const cases = await renderCases();
  const missing = Object.fromEntries(
    Object.entries(cases).filter(([id]) => baseline.cases[id] === undefined)
  );
  await writeFile(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        ...baseline,
        cases: { ...baseline.cases, ...missing },
      },
      null,
      2
    )}\n`
  );
  console.log(`Captured ${Object.keys(missing).length} missing before cases → ${BASELINE_PATH}`);
}

async function generatePreview() {
  const baseline = JSON.parse(await readFile(BASELINE_PATH, "utf8"));
  const { renderResult } = await loadEngine();
  const current = Object.fromEntries(
    CASES.map((entry) => [
      entry.id,
      resultSummary(renderResult(entry.afterDsl, { type: entry.type })),
    ])
  );
  const gates = Object.fromEntries(
    CASES.map((entry) => [
      entry.id,
      entry.gateDsl
        ? resultSummary(renderResult(entry.gateDsl, { type: entry.type }))
        : null,
    ])
  );
  const html = htmlPage(baseline, current, gates).replace(/[ \t]+$/gm, "");
  await writeFile(OUTPUT_PATH, html);
  console.log(`Generated release preview → ${OUTPUT_PATH}`);
}

if (process.argv.includes("--capture-before")) {
  await captureBefore();
} else if (process.argv.includes("--capture-missing-before")) {
  await captureMissingBefore();
} else {
  await generatePreview();
}
