import type { TimingAST, TimingSignal, TimingGroup } from "../../core/types";

export class TimingParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimingParseError";
  }
}

const VALID_STATES = /^[01xzpPnNhHlLudD=\.23456789]+$/;

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
  const signals: Array<TimingSignal | TimingGroup> = [];
  let title: string | undefined;
  let hscale: number | undefined;
  let currentGroup: TimingGroup | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    // Header: `timing "title" [hscale: 2]`
    if (/^timing\b/i.test(line)) {
      const titleMatch = line.match(/"([^"]*)"/);
      if (titleMatch) title = titleMatch[1];
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
      const { wave, data } = splitDataList(sigMatch[2]);
      if (!VALID_STATES.test(wave)) {
        throw new TimingParseError(`Invalid wave string "${wave}" for signal ${name}`);
      }
      const signal: TimingSignal = { name, wave, data: data.length ? data : undefined };
      if (currentGroup) currentGroup.signals.push(signal);
      else signals.push(signal);
      continue;
    }
  }

  return { type: "timing", title, hscale, signals };
}
