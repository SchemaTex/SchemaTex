import { describe, test, expect } from "vitest";
import { render } from "../../src/index";
import { resolveGenogramTheme, BASE_THEMES, PERSON_TOKENS } from "../../src/core/theme";

const BASIC_GENOGRAM = `genogram
  john [male, 1950]
  mary [female, 1952]
  john -- mary
    alice [female, 1975]`;

describe("genogram themes", () => {
  test("default theme uses resolved tokens", () => {
    const t = resolveGenogramTheme("default");
    const svg = render(BASIC_GENOGRAM);
    expect(svg).toContain(t.text);
    expect(svg).toContain(t.maleFill);
    expect(svg).toContain(t.femaleFill);
  });

  test("clinical alias resolves to monochrome", () => {
    const t = resolveGenogramTheme("clinical");
    const mono = resolveGenogramTheme("monochrome");
    expect(t).toEqual(mono);
    const svg = render(BASIC_GENOGRAM, { theme: "clinical" });
    expect(svg).toContain(BASE_THEMES.monochrome.stroke);
  });

  test("colorful alias resolves to default", () => {
    const t = resolveGenogramTheme("colorful");
    const def = resolveGenogramTheme("default");
    expect(t).toEqual(def);
  });

  test("mono theme uses monochrome tokens", () => {
    const svg = render(BASIC_GENOGRAM, { theme: "mono" });
    expect(svg).toContain(BASE_THEMES.monochrome.stroke);
  });

  test("unknown theme falls back to default", () => {
    const svg = render(BASIC_GENOGRAM, { theme: "nonexistent" });
    const t = resolveGenogramTheme("default");
    expect(svg).toContain(t.text);
  });

  test("theme applies to condition fills", () => {
    const svg = render(`genogram
  father [male, 1945, conditions: heart-disease(full)]
  mother [female, 1948]
  father -- mother`, { theme: "clinical" });
    expect(svg).toContain(PERSON_TOKENS.monochrome.conditionFill);
  });
});
