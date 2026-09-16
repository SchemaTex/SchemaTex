import { describe, expect, it } from "vitest";
import { parseGenogram, ParseError } from "../../src/diagrams/genogram/parser";
import { renderResult } from "../../src/core/api";
import { layoutGenogram } from "../../src/diagrams/genogram/layout";

const config = { nodeWidth: 40, nodeHeight: 40, nodeSpacingX: 60, nodeSpacingY: 100 };

describe("genogram annotations", () => {
  it("attaches every identifier to the preceding person without creating relatives", () => {
    const source = `genogram
  parent [male, label: "First Parent"]
    @medical: "Diabetes"
    @occupation: "Teacher"
    @traits: "Patient"
    @notes: "Follow up"
    @custom-key: "Additional information"
  partner [female]
    @medical: "None"
  parent -- partner
    younger [male, 2005]
      @medical: "Asthma"
      @notes: "Uses an inhaler"
    older [female, 2000]
      @notes: "No concerns"
  outsider [unknown]
    @notes: "Separate household"`;
    const ast = parseGenogram(source);
    const plain = parseGenogram(source.split("\n").filter((line) => !line.trim().startsWith("@")).join("\n"));
    expect(ast.individuals).toHaveLength(5);
    expect(ast.individuals[0].annotations).toEqual({ medical: "Diabetes", occupation: "Teacher", traits: "Patient", notes: "Follow up", "custom-key": "Additional information" });
    expect(ast.individuals[1].annotations).toEqual({ medical: "None" });
    expect(ast.individuals[2].annotations).toEqual({ medical: "Asthma", notes: "Uses an inhaler" });
    expect(ast.individuals[3].annotations).toEqual({ notes: "No concerns" });
    expect(ast.individuals[4].annotations).toEqual({ notes: "Separate household" });
    expect(ast.relationships).toEqual(plain.relationships);
    const nodes = layoutGenogram(ast, config).nodes;
    const plainNodes = layoutGenogram(plain, config).nodes;
    expect(nodes.map((node) => [node.id, node.generation])).toEqual(plainNodes.map((node) => [node.id, node.generation]));
    expect(nodes.find((node) => node.id === "older")!.x).toBeLessThan(nodes.find((node) => node.id === "younger")!.x);
    const result = renderResult(source);
    expect(result.status).toBe("valid");
    expect(result.diagnostics).toEqual([]);
    const svg = result.svg;
    expect(svg).toContain('class="schematex-genogram-annotation" data-individual-id="younger"');
    expect(svg).toContain("medical: Asthma");
    expect(svg).toContain("custom-key: Additional information");
  });

  it("attaches annotations to an inline partner declaration before its children", () => {
    const ast = parseGenogram(`genogram
  a [male]
  a -- b [female]
    @notes: "Partner note"
    c [unknown]
      @medical: "Child note"`);
    expect(ast.individuals).toHaveLength(3);
    expect(ast.individuals[1].annotations).toEqual({ notes: "Partner note" });
    expect(ast.individuals[2].annotations).toEqual({ medical: "Child note" });
    expect(ast.relationships).toHaveLength(2);
  });

  it.each([
    'genogram\n  @medical: "Orphan"',
    'genogram\n  a [male]\n  b [female]\n  a -- b\n    @medical: "Orphan"',
    'genogram\n  a [male]\n  legend: off\n    @medical: "Orphan"',
  ])("rejects annotations without a preceding individual", (source) => {
    expect(() => parseGenogram(source)).toThrow(ParseError);
    expect(() => parseGenogram(source)).toThrow("preceding individual");
    expect(renderResult(source).status).toBe("invalid");
    expect(() => parseGenogram(source)).toThrow(source.split("\n").at(-1)!);
  });

  it.each([
    '@medical: unquoted', '@medical "Missing colon"', '@: "Missing key"',
    '@123: "Invalid identifier"', '@notes: "Unclosed', '@notes: "OK" trailing',
    '@notes: "First" "Second"',
  ])("rejects malformed annotation %s and includes the offending line", (line) => {
    const source = `genogram\n  a [male]\n    ${line}`;
    expect(() => parseGenogram(source)).toThrow("Invalid annotation");
    expect(renderResult(source).status).toBe("invalid");
    expect(() => parseGenogram(source)).toThrow(line);
  });

  it.each(['@notes: "Unindented"', '  @notes: "Same indent"'])("requires deeper indentation: %s", (line) => {
    expect(() => parseGenogram(`genogram\n  a [male]\n${line}`)).toThrow(line);
  });

  it("does not interpret an @ inside a person's label as an annotation", () => {
    const ast = parseGenogram('genogram\n  a [female, label: "Works @ Home"]');
    expect(ast.individuals).toHaveLength(1);
    expect(ast.individuals[0].label).toBe("Works @ Home");
    expect(ast.individuals[0].annotations).toBeUndefined();
  });
});
