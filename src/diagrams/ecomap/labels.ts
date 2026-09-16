import type { Individual } from '../../core/types';
import { estimateTextWidth, wrapTextToWidth } from '../../core/text-metrics';

/** Shared measured caption geometry: layout reserves exactly what SVG paints. */
function ecomapLabel(ind: Individual): string {
  return ind.label !== ind.id ? ind.label : ind.id.charAt(0).toUpperCase() + ind.id.slice(1);
}
export function systemCaption(ind: Individual, fontSize = 12): { lines: string[]; radius: number } {
  const importance = ind.properties?.importance ?? ind.properties?.size;
  const minimum = importance === 'major' || importance === 'large' ? 50 :
    importance === 'minor' || importance === 'small' ? 34 : 42;
  const longestWord = Math.max(...ecomapLabel(ind).split(/\s+/).map(word => estimateTextWidth(word, fontSize)));
  const lines = wrapTextToWidth(ecomapLabel(ind), fontSize, Math.max(minimum * 1.55, Math.min(120, longestWord)));
  const halfWidth = Math.max(...lines.map(line => estimateTextWidth(line, fontSize))) / 2;
  const halfHeight = lines.length * (fontSize + 3) / 2;
  return { lines, radius: Math.max(minimum, Math.ceil(Math.hypot(halfWidth, halfHeight)) + 8) };
}
