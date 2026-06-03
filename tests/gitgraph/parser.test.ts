import { describe, expect, it } from "vitest";
import { parseGitGraph, GitGraphParseError } from "../../src/diagrams/gitgraph/parser";

describe("gitgraph parser", () => {
  it("parses the canonical Mermaid sketch (branch + merge + tag)", () => {
    const ast = parseGitGraph(`gitGraph
  commit id: "init"
  branch develop
  checkout develop
  commit
  commit tag: "v0.1"
  checkout main
  merge develop tag: "v1.0"`);
    expect(ast.type).toBe("gitgraph");
    expect(ast.orientation).toBe("LR");
    expect(ast.mainBranchName).toBe("main");
    const kinds = ast.operations.map((o) => o.kind);
    expect(kinds).toEqual(["commit", "branch", "checkout", "commit", "commit", "checkout", "merge"]);
    const firstCommit = ast.operations[0];
    expect(firstCommit.kind === "commit" && firstCommit.id).toBe("init");
    const merge = ast.operations[6];
    expect(merge.kind === "merge" && merge.name).toBe("develop");
    expect(merge.kind === "merge" && merge.tag).toBe("v1.0");
  });

  it("accepts lowercase gitgraph and a trailing colon", () => {
    expect(parseGitGraph("gitgraph\n commit").operations).toHaveLength(1);
    expect(parseGitGraph("gitGraph:\n commit").operations).toHaveLength(1);
  });

  it("parses inline orientation header (gitGraph TB:)", () => {
    expect(parseGitGraph("gitGraph TB:\n commit").orientation).toBe("TB");
    expect(parseGitGraph("gitGraph LR:\n commit").orientation).toBe("LR");
    expect(parseGitGraph("gitGraph BT:\n commit").orientation).toBe("BT");
  });

  it("parses commit type and switch alias", () => {
    const ast = parseGitGraph(`gitGraph
  commit type: HIGHLIGHT
  branch feat
  switch feat
  commit type: REVERSE`);
    const c0 = ast.operations[0];
    expect(c0.kind === "commit" && c0.commitType).toBe("HIGHLIGHT");
    expect(ast.operations[2].kind).toBe("checkout"); // switch → checkout
    const c3 = ast.operations[3];
    expect(c3.kind === "commit" && c3.commitType).toBe("REVERSE");
  });

  it("parses cherry-pick with id and parent", () => {
    const ast = parseGitGraph(`gitGraph
  commit id: "A"
  cherry-pick id: "A" parent: "B"`);
    const cp = ast.operations[1];
    expect(cp.kind).toBe("cherry-pick");
    expect(cp.kind === "cherry-pick" && cp.id).toBe("A");
    expect(cp.kind === "cherry-pick" && cp.parent).toBe("B");
  });

  it("parses branch order override", () => {
    const ast = parseGitGraph(`gitGraph
  commit
  branch hotfix order: 3`);
    const b = ast.operations[1];
    expect(b.kind === "branch" && b.order).toBe(3);
  });

  it("honours a YAML frontmatter config block", () => {
    const ast = parseGitGraph(`---
config:
  gitGraph:
    mainBranchName: 'trunk'
    showCommitLabel: false
    rotateCommitLabel: false
---
gitGraph
  commit`);
    expect(ast.mainBranchName).toBe("trunk");
    expect(ast.showCommitLabel).toBe(false);
    expect(ast.rotateCommitLabel).toBe(false);
  });

  it("honours a %%{init}%% directive", () => {
    const ast = parseGitGraph(`%%{init: {'gitGraph': {'mainBranchName': 'release'}}}%%
gitGraph TB:
  commit`);
    expect(ast.mainBranchName).toBe("release");
    expect(ast.orientation).toBe("TB");
  });

  it("strips %% comments", () => {
    const ast = parseGitGraph(`gitGraph
  commit %% first commit
  %% a full-line comment
  commit`);
    expect(ast.operations).toHaveLength(2);
  });

  it("throws a typed error on a missing header", () => {
    expect(() => parseGitGraph("commit\ncommit")).toThrow(GitGraphParseError);
  });

  it("throws a typed error on an unknown operation", () => {
    expect(() => parseGitGraph("gitGraph\n rebase main")).toThrow(/unknown operation 'rebase'/);
  });

  it("throws on an unknown commit type", () => {
    expect(() => parseGitGraph("gitGraph\n commit type: SQUASH")).toThrow(/unknown commit type/);
  });
});
