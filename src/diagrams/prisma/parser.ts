/**
 * PRISMA 2020 DSL parser.
 *
 * Indentation-significant (2 spaces per level), comments via `#` / `//`.
 * Spec: docs/reference/28-PRISMA-STANDARD.md §6
 */

import type {
  PrismaAST,
  PrismaEligibility,
  PrismaExclusion,
  PrismaIdentificationDatabases,
  PrismaIdentificationOther,
  PrismaIncluded,
  PrismaKind,
  PrismaMode,
  PrismaPreviousStudies,
  PrismaReason,
  PrismaScreening,
  PrismaSource,
  PrismaValidateCounts,
} from "./types";

export class PrismaParseError extends Error {
  constructor(
    message: string,
    public line?: number,
  ) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "PrismaParseError";
  }
}

interface RawLine {
  indent: number;
  text: string;
  line: number;
}

function preprocess(src: string): RawLine[] {
  const out: RawLine[] = [];
  const rows = src.split(/\r?\n/);
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i] ?? "";
    // Strip end-of-line comments but preserve `#` inside quotes.
    const stripped = stripComment(raw);
    if (!stripped.trim()) continue;
    const indentSpaces = stripped.length - stripped.replace(/^\s+/, "").length;
    out.push({
      indent: Math.floor(indentSpaces / 2),
      text: stripped.trim(),
      line: i + 1,
    });
  }
  return out;
}

function stripComment(raw: string): string {
  // Lines starting with # or // are full-line comments.
  const t = raw.trimStart();
  if (t.startsWith("#") || t.startsWith("//")) return "";
  // End-of-line `# …` (only if # is not inside quotes — sources/reasons can include "#" via quoting; keep simple: respect quotes).
  let inQ = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') inQ = !inQ;
    else if (!inQ && c === "#") return raw.slice(0, i);
  }
  return raw;
}

function parseInt10(s: string, lineNum: number): number {
  const cleaned = s.replace(/[,_\s]/g, "");
  if (!/^-?\d+$/.test(cleaned)) {
    throw new PrismaParseError(`expected integer, got "${s}"`, lineNum);
  }
  return Number.parseInt(cleaned, 10);
}

function splitKV(text: string, lineNum: number): { key: string; value: string } {
  const colon = text.indexOf(":");
  if (colon < 0) throw new PrismaParseError(`expected "key: value", got "${text}"`, lineNum);
  return {
    key: text.slice(0, colon).trim().toLowerCase(),
    value: text.slice(colon + 1).trim(),
  };
}

/**
 * Split "name=count, other name=count" into pairs. Honours double-quoted names
 * for items with spaces or commas.
 */
function parsePairs(value: string, lineNum: number): Array<{ name: string; count: number }> {
  const out: Array<{ name: string; count: number }> = [];
  if (!value.trim()) return out;
  const tokens: string[] = [];
  let buf = "";
  let inQ = false;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '"') { inQ = !inQ; buf += c; continue; }
    if (!inQ && c === ",") {
      if (buf.trim()) tokens.push(buf.trim());
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim()) tokens.push(buf.trim());

  for (const tok of tokens) {
    const eq = tok.lastIndexOf("=");
    if (eq < 0) {
      throw new PrismaParseError(`expected "name=count", got "${tok}"`, lineNum);
    }
    let name = tok.slice(0, eq).trim();
    const countStr = tok.slice(eq + 1).trim();
    if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1);
    if (!name) throw new PrismaParseError(`empty name in pair "${tok}"`, lineNum);
    out.push({ name, count: parseInt10(countStr, lineNum) });
  }
  return out;
}

/**
 * Consume contiguous child lines whose indent > parentIndent. Returns them,
 * and advances `cursor.i`.
 */
function consumeBlock(
  lines: RawLine[],
  cursor: { i: number },
  parentIndent: number,
): RawLine[] {
  const out: RawLine[] = [];
  while (cursor.i < lines.length) {
    const l = lines[cursor.i]!;
    if (l.indent <= parentIndent) break;
    out.push(l);
    cursor.i++;
  }
  return out;
}

