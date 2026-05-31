/**
 * Bowtie (bowtie) parser — indentation/keyword-structured DSL.
 * Per docs/reference/38-BOWTIE-STANDARD.md §4.
 *
 * The DSL mirrors the CCPS 7-step build methodology: declare the hazard, the
 * top event, then each threat with its preventative barrier chain (indented),
 * then each consequence with its mitigative chain. Escalation factors nest
 * under the barrier they degrade; an escalation-factor barrier nests under the
 * escalation factor.
 *
 * Binding is keyword-driven (prevent → current threat, mitigate → current
 * consequence, escalation → current barrier, barrier → current escalation), so
 * indentation is forgiving — tabs, ragged spacing, and blank lines are
 * tolerated. Zero runtime deps.
 */

import type {
  BowtieAst,
  BowtieBarrier,
  BowtieConsequence,
  BowtieEfBarrier,
  BowtieEscalation,
  BowtieThreat,
} from "./types";

export class BowtieParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = "BowtieParseError";
  }
}

// ─── Public entry ─────────────────────────────────────────────

export function parseBowtie(text: string): BowtieAst {
  const ast: BowtieAst = {
    type: "bowtie",
    layout: "symmetric",
    topEvent: "",
    threats: [],
    consequences: [],
    warnings: [],
  };

  const rawLines = text.split(/\r?\n/);
  let i = 0;
  let topEventCount = 0;
  let hazardCount = 0;

  // ── Header ──
  let headerSeen = false;
  while (i < rawLines.length) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") { i++; continue; }
    const h = /^bowtie\b(.*)$/i.exec(t);
    if (h) {
      const q = matchQuoted(h[1]!.trim());
      if (q) ast.title = q.value;
      headerSeen = true;
      i++;
      break;
    }
    // Implicit header — start parsing the body at i.
    headerSeen = true;
    break;
  }
  if (!headerSeen) return ast;

  // ── Body — keyword-driven context tracking ──
  let curThreat: BowtieThreat | null = null;
  let curConsequence: BowtieConsequence | null = null;
  let curBarrier: BowtieBarrier | null = null;
  let curEscalation: BowtieEscalation | null = null;
  let tCount = 0, cCount = 0;

  for (; i < rawLines.length; i++) {
    const t = stripComment(rawLines[i] ?? "").trim();
    if (t === "") continue;
    const lineNo = i + 1;

    // Directives.
    if (/^layout\s*:/i.test(t)) {
      const v = afterColon(t).toLowerCase();
      if (v === "symmetric" || v === "compact") ast.layout = v;
      continue;
    }
    if (/^legend\s*:/i.test(t)) {
      const v = afterColon(t).toLowerCase();
      if (v === "on" || v === "off" || v === "bottom" || v === "bottom-right" || v === "top") {
        ast.legend = v;
      }
      continue;
    }
    if (/^theme\s*:/i.test(t)) {
      continue; // theme is resolved at render time via config; accepted + ignored here
    }

    const kw = /^(hazard|topevent|threat|consequence|prevent|mitigate|escalation|barrier)\b/i.exec(t);
    if (!kw) {
      ast.warnings.push(`Line ${lineNo}: unrecognised line: "${truncate(t, 80)}"`);
      continue;
    }
    const keyword = kw[1]!.toLowerCase();
    const label = requireLabel(t.slice(kw[0].length).trim(), keyword, lineNo);

    switch (keyword) {
      case "hazard": {
        hazardCount++;
        if (hazardCount > 1) throw new BowtieParseError(`a bowtie has at most one hazard header — found a second: "${label}"`, lineNo);
        ast.hazard = label;
        break;
      }
      case "topevent": {
        topEventCount++;
        if (topEventCount > 1) throw new BowtieParseError(`a bowtie has exactly one top event — found a second: "${label}"`, lineNo);
        ast.topEvent = label;
        break;
      }
      case "threat": {
        curThreat = { id: `T${++tCount}`, label, barriers: [] };
        ast.threats.push(curThreat);
        curConsequence = null;
        curBarrier = null;
        curEscalation = null;
        break;
      }
      case "consequence": {
        curConsequence = { id: `C${++cCount}`, label, barriers: [] };
        ast.consequences.push(curConsequence);
        curThreat = null;
        curBarrier = null;
        curEscalation = null;
        break;
      }
      case "prevent": {
        if (!curThreat) {
          throw new BowtieParseError(`preventative barrier "${label}" is not under a threat — a \`prevent\` line must follow a \`threat\``, lineNo);
        }
        curBarrier = {
          id: `${curThreat.id}-b${curThreat.barriers.length}`,
          label,
          side: "prevent",
          escalations: [],
        };
        curThreat.barriers.push(curBarrier);
        curEscalation = null;
        break;
      }
      case "mitigate": {
        if (!curConsequence) {
          throw new BowtieParseError(`mitigative barrier "${label}" is not under a consequence — a \`mitigate\` line must follow a \`consequence\``, lineNo);
        }
        curBarrier = {
          id: `${curConsequence.id}-b${curConsequence.barriers.length}`,
          label,
          side: "mitigate",
          escalations: [],
        };
        curConsequence.barriers.push(curBarrier);
        curEscalation = null;
        break;
      }
      case "escalation": {
        if (!curBarrier) {
          throw new BowtieParseError(`escalation factor "${label}" is not attached to a barrier — escalation factors must degrade a specific named barrier (add it under a \`prevent\`/\`mitigate\` line)`, lineNo);
        }
        curEscalation = {
          id: `${curBarrier.id}-x${curBarrier.escalations.length}`,
          label,
          barriers: [],
        };
        curBarrier.escalations.push(curEscalation);
        break;
      }
      case "barrier": {
        if (!curEscalation) {
          throw new BowtieParseError(`escalation-factor barrier "${label}" is not under an escalation factor — a \`barrier\` line must follow an \`escalation\``, lineNo);
        }
        const ef: BowtieEfBarrier = {
          id: `${curEscalation.id}-b${curEscalation.barriers.length}`,
          label,
        };
        curEscalation.barriers.push(ef);
        break;
      }
    }
  }

  validate(ast);
  return ast;
}

