/**
 * FMEA parser — nested, row-structured DSL (item → mode → effect / cause).
 * Per docs/reference/40-FMEA-STANDARD.md §"DSL sketch".
 *
 * The DSL mirrors the AIAG-VDA failure chain: an `item` (with its `fn`) holds
 * `mode`s; each mode holds `effect`s (each carrying its own `sev`) and `cause`s
 * (each carrying `occ`, optional `controls`, and `det`). The nested form flattens
 * to one worksheet row per (item, mode, cause) triple in analysis.ts.
 *
 *   fmea "Brake system DFMEA"
 *     type: design
 *     rank: ap
 *     flag: ap >= High
 *     item "Master cylinder" fn "Generate hydraulic pressure"
 *       mode "Internal seal leak"
 *         effect "Loss of braking" sev: 9
 *         cause "Seal degradation" occ: 3
 *           controls prevention: "Material spec", detection: "Bench test" det: 4
 *     action "Internal seal leak" / "Seal degradation"
 *       do: "Upgrade seal to EPDM" owner: "J. Lee" target: "2026-Q3"
 *       revised sev: 9 occ: 1 det: 4
 *
 * Zero runtime deps. No regex generators. Indentation-tolerant: structure comes
 * from the keyword, not the indent depth.
 */

import type {
  FmeaAction,
  FmeaAst,
  FmeaCause,
  FmeaControls,
  FmeaEffect,
  FmeaItem,
  FmeaMode,
  FmeaRankKey,
  FmeaThreshold,
  FmeaType,
} from "./types";

export class FmeaParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "FmeaParseError";
  }
}

// ─── Public entry ─────────────────────────────────────────────

