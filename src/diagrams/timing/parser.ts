import type { TimingAST, TimingSignal, TimingGroup } from "../../core/types";
import { matchQuotedTitle } from "../../core/quotes";
import { createSourceLocator } from "../../core/source-range";

export class TimingParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number,
    public source?: string
  ) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = "TimingParseError";
  }
}

const VALID_STATES = /^[01xzpPnNhHlLudD=.23456789]+$/;

function splitDataList(rest: string): { wave: string; data: string[] } {
  // Wave string is first token; remaining tokens are quoted strings or a `data: [...]` form
  const trimmed = rest.trim();
  // Accept: `wave  data: ["a","b"]` or `wave "a" "b" "c"`
  const m = trimmed.match(/^(\S+)\s*(.*)$/);
  if (!m) return { wave: trimmed, data: [] };
  const wave = m[1];
  const remainder = m[2].trim();
  if (!remainder) return { wave, data: [] };

  const data: string[] = [];
  // Strip `data:` prefix + optional brackets
  let r = remainder.replace(/^data\s*:\s*/, "").trim();
  if (r.startsWith("[") && r.endsWith("]")) r = r.slice(1, -1);
  const re = /"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(r)) !== null) data.push(match[1]);
  return { wave, data };
}

export function parseTiming(text: string): TimingAST {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const locator = createSourceLocator(text);
  let absoluteStart = 0;
  const signals: Array<TimingSignal | TimingGroup> = [];
  let title: string | undefined;
  let titleSourceRange: import("../../core/types").SourceRange | undefined;
  let hscale: number | undefined;
  let currentGroup: TimingGroup | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const lineStart = absoluteStart;
    absoluteStart += raw.length + (i < lines.length - 1 ? 1 : 0);
    const lineNo = i + 1;
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    // Header: `timing "title" [hscale: 2]`
    if (/^timing\b/i.test(line)) {
      const t = matchQuotedTitle(line);
      if (t !== undefined) {
        title = t;
        const quoted = /"[^"]*"/.exec(raw);
        if (quoted?.index !== undefined) {
          titleSourceRange = locator.range(
            lineStart + quoted.index,
            lineStart + quoted.index + quoted[0].length
          );
        }
      }
      const hs = line.match(/hscale\s*:\s*(\d+(?:\.\d+)?)/);
      if (hs) hscale = parseFloat(hs[1]);
      continue;
    }

    // Group start: `[GroupName]` or `group "name" {`
    const groupOpen = line.match(/^\[([^\]]+)\]$/) || line.match(/^group\s+"([^"]+)"\s*\{?$/);
    if (groupOpen) {
      currentGroup = { label: groupOpen[1], signals: [] };
      signals.push(currentGroup);
      continue;
    }
    if (line === "}") {
      currentGroup = null;
      continue;
    }
    if (line === "---") {
      currentGroup = null;
      continue;
    }

    // Signal: `NAME: wave ...`
    const sigMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (sigMatch) {
      const name = sigMatch[1].trim();
      const rhs = sigMatch[2].trim();
      const tok = rhs.split(/\s+/);
      let wave: string;
      let data: string[] = [];

      if (/^clock$/i.test(tok[0])) {
        // `NAME: clock 8 [neg]` — N clock periods (no char-counting).
        const n = Number(tok[1]);
        if (!Number.isInteger(n) || n < 1) {
          throw new TimingParseError(
            `clock needs a positive cycle count, e.g. "${name}: clock 8"`,
            lineNo, undefined, line
          );
        }
        wave = (/^neg/i.test(tok[2] ?? "") ? "n" : "p").repeat(n);
      } else if (/^rle$/i.test(tok[0])) {
        // `NAME: rle 1*2 0*6 x*1` — run-length, each seg is <state>*<count>.
        wave = "";
        for (const seg of tok.slice(1)) {
          const sm = seg.match(/^(.)\*(\d+)$/);
          if (!sm || !VALID_STATES.test(sm[1])) {
            throw new TimingParseError(
              `rle segment must be <state>*<count>, e.g. "1*2 0*6"; got "${seg}"`,
              lineNo, undefined, line
            );
          }
          wave += sm[1].repeat(Number(sm[2]));
        }
      } else {
        const parsed = splitDataList(rhs);
        wave = parsed.wave;
        data = parsed.data;
        if (!VALID_STATES.test(wave)) {
          const bad = [...wave].find((c) => !VALID_STATES.test(c));
          throw new TimingParseError(
            `Invalid wave string "${wave}" for signal ${name}` +
              (bad ? ` — "${bad}" is not a valid state` : "") +
              `. Valid states: 0 1 x z = . p P n N h H l L u d 2-9` +
              `. Tip: use "clock N" for a clock or "rle 1*2 0*6" for run-length.`,
            lineNo, undefined, line
          );
        }
      }

      const colon = raw.indexOf(":");
      const rhsStart = colon >= 0 ? colon + 1 + (raw.slice(colon + 1).match(/^\s*/)?.[0].length ?? 0) : -1;
      const literalWave = !/^clock$/i.test(tok[0] ?? "") && !/^rle$/i.test(tok[0] ?? "");
      const signal: TimingSignal = {
        name,
        wave,
        data: data.length ? data : undefined,
        waveSourceRange: literalWave && rhsStart >= 0
          ? locator.range(lineStart + rhsStart, lineStart + rhsStart + (rhs.split(/\s+/)[0]?.length ?? 0))
          : undefined,
      };
      if (currentGroup) currentGroup.signals.push(signal);
      else signals.push(signal);
      continue;
    }
  }

  return { type: "timing", title, titleSourceRange, hscale, signals };
}