/** Group a block of children by their first-level keys. */
function splitChildren(block: RawLine[]): Map<string, { header: RawLine; children: RawLine[] }> {
  const out = new Map<string, { header: RawLine; children: RawLine[] }>();
  if (block.length === 0) return out;
  const baseIndent = block[0]!.indent;
  for (let i = 0; i < block.length; i++) {
    const l = block[i]!;
    if (l.indent !== baseIndent) {
      throw new PrismaParseError(
        `unexpected indent in block (expected ${baseIndent * 2} spaces, got ${l.indent * 2})`,
        l.line,
      );
    }
    const { key, value } = splitKV(l.text, l.line);
    // Find children whose indent is greater than this base, contiguous.
    const childs: RawLine[] = [];
    let j = i + 1;
    while (j < block.length && block[j]!.indent > baseIndent) {
      childs.push(block[j]!);
      j++;
    }
    // Re-pack: the line itself goes in as "header" so the value (if any) can be read.
    out.set(key, { header: { ...l, text: value ? `${key}: ${value}` : `${key}:` }, children: childs });
    i = j - 1;
  }
  return out;
}

function readScalar(map: Map<string, { header: RawLine; children: RawLine[] }>, key: string): { value: string; line: number } | undefined {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (entry.children.length > 0) {
    throw new PrismaParseError(`"${key}" must be a single-line value, not a block`, entry.header.line);
  }
  const { value } = splitKV(entry.header.text, entry.header.line);
  return { value, line: entry.header.line };
}

function readInt(map: Map<string, { header: RawLine; children: RawLine[] }>, key: string): number | undefined {
  const r = readScalar(map, key);
  if (r === undefined) return undefined;
  return parseInt10(r.value, r.line);
}

function readSources(map: Map<string, { header: RawLine; children: RawLine[] }>, key: string): PrismaSource[] | undefined {
  const r = readScalar(map, key);
  if (r === undefined) return undefined;
  return parsePairs(r.value, r.line);
}

function readReasons(map: Map<string, { header: RawLine; children: RawLine[] }>, key: string): PrismaReason[] | undefined {
  const r = readScalar(map, key);
  if (r === undefined) return undefined;
  return parsePairs(r.value, r.line);
}

function readBlock(map: Map<string, { header: RawLine; children: RawLine[] }>, key: string): RawLine[] | undefined {
  const entry = map.get(key);
  if (!entry) return undefined;
  return entry.children;
}

function requireInt(
  map: Map<string, { header: RawLine; children: RawLine[] }>,
  key: string,
  contextLine: number,
  context: string,
): number {
  const v = readInt(map, key);
  if (v === undefined) {
    throw new PrismaParseError(`${context} is missing required field "${key}"`, contextLine);
  }
  return v;
}

const ALLOWED_IDENT_DB = new Set([
  "n",
  "sources",
  "duplicates-removed",
  "ineligible-automation",
  "other-removed",
]);
const ALLOWED_IDENT_OTHER = new Set(["n", "sources"]);
const ALLOWED_SCREENING = new Set([
  "records-screened",
  "excluded",
  "reports-sought",
  "reports-not-retrieved",
]);
const ALLOWED_ELIGIBILITY = new Set(["full-text-assessed", "excluded"]);
const ALLOWED_INCLUDED = new Set(["studies", "reports", "participants"]);
const ALLOWED_EXCLUDED = new Set(["n", "reasons"]);
const ALLOWED_PREVIOUS = new Set(["n", "reports", "sources"]);
const ALLOWED_IDENT_TOP = new Set(["databases", "other"]);

function assertKeys(
  map: Map<string, { header: RawLine; children: RawLine[] }>,
  allowed: Set<string>,
  context: string,
): void {
  for (const [k, entry] of map.entries()) {
    if (!allowed.has(k)) {
      throw new PrismaParseError(`unknown key "${k}" in ${context}`, entry.header.line);
    }
  }
}

function parseExclusion(block: RawLine[], contextLine: number): PrismaExclusion {
  const map = splitChildren(block);
  assertKeys(map, ALLOWED_EXCLUDED, "excluded");
  const n = requireInt(map, "n", contextLine, "excluded");
  const reasons = readReasons(map, "reasons");
  return reasons ? { n, reasons } : { n };
}

function parsePreviousBlock(block: RawLine[], contextLine: number): PrismaPreviousStudies {
  const map = splitChildren(block);
  assertKeys(map, ALLOWED_PREVIOUS, "previous-studies");
  const n = requireInt(map, "n", contextLine, "previous-studies");
  const reports = readInt(map, "reports");
  const sources = readSources(map, "sources");
  const out: PrismaPreviousStudies = { n };
  if (reports !== undefined) out.reports = reports;
  if (sources) out.sources = sources;
  return out;
}

