import {expect,it} from 'vitest';
import {segmentEntersBox} from '../../src/diagrams/network/routing';
import {parseNetwork} from '../../src/diagrams/network/parser';
import {layoutNetwork} from '../../src/diagrams/network/layout';
it('separates sibling sites including captions across several ranks',()=>{
 const l=layoutNetwork(parseNetwork(`network
 direction: lr
 internet wan
 site a "Site A" {
 router a1
 switch a2
 pc a3
 }
 site b "Site B" {
 router b1
 switch b2
 pc b3
 printer b4
 }
 wan -- a1
 wan -- b1
 a1 -- a2
 a2 -- a3
 b1 -- b2
 b2 -- b3
 b2 -- b4`));
 const [a,b]=l.groups;expect(a.y+a.h<=b.y||b.y+b.h<=a.y||a.x+a.w<=b.x||b.x+b.w<=a.x).toBe(true);
});
it('gives every spine-leaf attachment its own measured space',()=>{
 const l=layoutNetwork(parseNetwork(`network
 layout: spine-leaf
 spines: x y
 leaves: a b
 switch manage "Management switch"
 server one "Server one"
 server two "Server two"
 router gateway
 a -- one
 a -- two
 manage -- a
 manage -- b
 manage -- x
 manage -- y
 manage -- gateway`));
 for(const a of l.devices)for(const b of l.devices)if(a!==b)
 expect(Math.abs(a.cx-b.cx)>(a.w+b.w)/2+6||Math.abs(a.cy-b.cy)>(a.h+b.h)/2+30).toBe(true);
});
it('places only the cycle on the ring, with leaf devices outside it',()=>{
 const l=layoutNetwork(parseNetwork(`network
 layout: ring
 switch a
 switch b
 switch c
 switch d
 pc leaf
 a -- b
 b -- c
 c -- d
 d -- a
 a -- leaf`));
 const ring=l.devices.filter(d=>d.device.id!=='leaf'),cx=ring.reduce((s,d)=>s+d.cx,0)/4,cy=ring.reduce((s,d)=>s+d.cy,0)/4;
 const leaf=l.devices.find(d=>d.device.id==='leaf')!;
 expect(Math.hypot(leaf.cx-cx,leaf.cy-cy)).toBeGreaterThan(Math.hypot(ring[0].cx-cx,ring[0].cy-cy)+30);
});

it.each(['tb','lr'])('routes an unseen fan-out without entering unrelated devices (%s)', direction=>{
 const source=`network\ndirection: ${direction}\nrouter uplink\nswitch branch\n${Array.from({length:6},(_,i)=>`pc terminal${i} "Workspace ${i}"`).join('\n')}\nuplink -- branch\n${Array.from({length:6},(_,i)=>`branch -- terminal${i} : access vlan: ${70+i} 1G`).join('\n')}`;
 const l=layoutNetwork(parseNetwork(source));
 expect(l.links).toHaveLength(7);expect(l.devices).toHaveLength(8);
 for(const edge of l.links)for(let i=1;i<edge.points.length;i++){
 const a=edge.points[i-1],b=edge.points[i];
 for(const d of l.devices.filter(d=>d.device.id!==edge.link.from&&d.device.id!==edge.link.to)){
 const hit=segmentEntersBox(a,b,{left:d.x,right:d.x+d.w,top:d.y,bottom:d.y+d.h});
 expect(hit).toBe(false);
 }}
});
it('represents a cross-site VLAN at each member without enclosing other devices',()=>{
 const l=layoutNetwork(parseNetwork(`network
 site north {
 router a
 pc b
 }
 site south {
 router c
 pc d
 }
 vlan shared "Research" {
 b
 d
 }
 a -- b
 c -- d
 a -- c : vpn`));
 const badges=l.groups.filter(g=>g.group.kind==='vlan');
 expect(badges).toHaveLength(2);
 expect(badges.every(g=>g.group.members.length===1)).toBe(true);
 expect(new Set(badges.flatMap(g=>g.group.members))).toEqual(new Set(['b','d']));
});

it('aligns independent access devices with their single downstream endpoints',()=>{
 const l=layoutNetwork(parseNetwork(`network
 router r tier: core
 switch a "Long branch name alpha" tier: access
 switch b "Long branch name beta" tier: access
 pc c
 pc d
 r -- a
 r -- b
 a -- c
 b -- d`));
 const x=(id:string)=>l.devices.find(d=>d.device.id===id)!.cx;
 expect(x('a')).toBeCloseTo(x('c'));expect(x('b')).toBeCloseTo(x('d'));
});
it.each(['tb','lr'])('preserves cross-tier and dual-homed links within the canvas (%s)',direction=>{
 const l=layoutNetwork(parseNetwork(`network
 layout: spine-leaf
 direction: ${direction}
 spines: p q
 leaves: x y z
 switch aux "Cross-tier appliance"
 server host "Dual-homed workload"
 aux -- p
 aux -- q
 aux -- x
 aux -- y
 aux -- z
 x -- host
 y -- host`));
 expect(l.links).toHaveLength(13);
 const b=(id:string)=>l.devices.find(d=>d.device.id===id)!;
 const along=(id:string)=>direction==='lr'?b(id).cx:b(id).cy;
 expect(along('host')).toBeGreaterThan(along('x'));
 for(const edge of l.links){
  for(const p of edge.points){expect(p.x).toBeGreaterThanOrEqual(0);expect(p.y).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThanOrEqual(l.width);expect(p.y).toBeLessThanOrEqual(l.height);}
 }
});

it.each([5,7,9])('does not let existing links seal a high-degree device (%i leaves)',n=>{
 const l=layoutNetwork(parseNetwork(['network','layout: spine-leaf','direction: lr','spines: s0 s1 s2',
  `leaves: ${Array.from({length:n},(_,i)=>`l${i}`).join(' ')}`,
  'switch auxiliary "Service switch"',
  ...Array.from({length:3},(_,i)=>`switch s${i} "Backbone ${i}"\nauxiliary -- s${i}`),
  ...Array.from({length:n},(_,i)=>`switch l${i} "Access ${i}"\nserver h${i} "Workload ${i}"\nl${i} -- h${i}\nauxiliary -- l${i}`),
  'server multi "Dual homed workload"','l0 -- multi','l1 -- multi'].join('\n')));
 expect(l.links).toHaveLength(5*n+5);
});