// ─── Validation — the CCPS/EI barrier rule set (§5.6) ─────────

function validate(ast: BowtieAst): void {
  // 1. Exactly one top event.
  if (!ast.topEvent) {
    throw new BowtieParseError(`a bowtie has exactly one top event — declare it with a \`topevent "…"\` line`);
  }

  // 5. At least one threat AND at least one consequence.
  if (ast.threats.length === 0) {
    throw new BowtieParseError(`a bowtie needs at least one threat — a diagram with no left wing is a fault tree (see faulttree), not a bowtie`);
  }
  if (ast.consequences.length === 0) {
    throw new BowtieParseError(`a bowtie needs at least one consequence — a diagram with no right wing is an event tree, not a bowtie`);
  }

  // 2. Every threat has ≥ 1 preventative barrier.
  for (const th of ast.threats) {
    if (th.barriers.length === 0) {
      throw new BowtieParseError(
        `Threat "${th.label}" has no preventative barrier — every threat must reach the top event through at least one barrier (CCPS/EI barrier rule). Add a \`prevent\` line under it.`
      );
    }
  }

  // 3. Every consequence has ≥ 1 mitigative barrier.
  for (const co of ast.consequences) {
    if (co.barriers.length === 0) {
      throw new BowtieParseError(
        `Consequence "${co.label}" has no mitigative barrier — every consequence must be limited by at least one barrier (CCPS/EI barrier rule). Add a \`mitigate\` line under it.`
      );
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function requireLabel(s: string, keyword: string, lineNo: number): string {
  const q = matchQuoted(s);
  if (q) return q.value;
  const bare = s.trim();
  if (!bare) throw new BowtieParseError(`\`${keyword}\` needs a label`, lineNo);
  // A single bareword (no spaces) is allowed unquoted; spaces require quotes.
  if (/\s/.test(bare)) {
    throw new BowtieParseError(`\`${keyword}\` label with spaces must be quoted: ${keyword} "${bare}"`, lineNo);
  }
  return bare;
}

interface Quoted { value: string; length: number }
function matchQuoted(s: string): Quoted | undefined {
  if (!s) return undefined;
  const open = s[0]!;
  if (open !== '"' && open !== "「" && open !== "“" && open !== "『") return undefined;
  const close = closingQuote(open);
  const end = s.indexOf(close, 1);
  if (end < 0) return undefined;
  return { value: s.slice(1, end), length: end + 1 };
}

function closingQuote(open: string): string {
  return open === "「" ? "」" : open === "『" ? "』" : open === "“" ? "”" : '"';
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
    if (ch === '"' || ch === "「" || ch === "“" || ch === "『") { inQ = true; qc = closingQuote(ch); continue; }
    if (ch === "#") return line.slice(0, i);
    if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
  }
  return line;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