function parseIdentificationDatabases(block: RawLine[], contextLine: number): PrismaIdentificationDatabases {
  const map = splitChildren(block);
  assertKeys(map, ALLOWED_IDENT_DB, "identification.databases");
  const n = requireInt(map, "n", contextLine, "identification.databases");
  const sources = readSources(map, "sources");
  const duplicatesRemoved = readInt(map, "duplicates-removed");
  const ineligibleAutomation = readInt(map, "ineligible-automation");
  const otherRemoved = readInt(map, "other-removed");
  const out: PrismaIdentificationDatabases = { n };
  if (sources) out.sources = sources;
  if (duplicatesRemoved !== undefined) out.duplicatesRemoved = duplicatesRemoved;
  if (ineligibleAutomation !== undefined) out.ineligibleAutomation = ineligibleAutomation;
  if (otherRemoved !== undefined) out.otherRemoved = otherRemoved;
  return out;
}

function parseIdentificationOther(block: RawLine[], contextLine: number): PrismaIdentificationOther {
  const map = splitChildren(block);
  assertKeys(map, ALLOWED_IDENT_OTHER, "identification.other");
  const n = requireInt(map, "n", contextLine, "identification.other");
  const sources = readSources(map, "sources");
  return sources ? { n, sources } : { n };
}

function parseScreening(block: RawLine[], contextLine: number): PrismaScreening {
  const map = splitChildren(block);
  assertKeys(map, ALLOWED_SCREENING, "screening");
  const recordsScreened = requireInt(map, "records-screened", contextLine, "screening");
  const excludedBlock = readBlock(map, "excluded");
  if (!excludedBlock || excludedBlock.length === 0) {
    throw new PrismaParseError(`screening is missing required "excluded:" block`, contextLine);
  }
  const excluded = parseExclusion(excludedBlock, map.get("excluded")!.header.line);
  const reportsSought = readInt(map, "reports-sought");
  const reportsNotRetrieved = readInt(map, "reports-not-retrieved");
  const out: PrismaScreening = { recordsScreened, excluded };
  if (reportsSought !== undefined) out.reportsSought = reportsSought;
  if (reportsNotRetrieved !== undefined) out.reportsNotRetrieved = reportsNotRetrieved;
  return out;
}

function parseEligibility(block: RawLine[], contextLine: number): PrismaEligibility {
  const map = splitChildren(block);
  assertKeys(map, ALLOWED_ELIGIBILITY, "eligibility");
  const fullTextAssessed = requireInt(map, "full-text-assessed", contextLine, "eligibility");
  const excludedBlock = readBlock(map, "excluded");
  if (!excludedBlock || excludedBlock.length === 0) {
    throw new PrismaParseError(`eligibility is missing required "excluded:" block`, contextLine);
  }
  const excluded = parseExclusion(excludedBlock, map.get("excluded")!.header.line);
  return { fullTextAssessed, excluded };
}

function parseIncluded(block: RawLine[], contextLine: number): PrismaIncluded {
  const map = splitChildren(block);
  assertKeys(map, ALLOWED_INCLUDED, "included");
  const studies = requireInt(map, "studies", contextLine, "included");
  const reports = readInt(map, "reports");
  const participants = readInt(map, "participants");
  const out: PrismaIncluded = { studies };
  if (reports !== undefined) out.reports = reports;
  if (participants !== undefined) out.participants = participants;
  return out;
}

function parseMode(value: string, line: number): PrismaMode {
  const v = value.trim().toLowerCase();
  if (v === "2020-single" || v === "2020-dual" || v === "2009") return v;
  throw new PrismaParseError(`unknown mode "${value}" — expected 2020-single, 2020-dual, or 2009`, line);
}

function parseKind(value: string, line: number): PrismaKind {
  const v = value.trim().toLowerCase();
  if (v === "systematic-review" || v === "scoping-review" || v === "ipd" || v === "nma") return v;
  throw new PrismaParseError(`unknown kind "${value}" — expected systematic-review, scoping-review, ipd, or nma`, line);
}

function parseValidate(value: string, line: number): PrismaValidateCounts {
  const v = value.trim().toLowerCase();
  if (v === "strict" || v === "warn" || v === "off") return v;
  throw new PrismaParseError(`validate-counts must be strict|warn|off, got "${value}"`, line);
}

const STAGE_KEYS = new Set([
  "previous-studies",
  "identification",
  "screening",
  "eligibility",
  "included",
]);

