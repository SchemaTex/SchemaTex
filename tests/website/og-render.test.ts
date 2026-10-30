import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { expect, it, vi } from "vitest";
import { render } from "../../src/index";
import { EXAMPLES } from "../../src/ai/_generated";
import { NOTO_SANS_BASE64, NOTO_MATH_BASE64 } from "../../website/app/(home)/examples/[slug]/_assets/noto-sans-base64";

vi.mock("@/lib/examples-source", () => ({ getExample: () => undefined }));
import { GET } from "../../website/app/og/render/route";

// Read the TrueType Unicode cmap: a missing codepoint must not pass merely
// because rasterizing tofu still produces valid PNG bytes.
function fontCodepoints(base64: string): Set<number> {
  const b = Buffer.from(base64, "base64"), result = new Set<number>();
  let cmap = 0;
  for (let i = 0; i < b.readUInt16BE(4); i++) {
    const p = 12 + i * 16;
    if (b.toString("ascii", p, p + 4) === "cmap") cmap = b.readUInt32BE(p + 8);
  }
  if (!cmap) throw new Error("Font has no cmap");
  for (let i = 0; i < b.readUInt16BE(cmap + 2); i++) {
    const record = cmap + 4 + i * 8, platform = b.readUInt16BE(record);
    if (platform !== 0 && platform !== 3) continue;
    const p = cmap + b.readUInt32BE(record + 4), format = b.readUInt16BE(p);
    if (format === 12) {
      for (let j = 0; j < b.readUInt32BE(p + 12); j++) {
        const group = p + 16 + j * 12;
        for (let cp = b.readUInt32BE(group); cp <= b.readUInt32BE(group + 4); cp++) {
          if (b.readUInt32BE(group + 8) + cp - b.readUInt32BE(group)) result.add(cp);
        }
      }
    } else if (format === 4) {
      const n = b.readUInt16BE(p + 6) / 2, ends = p + 14, starts = ends + n * 2 + 2;
      const deltas = starts + n * 2, offsets = deltas + n * 2;
      for (let j = 0; j < n; j++) for (let cp = b.readUInt16BE(starts + j * 2); cp <= b.readUInt16BE(ends + j * 2) && cp < 0xffff; cp++) {
        const delta = b.readInt16BE(deltas + j * 2), offset = b.readUInt16BE(offsets + j * 2);
        const glyph = offset ? b.readUInt16BE(offsets + j * 2 + offset + (cp - b.readUInt16BE(starts + j * 2)) * 2) : cp;
        if ((offset && !glyph) ? false : ((glyph + delta) & 0xffff) !== 0) result.add(cp);
      }
    }
  }
  return result;
}

const fixtures = ["pert-milestone-join", "logic-registered-mux", "block-textbook-feedback"].map(name => readFileSync(new URL(`../fixtures/regression/${name}.sx`, import.meta.url), "utf8"));

it("bundled fonts cover generated renderer text across every documented example", () => {
  const covered = new Set([...fontCodepoints(NOTO_SANS_BASE64), ...fontCodepoints(NOTO_MATH_BASE64)]);
  const missing = new Set<string>();
  for (const dsl of [...EXAMPLES.map(e => e.dsl), ...fixtures]) {
    const svg = render(dsl);
    for (const match of svg.matchAll(/<(?:text|tspan)\b[^>]*>([^<]*)/g)) {
      for (const char of match[1]) {
        // User-provided names may use arbitrary scripts; check the engine's
        // own generated characters, independently of those input labels.
        if (!dsl.includes(char) && !covered.has(char.codePointAt(0)!)) missing.add(char);
      }
    }
  }
  for (const char of "→σQ̄−≈▲▼○✓✕") expect(covered.has(char.codePointAt(0)!), char).toBe(true);
  expect([...missing]).toEqual([]);
}, 120000);

it.each(fixtures)("rasterizes real Unicode with only the production font subsets: %#", async dsl => {
  const response = await GET(new Request(`https://schematex.js.org/og/render?d=${Buffer.from(dsl).toString("base64url")}&w=1000`));
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("image/png");
  const fontFiles = [NOTO_SANS_BASE64, NOTO_MATH_BASE64].map((font, i) => {
    const path = join(tmpdir(), `schematex-og-test-${i}.ttf`);
    writeFileSync(path, Buffer.from(font, "base64"));
    return path;
  });
  const svg = render(dsl).replace(/(<svg[^>]*>)/, '$1<rect x="-9999" y="-9999" width="99999" height="99999" fill="#ffffff"/>');
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 1000 }, background: "#ffffff",
    font: { loadSystemFonts: false, fontFiles, defaultFontFamily: "Noto Sans", sansSerifFamily: "Noto Sans", serifFamily: "Noto Sans" },
  }).render().asPng();
  expect(Buffer.from(await response.arrayBuffer()).equals(png)).toBe(true);
});
