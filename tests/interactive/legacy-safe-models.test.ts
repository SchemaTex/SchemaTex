import { describe, expect, it } from "vitest";
import { renderResult } from "../../src/core/api";
import { setLabel, setPosition } from "../../src/core/editing";

const samples = {
  ecomap: `ecomap "Family supports"
  center: maria [female, label: "Maria"]
  work [label: "Tech Company", category: work]
  maria === work`,
  pedigree: `pedigree "BRCA family"
  I-1 [male, label: "Robert"]
  I-2 [female, label: "Helen"]
  I-1 -- I-2
    II-1 [female, affected, label: "Maya"]`,
  phylo: `phylo "Bacterial tree"
newick: ((Bacillus,Listeria),Escherichia)Root;`,
  sociogram: `sociogram "Class network"
  alice [label: "Alice"]
  bob [label: "Bob"]
  alice -> bob [label: "trusts"]`,
  logic: `logic "Motor interlock"
input START, SAFE
RUN = AND(START, SAFE)
output RUN`,
  blockdiagram: `blockdiagram "Control loop"
C = block("Controller")
G = block("Plant")
C -> G ["drive"]`,
  ladder: `ladder "Motor starter"
rung 1 "Start motor":
  XIC(START, name="Start button")
  OTE(MOTOR, name="Motor coil")
rung 2 "Stop motor":
  XIC(STOP, name="Stop button")
  OTU(MOTOR, name="Motor reset")`,
  sfc: `sfc "Batch cycle"
step Idle [initial]
  N "Wait for start"
step Run
  N "Run batch"
transition from: Idle to: Run: START`,
  sld: `sld "Main feeder"
UTIL = utility [label: "Utility", voltage: "13.8kV"]
BUS = bus [label: "Main Bus", voltage: "480V"]
LOAD = load [label: "Plant Load", rating: "150HP"]
UTIL -> BUS
BUS -> LOAD`,
  entity: `entity-structure "Holding company"
entity parent "Parent Holdings" corp
entity child "Operating Co" llc
parent -> child [ownership: 80%]`,
  venn: `venn "Research overlap"
set A "PubMed"
set B "Embase"
A only : "Unique PubMed"
A & B : "Shared studies"`,
  bpmn: `bpmn
direction: LR
title: "Loan approval"
pool "Bank" {
  lane "Clerk" {
    A: start "Application received"
    B: task user "Check completeness"
    E: end "Complete"
  }
}
flows
A --> B
B --> E`,
  usecase: `usecase
title: "ATM"
system: "ATM System"
actor: Customer
usecase: "Withdraw Cash" as Withdraw
Customer -- Withdraw`,
  prisma: `prisma
mode: 2020-single
title: "Review flow"
identification:
  databases:
    n: 100
screening:
  records-screened: 80
  excluded:
    n: 20
eligibility:
  full-text-assessed: 60
  excluded:
    n: 10
included:
  studies: 50`,
  pert: `pert
title: "Release plan"
task A "Design" duration: 2
task B "Build" duration: 3 after: A`,
  faulttree: `faulttree "Pump failure"
  top T "Both pumps fail" = AND(PA, PB)
  basic PA "Pump A fails" p: 0.01
  basic PB "Pump B fails" p: 0.01`,
  bowtie: `bowtie "Loss of containment"
hazard "Pressurised gas"
topevent "Loss of containment"
threat "Corrosion"
  prevent "Inspection programme"
consequence "Release to atmosphere"
  mitigate "Gas detection"`,
  matrix: `matrix eisenhower "This Week"
"Ship hotfix" at (0.82, 0.91)
"Plan roadmap" at (0.25, 0.73)`,
  eventtree: `eventtree "Loss of coolant accident"
  initiating LOCA "Large LOCA" freq: 1e-4
  function A "ECCS injects" p: 0.001
  function B "Containment spray" p: 0.01
  outcome s s -> "OK"
  outcome f * -> "Core damage"`,
  fmea: `fmea "Brake DFMEA"
  item "Master cylinder" fn "Generate pressure"
    mode "Internal seal leak"
      effect "Loss of braking" sev: 9
      cause "Seal degradation" occ: 3
        controls detection: "Bench test" det: 4`,
  rbd: `rbd "Two pumps"
  parallel {
    block A "Pump A" R=0.9
    block B "Pump B" R=0.9
  }`,
  comparison: `comparison "Cloud options"
mode: tchart
column "Managed"
- "Fast setup"
column "Self-hosted"
- "Full control"`,
  causalloop: `causalloop "Adoption model"
"Adoption rate" -> Adopters : +
Adopters -> "Adoption rate" : +`,
  markov: `markov "Weather"
  state Sunny "Sunny day"
  state Rainy "Rainy day"
  Sunny -> Rainy : 0.2
  Sunny -> Sunny : 0.8
  Rainy -> Sunny : 0.5
  Rainy -> Rainy : 0.5`,
  gitgraph: `gitGraph
  commit id: "Initial commit"
  branch develop
  checkout develop
  commit id: "Feature work" tag: "v0.1"`,
  epc: `epc "Order fulfilment"
  event E1 "Order received"
  function F1 "Check credit"
  event E2 "Credit checked"
  E1 -> F1
  F1 -> E2`,
  idef0: `idef0 "Manufacture product"
node A0
function A1 "Plan production"
function A2 "Make parts"
input A1 "Sales orders"
A1 -> A2 "Work plan"
output A2 "Parts"`,
  threatmodel: `threatmodel "Web App"
external: User
process P1: Web Server
datastore D1: User DB
User -> P1 : "HTTPS Request"
P1 -> D1 : Lookup
boundary "DMZ" { P1 }`,
  welding: `welding "Bracket"
joint "butt" {
  arrow: vgroove angle=60 root=3 throat=12
  tail: "SMAW; E7018"
}`,
  playbook: `playbook "Pick and roll" sport basketball
player p1 o "Guard" at -8,24
player p5 o "Center" at 6,18
screen p5 p1
route p1 to 0,10`,
} as const;