export function parsePrisma(src: string): PrismaAST {
  const lines = preprocess(src);
  if (lines.length === 0) throw new PrismaParseError("empty input");

  const header = lines.shift()!;
  if (header.indent !== 0 || header.text.toLowerCase() !== "prisma") {
    throw new PrismaParseError(`first non-blank line must be "prisma", got "${header.text}"`, header.line);
  }

  // Meta lines: indent 0, "key: value", before any stage block.
  let mode: PrismaMode = "2020-single";
  let kind: PrismaKind = "systematic-review";
  let validateCounts: PrismaValidateCounts = "warn";
  let title: string | undefined;
  let reviewId: string | undefined;

  while (lines.length > 0 && lines[0]!.indent === 0) {
    const l = lines[0]!;
    const firstTok = l.text.split(":")[0]!.trim().toLowerCase();
    if (STAGE_KEYS.has(firstTok)) break;
    const { key, value } = splitKV(l.text, l.line);
    switch (key) {
      case "mode":
        mode = parseMode(value, l.line);
        break;
      case "kind":
      case "review-kind":
        kind = parseKind(value, l.line);
        break;
      case "validate-counts":
        validateCounts = parseValidate(value, l.line);
        break;
      case "title":
        title = unquote(value);
        break;
      case "review-id":
        reviewId = unquote(value);
        break;
      case "direction":
        if (!/^(TB|TD)$/i.test(value.trim())) {
          throw new PrismaParseError(`direction must be TB (top-to-bottom); PRISMA is vertical by standard`, l.line);
        }
        break;
      default:
        throw new PrismaParseError(`unknown meta key "${key}"`, l.line);
    }
    lines.shift();
  }

  // Stage blocks.
  const cursor = { i: 0 };
  let previousStudies: PrismaPreviousStudies | undefined;
  let identification: PrismaIdentificationDatabases | undefined;
  let identificationOther: PrismaIdentificationOther | undefined;
  let screening: PrismaScreening | undefined;
  let eligibility: PrismaEligibility | undefined;
  let included: PrismaIncluded | undefined;

  while (cursor.i < lines.length) {
    const head = lines[cursor.i]!;
    if (head.indent !== 0) {
      throw new PrismaParseError(`unexpected indented line at top level: "${head.text}"`, head.line);
    }
    const { key } = splitKV(head.text, head.line);
    cursor.i++;
    const block = consumeBlock(lines, cursor, head.indent);
    switch (key) {
      case "previous-studies":
        previousStudies = parsePreviousBlock(block, head.line);
        break;
      case "identification": {
        const sub = splitChildren(block);
        assertKeys(sub, ALLOWED_IDENT_TOP, "identification");
        const dbBlock = readBlock(sub, "databases");
        if (!dbBlock || dbBlock.length === 0) {
          throw new PrismaParseError(`identification is missing required "databases:" block`, head.line);
        }
        identification = parseIdentificationDatabases(dbBlock, sub.get("databases")!.header.line);
        const otherBlock = readBlock(sub, "other");
        if (otherBlock && otherBlock.length > 0) {
          identificationOther = parseIdentificationOther(otherBlock, sub.get("other")!.header.line);
        }
        break;
      }
      case "screening":
        screening = parseScreening(block, head.line);
        break;
      case "eligibility":
        eligibility = parseEligibility(block, head.line);
        break;
      case "included":
        included = parseIncluded(block, head.line);
        break;
      default:
        throw new PrismaParseError(`unknown stage "${key}"`, head.line);
    }
  }

  if (!identification) throw new PrismaParseError(`required stage "identification" is missing`);
  if (!screening) throw new PrismaParseError(`required stage "screening" is missing`);
  if (!eligibility) throw new PrismaParseError(`required stage "eligibility" is missing`);
  if (!included) throw new PrismaParseError(`required stage "included" is missing`);

  // If user wrote 2020-dual but supplied no "other:" pipeline, downgrade to single with warning.
  // If user wrote 2020-single but supplied "other:", upgrade to 2020-dual.
  const warnings: string[] = [];
  if (mode === "2020-dual" && !identificationOther) {
    warnings.push(`mode is "2020-dual" but no "other:" pipeline was provided — falling back to single column`);
    mode = "2020-single";
  } else if (mode !== "2020-dual" && identificationOther) {
    warnings.push(`an "other:" identification pipeline was supplied — switching mode to "2020-dual"`);
    mode = "2020-dual";
  }

  const ast: PrismaAST = {
    type: "prisma",
    mode,
    kind,
    validateCounts,
    identification,
    screening,
    eligibility,
    included,
    warnings,
  };
  if (title !== undefined) ast.title = title;
  if (reviewId !== undefined) ast.reviewId = reviewId;
  if (previousStudies) ast.previousStudies = previousStudies;
  if (identificationOther) ast.identificationOther = identificationOther;

  runArithmeticValidation(ast);

  return ast;
}

