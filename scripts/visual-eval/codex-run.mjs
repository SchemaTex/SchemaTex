/** Run one `codex exec` and hand back its final message.
 *
 * Two things this gets right that are easy to get wrong:
 *   - The prompt goes first. `-i` takes a variable number of files, so a prompt
 *     placed after it is swallowed.
 *   - stdin is closed. Codex appends piped stdin to the prompt, and an
 *     inherited pipe that never ends leaves it waiting for EOF forever. This
 *     needs `spawn`; `execFile` takes over stdio and ignores the option.
 */
import { spawn } from "node:child_process";
import { access, constants, readFile } from "node:fs/promises";
import { join } from "node:path";

const CANDIDATES = [
  process.env.CODEX_BIN,
  // The npm-global `codex` on PATH is often far behind and gets rejected by the
  // account's models; the ChatGPT app ships a current build.
  "/Applications/ChatGPT.app/Contents/Resources/codex",
  "codex",
].filter(Boolean);

let cached;
export async function codexBin() {
  if (cached) return cached;
  for (const candidate of CANDIDATES) {
    if (!candidate.includes("/")) return (cached = candidate);
    try {
      await access(candidate, constants.X_OK);
      return (cached = candidate);
    } catch { /* try the next one */ }
  }
  throw new Error("No codex binary found. Set CODEX_BIN to its absolute path.");
}

/**
 * @param {string} prompt
 * @param {{dir: string, images?: string[], sandbox?: string, model?: string,
 *          effort?: string, timeoutMs?: number}} opts
 * @returns {Promise<{reply: string, seconds: number}>}
 */
export async function codexRun(prompt, opts) {
  const { attempts = 4 } = opts;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await runOnce(opts, prompt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransient(error)) throw error;
      // Upstream capacity comes back on its own; a long grading run should not
      // lose an hour of finished work to one busy minute.
      const wait = 15_000 * attempt;
      console.warn(`  codex ${String(error.message).slice(0, 80)} — retrying in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastError;
}

/** Failures worth waiting out rather than giving up on. */
const isTransient = (error) =>
  /at capacity|rate limit|429|50\d |timed out|stream error|connection|ECONN|socket hang up/i.test(
    String(error?.message ?? ""),
  );

async function runOnce(opts, prompt) {
  const { dir, images = [], sandbox = "read-only", model, effort = "low", timeoutMs = 900_000 } = opts;
  const last = join(dir, "codex-reply.txt");
  const args = [
    "exec", prompt,
    "--skip-git-repo-check",
    "--cd", dir,
    "-s", sandbox,
    // The judge needs no MCP servers, and a malformed entry in the user's
    // config.toml would otherwise stop the CLI from starting at all.
    "-c", "mcp_servers={}",
    "-c", `model_reasoning_effort=${effort}`,
    ...(model ? ["-m", model] : []),
    "--output-last-message", last,
    ...images.flatMap((image) => ["-i", image]),
  ];
  const bin = await codexBin();
  const started = Date.now();
  const output = await new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let text = "";
    child.stdout.on("data", (d) => { text += d; });
    child.stderr.on("data", (d) => { text += d; });
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(`codex timed out after ${timeoutMs}ms`)); }, timeoutMs);
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve(text) : reject(new Error(`codex exited ${code}: ${text.slice(-600)}`));
    });
  });
  const reply = await readFile(last, "utf8").catch(() => "");
  if (!reply.trim()) throw new Error(`codex wrote no final message: ${output.slice(-600)}`);
  return { reply, seconds: Math.round((Date.now() - started) / 1000) };
}

/** Pull the JSON object out of a reply that may be fenced or prefaced.
 *
 * Models writing long prose inside a JSON string occasionally drop the closing
 * quote — one such reply, in the middle of a 200-case run, used to take the
 * whole run down. One repair attempt is worth making before giving up: close a
 * string that a `"}` or `"]` was clearly meant to end. Anything less obvious
 * than that is left to fail, so a genuinely broken reply is still a retry.
 */
export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{"), end = body.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`No JSON in reply: ${text.slice(0, 300)}`);
  const slice = body.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (first) {
    // A value string running up to the structural character that should have
    // followed its closing quote.
    const repaired = slice.replace(/([^"\\])(\s*[}\]])(\s*[,}\]])/g, (m, a, b, c) =>
      /["}\]]/.test(a) ? m : `${a}"${b}${c}`,
    );
    try {
      return JSON.parse(repaired);
    } catch {
      throw first;
    }
  }
}
