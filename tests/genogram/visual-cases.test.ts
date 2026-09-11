import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { renderResult } from "../../src/index";

test("divorce/remarriage stepchildren eval source renders valid with no diagnostics", () => {
  const source = readFileSync(new URL("../../visual-eval/cases/genogram-divorce-remarriage-stepchildren/source.sx", import.meta.url), "utf8");
  const result = renderResult(source);
  expect(result.status).toBe("valid");
  expect(result.diagnostics).toEqual([]);
  expect(result.svg).toMatch(/^<svg\b/);
  expect(result.svg.match(/class="[^"]*schematex-genogram-edge-secondary-step"/g)).toHaveLength(3);
});

test.each([
  "genogram-twins-and-pregnancy",
  "genogram-caregiver-burden-elderly",
])("%s eval source renders valid with no diagnostics", (id) => {
  const source = readFileSync(new URL(`../../visual-eval/cases/${id}/source.sx`, import.meta.url), "utf8");
  const result = renderResult(source);
  expect(result.status, JSON.stringify(result.diagnostics)).toBe("valid");
  expect(result.diagnostics).toEqual([]);
  expect(result.svg).toMatch(/^<svg\b/);
});
