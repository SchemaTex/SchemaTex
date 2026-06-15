/**
 * Shared numeric formatting helpers for diagram engines.
 */

/**
 * Format a probability / reliability in [0, 1] for display.
 *
 * - `≤ 0` → `"0"`, `≥ 1` → `"1"` (exact endpoints).
 * - `< 0.001` → scientific notation (`"1.2e-4"`), so very rare/likely events
 *   stay legible instead of collapsing to `"0.00"`.
 * - otherwise three significant figures — but the precision is *escalated* as
 *   the value approaches 1 so a sub-1 number never rounds up to `"1"` and hides
 *   its nines (e.g. `0.9999` stays `"0.9999"`, not `"1"`). The "number of nines"
 *   is exactly what matters for high reliabilities, so it must survive.
 */
export function formatProbability(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n <= 0) return "0";
  if (n >= 1) return "1";
  if (n < 1e-3) return n.toExponential(2);
  for (let p = 3; p <= 9; p++) {
    const s = parseFloat(n.toPrecision(p));
    if (s > 0 && s < 1) return String(s);
  }
  return String(parseFloat(n.toPrecision(9)));
}
