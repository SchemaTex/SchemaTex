import { expect, it } from 'vitest';
import { routeNetworkLink } from '../../src/diagrams/network/routing';
import type { DeviceBox } from '../../src/diagrams/network/types';
const box = (id: string, x: number, y: number): DeviceBox => ({device:{id,kind:'switch',groups:[]},x,y,w:64,h:48,cx:x+32,cy:y+24,band:0});
it('uses a direct diagonal when the channel is unobstructed', () => {
 const a=box('upstream',0,0),b=box('downstream',180,160);
 expect(routeNetworkLink(a,b,[],[])).toHaveLength(2);
});
it('routes around a device in the diagonal channel', () => {
 const a=box('upstream',0,0),b=box('downstream',180,160);
 const route=routeNetworkLink(a,b,[{left:100,right:140,top:80,bottom:130}],[]);
 expect(route.length).toBeGreaterThan(2);
});
it('can leave a caption with a short terminal lead and then use a diagonal',()=>{
 const a=box('upstream',0,0),b=box('downstream',180,160);
 const route=routeNetworkLink(a,b,[{left:-20,right:84,top:49,bottom:70}],[]);
 expect(route.some((p,i)=>i&&p.x!==route[i-1].x&&p.y!==route[i-1].y)).toBe(true);
});
