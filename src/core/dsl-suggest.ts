/**
 * "Did you mean…?" helper for parser error messages.
 *
 * Every diagram parser eventually rejects an unknown keyword (an unknown
 * node type, an unknown directive, a misspelled mode). The bare error
 * "unknown element type 'RES'" tells the LLM nothing — but
 * "unknown element type 'RES' (did you mean 'OTE'?)" gives it the bump
 * it needs to self-correct on the next attempt.
 *
 * Implementation is a textbook Levenshtein distance with an early-exit
 * cap of 3. We only suggest if the closest valid keyword is within 2
 * edits AND meaningfully closer than the second-best — that avoids the
 * "did you mean 'a'?" noise when input was nonsense.
 */

/** Edit distance with an upper-bound short-circuit. */
function distance(a: string, b: string, cap: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const al = a.length;
  const bl = b.length;
  // Pre-pad shorter to longer.
  const prev = new Array<number>(bl + 1);
  const curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1, // deletion
        curr[j - 1]! + 1, // insertion
        prev[j - 1]! + cost // substitution
      );
      if (curr[j]! < rowMin) rowMin = curr[j]!;
    }
    if (rowMin > cap) return cap + 1;
    for (let j = 0; j <= bl; j++) prev[j] = curr[j]!;
  }
  return prev[bl]!;
}

/**
 * Suggest the closest valid keyword to `input` from `candidates`.
 *
 * Returns the keyword if it's within edit distance 2 AND strictly closer
 * than every other candidate (i.e. unambiguous). Returns null otherwise.
 *
 * Comparison is case-insensitive. The returned suggestion preserves the
 * casing of the candidate, not the input.
 */
export function suggestKeyword(
  input: string,
  candidates: Iterable<string>
): string | null {
  const needle = input.toLowerCase();
  let best: { word: string; dist: number } | null = null;
  let secondBest = Infinity;
  for (const c of candidates) {
    const d = distance(needle, c.toLowerCase(), 2);
    if (d > 2) continue;
    if (best === null || d < best.dist) {
      secondBest = best?.dist ?? Infinity;
      best = { word: c, dist: d };
    } else if (d < secondBest) {
      secondBest = d;
    }
  }
  if (best === null) return null;
  // Require strict separation so we don't pick arbitrarily between two
  // equally-close candidates ("OTE" vs "OTL" for "OTX" — useless).
  if (secondBest <= best.dist) return null;
  return best.word;
}

/**
 * Build a "(did you mean 'X'?)" suffix, or empty string if no good match.
 * Convenience wrapper so call sites read as one expression.
 */
export function didYouMean(input: string, candidates: Iterable<string>): string {
  const s = suggestKeyword(input, candidates);
  return s ? ` (did you mean '${s}'?)` : "";
}
