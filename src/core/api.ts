import type { DiagramPlugin, RenderConfig } from "./types";
import { parseFrontmatter } from "./dsl-preprocess";
import {
  diagnosticFromError,
  renderDiagnosticSvg,
  type SchematexDiagnostic,
  type SchematexParseResult,
  type SchematexRenderResult,
} from "./diagnostics";
import { genogram } from "../diagrams/genogram";
import { ecomap } from "../diagrams/ecomap";
import { pedigree } from "../diagrams/pedigree";
import { phylo } from "../diagrams/phylo";
import { sociogram } from "../diagrams/sociogram";
import { timing } from "../diagrams/timing";
import { logic } from "../diagrams/logic";
import { circuit } from "../diagrams/circuit";
import { blockdiagram } from "../diagrams/blockdiagram";
import { ladder } from "../diagrams/ladder";
import { sld } from "../diagrams/sld";
import { entity } from "../diagrams/entity";
import { fishbone } from "../diagrams/fishbone";
import { venn } from "../diagrams/venn";
import { flowchart } from "../diagrams/flowchart";
import { mindmap } from "../diagrams/mindmap";
import { matrix } from "../diagrams/matrix";
import { orgchart } from "../diagrams/orgchart";
import { decisiontree } from "../diagrams/decisiontree";
import { timeline } from "../diagrams/timeline";
import { state } from "../diagrams/state";
import { pid } from "../diagrams/pid";
import { erd } from "../diagrams/erd";
import { breadboard } from "../diagrams/breadboard";
import { bpmn } from "../diagrams/bpmn";
import { fbd } from "../diagrams/fbd";
import { sfc } from "../diagrams/sfc";
import { prisma } from "../diagrams/prisma";
import { usecase } from "../diagrams/usecase";
import { pert } from "../diagrams/pert";
import { sequence } from "../diagrams/sequence";
import { petri } from "../diagrams/petri";
import { network } from "../diagrams/network";
import { umlclass } from "../diagrams/umlclass";
import { faulttree } from "../diagrams/faulttree";
import { bowtie } from "../diagrams/bowtie";
import { eventtree } from "../diagrams/eventtree";
import { fmea } from "../diagrams/fmea";
import { causalloop } from "../diagrams/causalloop";
import { markov } from "../diagrams/markov";
import { gitgraph } from "../diagrams/gitgraph";
import { epc } from "../diagrams/epc";
import { idef0 } from "../diagrams/idef0";
import { threatmodel } from "../diagrams/threatmodel";
import { welding } from "../diagrams/welding";
import { floorplan } from "../diagrams/floorplan";
import { playbook } from "../diagrams/playbook";

export interface SchematexConfig {
  type?:
    | "genogram"
    | "ecomap"
    | "pedigree"
    | "phylo"
    | "sociogram"
    | "timing"
    | "logic"
    | "circuit"
    | "blockdiagram"
    | "ladder"
    | "sld"
    | "entity"
    | "fishbone"
    | "venn"
    | "flowchart"
    | "mindmap"
    | "matrix"
    | "orgchart"
    | "decisiontree"
    | "timeline"
    | "state"
    | "pid"
    | "erd"
    | "breadboard"
    | "bpmn"
    | "fbd"
    | "sfc"
    | "prisma"
    | "usecase"
    | "pert"
    | "sequence"
    | "petri"
    | "network"
    | "umlclass"
    | "faulttree"
    | "bowtie"
    | "floorplan"
    | "playbook";
  width?: number;
  height?: number;
  padding?: number;
  theme?: string;
  fontFamily?: string;
  /**
   * `strict` preserves the historical throw-on-error API.
   * `preview` returns a visible diagnostic SVG instead of an empty surface.
   */
  mode?: "strict" | "preview";
}

