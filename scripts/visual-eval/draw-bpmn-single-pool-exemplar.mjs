/** Hand-authored BPMN 2.0.2 single-pool exemplar (sibling of draw-bpmn-exemplar.mjs, same house style).
 * Run: node scripts/visual-eval/draw-bpmn-single-pool-exemplar.mjs [preview.png]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

// Design decisions precede geometry. No accent: line form carries BPMN meaning.
const C = { paper: '#FFFFFF', ink: '#263238', secondary: '#59656B', rule: '#A8B1B5', band: '#F0F3F4' };
const FONT = 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif';
const TYPE = { title: 26, label: 16, secondary: 14 };
const STROKE = { body: 1.6, flow: 1.5, detail: 1.2, frame: 1, end: 3.2 };
const SIZE = { event: 18, boundary: 16, gateway: 24, taskH: 84, radius: 10, marker: 20, gap: 20 };
const W = 1600, H = 950;
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
function connect(id,from,to,ps,{kind='sequence',defaultFlow=false,scope='store'}={}) {
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


// ---------- Scene: one pool, three lanes, no message flows. ----------
text('Customer return and refund',30,45,{size:TYPE.title,weight:600,anchor:'start'});
text('Online store · one return request per process instance · single participant, no message flows',30,75,{size:TYPE.secondary,color:C.secondary,anchor:'start'});
text('BPMN 2.0.2',W-30,45,{size:TYPE.secondary,color:C.secondary,anchor:'end'});
frame('store',30,100,1540,820,'Online store',{band:38,vertical:true});
frame('cs',68,100,1502,270,'Customer service',{parent:'store',band:38,vertical:true});
frame('wh',68,370,1502,280,'Warehouse',{parent:'store',band:38,vertical:true});
frame('fin',68,650,1502,270,'Finance',{parent:'store',band:38,vertical:true});

// Customer service: eligibility decision on the 200px baseline.
event('req',150,200,'start','message',{parent:'cs'});
multiline(['Request','received'],150,247,{size:TYPE.secondary});
task('check',215,158,150,['Check return','eligibility'],'user',{parent:'cs'});
gateway('eligible',430,200,'xor','cs');
text('Eligible?',430,166,{size:TYPE.secondary});
event('labelSent',520,200,'intermediate','message',{parent:'cs',throwing:true});
text('Label e-mailed',520,170,{size:TYPE.secondary});
task('reject',355,262,150,['Send rejection','notice'],'send',{parent:'cs'});
event('rejected',560,304,'end','none',{parent:'cs'});
text('Return rejected',560,350,{size:TYPE.secondary});

// Warehouse: parcel receipt, interrupting 14-day timer, inspection and restock.
task('receive',700,428,150,['Receive parcel'],'receive',{parent:'wh'});
event('expiry',740,512,'intermediate','timer',{parent:'wh',boundary:'receive'});
text('14 days',724,562,{size:TYPE.secondary,anchor:'end',color:C.secondary});
task('close',790,550,140,['Send expiry','notice'],'send',{parent:'wh'});
event('expired',990,592,'end','none',{parent:'wh'});
text('Return expired',1016,597,{size:TYPE.secondary,anchor:'start'});
task('inspect',900,428,150,['Inspect','returned item'],'user',{parent:'wh'});
gateway('fork',1150,470,'and','wh');
task('restock',1220,428,140,['Restock','item'],'service',{parent:'wh'});
gateway('join',1440,470,'and','wh');
event('done',1520,470,'end','terminate',{parent:'wh'});
multiline(['Return','completed'],1520,517,{size:TYPE.secondary});

// Finance: refund with an interrupting error boundary and manual fallback.
task('refund',1180,698,150,['Refund payment'],'service',{parent:'fin'});
event('declined',1300,782,'intermediate','error',{parent:'fin',boundary:'refund'});
text('Payment declined',1286,836,{size:TYPE.secondary,anchor:'end',color:C.secondary});
gateway('merged',1440,740,'xor','fin');
task('manual',1365,812,150,['Refund','manually'],'user',{parent:'fin'});

const SC={scope:'store'};
connect('s01','req','check',[[168,200],[215,200]],SC);
connect('s02','check','eligible',[[365,200],[406,200]],SC);
connect('s03','eligible','labelSent',[[454,200],[502,200]],SC);
text('Yes',474,190,{size:TYPE.secondary});
connect('s04','eligible','reject',[[430,224],[430,262]],{...SC,defaultFlow:true});
text('No',446,250,{size:TYPE.secondary,anchor:'start'});
connect('s05','reject','rejected',[[505,304],[542,304]],SC);
connect('s06','labelSent','receive',[[538,200],[675,200],[675,470],[700,470]],SC);
connect('s07','receive','inspect',[[850,470],[900,470]],SC);
connect('s08','expiry','close',[[740,528],[740,592],[790,592]],SC);
connect('s09','close','expired',[[930,592],[972,592]],SC);
connect('s10','inspect','fork',[[1050,470],[1126,470]],SC);
connect('s11','fork','restock',[[1174,470],[1220,470]],SC);
connect('s12','restock','join',[[1360,470],[1416,470]],SC);
connect('s13','join','done',[[1464,470],[1502,470]],SC);
connect('s14','fork','refund',[[1150,494],[1150,740],[1180,740]],SC);
connect('s15','refund','merged',[[1330,740],[1416,740]],SC);
connect('s16','declined','manual',[[1300,798],[1300,854],[1365,854]],SC);
connect('s17','manual','merged',[[1440,812],[1440,764]],SC);
connect('s18','merged','join',[[1440,716],[1440,494]],SC);

// ---------- Verification (identical to the collaboration generator). ----------
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
title: "Customer return and refund"
pool "Online store" {
  lane "Customer service" {
    req: start message "Return request received"
    check: task user "Check return eligibility"
    eligible: gateway xor "Eligible?"
    labelSent: intermediate message "Label e-mailed"
    reject: task send "Send rejection notice"
    rejected: end "Return rejected"
  }
  lane "Warehouse" {
    receive: task receive "Receive returned parcel"
    expiry: intermediate timer "14 days"
    close: task send "Send expiry notice"
    expired: end "Return expired"
    inspect: task user "Inspect returned item"
    fork: gateway and ""
    restock: task service "Restock item"
    join: gateway and ""
    done: end "Return completed"
  }
  lane "Finance" {
    refund: task service "Refund payment"
    declined: gateway xor "Payment declined?"
    manual: task user "Refund manually"
    merged: gateway xor ""
  }
}
flows
req --> check --> eligible
eligible --? "Yes" --> labelSent --> receive
eligible --* "No" --> reject --> rejected
receive --> inspect --> fork
# Approximation only: the 14-day boundary timer becomes a free-standing branch.
receive --> expiry --> close --> expired
fork --> restock --> join
fork --> refund --> declined
# Approximation only: the error boundary becomes an exclusive gateway.
declined --* "No" --> merged
declined --? "Yes" --> manual --> merged
merged --> join
join --> done
`;
const notes=`# BPMN exemplar — customer return and refund (single pool)

**Scenario.** An online store handles one customer return request. Customer service checks
eligibility; an ineligible request gets a rejection notice. An eligible request gets a return
label by e-mail, and the warehouse waits for the parcel. If no parcel arrives within 14 days the
interrupting timer cancels the wait, the customer is told the return has expired, and the case
ends. A received parcel is inspected, then restocking and the refund run in parallel. If the
payment provider declines the automatic refund, the interrupting error boundary cancels that
task and Finance refunds by hand. An exclusive merge brings the automatic and manual refund
paths back together, so the parallel join always receives exactly one token from each branch.
The whole process belongs to one participant, so the diagram is one pool divided into three
lanes and has no message flows; the customer is not drawn.

**Palette.** Five literal colours, identical to the collaboration exemplar. Ink \`#263238\` for all
process outlines, triggers, flows and primary labels. Secondary \`#59656B\` for boundary-event
captions and the subtitle. Rule \`#A8B1B5\` for the pool and lane divisions. Band \`#F0F3F4\` for the
pool and lane header strips. Paper \`#FFFFFF\` for the canvas and symbol interiors. No accent hue.

**Type scale.** 26px/600 title, 16px activity labels and 16px/600 pool and lane names (rotated in
their header strips), 14px event, gateway and flow labels. Multiline baselines are 20px apart.
One stack: Inter, Helvetica Neue, Helvetica, Arial, sans-serif. Text ink boxes are measured with
resvg using its explicit Helvetica Neue / Helvetica / Arial font files, then padded by 2px.

**Symbol geometry.** Same as the collaboration exemplar: activities 84px high with 10px corner
radii, events 36px in diameter, boundary events 32px, 48px gateway diamonds; outlines 1.6px,
flows 1.5px, icon details 1.2px, frame rules 1px, end rings 3.2px. Task-type markers (User,
Service, Send, Receive) sit in the upper-left marker slot. The timer boundary sits on the bottom
edge of Receive returned parcel and the error boundary on the bottom edge of Refund payment; both
are interrupting, so their double rings are solid. The catching error bolt is hollow; the
throwing message envelope on Label e-mailed is filled. The default slash marks the No flow from
Eligible?. Return completed is a Terminate End.

**Layout and collision checks.** Each lane keeps its normal path on one baseline (200, 470 and
740px). Exceptions drop into a second row below the activity that raised them. Hand-offs between
lanes are vertical runs in dedicated channels (x = 675, 1150 and 1440), and every flow crosses a
lane divider only between elements it connects. The generator checks every text box against every
other text box, every symbol body, every frame and flow segment, every arrowhead or marker and the
canvas; checks every flow endpoint on the actual circle, diamond or straight activity edge; checks
boundary events are mounted on their activity's edge; checks body/body overlap, lane containment,
orthogonality and flow/flow contact. It refuses to write any deliverable on failure.

**Coverage.** Start (message), intermediate throw (message), interrupting boundary timer and
error, end and Terminate End; User, Service, Send and Receive tasks; exclusive gateway as split
with default flow and as merge; parallel split and join; labelled sequence flows; one pool with
three lanes. Message flows, data objects, stores, annotations and subprocesses are left to the
collaboration exemplar.

**Standard and departures.** The authority is [OMG BPMN 2.0.2, formal/13-12-09](https://www.omg.org/spec/BPMN/2.0.2/PDF):
§7.4 and §10.7 (pools and lanes; a process fully contained in one pool may omit the other
participants), §10.4.3 and Table 10.89 (boundary events: interrupting solid rings,
non-interrupting dashed), §10.4 timer and error triggers, §10.5 gateways and §8.3.13 default
flow marker. There is no intentional notation departure. Absolute pixel dimensions are house style.

**DSL losses.** The parser has no boundary events and no error trigger. The 14-day timer is kept
as a free-standing timer intermediate event after Receive returned parcel, which cannot cancel the
wait as the drawing does. The error boundary on Refund payment is approximated by an exclusive
gateway Payment declined? with a Yes branch to Refund manually. The Terminate End marker is lost.
Comments in source.sx mark both approximations.

**Verification result.** 0 collisions and 0 flow/flow contacts. The SVG was rasterised at 2× and
reviewed by eye; source.sx renders through \`render()\` without throwing.

Palette: ink #263238 · secondary #59656B · rule #A8B1B5 · band #F0F3F4 · paper #FFFFFF
`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" font-family="${FONT}">
<title>Customer return and refund — BPMN single pool</title>
<desc>One pool, Online store, divided into Customer service, Warehouse and Finance lanes. A return request is checked for eligibility; ineligible requests are rejected. Eligible requests get a return label, then the warehouse waits for the parcel with an interrupting 14-day timer that ends the case as expired. A received parcel is inspected, then restocked in parallel with the refund. An interrupting error boundary on the automatic refund routes a declined payment to a manual refund; an exclusive merge rejoins both refund paths before the parallel join and the Terminate End.</desc>
<rect width="${W}" height="${H}" fill="${C.paper}"/>
${back.join('\n')}
${bodies.join('\n')}
${wires.join('\n')}
${details.join('\n')}
${texts.map(t=>`<text x="${t.x}" y="${t.y}" font-size="${t.size}" font-weight="${t.weight}" fill="${t.color}" text-anchor="${t.anchor}"${t.rotate?` transform="rotate(-90 ${t.x} ${t.y})"`:''}>${esc(t.s)}</text>`).join('\n')}
</svg>\n`;
const png=new Resvg(svg,{font:fontOptions,fitTo:{mode:'width',value:W*2}}).render().asPng();
const dir=new URL('../../visual-eval/exemplars/bpmn/single-pool/',import.meta.url);
const pngPath=process.argv[2];
await mkdir(dir,{recursive:true});
await writeFile(new URL('ideal.svg',dir),svg);
await writeFile(new URL('source.sx',dir),source);
await writeFile(new URL('notes.md',dir),notes);
if(pngPath)await writeFile(pngPath,png);
console.log(JSON.stringify({canvas:[W,H],textBoxes:texts.length,symbols:shapes.size,connections:connections.length,collisions:0,png:pngPath??null}));
