const root = './engineering-review/';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const issue = n => `<a href="https://github.com/SchemaTex/SchemaTex/issues/${n}" target="_blank" rel="noopener">Issue #${n}</a>`;
const reviewedReferences = { 'ideal-logic.png':'target-logic-native.svg', 'ideal-opamp.png':'ideal-opamp-v3.png', 'ideal-pid.png':'target-pid-native.svg', 'ideal-breadboard.png':'target-breadboard-native.svg' };
const image = (file, label) => { file=reviewedReferences[file]??file; return `<button class="image-button" data-image="${root}${file}" data-label="${escape(label)}" aria-label="Enlarge ${escape(label)}"><img src="${root}${file}" alt="${escape(label)}" loading="lazy"></button>`; };
const studies = [
  {id:'logic',title:'A full adder that looks electrically ambiguous',tag:'Reproduced visual defect',source:'Published full-adder example, cited by the reporter',links:[93,92,94],current:'logic',ideal:'logic',
    problem:'The five gates and their connections exist, but wires run through transparent gate bodies. A reader cannot confidently distinguish a crossing from a connection.',
    before:'Unmodified published example. Notice the lines inside both AND bodies and the route through the first XOR. The engine returns valid with no diagnostics.',
    target:'All five gates are visibly wired together. Branch dots mean connected; a small wire hop means crossing only. The existing ANSI symbol geometry is reused.',
    audit:'Revised after feedback: named-net links are valid schematic notation, but hiding wires cannot demonstrate better routing. This is an authored SVG target, not the output of an improved automatic router.',
    system:'Separate electrical nets from drawn paths',steps:['Gate symbol supplies its outline, port positions and opaque interior.','Routing sees expanded symbol and label bounds as obstacles.','Junction dots derive from a shared net, never merely from intersecting coordinates.'],
    test:'All 8 input combinations must match a full-adder truth table; routing and rendering must preserve the five gates and all authored nets.',
    contract:'s1 = XOR(A, B)\nSum = XOR(s1, Cin)\nc1 = AND(A, B)\nc2 = AND(s1, Cin)\nCout = OR(c1, c2)'},
  {id:'opamp',title:'The LM741 feedback was never connected',tag:'Original production DSL',source:'ChatDiagram artifact · 03 Aug 2026 PT · anonymized',links:[95],current:'user-opamp',ideal:'opamp',
    problem:'A real user artifact asks for a non-inverting amplifier. Its feedback resistor terminates on an isolated net, and its five positional op-amp nets exceed the current three-pin contract. Layout cannot infer the intended correction safely.',
    before:'Exact production DSL. Current replay is partial and reports a floating feedback net. Extra positional tokens do not become the intended power pins; some appear as text.',
    target:'Proposed interpretation: input → plus; output → R1 → minus; minus → R2 → ground. Supply pins are explicit. This changes the broken source intent and is not a same-input “after”.',
    audit:'ImageGen review: the first draft attached feedback to the plus input. The revision corrects that route; the written connectivity remains the acceptance contract.',
    system:'Resolve the pin contract before layout',steps:['Declare exact named pins and supported powered variants from the live symbol catalog.','Reject surplus positional nets instead of treating them as a label.','Return the floating net to the author or a bounded repair step; never silently invent a connection.'],
    test:'A malformed five-pin invocation must fail clearly. The corrected fixture must expose supply pins and one output-to-minus feedback path.',
    contract:'Proposed connection intent — not current DSL\nU1.plus ← input\nU1.minus ↔ R1 ↔ output\nU1.minus ↔ R2 ↔ GND\nU1.V+ ↔ +15V\nU1.V− ↔ −15V'},
  {id:'pid',title:'A filter skid needs ownership and distinct services',tag:'Missing semantic capability',source:'Existing water-treatment reproduction of issue #113; follow-ups #116 / #117',links:[116,117],current:'pid',ideal:'pid',
    problem:'The current engine draws pumps, dedicated filter ports and a motor actuator. It cannot yet express which equipment belongs to a supplied skid, or apply a reusable service-to-style mapping.',
    before:'Actual 1.0.14 output from the existing water-treatment fixture. Pump families, filter service ports and the motor actuator are already supported. The missing frame is a capability gap, not a layout regression.',
    target:'The exact shipped pump, filter, motor actuator and instrument symbols are reused. The frame includes F-101, XV-101 and FIC-101. All process services are fully connected to existing ports; service text remains readable without color.',
    audit:'No icon-library redesign is proposed. This authored SVG changes composition, scope and service presentation only. Automatic frame spacing and service theming remain unimplemented; it is not a standards certification.',
    system:'Membership owns the frame',steps:['Package membership uses authored equipment/instrument IDs.','Layout reserves padding and title space; frame renders behind members.','Process type remains process. Service styling is a drawing-level presentation rule with a derived legend.'],
    test:'Add a pump outside the skid, reorder declarations and rename all IDs: members stay inside; crossing pipes remain connected; service labels remain readable.',
    contract:'Proposed semantic shape — not current DSL\npackage FILTER_SKID\n  members: F-101, XV-101, FIC-101\n\nchemical → F-101.top\nbackwash → F-101.backwash\ndrain ← F-101.drain'},
  {id:'linked',title:'Outlet 1.2 should be one object in two views',tag:'Feature request reconstruction',source:'Reporter describes shared selection, not just a combined image',links:[99,98],current:'floorplan',ideal:'linked',
    problem:'An electrician wants to select Circuit 1 and see its outlets highlighted in both a floorplan and an SLD. Today the two renderers can show matching labels, but labels alone do not establish shared identity.',
    before:'Two actual renderer outputs, composed by this review page. This is a minimal reproduction of the requested workflow, not the reporter’s house. No linked-selection feature is active.',
    target:'Selecting Circuit 1 finds the same two outlet entities in both views. Layers control electrical symbols, control lines and labels without hiding the building geometry.',
    audit:'ImageGen review: selection and labels communicate the target interaction. Outlet artwork is illustrative, not an approved IEC symbol reference.',
    system:'Small host mapping, independent renderers',steps:['Reuse authored outlet IDs and a small circuit-membership map in the host.','Expose existing IDs consistently in SVG/scene before adding new public model syntax.','Keep selection in the host. The working experiment below uses current SVGs; persisted edit reconciliation is not implemented.'],
    test:'Rename a display label: cross-view selection must still work. Remove an entity reference: return a diagnostic, never join unrelated equal labels.',
    contract:'Proposed data contract — not current DSL\nentity outlet-12\n  circuit: circuit-1\n\nscene floorplan/O12 → outlet-12\nscene sld/O12 → outlet-12\nlayer: electrical-fixtures'},
  {id:'breadboard',title:'The chip marker and physical pin model disagree',tag:'Code + visual reproduction',source:'UserSay · 20–24 Aug 2026 PT · TL072 on rows e/f, starting at column 15',links:[],current:'breadboard',ideal:'breadboard',
    problem:'The user reported that pin 8 should be on 15e, with pin 1 on 15f when the notch faces left. A small reconstruction reproduces the structural mismatch: the pin-1 marker is below, while resolved pin 1 is above.',
    before:'Reconstructed DIP-8 fixture using canonical pins=8. Red wire comes from resolved pin 8 at row g; yellow wire comes from pin 1 at row e. The icon marker sits below. The engine nevertheless returns valid.',
    target:'Neutral solderless-board surface, dark sockets, gray metal leads and a high-contrast IC. The notch-left DIP uses counterclockwise numbering: pin 1 → 15f and pin 8 → 15e. The central opposing rows are three 0.1-inch pitches apart.',
    audit:'Research correction: the earlier target incorrectly used a two-pitch e/f gap. This revised authored target uses a 0.3-inch gap. Fritzing is a drawing convention, not a mandatory IEC aesthetic standard.',
    system:'A footprint is physical data',steps:['Use one orientation transform for body, pin marker and every endpoint.','Generate the pin-to-hole table from resolved coordinates, not model-written prose.','Represent terminal strips and split rail segments as contact groups; explicit jumpers connect them.'],
    test:'For this notch-left view: 1→15f, 2→16f, 3→17f, 4→18f, 5→18e, 6→17e, 7→16e, 8→15e. Opposite orientation must transform all eight consistently.',
    contract:'Measured current implementation\ne → f spacing = 2 × pitch\nDIP pin-row spacing = 3 × pitch\n\nRequired\nfootprint pins match resolved holes\nbody marker matches pin 1'}
];
const referenceMeta = id => ['logic','pid','breadboard'].includes(id)
 ? 'Authored SVG target · existing symbols/style · NOT automatic engine output'
 : 'ImageGen PNG · visual intent · NOT renderer output';
