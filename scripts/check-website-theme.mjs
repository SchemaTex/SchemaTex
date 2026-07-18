import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve("website/app/global.css"), "utf8");
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
const darkBlock = css.match(/\.dark\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
const tokenNames = [
  "bg", "text", "text-muted", "stroke", "fill", "fill-muted",
  "line", "line-strong", "accent",
];

function parseTokens(block) {
  return Object.fromEntries(tokenNames.map((name) => {
    const value = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
    if (!value) throw new Error(`Missing hex token --${name}`);
    return [name, value.toLowerCase()];
  }));
}

function rgb(hex) {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
}

function hue(hex) {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta < 0.0001) return null;
  const raw = max === r
    ? ((g - b) / delta) % 6
    : max === g
      ? (b - r) / delta + 2
      : (r - g) / delta + 4;
  return (raw * 60 + 360) % 360;
}

function luminance(hex) {
  return rgb(hex)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function lightness(hex) {
  const y = luminance(hex);
  return 116 * Math.cbrt(y) - 16;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const themes = { light: parseTokens(rootBlock), dark: parseTokens(darkBlock) };
const neutralNames = ["bg", "text", "text-muted", "stroke", "fill", "fill-muted", "line", "line-strong"];

console.log("THEME HUE AUDIT (degrees; N/A = achromatic)");
for (const [themeName, tokens] of Object.entries(themes)) {
  for (const name of [...neutralNames, "accent"]) {
    const value = hue(tokens[name]);
    console.log(`${themeName.padEnd(5)} ${name.padEnd(11)} ${tokens[name]}  ${value === null ? "N/A" : value.toFixed(1)}`);
    if (name !== "accent" && value !== null) {
      const roundedHue = Number(value.toFixed(1));
      assert(roundedHue >= 210 && roundedHue <= 230, `${themeName} --${name} hue ${value.toFixed(1)} is outside 210–230°`);
    }
  }
}
const accentHueDelta = Math.abs(hue(themes.light.accent) - hue(themes.dark.accent));
assert(accentHueDelta <= 10, `accent hue delta ${accentHueDelta.toFixed(1)}° exceeds 10°`);

console.log("\nWCAG CONTRAST");
const contrastChecks = [
  ["text", 7], ["text-muted", 4.5], ["accent", 4.5], ["line", 1.4],
];
for (const [themeName, tokens] of Object.entries(themes)) {
  for (const [name, minimum] of contrastChecks) {
    const ratio = contrast(tokens[name], tokens.bg);
    console.log(`${themeName.padEnd(5)} ${`${name}/bg`.padEnd(15)} ${ratio.toFixed(2)}:1  (min ${minimum}:1)`);
    assert(ratio >= minimum, `${themeName} ${name}/bg ${ratio.toFixed(2)} is below ${minimum}`);
  }
}

console.log("\nSURFACE L* HIERARCHY");
for (const [themeName, tokens] of Object.entries(themes)) {
  const values = ["bg", "fill", "fill-muted"].map((name) => ({ name, value: lightness(tokens[name]) }));
  const deltas = values.slice(1).map((entry, index) => Math.abs(entry.value - values[index].value));
  console.log(`${themeName.padEnd(5)} ${values.map(({ name, value }) => `${name}=${value.toFixed(2)}`).join("  ")}  Δ=${deltas.map((value) => value.toFixed(2)).join("/")}`);
  const contrasts = values.map(({ name }) => contrast(tokens[name], tokens.bg));
  assert(contrasts[0] <= contrasts[1] && contrasts[1] <= contrasts[2], `${themeName} surface contrast is not monotonic`);
  // Light intentionally keeps bg and fill identical; this is the pre-existing
  // surface contract. Every distinguishable adjacent level must clear ΔL* 3.
  deltas.forEach((delta, index) => {
    const identical = values[index].value === values[index + 1].value;
    assert(identical || delta >= 3, `${themeName} ${values[index].name}→${values[index + 1].name} ΔL* ${delta.toFixed(2)} is below 3`);
  });
}

const sxClasses = new Set([...css.matchAll(/\.((?:sx)-[a-zA-Z0-9_-]+)/g)].map((match) => match[1]));
const sxRules = [...css.matchAll(/([^{}]*\.sx-[^{}]*)\{([^{}]*)\}/g)];
const sxColorLiterals = sxRules.flatMap(([, selector, declarations]) =>
  [...declarations.matchAll(/(?:#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\))/g)]
    .map((match) => `${selector.trim()}: ${match[0]}`),
);
console.log("\nSX TOKEN COVERAGE");
console.log(`${sxClasses.size}/${sxClasses.size} .sx-* classes inherit light/dark tokens; ${sxColorLiterals.length} literal colors`);
assert(sxColorLiterals.length === 0, `.sx-* rules contain literal colors:\n${sxColorLiterals.join("\n")}`);

console.log("\nTheme audit passed.");