export function parseFmea(text: string): FmeaAst {
  const ast: FmeaAst = {
    type: "fmea",
    fmeaType: "design",
    rank: "ap",
    items: [],
    actions: [],
    metadata: {},
    warnings: [],
  };

  const rawLines = text.split(/\r?\n/);
  let i = 0;

  // ── Header ──
  let headerSeen = false;
  while (i < rawLines.length) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") { i++; continue; }
    const h = /^fmea\b(.*)$/i.exec(t);
    if (h) {
      const q = matchQuoted(h[1]!.trim());
      if (q) ast.title = q.value;
      headerSeen = true;
      i++;
      break;
    }
    throw new FmeaParseError(
      `FMEA must start with the \`fmea\` keyword (got "${truncate(t, 40)}")`,
      i + 1,
    );
  }
  if (!headerSeen) return ast;

  let curItem: FmeaItem | undefined;
  let curMode: FmeaMode | undefined;
  let curCause: FmeaCause | undefined;
  let curAction: FmeaAction | undefined;

  for (; i < rawLines.length; i++) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") continue;
    const lineNo = i + 1;

    // ── Directives ──
    if (/^type\s*:/i.test(t)) {
      ast.fmeaType = parseType(afterColon(t), lineNo);
      continue;
    }
    if (/^rank\s*:/i.test(t)) {
      ast.rank = parseRank(afterColon(t), lineNo);
      continue;
    }
    if (/^flag\s*:/i.test(t)) {
      ast.flag = parseThreshold(afterColon(t), lineNo);
      continue;
    }
    if (/^acceptable\s*:/i.test(t)) {
      ast.acceptable = parseInt10(afterColon(t), lineNo, "acceptable");
      continue;
    }
    if (/^target\s*:/i.test(t)) {
      ast.target = parseInt10(afterColon(t), lineNo, "target");
      continue;
    }
    const meta = /^(number|team|author|date|revision|dept|department|process|product)\s*:\s*(.+)$/i.exec(t);
    if (meta) {
      ast.metadata[meta[1]!.toLowerCase()] = stripQuotes(meta[2]!.trim());
      continue;
    }

    // ── item ──
    const itemM = /^item\b(.*)$/i.exec(t);
    if (itemM) {
      const rest = itemM[1]!.trim();
      const q = matchQuoted(rest);
      if (!q) throw new FmeaParseError(`\`item\` needs a quoted name`, lineNo);
      const after = rest.slice(q.length).trim();
      let fn: string | undefined;
      const fnM = /^fn\b(.*)$/i.exec(after);
      if (fnM) {
        const fq = matchQuoted(fnM[1]!.trim());
        if (!fq) throw new FmeaParseError(`\`fn\` needs a quoted function`, lineNo);
        fn = fq.value;
      }
      curItem = { item: q.value, fn, modes: [] };
      ast.items.push(curItem);
      curMode = undefined;
      curCause = undefined;
      continue;
    }

    // ── mode ──
    const modeM = /^mode\b(.*)$/i.exec(t);
    if (modeM) {
      if (!curItem) throw new FmeaParseError(`\`mode\` before any \`item\``, lineNo);
      const q = matchQuoted(modeM[1]!.trim());
      if (!q) throw new FmeaParseError(`\`mode\` needs a quoted failure mode`, lineNo);
      curMode = { text: q.value, effects: [], causes: [] };
      curItem.modes.push(curMode);
      curCause = undefined;
      continue;
    }

    // ── effect ──
    const effM = /^effect\b(.*)$/i.exec(t);
    if (effM) {
      if (!curMode) throw new FmeaParseError(`\`effect\` before any \`mode\``, lineNo);
      curMode.effects.push(parseEffect(effM[1]!.trim(), lineNo));
      continue;
    }

    // ── cause ──
    const causeM = /^cause\b(.*)$/i.exec(t);
    if (causeM) {
      if (!curMode) throw new FmeaParseError(`\`cause\` before any \`mode\``, lineNo);
      curCause = parseCause(causeM[1]!.trim(), lineNo);
      curMode.causes.push(curCause);
      continue;
    }

    // ── controls (attach to current cause) ──
    const ctrlM = /^controls\b(.*)$/i.exec(t);
    if (ctrlM) {
      if (!curCause) throw new FmeaParseError(`\`controls\` before any \`cause\``, lineNo);
      const { controls, det } = parseControls(ctrlM[1]!.trim(), lineNo);
      curCause.controls = controls;
      if (det !== undefined) curCause.det = det;
      continue;
    }

    // ── action ──
    const actM = /^action\b(.*)$/i.exec(t);
    if (actM) {
      curAction = parseActionHead(actM[1]!.trim(), lineNo);
      ast.actions.push(curAction);
      continue;
    }
    if (/^do\s*:/i.test(t) || /^owner\s*:/i.test(t) || /^target\s+/i.test(t) || /^status\s*:/i.test(t) || /^revised\b/i.test(t)) {
      if (!curAction) throw new FmeaParseError(`action attribute before any \`action\``, lineNo);
      applyActionAttr(curAction, t, lineNo);
      continue;
    }

    throw new FmeaParseError(`Unrecognised statement "${truncate(t, 40)}"`, lineNo);
  }

  return ast;
}

// ─── Statement parsers ────────────────────────────────────────

function parseEffect(rest: string, lineNo: number): FmeaEffect {
  const q = matchQuoted(rest);
  if (!q) throw new FmeaParseError(`\`effect\` needs a quoted consequence`, lineNo);
  const after = rest.slice(q.length).trim();
  const sev = readRating(after, "sev", lineNo);
  if (sev === undefined) throw new FmeaParseError(`\`effect\` needs \`sev: 1..10\``, lineNo);
  return { text: q.value, sev };
}

function parseCause(rest: string, lineNo: number): FmeaCause {
  const q = matchQuoted(rest);
  if (!q) throw new FmeaParseError(`\`cause\` needs a quoted cause`, lineNo);
  const after = rest.slice(q.length).trim();
  const occ = readRating(after, "occ", lineNo);
  if (occ === undefined) throw new FmeaParseError(`\`cause\` needs \`occ: 1..10\``, lineNo);
  // det may be on the cause line or arrive via a following `controls … det:`.
  const det = readRating(after, "det", lineNo);
  const inline = parseInlineControls(after);
  return {
    text: q.value,
    occ,
    // Default Detection = 10 (undetectable) when no control rates it (§Edge cases).
    det: det ?? 10,
    ...(inline ? { controls: inline } : {}),
  };
}

