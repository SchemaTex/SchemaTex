import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { renderResult } from '../dist/index.js';
const base=new URL('../preview/engineering-review/',import.meta.url);
const cases=JSON.parse(await readFile(new URL('after/results.json',base),'utf8'));
for(const c of cases){
 const result=renderResult(await readFile(new URL(c.id+'.sx',base),'utf8'),{type:c.type});
 assert.equal(result.svg,await readFile(new URL('after/'+c.id+'.svg',base),'utf8'),c.id);
 assert.equal(result.status,c.status);
}
console.log(`${cases.length} candidate replays match actual renderer output`);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1536,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/preview/engineering-review.html');
 await page.waitForSelector('body[data-ready=true]');
 const selected=()=>page.locator('[data-review-entity][data-selected=true]').count();
 await page.getByRole('button',{name:'Select Circuit 1',exact:true}).click();assert.equal(await selected(),4);
 await page.getByRole('button',{name:'Select Circuit 2',exact:true}).click();assert.equal(await selected(),2);
 await page.getByRole('button',{name:'floor outlet O12',exact:true}).click();assert.equal(await page.locator('[data-review-entity=O12][data-selected=true]').count(),2);
 await page.getByRole('button',{name:'sld outlet O11',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-review-entity=O11][data-selected=true]').count(),2);
 await page.getByRole('button',{name:'SLD circuit C1',exact:true}).click();assert.equal(await selected(),4);
 await page.locator('[data-visible]').uncheck();assert.equal(await page.locator('[data-view=floor] [data-review-entity].demo-hidden').count(),3);assert.equal(await selected(),4);assert(await page.locator('[data-view=floor] .sx-fp-walls').isVisible());await page.locator('[data-visible]').check();
 await page.locator('[data-view=floor] text').filter({hasText:/^1\.1$/}).evaluate(e=>e.textContent='Renamed outlet');await page.getByRole('button',{name:'floor outlet O11',exact:true}).click();assert.equal(await page.locator('[data-review-entity=O11][data-selected=true]').count(),2);
 await page.locator('#logic .panel-ideal .image-button').click();assert(await page.locator('#viewer').evaluate(d=>d.open));await page.keyboard.press('Escape');assert(await page.locator('#viewer').evaluate(d=>!d.open));
 await page.evaluate(()=>{for(const img of document.querySelectorAll('.image-button img'))img.loading='eager';});
 await page.waitForFunction(()=>[...document.querySelectorAll('.image-button img')].every(i=>i.complete&&i.naturalWidth));
 const audit=await page.evaluate(()=>({idealSecond:[...document.querySelectorAll('.comparison')].every(c=>c.children[1].classList.contains('panel-ideal')),cjk:/[\u3400-\u9fff]/.test(document.body.innerText),overflow:document.documentElement.scrollWidth>innerWidth}));assert(audit.idealSecond&&!audit.cjk&&!audit.overflow);
 await page.locator('#logic').scrollIntoViewIfNeeded();await page.screenshot({path:new URL('feedback-desktop-check.png',base).pathname});
 await page.setViewportSize({width:390,height:844});await page.locator('.linked-demo').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:new URL('feedback-mobile-check.png',base).pathname});
 const stale=await browser.newPage();await stale.route('**/linked-host-bindings.json',async route=>{const response=await route.fetch();const body=await response.json();body.sourceHash='stale';await route.fulfill({response,json:body});});await stale.goto('http://127.0.0.1:5173/preview/engineering-review.html');await stale.waitForSelector('#cases .error');assert((await stale.locator('#cases .error').textContent()).includes('stale'));
 assert.equal(errors.length,0);
 console.log(JSON.stringify({circuitSelection:true,eitherViewSelection:true,keyboard:true,labelIndependent:true,layerHidingPreservesIdentity:true,staleBindingRejected:true,dialog:true,audit,mobileOverflow:false,errors},null,2));
}finally{await browser.close();}
