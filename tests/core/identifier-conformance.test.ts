import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { getExamples } from "../../src/ai";
import { parseResult } from "../../src/core/api";
import type { DiagramType } from "../../src/core/types";

const OFFICIAL_EXAMPLE_IDS: Partial<Record<DiagramType, string>> = {
  blockdiagram: "err",
  bpmn: "G1",
  breadboard: "r1",
  ecomap: "therapist",
  entity: "acme_fund",
  epc: "E1",
  erd: "Enrollment",
  eventtree: "REL",
  faulttree: "PA",
  fbd: "MotorOut",
  flowchart: "rollback",
  idef0: "A1",
  logic: "Y_nand",
  orgchart: "lead_growth",
  pert: "A",
  pid: "FIC-101",
  sfc: "S0",
  sociogram: "associate1",
  state: "Yellow",
  umlclass: "AbstractShape",
  usecase: "Customer",
  venn: "mobile",
};

const UNICODE_IDENTIFIERS = ["الجد1", "原因1", "סבא1"] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceIdentifier(dsl: string, identifier: string, replacement: string): string {
  return dsl.replace(
    new RegExp(
      `(?<![\\p{L}\\p{N}\\p{M}_-])${escapeRegex(identifier)}(?![\\p{L}\\p{N}\\p{M}_-])`,
      "gu"
    ),
    replacement
  );
}

describe("Unicode identifier parser conformance", () => {
  for (const [type, identifier] of Object.entries(OFFICIAL_EXAMPLE_IDS) as Array<
    [DiagramType, string]
  >) {
    test.each(UNICODE_IDENTIFIERS)(
      `${type} official example accepts %s in place of ${identifier}`,
      (replacement) => {
        const example = getExamples(type, { limit: 1 }).examples[0];
        expect(example, `${type} must keep an official example`).toBeDefined();
        const mutated = replaceIdentifier(example!.dsl, identifier, replacement);
        expect(mutated, `${identifier} must occur as an identifier in ${type}`).not.toBe(
          example!.dsl
        );
        const result = parseResult(mutated, { type });
        expect(
          result.ok,
          result.ok ? undefined : JSON.stringify(result.diagnostics)
        ).toBe(true);
      }
    );
  }

  test.each(UNICODE_IDENTIFIERS)(
    "fishbone structured category accepts %s",
    (identifier) => {
      const result = parseResult(
        `fishbone "Cause"\neffect "Delay"\ncategory ${identifier} "People"\n${identifier}: "Understaffed"`,
        { type: "fishbone" }
      );
      expect(result.ok).toBe(true);
    }
  );

  test.each(UNICODE_IDENTIFIERS)("pedigree individual accepts %s", (identifier) => {
    const result = parseResult(
      `pedigree\n${identifier} [male]\nparent2 [female]\n${identifier} -- parent2`,
      { type: "pedigree" }
    );
    expect(result.ok).toBe(true);
  });

  test("every parser wired to the shared identifier grammar has a conformance fixture", () => {
    const diagramsDir = fileURLToPath(
      new URL("../../src/diagrams/", import.meta.url)
    );
    const wired = readdirSync(diagramsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((type) => {
        try {
          return readFileSync(`${diagramsDir}/${type}/parser.ts`, "utf8").includes(
            "core/identifier"
          );
        } catch {
          return false;
        }
      })
      .sort();
    const covered = [
      ...Object.keys(OFFICIAL_EXAMPLE_IDS),
      "fishbone",
      "pedigree",
    ].sort();
    expect(wired).toEqual(covered);
  });
});