interface ControlsResult { controls: FmeaControls; det?: number }
function parseControls(rest: string, lineNo: number): ControlsResult {
  const det = readRating(rest, "det", lineNo);
  const controls = parseInlineControls(rest) ?? {};
  return { controls, det };
}

/** Parse `prevention: "…", detection: "…"` out of a controls/cause tail. */
function parseInlineControls(s: string): FmeaControls | undefined {
  const prevention = readQuotedKey(s, "prevention");
  const detection = readQuotedKey(s, "detection");
  if (prevention === undefined && detection === undefined) return undefined;
  return {
    ...(prevention !== undefined ? { prevention } : {}),
    ...(detection !== undefined ? { detection } : {}),
  };
}

function parseActionHead(rest: string, lineNo: number): FmeaAction {
  // `action "Mode"` or `action "Mode" / "Cause"`.
  const q = matchQuoted(rest);
  if (!q) throw new FmeaParseError(`\`action\` needs a quoted mode reference`, lineNo);
  let after = rest.slice(q.length).trim();
  let cause: string | undefined;
  if (after.startsWith("/")) {
    after = after.slice(1).trim();
    const cq = matchQuoted(after);
    if (!cq) throw new FmeaParseError(`expected a quoted cause after \`/\``, lineNo);
    cause = cq.value;
  }
  return { mode: q.value, ...(cause !== undefined ? { cause } : {}) };
}

function applyActionAttr(action: FmeaAction, t: string, lineNo: number): void {
  if (/^do\s*:/i.test(t)) {
    const q = matchQuoted(afterColon(t));
    action.recommendation = q ? q.value : afterColon(t);
    // also pick up owner/target/status on the same line
  }
  const owner = readQuotedKey(t, "owner");
  if (owner !== undefined) action.owner = owner;
  const target = readBareKey(t, "target");
  if (target !== undefined) action.target = target;
  const status = readQuotedKey(t, "status");
  if (status !== undefined) action.status = status;

  // `revised` may sit at line-start (its own line) or trail a `do:` line.
  if (/\brevised\b/i.test(t)) {
    const after = t.slice(t.search(/\brevised\b/i));
    const sev = readRating(after, "sev", lineNo);
    const occ = readRating(after, "occ", lineNo);
    const det = readRating(after, "det", lineNo);
    if (sev !== undefined) action.revisedSev = sev;
    if (occ !== undefined) action.revisedOcc = occ;
    if (det !== undefined) action.revisedDet = det;
  }
}

// ─── Field readers ────────────────────────────────────────────

/** Read `key: N` (integer 1–10) anywhere in `s`. Throws if out of range. */
function readRating(s: string, key: string, lineNo: number): number | undefined {
  const m = new RegExp(`(?:^|\\s)${key}\\s*:\\s*(-?\\d+)`, "i").exec(s);
  if (!m) return undefined;
  const v = Number(m[1]);
  if (!Number.isInteger(v) || v < 1 || v > 10) {
    throw new FmeaParseError(`${key} must be an integer 1..10 (got ${m[1]})`, lineNo);
  }
  return v;
}

/** Read `key: "quoted"` value. */
function readQuotedKey(s: string, key: string): string | undefined {
  const idx = indexOfKey(s, key);
  if (idx < 0) return undefined;
  const after = s.slice(idx).replace(new RegExp(`^${key}\\s*:\\s*`, "i"), "");
  const q = matchQuoted(after);
  return q ? q.value : undefined;
}

/** Read `key: bareWord` (no quotes; stops at whitespace). */
function readBareKey(s: string, key: string): string | undefined {
  const m = new RegExp(`(?:^|\\s)${key}\\s*:\\s*("?)([^"\\s][^"]*?)\\1(?=\\s|$)`, "i").exec(s);
  if (!m) return undefined;
  return m[2]!.trim();
}

