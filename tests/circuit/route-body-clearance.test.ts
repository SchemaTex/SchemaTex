import { expect, test } from 'vitest';
import { parseNetlist } from '../../src/diagrams/circuit/netlist';
import { boxOf, schematicNetlistLayout } from '../../src/diagrams/circuit/schematic-layout';
import { effectiveSymbolDef } from '../../src/diagrams/circuit/symbols';

test.each([2, 3, 5])('parallel devices retain visible clearance around their bodies (%i loads)', count => {
  const ast = parseNetlist([
    'Vsource input GND 12V',
    'Rfeed input shared 10',
    ...Array.from({length:count}, (_,i) => `Device${i} shared GND type=ic pins="+,−" label="Output ${i}"`),
  ].join('\n'));
  const layout = schematicNetlistLayout(ast)!;
  for (const item of layout.items.filter(item => item.component.id.startsWith('Device'))) {
    const b=boxOf(item, 0);
    for (const route of layout.routes) for (let i=1;i<route.points.length;i++) {
      const a=route.points[i-1]!, z=route.points[i]!;
      if (a.y!==z.y || Math.min(a.x,z.x)>=b.maxX || Math.max(a.x,z.x)<=b.minX) continue;
      // A horizontal wire over/under a body is not a connection into its side port.
      if(a.y<b.minY) expect(b.minY-a.y).toBeGreaterThanOrEqual(8);
      if(a.y>b.maxY) expect(a.y-b.maxY).toBeGreaterThanOrEqual(8);
    }
  }
});

test('a two-terminal test point paints a lead reaching each routing anchor', () => {
  const symbol=effectiveSymbolDef('test_point');
  const svg=symbol.svg();
  for (const p of Object.values(symbol.anchors)) {
    expect(svg).toMatch(new RegExp(`(?:x1="${p.x}" y1="${p.y}"|x2="${p.x}" y2="${p.y}")`));
  }
});

test('terminal block pins remain independent unless a conductor explicitly joins them', () => {
  const body='Strip left right type=terminal_block pins="A,B"';
  const independent=parseNetlist(body);
  expect(independent.pinMap!.Strip!.a).not.toBe(independent.pinMap!.Strip!.b);
  const bonded=parseNetlist(body+'\nWbond Strip.A Strip.B');
  expect(bonded.pinMap!.Strip!.a).toBe(bonded.pinMap!.Strip!.b);
});

test('a bonded connector does not turn a single-load supply into a distribution bus', () => {
  const ast=parseNetlist(`Source supply GND type=voltage_source
Strip supply cable type=terminal_block pins="A,B"
Wbond Strip.A Strip.B
Load cable GND type=resistor`);
  const l=schematicNetlistLayout(ast)!;
  expect(l.flags?.some(f=>f.kind==='vcc' && f.label==='supply')).toBe(false);
});
