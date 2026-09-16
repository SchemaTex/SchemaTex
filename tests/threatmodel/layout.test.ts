import {it,expect} from 'vitest';
import {layoutThreatModel} from '../../src/diagrams/threatmodel/layout';
import {parseThreatModel} from '../../src/diagrams/threatmodel/parser';
import {estimateTextWidth} from '../../src/core/text-metrics';
it('reserves measured label and STRIDE space inside a trust boundary',()=>{
 const layout=layoutThreatModel(parseThreatModel(`threatmodel
process P: International authorization service
external U: User
U -> P : "An unusually long authorization request"
boundary "A very long description of the authorization service security boundary" { P }
`));
 const p=layout.nodes.find(n=>n.id==='P')!;
 expect(p.w).toBeGreaterThanOrEqual(Math.max(...p.labelLines.map(line=>estimateTextWidth(line,12,{fontWeight:600})))+20);
 const b=layout.boundaries[0]!;
 expect(p.y-19).toBeGreaterThan(b.y+22);
 expect(b.w).toBeGreaterThan(estimateTextWidth(b.name,10,{fontWeight:700}));
});

it('keeps detour segments outside their source and target symbols', () => {
  const declarations = Array.from({ length: 5 }, (_, i) =>
    `process P${i}: ${'Authorization service '.repeat((i + 1) * 2)}`);
  const layout = layoutThreatModel(parseThreatModel(`threatmodel
${declarations.join('\n')}
P0 -> P4 : "request"
P1 -> P3 : "reply"
boundary "Clients" { P0, P1 }
boundary "Gateway" { P2 }
boundary "Services" { P3, P4 }`));
  for (const flow of layout.flows) {
    for (const id of [flow.source, flow.target]) {
      const node = layout.nodes.find(n => n.id === id)!;
      for (let i = 1; i < flow.points.length; i++) {
        const a = flow.points[i - 1], b = flow.points[i];
        for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
          const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
          expect(Math.hypot(x - node.cx, y - node.cy)).toBeGreaterThanOrEqual(node.w / 2 - 0.01);
        }
      }
    }
  }
});