function indexOfKey(s: string, key: string): number {
  const m = new RegExp(`(?:^|\\s)${key}\\s*:`, "i").exec(s);
  return m ? m.index + (m[0]!.startsWith(" ") ? 1 : 0) : -1;
}

// ─── Directive parsers ────────────────────────────────────────

function parseType(v: string, lineNo: number): FmeaType {
  const low = v.toLowerCase();
  if (low === "design" || low === "dfmea") return "design";
  if (low === "process" || low === "pfmea") return "process";
  if (low === "msr") return "msr";
  throw new FmeaParseError(`type must be design | process | msr (got "${v}")`, lineNo);
}

function parseRank(v: string, lineNo: number): FmeaRankKey {
  const low = v.toLowerCase();
  // Narrowed by the literal comparison above to exactly the FmeaRankKey union.
  if (low === "ap" || low === "rpn") return low as FmeaRankKey;
  throw new FmeaParseError(`rank must be ap | rpn (got "${v}")`, lineNo);
}

function parseThreshold(v: string, lineNo: number): FmeaThreshold {
  // `rpn > 100` | `rpn >= 120` | `ap >= High` | `ap == High`
  const m = /^(rpn|ap)\s*(>=|<=|==|>|<)\s*(.+)$/i.exec(v.trim());
  if (!m) throw new FmeaParseError(`bad flag expression "${v}" (expect e.g. \`rpn > 100\` or \`ap >= High\`)`, lineNo);
  // Both narrowed by the `(rpn|ap)` and `(>=|<=|==|>|<)` capture groups in the regex.
  const key = m[1]!.toLowerCase() as FmeaRankKey;
  const op = m[2]! as FmeaThreshold["op"];
  const rawVal = m[3]!.trim();
  if (key === "rpn") {
    const n = Number(rawVal);
    if (!Number.isFinite(n)) throw new FmeaParseError(`rpn threshold must be numeric (got "${rawVal}")`, lineNo);
    return { key, op, value: n, text: v.trim() };
  }
  const level = normaliseAp(rawVal);
  if (!level) throw new FmeaParseError(`ap threshold must be High|Medium|Low (got "${rawVal}")`, lineNo);
  return { key, op, value: level, text: v.trim() };
}

function normaliseAp(s: string): "High" | "Medium" | "Low" | undefined {
  const low = s.toLowerCase();
  if (low === "high" || low === "h") return "High";
  if (low === "medium" || low === "med" || low === "m") return "Medium";
  if (low === "low" || low === "l") return "Low";
  return undefined;
}

function parseInt10(v: string, lineNo: number, what: string): number {
  const n = Number(v.trim());
  if (!Number.isFinite(n) || n < 1) throw new FmeaParseError(`${what} must be a positive number (got "${v}")`, lineNo);
  return n;
}

// ─── Lexical helpers (shared house-style: CJK quotes + // # comments) ──

interface Quoted { value: string; length: number }

function matchQuoted(s: string): Quoted | undefined {
  if (!s) return undefined;
  const open = s[0]!;
  if (open !== '"' && open !== "「" && open !== "“") return undefined;
  const close = closingQuote(open);
  const end = s.indexOf(close, 1);
  if (end < 0) return undefined;
  return { value: s.slice(1, end), length: end + 1 };
}

function stripQuotes(s: string): string {
  const q = matchQuoted(s);
  return q ? q.value : s;
}

function closingQuote(open: string): string {
  return open === "「" ? "」" : open === "“" ? "”" : '"';
}

function afterColon(s: string): string {
  const i = s.indexOf(":");
  return i < 0 ? "" : s.slice(i + 1).trim();
}

function stripComment(line: string): string {
  let inQ = false, qc = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQ) { if (ch === qc) inQ = false; continue; }
    if (ch === '"' || ch === "「" || ch === "“") { inQ = true; qc = closingQuote(ch); continue; }
    if (ch === "#") return line.slice(0, i);
    if (ch === "/" && line[i + 1] === "/" && line[i + 2] !== '"') {
      // `//` is a comment unless it's the action `/` cause separator (handled elsewhere — single slash).
      return line.slice(0, i);
    }
  }
  return line;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
