import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { expect, it, vi } from "vitest";
import { renderPert } from "../../src/diagrams/pert/renderer";
import { NOTO_SANS_BASE64 } from "../../website/app/(home)/examples/[slug]/_assets/noto-sans-base64";

vi.mock("schematex", () => ({ render: (dsl: string) => renderPert(dsl) }));
vi.mock("@/lib/examples-source", () => ({ getExample: () => undefined }));

import { GET } from "../../website/app/og/render/route";

it("rasterizes critical path arrows using glyphs in the bundled font, without system fonts", async () => {
  const dsl = `pert
task A "A" duration: 2
task B "B" duration: 6 after: A
task D "D" duration: 4 after: B`;
  const response = await GET(new Request(`https://schematex.js.org/og/render?d=${Buffer.from(dsl).toString("base64url")}&w=1000`));
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("image/png");
  const fontPath = join(tmpdir(), "schematex-og-test-font.ttf");
  writeFileSync(fontPath, Buffer.from(NOTO_SANS_BASE64, "base64"));
  const svg = renderPert(dsl).replace(/(<svg[^>]*>)/, '$1<rect x="-9999" y="-9999" width="99999" height="99999" fill="#ffffff"/>');
  const raster = (markup: string) => new Resvg(markup, {
    fitTo: { mode: "width", value: 1000 },
    background: "#ffffff",
    font: { loadSystemFonts: false, fontFiles: [fontPath], defaultFontFamily: "Noto Sans", sansSerifFamily: "Noto Sans", serifFamily: "Noto Sans" },
  }).render().asPng();
  const png = Buffer.from(await response.arrayBuffer());
  expect(png.equals(raster(svg.replaceAll("→", "-&gt;")))).toBe(true);
  // The old rasterizer produces tofu with this exact subset font.
  expect(png.equals(raster(svg))).toBe(false);
});
