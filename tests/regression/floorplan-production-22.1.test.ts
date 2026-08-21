import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderResult } from "../../src/core/api";
import { buildPromptContext } from "../../src/ai/prompt-context";
import {
  validateFloorplanIntent,
  type FloorplanCapability,
} from "../../src/diagrams/floorplan/capabilities";
import { layoutFloorplan } from "../../src/diagrams/floorplan/layout";
import { parseFloorplan } from "../../src/diagrams/floorplan/parser";
import { renderFloorplan } from "../../src/diagrams/floorplan/renderer";

const fixture = (name: string): string =>
  readFileSync(
    resolve(process.cwd(), "tests/fixtures/regression", name),
    "utf8"
  ).trim();

const diagnosticCodes = (source: string): string[] =>
  (renderResult(source, { type: "floorplan" }).diagnostics ?? []).map(
    (diagnostic) => diagnostic.code
  );

describe("floorplan 22.1 — production replay contracts", () => {
  it("FP-001 still draws impossible office topology, reports it, and accepts the adjacency-first correction", () => {
    const before = renderResult(
      fixture("floorplan-22.1-fp001-office-before.sx"),
      { type: "floorplan" }
    );
    // Three overlaps and three doors across gaps. The office is wrong, but it
    // is drawable, and a wrong drawing plus six precise diagnostics is a better
    // answer than a validation panel — the person can see what to move.
    expect(before.ok).toBe(true);
    expect(before.status).toBe("partial");
    expect(before.diagnostics.filter((entry) => entry.code === "floorplan/room-overlap")).toHaveLength(3);
    expect(
      before.diagnostics.filter((entry) => entry.code === "floorplan/opening-no-shared-wall")
    ).toHaveLength(3);
    expect(before.diagnostics.every((entry) => entry.severity === "warning")).toBe(true);

    const after = renderResult(
      fixture("floorplan-22.1-fp001-office-after.sx"),
      { type: "floorplan" }
    );
    expect(after.ok).toBe(true);
    expect(after.status).toBe("valid");
  });

  it("FP-002 groups array collision noise and the corrected classroom proves fit + clearance", () => {
    const before = renderResult(
      fixture("floorplan-22.1-fp002-classroom-before.sx"),
      { type: "floorplan" }
    );
    expect(before.ok).toBe(true);
    expect(before.status).toBe("partial");
    expect(before.diagnostics.map((entry) => entry.code)).toEqual([
      "floorplan/array-pitch-too-small",
    ]);

    const after = renderResult(
      fixture("floorplan-22.1-fp002-classroom-after.sx"),
      { type: "floorplan" }
    );
    expect(after.ok).toBe(true);
    expect(after.status).toBe("valid");
    expect(after.svg).toContain('data-zone="reading"');
    expect(after.svg).toContain('data-fixture="whiteboard"');
  });

  it("rejects a bounded array as one group before placing partial geometry", () => {
    const ast = parseFloorplan(`floorplan
room class at 0,0 size 5x4
grid desk-chair in class rows 4 cols 5 within 0.5,0.5 4.5,3.5 itemsize 1x1 gap 0.2`);
    const layout = layoutFloorplan(ast);
    // The array is still refused as one group rather than half-placed — that
    // part was always the point. What changed is that refusing the array no
    // longer refuses the room it sits in.
    expect(layout.items).toHaveLength(0);
    expect(layout.diagnostics).toMatchObject([
      {
        severity: "warning",
        code: "floorplan/array-does-not-fit",
        phase: "geometry",
        line: 3,
      },
    ]);
  });

  it("treats keep-clear zones as protected geometry, not collision-ignored rugs", () => {
    const codes = diagnosticCodes(`floorplan
room class at 0,0 size 6x5
zone teaching "Teaching Zone" in class at 2,1 size 2x2 keep-clear
furniture desk in class at 2.4,1.4 size 1.2x0.7`);
    expect(codes).toContain("floorplan/protected-zone-obstructed");
  });

  it("FP-005 stops repeated headers once at the structural source line", () => {
    const result = renderResult(
      fixture("floorplan-22.1-fp005-repeated-header.sx"),
      { type: "floorplan" }
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toMatchObject([
      {
        code: "floorplan/multiple-document-headers",
        line: 4,
        severity: "error",
      },
    ]);
  });

  it("rejects unscoped rooms before a later floor section", () => {
    expect(
      diagnosticCodes(`floorplan
room lobby at 0,0 size 4x3
floor 1
room office at 0,0 size 4x3`)
    ).toContain("floorplan/unscoped-statements-before-floor");
  });

  it("uses physical-meter opening defaults in both meter and foot documents", () => {
    const metric = layoutFloorplan(parseFloorplan(`floorplan unit m
room a at 0,0 size 4x3
room b right-of a size 4x3
door between a b at 50%`));
    const imperial = layoutFloorplan(parseFloorplan(`floorplan unit ft
room a at 0,0 size 16x12
room b right-of a size 16x12
door between a b at 50%`));
    expect(metric.openings[0]!.hi - metric.openings[0]!.lo).toBeCloseTo(0.8, 6);
    expect(imperial.openings[0]!.hi - imperial.openings[0]!.lo).toBeCloseTo(0.8, 6);
  });

  it("packs negative/nonzero floor origins with an exact 1.5 m gutter and unique scene keys", () => {
    const source = `floorplan stack horizontal
floor 0
room same at -4,-2 size 3x2
furniture desk "Work" in same at 0.5,0.5
floor 1
room same at 7,5 size 4x3
furniture desk "Work" in same at 0.5,0.5`;
    const layout = layoutFloorplan(parseFloorplan(source));
    const [first, second] = layout.plates;
    expect(first!.bounds.minX + first!.offset.x).toBeCloseTo(0, 6);
    expect(second!.bounds.minX + second!.offset.x).toBeCloseTo(
      first!.bounds.maxX + first!.offset.x + 1.5,
      6
    );
    expect(second!.label).toBe("First Floor");

    const result = renderResult(source, { type: "floorplan", scene: true });
    expect(result.scene?.map((entry) => entry.key)).toEqual(
      expect.arrayContaining([
        "node:floor:0:room:same",
        "node:floor:1:room:same",
        "label:floor:0:furniture:same:desk:1",
        "label:floor:1:furniture:same:desk:1",
      ])
    );
  });

  it("FP-006 exposes semantic label hierarchy in SVG", () => {
    const before = renderFloorplan(
      fixture("floorplan-22.1-fp006-exhibit-before.sx")
    );
    const after = renderFloorplan(
      fixture("floorplan-22.1-fp006-exhibit-after.sx")
    );
    expect(before).toContain("sx-fp-room-name-normal");
    expect(after).toContain("sx-fp-room-name-primary");
  });

  it("fails non-positive physical dimensions and array counts at parse time", () => {
    expect(() => parseFloorplan(`floorplan\nroom bad at 0,0 size 0x3`)).toThrow(
      /dimensions must be greater than zero/
    );
    expect(() =>
      parseFloorplan(`floorplan\nroom a at 0,0 size 4x3\ngrid chair in a rows 2 cols 0`)
    ).toThrow(/cols must be a positive integer/);
  });

  it("FP-003/004 report unsupported geometry and MEP semantics instead of faking them", () => {
    const intents = JSON.parse(
      fixture("floorplan-22.1-capability-intents.json")
    ) as Array<{ requestedCapabilities: FloorplanCapability[] }>;
    expect(
      intents.map((intent) =>
        validateFloorplanIntent(intent.requestedCapabilities).map(
          (diagnostic) => diagnostic.code
        )
      )
    ).toEqual([
      ["floorplan/unsupported-curved-boundaries"],
      [
        "floorplan/unsupported-plumbing-runs",
        "floorplan/unsupported-electrical-circuits",
        "floorplan/unsupported-hvac-runs",
      ],
    ]);
  });

  it("selects scenario-matched examples and injects the truthful capability contract", () => {
    const classroom = buildPromptContext("floorplan", {
      examples: 1,
      intent: { scenario: "classroom desks" },
    });
    expect(classroom.text).toContain("5th Grade Classroom");

    const unsupported = buildPromptContext("floorplan", {
      examples: 0,
      intent: { requestedCapabilities: ["curved-boundaries", "plumbing-runs"] },
    });
    expect(unsupported.text).toContain(
      "Requested but unsupported: curved-boundaries, plumbing-runs"
    );
    expect(unsupported.text).toContain("Do not fake these semantics");
  });

  it("reports unknown runtime capabilities instead of throwing from public helpers", () => {
    const unknown = "plumbing-run" as FloorplanCapability;
    expect(validateFloorplanIntent([unknown])).toMatchObject([
      {
        severity: "error",
        code: "floorplan/unknown-capability",
        fatal: true,
      },
    ]);

    const context = buildPromptContext("floorplan", {
      examples: 0,
      intent: { requestedCapabilities: [unknown] },
    });
    expect(context.text).toContain("Requested but unsupported: plumbing-run");
  });
});
