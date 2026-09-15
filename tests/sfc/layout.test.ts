import { expect, it } from 'vitest';
import { parseSfc, layoutSfc } from '../../src/diagrams/sfc';

it('reserves complete action stacks in parallel branches and before subsequent steps', () => {
 const layout=layoutSfc(parseSfc(`sfc
step Start [initial]
sim from: Start: ready
  branch:
    step First
      N OpenFeed
      D HoldFeed T#12s
      N CloseFeed
    step Next
  branch:
    step Other
      N Independent
merge_to: End: done
step End`));
 const first=layout.steps.find(s=>s.step.id==='First')!;
 const next=layout.steps.find(s=>s.step.id==='Next')!;
 const other=layout.steps.find(s=>s.step.id==='Other')!;
 const actions=layout.actions.filter(a=>a.stepId==='First');
 expect(actions.length).toBe(3);
 expect(Math.max(...actions.map(a=>a.y+a.height))).toBeLessThan(next.y);
 expect(Math.max(...actions.map(a=>a.x+a.width))).toBeLessThan(other.x);
 expect(first.x).toBeLessThan(other.x);
});

// Trace conductors rather than exact path strings: a branch must not have a
// bypass, and each branch must actually reach its shared convergence.
it.each(['alt', 'sim'] as const)('preserves %s branch topology and conditional returns', kind => {
 const entry = kind === 'alt' ? '    transition: selected\n' : '';
 const exit = kind === 'alt' ? '    transition: complete\n' : '';
 const layout=layoutSfc(parseSfc(`sfc
step Begin [initial]
${kind} from: Begin:${kind === 'sim' ? ' ready' : ''}
  branch:
${entry}    step First
    step Last
${exit}  branch:
${entry}    step Short
${exit}merge_to: End${kind === 'sim' ? ': allDone' : ''}
step End
transition from: First to: Last: advance
transition from: End to: Begin: restart`));
 const step=(id:string)=>layout.steps.find(s=>s.step.id===id)!;
 type Point={x:number;y:number};
 const top=(id:string):Point=>({x:step(id).x+step(id).width/2,y:step(id).y});
 const bottom=(id:string):Point=>({...top(id),y:step(id).y+step(id).height});
 const segments=layout.wires.map(w=>{
   const values=w.path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
   return {x1:values[0],y1:values[1],x2:values[2],y2:values[3]};
 }).concat(layout.bars.map(b=>({x1:b.x1,y1:b.y,x2:b.x2,y2:b.y})));
 const contains=(s:typeof segments[number],p:Point)=>
   p.x>=Math.min(s.x1,s.x2)&&p.x<=Math.max(s.x1,s.x2)&&p.y>=Math.min(s.y1,s.y2)&&p.y<=Math.max(s.y1,s.y2);
 const connected=(from:Point,to:Point)=>{
   const seen=new Set<number>();
   const queue=segments.flatMap((s,i)=>contains(s,from)?[i]:[]);
   while(queue.length){
     const i=queue.pop()!;if(seen.has(i))continue;seen.add(i);
     const a=segments[i];if(contains(a,to))return true;
     segments.forEach((b,j)=>{
       if(Math.max(Math.min(a.x1,a.x2),Math.min(b.x1,b.x2))<=Math.min(Math.max(a.x1,a.x2),Math.max(b.x1,b.x2)) &&
          Math.max(Math.min(a.y1,a.y2),Math.min(b.y1,b.y2))<=Math.min(Math.max(a.y1,a.y2),Math.max(b.y1,b.y2)))queue.push(j);
     });
   }
   return false;
 };
 expect(connected(bottom('Begin'),top('End'))).toBe(false);
 expect(connected(bottom('First'),top('Last'))).toBe(true);
 const convergence=layout.bars.filter(b=>b.kind===`${kind}-conv`);
 const upper={x:top('End').x,y:Math.min(...convergence.map(b=>b.y))};
 const lower={x:top('End').x,y:Math.max(...convergence.map(b=>b.y))};
 expect(connected(bottom('Short'),upper)).toBe(true);
 expect(connected(bottom('Last'),upper)).toBe(true);
 expect(connected(lower,top('End'))).toBe(true);
 expect(layout.transitions.filter(t=>t.transition.condition==='advance')).toHaveLength(1);
 expect(layout.transitions.filter(t=>t.transition.condition==='restart')).toHaveLength(1);
});
