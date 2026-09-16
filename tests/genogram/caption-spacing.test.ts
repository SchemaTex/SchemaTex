import { describe, expect, it } from "vitest";
import { genogram } from "../../src/diagrams/genogram";
import { estimateTextWidth } from "../../src/core/text-metrics";

// Check the emitted text geometry, including bounds, without rasterizing SVG.
describe("genogram caption spacing", () => {
  it.each([8, 12, 24])("reserves the complete captions at font size %s", (fontSize) => {
    const svg = genogram.render(`genogram
  a [male, 1940, label: "Maximilian Montgomery-Williamson"]
    @medical: "Coronary artery disease; type 2 diabetes"
  b [female, 1942, label: "Alexandra Montgomery-Williamson"]
    @occupation: "International community health coordinator"
  a -- b
    c [female, 1970, label: "山田美智子山田美智子山田美智子"]
    d [male, dob: "1972-01-01", label: "WWWWWWWWWWWWWWWWWW"]
      @notes: "Continued observation"
  e [unknown, label: "A neighbouring household with a long caption", note: "A lengthy note belonging to this household"]`, {
      fontSize, fontFamily: "system-ui", theme: "default", padding: 20,
    });
    const bounds = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)!;
    const captions = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)" class="schematex-genogram-(label|vitals|note|annotation)"[^>]*>([^<]*)<\/text>/g)].map((match) => ({
      x: Number(match[1]), y: Number(match[2]),
      width: estimateTextWidth(match[4], match[3] === "label" ? fontSize : Math.max(9, fontSize - 1)),
      height: fontSize, text: match[4],
    }));
    expect(captions).toHaveLength(10);
    expect(captions.some((caption) => caption.text === "Maximilian Montgomery-Williamson (b. 1940)")).toBe(true);
    for (const caption of captions) {
      expect(caption.x - caption.width / 2).toBeGreaterThanOrEqual(0);
      expect(caption.x + caption.width / 2).toBeLessThanOrEqual(Number(bounds[1]));
      expect(caption.y).toBeLessThanOrEqual(Number(bounds[2]));
    }
    for (let i = 0; i < captions.length; i++) {
      for (const other of captions.slice(i + 1)) {
        const caption = captions[i];
        const overlapX = Math.abs(caption.x - other.x) < (caption.width + other.width) / 2;
        const overlapY = Math.abs(caption.y - other.y) < fontSize;
        expect(overlapX && overlapY, `${caption.text} overlaps ${other.text}`).toBe(false);
      }
    }
  });
});
