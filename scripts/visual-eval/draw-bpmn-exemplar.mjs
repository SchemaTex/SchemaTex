/** Hand-authored BPMN 2.0.2 house-style exemplar. No browser, no engine changes.
 * Run: node scripts/visual-eval/draw-bpmn-exemplar.mjs
 * All three deliverables are generated only after the scene passes verification.
 * Text metrics come from the same resvg font resolver used for the final PNG.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

// Design decisions precede geometry. No accent: line form carries BPMN meaning.
const C = { paper: '#FFFFFF', ink: '#263238', secondary: '#59656B', rule: '#A8B1B5', band: '#F0F3F4' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const TYPE = { title: 26, label: 16, secondary: 14 };
const STROKE = { body: 1.6, flow: 1.5, detail: 1.2, frame: 1, end: 3.2 };
const SIZE = { event: 18, boundary: 16, gateway: 24, taskH: 84, radius: 10, marker: 20, gap: 20 };
const W = 1680, H = 1060;
const fontOptions = { loadSystemFonts: false, fontFiles: ['/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc', '/System/Library/Fonts/Supplemental/Arial.ttf'], defaultFontFamily: 'Helvetica Neue' };
const shapes = new Map(), texts = [], lines = [], ornaments = [], connections = [];
const back = [], bodies = [], wires = [], details = [];
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const fmt = n => +n.toFixed(3);
const points = ps => ps.map(p => p.map(fmt).join(',')).join(' ');
const rect = (x,y,w,h) => ({x,y,w,h});
const bounds = ps => rect(Math.min(...ps.map(p=>p[0])),Math.min(...ps.map(p=>p[1])),Math.max(...ps.map(p=>p[0]))-Math.min(...ps.map(p=>p[0])),Math.max(...ps.map(p=>p[1]))-Math.min(...ps.map(p=>p[1])));
function path(d, target=details, fill='none', sw=STROKE.detail, color=C.ink, extra='') {
  target.push(`<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${sw}" ${extra}/>`);
}
function segment(a,b,target=back,color=C.rule,sw=STROKE.frame,owner=null) {
  lines.push({a,b,id:owner??'frame',structural:true});
  path(`M${a} L${b}`,target,'none',sw,color);
}
function shape(id,kind,x,y,w,h,parent=null,extra={}) {
  if (shapes.has(id)) throw Error(`Duplicate shape ${id}`);
  const s={id,kind,x,y,w,h,parent,...extra}; shapes.set(id,s); return s;
}
function text(s,x,y,{size=TYPE.label,weight=400,anchor='middle',color=C.ink,owner=null,rotate=false}={}) {
  texts.push({s,x,y,size,weight,anchor,color,owner,rotate});
}
function multiline(ss,x,y,opts={}) { ss.forEach((s,i)=>text(s,x,y+i*SIZE.gap,opts)); }
function frame(id,x,y,w,h,label,{parent=null,band=0,vertical=false}={}) {
  shape(id,'frame',x,y,w,h,parent);
  back.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.paper}"/>`);
  if(band) back.push(`<rect x="${x}" y="${y}" width="${band}" height="${h}" fill="${C.band}"/>`);
  for(const [a,b] of [[[x,y],[x+w,y]],[[x+w,y],[x+w,y+h]],[[x+w,y+h],[x,y+h]],[[x,y+h],[x,y]]])segment(a,b,back,C.rule,STROKE.frame,id);
  if(band) segment([x+band,y],[x+band,y+h],back,C.rule,STROKE.frame,id);
  text(label,vertical?x+band/2:x+24,vertical?y+h/2:y+h/2+6,{weight:600,anchor:vertical?'middle':'start',owner:id,rotate:vertical});
}
function envelope(x,y,filled=false) {
  details.push(`<rect x="${x-10}" y="${y-7}" width="20" height="14" fill="${filled?C.ink:C.paper}" stroke="${C.ink}" stroke-width="${STROKE.detail}"/>`);
  path(`M${x-9},${y-6} L${x},${y+1} L${x+9},${y-6}`,details,'none',STROKE.detail,filled?C.paper:C.ink);
}
function gear(x,y,r) {
  const p=[];
  for(let i=0;i<48;i++){const a=i*Math.PI/24, rr=(i%6===1||i%6===2||i%6===3)?r:r*.76;p.push([x+rr*Math.cos(a),y+rr*Math.sin(a)]);}
  details.push(`<polygon points="${points(p)}" fill="${C.paper}" stroke="${C.ink}" stroke-width="${STROKE.detail}"/>`);
  details.push(`<circle cx="${x}" cy="${y}" r="${r*.3}" fill="${C.paper}" stroke="${C.ink}" stroke-width="${STROKE.detail}"/>`);
}
function task(id,x,y,w,label,kind='user',{parent='qa',multi=false,collapsed=false}={}) {
  const s=shape(id,'task',x,y,w,SIZE.taskH,parent,{radius:SIZE.radius});
  bodies.push(`<rect x="${x}" y="${y}" width="${w}" height="${s.h}" rx="${SIZE.radius}" fill="${C.paper}" stroke="${C.ink}" stroke-width="${STROKE.body}"/>`);
  if(collapsed){
    details.push(`<rect x="${x+w/2-7}" y="${y+s.h-19}" width="14" height="14" fill="${C.paper}" stroke="${C.ink}" stroke-width="${STROKE.detail}"/>`);
    path(`M${x+w/2-4},${y+s.h-12} h8 M${x+w/2},${y+s.h-16} v8`);
    ornaments.push({...rect(x+w/2-8,y+s.h-20,16,16),owner:id});
  } else {
    const mx=x+21,my=y+18;
    ornaments.push({...rect(mx-12,my-12,26,24),owner:id});
    if(kind==='send'||kind==='receive')envelope(mx,my,kind==='send');
    if(kind==='user'){
      details.push(`<circle cx="${mx}" cy="${my-5}" r="4" fill="${C.paper}" stroke="${C.ink}" stroke-width="${STROKE.detail}"/>`);
      path(`M${mx-8},${my+9} v-4 Q${mx-8},${my} ${mx-3},${my} h6 Q${mx+8},${my} ${mx+8},${my+5} v4 Z`,details,C.ink);
      path(`M${mx-3},${my+4} v5 M${mx+3},${my+4} v5`,details,'none',STROKE.detail,C.paper);
    }
    if(kind==='service'){gear(mx-4,my-3,7.5);gear(mx+6,my+6,5.5);}
    if(kind==='script'){
      path(`M${mx-6},${my-10} h15 q-4,3 -2,6 l-3,14 h-15 q4,-3 2,-6 l3,-11 q-1,-3 0,-3 Z`,details,C.paper);
      path(`M${mx-4},${my-5} h9 M${mx-5},${my} h9 M${mx-6},${my+5} h9`);
    }
    if(kind==='rule'){
      details.push(`<rect x="${mx-10}" y="${my-9}" width="21" height="18" fill="${C.paper}" stroke="${C.ink}" stroke-width="${STROKE.detail}"/><rect x="${mx-10}" y="${my-9}" width="21" height="5" fill="${C.ink}"/>`);
      path(`M${mx-4},${my-4} v13 M${mx-10},${my+2} h21`);
    }
  }
  if(multi){path(`M${x+w/2-5},${y+s.h-17} v10 M${x+w/2},${y+s.h-17} v10 M${x+w/2+5},${y+s.h-17} v10`,details,'none',STROKE.body);ornaments.push({...rect(x+w/2-7,y+s.h-19,14,14),owner:id});}
  multiline(label,x+w/2,y+(collapsed?31:multi?39:45),{owner:id});
  return s;
}
function event(id,x,y,kind='intermediate',trigger='none',{parent='qa',boundary=null,nonInterrupt=false,throwing=false}={}) {
  const r=boundary?SIZE.boundary:SIZE.event;
  const s=shape(id,'circle',x-r,y-r,2*r,2*r,parent,{r,cx:x,cy:y,boundary});
  const dash=nonInterrupt?' stroke-dasharray="4 3"':'';
  details.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${C.paper}" stroke="${C.ink}" stroke-width="${kind==='end'?STROKE.end:STROKE.body}"${dash}/>`);
  if(kind==='intermediate'||boundary) details.push(`<circle cx="${x}" cy="${y}" r="${r-4}" fill="none" stroke="${C.ink}" stroke-width="${STROKE.detail}"${dash}/>`);
  if(trigger==='message')envelope(x,y,throwing);
  if(trigger==='timer'){
    details.push(`<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${C.ink}" stroke-width="${STROKE.detail}"/>`);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;path(`M${x+6.5*Math.sin(a)},${y+6.5*Math.cos(a)} L${x+8*Math.sin(a)},${y+8*Math.cos(a)}`);}
    path(`M${x},${y-5} v5 l4,2`);
  }
  if(trigger==='error')path(`M${x-7},${y+8} L${x-3},${y-8} L${x+2},${y-1} L${x+7},${y-8} L${x+3},${y+8} L${x-2},${y+1} Z`,details,throwing?C.ink:C.paper);
  if(trigger==='terminate')details.push(`<circle cx="${x}" cy="${y}" r="10" fill="${C.ink}"/>`);
  return s;
}
function gateway(id,x,y,kind,parent='qa') {
  const r=SIZE.gateway,s=shape(id,'diamond',x-r,y-r,r*2,r*2,parent,{r,cx:x,cy:y});
  bodies.push(`<polygon points="${points([[x,y-r],[x+r,y],[x,y+r],[x-r,y]])}" fill="${C.paper}" stroke="${C.ink}" stroke-width="${STROKE.body}"/>`);
  path(kind==='and'?`M${x-9},${y} h18 M${x},${y-9} v18`:`M${x-7},${y-8} l14,16 M${x+7},${y-8} l-14,16`,details,'none',kind==='and'?3:2.4);
  return s;
}
function dataObject(id,x,y,label,{collection=false,parent='qa'}={}) {
  shape(id,'document',x,y,42,54,parent);
  path(`M${x},${y} h30 l12,12 v42 h-42 Z M${x+30},${y} v12 h12`,bodies,C.paper,STROKE.body);
  if(collection)path(`M${x+16},${y+40} v9 M${x+21},${y+40} v9 M${x+26},${y+40} v9`,details,'none',STROKE.body);
  multiline(label,x+62,y+22,{anchor:'start',size:TYPE.secondary,color:C.secondary});
}
function store(id,x,y,label,parent) {
  // Anchor box includes the exact ellipse extrema, not the path's control points.
  shape(id,'store',x,y,58,48,parent);
  path(`M${x},${y+7} C${x},${y-2.333} ${x+58},${y-2.333} ${x+58},${y+7} V${y+41} C${x+58},${y+50.333} ${x},${y+50.333} ${x},${y+41} Z`,bodies,C.paper,STROKE.body);
  for(const dy of [7,12,17])path(`M${x},${y+dy} C${x},${y+dy+9.333} ${x+58},${y+dy+9.333} ${x+58},${y+dy}`);
  if(label)multiline(label,x+76,y+25,{anchor:'start',size:TYPE.secondary,color:C.secondary});
}
function connect(id,from,to,ps,{kind='sequence',defaultFlow=false,scope='manufacturer'}={}) {
  connections.push({id,from,to,ps,kind,scope});
  for(let i=1;i<ps.length;i++) {
    if(ps[i][0]!==ps[i-1][0]&&ps[i][1]!==ps[i-1][1])throw Error(`${id}: diagonal connector`);
    if(ps[i][0]===ps[i-1][0]&&ps[i][1]===ps[i-1][1])throw Error(`${id}: zero-length connector segment`);
    lines.push({id,a:ps[i-1],b:ps[i],from,to,scope,kind});
  }
  path(`M${ps.map(p=>p.map(fmt).join(',')).join(' L')}`,wires,'none',STROKE.flow,C.ink,kind==='message'?'stroke-dasharray="7 5"':kind==='data'||kind==='association'?'stroke-dasharray="1 5" stroke-linecap="round"':'');
  const tip=ps.at(-1),prev=ps.at(-2),dx=Math.sign(tip[0]-prev[0]),dy=Math.sign(tip[1]-prev[1]);
  const endP=[[tip[0]-dx*10-dy*4.5,tip[1]-dy*10+dx*4.5],tip,[tip[0]-dx*10+dy*4.5,tip[1]-dy*10-dx*4.5]];
  if(kind!=='association') {
    if(kind==='data')path(`M${endP.map(p=>p.join(',')).join(' L')}`,details);
    else details.push(`<polygon points="${points(endP)}" fill="${kind==='message'?C.paper:C.ink}" stroke="${C.ink}" stroke-width="${STROKE.detail}" stroke-linejoin="round"/>`);
    ornaments.push({...bounds(endP),owner:id,endpoint:to});
  }
  if(kind==='message'){
    const p=ps[0],next=ps[1],sx=Math.sign(next[0]-p[0]),sy=Math.sign(next[1]-p[1]);
    // Source circle is tangent to participant/activity, entirely outside it.
    details.push(`<circle cx="${p[0]+sx*4}" cy="${p[1]+sy*4}" r="4" fill="${C.paper}" stroke="${C.ink}" stroke-width="${STROKE.detail}"/>`);
    ornaments.push({...rect(p[0]+sx*4-4,p[1]+sy*4-4,8,8),owner:id,endpoint:from});
  }
  if(defaultFlow){
    const p=ps[0],q=ps[1],dx=Math.sign(q[0]-p[0]),dy=Math.sign(q[1]-p[1]),cx=p[0]+dx*11,cy=p[1]+dy*11;
    path(`M${cx-dx*4-dy*5},${cy-dy*4+dx*5} L${cx+dx*4+dy*5},${cy+dy*4-dx*5}`,details,'none',STROKE.body);
    ornaments.push({...rect(cx-6,cy-6,12,12),owner:id,endpoint:from});
  }
}

// Participant and lane geometry. The expanded activity is a real nested scope.
text('Food lot release',30,45,{size:TYPE.title,weight:600,anchor:'start'});
text('Laboratory results, batch records and QA disposition · One finished-product lot per instance',30,75,{size:TYPE.secondary,color:C.secondary,anchor:'start'});
text('BPMN 2.0.2',1650,45,{size:TYPE.secondary,color:C.secondary,anchor:'end'});
frame('laboratory',30,104,1620,64,'Contract laboratory');
frame('manufacturer',30,246,1620,794,'Food manufacturer',{band:38,vertical:true});
frame('qa',68,246,1582,440,'Quality assurance',{parent:'manufacturer',band:38,vertical:true});
frame('systems',68,686,1582,354,'Quality systems',{parent:'manufacturer',band:38,vertical:true});

// Main process, laid out on a single 350px baseline.
event('logged',165,350,'start','message');
multiline(['Sample','logged'],165,397,{size:TYPE.secondary});
task('request',240,308,130,['Request','testing'],'send');
task('report',420,308,140,['Await lab','report'],'receive');
event('ack',640,350,'intermediate','message',{throwing:true});
multiline(['Receipt','acknowledged'],640,398,{size:TYPE.secondary});
gateway('fork',720,350,'and');
task('review',780,308,140,['Review','batch records'],'user',{multi:true});
gateway('join',1000,350,'and');
task('approve',1050,308,160,['Approve lot','disposition'],'none',{collapsed:true});
gateway('released',1300,350,'xor');
text('Release approved?',1230,430,{size:TYPE.secondary});
task('release',1370,308,145,['Release lot','in ERP'],'service');
event('done',1595,350,'end');
text('Released',1608,399,{size:TYPE.secondary,anchor:'end'});
event('overdue',440,392,'intermediate','timer',{boundary:'report',nonInterrupt:true});
multiline(['48 hours','once only'],462,452,{size:TYPE.secondary,anchor:'start',color:C.secondary});
task('flag',420,510,160,['Flag overdue','report'],'service');
event('flagged',650,552,'end');
multiline(['Overdue flag','recorded'],650,597,{size:TYPE.secondary});
task('block',1225,530,160,['Block lot','in ERP'],'service');
event('rejected',1595,572,'end','terminate');
text('Rejected',1608,620,{size:TYPE.secondary,anchor:'end'});
store('inventory',1413,452,null,'qa');
text('Inventory ledger',1442,524,{size:TYPE.secondary,color:C.secondary});
dataObject('records',829,535,['Batch records','[complete]'],{collection:true});
shape('note','annotation',165,550,224,64,'qa');
path('M177,550 H165 V614 H177',bodies,'none',STROKE.body);
multiline(['Stock stays on hold','until QA approves release.'],181,574,{size:TYPE.secondary,anchor:'start',owner:'note',color:C.secondary});

// Expanded subprocess: errors are integration errors, not failed product tests.
shape('validate','expanded',160,725,1120,240,'systems',{radius:SIZE.radius});
bodies.push(`<rect x="160" y="725" width="1120" height="240" rx="${SIZE.radius}" fill="${C.paper}" stroke="${C.ink}" stroke-width="${STROKE.body}"/>`);
text('Validate laboratory results',184,754,{weight:600,anchor:'start',owner:'validate'});
event('vstart',210,825,'start','none',{parent:'validate'});
task('normalize',285,783,160,['Normalize','result units'],'script',{parent:'validate'});
gateway('mapped',570,825,'xor','validate');
text('Units mapped?',570,778,{size:TYPE.secondary,owner:'validate'});
task('limits',680,783,170,['Evaluate release','specification'],'rule',{parent:'validate'});
event('vend',1040,825,'end','none',{parent:'validate'});
text('Results evaluated',1040,868,{size:TYPE.secondary,owner:'validate'});
event('mappingError',750,920,'end','error',{parent:'validate',throwing:true});
text('UNIT_MAPPING_ERROR',884,926,{size:TYPE.secondary,owner:'validate'});
store('mappings',330,899,['Unit mappings'],'validate');
store('specifications',1100,899,['Release','specifications'],'validate');
event('catchError',1280,890,'intermediate','error',{parent:'systems',boundary:'validate'});
multiline(['UNIT_MAPPING_ERROR'],1490,858,{size:TYPE.secondary});
task('repair',1395,875,190,['Repair unit mapping'],'user',{parent:'systems'});
// Sequence flows: explicit perimeter endpoints; no auto-routing or hidden stubs.
connect('s01','logged','request',[[183,350],[240,350]]);
connect('s02','request','report',[[370,350],[420,350]]);
connect('s03','report','ack',[[560,350],[622,350]]);
connect('s04','ack','fork',[[658,350],[696,350]]);
connect('s05','fork','review',[[744,350],[780,350]]);
connect('s06','review','join',[[920,350],[976,350]]);
connect('s07','join','approve',[[1024,350],[1050,350]]);
connect('s08','approve','released',[[1210,350],[1276,350]]);
connect('s09','released','release',[[1324,350],[1370,350]]);
text('Yes',1347,332,{size:TYPE.secondary});
connect('s10','release','done',[[1515,350],[1577,350]]);
connect('s11','released','block',[[1300,374],[1300,530]],{defaultFlow:true});
text('Otherwise',1317,482,{size:TYPE.secondary,anchor:'start'});
connect('s12','block','rejected',[[1385,572],[1577,572]]);
connect('s13','overdue','flag',[[440,408],[440,510]]);
connect('s14','flag','flagged',[[580,552],[632,552]]);
connect('s15','fork','validate',[[720,374],[720,660],[140,660],[140,825],[160,825]]);
connect('s16','validate','join',[[1280,825],[1620,825],[1620,280],[1000,280],[1000,326]]);
connect('v01','vstart','normalize',[[228,825],[285,825]],{scope:'validate'});
connect('v02','normalize','mapped',[[445,825],[546,825]],{scope:'validate'});
connect('v03','mapped','limits',[[594,825],[680,825]],{scope:'validate'});
text('Yes',637,809,{size:TYPE.secondary,owner:'validate'});
connect('v04','limits','vend',[[850,825],[1022,825]],{scope:'validate'});
connect('v05','mapped','mappingError',[[570,849],[570,920],[732,920]],{defaultFlow:true,scope:'validate'});
text('Otherwise',586,889,{size:TYPE.secondary,anchor:'start',owner:'validate'});
connect('s17','catchError','repair',[[1296,890],[1350,890],[1350,917],[1395,917]]);
connect('s18','repair','validate',[[1490,959],[1490,1005],[1260,1005],[1260,965]]);
text('Retry',1243,1009,{size:TYPE.secondary,anchor:'end'});
// Message flows are perpendicular to facing participant boundaries.
connect('m01','laboratory','logged',[[165,168],[165,332]],{kind:'message'});
multiline(['Sample','registration'],181,202,{size:TYPE.secondary,anchor:'start',color:C.secondary});
connect('m02','request','laboratory',[[305,308],[305,168]],{kind:'message'});
multiline(['Test order'],322,222,{size:TYPE.secondary,anchor:'start',color:C.secondary});
connect('m03','laboratory','report',[[490,168],[490,308]],{kind:'message'});
multiline(['Test report'],507,222,{size:TYPE.secondary,anchor:'start',color:C.secondary});
connect('m04','ack','laboratory',[[640,332],[640,168]],{kind:'message'});
multiline(['Receipt','confirmation'],657,202,{size:TYPE.secondary,anchor:'start',color:C.secondary});
// Data associations and annotation association have no sequence-flow meaning.
connect('d01','records','review',[[850,535],[850,392]],{kind:'data'});
connect('d02','release','inventory',[[1442,392],[1442,452]],{kind:'data'});
connect('d03','mappings','normalize',[[359,899],[359,867]],{kind:'data',scope:'validate'});
connect('d04','specifications','limits',[[1129,899],[1129,884],[765,884],[765,867]],{kind:'data',scope:'validate'});
connect('a01','logged','note',[[147,350],[125,350],[125,582],[165,582]],{kind:'association'});

// ---------- Verification: text ink measured by resvg, padded by two pixels. ----------
const errors=[];
const contains=(a,b,p=0)=>b.x>=a.x+p&&b.y>=a.y+p&&b.x+b.w<=a.x+a.w-p&&b.y+b.h<=a.y+a.h-p;
const grow=(b,p)=>rect(b.x-p,b.y-p,b.w+2*p,b.h+2*p);
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const ancestors=id=>{const out=[];for(let s=shapes.get(id);s;s=shapes.get(s.parent))out.push(s.id);return out;};
const segRect=(a,b,r)=>a[1]===b[1]
  ? a[1]>=r.y&&a[1]<=r.y+r.h&&Math.max(a[0],b[0])>=r.x&&Math.min(a[0],b[0])<=r.x+r.w
  : a[0]>=r.x&&a[0]<=r.x+r.w&&Math.max(a[1],b[1])>=r.y&&Math.min(a[1],b[1])<=r.y+r.h;
const onEdge=(p,s)=>{
  const [x,y]=p,eps=.02;
  if(s.kind==='circle')return Math.abs(Math.hypot(x-s.cx,y-s.cy)-s.r)<eps;
  if(s.kind==='diamond')return Math.abs(Math.abs(x-s.cx)+Math.abs(y-s.cy)-s.r)<eps;
  if(s.kind==='store'&&x===s.x+s.w/2&&(y===s.y||y===s.y+s.h))return true;
  const onV=(Math.abs(x-s.x)<eps||Math.abs(x-s.x-s.w)<eps)&&y>=s.y&&y<=s.y+s.h;
  const onH=(Math.abs(y-s.y)<eps||Math.abs(y-s.y-s.h)<eps)&&x>=s.x&&x<=s.x+s.w;
  if(!onV&&!onH)return false;
  if(s.radius) return (onV&&y>=s.y+s.radius&&y<=s.y+s.h-s.radius)||(onH&&x>=s.x+s.radius&&x<=s.x+s.w-s.radius);
  return true;
};
const cache=new Map();
function metric(t){
  const key=`${t.size}/${t.weight}/${t.anchor}/${t.s}`;
  if(!cache.has(key)){
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="200"><text x="100" y="100" font-family="${FONT}" font-size="${t.size}" font-weight="${t.weight}" text-anchor="${t.anchor}">${esc(t.s)}</text></svg>`;
    const b=new Resvg(svg,{font:fontOptions}).innerBBox();
    if(!b)throw Error(`Text failed to resolve: ${t.s}`);
    cache.set(key,rect(b.x-100,b.y-100,b.width,b.height));
  }
  const b=cache.get(key);
  return t.rotate?rect(t.x+b.y,t.y-b.x-b.w,b.h,b.w):rect(t.x+b.x,t.y+b.y,b.w,b.h);
}
const laid=texts.map(t=>({...t,box:grow(metric(t),2)}));
for(let i=0;i<laid.length;i++){
  const t=laid[i];
  if(!contains(rect(8,8,W-16,H-16),t.box))errors.push(`Canvas/text: ${t.s}`);
  for(let j=i+1;j<laid.length;j++)if(overlap(t.box,laid[j].box))errors.push(`Text/text: ${t.s} / ${laid[j].s}`);
  for(const s of shapes.values()){
    if(ancestors(t.owner).includes(s.id)){
      if(!contains(s,t.box,3))errors.push(`Text escapes owner: ${t.s} / ${s.id}`);
    }else if(s.kind==='frame'||s.kind==='expanded'){
      // Enclosures have an interior, not an opaque obstruction. Crossing their outline is forbidden.
      if(overlap(t.box,s)&&!contains(s,t.box,3))errors.push(`Text/frame: ${t.s} / ${s.id}`);
    }else if(overlap(t.box,grow(s,STROKE.body/2)))errors.push(`Text/body: ${t.s} / ${s.id}`);
  }
  for(const l of lines)if(segRect(l.a,l.b,grow(t.box,(l.structural?STROKE.frame:STROKE.flow)/2)))errors.push(`Text/line: ${t.s} / ${l.id}`);
  for(const o of ornaments)if(overlap(t.box,grow(o,1)))errors.push(`Text/marker: ${t.s} / ${o.owner}`);
}
for(const c of connections){
  for(const [id,p] of [[c.from,c.ps[0]],[c.to,c.ps.at(-1)]])if(!shapes.has(id)||!onEdge(p,shapes.get(id)))errors.push(`Endpoint: ${c.id} / ${id} / ${p}`);
  if(c.kind==='sequence'&&c.scope==='validate'&&(!ancestors(c.from).includes('validate')||!ancestors(c.to).includes('validate')))errors.push(`Subprocess scope: ${c.id}`);
}
// Filled interiors of leaf symbols are obstacles. Pools/lanes are real enclosures:
// membership permits crossing a lane divider, never an unrelated participant.
for(const l of lines)for(const s of shapes.values()){
  if(l.structural){
    if(s.kind==='frame')continue;
    if(segRect(l.a,l.b,grow(s,.75)))errors.push(`Frame/body: ${l.id} / ${s.id}`);
    continue;
  }
  const c=connections.find(c=>c.id===l.id);
  const related=ancestors(l.from).includes(s.id)||ancestors(l.to).includes(s.id);
  if(s.kind==='frame'){
    if(!related&&segRect(l.a,l.b,grow(s,.75)))errors.push(`Line/unrelated frame: ${l.id} / ${s.id}`);
    continue;
  }
  if(ancestors(l.from).includes(s.id)&&ancestors(l.to).includes(s.id)&&s.kind==='expanded')continue;
  // Boundary attachment is a declared relation, not a free-form collision exemption.
  if((shapes.get(l.from)?.boundary===s.id&&l.a===c.ps[0])||
     (shapes.get(l.to)?.boundary===s.id&&l.b===c.ps.at(-1)))continue;
  if(s.id===l.from||s.id===l.to){
    // Even an attached line must not run through its own target or source body.
    if(segRect(l.a,l.b,grow(s,-.05)))errors.push(`Line/attached body interior: ${l.id} / ${s.id}`);
    continue;
  }
  if(segRect(l.a,l.b,grow(s,.75)))errors.push(`Line/body: ${l.id} / ${s.id}`);
}
// Connector/connector intersections are not required by BPMN, but this sheet has none.
const flowSegments=lines.filter(l=>!l.structural);
function segmentsTouch(a,b){
  const ah=a.a[1]===a.b[1],bh=b.a[1]===b.b[1];
  if(ah===bh){
    const k=ah?0:1,other=1-k;
    return a.a[other]===b.a[other]&&Math.max(Math.min(a.a[k],a.b[k]),Math.min(b.a[k],b.b[k]))<=Math.min(Math.max(a.a[k],a.b[k]),Math.max(b.a[k],b.b[k]));
  }
  const h=ah?a:b,v=ah?b:a;
  return v.a[0]>=Math.min(h.a[0],h.b[0])&&v.a[0]<=Math.max(h.a[0],h.b[0])&&h.a[1]>=Math.min(v.a[1],v.b[1])&&h.a[1]<=Math.max(v.a[1],v.b[1]);
}
for(let i=0;i<flowSegments.length;i++)for(let j=i+1;j<flowSegments.length;j++){
  const a=flowSegments[i],b=flowSegments[j];
  if(a.id!==b.id&&segmentsTouch(a,b))errors.push(`Connection/connection: ${a.id} / ${b.id}`);
}
// Body/body, membership, and boundary mounting; no global pair exemptions.
const objects=[...shapes.values()];
for(let i=0;i<objects.length;i++){
  const a=objects[i];
  if(a.parent&&!a.boundary&&!contains(shapes.get(a.parent),a,0))errors.push(`Body outside parent: ${a.id}`);
  if(a.boundary&&!onEdge([a.cx,a.cy],shapes.get(a.boundary)))errors.push(`Unattached boundary: ${a.id}`);
  for(let j=i+1;j<objects.length;j++){
    const b=objects[j];
    if(ancestors(a.id).includes(b.id)||ancestors(b.id).includes(a.id)||a.boundary===b.id||b.boundary===a.id)continue;
    if(overlap(a,b))errors.push(`Body/body: ${a.id} / ${b.id}`);
  }
}
// Every sequence/data segment stays within its process scope (including its own boundary).
for(const c of connections)if(c.kind!=='message')for(const p of c.ps){const s=shapes.get(c.scope);if(!contains(grow(s,.01),rect(...p,0,0)))errors.push(`Connection escapes scope: ${c.id}`);}
if(errors.length)throw Error(`BPMN geometry verification failed (${errors.length}):\n${[...new Set(errors)].join('\n')}`);

const source=`# Closest supported DSL. See notes.md for explicitly documented losses.
bpmn
direction: LR
title: "Food lot release"
pool "Contract laboratory" blackbox
pool "Food manufacturer" {
  lane "Quality assurance" {
    logged: start message "Sample logged"
    request: task send "Request testing"
    report: task receive "Await lab report"
    ack: task send "Acknowledge report receipt"
    fork: gateway and ""
    review: task user "Review batch records"
    join: gateway and ""
    approve: subprocess "Approve lot disposition" collapsed
    released: gateway xor "Release approved?"
    release: task service "Release lot in ERP"
    done: end "Released"
    block: task service "Block lot in ERP"
    rejected: end "Rejected"
    overdue: intermediate timer "48 hours - once only"
    flag: task service "Flag overdue report"
    flagged: end "Overdue flag recorded"
  }
  lane "Quality systems" {
    validate: subprocess "Validate laboratory results" collapsed
    mappingValid: gateway xor "Unit mapping valid?"
    repair: task user "Repair unit mapping"
  }
}
flows
"Contract laboratory" ~~> logged : "Sample registration"
logged --> request --> report --> ack --> fork
request ~~> "Contract laboratory" : "Test order"
"Contract laboratory" ~~> report : "Test report"
ack ~~> "Contract laboratory" : "Receipt confirmation"
fork --> review --> join
fork --> validate --> mappingValid
mappingValid --? "Yes" --> join
join --> approve --> released
released --? "Yes" --> release --> done
released --* "Otherwise" --> block --> rejected
# Approximation only: timer is a free-standing side branch, not an attached boundary.
request --> overdue --> flag --> flagged
# Approximation only: branch label records an exception the parser cannot model.
mappingValid --* "UNIT_MAPPING_ERROR" --> repair --> validate
`;
const notes=`# BPMN exemplar — food lot release

**Scenario.** A contract laboratory registers a finished-product sample. The food manufacturer
orders testing, waits for the report, and acknowledges receipt. QA reviews the collection of
batch records while Quality Systems validates the laboratory results. A parallel join waits
for both before the collapsed disposition subprocess authorizes release or rejection. Stock
remains on hold until that decision. The default path blocks the lot in the ERP (enterprise
resource planning system); its Terminate End cancels any still-active overdue-flag work.
The 48-hour timer fires once without cancelling the report wait. Unit-mapping failures are
integration errors, not out-of-specification product results: the expanded subprocess throws
UNIT_MAPPING_ERROR, its interrupting boundary catches it, and an operator repairs the mapping
before retrying. A failed release specification is ordinary decision data for QA.

**Palette.** Five literal colours. Ink \`#263238\` for all process outlines, triggers, flows and
primary labels. Secondary \`#59656B\` for message names, data names and explanatory text. Rule
\`#A8B1B5\` for pool/lane divisions. Band \`#F0F3F4\` for participant and responsibility headers.
Paper \`#FFFFFF\` for the canvas and symbol interiors. No accent hue: business success, failure,
and ownership remain readable in monochrome; no colour is a second, competing notation.

**Type scale.** 26px/600 title, 16px activity and participant labels (600 for the title of the
expanded subprocess and participant/lane names), 14px secondary labels. Multiline baselines
are 20px apart. One stack: Inter, Helvetica Neue, Helvetica, Arial, sans-serif. Weight and size
supply the hierarchy; the sans-serif letterforms keep long operational names legible. Actual
text ink boxes are measured with resvg using its explicit Helvetica Neue / Helvetica / Arial font files, then padded by 2px.

**Symbol geometry.** Activity bodies are 84px high with 10px corner radii. Events are 36px in
diameter, boundary events 32px; intermediate rings have a 4px gap. Gateways are 48px diamonds.
Outlines use 1.6px, flow lines 1.5px, icon details 1.2px, structural rules 1px, end rings 3.2px.
Every task type uses the same upper-left marker slot. Service tasks use two toothed gears;
Script tasks a scroll; Business Rule tasks a ruled table. Multi-instance review uses three
vertical bars. Collapsed subprocesses use a boxed plus; the expanded subprocess has no plus.
Message envelopes are hollow when catching and filled when throwing. Error bolts follow the
same rule. The non-interrupting timer has two dashed rings. Message flows have a hollow source
circle tangent to the source and a hollow triangular target. Data associations have dotted
lines and open V heads; the annotation association is dotted and undirected. Default slashes
sit 11px beyond the gateway vertex and remain fully visible. Data collections have a folded
corner and three bars; stores have stacked cylinder rims.

**Layout and collision checks.** A single main baseline carries the normal process. The
laboratory messages occupy separate vertical channels. Exception work and data sit below the
main row; the expanded validation scope fills the Systems lane. Its completion returns in the
right-hand gutter, and mapping repair returns to the subprocess boundary, never an internal
node. The generator checks every text box against every other text box, every symbol body,
every frame/connector segment, every arrow or marker and the canvas. Text belonging to an
activity must fit inside it and avoid its icon. Enclosure membership is checked instead of
mistaking legitimate contained text for a collision. Every connector endpoint is checked on
its actual circle, diamond, straight activity edge or data shape. Every connector segment is
checked against unrelated symbols; only declared containment and boundary attachment are
allowed. Body/body intersections, connector/connector crossings, nested-scope containment
and orthogonality are also checked.
The generator refuses to write any deliverable on failure. The 1600px resvg PNG is the visual
inspection artifact, kept outside the repository at the requested scratchpad path.

**Coverage.** All twelve Tier 1 entries appear, including the black-box laboratory participant.
Twenty-five of the thirty-eight Tier 2 entries appear: intermediate outline; both boundary
outlines; message catch/throw and intermediate throw; timer; error catch/throw; terminate;
User, Service, Send, Receive, Business Rule and Script task markers; collapsed and expanded
subprocesses; parallel multi-instance; undirected and directed associations; Data Object,
collection marker, Data Store and Text Annotation. (The enumerated list is the source of
truth; composable markers may occur together on one object.) Signal/conditional events,
Manual tasks, Call Activities, loop/sequential-instance markers, inclusive/event-based
gateways, activity-origin conditional-flow diamonds, data input/output arrows and groups are
omitted because this scenario does not need them. This is a business model, not a symbol key.

**Standard and departures.** The authority is [OMG BPMN 2.0.2, formal/13-12-09](https://www.omg.org/spec/BPMN/2.0.2/PDF),
especially Chapters 8–10. There is no intentional notation or semantic departure. Unlike the
repository reference document's default corporate-blue theme, this house style is neutral.
The reference document's event-based gateway description is incorrect for an ordinary
non-instantiating gateway; that symbol is not used here. Absolute pixel dimensions are house
style, not OMG-mandated measurements.

**DSL losses.** The actual parser supports less than the reference document's proposed grammar.
The expanded validation subprocess is kept as a collapsed subprocess in source.sx; its nested
start, Script task, mapping gateway, Business Rule task, normal end and Error End cannot be
expressed with nested ownership. The Error Boundary/repair route is approximated by an added exclusive gateway
with a labelled default route to repair. This is not equivalent error propagation. The non-interrupting
boundary timer is approximated by a timer branch after Request testing: it cannot be cancelled
when Await lab report completes, unlike the drawing. Intermediate message throw becomes a
Send task. Multi-instance bars and the Terminate End marker are lost. Data objects, stores,
associations and the text annotation have no supported declarations and are omitted. Source
comments expose these losses; unsupported keywords are never passed off as implemented syntax.

**Verification result.** 61 text boxes, 34 symbol/enclosure bodies and 32 connections: zero
collisions, zero connector crossings. The final SVG was rasterised at 1600px width and visually
reviewed. DSL validation with renderResult returned \`true []\`. The requested vite-node -e
command was attempted, but installed vite-node 2.1.9 does not implement -e; the equivalent
code was run through ViteNodeRunner with the same src/index.ts entry point instead.
`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}">
<title>Food lot release — BPMN collaboration</title>
<desc>A contract laboratory exchanges sample registration, test orders, test reports and receipt confirmations with a food manufacturer. QA reviews batch records in parallel with an expanded laboratory-result validation subprocess. A non-interrupting 48-hour boundary timer flags an overdue report. Unit mapping errors are thrown and caught within the validation exception route, repaired, and retried. QA disposition releases or rejects the lot. Data objects, persistent stores and an annotation make the information dependencies explicit.</desc>
<rect width="${W}" height="${H}" fill="${C.paper}"/>
${back.join('\n')}
${bodies.join('\n')}
${wires.join('\n')}
${details.join('\n')}
${texts.map(t=>`<text x="${t.x}" y="${t.y}" font-size="${t.size}" font-weight="${t.weight}" fill="${t.color}" text-anchor="${t.anchor}"${t.rotate?` transform="rotate(-90 ${t.x} ${t.y})"`:''}>${esc(t.s)}</text>`).join('\n')}
</svg>\n`;
const png=new Resvg(svg,{font:fontOptions,fitTo:{mode:'width',value:1600}}).render().asPng();
// Two pools exchanging message flows: this is the collaboration variant's exemplar.
const dir=new URL('../../visual-eval/exemplars/bpmn/collaboration/',import.meta.url);
// Optional: a path to also write a 1600 px PNG preview for checking by eye.
const pngPath=process.argv[2];
await mkdir(dir,{recursive:true});
await writeFile(new URL('ideal.svg',dir),svg);
await writeFile(new URL('source.sx',dir),source);
await writeFile(new URL('notes.md',dir),notes);
if(pngPath)await writeFile(pngPath,png);
console.log(JSON.stringify({canvas:[W,H],textBoxes:texts.length,symbols:shapes.size,connections:connections.length,segments:lines.length,collisions:0,png:pngPath??null}));
