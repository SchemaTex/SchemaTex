import { describe, it, expect } from "vitest";
import {
  stripArtifactWrappers,
  parseFrontmatter,
  stripLineComment,
  isBlankOrComment,
} from "../../src/core/dsl-preprocess";

describe("stripArtifactWrappers", () => {
  it("unwraps nested Markdown and artifact framing", () => {
    expect(
      stripArtifactWrappers(
        "\n```mermaid\n<artifact title='X' type='diagram'>\nflowchart TD\n  A --> B\n</artifact>\n```"
      )
    ).toBe("flowchart TD\n  A --> B");
  });

  it("removes Anthropic control tags while preserving enclosed DSL", () => {
    expect(
      stripArtifactWrappers(
        'flowchart TD\n<invoke name="render">\n<parameter name="dsl">\n  A --> B\n</parameter>\n</invoke>'
      )
    ).toBe("flowchart TD\n\n\n  A --> B\n\n");
  });

  it("removes standalone scalar parameter lines completely", () => {
    expect(
      stripArtifactWrappers(
        'timeline\n<parameter name="open" string="true">false</parameter>\n2026: "Launch"'
      )
    ).toBe('timeline\n2026: "Launch"');
  });

  it("removes DeepSeek fullwidth-pipe tokens", () => {
    expect(
      stripArtifactWrappers(
        "flowchart TD\n  A --> B\n</｜｜DSML｜｜parameter>\n  B --> C"
      )
    ).toBe("flowchart TD\n  A --> B\n\n  B --> C");
  });

  it("returns clean DSL byte-for-byte and preserves legitimate angle brackets", () => {
    const clean = "circuit\n  <ep> --color-- <ep>";
    expect(stripArtifactWrappers(clean)).toBe(clean);
  });
});

describe("parseFrontmatter", () => {
  it("returns empty data when no --- block is present", () => {
    const r = parseFrontmatter("flowchart TD\n  A --> B\n");
    expect(r.data).toEqual({});
    expect(r.body).toContain("flowchart TD");
  });

  it("parses a single key:value pair", () => {
    const r = parseFrontmatter("---\ntitle: Hello\n---\nflowchart TD\n");
    expect(r.data.title).toBe("Hello");
    expect(r.body.startsWith("flowchart TD")).toBe(true);
  });

  it("strips matching outer quotes from a value", () => {
    expect(parseFrontmatter(`---\ntitle: "Q"\n---\n`).data.title).toBe("Q");
    expect(parseFrontmatter(`---\ntitle: 'Q'\n---\n`).data.title).toBe("Q");
    expect(parseFrontmatter(`---\ntitle: “Q”\n---\n`).data.title).toBe("Q");
  });

  it("preserves leading blank lines before the opener", () => {
    const r = parseFrontmatter("\n\n---\ntitle: X\n---\nbody\n");
    expect(r.data.title).toBe("X");
  });

  it("treats an unclosed --- block as not-frontmatter", () => {
    const r = parseFrontmatter("---\ntitle: X\nflowchart\n");
    expect(r.data).toEqual({});
    expect(r.body).toContain("---");
  });

  it("treats a malformed line inside the block as not-frontmatter", () => {
    const r = parseFrontmatter("---\nno colon here\n---\nbody\n");
    expect(r.data).toEqual({});
  });

  it("preserves the body trailing newline structure", () => {
    const r = parseFrontmatter("---\ntitle: X\n---\nfoo\nbar\n");
    expect(r.body).toBe("foo\nbar\n");
  });

  it("ignores `#` comment lines inside the block", () => {
    const r = parseFrontmatter("---\n# c\ntitle: X\n---\n");
    expect(r.data.title).toBe("X");
  });
});

describe("stripLineComment", () => {
  it("strips #, //, and %% comments", () => {
    expect(stripLineComment("foo # bar")).toBe("foo ");
    expect(stripLineComment("foo // bar")).toBe("foo ");
    expect(stripLineComment("foo %% bar")).toBe("foo ");
  });

  it("respects double-quoted regions", () => {
    expect(stripLineComment(`label: "#ff0000"`)).toBe(`label: "#ff0000"`);
    expect(stripLineComment(`url: "https://x.com/y"`)).toBe(
      `url: "https://x.com/y"`
    );
    expect(stripLineComment(`a: "x %% y"`)).toBe(`a: "x %% y"`);
  });

  it("treats // inside path-like values as a comment outside quotes", () => {
    // Conservative: outside quotes we always treat // as a comment.
    expect(stripLineComment("http://x.com")).toBe("http:");
  });

  it("returns the empty string for a pure-comment line", () => {
    expect(stripLineComment("# only a comment").trim()).toBe("");
    expect(stripLineComment("%% mermaid style").trim()).toBe("");
  });
});

describe("isBlankOrComment", () => {
  it("is true for empty, whitespace, and pure-comment lines", () => {
    expect(isBlankOrComment("")).toBe(true);
    expect(isBlankOrComment("   ")).toBe(true);
    expect(isBlankOrComment("# hi")).toBe(true);
    expect(isBlankOrComment("// hi")).toBe(true);
    expect(isBlankOrComment("%% hi")).toBe(true);
  });

  it("is false when any non-comment content is present", () => {
    expect(isBlankOrComment("foo # x")).toBe(false);
    expect(isBlankOrComment("foo")).toBe(false);
  });
});
