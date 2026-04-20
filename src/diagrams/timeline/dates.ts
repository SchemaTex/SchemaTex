import type { TimelineDate } from "./types";

/**
 * Parse a single DSL date token into a TimelineDate.
 *
 * Accepted forms:
 *   - ISO 8601 date:      2024-11-05, 1969-07-20
 *   - ISO year-month:     2024-11
 *   - Year:               1969
 *   - BC year (negative): -753
 *   - BC year (suffix):   753BC, 753BCE
 *   - Relative (geologic): 540Ma, 4.6Ga, 12ka
 */
export function parseDate(raw: string): TimelineDate {
  const s = raw.trim();

  // Ma / Ga / ka
  const mGeo = /^(-?\d+(?:\.\d+)?)\s*(Ma|Ga|ka)$/i.exec(s);
  if (mGeo) {
    const n = parseFloat(mGeo[1]!);
    const unit = mGeo[2]!.toLowerCase();
    const mult = unit === "ga" ? 1e9 : unit === "ma" ? 1e6 : 1e3;
    return {
      value: 1970 - n * mult,
      raw: s,
      precision: "ma",
    };
  }

  // BC suffix
  const mBC = /^(\d+)\s*(BC|BCE)$/i.exec(s);
  if (mBC) {
    return { value: -parseInt(mBC[1]!, 10), raw: s, precision: "year" };
  }

  // ISO date yyyy-mm-dd
  const mIso = /^(-?\d{1,5})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (mIso) {
    const y = parseInt(mIso[1]!, 10);
    const mo = parseInt(mIso[2]!, 10);
    const d = parseInt(mIso[3]!, 10);
    return {
      value: y + (dayOfYear(y, mo, d) - 1) / daysInYear(y),
      raw: s,
      precision: "day",
    };
  }

  // ISO year-month
  const mYm = /^(-?\d{1,5})-(\d{1,2})$/.exec(s);
  if (mYm) {
    const y = parseInt(mYm[1]!, 10);
    const mo = parseInt(mYm[2]!, 10);
    return {
      value: y + (mo - 1) / 12,
      raw: s,
      precision: "month",
    };
  }

  // Year-Quarter (2026-Q1 style was caught above if QN part; handle separately)
  const mYq = /^(-?\d{1,5})-?Q([1-4])$/i.exec(s);
  if (mYq) {
    const y = parseInt(mYq[1]!, 10);
    const q = parseInt(mYq[2]!, 10);
    return { value: y + (q - 1) * 0.25, raw: s, precision: "month" };
  }

  // Plain year (may be negative for BC)
  const mY = /^(-?\d+)$/.exec(s);
  if (mY) {
    return { value: parseInt(mY[1]!, 10), raw: s, precision: "year" };
  }

  throw new Error(`Cannot parse date: "${raw}"`);
}

function daysInYear(y: number): number {
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return leap ? 366 : 365;
}

function dayOfYear(y: number, m: number, d: number): number {
  const dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) dim[1] = 29;
  let total = d;
  for (let i = 0; i < m - 1; i++) total += dim[i]!;
  return total;
}

/**
 * Format a scalar `value` (fractional year) as a tick label, given a span.
 */
export function formatYear(value: number, span: number): string {
  const y = Math.round(value);
  if (span >= 2e6) return `${Math.round((1970 - value) / 1e6)} Ma`;
  if (span >= 2000) return y < 0 ? `${-y} BC` : `${y}`;
  if (span >= 50) return y < 0 ? `${-y} BC` : `${y}`;
  // For smaller spans show year (optionally with month)
  return y < 0 ? `${-y} BC` : `${y}`;
}

/**
 * Format a TimelineDate for display in its original precision.
 */
export function formatDate(d: TimelineDate): string {
  return d.raw;
}
