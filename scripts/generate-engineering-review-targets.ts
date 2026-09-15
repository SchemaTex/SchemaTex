/** Preview-only authored compositions, NOT a renderer implementation or automatic router.
 * Reuse shipped symbols/styles; fixed positions describe the design target only.
 * Run with vite-node. Original replay assets remain immutable.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { svgRoot, el, group, rect, path, circle, text } from '../src/core/svg';
import { getGateGeometry } from '../src/diagrams/logic/symbols';
import { parseLogic } from '../src/diagrams/logic/parser';

const dir = new URL('../preview/engineering-review/', import.meta.url);
const read = (name: string) => readFile(new URL(`../tests/fixtures/regression/engineering-${name}`, import.meta.url), 'utf8');
const save = async (name: string, value: string) => { await mkdir(dir, { recursive: true }); await writeFile(new URL(name, dir), value); };
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
