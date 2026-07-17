/**
 * AI-facing tool functions — discovery, generation, validation, rendering, and safe editing.
 *
 * Pure TypeScript, zero framework deps. Both the Vercel AI SDK adapter
 * (ai-sdk.ts) and the MCP server wrap these functions.
 */
import {
  parseResult,
  renderResult,
  type SchematexConfig,
} from "../core/api";
import { setLabel, setPosition } from "../core/editing";
import {
  getInteractiveCapabilities as getCoreInteractiveCapabilities,
  type InteractiveCapabilities,
} from "../core/interactive-capabilities";
import { sourceRevision } from "../core/revision";
import type { SceneItem } from "../core/types";
import type { SchematexDiagnostic } from "../core/diagnostics";
import {
  DIAGRAM_REGISTRY,
  getDiagramMeta,
  resolveDiagramType,
  type DiagramMeta,
} from "./registry";
import type { SchematexValidationError } from "./errors";
import { getExamplesForType, type Example, type GetExamplesOptions } from "./examples";
import { getGenerationProfile } from "./profiles";
import {
  getSyntaxForType,
  type SyntaxDetail,
  type SyntaxDoc,
} from "./syntax";

// ─── listDiagrams ───────────────────────────────────────────────

export interface DiagramListItem {
  type: string;
  name: string;
  tagline: string;
  useWhen: string;
  cluster: DiagramMeta["cluster"];
  standard: string;
  /** Other names the same diagram goes by — helps map a user request to a type. */
  aliases?: readonly string[];
  /** Use-case / industry / standard search terms (not names). */
  keywords?: readonly string[];
  interactive: Pick<InteractiveCapabilities, "text" | "position" | "implementation">;
}

export function listDiagrams(): DiagramListItem[] {
  return DIAGRAM_REGISTRY.map((d) => ({
    type: d.type,
    name: d.name,
    tagline: d.tagline,
    useWhen: d.useWhen,
    cluster: d.cluster,
    standard: d.standard,
    ...(d.aliases ? { aliases: d.aliases } : {}),
    ...(d.keywords ? { keywords: d.keywords } : {}),
    interactive: getCoreInteractiveCapabilities(d.type),
  }));
}

// ─── getSyntax ──────────────────────────────────────────────────

export interface GetSyntaxResult {
  type: string;
  name: string;
  standard: string;
  syntax: SyntaxDoc;
}

export interface GetSyntaxOptions {
  /** `canonical` is the compact first-shot generation surface. */
  detail?: SyntaxDetail;
}

export function getSyntax(
  type: string,
  opts: GetSyntaxOptions = {}
): GetSyntaxResult {
  const meta = getDiagramMeta(type);
  if (!meta) {
    throw new Error(
      `Unknown diagram type '${type}'. Call listDiagrams() for valid types.`
    );
  }
  const syntax = getSyntaxForType(meta.syntaxKey, meta.type, opts.detail);
  if (!syntax) {
    throw new Error(`No syntax doc available for '${type}' (key: ${meta.syntaxKey}).`);
  }
  return {
    type: meta.type,
    name: meta.name,
    standard: meta.standard,
    syntax,
  };
}

// ─── getExamples ────────────────────────────────────────────────

export interface GetExamplesResult {
  type: string;
  count: number;
  examples: Example[];
}

export function getExamples(
  type: string,
  opts: GetExamplesOptions = {}
): GetExamplesResult {
  const meta = getDiagramMeta(type);
  if (!meta) {
    throw new Error(
      `Unknown diagram type '${type}'. Call listDiagrams() for valid types.`
    );
  }
  const examples = getExamplesForType(meta.type, opts);
  return { type: meta.type, count: examples.length, examples };
}

// ─── validateDsl ────────────────────────────────────────────────

export type ValidateDslResult =
  | {
      ok: true;
      type: string | null;
      /**
       * `valid` = parsed cleanly; `partial` = parsed and renderable but the
       * engine recovered from incomplete/incorrect input (see `warnings`). A
       * `partial` result still renders — it is NOT a failure.
       */
      status: "valid" | "partial";
      /** Non-fatal lint findings (empty when `status` is `valid`). */
      warnings: SchematexValidationError[];
    }
  | { ok: false; type: string | null; status: "invalid"; errors: SchematexValidationError[] };

