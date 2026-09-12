import {expect,it} from 'vitest';
import {geometryFor,renderSymbol} from '../../src/diagrams/sld/symbols';
import {parseSLDDSL} from '../../src/diagrams/sld/parser';
import {layoutSLD} from '../../src/diagrams/sld/layout';
import type {SLDNodeType} from '../../src/core/types';

const attrs=(s:string)=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const segments=(svg:string)=>[...svg.matchAll(/<line\b[^>]*>/g)].map(m=>attrs(m[0]));
it.each(['breaker','breaker_vacuum','switch','switch_load','contactor','recloser','sectionalizer','ground_switch','bus_tie','ats'] as SLDNodeType[])('%s has one movable blade attached to a conductor',type=>{
 const lines=segments(renderSymbol(type));
 const blades=lines.filter(l=>l['data-sld-role']==='blade');
 expect(blades).toHaveLength(1);
 const b=blades[0];
 const endpoints=[[b.x1,b.y1],[b.x2,b.y2]];
 expect(lines.some(l=>l!==b && endpoints.some(([x,y])=>(l.x1===x&&l.y1===y)||(l.x2===x&&l.y2===y)))).toBe(true);
});
it('uses a first-class contactor rather than inferring one from its name',()=>{
 const ast=parseSLDDSL('sld\na = contactor [label: "Unrelated label"]');
 expect(ast.nodes[0].nodeType).toBe('contactor');
 expect(renderSymbol(ast.nodes[0].nodeType)).not.toContain('lt-sld-unknown');
});
it('centres peer source conductors over their receiving device despite unequal caption widths',()=>{
 const l=layoutSLD(parseSLDDSL(`sld\na = utility [label: "A"]\nb = generator [label: "Auxiliary generation supply"]\nx = breaker\ny = breaker\nt = ats\nl = load\na -> x\nb -> y\nx -> t\ny -> t\nt -> l`));
 expect((l.nodeById.get('x')!.x+l.nodeById.get('y')!.x)/2).toBeCloseTo(l.nodeById.get('t')!.x);
});
it('lands terminal distribution branches at the bus centre with bar on both sides',()=>{
 const l=layoutSLD(parseSLDDSL('sld\ns = ats\na = bus\nb = bus\ns -> a\ns -> b'));
 for(const e of l.edges){
  const n=l.nodeById.get(e.to)!;
  const points=[...e.path.matchAll(/[ML]\s+(-?[\d.]+)\s+(-?[\d.]+)/g)];
  expect(+points.at(-1)![1]).toBe(n.x);
  expect(n.x-n.busLeft!).toBeGreaterThan(30);
  expect(n.busRight!-n.x).toBeGreaterThan(30);
 }
});
it('keeps a through-bus in the same series column',()=>{
 const l=layoutSLD(parseSLDDSL('sld\ns = utility\na = breaker\nb = bus [label: "Intermediate distribution"]\nt = transformer\nc = breaker\nx = generator\ny = breaker\nu = generator\nv = breaker\nz = load\ns -> a\na -> b\nb -> t\nt -> c\nx -> y\ny -> z\nu -> v\nv -> z\nc -> z'));
 const xs=['s','a','b','t','c'].map(id=>l.nodeById.get(id)!.x);
 expect(Math.max(...xs)-Math.min(...xs)).toBeLessThan(0.01);
 const roots=['s','x','u'].map(id=>l.nodeById.get(id)!).sort((a,b)=>a.x-b.x);
 for(let i=1;i<roots.length;i++) expect(roots[i].x-roots[i-1].x).toBeGreaterThan(100);
});

it('routes to the same ATS input terminals that the symbol draws',()=>{
 const geometry=geometryFor('ats');
 const lines=segments(renderSymbol('ats'));
 for(const x of geometry.inputXs!)
  expect(lines.some(line=>+line.x1===x && +line.x2===x && +line.y1===geometry.topY)).toBe(true);
});

it.each(['breaker_vacuum','recloser'] as SLDNodeType[])('%s ANSI uses the reviewed 52 square with connected leads',type=>{
 const svg=renderSymbol(type,undefined,'ansi');
 const lines=segments(svg);
 expect(lines.filter(l=>l['data-sld-role']==='blade')).toHaveLength(1);
 const halfSize=type==='recloser'?5.7:15;
 expect(svg).toContain(`x="${-halfSize}" y="${-halfSize}" width="${halfSize*2}" height="${halfSize*2}"`);
 expect(svg).toContain('>52</text>');
 expect(lines.some(l=>+l.x2===0 && +l.y2===-halfSize)).toBe(true);
 expect(lines.some(l=>+l.x1===0 && +l.y1===halfSize)).toBe(true);
});
it('ANSI ATS rests on its labelled normal source',()=>{
 const svg=renderSymbol('ats');
 const blade=segments(svg).find(l=>l['data-sld-role']==='blade')!;
 expect([+blade.x2,+blade.y2]).toEqual([-22,-8]);
 expect(svg).toContain('>N</text>');
 expect(svg).toContain('>E</text>');
});
