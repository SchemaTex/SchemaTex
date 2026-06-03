import { describe, expect, it } from "vitest";
import { gitgraph } from "../../src/diagrams/gitgraph";
import { renderGitGraph } from "../../src/diagrams/gitgraph/renderer";

describe("gitgraph plugin detect", () => {
  it("matches Mermaid headers gitGraph / gitGraph: / gitgraph", () => {
    expect(gitgraph.detect("gitGraph\n commit")).toBe(true);
    expect(gitgraph.detect("gitGraph:\n commit")).toBe(true);
    expect(gitgraph.detect("gitgraph LR:\n commit")).toBe(true);
    expect(gitgraph.detect("  gitGraph\n commit")).toBe(true);
    expect(gitgraph.detect("flowchart TD\n a-->b")).toBe(false);
  });

  it("exposes the gitgraph type id", () => {
    expect(gitgraph.type).toBe("gitgraph");
  });
});

describe("gitgraph renderer (semantic SVG)", () => {
  const dsl = `gitGraph
  commit id: "init"
  branch develop
  checkout develop
  commit id: "d1"
  commit tag: "v0.1"
  checkout main
  merge develop tag: "v1.0"
  branch feature
  commit id: "f1" type: HIGHLIGHT
  checkout main
  cherry-pick id: "f1"
  merge feature`;

  it("renders a well-formed semantic SVG", () => {
    const svg = renderGitGraph(dsl);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
    expect(svg).toContain('data-diagram-type="gitgraph"');
  });

  it("has no inline style attributes", () => {
    const svg = renderGitGraph(dsl);
    expect(svg).not.toMatch(/\sstyle="/);
    // colours live in a <style> block instead.
    expect(svg).toContain("<style");
  });

  it("draws lane lines and colour-matched branch pills", () => {
    const svg = renderGitGraph(dsl);
    expect(svg).toContain("sx-gg-lane");
    expect(svg).toContain("sx-gg-pill");
    expect(svg).toContain('data-branch="develop"');
    expect(svg).toContain('data-branch="feature"');
  });

  it("renders distinct node styles: dot, hollow merge, open-square highlight", () => {
    const svg = renderGitGraph(dsl);
    expect(svg).toContain("sx-gg-dot");
    expect(svg).toContain("sx-gg-merge");
    expect(svg).toContain("sx-gg-highlight");
    expect(svg).toContain('data-merge="true"');
    expect(svg).toContain('data-type="HIGHLIGHT"');
  });

  it("renders tags, rotated commit ids, and a cherry-pick marker", () => {
    const svg = renderGitGraph(dsl);
    expect(svg).toContain("sx-gg-tag");
    expect(svg).toContain("v0.1");
    expect(svg).toContain("v1.0");
    expect(svg).toContain("sx-gg-id");
    expect(svg).toContain("rotate(45");
    expect(svg).toContain("sx-gg-cherry");
    expect(svg).toContain("data-cherry-pick");
  });

  it("commit ids are not rotated when rotateCommitLabel is false", () => {
    const svg = renderGitGraph(`---
config:
  gitGraph:
    rotateCommitLabel: false
---
gitGraph
  commit id: "z"`);
    expect(svg).toContain("sx-gg-id");
    expect(svg).not.toContain("rotate(45");
  });

  it("drops lane lines and pills when showBranches is false", () => {
    const svg = renderGitGraph(`---
config:
  gitGraph:
    showBranches: false
---
gitGraph
  commit
  branch dev
  commit`);
    expect(svg).not.toContain("sx-gg-lane");
    expect(svg).not.toContain("sx-gg-pill");
    expect(svg).toContain("sx-gg-dot");
  });

  it("renders a dark theme palette", () => {
    const svg = renderGitGraph("gitGraph\n commit", { theme: "dark", fontFamily: "sans", fontSize: 12, padding: 0 });
    expect(svg).toContain("#1e1e2e");
  });
});
