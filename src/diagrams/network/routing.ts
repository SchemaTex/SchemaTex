import { compactRoute, intersectsBox, orthogonalRoute, type RouteBox, type RoutedNet } from '../logic/orthogonal-router';
import type { DeviceBox, NetPoint } from './types';

/** Open segment/rectangle intersection; unlike the orthogonal router, accepts diagonals. */
export function segmentEntersBox(a: NetPoint, b: NetPoint, box: RouteBox): boolean {
  let lo=0, hi=1;
  for(const [start,delta,min,max] of [[a.x,b.x-a.x,box.left,box.right],[a.y,b.y-a.y,box.top,box.bottom]]) {
    if(Math.abs(delta)<1e-9) { if(start<=min||start>=max)return false; }
    else { const u=(min-start)/delta,v=(max-start)/delta;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v)); }
  }
  return hi-lo>1e-9;
}

export function edgePoint(box: DeviceBox, target: NetPoint): NetPoint {
  const dx=target.x-box.cx,dy=target.y-box.cy;
  const scale=Math.min(dx ? box.w/2/Math.abs(dx) : Infinity,dy ? box.h/2/Math.abs(dy) : Infinity);
  return Number.isFinite(scale) ? {x:box.cx+dx*scale,y:box.cy+dy*scale} : {x:box.cx,y:box.cy};
}

/** Route with measured device/caption obstacles and explicit terminal escapes. */
export function routeNetworkLink(a: DeviceBox, b: DeviceBox, obstacles: RouteBox[], previous: RoutedNet[]): NetPoint[] {
  const direct=[edgePoint(a,{x:b.cx,y:b.cy}),edgePoint(b,{x:a.cx,y:a.cy})];
  if(!obstacles.some(o=>segmentEntersBox(direct[0],direct[1],o)))return direct;
  const ports = (box: DeviceBox) => [
    {p:{x:box.cx,y:box.y}, dx:0,dy:-1},
    {p:{x:box.x+box.w,y:box.cy},dx:1,dy:0},
    {p:{x:box.cx,y:box.y+box.h},dx:0,dy:1},
    {p:{x:box.x,y:box.cy},dx:-1,dy:0},
  ].map(port=>({...port,escape:{x:port.p.x+port.dx*16,y:port.p.y+port.dy*16}}))
    .filter(port=>!obstacles.some(o=>intersectsBox(port.p,port.escape,o)));
  const pairs=ports(a).flatMap(source=>ports(b).map(target=>({source,target,
    cost:Math.hypot(source.escape.x-target.escape.x,source.escape.y-target.escape.y)}))).sort((a,b)=>a.cost-b.cost);
  let best:NetPoint[]|undefined,bestCost=Infinity;
  for(const {source,target,cost} of pairs) {
    if(best && cost>bestCost)continue;
    let middle: NetPoint[];
    try {
      middle=obstacles.some(o=>segmentEntersBox(source.escape,target.escape,o))
        ? orthogonalRoute(source.escape,target.escape,obstacles)
        : [source.escape,target.escape];
    }
    catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("No obstacle-free orthogonal route")) throw error;
      continue; // This port pair is blocked; evaluate the remaining terminal sides.
    }
    const path=compactRoute([source.p,...middle,target.p]);
    // Network links can fan out from a shared device. Other wires are a soft
    // readability cost, never impassable barriers as distinct circuit nets are.
    let wireCost=0;
    for(let i=1;i<path.length;i++)for(const route of previous)for(let j=1;j<route.points.length;j++) {
      const p=path[i-1],q=path[i],r=route.points[j-1],s=route.points[j];
      if((p.x!==q.x&&p.y!==q.y)||(r.x!==s.x&&r.y!==s.y))continue;
      const vertical=p.x===q.x,otherVertical=r.x===s.x;
      if(vertical===otherVertical) {
        const separation=vertical?Math.abs(p.x-r.x):Math.abs(p.y-r.y);
        const overlap=vertical?Math.min(Math.max(p.y,q.y),Math.max(r.y,s.y))-Math.max(Math.min(p.y,q.y),Math.min(r.y,s.y)):
          Math.min(Math.max(p.x,q.x),Math.max(r.x,s.x))-Math.max(Math.min(p.x,q.x),Math.min(r.x,s.x));
        if(separation<8&&overlap>0)wireCost+=overlap*2;
      } else {
        const v=vertical?[p,q]:[r,s],h=vertical?[r,s]:[p,q];
        if(v[0].x>Math.min(h[0].x,h[1].x)&&v[0].x<Math.max(h[0].x,h[1].x)&&
          h[0].y>Math.min(v[0].y,v[1].y)&&h[0].y<Math.max(v[0].y,v[1].y))wireCost+=24;
      }
    }
    const score=path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-path[i].x,p.y-path[i].y),0)+(path.length-2)*28+wireCost;
    if(score<bestCost){best=path;bestCost=score;}
  }
  if(!best)throw new Error(`Network link ${a.device.id} → ${b.device.id} has no clear terminal escape`);
  return best;
}

export function pointOnRoute(points: readonly NetPoint[], fraction: number): {point:NetPoint; next:NetPoint; previous:NetPoint} {
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  let distance=lengths.reduce((a,b)=>a+b,0)*fraction;
  for(let i=0;i<lengths.length;i++){
    if(distance<=lengths[i]||i===lengths.length-1){const t=lengths[i]?distance/lengths[i]:0,a=points[i],b=points[i+1];
      return {point:{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},previous:a,next:b};}
    distance-=lengths[i];
  }
  return {point:points[0],previous:points[0],next:points[0]};
}