const plugins: DiagramPlugin[] = [
  genogram,
  ecomap,
  pedigree,
  phylo,
  sociogram,
  timing,
  logic,
  circuit,
  blockdiagram,
  ladder,
  sld,
  entity,
  fishbone,
  venn,
  flowchart,
  mindmap,
  matrix,
  orgchart,
  decisiontree,
  timeline,
  state,
  pid,
  erd,
  breadboard,
  bpmn,
  fbd,
  sfc,
  prisma,
  usecase,
  pert,
  sequence,
  petri,
  network,
  umlclass,
  faulttree,
  bowtie,
  eventtree,
  fmea,
  causalloop,
  markov,
  gitgraph,
  epc,
  idef0,
  threatmodel,
  welding,
  floorplan,
  playbook,
];

function detectPlugin(text: string, config?: SchematexConfig): DiagramPlugin {
  if (config?.type) {
    const plugin = plugins.find((p) => p.type === config.type);
    if (plugin) return plugin;
  }
  for (const plugin of plugins) {
    if (plugin.detect(text)) return plugin;
  }
  throw new Error(
    "Cannot detect diagram type. Start your text with 'genogram', 'ecomap', 'pedigree', 'phylo', 'sociogram', 'timing', 'logic', 'circuit', 'blockdiagram', 'ladder', 'sld', 'entity-structure', 'fishbone', 'venn', 'flowchart', 'mindmap', 'matrix', 'orgchart', 'state', 'pid', 'erd', 'breadboard', 'bpmn', 'fbd', 'sfc', 'prisma', 'usecase', 'pert', 'sequence', 'petri', 'network', 'umlclass', 'faulttree', 'bowtie', 'floorplan', or 'playbook'."
  );
}

/**
 * Run the Mermaid-compat frontmatter pass and merge any `title:` into the
 * first header line as a quoted suffix (`flowchart TD` → `flowchart TD "T"`).
 *
 * Most per-diagram header regexes already accept a trailing quoted title, or
 * tolerate trailing tokens. Diagram types whose grammar would reject the
 * appended title are left alone — the frontmatter is silently dropped rather
 * than producing a misleading parse error.
 */
/**
 * Strip a Markdown code fence wrapping the whole input. LLMs very frequently
 * wrap their diagram output in ```` ```mermaid … ``` ```` / ```` ``` … ``` ````
 * fences; left in place the first line (` ```mermaid `) is treated as the
 * diagram header and the entire diagram fails to detect/parse. We remove a
 * leading fence line and a trailing fence line independently (so a truncated
 * artifact with only an opening fence is still recovered). A bare ```` ``` ````
 * line is never valid diagram syntax, so this is safe; inputs with no fence are
 * returned untouched.
 */
function stripCodeFences(text: string): string {
  let t = text;
  t = t.replace(/^\uFEFF?[ \t]*```[A-Za-z0-9_-]*[ \t]*\r?\n/, "");
  t = t.replace(/\r?\n[ \t]*```[ \t]*$/, "");
  return t;
}

/**
 * Forgive an abbreviated header keyword once the target engine is known.
 * LLMs routinely shorten the type line (`flow` → flowchart, `org` → orgchart,
 * `gen` → genogram, `ped` → pedigree, `seq` → sequence, `socio` → sociogram,
 * `eco` → ecomap). When the first token is a prefix (≥3 chars) of the resolved
 * diagram type, rewrite just that token to the canonical keyword so the
 * per-engine header check passes. Headerless grammars (mindmap's `# Title`) and
 * already-canonical / unrelated first tokens are left untouched.
 */
function normalizeHeader(text: string, type: string): string {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^([A-Za-z][A-Za-z0-9_-]*)/);
    if (!m) return text;
    const tok = m[1]!;
    const lower = tok.toLowerCase();
    if (lower === type) return text;
    if (lower.length >= 3 && type.startsWith(lower)) {
      const idx = lines[i]!.indexOf(tok);
      lines[i] = lines[i]!.slice(0, idx) + type + lines[i]!.slice(idx + tok.length);
      return lines.join("\n");
    }
    return text;
  }
  return text;
}

