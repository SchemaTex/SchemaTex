import { expect, test } from 'vitest';
import { parseFishboneDSL } from '../../src/diagrams/fishbone/parser';
import { layoutFishbone } from '../../src/diagrams/fishbone/layout';

test.each([false, true])('each half reserves space for its own content (reverse=%s)', reverse => {
  const dense = ['category dense "Dense"', ...Array.from({length:7},(_,i)=>`dense: "Cause ${i}"`)];
  const sparse = ['category sparse "Sparse"', 'sparse: "One cause"'];
  const input = ['fishbone "Uneven workload"', 'effect "Result"', ...(reverse ? [...sparse,...dense] : [...dense,...sparse])].join('\n');
  const l=layoutFishbone(parseFishboneDSL(input));
  const length=(name:string)=> {const r=l.ribs.find(r=>r.label===name)!;return Math.abs(r.endY-r.spineY);};
  expect(length('Sparse')).toBeLessThan(length('Dense'));
  expect(l.ribs).toHaveLength(2);
  expect(l.ribs.flatMap(r=>r.causes)).toHaveLength(8);
});