function unquote(s: string): string {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

// ─── Count arithmetic ───────────────────────────────────────────

function runArithmeticValidation(ast: PrismaAST): void {
  if (ast.validateCounts === "off") return;

  const issues: string[] = [];
  const id = ast.identification;
  const other = ast.identificationOther;

  const identifiedTotal =
    id.n + (other ? other.n : 0);
  const removedBeforeScreening =
    (id.duplicatesRemoved ?? 0) +
    (id.ineligibleAutomation ?? 0) +
    (id.otherRemoved ?? 0);
  const expectedScreened = identifiedTotal - removedBeforeScreening;
  const actualScreened = ast.screening.recordsScreened;
  if (expectedScreened !== actualScreened) {
    issues.push(
      `records-screened expected ${formatN(expectedScreened)} ` +
        `(identified ${formatN(identifiedTotal)} − removed ${formatN(removedBeforeScreening)}), ` +
        `got ${formatN(actualScreened)} (off by ${formatN(actualScreened - expectedScreened)})`,
    );
  }

  const screened = ast.screening.recordsScreened;
  const screenedExcluded = ast.screening.excluded.n;
  const afterScreening = screened - screenedExcluded;
  // Allow either: afterScreening == reports-sought, or afterScreening == full-text-assessed.
  const sought = ast.screening.reportsSought;
  const notRetrieved = ast.screening.reportsNotRetrieved ?? 0;
  const fullText = ast.eligibility.fullTextAssessed;
  if (sought !== undefined) {
    if (sought !== afterScreening) {
      issues.push(
        `reports-sought expected ${formatN(afterScreening)} ` +
          `(screened ${formatN(screened)} − excluded ${formatN(screenedExcluded)}), got ${formatN(sought)}`,
      );
    }
    if (fullText !== sought - notRetrieved) {
      issues.push(
        `full-text-assessed expected ${formatN(sought - notRetrieved)} ` +
          `(reports-sought ${formatN(sought)} − not-retrieved ${formatN(notRetrieved)}), got ${formatN(fullText)}`,
      );
    }
  } else {
    if (fullText !== afterScreening) {
      issues.push(
        `full-text-assessed expected ${formatN(afterScreening)} ` +
          `(screened ${formatN(screened)} − excluded ${formatN(screenedExcluded)}), got ${formatN(fullText)}`,
      );
    }
  }

  const eligExcluded = ast.eligibility.excluded.n;
  const includedExpected = fullText - eligExcluded;
  const reports = ast.included.reports ?? ast.included.studies;
  if (reports < includedExpected) {
    issues.push(
      `included reports/studies (${formatN(reports)}) is less than full-text-assessed − reports-excluded (${formatN(includedExpected)})`,
    );
  }

  // Source breakdown sums.
  if (id.sources && id.sources.length > 0) {
    const sum = id.sources.reduce((a, s) => a + s.count, 0);
    if (sum !== id.n) {
      issues.push(
        `identification.databases sources sum to ${formatN(sum)} but n = ${formatN(id.n)} (off by ${formatN(sum - id.n)})`,
      );
    }
  }
  if (other && other.sources && other.sources.length > 0) {
    const sum = other.sources.reduce((a, s) => a + s.count, 0);
    if (sum !== other.n) {
      issues.push(
        `identification.other sources sum to ${formatN(sum)} but n = ${formatN(other.n)}`,
      );
    }
  }
  if (ast.screening.excluded.reasons && ast.screening.excluded.reasons.length > 0) {
    const sum = ast.screening.excluded.reasons.reduce((a, r) => a + r.count, 0);
    if (sum !== screenedExcluded) {
      issues.push(
        `screening.excluded reasons sum to ${formatN(sum)} but n = ${formatN(screenedExcluded)}`,
      );
    }
  }
  if (ast.eligibility.excluded.reasons && ast.eligibility.excluded.reasons.length > 0) {
    const sum = ast.eligibility.excluded.reasons.reduce((a, r) => a + r.count, 0);
    if (sum !== eligExcluded) {
      issues.push(
        `eligibility.excluded reasons sum to ${formatN(sum)} but n = ${formatN(eligExcluded)}`,
      );
    }
  }

  if (issues.length === 0) return;

  if (ast.validateCounts === "strict") {
    throw new PrismaParseError(`count-arithmetic validation failed:\n  - ${issues.join("\n  - ")}`);
  }
  ast.warnings.push(...issues);
}

function formatN(n: number): string {
  return n.toLocaleString("en-US");
}
