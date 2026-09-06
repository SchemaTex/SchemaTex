// Local host experiment only. Does not extend SchemaTex or write source.
export async function mountLinkedDemo(section){
 const base='./engineering-review/';
 const [manifest,floor,sld,floorSource,sldSource]=await Promise.all([
  fetch(base+'linked-host-bindings.json').then(r=>r.json()),
  fetch(base+'linked-floor-scene.svg').then(r=>r.text()),
  fetch(base+'linked-sld.svg').then(r=>r.text()),
  fetch(base+'floorplan.sx').then(r=>r.text()),fetch(base+'linked-sld.sx').then(r=>r.text())
 ]);
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(floorSource+sldSource)))].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==manifest.sourceHash)throw Error('Host-demo bindings are stale. Regenerate before using changed sources.');
 const demo=document.createElement('div');demo.className='linked-demo';
 demo.innerHTML=`<p class="eyebrow">Working host experiment · candidate floorplan + unchanged SLD</p><h3>Try selecting a circuit or either outlet.</h3><p>No combined DSL. This local host maps authored outlet IDs to occurrences in two actual SVGs. The temporary binding is source-revision checked, not a persistent public API.</p><div class="demo-controls"><button data-circuit="C1">Select Circuit 1</button><button data-circuit="C2">Select Circuit 2</button><button data-clear>Clear</button><label><input type="checkbox" data-visible checked> Show floorplan electrical overlay</label></div><p class="demo-status" role="status">Nothing selected.</p><div class="demo-views"><div data-view="floor"><h4>Floorplan · actual SVG + host highlight</h4></div><div data-view="sld"><h4>SLD · actual SVG + host highlight</h4></div></div><p class="notice">The candidate exposes floorplan instance IDs directly in SVG and scene. SLD exposes data-id. This host supplies circuit membership; persistent cross-document edit reconciliation remains outside this experiment.</p><p>Demand: issue #99 is one explicit integration request, not a measured mass-market requirement. Prioritize for a host that actually displays both documents.</p>`;
 section.append(demo);
 const views={};
 for(const [name,source] of [['floor',floor],['sld',sld]]){
  const parsed=new DOMParser().parseFromString(source,'image/svg+xml');
  if(parsed.querySelector('parsererror'))throw Error('Invalid host-demo SVG');
  views[name]=document.importNode(parsed.documentElement,true);demo.querySelector(`[data-view="${name}"]`).append(views[name]);
 }
 const targets=[];
 for(const binding of manifest.bindings)for(const name of ['floor','sld']){
  const selector=name==='floor'?`[data-instance-id="${binding.entity}"]`:`g[data-id="${binding.sldId}"]`;
  const node=views[name].querySelector(selector);if(!node)throw Error('Missing explicit outlet binding');
  node.dataset.reviewEntity=binding.entity;node.setAttribute('tabindex','0');node.setAttribute('role','button');node.setAttribute('aria-label',`${name} outlet ${binding.entity}`);node.setAttribute('aria-pressed','false');
  const b=node.getBBox(),ring=document.createElementNS('http://www.w3.org/2000/svg','rect');
  for(const [k,v]of Object.entries({x:b.x-5,y:b.y-5,width:Math.max(10,b.width)+10,height:Math.max(10,b.height)+10,rx:3,class:'demo-highlight'}))ring.setAttribute(k,String(v));
  node.append(ring);targets.push({node,binding,name});
  const choose=()=>select([binding.entity],`Outlet ${binding.entity}`);
  node.addEventListener('click',choose);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
 }
 function select(entities,label){
  for(const t of targets){const selected=entities.includes(t.binding.entity);t.node.dataset.selected=String(selected);t.node.setAttribute('aria-pressed',String(selected));}
  demo.querySelector('.demo-status').textContent=entities.length?`${label} · ${entities.length} outlet(s) · ${entities.length*2} linked occurrences. Identity is independent of displayed text.`:'Nothing selected.';
 }
 for(const id of [...new Set(manifest.bindings.map(b=>b.circuit))]){
  const node=views.sld.querySelector(`g[data-id="${id}"]`);if(!node)throw Error('Missing circuit selector');
  node.setAttribute('tabindex','0');node.setAttribute('role','button');node.setAttribute('aria-label',`SLD circuit ${id}`);
  const bounds=node.getBBox(),hit=document.createElementNS('http://www.w3.org/2000/svg','rect');
  for(const [key,value] of Object.entries({x:bounds.x-6,y:bounds.y-6,width:bounds.width+12,height:bounds.height+12,fill:'transparent','pointer-events':'all'}))hit.setAttribute(key,String(value));
  node.append(hit);
  const choose=()=>select(manifest.bindings.filter(b=>b.circuit===id).map(b=>b.entity),`Circuit ${id}`);
  node.addEventListener('click',choose);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
 }
 for(const button of demo.querySelectorAll('[data-circuit]'))button.addEventListener('click',()=>select(manifest.bindings.filter(b=>b.circuit===button.dataset.circuit).map(b=>b.entity),button.textContent.replace('Select ','')));
 demo.querySelector('[data-clear]').addEventListener('click',()=>select([],''));
 demo.querySelector('[data-visible]').addEventListener('change',event=>{
  for(const {node,binding,name} of targets.filter(t=>t.name==='floor')){
   node.classList.toggle('demo-hidden',!event.target.checked);
   views[name].querySelectorAll(`[data-sx-owner="${binding.floorKey}"]`).forEach(n=>n.classList.toggle('demo-hidden',!event.target.checked));
  }
 });
 demo.dataset.ready='true';
}
