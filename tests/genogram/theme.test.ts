import { describe, test, expect } from "vitest";
import { render } from "../../src/index";

const BASIC_GENOGRAM = `genogram
  john [male, 1950]
  mary [female, 1952]
  john -- mary
    alice [female, 1975]`;

describe("genogram themes", () => {
  test("default theme uses clinical colors", () => {
    const svg = render(BASIC_GENOGRAM);
    expect(svg).toContain("#2c3e50"); // stroke
    expect(svg).toContain("#dae8fc"); // male fill
    expect(svg).toContain("#fce4ec"); // female fill
  });

  test("clinical theme uses blue male fill and pink female fill", () => {
    const svg = render(BASIC_GENOGRAM, { theme: "clinical" });
    expect(svg).toContain("#dae8fc"); // male fill
    expect(svg).toContain("#fce4ec"); // female fill
    expect(svg).toContain("#2c3e50"); // stroke
  });

  test("colorful theme uses colored fills", () => {
    const svg = render(BASIC_GENOGRAM, { theme: "colorful" });
    expect(svg).toContain("#bbdefb"); // male fill
    expect(svg).toContain("#f8bbd0"); // female fill
  });

  test("mono theme uses pure black", () => {
    const svg = render(BASIC_GENOGRAM, { theme: "mono" });
    expect(svg).toContain("stroke: #000");
  });

  test("unknown theme falls back to default (clinical)", () => {
    const svg = render(BASIC_GENOGRAM, { theme: "nonexistent" });
    expect(svg).toContain("#2c3e50");
  });

  test("theme applies to condition fills", () => {
    const svg = render(`genogram
  father [male, 1945, conditions: heart-disease(full)]
  mother [female, 1948]
  father -- mother`, { theme: "clinical" });
    expect(svg).toContain("#1565c0"); // clinical condition fill
  });
});
