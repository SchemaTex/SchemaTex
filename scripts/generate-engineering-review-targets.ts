/** Preview-only authored compositions, NOT a renderer implementation or automatic router.
 * Reuse shipped symbols/styles; fixed positions describe the design target only.
 * Run with vite-node. Original replay assets remain immutable.
 */
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { svgRoot, el, group, rect, path, circle, text } from '../src/core/svg';
import { getGateGeometry } from '../src/diagrams/logic/symbols';
import { parseLogic } from '../src/diagrams/logic/parser';
import { parsePid } from '../src/diagrams/pid/parser';
import { GEOMETRY, renderEquip, renderInstrument } from '../src/diagrams/pid/symbols';
import { parseBreadboard } from '../src/diagrams/breadboard/parser';
import { layoutBreadboard, breadboardCoordXY } from '../src/diagrams/breadboard/layout';
import { renderBreadboardLayout } from '../src/diagrams/breadboard/renderer';
import { partSpec } from '../src/diagrams/breadboard/parts';
import { renderResult } from '../src/index';
import { parseFloorplan } from '../src/diagrams/floorplan/parser';
import { layoutFloorplan } from '../src/diagrams/floorplan/layout';

const dir = new URL('../preview/engineering-review/', import.meta.url);
const read = (name: string) => readFile(new URL(name, dir), 'utf8');
const save = (name: string, value: string) => writeFile(new URL(name, dir), value);
const styleFrom = (svg: string) => [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const ink = '#1d1d1d', paper = '#ffffff';
const label = (x: number, y: number, content: string, size = 13) => text({x,y,fill:ink,'font-size':size,'font-family':'IBM Plex Sans, Helvetica Neue'},content);
type Point = [number, number];
const pointsPath = (pts: Point[]) => pts.map(([x,y],i)=>`${i?'L':'M'} ${x} ${y}`).join(' ');
const wire = (pts: Point[], attrs = {}) => path({d:pointsPath(pts),fill:'none',stroke:ink,'stroke-width':1.6,...attrs});
const document = (w: number,h: number,body: string[]) => svgRoot({width:w,height:h,viewBox:`0 0 ${w} ${h}`,'data-review-only':'authored-target'},[
  el('title',{},'Authored SVG design target — not engine output'),rect({x:0,y:0,width:w,height:h,fill:paper}),...body]);

// Full adder: every signal has drawn continuity. Reuse the live ANSI gate paths.
const ast = parseLogic(await read('logic.sx'));
const placements: Record<string,Point> = {s1:[200,80],Sum:[440,80],c1:[200,220],c2:[440,350],Cout:[665,290]};
const pin = (id: string, input?: number): Point => {
  const g=ast.gates.find(g=>g.id===id); assert(g,`Unknown gate ${id}`);
  assert(g.gateType);const geometry=getGateGeometry(g.gateType,g.inputs.length);
  const p=input===undefined?geometry.outputPins[0]:geometry.inputPins[input];
  return [placements[id][0]+p.x,placements[id][1]+p.y];
};
const routes: {net:string,pts:Point[]}[] = [
  {net:'A',pts:[[35,95],pin('s1',0)]},{net:'A',pts:[[100,95],[100,235],pin('c1',0)]},
  {net:'B',pts:[[35,125],pin('s1',1)]},{net:'B',pts:[[140,125],[140,265],pin('c1',1)]},
  {net:'s1',pts:[pin('s1'),[330,110],[330,95],pin('Sum',0)]},
  {net:'s1',pts:[[330,110],[330,365],pin('c2',0)]},
  {net:'Cin',pts:[[35,430],[400,430],[400,125],pin('Sum',1)]},
  {net:'Cin',pts:[[400,395],pin('c2',1)]},
  {net:'c1',pts:[pin('c1'),[590,250],[590,305],pin('Cout',0)]},
  {net:'c2',pts:[pin('c2'),[630,380],[630,335],pin('Cout',1)]},
  {net:'Sum',pts:[pin('Sum'),[770,110]]},{net:'Cout',pts:[pin('Cout'),[770,320]]},
];
for(const r of routes)for(let i=1;i<r.pts.length;i++)assert(r.pts[i][0]===r.pts[i-1][0]||r.pts[i][1]===r.pts[i-1][1],`Non-orthogonal ${r.net} segment`);
// Verify authored wire endpoints against all live input and output ports.
for(const gate of ast.gates){
  gate.inputs.forEach((net,i)=>assert(routes.some(r=>r.net===net&&r.pts.some(p=>p.toString()===pin(gate.id,i).toString())),`Missing ${gate.id} input ${i}`));
  assert(routes.some(r=>r.net===gate.id&&r.pts[0].toString()===pin(gate.id).toString()));
}
const jumps: string[]=[];
for(const r of routes)for(let i=1;i<r.pts.length;i++){
  const [a,b]=[r.pts[i-1],r.pts[i]]; if(a[1]!==b[1])continue;
  for(const s of routes.filter(s=>s.net!==r.net))for(let j=1;j<s.pts.length;j++){
    const [c,d]=[s.pts[j-1],s.pts[j]];
    if(c[0]===d[0]&&c[0]>Math.min(a[0],b[0])&&c[0]<Math.max(a[0],b[0])&&a[1]>Math.min(c[1],d[1])&&a[1]<Math.max(c[1],d[1])){
      const [x,y]=[c[0],a[1]];jumps.push(wire([[x-5,y],[x+5,y]],{stroke:paper,'stroke-width':5}),path({d:`M ${x-5} ${y} Q ${x} ${y-9} ${x+5} ${y}`,fill:'none',stroke:ink,'stroke-width':1.6}));
    }
  }
}
const gates=ast.gates.map(g=>{const geom=getGateGeometry(g.gateType,g.inputs.length);return group({transform:`translate(${placements[g.id].join(' ')})`},[
  path({d:geom.ansiPath,fill:paper,stroke:ink,'stroke-width':1.6}),label(20,80,`${g.gateType} · ${g.id}`,12)]);});
await save('target-logic-native.svg',document(820,490,[label(35,32,'Full adder — all nets visibly connected',19),...routes.map(r=>wire(r.pts,{'data-net':r.net})),...jumps,
  ...[[100,95],[140,125],[330,110],[400,395]].map(([cx,cy])=>circle({cx,cy,r:3,fill:ink})),...gates,
  label(12,98,'A'),label(12,128,'B'),label(7,433,'Cin'),label(774,114,'Sum'),label(774,324,'Cout'),label(35,475,'Dots = connected branches. Hops = crossing only. Five original gates; no hidden net-label links.',12)]));

// P&ID: same shipped symbols, exact current ports, manually composed ownership target.
const pid=parsePid(await read('pid.sx'));
const pos:Record<string,Point>={'TK-101':[90,250],'P-101':[260,250],'F-101':[465,250],'XV-101':[660,238],'TK-102':[855,250],'TK-201':[90,80],'P-201':[260,80],'TK-301':[90,460],'TK-401':[660,460]};
const endpoint=(id:string,port:string):Point=>{const e=pid.equipment.find(e=>e.id===id);assert(e);const p=GEOMETRY[e.equipType].ports[port];assert(p,`Unknown ${id}.${port}`);return [pos[id][0]+p.x,pos[id][1]+p.y];};
const links: [string,string,string,string,Point[],string][]=[
  ['TK-101','bottom','P-101','in',[[90,310],[190,310],[190,250]],''],
  ['P-101','out','F-101','in',[],''],['F-101','out','XV-101','in',[],''],
  ['XV-101','out','TK-102','top',[[760,250],[760,185],[855,185]],''],
  ['TK-201','bottom','P-201','in',[[90,140],[190,140],[190,80]],'chemical'],
  ['P-201','out','F-101','top',[[465,80]],'chemical'],
  ['TK-301','right','F-101','backwash',[[350,460],[350,272]],'backwash'],
  ['F-101','drain','TK-401','top',[[465,355],[660,355]],'drain'],
];
assert.equal(links.length,pid.lines.filter(l=>l.lineType.startsWith('process')).length);
const serviceColor:Record<string,string>={chemical:'#844b17',backwash:'#176983',drain:'#53616e'};
await save('target-pid-native.svg',document(950,615,[el('style',{},styleFrom(await read('pid.svg'))),label(25,22,'Same symbols. Explicit package scope and readable services.',17),
  rect({x:397,y:140,width:325,height:182,fill:'none',stroke:ink,'stroke-width':1.2,'stroke-dasharray':'8 5'}),label(493,159,'FILTER SKID',12),
  ...links.map(([a,ap,b,bp,mids,service])=>wire([endpoint(a,ap),...mids,endpoint(b,bp)],{stroke:serviceColor[service]??ink,'stroke-width':service?1.6:2.6})),
  ...pid.equipment.map(e=>group({transform:`translate(${pos[e.id].join(' ')})`},[renderEquip(e.equipType,e.id,e.rawType,e.attrs), ...(e.attrs.tag ? [text({x:0,y:70,'text-anchor':'middle',fill:ink,'font-size':11},String(e.attrs.tag))] : [])])),
  wire([[660,196],[660,204]],{'stroke-dasharray':'6 4'}),group({transform:'translate(660 182)'},[renderInstrument('cr_shared','FIC','101')]),
  label(325,69,'Chemical dosing',12),label(225,447,'Backwash',12),label(502,344,'Drain',12),label(515,237,'Product water',12),
  label(25,553,'P-101: transfer pump · P-201: dosing pump · F-101: media filter · XV-101: motor-operated valve',12),
  label(25,578,'Solid process pipes retain their type. Service text works without color; dashed signal is unchanged.',12),
  label(25,598,'Authored target only: automatic package spacing and service-theme API are not implemented.',11)]));

// Breadboard: reuse the real substrate, DIP body, wire colors and type styles.
// Corrected coordinates are an explicit design proposal, not production layout behavior.
const board=layoutBreadboard(parseBreadboard(await read('breadboard.sx')));
const part=board.parts[0], pitch=board.substrate.pitch;
const proposed=Array.from({length:8},(_,i)=>{const n=i+1;const col=n<=4?14+n:23-n;const row=n<=4?'f':'e';return {pin:n,hole:`${col}${row}`,xy:breadboardCoordXY(board.substrate,{kind:'hole',col,row})};});
assert.deepEqual(proposed.map(p=>p.hole),['15f','16f','17f','18f','18e','17e','16e','15e']);
const top=proposed[7].xy, bottom=proposed[0].xy, h=bottom.y-top.y;
assert.equal(h,3*pitch);
const targetBoard=renderBreadboardLayout({...board,parts:[],wires:[]});
const pinLabels=proposed.map(p=>label(p.xy.x-1.6,p.xy.y+(p.pin<=4?8:-4),String(p.pin),5));
const body=partSpec('dip',part.part.args).body(part.part,part.width,h);
const targetWires=board.wires.map(w=>{const n=w.wire.from.kind==='pin'?Number(w.wire.from.pin):0;const from=proposed.find(p=>p.pin===n)?.xy;assert(from);const color=w.color==='red'?'#dc2626':'#facc15';return [path({d:`M ${from.x} ${from.y} C ${from.x-25} ${from.y} ${w.toXY.x-25} ${w.toXY.y} ${w.toXY.x} ${w.toXY.y}`,class:'lt-bb-wire',stroke:color}),... [from,w.toXY].map(p=>circle({cx:p.x,cy:p.y,r:1.8,fill:color,class:'lt-bb-wire-dot'}))].join('');});
await save('target-breadboard-native.svg',targetBoard.replace('</svg>',group({'data-review-only':'proposed-footprint'},[
  group({transform:`translate(${top.x} ${top.y})`},[body]),...targetWires,...pinLabels,
  text({x:top.x+part.width/2,y:top.y-12,class:'lt-bb-part-label'},part.part.label??part.part.id.toUpperCase())])+ '</svg>'));
await save('target-breadboard-mapping.json',JSON.stringify(proposed.map(({pin,hole})=>({pin,hole})),null,2));

// Host-only identity experiment. Build transient bindings from authored IDs,
// not labels or hardcoded line numbers. These bindings expire with the source.
const floorSource=await read('floorplan.sx'), sldSource=await read('linked-sld.sx');
const floor=renderResult(floorSource,{type:'floorplan',scene:true});assert.equal(floor.status,'valid');
const items=layoutFloorplan(parseFloorplan(floorSource)).items;
const circuitByEntity:Record<string,string>={O11:'C1',O12:'C1',O21:'C2'};
const bindings=Object.keys(circuitByEntity).map(id=>{const item=items.find(i=>i.instanceId===id);assert(item?.sourceLine);const key=`item:furniture:${item.sourceLine}`;assert(floor.scene?.some(s=>s.key===key));return {entity:id,circuit:circuitByEntity[id],floorKey:key,sldId:id};});
await save('linked-floor-scene.svg',floor.svg);await save('linked-host-bindings.json',JSON.stringify({
  sourceHash:createHash('sha256').update(floorSource+sldSource).digest('hex'),bindings,
  limitation:'Preview-local bindings for these exact sources. No cross-document public API, persistence, or edit reconciliation.'},null,2));
console.log('Authored references checked: five gates, eight process links, eight physical pins, three ID-based host bindings. No engine source changed.');
