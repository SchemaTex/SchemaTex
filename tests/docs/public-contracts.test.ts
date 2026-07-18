import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INTERACTIVE_DIAGRAM_COUNT,
  POSITION_EDITABLE_DIAGRAM_COUNT,
} from "../../src/core/interactive-capabilities";
import { SCHEMATEX_TOOL_DEFINITIONS } from "../../src/ai/tool-manifest";

const ROOT = process.cwd();
const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");

const REACT_EDITOR_PROPS = [
  "value",
  "onChange",
  "type",
  "theme",
  "fontFamily",
  "padding",
  "readOnly",
  "debounceMs",
  "className",
  "canvasClassName",
  "style",
  "ariaLabel",
  "labelEditorClassName",
  "labelEditorStyle",
  "selectedKey",
  "onSelect",
  "onPreviewChange",
  "onRender",
  "onError",
] as const;

describe("public SDK and documentation contracts", () => {
  it("documents every InteractiveSchematexDiagram prop in English and Chinese", () => {
    const source = read("src/react.tsx");
    const propsBlock = source.match(
      /export interface InteractiveSchematexDiagramProps \{([\s\S]*?)\n\}/,
    )?.[1];
    expect(propsBlock).toBeTruthy();

    const exportedProps = [...propsBlock!.matchAll(/^\s{2}(\w+)\??:/gm)].map(
      ([, name]) => name,
    );
    expect(exportedProps).toEqual(REACT_EDITOR_PROPS);

    for (const path of [
      "website/content/docs/interactive-editing.mdx",
      "website/content/docs/interactive-editing.zh-Hans.mdx",
    ]) {
      const doc = read(path);
      for (const prop of REACT_EDITOR_PROPS) {
        expect(doc, `${path} is missing ${prop}`).toContain(`| \`${prop}\``);
      }
      expect(doc).not.toContain("svgClassName");
    }
  });

  it("keeps public counts and the eight-tool claim derived from code", () => {
    const docs = [
      read("README.md"),
      read("README.zh-CN.md"),
      read("website/content/docs/interactive-editing.mdx"),
      read("website/content/docs/interactive-editing.zh-Hans.mdx"),
    ].join("\n");
    expect(docs).toContain(String(INTERACTIVE_DIAGRAM_COUNT));
    expect(docs).toContain(String(POSITION_EDITABLE_DIAGRAM_COUNT));

    expect(Object.keys(SCHEMATEX_TOOL_DEFINITIONS)).toHaveLength(8);
    expect(read("website/content/docs/ai-integration.mdx")).toContain(
      "eight tools",
    );
  });

  it("uses schematex.js.org as the only public website origin", () => {
    const publicDocs = [
      "README.md",
      "README.zh-CN.md",
      "CHANGELOG.md",
      "website/README.md",
      "assets/brand/README.md",
    ].map(read).join("\n");
    expect(publicDocs).toContain("https://schematex.js.org");
    expect(publicDocs).not.toContain("https://schematex.dev");
  });

  it("publishes the supported package and machine-discovery entry points", () => {
    const pkg = JSON.parse(read("package.json")) as {
      exports: Record<string, unknown>;
    };
    expect(Object.keys(pkg.exports)).toEqual(
      expect.arrayContaining([".", "./react", "./interactive", "./ai", "./ai/sdk"]),
    );

    for (const path of [
      "website/app/llms.txt/route.ts",
      "website/app/llms-full.txt/route.ts",
      "website/app/llms.mdx/docs/[[...slug]]/route.ts",
      "website/app/api/interactive-capabilities/route.ts",
    ]) {
      expect(read(path).length, `${path} should not be empty`).toBeGreaterThan(100);
    }

    const indexRoute = read("website/app/llms.txt/route.ts");
    expect(indexRoute).toContain("/api/interactive-capabilities");
    expect(indexRoute).toContain("/llms-full.txt");

    const sourceConfig = read("website/source.config.ts");
    expect(sourceConfig).toContain("node.name === 'Playground'");
    expect(sourceConfig).toContain("stringify: stringifyLlmMdx");
    expect(sourceConfig).toContain("SCHEMATEX_PLAYGROUND");
    expect(read("website/lib/llm-docs.ts")).toContain("SCHEMATEX_PLAYGROUND");
  });
});