const positionTypes = new Set([
  "ecomap", "pedigree", "sociogram", "logic", "blockdiagram", "sfc", "sld",
  "entity", "bpmn", "usecase", "pert", "faulttree", "bowtie", "rbd",
  "causalloop", "markov", "epc", "idef0", "threatmodel",
  "ladder", "venn", "matrix", "playbook",
]);

const nativePositionTypes = new Set(["ladder", "venn", "matrix", "playbook"]);

const representativeContent: Record<string, string> = {
  ecomap: "Maria",
  pedigree: "Robert",
  phylo: "Bacillus",
  sociogram: "Alice",
  logic: "START",
  blockdiagram: "Controller",
  ladder: "START",
  sfc: "Run batch",
  sld: "Main Bus",
  entity: "Parent Holdings",
  venn: "PubMed",
  bpmn: "Check completeness",
  usecase: "Withdraw Cash",
  prisma: "100",
  pert: "2",
  faulttree: "0.01",
  bowtie: "Inspection programme",
  matrix: "Ship hotfix",
  eventtree: "OK",
  fmea: "9",
  rbd: "0.9",
  comparison: "Fast setup",
  causalloop: "Adoption rate",
  markov: "0.2",
  gitgraph: "develop",
  epc: "Check credit",
  idef0: "Plan production",
  threatmodel: "Web Server",
  welding: "60",
  playbook: "Guard",
};

