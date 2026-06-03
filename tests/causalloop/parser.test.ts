import { describe, expect, it } from "vitest";
import { parseCausalLoop, CausalLoopParseError } from "../../src/diagrams/causalloop/parser";

describe("causalloop parser", () => {
  it("parses the header keyword and a quoted title", () => {
    const ast = parseCausalLoop(`causalloop "Adoption model"
"Adoption rate" -> Adopters : +
Adopters -> "Adoption rate" : +`);
    expect(ast.type).toBe("causalloop");
    expect(ast.title).toBe("Adoption model");
    expect(ast.links).toHaveLength(2);
  });

  it("accepts the cld alias header", () => {
    const ast = parseCausalLoop(`cld
A -> B : +
B -> A : +`);
    expect(ast.links).toHaveLength(2);
  });

  it("auto-creates variables from links", () => {
    const ast = parseCausalLoop(`cld
A -> B : +`);
    expect(ast.variables.map((v) => v.id).sort()).toEqual(["A", "B"]);
    expect(ast.variables.every((v) => v.autoCreated)).toBe(true);
  });

  it("normalises polarity aliases s/o/same/opposite to +/−", () => {
    const ast = parseCausalLoop(`cld
A -> B : s
B -> C : o
C -> D : same
D -> E : opposite
E -> A : +`);
    expect(ast.links.map((l) => l.polarity)).toEqual(["+", "-", "+", "-", "+"]);
  });

  it("parses polarity with and without a colon", () => {
    const ast = parseCausalLoop(`cld
A -> B +
B -> A : -`);
    expect(ast.links[0]!.polarity).toBe("+");
    expect(ast.links[1]!.polarity).toBe("-");
  });

  it("parses a delay marker", () => {
    const ast = parseCausalLoop(`cld
"Training quality" -> "Salesperson skills" : + delay
"Salesperson skills" -> "Training quality" : +`);
    expect(ast.links[0]!.delay).toBe(true);
    expect(ast.links[1]!.delay).toBeUndefined();
  });

  it("parses the ~delay form too", () => {
    const ast = parseCausalLoop(`cld
A -> B : + ~delay
B -> A : +`);
    expect(ast.links[0]!.delay).toBe(true);
  });

  it("handles CJK corner-bracket quotes", () => {
    const ast = parseCausalLoop(`cld
「人口」 -> 「出生」 : +
「出生」 -> 「人口」 : +`);
    expect(ast.variables.map((v) => v.id)).toContain("人口");
  });

  it("parses explicit loop phrase annotations", () => {
    const ast = parseCausalLoop(`cld
A -> B : +
B -> A : +
loop R1 "Word of mouth"`);
    expect(ast.annotations).toEqual([{ id: "R1", phrase: "Word of mouth" }]);
  });

  it("parses a var declaration that fixes a label", () => {
    const ast = parseCausalLoop(`cld
var "Adoption rate"
"Adoption rate" -> Adopters : +
Adopters -> "Adoption rate" : +`);
    const v = ast.variables.find((x) => x.id === "Adoption rate");
    expect(v?.autoCreated).toBeFalsy();
  });

  it("throws on a link missing polarity", () => {
    expect(() => parseCausalLoop(`cld
A -> B`)).toThrow(CausalLoopParseError);
  });

  it("throws on an empty diagram with no links", () => {
    expect(() => parseCausalLoop(`cld`)).toThrow(CausalLoopParseError);
  });
});
