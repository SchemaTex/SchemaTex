import type { DiagramPlugin, DiagramType, RenderConfig, SceneItem, SourceRange } from "./types";
import {
  findArtifactWrapperRanges,
  parseFrontmatter,
  stripLineComment,
  UNIVERSAL_COMMENT_MARKERS,
} from "./dsl-preprocess";
import { parseMachineSections } from "./editing";
import { createSourceLocator, findFirstQuotedRange } from "./source-range";
import { sourceRevision } from "./revision";
import { TITLE_SCENE_ID } from "./title-scene";
import { isInteractiveDiagramType } from "./interactive-capabilities";
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
import { rbd } from "../diagrams/rbd";
import { comparison } from "../diagrams/comparison";
import { causalloop } from "../diagrams/causalloop";
import { markov } from "../diagrams/markov";
import { gitgraph } from "../diagrams/gitgraph";
import { epc } from "../diagrams/epc";
import { idef0 } from "../diagrams/idef0";
import { threatmodel } from "../diagrams/threatmodel";
import { welding } from "../diagrams/welding";
import { floorplan } from "../diagrams/floorplan";
import { siteplan } from "../diagrams/siteplan";
import { playbook } from "../diagrams/playbook";

export interface SchematexConfig {
  type?: DiagramType;
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
  /** Opt in to derived geometry/source metadata and data-sx-* SVG hooks. */
  scene?: boolean;
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
  rbd,
  comparison,
  causalloop,
  markov,
  gitgraph,
  epc,
  idef0,
  threatmodel,
  welding,
  floorplan,
  siteplan,
  playbook,
];

function servesType(plugin: DiagramPlugin, type: DiagramType): boolean {
  return plugin.type === type || plugin.altTypes?.includes(type) === true;
}

function requestedType(plugin: DiagramPlugin, config?: SchematexConfig): DiagramType {
  return config?.type && servesType(plugin, config.type) ? config.type : plugin.type;
}

function detectPlugin(text: string, config?: SchematexConfig): DiagramPlugin {
  if (config?.type) {
    const type = config.type;
    const plugin = plugins.find((candidate) => servesType(candidate, type));
    if (plugin) return plugin;
  }
  for (const plugin of plugins) {
    if (plugin.detect(text)) return plugin;
  }
  throw new Error(
    "Cannot detect diagram type. Start your text with 'genogram', 'ecomap', 'pedigree', 'phylo', 'sociogram', 'timing', 'logic', 'circuit', 'blockdiagram', 'ladder', 'sld', 'entity-structure', 'fishbone', 'venn', 'flowchart', 'mindmap', 'matrix', 'orgchart', 'state', 'pid', 'erd', 'breadboard', 'bpmn', 'fbd', 'sfc', 'prisma', 'usecase', 'pert', 'sequence', 'petri', 'network', 'umlclass', 'faulttree', 'bowtie', 'rbd', 'floorplan', 'evacuation', 'stageplot', 'siteplan', or 'playbook'."
  );
}

interface MappedText {
  text: string;
  /** Processed UTF-16 boundary offset → original UTF-16 boundary offset. */
  boundaries: number[];
}

interface PreparedInput extends MappedText {
  source: string;
  pins: Map<string, { x: number; y: number }>;
  diagnostics: SchematexDiagnostic[];
  /** Original authored range when a frontmatter title was synthesized into the parser header. */
  frontmatterTitleRange?: SourceRange;
}

function originalMappedText(source: string): MappedText {
  return { text: source, boundaries: Array.from({ length: source.length + 1 }, (_, i) => i) };
}

function replaceMapped(
  input: MappedText,
  start: number,
  end: number,
  replacement: string
): MappedText {
  const anchorStart = input.boundaries[start] ?? input.boundaries[input.boundaries.length - 1] ?? 0;
  const anchorEnd = input.boundaries[end] ?? anchorStart;
  const inserted = Array.from({ length: replacement.length + 1 }, (_, i) =>
    i === replacement.length ? anchorEnd : anchorStart
  );
  return {
    text: input.text.slice(0, start) + replacement + input.text.slice(end),
    boundaries: [
      ...input.boundaries.slice(0, start),
      ...inserted,
      ...input.boundaries.slice(end + 1),
    ],
  };
}

function blankMapped(input: MappedText, start: number, end: number): MappedText {
  const replacement = input.text
    .slice(start, end)
    .replace(/[^\r\n]/g, " ");
  return {
    text: input.text.slice(0, start) + replacement + input.text.slice(end),
    boundaries: input.boundaries,
  };
}

