import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  InteractiveSchematexDiagram,
  SchematexDiagram,
} from "../../src/react";

const DSL = "flowchart\nA[Start] --> B[End]";

describe("React viewport markup", () => {
  it("keeps the read-only renderer single-layer when viewport is omitted", () => {
    const html = renderToStaticMarkup(createElement(SchematexDiagram, {
      dsl: DSL,
      className: "diagram",
    }));

    expect(html).toMatch(/^<div class="diagram">/);
    expect(html).not.toContain("data-schematex-viewport");
  });

  it("adds the transform host only when the read-only viewport is enabled", () => {
    const html = renderToStaticMarkup(createElement(SchematexDiagram, {
      dsl: DSL,
      viewport: true,
    }));

    expect(html).toContain('data-schematex-viewport="true"');
    expect(html).toContain('data-schematex-viewport-host="true"');
  });

  it("does not opt the interactive editor into viewport behavior by default", () => {
    const html = renderToStaticMarkup(createElement(InteractiveSchematexDiagram, {
      value: DSL,
      onChange: () => {},
    }));

    expect(html).toContain('data-schematex-editor="true"');
    expect(html).not.toContain("data-schematex-viewport=");
    expect(html).not.toContain("data-schematex-viewport-host=");
  });
});