export function validateDsl(type: string | undefined, dsl: string): ValidateDslResult {
  const resolvedType = type ? resolveDiagramType(type) : undefined;
  const config: SchematexConfig | undefined = type
    ? { type: (resolvedType ?? type) as SchematexConfig["type"] }
    : undefined;
  const result = parseResult(dsl, config);
  if (result.ok) {
    return {
      ok: true,
      type: result.type,
      status: result.status,
      warnings: result.diagnostics.map((diagnostic) =>
        toValidationError(diagnostic, result.type)
      ),
    };
  }
  return {
    ok: false,
    type: result.type ?? resolvedType ?? resolveTypeFromText(dsl),
    status: "invalid",
    errors: result.diagnostics.map((diagnostic) =>
      toValidationError(diagnostic, result.type ?? resolvedType)
    ),
  };
}

// ─── renderDsl ──────────────────────────────────────────────────

export type RenderDslResult =
  | {
      ok: true;
      status: "valid" | "partial";
      type: string | null;
      svg: string;
    }
  | {
      ok: false;
      status: "invalid";
      type: string | null;
      svg: string;
      errors: SchematexValidationError[];
    };

export function renderDsl(
  type: string | undefined,
  dsl: string,
  options: Omit<SchematexConfig, "type"> = {}
): RenderDslResult {
  const resolvedType = type ? resolveDiagramType(type) : undefined;
  const config: SchematexConfig = {
    ...options,
    ...(type ? { type: (resolvedType ?? type) as SchematexConfig["type"] } : {}),
  };
  const result = renderResult(dsl, config);
  if (result.ok) {
    return {
      ok: true,
      status: result.status,
      type: result.type,
      svg: result.svg,
    };
  }
  return {
    ok: false,
    status: result.status,
    type: result.type ?? resolvedType ?? resolveTypeFromText(dsl),
    svg: result.svg,
    errors: result.diagnostics.map((diagnostic) =>
      toValidationError(diagnostic, result.type ?? resolvedType)
    ),
  };
}

// ─── interactive inspection and atomic edits ───────────────────

export function getDiagramCapabilities(type: string): InteractiveCapabilities {
  const meta = getDiagramMeta(type);
  if (!meta) throw new Error(`Unknown diagram type '${type}'. Call listDiagrams() for valid types.`);
  return getCoreInteractiveCapabilities(meta.type);
}

export interface EditableDiagramItem {
  key: string;
  semanticId?: string;
  kind: SceneItem["kind"];
  label?: string;
  bbox?: SceneItem["bbox"];
  editable: SceneItem["editable"];
}

export type InspectDiagramResult =
  | {
      ok: true;
      type: string;
      revision: number;
      capabilities: InteractiveCapabilities;
      items: EditableDiagramItem[];
      warnings: SchematexValidationError[];
    }
  | {
      ok: false;
      type: string | null;
      revision: number;
      errors: SchematexValidationError[];
    };

function configFor(type: string | undefined): SchematexConfig {
  const resolved = type ? resolveDiagramType(type) : undefined;
  return {
    scene: true,
    ...(type ? { type: (resolved ?? type) as SchematexConfig["type"] } : {}),
  };
}

export function inspectDiagram(type: string | undefined, dsl: string): InspectDiagramResult {
  const result = renderResult(dsl, configFor(type));
  const revision = sourceRevision(dsl);
  if (!result.ok) {
    return {
      ok: false,
      type: result.type,
      revision,
      errors: result.diagnostics.map((entry) => toValidationError(entry, result.type)),
    };
  }
  return {
    ok: true,
    type: result.type,
    revision,
    capabilities: getCoreInteractiveCapabilities(result.type),
    items: (result.scene ?? [])
      .filter((item) => item.editable.label || item.editable.position !== "none")
      .map((item) => ({
        key: item.key,
        ...(item.semanticId ? { semanticId: item.semanticId } : {}),
        kind: item.kind,
        ...(item.label !== undefined ? { label: item.label } : {}),
        ...(item.bbox ? { bbox: item.bbox } : {}),
        editable: item.editable,
      })),
    warnings: result.diagnostics.map((entry) => toValidationError(entry, result.type)),
  };
}

export type DiagramEdit =
  | { target: string; op: "setLabel"; value: string }
  | { target: string; op: "setPosition"; x: number; y: number };

export type ApplyDiagramEditsResult =
  | {
      ok: true;
      type: string;
      dsl: string;
      revision: number;
      warnings: SchematexValidationError[];
    }
  | {
      ok: false;
      type: string | null;
      dsl: string;
      revision: number;
      code: "STALE_REVISION" | "TARGET_NOT_FOUND" | "EDIT_REJECTED" | "INVALID_RESULT";
      errors: SchematexValidationError[];
    };

