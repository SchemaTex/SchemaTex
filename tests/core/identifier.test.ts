import { describe, expect, test } from "vitest";
import {
  isIdentifier,
  isQualifiedIdentifier,
  readIdentifier,
} from "../../src/core/identifier";

describe("shared Unicode identifier grammar", () => {
  test.each([
    "الجد1",
    "原因1",
    "סבא1",
    "Diáconos",
    "Avô1",
    "node_2",
    "phase-one",
    "Cafe\u0301",
  ])("accepts %s", (identifier) => {
    expect(isIdentifier(identifier)).toBe(true);
    expect(readIdentifier(`${identifier} --> next`)).toEqual({
      value: identifier,
      end: identifier.length,
    });
  });

  test.each(["9bad", "-node", "has space", "has.dot", "bad!"])(
    "rejects ambiguous identifier %s",
    (identifier) => {
      expect(isIdentifier(identifier)).toBe(false);
    }
  );

  test("supports dot-qualified Unicode identifiers where the DSL allows qualification", () => {
    expect(isQualifiedIdentifier("domínio.原因")).toBe(true);
    expect(isQualifiedIdentifier("domínio..原因")).toBe(false);
  });
});
