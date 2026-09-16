/** Browser check for the Visual Eval tool: the report loads, the type rail and
 * the case grid are built from it, drilling into a case shows its rubric, the
 * zoom dialog works from the keyboard, the filters narrow the list, and nothing
 * pushes the page sideways on desktop or mobile. Also captures the screenshots.
 *
 * Needs the preview server: npx vite --port 3031 --config vite.preview.config.ts .
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const root = new URL("../../", import.meta.url);
const shots = new URL("preview/visual-eval/", root);
const report = JSON.parse(await readFile(new URL("report.json", shots), "utf8"));
const base = process.env.VISUAL_EVAL_URL ?? "http://127.0.0.1:3031/eval/";
const types = [...new Set(report.cases.map((c) => c.type))].sort();

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  // Wide tables may scroll inside their own container; nothing else may push the
  // page sideways, and the page itself must never scroll sideways.
  const overflow = () =>
    page.evaluate(() => {
      window.scrollTo(9999, 0);
      const scrolled = window.scrollX;
      window.scrollTo(0, 0);
      const wide = [...document.querySelectorAll("*")]
        .filter((el) => !el.closest(".scroll") && el.getBoundingClientRect().right > innerWidth + 1)
        .map((el) => el.tagName + "." + String(el.className).trim().split(/\s+/)[0]);
      return { scrolled, wide: [...new Set(wide)] };
    });
  const settled = async () => {
    await page.evaluate(() => { for (const i of document.querySelectorAll("img")) i.loading = "eager"; });
    await page.waitForFunction(
      () => [...document.querySelectorAll("img")].every((i) => i.complete && i.naturalWidth > 0),
      null, { timeout: 20_000 },
    );
  };

  // ---- overview ----
  await page.goto(base, { waitUntil: "load" });
  await page.waitForSelector(".card");
  assert.equal(await page.locator(".rail nav a").count(), types.length + 1, "rail lists every type plus All");
  assert.equal(await page.locator(".card").count(), report.cases.length, "overview shows every case");
  await settled();
  assert.deepEqual(await overflow(), { scrolled: 0, wide: [] }, "desktop overflows");
  await page.screenshot({ path: new URL("tool-overview.png", shots).pathname, fullPage: true });

  // ---- one type ----
  const type = types[0];
  await page.goto(`${base}#/${type}`, { waitUntil: "load" });
  await page.waitForSelector(".card");
  const inType = report.cases.filter((c) => c.type === type).length;
  assert.equal(await page.locator(".card").count(), inType, `${type} shows its own cases only`);

  // ---- one case: the URL names it, and the overlay opens over its grid ----
  const sample = report.cases.find((c) => c.hasIdeal) ?? report.cases[0];
  await page.goto(`${base}#/${sample.type}/${sample.id}`, { waitUntil: "load" });
  await page.waitForSelector("dialog.overlay[open] .rubric");
  assert.equal(await page.locator(".rubric tbody tr").count(), sample.rubric.length, "every rule has a row");
  // The DSL that produced the drawings is on the page, so a wrong picture can be
  // traced to the source or the engine without leaving the tool.
  assert.equal(await page.locator("details.source").count(), 1, "the case shows its source");
  await page.locator("details.source summary").click();
  assert.match(await page.locator("details.source pre").innerText(), /\S/, "the source is empty");
  // By default the tool shows the target beside the released version, plus the
  // working tree when it actually draws something different.
  const anyMoved = report.cases.some((c) => {
    const s = c.versions.find((v) => v.kind === "snapshot");
    const n = c.versions.find((v) => v.kind === "next");
    return s && n && s.svgHash !== n.svgHash;
  });
  // A case with no recorded release still shows the version slot, as an empty
  // panel saying so, next to the working tree.
  const panelsFor = (c) => {
    const released = c.versions.find((v) => v.kind === "snapshot");
    const next = c.versions.find((v) => v.kind === "next");
    const showsNext = anyMoved && (!released || (next && released.svgHash !== next.svgHash));
    return (c.hasIdeal ? 1 : 0) + 1 + (showsNext ? 1 : 0);
  };
  const panels = panelsFor(sample);
  assert.equal(await page.locator("figure.panel").count(), panels, "one panel per target and version");
  await settled();

  // Each image links to its own full-size PNG.
  const href = await page.locator(".shot").first().getAttribute("href");
  assert.match(href ?? "", /\/preview\/visual-eval\/.+\.png$/, "image does not link to its PNG");
  await page.screenshot({ path: new URL("tool-case.png", shots).pathname });

  // ---- compare overlay: opens from a card, walks the list with the arrows ----
  const overlayType = types.find((t) => report.cases.filter((c) => c.type === t).length > 1) ?? types[0];
  const overlayList = report.cases.filter((c) => c.type === overlayType);
  // A hash-only navigation does not reload, so wait for the overlay to go.
  await page.goto(`${base}#/${overlayType}`, { waitUntil: "load" });
  await page.waitForFunction(() => !document.querySelector("dialog.overlay")?.open);
  await page.locator(".card").first().click();
  const overlay = page.locator("dialog.overlay");
  await page.waitForFunction(() => document.querySelector("dialog.overlay")?.open === true,
    null, { timeout: 5000 }).catch(() => { throw new Error("compare overlay did not open"); });
  assert.equal(
    new URL(page.url()).hash, `#/${overlayType}/${overlayList[0].id}`,
    "clicking a card must put that case in the URL",
  );
  assert.equal(await overlay.locator("figure.panel").count(), panelsFor(overlayList[0]),
    "overlay shows the target, the release, and the working tree when it differs");
  // Bringing the working tree in adds a third panel — unless it draws exactly
  // the same picture as the released version, in which case the two collapse.
  const first = overlayList[0];
  const released = first.versions.find((v) => v.kind === "snapshot");
  const next = first.versions.find((v) => v.kind === "next");
  const differs = released && next && released.svgHash !== next.svgHash;
  await page.selectOption("#r", "__none__");
  await page.selectOption("#r", "next");
  await page.waitForFunction((n) => document.querySelectorAll("dialog.overlay figure.panel").length === n,
    (first.hasIdeal ? 1 : 0) + 1 + (differs || !released ? 1 : 0));
  await page.selectOption("#r", "__none__");
  if (overlayList.length > 1) {
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(
      (title) => document.querySelector("dialog.overlay .bar strong")?.textContent === title,
      overlayList[1].title,
    );
    assert.equal(new URL(page.url()).hash, `#/${overlayType}/${overlayList[1].id}`,
      "arrowing to the next case must update the URL");
  }
  await settled();
  await page.screenshot({ path: new URL("tool-overlay.png", shots).pathname });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog.overlay")?.open);
  await page.waitForFunction((want) => location.hash === want, `#/${overlayType}`, { timeout: 5000 })
    .catch(() => { throw new Error(`closing must return to ${overlayType}, got ${new URL(page.url()).hash}`); });

  // ---- filters ----
  await page.goto(base, { waitUntil: "load" });
  await page.waitForSelector(".card");
  await page.selectOption("#f", "no-target");
  const untargeted = report.cases.filter((c) => !c.hasIdeal || !c.ideal?.reviewed).length;
  await page.waitForFunction((n) => document.querySelectorAll(".card").length === n, untargeted);
  await page.selectOption("#f", "all");
  await page.fill("#q", sample.type);
  const ofType = report.cases.filter((c) => `${c.title} ${c.id} ${c.type}`.toLowerCase().includes(sample.type)).length;
  await page.waitForFunction((n) => document.querySelectorAll(".card").length === n, ofType);

  // ---- mobile ----
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}#/${sample.type}/${sample.id}`, { waitUntil: "load" });
  await page.waitForSelector(".rubric");
  await settled();
  assert.deepEqual(await overflow(), { scrolled: 0, wide: [] }, "mobile overflows");
  await page.screenshot({ path: new URL("tool-mobile.png", shots).pathname, fullPage: true });

  assert.deepEqual(errors, []);
  console.log(
    `PASS: ${report.cases.length} cases over ${types.length} types; overview, type and case routes; ` +
    `${panels} panels and ${sample.rubric.length} rules on ${sample.id}; case URLs, overlay arrows and close; ` +
    `filters; no overflow desktop/mobile; no page errors.`,
  );
} finally {
  await browser.close();
}