function editError(message: string, hint?: string): SchematexValidationError {
  return { message, hint };
}

export function applyDiagramEdits(
  type: string | undefined,
  dsl: string,
  revision: number,
  edits: DiagramEdit[],
): ApplyDiagramEditsResult {
  const actualRevision = sourceRevision(dsl);
  if (actualRevision !== revision) {
    return {
      ok: false,
      type: type ? resolveDiagramType(type) ?? type : null,
      dsl,
      revision: actualRevision,
      code: "STALE_REVISION",
      errors: [editError("The diagram changed after inspection.", "Call inspectDiagram again and apply edits to the new revision.")],
    };
  }

  let next = dsl;
  for (const edit of edits) {
    const rendered = renderResult(next, configFor(type));
    if (!rendered.ok) {
      return {
        ok: false,
        type: rendered.type,
        dsl,
        revision,
        code: "INVALID_RESULT",
        errors: rendered.diagnostics.map((entry) => toValidationError(entry, rendered.type)),
      };
    }
    const item = (rendered.scene ?? []).find((entry) => entry.key === edit.target);
    if (!item) {
      return {
        ok: false,
        type: rendered.type,
        dsl,
        revision,
        code: "TARGET_NOT_FOUND",
        errors: [editError(`Editable target '${edit.target}' was not found.`, "Call inspectDiagram again and use an exact returned target key.")],
      };
    }
    const edited = edit.op === "setLabel"
      ? setLabel(next, item, edit.value)
      : setPosition(next, item, { x: edit.x, y: edit.y });
    if (edited.diagnostics.length > 0 || edited.source === next) {
      return {
        ok: false,
        type: rendered.type,
        dsl,
        revision,
        code: "EDIT_REJECTED",
        errors: edited.diagnostics.length > 0
          ? edited.diagnostics.map((entry) => toValidationError(entry, rendered.type))
          : [editError(`Edit for '${edit.target}' did not change the source.`)],
      };
    }
    next = edited.source;
  }

  const final = renderResult(next, configFor(type));
  if (!final.ok) {
    return {
      ok: false,
      type: final.type,
      dsl,
      revision,
      code: "INVALID_RESULT",
      errors: final.diagnostics.map((entry) => toValidationError(entry, final.type)),
    };
  }
  return {
    ok: true,
    type: final.type,
    dsl: next,
    revision: sourceRevision(next),
    warnings: final.diagnostics.map((entry) => toValidationError(entry, final.type)),
  };
}

// ─── helpers ────────────────────────────────────────────────────

function resolveTypeFromText(text: string): string | null {
  const first = text.trim().split(/\s+|\n/)[0]?.toLowerCase() ?? "";
  return resolveDiagramType(first) ?? null;
}

function toValidationError(
  diagnostic: SchematexDiagnostic,
  type?: string | null
): SchematexValidationError {
  return {
    line: diagnostic.line,
    column: diagnostic.column,
    source: diagnostic.source,
    message: diagnostic.message,
    hint: diagnostic.hint ?? repairHint(type, diagnostic.message),
  };
}

function repairHint(type?: string | null, message?: string): string {
  const resolved = type ? resolveDiagramType(type) : undefined;
  const profile = resolved ? getGenerationProfile(resolved) : undefined;
  // Repair entries are authored as `'<real error message>' -> <fix>`. When we
  // have the actual diagnostic, only attach a repair whose quoted error fragment
  // genuinely matches it — a non-matching entry targets a *different* error and
  // would mislead. Fall back to repair[0] only when there is no diagnostic to
  // match against (the message itself is already shown to the model).
  const typeHint = message
    ? profile
      ? matchRepair(profile.repair, message)
      : undefined
    : profile?.repair[0];
  return [
    typeHint,
    "Fix the reported DSL error, then call validateDsl again before rendering or returning DSL.",
  ]
    .filter(Boolean)
    .join(" ");
}

function matchRepair(
  repairs: readonly string[],
  message: string
): string | undefined {
  for (const r of repairs) {
    const quoted = r.match(/^['"]([^'"]+)['"]/);
    if (!quoted) continue;
    // Stable prefix before any ": X" / ": …" placeholder.
    const fragment = quoted[1].split(":")[0].trim();
    if (fragment.length >= 6 && message.includes(fragment)) return r;
  }
  return undefined;
}
