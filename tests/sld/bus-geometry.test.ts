import { expect, test } from 'vitest';
import { parseSLDDSL } from '../../src/diagrams/sld/parser';
import { layoutSLD } from '../../src/diagrams/sld/layout';

test('derives bus geometry from final column positions for asymmetric feeders', () => {
  for (let a=2;a<=5;a++) for(let b=2;b<=5;b++) for(let ai=0;ai<a;ai++) for(let bi=0;bi<b;bi++) {
    const lines=['sld', 'a = utility', 'b = generator', 'z = load'];
    for(const [root, count, bus] of [['a',a,ai],['b',b,bi]] as const) {
      for(let i=0;i<count;i++) lines.push(`${root}${i} = ${i===bus?'bus':'breaker'} [label: "${root==='a'?'Primary':'Secondary'} ${i===bus?'distribution':'protection'}"]`,
        `${i?root+(i-1):root} -> ${root}${i}`);
      lines.push(`${root}${count-1} -> z`);
    }
    const layout=layoutSLD(parseSLDDSL(lines.join('\n')));
    for(const node of layout.nodes.filter(n=>n.nodeType==='bus')) {
      expect(node.x, `${a}/${b}/${ai}/${bi}/${node.node.id}`).toBeGreaterThanOrEqual(node.busLeft!);
      expect(node.x).toBeLessThanOrEqual(node.busRight!);
    }
  }
});
