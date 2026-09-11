import {expect,it} from 'vitest';
import {parseEcomap} from '../../src/diagrams/ecomap/parser';
import {layoutEcomap} from '../../src/diagrams/ecomap/layout';
import {renderEcomap} from '../../src/diagrams/ecomap/renderer';
const config={nodeSpacingX:80,nodeSpacingY:100,nodeWidth:40,nodeHeight:40};
it.each([7,11,18])('keeps radial ties clear of unrelated systems with %i systems', n=>{
 const ast=parseEcomap(`ecomap\ncenter: c\n${Array.from({length:n},(_,i)=>`s${i} [label: "Support system ${i}"]\nc ${i%3===0?'===':'---'} s${i}`).join('\n')}`);
 const l=layoutEcomap(ast,config), c=l.nodes[0];
 for(const edge of l.edges){const target=l.nodes.find(x=>x.id===edge.to)!;
 const a={x:c.x+c.width/2,y:c.y+c.height/2},b={x:target.x+target.width/2,y:target.y+target.height/2};
 for(const node of l.nodes.filter(x=>x!==c&&x!==target)){
 const x=node.x+node.width/2,y=node.y+node.height/2,dx=b.x-a.x,dy=b.y-a.y;
 const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
 expect(Math.hypot(x-a.x-t*dx,y-a.y-t*dy)).toBeGreaterThan(node.width/2+4);
 }}
});
it('puts system text inside the owned circle',()=>{
 const ast=parseEcomap('ecomap\ncenter: c\ns [label: "Community Health Clinic"]\nc --- s');const l=layoutEcomap(ast,config);
 const svg=renderEcomap(l,{fontSize:12,fontFamily:'Inter'},ast),s=l.nodes[1];
 const texts=[...svg.matchAll(/<text[^>]*x="([^"]+)"[^>]*y="([^"]+)"[^>]*class="schematex-ecomap-system-label"/g)];
 expect(texts.length).toBeGreaterThan(0);for(const m of texts)expect(+m[2]).toBeLessThan(s.y+s.height-6);
});

it('keeps ordinary long words whole while sizing their system circle', async()=>{
 const {systemCaption}=await import('../../src/diagrams/ecomap/labels');
 const ast=parseEcomap('ecomap\ncenter: c\ns [label: "Unemployment Benefits"]\nc --- s');
 const caption=systemCaption(ast.individuals[1]);
 expect(caption.lines).toContain('Unemployment');
});
it('distinguishes strength, cut-off and flow in the legend', async()=>{
 const {buildEcomapLegend}=await import('../../src/diagrams/ecomap/legend');
 const ast=parseEcomap('ecomap\ncenter: c\na\nb\nd\ne\nc === a\nc == b\nc -/- d\nc --> e');
 const legend=buildEcomapLegend(ast);
 expect(legend.items.find(i=>i.key==='strong')?.pattern).toBe('triple');
 expect(legend.items.find(i=>i.key==='moderate')?.pattern).toBe('double');
 expect(legend.items.find(i=>i.key==='broken')?.pattern).toBe('cutoff');
 expect(legend.items.find(i=>i.key==='energy')?.marker).toBe('arrow');
});

it.each(['female, age: 15', 'male, age: 82', 'age: 0'])('labels individual age as text for %s', properties => {
 const ast=parseEcomap(`ecomap\ncenter: person [${properties}, label: "Alex"]\nsupport\nperson --- support`);
 const svg=renderEcomap(layoutEcomap(ast,config),{fontSize:12,fontFamily:'Inter'},ast);
 expect(svg).toContain(`Age ${ast.individuals[0].age}`);
 expect(svg).not.toContain('class="schematex-ecomap-person"');
});
