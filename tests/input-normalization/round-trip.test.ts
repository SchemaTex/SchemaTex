import { describe, expect, test } from "vitest";
import { normalizeDslInput } from "../../src/core/dsl-preprocess";
import { parseResult, renderResult } from "../../src/core/api";
import { validateDsl } from "../../src/ai";

const flow = "flowchart TD\n  A --> B";
const cases: Array<[string, string, string]> = [
  ["fence on line 1", `\`\`\`mermaid\n${flow}\n\`\`\``, flow],
  ["fence on line 2", `flowchart TD\n\`\`\`mermaid\n${flow}\n\`\`\``, flow],
  ["prose before and after", `Here is the diagram:\n\`\`\`mermaid\n${flow}\n\`\`\`\nExplanation.`, flow],
  ["frontmatter", `---\ntheme: default\n---\n${flow}`, flow],
  ["nested YAML frontmatter", `---\nconfig:\n  palette:\n    - blue\n---\n${flow}`, flow],
  ["empty frontmatter", `---\n---\n${flow}`, flow],
  ["artifact wrapper", `<artifact type="diagram">\n${flow}\n</artifact>`, flow],
  ["two fences choose largest", `\`\`\`mermaid\nflowchart TD\nX\n\`\`\`\n\`\`\`mermaid\n${flow}\n\`\`\``, flow],
  ["language preference precedes size", `\`\`\`javascript\nconsole.log('a much longer block of unrelated code');\n\`\`\`\n\`\`\`mermaid\n${flow}\n\`\`\``, flow],
  ["empty info preferred over unrelated language", `\`\`\`python\nprint("a considerably longer unrelated code block")\n\`\`\`\n\`\`\`\n${flow}\n\`\`\``, flow],
  ["no info string", `\`\`\`\n${flow}\n\`\`\``, flow],
  ["other language if sole block", `\`\`\`text\n${flow}\n\`\`\``, flow],
  ["tilde fence", `~~~timeline\ntimeline\n2024 : "Launch"\n~~~`, 'timeline\n2024 : "Launch"'],
  ["blockdiagram fence", 'Prose\n```blockdiagram\nblockdiagram\nA = block("Plant")\n```', 'blockdiagram\nA = block("Plant")'],
  ["genogram fence", 'Prose\n```schematex\ngenogram\n  a [male]\n```', 'genogram\n  a [male]'],
  ["combined wrappers", `<artifact type="diagram">\n\`\`\`mermaid\n---\ntheme: default\n---\n${flow}\n\`\`\`\n</artifact>`, flow],
  ["CRLF", `Prose\r\n\`\`\`mermaid\r\n${flow.replace(/\n/g, "\r\n")}\r\n\`\`\``, flow.replace(/\n/g, "\r\n")],
];

describe("shared input normalization round trips", () => {
  test.each(cases)("%s", (_name, source, clean) => {
    const normalized = normalizeDslInput(source).text;
    expect(normalized.trim()).toBe(clean);
    expect(normalized.length).toBe(source.length);
    expect(normalizeDslInput(normalized).text).toBe(normalized);
    expect(validateDsl(undefined, source).ok).toBe(true);
    const rendered = renderResult(source);
    expect(rendered.ok, JSON.stringify(rendered.diagnostics)).toBe(true);
    expect(rendered.svg).toBe(renderResult(clean).svg);
  });

  test("outer fence protects a shorter fence inside a multiline quoted label", () => {
    const clean = 'blockdiagram\nA = block("Before\n```\nAfter")';
    const source = `Prose\n\`\`\`\`schematex\n${clean}\n\`\`\`\``;
    expect(normalizeDslInput(source).text.trim()).toBe(clean);
    expect(renderResult(source).ok).toBe(true);
    expect(renderResult(source).svg).toBe(renderResult(clean).svg);
  });

  test.each([
    flow,
    'flowchart TD\nA["Literal ``` inside a label"] --> B',
    'blockdiagram\nA = block("Before\n```mermaid\nLiteral content\n```\nAfter")',
    'blockdiagram\nA = block("Plant")\n',
    'blockdiagram\nA = block("Literal <parameter> and </parameter> tags")',
    'timeline\n2024 : "Launch"\n',
    'genogram\n  a [male]\n',
    'flowchart TD\r\n  A["Escaped \\" quote and ```"] --> B\r\n',
  ])("already-valid input is byte-identical: %j", (source) => {
    expect(parseResult(source).ok).toBe(true);
    expect(normalizeDslInput(source).text).toBe(source);
  });

  test.each([
    ['flowchart TD\nA --> ?', 2],
    ['blockdiagram\nnot a statement', 2],
    ['timeline\nsection S\n  no colon', 3],
  ])("diagnostics retain original line numbers: %j", (body, bodyLine) => {
    const source = `Prose\n\`\`\`schematex\n${body}\n\`\`\``;
    const expectedLine = Number(bodyLine) + 2;
    const parsed = parseResult(source);
    const rendered = renderResult(source);
    const validated = validateDsl(undefined, source);
    expect(parsed.ok).toBe(false);
    expect(rendered.ok).toBe(false);
    expect(validated.ok).toBe(false);
    expect(parsed.diagnostics[0]?.line).toBe(expectedLine);
    expect(rendered.diagnostics[0]?.line).toBe(expectedLine);
    if (!validated.ok) expect(validated.errors[0]?.line).toBe(expectedLine);
    expect(parsed.diagnostics[0]?.message).toContain(String(expectedLine));
  });
});

test.each([
  '---\ntitle: "Title"\n---\nflowchart TD\nA --> ?',
  '<artifact type="diagram">\nflowchart TD\nA --> ?\n</artifact>',
  'Prose\r\n```mermaid\r\nflowchart TD\r\nA --> ?\r\n```',
])("wrapper diagnostics retain authored positions: %j", (source) => {
  const line = source.split(/\r?\n/).findIndex((entry) => entry.includes("?")) + 1;
  const result = renderResult(source);
  expect(result.ok).toBe(false);
  expect(result.diagnostics[0]?.line).toBe(line);
  expect(result.diagnostics[0]?.column).toBe(7);
});