const replays=[
  ['pullup','Pull-up + push button','Published example · issue #94','Inspect the switch and capacitor labels at their final display size. Existing label scoring is already present; this replay prevents reintroducing overlap.'],
  ['transistor','Common-emitter amplifier','Published example · issue #92','Use this as a small routing baseline before testing feedback loops and larger transistor networks. A corner-shape change alone cannot establish correct connectivity.'],
  ['opamp-example','Published inverting op-amp','Published example · issue #95','The body is opaque now, but the published source contains separate power sources without a powered op-amp pin contract. Gate-body fill and component semantics are separate checks.'],
  ['sld','Residential consumer unit','Published example · issue #96','Replay the exact seven-feeder example, including the EV branch. Retain it as a regression fixture; a valid status is not proof that every shared path is visually unambiguous.'],
  ['user-555','555 bin-full sensor / relay','Original production DSL · 03 Aug 2026 PT','Unknown ic555 becomes a generic box; multiple nets remain floating. A corrected 555 demo elsewhere does not fix this saved user source. Canonical parts and precise pin contracts are necessary.'],
  ['user-hc32','TC74HC32AP breadboard','Original production DSL · 30 Jun 2026 PT','Only the Japanese title was translated. “dip 14” does not set pins=14, leaving the default 8-pin footprint. pin14 then fails. Fix the catalog/grammar contract; do not just add a pin alias.'],
  ['arduino','Arduino Uno blink example','Published breadboard example','Physical connectivity needs independent validation: the LED anode at 10e does not share a terminal strip with the resistor endpoint at 9e. This cannot be detected by endpoint-name validation alone.']
];
async function main(){
 const response=await fetch(root+'results.json');if(!response.ok)throw Error('Replay manifest failed to load');const results=await response.json();const byId=Object.fromEntries(results.map(x=>[x.id,x]));
 const afterResponse=await fetch(root+'after/results.json');if(!afterResponse.ok)throw Error('Candidate renders missing');const after=Object.fromEntries((await afterResponse.json()).map(x=>[x.id,x]));
 const status=id=>`<span class="status ${byId[id].status}">${byId[id].status}</span>`;
 const sourceDetails=id=>`<details><summary>Actual DSL and renderer diagnostics ${status(id)}</summary><pre class="dsl" data-source="${id}">Loading source…</pre><pre>${escape(JSON.stringify(byId[id].diagnostics,null,2))}</pre><a href="${root}${id}.svg" target="_blank">Open actual SVG</a> · <a href="${root}${id}.sx" target="_blank">Open source</a></details>`;
 document.querySelector('#cases').innerHTML=studies.map(c=>`<section class="case" id="${c.id}"><div class="case-heading"><div><p class="eyebrow">${c.id==='linked'?'Floorplan + SLD':c.id.toUpperCase()}</p><h2>${c.title}</h2><p>${c.problem}</p></div><span class="badge">${c.tag}</span></div><div class="evidence"><span>${c.source}</span>${c.links.map(issue).join(' ')}</div><div class="comparison"><article class="panel panel-current"><div class="panel-head"><span class="panel-label">Current engine ${status(c.current)}</span><small>SVG renderer · v${byId[c.current].version} · ${byId[c.current].commit}</small></div>${c.id==='linked'?`<div class="dual-images">${image('floorplan.svg','Current floorplan — v1.0.14')}${image('linked-sld.svg','Current SLD — v1.0.14')}</div>`:image(c.current+'.svg',c.title+' — current v1.0.14')}<div class="panel-caption"><p>${c.before}</p></div></article><article class="panel panel-ideal"><div class="panel-head"><span class="panel-label">Ideal reference</span><small>${referenceMeta(c.id)}</small></div>${image('ideal-'+c.ideal+'.png',c.title+' — ideal design reference')}<div class="panel-caption"><p>${c.target}</p><p class="audit-note">${c.audit}</p></div></article><article class="panel panel-system"><div class="panel-head"><span class="panel-label">Proposed system change</span><small>NOT IMPLEMENTED · no fixed-engine after yet</small></div><div class="system-copy"><h3>${c.system}</h3><ul>${c.steps.map(s=>`<li>${s}</li>`).join('')}</ul><pre>${escape(c.contract)}</pre><p class="test-target">${c.test}</p></div></article></div>${sourceDetails(c.current)}${c.id==='linked'?sourceDetails('linked-sld'):''}</section>`).join('');
 document.querySelector('#replay-grid').innerHTML=replays.map(([id,title,source,note])=>`<article class="replay">${image(id+'.svg',title+' — current renderer output')}<div class="replay-copy"><h3>${title}</h3><p class="meta">${source} ${status(id)}</p><p>${note}</p>${sourceDetails(id)}</div></article>`).join('');
 await Promise.all([...document.querySelectorAll('[data-source]')].map(async el=>{const r=await fetch(root+el.dataset.source+'.sx');if(!r.ok)throw Error('Source failed to load');el.textContent=await r.text();}));
 const outcomes={
  logic:'Improved: gate rows leave room for branches, Sum/Cout align with their drivers, and obstacle-aware paths preserve all five gates and twelve connections. Dots mean a shared signal; crossing clearance is not a junction. This is automatic layout, not a full-adder template.',
  opamp:'INPUT STILL NEEDS CORRECTION. Surplus pin tokens now produce a clear pin-count diagnostic instead of becoming text. The floating feedback net remains reported. Supply marks and general routing are improved; the engine has not invented a repair. The separately corrected source is shown below.',
  pid:'Routing improved: backwash avoids the dosing pump, port exits follow actual symbol geometry, tank captions wrap, and the filter label leaves the drain exit clear. Package membership and service styling remain UNIMPLEMENTED; this is not the complete middle reference.',
  linked:'Implemented: electrical labels sit outside glyphs; authored fixture IDs are exposed in SVG and scene. The US duplex glyph now uses two strokes. Cross-view selection below is host code, not a new shared-model engine API.',
  breadboard:'Implemented: neutral board styling, a three-pitch e/f gap, counterclockwise DIP numbering and footprint-derived leads. Automatic jumpers now avoid side-board pin legends; component labels use collision scoring. Terminal-strip/rail connectivity validation is not yet implemented.'
 };
 for(const c of studies){
   const section=document.getElementById(c.id),panel=section.querySelector('.panel-system');
   const proposal=document.createElement('details');proposal.innerHTML=`<summary>Architecture direction and remaining acceptance checks</summary>${panel.querySelector('.system-copy').outerHTML}`;section.append(proposal);
   const result=after[c.current];
   section.querySelector('.panel-current .panel-label').innerHTML=`Before engine ${status(c.current)}`;
   panel.innerHTML=`<div class="panel-head"><span class="panel-label">After engine · ${escape(result.status)}</span><small>Actual SVG · v${result.version} candidate · ${escape(result.commit)}</small></div>${c.id==='linked'?`<div class="dual-images">${image('after/floorplan.svg','After floorplan — actual candidate SVG')}${image('after/linked-sld.svg','Unchanged SLD — actual candidate SVG')}</div>`:image('after/'+c.current+'.svg',c.title+' — actual candidate output')}<div class="panel-caption"><p>${outcomes[c.id]}</p><a href="${root}after/${c.current}.svg" target="_blank">Open candidate SVG</a></div>`;
 }
 const corrected=document.createElement('section');corrected.className='corrected-source';
 corrected.innerHTML=`<h3>Corrected intent — separate input, real engine output</h3><p>This is not the same-input After above. R1 now joins output to the feedback node; U1 explicitly binds plus, minus, output and both supplies. No components were removed. Supply flags sharing a name refer to the same net.</p>${image('after/opamp-corrected.svg','LM741 — actual renderer output from explicitly corrected input')}<details><summary>See the exact input changes</summary><pre>R1 feedback inv 10k → R1 output inv 10k\nU1 inv input VCC VEE output type=opamp\n→ U1 input inv output VCC VEE type=opamp pins="plus,minus,out,supply+,supply-"</pre><a href="${root}opamp-corrected.sx">Corrected DSL</a> · <a href="${root}after/opamp-corrected.svg">Actual SVG</a></details>`;
 document.querySelector('#opamp').append(corrected);
 for(const c of studies){
   const panel=document.querySelector(`#${c.id} .panel-system`);
   panel.querySelector('.panel-label').textContent=`After engine · render status: ${after[c.current].status}`;
   if(after[c.current].diagnostics.length)panel.querySelector('.panel-caption').insertAdjacentHTML('beforeend',`<details><summary>Candidate diagnostics</summary><pre>${escape(JSON.stringify(after[c.current].diagnostics,null,2))}</pre></details>`);
 }
 // Additional replays are candidate output too; the immutable original remains
 // linked in each source disclosure, never regenerated from current code.
 for(const [i,[id]] of replays.entries()){
   const card=document.querySelectorAll('.replay')[i],button=card.querySelector('[data-image]');
   button.dataset.image=root+'after/'+id+'.svg';button.querySelector('img').src=button.dataset.image;
   button.dataset.label+=' — candidate';
   card.querySelector('.meta').insertAdjacentHTML('beforeend',` · Candidate: ${escape(after[id].status)}`);
 }
 const { mountLinkedDemo } = await import('./linked-demo.js');
 await mountLinkedDemo(document.querySelector('#linked'));
 const mapping=await (await fetch(root+'after/breadboard-mapping.json')).json();
 document.querySelector('#breadboard .panel-system .panel-caption').insertAdjacentHTML('beforeend',`<table><caption>Actual candidate mapping · resolved pins matched to real holes</caption><thead><tr><th>Pin</th><th>Hole</th></tr></thead><tbody>${mapping.map(p=>`<tr><td>${p.pin}</td><td>${escape(p.hole)}</td></tr>`).join('')}</tbody></table>`);
 await Promise.all([...document.querySelectorAll('.comparison')].map(async comparison=>{
   // Floorplan+SLD are different physical units, not a common-scale comparison.
   if(comparison.querySelector('.dual-images'))return;
   const images=[...comparison.querySelectorAll('img')].filter(img=>img.src.endsWith('.svg'));
   const dimensions=await Promise.all(images.map(async img=>{
     const svg=new DOMParser().parseFromString(await (await fetch(img.src)).text(),'image/svg+xml').documentElement;
     const view=(svg.getAttribute('viewBox')??'').split(/[ ,]+/).map(Number);
     return {img,width:view[2]||Number(svg.getAttribute('width')),height:view[3]||Number(svg.getAttribute('height'))};
   }));
   const resize=()=>{
     const scale=Math.min(...dimensions.map(({img,width,height})=>Math.min((img.parentElement.clientWidth-24)/width,(img.parentElement.clientHeight-48)/height)));
     for(const {img,width,height} of dimensions){img.style.width=`${width*scale}px`;img.style.height=`${height*scale}px`;}
   };
   new ResizeObserver(resize).observe(comparison);resize();
 }));
 document.body.dataset.ready='true';
 if(location.hash)document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}
main().catch(error=>{document.querySelector('#cases').innerHTML=`<p class="error">${escape(error.message)}. Run the review generator and reload.</p>`;console.error(error);});
const viewer=document.querySelector('#viewer');
document.addEventListener('click',event=>{const trigger=event.target.closest('[data-image]');if(!trigger)return;document.querySelector('#viewer-label').textContent=trigger.dataset.label;const img=document.querySelector('#viewer-image');img.src=trigger.dataset.image;img.alt=trigger.dataset.label;viewer.showModal();});
document.querySelector('#close-viewer').addEventListener('click',()=>viewer.close());
