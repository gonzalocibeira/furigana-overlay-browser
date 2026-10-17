import {test,expect,chromium,type BrowserContext,type Worker,type Page} from '@playwright/test';
import {build} from 'esbuild';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createServer,type Server} from 'node:http';

// These tests assert the desired release behavior. Failures reproduce audit findings.
let context:BrowserContext,worker:Worker,server:Server,profile:string,url:string;
test.beforeAll(async()=>{
  server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><meta charset="utf-8"><style>body{font:24px/3 system-ui;margin:60px}p{margin:0}</style><main><p id="target">日本語</p><details id="more"><summary>More</summary><p>図書館</p></details><p>学校で本を読む。</p></main>');});
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  url=`http://127.0.0.1:${(server.address() as {port:number}).port}/`;
  profile=await mkdtemp(resolve(tmpdir(),'ko-release-audit-'));
  const dist=resolve('dist');
  context=await chromium.launchPersistentContext(profile,{executablePath:process.env.CHROMIUM_PATH??'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true,args:[`--disable-extensions-except=${dist}`,`--load-extension=${dist}`],viewport:{width:1100,height:850}});
  worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
});
test.afterAll(async()=>{await context?.close();if(server)await new Promise<void>(r=>server.close(()=>r()));if(profile)await rm(profile,{recursive:true,force:true});});
async function open(panel=false) {
  await worker.evaluate(async panel=>chrome.storage.local.set({enabled:true,excluded:[],readingOverrides:{},readingView:{sites:{'127.0.0.1':panel},spacing:2.8,fontSize:20,width:420}}),panel);
  const page=await context.newPage();await page.goto(url);return page;
}
async function shadow(page:Page,tag:string,fn:string) {
  const session=await context.newCDPSession(page);
  try {
    const tree=await session.send('DOM.getDocument',{depth:-1,pierce:true});let shadowId:number|undefined;
    const visit=(n:any)=>{if(n.nodeName===tag)shadowId=n.shadowRoots?.[0]?.nodeId;for(const c of [...(n.children??[]),...(n.shadowRoots??[])])visit(c);};visit(tree.root);
    if(!shadowId)return null;
    const object=await session.send('DOM.resolveNode',{nodeId:shadowId});
    const result=await session.send('Runtime.callFunctionOn',{objectId:object.object.objectId,functionDeclaration:fn,returnByValue:true});
    if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;
  }finally{await session.detach();}
}
const reader=(page:Page,fn:string)=>shadow(page,'KO-READING-VIEW',fn);
const readings=(page:Page)=>shadow(page,'KO-OVERLAY','function(){return Array.from(this.querySelectorAll("span"),s=>s.textContent)}');
async function browse(page:Page) {
  await expect.poll(()=>reader(page,'function(){return this.querySelectorAll(".word").length}')).toBeGreaterThan(0);
  await reader(page,'function(){this.querySelector(".playgrounds-open").click()}');
}
async function checkVerb(page:Page,value:string) {
  await reader(page,`function(){const input=this.querySelector('.playground-verb-input input');input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));this.querySelector('.playground-verb-input').requestSubmit()}`);
  await expect.poll(()=>reader(page,'function(){return this.querySelector(".playground-verb-input").hasAttribute("aria-busy")}')).toBe(false);
  return reader(page,'function(){return {feedback:this.querySelector(".playground-feedback").textContent,choices:Array.from(this.querySelectorAll(".playground-confirmation button"),b=>b.textContent)}}');
}
async function attach(name:string,data:unknown){const path=test.info().outputPath(name+'.json');await writeFile(path,JSON.stringify(data,null,2));await test.info().attach(name,{path,contentType:'application/json'});}

test('hidden and details visibility changes refresh readings without scrolling',async()=>{
  const page=await open();
  try {
    await expect.poll(()=>readings(page)).toContain('にほんご');
    const before=await readings(page);
    await page.locator('#target').evaluate((el:HTMLElement)=>el.hidden=true);
    await page.waitForTimeout(900);
    const afterHide=await readings(page);await page.screenshot({path:test.info().outputPath('hidden-stale-overlay.png')});
    await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
    await page.waitForTimeout(900);
    await expect.poll(()=>readings(page)).not.toContain('にほんご');
    const afterResize=await readings(page);
    await page.locator('#more').evaluate((el:HTMLDetailsElement)=>el.open=true);
    await page.waitForTimeout(900);
    const afterOpen=await readings(page);
    await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
    await expect.poll(()=>readings(page)).toContain('としょかん');
    await attach('visibility-results',{before,afterHide,afterResize,afterOpen,afterSecondResize:await readings(page)});
    expect.soft(before).not.toContain('としょかん');
    expect.soft(afterHide).not.toContain('にほんご');
    expect.soft(afterOpen).toContain('としょかん');
  }finally{await page.close();}
});

test('concurrent correction and panel saves retain both successful changes',async()=>{
  const bundle=await build({entryPoints:['src/preferences.ts'],bundle:true,write:false,platform:'browser',format:'iife',globalName:'releasePreferences'});
  const clients=await Promise.all([context.newPage(),context.newPage()]);
  try {
    for(const page of clients) {
      await page.goto(`chrome-extension://${new URL(worker.url()).host}/popup.html`);
      await page.evaluate(bundle.outputFiles[0].text+';globalThis.releasePreferences=releasePreferences;');
    }
    const corrections=[],views=[];
    for(let i=0;i<10;i++) {
      await worker.evaluate(async()=>chrome.storage.local.set({readingOverrides:{'学校':'がっこう'}}));
      const replies=await Promise.all([
        clients[0].evaluate(()=>(globalThis as any).releasePreferences.saveCorrection('東京','とうきょう')),
        clients[1].evaluate(()=>(globalThis as any).releasePreferences.saveCorrection('大阪','おおさか'))
      ]);
      corrections.push({replies,stored:await worker.evaluate(async()=>(await chrome.storage.local.get('readingOverrides')).readingOverrides)});
      await worker.evaluate(async()=>chrome.storage.local.set({readingView:{sites:{},spacing:2.8,fontSize:20,width:420}}));
      const viewReplies=await Promise.all([
        clients[0].evaluate(()=>(globalThis as any).releasePreferences.updateReadingView({},{hostname:'one.test',enabled:true})),
        clients[1].evaluate(()=>(globalThis as any).releasePreferences.updateReadingView({},{hostname:'two.test',enabled:true}))
      ]);
      views.push({replies:viewReplies,stored:await worker.evaluate(async()=>(await chrome.storage.local.get('readingView')).readingView)});
    }
    await attach('concurrent-save-results',{corrections,views});
    expect.soft(corrections.every(x=>x.stored['東京']==='とうきょう'&&x.stored['大阪']==='おおさか')).toBe(true);
    expect.soft(views.every(x=>x.stored.sites['one.test']&&x.stored.sites['two.test'])).toBe(true);
  }finally{await Promise.all(clients.map(page=>page.close()));}
});

test('recognized kana dictionary verbs remain available for exploration',async()=>{
  const page=await open(true);
  try {
    await browse(page);const kana=await checkVerb(page,'いれる');
    await page.screenshot({path:test.info().outputPath('ireru-rejected.png')});
    const kanji=await checkVerb(page,'入れる');
    await attach('verb-results',{kana,kanji});
    expect(kanji.choices.length).toBeGreaterThan(0);
    expect(kana.choices.length).toBeGreaterThan(0);
  }finally{await page.close();}
});