function preprocess(text: string): string {
  const { data, body } = parseFrontmatter(stripCodeFences(text));
  if (!data.title) return body;
  // Strip the title here — `data.title` was already unquoted by parseFrontmatter.
  const safeTitle = data.title.replace(/"/g, '\\"');
  // Find the first non-blank line in body and append the title if it doesn't
  // already carry a quoted region.
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (trimmed === "") continue;
    // Already has a quoted title — frontmatter loses.
    if (/["“「『«][^"”」』»]+["”」』»]/.test(trimmed)) return body;
    lines[i] = lines[i]!.replace(/\s*$/, ` "${safeTitle}"`);
    return lines.join("\n");
  }
  return body;
}

/**
 * Parse DSL text to the diagram's AST and return it as a plain object.
 * Useful for JSON serialization, programmatic inspection, or custom renderers.
 *
 * @example
 * ```ts
 * const ast = parse('genogram\n  alice [female]');
 * console.log(JSON.stringify(ast, null, 2));
 * ```
 */
export function parse(text: string, config?: SchematexConfig): unknown {
  const prepared0 = preprocess(text);
  const plugin = detectPlugin(prepared0, config);
  const prepared = normalizeHeader(prepared0, plugin.type);
  if (plugin.parse) return plugin.parse(prepared);
  throw new Error(
    `Diagram type '${plugin.type}' does not yet expose a parse() method.`
  );
}

export function parseResult(
  text: string,
  config?: SchematexConfig
): SchematexParseResult {
  let plugin: DiagramPlugin | undefined;
  try {
    const prepared0 = preprocess(text);
    plugin = detectPlugin(prepared0, config);
    if (!plugin.parse) {
      throw new Error(
        `Diagram type '${plugin.type}' does not yet expose a parse() method.`
      );
    }
    const prepared = normalizeHeader(prepared0, plugin.type);
    const ast = plugin.parse(prepared);
    const diagnostics = runLint(plugin, prepared);
    return {
      ok: true,
      status: diagnostics.length > 0 ? "partial" : "valid",
      type: plugin.type,
      ast,
      diagnostics,
    };
  } catch (err) {
    return {
      ok: false,
      status: "invalid",
      type: plugin?.type ?? config?.type ?? null,
      diagnostics: [diagnosticFromError(err)],
    };
  }
}

/**
 * Run a plugin's optional lint pass defensively — a lint hook must never break
 * parsing/rendering, so any throw is swallowed and treated as "no warnings".
 */
function runLint(plugin: DiagramPlugin, prepared: string): SchematexDiagnostic[] {
  if (!plugin.lint) return [];
  try {
    return plugin.lint(prepared);
  } catch {
    return [];
  }
}

export function render(text: string, config?: SchematexConfig): string {
  if (config?.mode === "preview") return renderResult(text, config).svg;

  const prepared0 = preprocess(text);
  const plugin = detectPlugin(prepared0, config);
  const prepared = normalizeHeader(prepared0, plugin.type);
  return renderWithPlugin(prepared, plugin, config);
}

export function renderResult(
  text: string,
  config?: SchematexConfig
): SchematexRenderResult {
  let plugin: DiagramPlugin | undefined;
  try {
    const prepared0 = preprocess(text);
    plugin = detectPlugin(prepared0, config);
    const prepared = normalizeHeader(prepared0, plugin.type);
    const svg = renderWithPlugin(prepared, plugin, config);
    const diagnostics = runLint(plugin, prepared);
    return {
      ok: true,
      status: diagnostics.length > 0 ? "partial" : "valid",
      type: plugin.type,
      svg,
      diagnostics,
    };
  } catch (err) {
    const type = plugin?.type ?? config?.type ?? null;
    const diagnostics = [diagnosticFromError(err)];
    return {
      ok: false,
      status: "invalid",
      type,
      svg: renderDiagnosticSvg(diagnostics, type, {
        fontFamily: config?.fontFamily,
      }),
      diagnostics,
    };
  }
}

export function renderPreview(text: string, config?: SchematexConfig): string {
  return renderResult(text, config).svg;
}

function renderWithPlugin(
  prepared: string,
  plugin: DiagramPlugin,
  config?: SchematexConfig
): string {
  const renderConfig: RenderConfig = {
    fontFamily: config?.fontFamily ?? "system-ui, -apple-system, sans-serif",
    fontSize: 12,
    theme: config?.theme ?? "default",
    padding: config?.padding ?? 20,
  };
  return plugin.render(prepared, renderConfig);
}
