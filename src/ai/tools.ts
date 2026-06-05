/**
 * AI-facing tool functions — the five tools an LLM uses to work with Schematex.
 *
 * Pure TypeScript, zero framework deps. Both the Vercel AI SDK adapter
 * (ai-sdk.ts) and the MCP server wrap these functions.
 */
import {
  parseResult,
  renderResult,
  type SchematexConfig,
} from "../core/api";
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