interface TextLine {
  start: number;
  contentEnd: number;
  end: number;
  text: string;
}

function textLines(source: string): TextLine[] {
  const result: TextLine[] = [];
  let start = 0;
  while (start <= source.length) {
    const nl = source.indexOf("\n", start);
    const end = nl < 0 ? source.length : nl + 1;
    let contentEnd = nl < 0 ? source.length : nl;
    if (contentEnd > start && source[contentEnd - 1] === "\r") contentEnd--;
    result.push({ start, contentEnd, end, text: source.slice(start, contentEnd) });
    if (nl < 0) break;
    start = nl + 1;
  }
  return result;
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
/** Blank globally invalid LLM wrappers while preserving source offsets. */
function blankArtifactWrappers(input: MappedText): MappedText {
  let result = input;
  for (const range of findArtifactWrapperRanges(input.text)) {
    result = blankMapped(result, range.start, range.end);
  }
  return result;
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
function normalizeHeader(input: MappedText, type: string): MappedText {
  const lines = textLines(input.text);
  for (const line of lines) {
    const trimmed = line.text.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^([A-Za-z][A-Za-z0-9_-]*)/);
    if (!m) return input;
    const tok = m[1]!;
    const lower = tok.toLowerCase();
    if (lower === type) return input;
    if (lower.length >= 3 && type.startsWith(lower)) {
      const inLine = line.text.indexOf(tok);
      const start = line.start + inLine;
      return replaceMapped(input, start, start + tok.length, type);
    }
    return input;
  }
  return input;
}

/**
 * Header keyword(s) to try when a type-forced body only parses once a header is
 * prepended. Most engines use the bare type name as a valid header; erd's
 * Mermaid dialect needs `erDiagram` (bare `erd` selects the native table/ref
 * parser, which rejects crow's-foot relationship lines).
 */
function headerCandidates(type: string): string[] {
  if (type === "erd") return ["erDiagram", "erd"];
  if (type === "evacuation") return ["evacuation"];
  return [type];
}

/**
 * When the diagram type is explicitly known (forced via `config.type`) the
 * header line is redundant — the caller already told us the type. LLMs, having
 * declared the engine in the artifact tag, routinely omit it and emit pure
 * content (`CEO\n  VP…`, `Customer ||--o{ Order…`). If the body does not
 * detect as this type, prepend the canonical header and keep it **only if the
 * result parses cleanly** — so a genuine syntax error is never masked (a body
 * that is malformed for other reasons still fails with its real error).
 *
 * Headerless grammars (mindmap's `# Title`) already `detect()` true, so they
 * short-circuit and are never touched.
 */
function recoverHeader(
  plugin: DiagramPlugin,
  prepared: MappedText,
  forced: boolean,
  type: DiagramType
): MappedText {
  if (!forced || !plugin.parse || plugin.detect(prepared.text)) return prepared;
  for (const hdr of headerCandidates(type)) {
    const candidate = replaceMapped(prepared, 0, 0, `${hdr}\n`);
    if (!plugin.detect(candidate.text)) continue;
    try {
      plugin.parse(candidate.text);
      return candidate;
    } catch {
      // this header candidate doesn't resolve the body — try the next
    }
  }
  return prepared;
}

function blankFrontmatter(input: MappedText): {
  mapped: MappedText;
  data: Record<string, string>;
  titleRange?: { start: number; end: number };
} {
  const parsed = parseFrontmatter(input.text);
  if (Object.keys(parsed.data).length === 0) return { mapped: input, data: {} };
  const lines = textLines(input.text);
  let open = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.text.trim();
    if (trimmed === "") continue;
    if (/^-{3,}\s*$/.test(trimmed)) open = i;
    break;
  }
  if (open < 0) return { mapped: input, data: {} };
  let close = -1;
  for (let i = open + 1; i < lines.length; i++) {
    if (/^-{3,}\s*$/.test(lines[i]!.text.trim())) {
      close = i;
      break;
    }
  }
  if (close < 0) return { mapped: input, data: {} };
  let titleRange: { start: number; end: number } | undefined;
  for (let i = open + 1; i < close; i++) {
    const line = lines[i]!;
    const trimmed = line.text.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0 || trimmed.slice(0, colon).trim() !== "title") continue;
    const rawValue = trimmed.slice(colon + 1).trim();
    if (!rawValue) break;
    const valueStart = line.text.indexOf(rawValue, line.text.indexOf(trimmed) + colon + 1);
    if (valueStart >= 0) {
      titleRange = {
        start: line.start + valueStart,
        end: line.start + valueStart + rawValue.length,
      };
    }
    break;
  }
  return {
    mapped: blankMapped(input, lines[open]!.start, lines[close]!.contentEnd),
    data: parsed.data,
    titleRange,
  };
}

