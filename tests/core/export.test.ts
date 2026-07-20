import { describe, expect, test } from "vitest";
import { withWhiteSvgBackground } from "../../src/export";

describe("export backgrounds", () => {
  test("adds one opaque layer after accessible SVG metadata", () => {
    const input = '<svg viewBox="0 0 10 10"><title>T</title><desc>D</desc><path d="M0 0"/></svg>';
    const output = withWhiteSvgBackground(input);

    expect(output).toContain('fill="#ffffff"');
    expect(output.indexOf("</desc>")).toBeLessThan(output.indexOf("data-sx-export-background"));
    expect(output.indexOf("data-sx-export-background")).toBeLessThan(output.indexOf("<path"));
    expect(withWhiteSvgBackground(output)).toBe(output);
  });

  test("leaves non-SVG input unchanged", () => {
    expect(withWhiteSvgBackground("not svg")).toBe("not svg");
  });
});
