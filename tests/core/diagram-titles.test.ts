import { describe, expect, it } from "vitest";
import { parse, renderResult } from "../../src/core/api";
import { escapeXml } from "../../src/core/svg";
import { getExamples, listDiagrams } from "../../src/ai";
import { renderGitGraph } from "../../src/diagrams/gitgraph/renderer";
import type { DiagramType } from "../../src/core/types";

function diagramTitle(ast: unknown): string | undefined {
  if (typeof ast !== "object" || ast === null) return undefined;
  if ("title" in ast && typeof ast.title === "string") return ast.title;
  if ("metadata" in ast && typeof ast.metadata === "object" && ast.metadata !== null &&
      "title" in ast.metadata && typeof ast.metadata.title === "string") return ast.metadata.title;
  return undefined;
}

function visibleText(svg: string): string[] {
  return [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map(match => match[1]);
}

describe("authored titles survive the public render path", () => {
  // Exercise every catalogued engine using its own DSL example, including
  // forced-type header recovery (the visual evaluator's entry point).
  for (const diagram of listDiagrams()) {
    const example = getExamples(diagram.type, { limit: 1 }).examples[0]!;
    it(`${diagram.type}: draws its accepted title`, () => {
      const title = diagramTitle(parse(example.dsl, { type: diagram.type }));
      const result = renderResult(example.dsl, { type: diagram.type });
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      if (title) expect(visibleText(result.svg)).toContain(escapeXml(title));
    });

    // These grammars use # as a native comment; the others reserve it for
    // content or do not accept comments before their header.
    if (["mindmap", "phylo", "sociogram", "flowchart", "rbd", "gitgraph"].includes(diagram.type)) continue;
    it(`${diagram.type}: a native leading comment preserves its title`, () => {
      const title = diagramTitle(parse(example.dsl, { type: diagram.type }));
      const source = `# Context for the reader\n${example.dsl}`;
      expect(diagramTitle(parse(source, { type: diagram.type }))).toBe(title);
      const result = renderResult(source, { type: diagram.type });
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      if (title) expect(visibleText(result.svg)).toContain(escapeXml(title));
    });

  }
});

const title = "Review & delivery";
const samples: { type: DiagramType; source: string }[] = [
  { type: "epc", source: `epc "${title}"\nevent E "Received"\nfunction F "Process"\nevent D "Done"\nE -> F -> D` },
  { type: "idef0", source: `idef0 "${title}"\nnode A12\nfunction A1 "Process"` },
  { type: "markov", source: `markov "${title}"\nstate A\nA -> A : 1` },
  { type: "bpmn", source: `bpmn\ntitle: "${title}"\npool "Service" {\nlane "Worker" {\nA: start "Begin"\nB: end "End"\n}\n}\nflows\nA --> B` },
  { type: "ecomap", source: `ecomap "${title}"\ncenter: person [female]\nwork [label: "Work"]\nperson --- work` },
  { type: "pedigree", source: `pedigree "${title}"\nperson [female]` },
  { type: "gitgraph", source: `---\ntitle: ${title}\n---\ngitGraph TB:\ncommit` },
];

describe("shared visible title placement", () => {

  it.each(samples.filter(sample => ["epc", "idef0", "markov"].includes(sample.type)))(
    "$type retains its header title after a native leading comment",
    ({ type, source }) => {
      const result = renderResult(`# Context for the reader\n${source}`, { type });
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      expect(visibleText(result.svg)).toContain(escapeXml(title));
    },
  );

  it("fills the IDEF0 form's title, node and number cells", () => {
    const source = samples.find(sample => sample.type === "idef0")!.source;
    const result = renderResult(`# Context\n${source}`, { type: "idef0" });
    const block = result.svg.match(/<g class="sx-idef0-titleblock">([\s\S]*?)<\/g>/)![1];
    expect(visibleText(block)).toEqual(["NODE", "A12", "TITLE", escapeXml(title), "NUMBER", "A12"]);
  });

  it("preserves gitgraph orientation alongside a frontmatter title", () => {
    const source = samples.find(sample => sample.type === "gitgraph")!.source;
    expect(parse(source)).toMatchObject({ title, orientation: "TB" });
  });

  it("draws gitgraph's native configuration title too", () => {
    const svg = renderGitGraph(`---\ntitle: ${title}\n---\ngitGraph\ncommit`);
    expect(visibleText(svg)).toContain(escapeXml(title));
  });
});