function blankUniversalComments(input: MappedText): MappedText {
  let result = input;
  for (const line of textLines(input.text)) {
    const kept = stripLineComment(line.text, UNIVERSAL_COMMENT_MARKERS);
    if (kept.length < line.text.length) {
      result = blankMapped(result, line.start + kept.length, line.contentEnd);
    }
  }
  return result;
}

function appendFrontmatterTitle(
  input: MappedText,
  titleValue: string | undefined
): { mapped: MappedText; inserted: boolean } {
  if (!titleValue) return { mapped: input, inserted: false };
  const safeTitle = titleValue.replace(/"/g, '\\"');
  for (const line of textLines(input.text)) {
    const trimmed = line.text.trim();
    if (trimmed === "") continue;
    if (findFirstQuotedRange(trimmed)) {
      return { mapped: input, inserted: false };
    }
    let insertAt = line.contentEnd;
    while (insertAt > line.start && /[ \t]/.test(input.text[insertAt - 1]!)) insertAt--;
    return {
      mapped: replaceMapped(input, insertAt, insertAt, ` "${safeTitle}"`),
      inserted: true,
    };
  }
  return { mapped: input, inserted: false };
}

function preprocess(source: string): PreparedInput {
  let mapped = blankArtifactWrappers(originalMappedText(source));
  const frontmatter = blankFrontmatter(mapped);
  const locator = createSourceLocator(source);
  const frontmatterTitleRange = frontmatter.titleRange
    ? locator.range(
        mapped.boundaries[frontmatter.titleRange.start] ?? source.length,
        mapped.boundaries[frontmatter.titleRange.end] ?? source.length
      )
    : undefined;
  mapped = frontmatter.mapped;
  const machine = parseMachineSections(mapped.text);
  mapped = { text: machine.body, boundaries: mapped.boundaries };
  mapped = blankUniversalComments(mapped);
  const titled = appendFrontmatterTitle(mapped, frontmatter.data.title);
  mapped = titled.mapped;
  return {
    source,
    text: mapped.text,
    boundaries: mapped.boundaries,
    pins: machine.pins,
    diagnostics: machine.diagnostics,
    ...(titled.inserted && frontmatterTitleRange ? { frontmatterTitleRange } : {}),
  };
}

function prepareForPlugin(
  input: PreparedInput,
  plugin: DiagramPlugin,
  forced: boolean,
  type: DiagramType = plugin.type
): PreparedInput {
  const normalized = normalizeHeader(input, type);
  const recovered = recoverHeader(plugin, normalized, forced, type);
  return { ...input, text: recovered.text, boundaries: recovered.boundaries };
}

function remapRange(
  range: SourceRange,
  prepared: PreparedInput,
  locate: (start: number, end: number) => SourceRange
): SourceRange {
  const start = prepared.boundaries[range.start] ?? prepared.source.length;
  const end = prepared.boundaries[range.end] ?? start;
  return locate(start, end);
}

function remapScene(scene: SceneItem[], prepared: PreparedInput): SceneItem[] {
  const locator = createSourceLocator(prepared.source);
  const revision = sourceRevision(prepared.source);
  return scene.map((item) => {
    const sourceRange =
      item.semanticId === TITLE_SCENE_ID && prepared.frontmatterTitleRange
        ? prepared.frontmatterTitleRange
        : item.sourceRange
          ? remapRange(item.sourceRange, prepared, locator.range)
          : undefined;
    const labelSourceRanges = item.labelSourceRanges?.map((range) =>
      remapRange(range, prepared, locator.range)
    );
    const editableLabel = item.editable.label && sourceRange !== undefined;
    return {
      ...item,
      sourceRevision: revision,
      sourceRange,
      expectedText: editableLabel
        ? prepared.source.slice(sourceRange.start, sourceRange.end)
        : undefined,
      labelSourceRanges,
      labelExpectedTexts: labelSourceRanges?.map((range) =>
        prepared.source.slice(range.start, range.end)
      ),
      editable: editableLabel === item.editable.label
        ? item.editable
        : { ...item.editable, label: editableLabel },
      positionSource: item.positionSource
      ? {
          ...item.positionSource,
          range: remapRange(item.positionSource.range, prepared, locator.range),
          ...(item.positionSource.kind === "source-block"
            ? {
                blocks: item.positionSource.blocks.map((range) =>
                  remapRange(range, prepared, locator.range)
                ),
              }
            : {}),
        }
      : undefined,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSourceRange(value: unknown): value is SourceRange {
  if (!isRecord(value)) return false;
  return ["start", "end", "line", "colStart", "colEnd"].every(
    (key) => typeof value[key] === "number"
  );
}

function remapAstSourceRanges(ast: unknown, prepared: PreparedInput): void {
  const locator = createSourceLocator(prepared.source);
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    if (!isRecord(value) || value instanceof Map) return;
    for (const [key, child] of Object.entries(value)) {
      if (key.endsWith("SourceRange") && isSourceRange(child)) {
        value[key] =
          key === "titleSourceRange" && prepared.frontmatterTitleRange
            ? prepared.frontmatterTitleRange
            : remapRange(child, prepared, locator.range);
      } else {
        visit(child);
      }
    }
  };
  visit(ast);
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
  const plugin = detectPlugin(prepared0.text, config);
  if (!plugin.parse) {
    throw new Error(
      `Diagram type '${plugin.type}' does not yet expose a parse() method.`
    );
  }
  const type = requestedType(plugin, config);
  const forced = config?.type != null && servesType(plugin, config.type);
  const prepared = prepareForPlugin(prepared0, plugin, forced, type);
  const ast = plugin.parse(prepared.text);
  remapAstSourceRanges(ast, prepared);
  return ast;
}

export function parseResult(
  text: string,
  config?: SchematexConfig
): SchematexParseResult {
  let plugin: DiagramPlugin | undefined;
  try {
    const prepared0 = preprocess(text);
    plugin = detectPlugin(prepared0.text, config);
    if (!plugin.parse) {
      throw new Error(
        `Diagram type '${plugin.type}' does not yet expose a parse() method.`
      );
    }
    const type = requestedType(plugin, config);
    const forced = config?.type != null && servesType(plugin, config.type);
    const prepared = prepareForPlugin(prepared0, plugin, forced, type);
    const ast = plugin.parse(prepared.text);
    remapAstSourceRanges(ast, prepared);
    const diagnostics = [...prepared.diagnostics, ...runLint(plugin, prepared.text)];
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
  const plugin = detectPlugin(prepared0.text, config);
  const type = requestedType(plugin, config);
  const forced = config?.type != null && servesType(plugin, config.type);
  const prepared = prepareForPlugin(prepared0, plugin, forced, type);
  return renderWithPlugin(prepared, plugin, type, config).svg;
}

export function renderResult(
  text: string,
  config?: SchematexConfig
): SchematexRenderResult {
  let plugin: DiagramPlugin | undefined;
  try {
    const prepared0 = preprocess(text);
    plugin = detectPlugin(prepared0.text, config);
    const type = requestedType(plugin, config);
    const forced = config?.type != null && servesType(plugin, config.type);
    const prepared = prepareForPlugin(prepared0, plugin, forced, type);
    const rendered = renderWithPlugin(prepared, plugin, type, config);
    const diagnostics = [...prepared.diagnostics, ...runLint(plugin, prepared.text)];
    return {
      ok: true,
      status: diagnostics.length > 0 ? "partial" : "valid",
      type: plugin.type,
      svg: rendered.svg,
      diagnostics,
      ...(rendered.scene ? { scene: rendered.scene } : {}),
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
  prepared: PreparedInput,
  plugin: DiagramPlugin,
  type: DiagramType,
  config?: SchematexConfig
): { svg: string; scene?: SceneItem[] } {
  let scene: SceneItem[] | undefined;
  if (
    config?.scene === true &&
    plugin.capabilities?.scene &&
    isInteractiveDiagramType(type)
  ) {
    scene = [];
  }
  const renderConfig: RenderConfig = {
    fontFamily: config?.fontFamily ?? "system-ui, -apple-system, sans-serif",
    fontSize: 12,
    theme: config?.theme ?? "default",
    padding: config?.padding ?? 20,
    __scene: scene,
    __pins: prepared.pins,
    __source: prepared.text,
  };
  const svg = plugin.render(prepared.text, renderConfig);
  return {
    svg,
    scene: scene ? remapScene(scene, prepared) : undefined,
  };
}
