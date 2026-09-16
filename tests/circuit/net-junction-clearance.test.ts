import { expect, test } from 'vitest';
import { parseNetlist } from '../../src/diagrams/circuit/netlist';
import { schematicNetlistLayout } from '../../src/diagrams/circuit/schematic-layout';

const body = `Vupper upper 0 9V
Vlower 0 lower 9V
Vsignal input 0 type=ac_source
Rinput input feedback 4k7
Amplifier 0 feedback output type=opamp
Rfeedback output feedback 47k
Wupper upper Amplifier.supply+
Wlower lower Amplifier.supply-
Cupper upper 0 220n
Clower lower 0 220n`;

test.each([2, 3, 4])('shared branches keep junctions clear of other signals (%i loads per output)', count => {
  const ast = parseNetlist([
    'Source supply GND 12V',
    'Driver supply GND alpha beta type=generic_ic pins="VCC,GND,A,B"',
    ...Array.from({length: count}, (_, i) => [
      `LoadA${i} alpha GND type=generic_ic pins="IN,RETURN"`,
      `LoadB${i} beta GND type=generic_ic pins="IN,RETURN"`,
    ]).flat(),
  ].join('\n'));
  const layout = schematicNetlistLayout(ast, {collectStats: true})!;
  expect(layout.stats!.optimization!.after.junctionConflicts).toBe(0);
});

test.each([false, true])('different nets do not share junction dots (renamed=%s)', renamed => {
  const input = renamed ? body.replace(/\b(upper|lower|input|feedback|output)\b/g, 'signal.$1') : body;
  const ast = parseNetlist(input);
  const layout = schematicNetlistLayout(ast)!;
  const nets = ast.nets.map(n => n.id).sort((a,b) => b.length-a.length);
  const owner = (id: string) => nets.find(n => id === n || id.startsWith(`${n}.`)) ?? id;
  for (const net of ['upper', 'lower'].map(n => renamed ? `signal.${n}` : n)) {
    const rail = layout.routes.find(route => route.netId === net)!;
    const railY = rail.points[0].y;
    for (const branch of layout.routes.filter(route => route.netId.startsWith(`${net}.`))) {
      const end = branch.points[branch.points.length - 1];
      if (end.y !== railY) continue;
      const previous = branch.points[branch.points.length - 2];
      expect(previous.x).toBe(end.x);
      expect(previous.y).not.toBe(end.y);
    }
  }
  for (const route of layout.routes) for (const dot of route.junctions ?? []) {
    for (const other of layout.routes.filter(r => owner(r.netId) !== owner(route.netId))) {
      for (let i=1;i<other.points.length;i++) {
        const a=other.points[i-1], b=other.points[i];
        const dx=b.x-a.x, dy=b.y-a.y, squared=dx*dx+dy*dy;
        const t=squared ? Math.max(0,Math.min(1,((dot.x-a.x)*dx+(dot.y-a.y)*dy)/squared)) : 0;
        expect(Math.hypot(dot.x-a.x-t*dx,dot.y-a.y-t*dy), `${route.netId} dot touches ${other.netId}`).toBeGreaterThan(4);
      }
    }
  }
});

test.each([1, 3, 6])("sense junctions clear the return terminal with %i extra loads", count => {
  const ast = parseNetlist([
    "Vrail power GND 12V",
    'Controller drive sense GND type=generic_ic pins="GATE,ISENSE,RETURN"',
    "Switch power drive sense type=nmos",
    "Sense sense GND 0.33",
    ...Array.from({ length: count }, (_, i) => `Load${i} power load${i} type=resistor`),
  ].join("\n"));
  const layout = schematicNetlistLayout(ast)!;
  const terminal = layout.items.find(item => item.component.id === "Sense")!.anchors.end;
  const junctions = layout.routes.filter(route => route.netId === "sense" || route.netId.startsWith("sense."))
    .flatMap(route => route.junctions ?? []);
  expect(junctions.length).toBeGreaterThan(0);
  for (const dot of junctions) expect(Math.hypot(dot.x - terminal.x, dot.y - terminal.y)).toBeGreaterThan(6);
});
