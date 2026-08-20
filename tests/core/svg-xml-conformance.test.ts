import { Resvg } from "@resvg/resvg-js";
import { describe, expect, it } from "vitest";
import { EXAMPLES } from "../../src/ai/_generated";
import { renderDsl } from "../../src/ai/tools";

describe("official example SVG XML conformance", () => {
  for (const example of EXAMPLES) {
    it(`${example.diagram}: ${example.slug}`, () => {
      const result = renderDsl(example.diagram, example.dsl);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Resvg's native XML parser is intentionally strict: malformed entity
      // references such as a raw `&` in title/desc text throw here.
      try {
        new Resvg(result.svg, { font: { loadSystemFonts: false } });
      } catch (error) {
        const location = /at (\d+):(\d+)/.exec(String(error));
        const line = location ? result.svg.split("\n")[Number(location[1]) - 1] : undefined;
        throw new Error(`${example.slug}: ${String(error)}${line ? `\n${line}` : ""}`);
      }
    });
  }
});