describe("shipped safe editing compatibility models", () => {
  for (const [type, source] of Object.entries(samples)) {
    it(`${type} emits deterministic interactive targets`, () => {
      const rendered = renderResult(source, { scene: true });
      expect(rendered.ok).toBe(true);
      expect(rendered.scene?.length ?? 0).toBeGreaterThan(0);
      const label = rendered.scene?.find((item) => item.editable.label && item.sourceRange);
      expect(label, `${type} should expose authored text`).toBeDefined();
      if (label) {
        const nextLabel = label.labelWrite === "identifier"
          ? `${label.label ?? "label"}_edited`
          : `${label.label ?? "Label"} edited`;
        const edited = setLabel(source, label, nextLabel);
        expect(edited.diagnostics).toEqual([]);
        expect(edited.source).not.toBe(source);
        const roundTrip = renderResult(edited.source, { scene: true });
        expect(roundTrip.ok, `${type} label edit should re-render`).toBe(true);
        expect(
          roundTrip.scene?.some((item) => item.editable.label && item.label === nextLabel),
          `${type} should preserve the edited label after reparsing`,
        ).toBe(true);
      }

      if (positionTypes.has(type)) {
        const movable = rendered.scene?.find((item) => item.editable.position !== "none" && item.semanticId !== "@title");
        expect(movable, `${type} should expose a safe position axis`).toBeDefined();
        if (movable?.bbox) {
          const moved = setPosition(source, movable, {
            x: movable.bbox.x + 12,
            y: movable.bbox.y + (type === "ladder" ? 140 : 9),
          });
          expect(moved.diagnostics).toEqual([]);
          if (nativePositionTypes.has(type)) {
            expect(moved.source).not.toBe(source);
            expect(moved.source).not.toContain("@overrides");
          } else {
            expect(moved.source).toContain(movable.semanticId!.includes(" ")
              ? `pin ${JSON.stringify(movable.semanticId)}`
              : `pin ${movable.semanticId}`);
          }
          expect(
            renderResult(moved.source, { scene: true }).ok,
            `${type} position edit should re-render`,
          ).toBe(true);
        }
      }
    });
  }

  it("renames every GitGraph branch identity reference atomically", () => {
    const source = samples.gitgraph;
    const rendered = renderResult(source, { scene: true });
    const branch = rendered.scene?.find((item) => item.key === "gitgraph:branch:develop");
    expect(branch?.labelSourceRanges?.length).toBe(2);
    const edited = setLabel(source, branch!, "release");
    expect(edited.diagnostics).toEqual([]);
    expect(edited.source).toContain("branch release");
    expect(edited.source).toContain("checkout release");
    expect(edited.source).not.toContain("develop");
    expect(renderResult(edited.source, { scene: true }).ok).toBe(true);
  });

  it("keeps a non-ASCII-double-quoted label safely quoted after editing", () => {
    const source = `blockdiagram 'Control loop'
C = block("Controller")`;
    const rendered = renderResult(source, { scene: true });
    expect(rendered.ok).toBe(true);
    const title = rendered.scene?.find((item) => item.key === "title");
    expect(title?.label).toBe("Control loop");

    const edited = setLabel(source, title!, "Revised control loop");
    expect(edited.diagnostics).toEqual([]);
    expect(edited.source).toContain('blockdiagram "Revised control loop"');
    const roundTrip = renderResult(edited.source, { scene: true });
    expect(roundTrip.ok).toBe(true);
    expect(roundTrip.scene?.find((item) => item.key === "title")?.label).toBe(
      "Revised control loop"
    );
  });

  it("quotes Newick leaf names when an edit introduces whitespace", () => {
    const source = samples.phylo;
    const rendered = renderResult(source, { scene: true });
    const leaf = rendered.scene?.find((item) => item.label === "Bacillus");
    expect(leaf?.labelWrite).toBe("newick-bare");
    const edited = setLabel(source, leaf!, "Bacillus subtilis");
    expect(edited.diagnostics).toEqual([]);
    expect(edited.source).toContain("'Bacillus subtilis'");
    expect(renderResult(edited.source, { scene: true }).ok).toBe(true);
  });

  it("exposes representative domain content for every newly shipped engine", () => {
    for (const [type, source] of Object.entries(samples)) {
      const rendered = renderResult(source, { scene: true });
      const expected = representativeContent[type];
      expect(
        rendered.scene?.some((item) => item.editable.label && item.label === expected),
        `${type} should expose ${JSON.stringify(expected)}`,
      ).toBe(true);
    }
  });

  it.each([
    ["prisma", "100", "101"],
    ["pert", "2", "4"],
    ["faulttree", "0.01", "0.02"],
    ["fmea", "9", "8"],
    ["rbd", "0.9", "0.95"],
    ["markov", "0.2", "0.20"],
    ["welding", "60", "55"],
  ])("round-trips the %s structured numeric field", (type, before, after) => {
    const source = samples[type as keyof typeof samples];
    const rendered = renderResult(source, { scene: true });
    const field = rendered.scene?.find((item) => item.editable.label && item.label === before);
    expect(field).toBeDefined();
    const edited = setLabel(source, field!, after);
    expect(edited.diagnostics).toEqual([]);
    expect(edited.source).not.toBe(source);
    expect(renderResult(edited.source, { scene: true }).ok).toBe(true);
  });

  it("exposes Venn center and radius as native source geometry", () => {
    const source = samples.venn;
    const rendered = renderResult(source, { scene: true });
    const center = rendered.scene?.find((item) => item.key === "venn:set:A");
    const radius = rendered.scene?.find((item) => item.key === "venn:set:A:radius");
    expect(center?.positionSource?.kind).toBe("point");
    expect(radius?.positionSource?.kind).toBe("scalar");
    const centered = setPosition(source, center!, {
      x: center!.bbox!.x + 24,
      y: center!.bbox!.y + 12,
    });
    expect(centered.source).toContain("at: (");
    expect(renderResult(centered.source, { scene: true }).ok).toBe(true);
    const resizedRender = renderResult(centered.source, { scene: true });
    const resizedHandle = resizedRender.scene?.find((item) => item.key === "venn:set:A:radius");
    const resized = setPosition(centered.source, resizedHandle!, {
      x: resizedHandle!.bbox!.x + 18,
      y: resizedHandle!.bbox!.y,
    });
    expect(resized.source).toContain("radius:");
    expect(renderResult(resized.source, { scene: true }).ok).toBe(true);
  });

  it("rewrites an authored Playbook route endpoint and keeps the live path attached", () => {
    const source = samples.playbook;
    const rendered = renderResult(source, { scene: true });
    const endpoint = rendered.scene?.find((item) => item.key === "playbook:route:1:endpoint");
    expect(endpoint?.positionSource?.kind).toBe("point");
    expect(rendered.svg).toContain('data-sx-live-end="route:1:endpoint"');
    const moved = setPosition(source, endpoint!, {
      x: endpoint!.bbox!.x + 16,
      y: endpoint!.bbox!.y - 10,
    });
    expect(moved.diagnostics).toEqual([]);
    expect(moved.source).not.toContain("@overrides");
    expect(moved.source).not.toContain("route p1 to 0,10");
    expect(renderResult(moved.source, { scene: true }).ok).toBe(true);
  });

  it("reconciles presentation pins on rerender and decorates attached connectors", () => {
    for (const type of positionTypes) {
      if (nativePositionTypes.has(type)) continue;
      const source = samples[type as keyof typeof samples];
      const first = renderResult(source, { scene: true });
      const movable = first.scene?.find((item) => item.editable.position !== "none" && item.semanticId !== "@title");
      expect(movable?.bbox, `${type} should expose a movable semantic node`).toBeDefined();
      expect(first.svg, `${type} should decorate at least one live connector`).toContain('data-sx-live-edge="true"');
      const dx = movable!.editable.position === "move-y" ? 0 : 12;
      const dy = movable!.editable.position === "move-x" ? 0 : 9;
      const edited = setPosition(source, movable!, {
        x: movable!.bbox!.x + dx,
        y: movable!.bbox!.y + dy,
      });
      const second = renderResult(edited.source, { scene: true });
      const reconciled = second.scene?.find((item) => item.semanticId === movable!.semanticId && item.kind === movable!.kind);
      expect(reconciled?.bbox?.x, `${type} should reconcile pinned x`).toBeCloseTo(movable!.bbox!.x + dx, 1);
      expect(reconciled?.bbox?.y, `${type} should reconcile pinned y`).toBeCloseTo(movable!.bbox!.y + dy, 1);
    }
  });
});
