/**
 * AI-facing tool functions — the five tools an LLM uses to work with Schematex.
 *
 * Pure TypeScript, zero framework deps. Both the Vercel AI SDK adapter
 * (ai-sdk.ts) and the MCP server wrap these functions.
 */
import { parse, render, type SchematexConfig } from "../core/api";
import {
  DIAGRAM_REGISTRY,
  getDiagramMeta,
  type DiagramMeta,
} from "./registry";
import { extractError, type SchematexValidationError } from "./errors";
import { getExamplesForType, type Example, type GetExamplesOptions } from "./examples";
import { getSyntaxForType, type SyntaxDoc } from "./syntax";

// ─── listDiagrams ───────────────────────────────────────────────

export interface DiagramListItem {
  type: string;
  name: string;
  tagline: string;
  useWhen: string;
  cluster: DiagramMeta["cluster"];
  standard: string;
}

export function listDiagrams(): DiagramListItem[] {
  return DIAGRAM_REGISTRY.map((d) => ({
    type: d.type,
    name: d.name,
    tagline: d.tagline,
    useWhen: d.useWhen,
    cluster: d.cluster,
    standard: d.standard,
  }));
}

// ─── getSyntax ──────────────────────────────────────────────────

export interface GetSyntaxResult {
  type: string;
  name: string;
  standard: string;
  syntax: SyntaxDoc;
}

export function getSyntax(type: string): GetSyntaxResult {
  const meta = getDiagramMeta(type);
  if (!meta) {
    throw new Error(
      `Unknown diagram type '${type}'. Call listDiagrams() for valid types.`
    );
  }
  const syntax = getSyntaxForType(meta.syntaxKey);
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
  | { ok: true; type: string | null }
  | { ok: false; type: string | null; errors: SchematexValidationError[] };

export function validateDsl(type: string | undefined, dsl: string): ValidateDslResult {
  const config: SchematexConfig | undefined = type
    ? { type: type as SchematexConfig["type"] }
    : undefined;
  try {
    parse(dsl, config);
    return { ok: true, type: type ?? resolveTypeFromText(dsl) };
  } catch (err) {
    return {
      ok: false,
      type: type ?? resolveTypeFromText(dsl),
      errors: [extractError(err)],
    };
  }
}

// ─── renderDsl ──────────────────────────────────────────────────

export type RenderDslResult =
  | { ok: true; type: string | null; svg: string }
  | { ok: false; type: string | null; errors: SchematexValidationError[] };

export function renderDsl(
  type: string | undefined,
  dsl: string,
  options: Omit<SchematexConfig, "type"> = {}
): RenderDslResult {
  const config: SchematexConfig = {
    ...options,
    ...(type ? { type: type as SchematexConfig["type"] } : {}),
  };
  try {
    const svg = render(dsl, config);
    return { ok: true, type: type ?? resolveTypeFromText(dsl), svg };
  } catch (err) {
    return {
      ok: false,
      type: type ?? resolveTypeFromText(dsl),
      errors: [extractError(err)],
    };
  }
}

// ─── helpers ────────────────────────────────────────────────────

function resolveTypeFromText(text: string): string | null {
  const first = text.trim().split(/\s+|\n/)[0]?.toLowerCase() ?? "";
  const meta = DIAGRAM_REGISTRY.find((d) => d.type === first);
  return meta?.type ?? null;
}
