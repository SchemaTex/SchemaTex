import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { connect } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const website = resolve(root, "website");
const baseUrl = process.env.SCHEMATEX_E2E_BASE_URL ?? "http://127.0.0.1:3101";
const previewUrl = new URL("/playground/interactive", baseUrl).toString();

let server;
let serverLog = "";

async function isReady() {
  try {
    const response = await fetch(previewUrl, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function isListening() {
  const url = new URL(baseUrl);
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  return new Promise((resolveListening) => {
    const socket = connect({ host: url.hostname, port });
    let settled = false;
    const finish = (listening) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolveListening(listening);
    };
    socket.setTimeout(1_000, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function waitForExistingServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await isReady()) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  return false;
}

async function waitForServer() {
  if (await isReady()) return;

  // A Next.js dev server accepts TCP before its first route finishes a cold
  // compile. Reuse that server instead of racing it with a second process on
  // the same port.
  if (await isListening()) {
    if (await waitForExistingServer()) return;
    throw new Error("Preview server is listening but the interactive route did not become ready.");
  }

  const url = new URL(baseUrl);
  server = spawn("npm", ["run", "dev", "--", "-p", url.port || "3101"], {
    cwd: website,
    detached: process.platform !== "win32",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const remember = (chunk) => {
    serverLog = `${serverLog}${chunk}`.slice(-8_000);
  };
  server.stdout?.on("data", remember);
  server.stderr?.on("data", remember);

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await isReady()) return;
    if (server.exitCode != null) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Preview server did not become ready.\n${serverLog}`);
}

function stopServer() {
  if (!server?.pid || server.exitCode != null) return;
  try {
    if (process.platform === "win32") server.kill("SIGTERM");
    else process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

process.once("exit", stopServer);
await waitForServer();

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    // Local contributors commonly have Chrome but not Playwright's exact
    // revision. CI can still use `npx playwright install chromium`.
    if (String(error).includes("Executable doesn't exist")) {
      return chromium.launch({ channel: "chrome", headless: true });
    }
    throw error;
  }
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(60_000);
await page.addInitScript(() => {
  localStorage.setItem("schematex_cookie_consent", "denied");
});
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});

async function dragNodeWithLiveEdge({
  exampleId,
  nodeKey,
  edgeSelector,
  semanticId,
  dx = 72,
  dy = 0,
  midpointSelector,
  handleSelector,
}) {
  await page.locator(`[data-example-id="${exampleId}"]`).click();
  const node = page.locator(`[data-sx-key="${nodeKey}"]`);
  await node.waitFor({ state: "visible" });
  const dragHandle = handleSelector ? node.locator(handleSelector) : node;
  const nodeBox = await dragHandle.boundingBox();
  assert.ok(nodeBox, `${nodeKey} must have a browser-visible bounding box`);
  const edge = page.locator(edgeSelector);
  assert.equal(await edge.count(), 1, `${exampleId} must expose one explicit live edge`);
  const edgeBefore = await edge.getAttribute("d");
  assert.ok(edgeBefore);
  const midpoint = midpointSelector ? page.locator(midpointSelector).first() : null;
  const midpointBefore = midpoint ? await midpoint.getAttribute("transform") : null;
  const x = nodeBox.x + nodeBox.width / 2;
  const y = nodeBox.y + nodeBox.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 4 });
  const edgeLive = await edge.getAttribute("d");
  assert.notEqual(edgeLive, edgeBefore, `${exampleId} edge must update before drop`);
  assert.match(edgeLive, /^M[\d.,\s-]+(?:L[\d.,\s-]+)+$/);
  assert.ok(
    (edgeLive.match(/L/g) ?? []).length <= 4,
    `${exampleId} edge must preserve authored elbows: ${edgeLive}`,
  );
  if (midpoint) {
    assert.notEqual(
      await midpoint.getAttribute("transform"),
      midpointBefore,
      `${exampleId} edge label must follow the live midpoint`,
    );
  }
  await page.mouse.up();
  await page.waitForFunction((id) => {
    const source = window.monaco?.editor.getModels()[0]?.getValue() ?? "";
    return source.split("\n").some((line) => line.startsWith(`pin ${id} `));
  }, semanticId);
}

try {
  await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
  console.log("e2e: page loaded");
  await page.locator(".monaco-editor").waitFor({ state: "visible", timeout: 120_000 });
  await page.locator('[data-sx-key="node:C"]').waitFor({ state: "visible" });

  if (process.env.SCHEMATEX_E2E_FOCUS !== "expanded") {
  await page.locator('[data-sx-key="node:C"]').click();
  assert.equal(
    await page.locator(".sx-interactive-selected").getAttribute("data-sx-key"),
    "node:C",
  );
  await page.locator(".sx-monaco-selection").waitFor({ state: "attached" });
  assert.equal(await page.locator(".sx-monaco-selection").count(), 1);

  const labelBefore = await page.locator('[data-sx-key="node:C"] [data-sx-role="label"]').evaluate((label) => {
    const rect = label.getBoundingClientRect();
    const style = getComputedStyle(label);
    return {
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
    };
  });
  await page.locator('[data-sx-key="node:C"]').dblclick();
  const labelEditor = page.locator(".sx-label-editor");
  await labelEditor.waitFor({ state: "visible" });
  const editorBox = await labelEditor.boundingBox();
  assert.ok(editorBox, "inline label editor must have a browser-visible bounding box");
  assert.ok(Math.abs(editorBox.x + editorBox.width / 2 - labelBefore.centerX) < 3);
  assert.ok(Math.abs(editorBox.y + editorBox.height / 2 - labelBefore.centerY) < 3);
  assert.ok(editorBox.width <= labelBefore.width + 18);
  assert.ok(editorBox.height <= labelBefore.height + 8);
  const editorTypography = await labelEditor.evaluate((input) => {
    const style = getComputedStyle(input);
    return { fontFamily: style.fontFamily, fontWeight: style.fontWeight };
  });
  assert.deepEqual(editorTypography, {
    fontFamily: labelBefore.fontFamily,
    fontWeight: labelBefore.fontWeight,
  });
  await labelEditor.fill("Inspect SVG");
  await labelEditor.press("Enter");
  await page.waitForFunction(() =>
    window.monaco?.editor.getModels()[0]?.getValue().includes("C[Inspect SVG]"),
  );
  await page.waitForFunction(() =>
    document.querySelector('[data-sx-key="node:C"] [data-sx-role="label"]')?.textContent
      === "Inspect SVG",
  );
  assert.equal(
    await page.locator('[data-sx-key="node:C"] [data-sx-role="label"]').textContent(),
    "Inspect SVG",
  );

  // Calling the model's public undo entry point avoids platform-specific
  // Meta/Ctrl key mapping in headless Chrome while proving the edit is on
  // Monaco's native undo stack.
  await page.evaluate(() => window.monaco?.editor.getModels()[0]?.undo());
  await page.waitForFunction(() =>
    window.monaco?.editor.getModels()[0]?.getValue().includes("C[Render preview]"),
  );
  await page.waitForFunction(() =>
    document.querySelector('[data-sx-key="node:C"] [data-sx-role="label"]')?.textContent
      === "Render preview",
  );

  const draggable = page.locator('[data-sx-key="node:D"]');
  const box = await draggable.boundingBox();
  assert.ok(box, "node:D must have a browser-visible bounding box");
  const baseSvgBox = await draggable.evaluate((node) => {
    const box = node.getBBox();
    return { x: box.x, y: box.y };
  });
  const edge = page.locator('g[data-from="D"][data-to="B"] path.sx-fc-edge');
  const baseEdgePath = await edge.getAttribute("d");
  assert.ok(baseEdgePath, "node:D must have a connected edge path");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 90, startY + 70, { steps: 5 });
  assert.notEqual(await edge.getAttribute("d"), baseEdgePath);
  assert.match(await draggable.getAttribute("transform"), /translate\(/);
  assert.equal(
    (await page.evaluate(() => window.monaco?.editor.getModels()[0]?.getValue() ?? ""))
      .includes("@overrides"),
    false,
  );
  await page.mouse.up();
  const pinnedSource = await page.waitForFunction(() => {
    const source = window.monaco?.editor.getModels()[0]?.getValue() ?? "";
    return source.includes("@overrides") && /^pin D /m.test(source) ? source : false;
  });
  const pinMatch = (await pinnedSource.jsonValue()).match(/^pin D (-?[\d.]+),(-?[\d.]+)/m);
  assert.ok(pinMatch, "drop must write a numeric pin for node:D");
  assert.ok(Math.abs(Number(pinMatch[1]) - baseSvgBox.x) > 10, "x must move");
  assert.ok(Math.abs(Number(pinMatch[2]) - baseSvgBox.y) > 10, "y must move");
  console.log("e2e: flowchart passed");

  for (const exampleId of ["flowchart-lr", "state", "sequence", "orgchart"]) {
    await page.locator(`[data-example-id="${exampleId}"]`).click();
    await page.locator(".dot-grid svg").waitFor({ state: "visible" });
    assert.equal(await page.locator(".dot-grid pre").count(), 0, `${exampleId} should render`);
  }
  await dragNodeWithLiveEdge({
    exampleId: "state",
    nodeKey: "node:Review",
    edgeSelector: 'g[data-sx-live-start="Draft"][data-sx-live-end="Review"] path[data-sx-live-edge]',
    semanticId: "Review",
    midpointSelector: 'g[data-sx-live-start="Draft"][data-sx-live-end="Review"] [data-sx-live-midpoint]',
  });
  await dragNodeWithLiveEdge({
    exampleId: "sequence",
    nodeKey: "node:app",
    edgeSelector: 'g[data-sx-live-start="user"][data-sx-live-end="app"] path[data-sx-live-edge]',
    semanticId: "app",
    midpointSelector: 'g[data-sx-live-start="user"][data-sx-live-end="app"] [data-sx-live-midpoint]',
    handleSelector: ".sx-seq-head",
  });
  await dragNodeWithLiveEdge({
    exampleId: "orgchart",
    nodeKey: "node:eng",
    edgeSelector: 'g[data-sx-live-end="eng"] path[data-sx-live-edge]',
    semanticId: "eng",
  });
  console.log("e2e: wave-1 live drags passed");
  }

  if (process.env.SCHEMATEX_E2E_FOCUS !== "wave1") {
  // Circuit netlist: a route now declares the component that owns each
  // endpoint. During drag the exact orthogonal path updates; it no longer
  // guesses from the first/last component on the whole net.
  await page.locator('[data-example-id="circuit-netlist"]').click();
  const resistor = page.locator('[data-sx-key="node:R1"]');
  await resistor.waitFor({ state: "visible" });
  const resistorBox = await resistor.boundingBox();
  assert.ok(resistorBox);
  const resistorEdges = page.locator(
    'g[data-sx-live-start="R1"] path[data-sx-live-edge], g[data-sx-live-end="R1"] path[data-sx-live-edge]',
  );
  const resistorEdgeCount = await resistorEdges.count();
  assert.ok(resistorEdgeCount >= 2, "R1 must own every routed endpoint on both connected nets");
  const resistorPathsBefore = await Promise.all(
    Array.from({ length: resistorEdgeCount }, (_, index) => resistorEdges.nth(index).getAttribute("d")),
  );
  const resistorEdge = resistorEdges.first();
  const resistorPathBefore = await resistorEdge.getAttribute("d");
  assert.ok(resistorPathBefore);
  await page.mouse.move(
    resistorBox.x + resistorBox.width / 2,
    resistorBox.y + resistorBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    resistorBox.x + resistorBox.width / 2 + 70,
    resistorBox.y + resistorBox.height / 2 + 45,
    { steps: 4 },
  );
  const resistorPathLive = await resistorEdge.getAttribute("d");
  assert.notEqual(resistorPathLive, resistorPathBefore);
  assert.match(resistorPathLive, /^M[\d.,\s-]+(?:L[\d.,\s-]+)+$/);
  assert.equal(resistorPathLive.includes(" C"), false);
  assert.ok((resistorPathLive.match(/L/g) ?? []).length <= 2, "live circuit route must remain orthogonal, not sampled");
  const resistorPathsLive = await Promise.all(
    Array.from({ length: resistorEdgeCount }, (_, index) => resistorEdges.nth(index).getAttribute("d")),
  );
  resistorPathsLive.forEach((path, index) => {
    assert.notEqual(path, resistorPathsBefore[index], `R1 connected route ${index} must update before drop`);
  });
  await page.mouse.up();
  await page.waitForFunction(() => /^pin R1 /m.test(window.monaco?.editor.getModels()[0]?.getValue() ?? ""));
  console.log("e2e: circuit passed");

  // Floorplan: furniture owns the gesture and writes its authored `at x,y`.
  // The room never receives a transform or a pin, so shared-wall validation
  // cannot be broken by clicking a sofa or fixture.
  await page.locator('[data-example-id="floorplan-home"]').click();
  const sofa = page.locator('.sx-fp-item[data-furniture="sofa"]');
  const livingRoom = page.locator('[data-sx-key="node:living"]');
  await sofa.waitFor({ state: "visible" });
  const sofaBox = await sofa.boundingBox();
  assert.ok(sofaBox);
  const sofaTransformBefore = await sofa.getAttribute("transform");
  const floorSourceBefore = await page.evaluate(() => window.monaco?.editor.getModels()[0]?.getValue() ?? "");
  await page.mouse.move(sofaBox.x + sofaBox.width / 2, sofaBox.y + sofaBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sofaBox.x + sofaBox.width / 2 + 24, sofaBox.y + sofaBox.height / 2 - 16, { steps: 4 });
  assert.notEqual(await sofa.getAttribute("transform"), sofaTransformBefore);
  assert.equal(await livingRoom.getAttribute("transform"), null);
  await page.mouse.up();
  await page.waitForFunction((before) => {
    const source = window.monaco?.editor.getModels()[0]?.getValue() ?? "";
    return source !== before && /furniture sofa .* at [-\d.]+,[-\d.]+/.test(source);
  }, floorSourceBefore);
  const floorSourceAfter = await page.evaluate(() => window.monaco?.editor.getModels()[0]?.getValue() ?? "");
  assert.equal(floorSourceAfter.includes("pin living"), false);
  assert.equal(floorSourceAfter.includes("@overrides"), false);
  assert.equal(await page.getByText("floorplan: 2 validation errors", { exact: false }).count(), 0);
  console.log("e2e: floorplan passed");

  // Genogram: direct endpoints, couple midpoints, and emotional curves use
  // explicit weighted bindings instead of the generic sampled-path guess.
  await page.locator('[data-example-id="genogram"]').click();
  const dad = page.locator('[data-sx-key="node:dad"]');
  await dad.waitFor({ state: "visible" });
  const dadBox = await dad.boundingBox();
  assert.ok(dadBox);
  const couplePath = page.locator(
    'g[data-sx-live-start="dad"][data-sx-live-end="mom"] path[data-sx-live-edge]',
  );
  const dropPath = page.locator(
    'g[data-sx-live-all*="dad:0.5"] path[data-sx-live-edge]',
  );
  assert.equal(await couplePath.count(), 1);
  assert.equal(await dropPath.count(), 1);
  const coupleBefore = await couplePath.getAttribute("d");
  const dropBefore = await dropPath.getAttribute("d");
  await page.mouse.move(dadBox.x + dadBox.width / 2, dadBox.y + dadBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dadBox.x + dadBox.width / 2 + 64, dadBox.y + dadBox.height / 2, { steps: 4 });
  const coupleLive = await couplePath.getAttribute("d");
  const dropLive = await dropPath.getAttribute("d");
  assert.notEqual(coupleLive, coupleBefore);
  assert.notEqual(dropLive, dropBefore);
  assert.match(coupleLive, /^M[\d.,\s-]+L[\d.,\s-]+$/);
  assert.match(dropLive, /^M[\d.,\s-]+L[\d.,\s-]+$/);
  await page.mouse.up();
  await page.waitForFunction(() => /^pin dad /m.test(window.monaco?.editor.getModels()[0]?.getValue() ?? ""));
  await page.waitForFunction(() => {
    const source = window.monaco?.editor.getModels()[0]?.getValue() ?? "";
    const pin = source.match(/^pin dad (-?[\d.]+),(-?[\d.]+)/m);
    const node = document.querySelector('[data-sx-key="node:dad"]');
    if (!pin || !(node instanceof SVGGraphicsElement)) return false;
    const box = node.getBBox();
    return Math.abs(box.x - Number(pin[1])) < 0.5;
  });
  const sister = page.locator('[data-sx-key="node:sister"]');
  await sister.waitFor({ state: "visible" });
  const sisterBox = await sister.boundingBox();
  assert.ok(sisterBox);
  const sibshipPath = page.locator(
    'g[data-sx-live-kind="sibship"][data-sx-live-end="sister"] path[data-sx-live-edge]',
  );
  assert.equal(await sibshipPath.count(), 1);
  const sibshipBefore = await sibshipPath.getAttribute("d");
  await page.mouse.move(sisterBox.x + sisterBox.width / 2, sisterBox.y + sisterBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sisterBox.x + sisterBox.width / 2 + 48, sisterBox.y + sisterBox.height / 2, { steps: 4 });
  const sibshipLive = await sibshipPath.getAttribute("d");
  assert.notEqual(sibshipLive, sibshipBefore);
  assert.equal((sibshipLive.match(/L/g) ?? []).length, 1);
  await page.mouse.up();
  await page.waitForFunction(() => /^pin sister /m.test(window.monaco?.editor.getModels()[0]?.getValue() ?? ""));
  console.log("e2e: genogram passed");

  // Mindmap is label-only: generated hierarchy IDs are intentionally not
  // pinnable, while authored Markdown labels still round-trip by exact range.
  await page.locator('[data-example-id="mindmap"]').click();
  const mindmapRootLabel = page.locator(
    '[data-sx-key="node:n0"] [data-sx-role="label"]',
  );
  await mindmapRootLabel.waitFor({ state: "visible" });
  await mindmapRootLabel.dblclick();
  const mindmapEditor = page.locator(".sx-label-editor");
  await mindmapEditor.waitFor({ state: "visible" });
  assert.equal(await mindmapEditor.getAttribute("value"), "Product Launch");
  await mindmapEditor.fill("Product Strategy");
  await mindmapEditor.press("Enter");
  await page.waitForFunction(() =>
    (window.monaco?.editor.getModels()[0]?.getValue() ?? "").includes("# Product Strategy"),
  );
  await page.waitForFunction(() =>
    document.querySelector('[data-sx-key="node:n0"] [data-sx-role="label"]')?.textContent
      === "Product Strategy",
  );
  assert.equal(
    await page.locator('[data-sx-key="node:n0"] [data-sx-role="label"]').textContent(),
    "Product Strategy",
  );
  assert.equal(
    (await page.evaluate(() => window.monaco?.editor.getModels()[0]?.getValue() ?? ""))
      .includes("@overrides"),
    false,
  );
  console.log("e2e: mindmap label-only editing passed");

  // Keep common ChatDiagram engines visible as render regression probes in
  // addition to the focused interaction assertions above.
  for (const exampleId of ["network", "decisiontree", "fishbone", "erd", "umlclass"]) {
    await page.locator(`[data-example-id="${exampleId}"]`).click();
    await page.locator(".dot-grid svg").waitFor({ state: "visible" });
    assert.equal(await page.locator(".dot-grid pre").count(), 0, `${exampleId} should render`);
  }
  console.log("e2e: render-audit specimens passed");
  }

  assert.deepEqual(browserErrors, []);
  console.log("interactive editing e2e: WYSIWYG edit, live edges, free drag, and examples passed");
} finally {
  await browser.close();
  stopServer();
  process.removeListener("exit", stopServer);
}
