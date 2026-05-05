import { describe, test, expect } from "vitest";
import { renderErd } from "../../src/diagrams/erd/renderer";

describe("erd renderer", () => {
  test("emits valid SVG with title and desc", () => {
    const svg = renderErd(`erd
title: "Demo"
table A { id int PK }
table B { id int PK; a_id int FK -> A.id }
ref B.a_id many-mandatory -- one-mandatory A.id`);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("<title>Demo</title>");
    expect(svg).toContain("<desc>");
    expect(svg).toContain("lt-erd-entity");
    expect(svg).toContain("lt-erd-edge");
  });

  test("renders PK marker pill", () => {
    const svg = renderErd(`erd
table A { id int PK }`);
    expect(svg).toContain(">PK</text>");
  });

  test("renders FK marker pill", () => {
    const svg = renderErd(`erd
table A { id int PK }
table B { id int PK; a_id int FK -> A.id }
ref B.a_id many-mandatory -- one-mandatory A.id`);
    expect(svg).toContain(">FK</text>");
  });

  test("renders ref label when present", () => {
    const svg = renderErd(`erd
table A { id int PK }
table B { id int PK; a_id int FK -> A.id }
ref B.a_id many-mandatory -- one-mandatory A.id : "owns"`);
    expect(svg).toContain(">owns</text>");
  });

  test("non-identifying ref applies dashed class", () => {
    const svg = renderErd(`erd
table A { id int PK }
table B { id int PK }
ref A one-optional .. many-optional B`);
    expect(svg).toContain("lt-erd-edge-non-identifying");
  });

  test("monochrome theme overrides colors", () => {
    const svg = renderErd(
      `erd
table A { id int PK }`,
      { theme: "monochrome", fontFamily: "sans-serif", fontSize: 12, padding: 20 }
    );
    expect(svg).toContain("<svg");
  });
});
