import { expect, test } from 'vitest';
import { parseNetlist } from '../../src/diagrams/circuit/netlist';
import { layoutCircuitNetlist } from '../../src/diagrams/circuit/autolayout';
import { schematicNetlistLayout } from '../../src/diagrams/circuit/schematic-layout';
import { isBetterRouting, measureRouting } from '../../src/diagrams/circuit/layout-quality';

test.each([
  'V1 live neutral 220Vac type=acsource\nF1 live feed 16A\nS1 feed t1 t2 type=switch_spdt\nS2 switched t1 t2 type=switch_spdt\nL1 switched neutral type=lamp',
  'V1 power 0 12V\nS1 power left right type=switch_spdt_center_off\nR1 left 0 1k\nR2 left 0 2k\nR3 right 0 1k\nR4 right 0 2k',
])('uses the same candidate selection for every netlist topology', source => {
  expect(layoutCircuitNetlist(parseNetlist(source))).toEqual(schematicNetlistLayout(parseNetlist(source)));
});

test('removing a body collision takes priority over shorter wiring', () => {
  const obstacle={left:4,right:6,top:-1,bottom:1};
  const blocked=measureRouting([{netId:'n',points:[{x:0,y:0},{x:10,y:0}]}],['n'],[obstacle]);
  const clear=measureRouting([{netId:'n',points:[{x:0,y:0},{x:0,y:3},{x:10,y:3},{x:10,y:0}]}],['n'],[obstacle]);
  expect(clear.cost).toBeGreaterThan(blocked.cost);
  expect(isBetterRouting(clear,blocked)).toBe(true);
  expect(isBetterRouting(blocked,clear)).toBe(false);
});
