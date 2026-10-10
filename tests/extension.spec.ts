import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer, type Server } from 'node:http';
let context: BrowserContext, profile: string, server: Server, base: string, extension: string;
const fixture = `<!doctype html><style>body{font:24px/2.5 system-ui;margin:60px}p{margin:0} .kix-page{height:950px;width:700px;border:1px solid #aaa;margin:20px}</style><p id="text">日本語を勉強する。食べる。東京都。</p><p><ruby>学校<rt>がっこう</rt></ruby></p><textarea>日本語</textarea><div id="dynamic"></div><p id="inline">日<span>本</span>語</p>`;
test.beforeAll(async () => {
  server = createServer((_req,res) => {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);});
  await new Promise<void>(r => server.listen(0,'127.0.0.1',r));
  base = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
  profile = await mkdtemp(resolve(tmpdir(),'fob-test-'));
  const path = resolve('dist');
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless:true, args:[`--disable-extensions-except=${path}`,`--load-extension=${path}`], viewport:{width:1000,height:800}
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  extension = new URL(worker.url()).host;
});
test.afterAll(async () => { await context?.close(); await new Promise<void>(r => server?.close(() => r())); if(profile) await rm(profile,{recursive:true,force:true}); });
async function annotations(page:Page) {
  const session = await context.newCDPSession(page);
  try {
    const tree = await session.send('DOM.getDocument',{depth:-1,pierce:true});
    let shadow:number|undefined;
    function visit(n:any) {if(n.nodeName === 'FOB-OVERLAY') shadow=n.shadowRoots?.[0]?.nodeId; for(const c of [...(n.children??[]),...(n.shadowRoots??[])]) visit(c);}
    visit(tree.root); if(!shadow) return [];
    const resolved = await session.send('DOM.resolveNode',{nodeId:shadow});
    const result = await session.send('Runtime.callFunctionOn',{objectId:resolved.object.objectId, functionDeclaration:'function(){return Array.from(this.querySelectorAll("span"),s=>({text:s.textContent,top:s.getBoundingClientRect().top,left:s.getBoundingClientRect().left,fontSize:parseFloat(getComputedStyle(s).fontSize),color:getComputedStyle(s).color}))}',returnByValue:true});
    return result.result.value as {text:string;top:number;left:number;fontSize:number;color:string}[];
  } finally {await session.detach();}
}
async function settings(values:Record<string,unknown>) {const worker=context.serviceWorkers()[0];await worker.evaluate(values=>chrome.storage.local.set(values),values);}
test('automatic offline readings preserve source, react to changes, and disable cleanly',async()=>{
  const page=await context.newPage(); const remote:string[]=[];
  page.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('chrome-extension:'))remote.push(request.url());});
  await page.goto(base);
  const before=await page.locator('#text').evaluate(el=>({html:el.innerHTML,rect:el.getBoundingClientRect().toJSON()}));
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text),{timeout:30000}).toContain('にほんご');
  expect((await annotations(page)).map(a=>a.text)).toContain('た');
  expect((await annotations(page)).filter(a=>a.text==='にほんご')).toHaveLength(2);
  await expect(page.locator('fob-overlay')).toBeVisible();
  await page.screenshot({path:test.info().outputPath('furigana-before-print.png'),caret:'initial'});
  await page.emulateMedia({media:'print'});
  expect(await page.locator('fob-overlay').isVisible()).toBe(false);
  await page.emulateMedia({media:'screen'});
  await expect(page.locator('fob-overlay')).toBeVisible();
  await expect.poll(async()=> (await annotations(page)).length).toBeGreaterThan(0);
  await page.screenshot({path:test.info().outputPath('furigana.png'),caret:'initial'});
  const after=await page.locator('#text').evaluate(el=>({html:el.innerHTML,rect:el.getBoundingClientRect().toJSON()}));
  expect(after).toEqual(before);expect(remote).toEqual([]);
  await page.locator('#dynamic').evaluate(el=>{el.textContent='図書館';});
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text)).toContain('としょかん');
  await settings({enabled:false});await expect.poll(async()=> (await annotations(page)).length).toBe(0);
  await settings({enabled:true});await expect.poll(async()=> (await annotations(page)).length).toBeGreaterThan(0);
  await settings({excluded:['127.0.0.1']});await expect.poll(async()=> (await annotations(page)).length).toBe(0);
  await settings({excluded:[]});await page.close();
});
test('large webpage remains bounded and annotates newly visible content',async()=>{
  const page=await context.newPage();await page.goto(base);
  await page.evaluate(()=>{const container=document.createElement('section');container.id='large';let html='';for(let i=0;i<100000;i++)html+=`<p>図書館 ${i}</p>`;container.innerHTML=html;document.body.append(container);});
  await expect.poll(async()=> (await annotations(page)).length,{timeout:30000}).toBeGreaterThan(0);
  expect((await annotations(page)).length).toBeLessThanOrEqual(500);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text),{timeout:30000}).toContain('としょかん');
  expect((await annotations(page)).length).toBeLessThanOrEqual(500);
  await page.close();
});
test('Docs fixture initializes bridge and switches between 100 pages',async()=>{
  const page=await context.newPage();
  await page.route('https://docs.google.com/document/d/fob-fixture/edit',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:0}.kix-page{height:950px;width:700px;margin:20px;border:1px solid}</style><div class="kix-appview-editor">${Array.from({length:100},(_,i)=>`<div class="kix-page" data-page="${i}"><svg width="700" height="200"><g data-font-css="24px system-ui"><rect x="40" y="80" width="96" height="28" aria-label="${i%2?'図書館':'日本語'}" fill="transparent"/></g></svg></div>`).join('')}</div>`}));
  await page.goto('https://docs.google.com/document/d/fob-fixture/edit');
  await expect.poll(()=>page.evaluate(()=>(window as any)._docs_annotate_canvas_by_ext)).toBe(extension);
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text),{timeout:30000}).toContain('にほんご');
  await page.locator('[data-page="99"]').evaluate(el=>el.scrollIntoView({block:'start'}));
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text)).toEqual(['としょかん']);
  await page.close();
});

test('IME composition hides stale overlays until input settles',async()=>{
  const page=await context.newPage(); await page.goto(base);
  await expect.poll(async()=> (await annotations(page)).length).toBeGreaterThan(0);
  await page.evaluate(()=>document.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})));
  await expect.poll(async()=> (await annotations(page)).length).toBe(0);
  await page.waitForTimeout(250); expect((await annotations(page)).length).toBe(0);
  await page.evaluate(()=>document.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));
  await expect.poll(async()=> (await annotations(page)).length).toBeGreaterThan(0);
  await page.close();
});

test('open shadow DOM updates are live and nested editable text is skipped',async()=>{
  const page=await context.newPage(); await page.goto(base);
  await page.evaluate(()=>{
    const host=document.createElement('section');host.id='shadow-fixture';
    host.attachShadow({mode:'open'}).innerHTML='<p style="font:24px/2.5 system-ui">図書館</p>';
    document.body.append(host);
    const editable=document.createElement('div');editable.contentEditable='true';editable.innerHTML='<p>京都大学</p>';document.body.append(editable);
  });
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text)).toContain('としょかん');
  expect((await annotations(page)).map(a=>a.text)).not.toContain('きょうとだいがく');
  await page.evaluate(()=>{document.querySelector('#shadow-fixture')!.shadowRoot!.querySelector('p')!.textContent='勉強';});
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text)).toContain('べんきょう');
  expect((await annotations(page)).map(a=>a.text)).not.toContain('としょかん');
  await page.close();
});

test('Docs pageless dense lines use glyph ink, deduplicate tiles, and clip toolbar',async()=>{
  const page=await context.newPage();
  const lines=['故障かもしれません','すぐ空港に戻りましょう','病気かもしれません','先生、どこが悪いんですか','仕事が忙しいですか','最近残業が多いんです'];
  const body=await page.evaluate(lines=>{
    const canvas=document.createElement('canvas'), c=canvas.getContext('2d')!;c.font='400 14.6667px Arial';
    return lines.map((text,i)=>{
      const metrics=c.measureText(text), y=60+i*19.395;
      const baseline=y+(17.6-metrics.fontBoundingBoxAscent-metrics.fontBoundingBoxDescent)/2+metrics.fontBoundingBoxAscent;
      return `<rect x="80" y="${y}" width="${metrics.width}" height="17.6" aria-label="${text}" data-font-css='400 14.6667px Arial'/><text x="80" y="${baseline}" fill="black" style="font:400 14.6667px Arial">${text}</text>`;
    }).join('');
  },lines);
  await page.route('https://docs.google.com/document/d/fob-dense/edit',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:0}.toolbar{position:fixed;top:0;width:100%;height:100px;background:white;z-index:2}.kix-appview-editor{position:absolute;top:100px;width:900px;height:600px;overflow:hidden}</style><div class="toolbar">Toolbar</div><div class="kix-appview-editor"><svg width="900" height="600"><g fill="none">${body}<rect x="80" y="-50" width="60" height="17.6" aria-label="日本語" data-font-css="14.6667px Arial"/></g></svg><svg style="position:absolute;inset:0" width="900" height="600"><g fill="none">${body}</g></svg></div>`}));
  await page.goto('https://docs.google.com/document/d/fob-dense/edit');
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text),{timeout:30000}).toContain('こしょう');
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text)).toContain('びょうき');
  const readings=await annotations(page);
  expect(readings.filter(a=>a.text==='こしょう')).toHaveLength(1);
  expect(readings.some(a=>a.text==='にほんご')).toBe(false);
  expect(readings.every(a=>a.top>=100)).toBe(true);
  expect(readings.length).toBeGreaterThan(6);
  await page.screenshot({path:test.info().outputPath('docs-dense.png'),caret:'initial'});
  await page.close();
});

test('popup shows page status, persists switches, and loads packaged branding',async()=>{
  const page=await context.newPage();await page.goto(base);
  await expect.poll(async()=> (await annotations(page)).length,{timeout:30000}).toBeGreaterThan(0);
  const popup=await context.newPage();
  await page.bringToFront();
  await popup.goto(`chrome-extension://${extension}/popup.html`);
  await expect(popup.locator('#site')).toHaveText('127.0.0.1');
  await expect(popup.locator('#docs-reading-panel')).toBeHidden();
  await expect(popup.locator('#status-card')).toHaveAttribute('data-state','active');
  expect(await popup.locator('header img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  await popup.locator('body').screenshot({path:test.info().outputPath('popup.png'),caret:'initial'});
  await popup.getByRole('switch',{name:/Pause on this site/}).check();
  await expect(popup.locator('#status')).toContainText('Readings are paused on 127.0.0.1');
  await expect.poll(async()=> (await annotations(page)).length).toBe(0);
  await popup.getByRole('switch',{name:/Pause on this site/}).uncheck();
  await expect.poll(async()=> (await annotations(page)).length).toBeGreaterThan(0);
  await popup.getByRole('switch',{name:/Automatic readings/}).uncheck();
  await expect(popup.locator('#status')).toContainText('turned off');
  await expect.poll(async()=> (await annotations(page)).length).toBe(0);
  await popup.getByRole('switch',{name:/Automatic readings/}).check();
  await expect.poll(async()=> (await annotations(page)).length).toBeGreaterThan(0);
  await popup.close();await page.close();
});

test('site appearance and local corrections update automatically, persist, and preserve source',async()=>{
  const page=await context.newPage();await page.goto(`${base}/customization`);
  await expect.poll(async()=> (await annotations(page)).length,{timeout:30000}).toBeGreaterThan(0);
  const original=await page.locator('#text').evaluate(el=>({html:el.innerHTML,rect:el.getBoundingClientRect().toJSON()}));
  let popup=await context.newPage();await page.bringToFront();await popup.goto(`chrome-extension://${extension}/popup.html`);
  await popup.locator('#appearance-panel summary').click();
  await popup.getByLabel('Size',{exact:true}).selectOption('1.25');
  await popup.getByLabel('Contrast',{exact:true}).selectOption('high');
  await expect.poll(async()=> (await annotations(page)).some(a=>a.text==='にほんご'&&a.fontSize>12&&a.color==='rgb(16, 16, 16)')).toBe(true);
  await popup.locator('#correction-panel summary').click();
  await popup.getByLabel('Word or name',{exact:true}).fill('日本語');
  await popup.getByLabel('Reading',{exact:true}).fill('invalid');
  await popup.getByRole('button',{name:'Save correction',exact:true}).click();
  await expect(popup.locator('#correction-feedback')).toContainText('hiragana or katakana');
  await popup.getByLabel('Reading',{exact:true}).fill('ニッポンゴ');
  await popup.getByRole('button',{name:'Save correction',exact:true}).click();
  await expect.poll(async()=> (await annotations(page)).filter(a=>a.text==='にっぽんご').length).toBe(2);
  await expect(popup.locator('#corrections')).toContainText('にっぽんご');
  await popup.close();popup=await context.newPage();await page.bringToFront();await popup.goto(`chrome-extension://${extension}/popup.html`);
  await expect(popup.locator('#reading-size')).toHaveValue('1.25');
  await expect(popup.locator('#reading-contrast')).toHaveValue('high');
  await expect(popup.locator('#correction-count')).toHaveText('(1)');
  await popup.locator('#correction-panel summary').click();
  await popup.getByRole('button',{name:'Edit 日本語',exact:true}).click();
  await popup.getByLabel('Reading',{exact:true}).fill('にほんご');
  await popup.getByRole('button',{name:'Save correction',exact:true}).click();
  await expect.poll(async()=> (await annotations(page)).filter(a=>a.text==='にほんご').length).toBe(2);
  await popup.getByRole('button',{name:'Remove 日本語',exact:true}).click();
  await expect(popup.locator('#correction-count')).toBeEmpty();
  expect(await page.locator('#text').evaluate(el=>({html:el.innerHTML,rect:el.getBoundingClientRect().toJSON()}))).toEqual(original);
  await popup.locator('#appearance-panel summary').click();
  await popup.locator('body').screenshot({path:test.info().outputPath('customization.png'),caret:'initial'});
  await settings({siteAppearance:{},readingOverrides:{}});await popup.close();await page.close();
});

test('rapid edits settle on current text and diagnostics distinguish unknown words from missing Docs geometry',async()=>{
  const page=await context.newPage();await page.goto(`${base}/diagnostics`);
  await expect.poll(async()=> (await annotations(page)).length,{timeout:30000}).toBeGreaterThan(0);
  await page.evaluate(async()=>{
    const target=document.querySelector('#dynamic')!;
    for(let i=0;i<12;i++){target.textContent=i%2?'図書館':'病気';await new Promise(r=>setTimeout(r,20));}
    target.textContent='先生';
  });
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text)).toContain('せんせい');
  expect((await annotations(page)).map(a=>a.text)).not.toContain('びょうき');
  expect((await annotations(page)).map(a=>a.text)).not.toContain('としょかん');
  await page.locator('#dynamic').evaluate(el=>el.textContent='𠮷髙');
  const worker=context.serviceWorkers()[0];
  const status=()=>worker.evaluate(async url=>{
    const [tab]=await chrome.tabs.query({url});return chrome.tabs.sendMessage(tab.id!,{type:'status'},{frameId:0});
  },`${base}/diagnostics`);
  await expect.poll(async()=> (await status()).message).toContain('Unknown words:');
  await settings({readingOverrides:{'𠮷髙':'よしたか'}});
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text)).toContain('よしたか');
  await expect.poll(async()=> (await status()).state).toBe('active');
  expect((await status()).message).not.toContain('Unknown words:');
  await settings({readingOverrides:{}});await page.close();
  const docsPage=await context.newPage();
  await docsPage.route('https://docs.google.com/document/d/empty/edit',route=>route.fulfill({contentType:'text/html',body:'<div class="kix-appview-editor">No geometry</div>'}));
  await docsPage.goto('https://docs.google.com/document/d/empty/edit');
  await expect.poll(()=>worker.evaluate(async()=>{
    const [tab]=await chrome.tabs.query({url:'https://docs.google.com/document/d/empty/edit'});return chrome.tabs.sendMessage(tab.id!,{type:'status'},{frameId:0});
  })).toMatchObject({state:'unavailable',message:expect.stringContaining('Docs text is unavailable')});
  await docsPage.close();
});

async function readerEval(page:Page,fn:string) {
  const session=await context.newCDPSession(page);
  try {
    const tree=await session.send('DOM.getDocument',{depth:-1,pierce:true});let shadow:number|undefined;
    function visit(n:any){if(n.nodeName==='FOB-READING-VIEW')shadow=n.shadowRoots?.[0]?.nodeId;for(const c of [...(n.children??[]),...(n.shadowRoots??[])])visit(c);}
    visit(tree.root);if(!shadow)return null;
    const object=await session.send('DOM.resolveNode',{nodeId:shadow});
    const result=await session.send('Runtime.callFunctionOn',{objectId:object.object.objectId,functionDeclaration:fn,returnByValue:true});
    return result.result.value;
  } finally {await session.detach();}
}
const readerSnapshot=`function(){return {lines:Array.from(this.querySelectorAll('.line'),p=>{const copy=p.cloneNode(true);copy.querySelectorAll('rt').forEach(rt=>rt.remove());return copy.textContent}),readings:Array.from(this.querySelectorAll('rt'),r=>r.textContent),spacing:this.querySelector('.line')?getComputedStyle(this.querySelector('.line')).lineHeight:null,scrollTop:this.querySelector('.content').scrollTop,status:this.querySelector('.status').textContent}}`;

test('optional Docs reading view spaces ruby, follows active page and edits, preserves source, and closes',async()=>{
  const page=await context.newPage();
  const lines=['日本語を勉強する。','This is a reading test.',...Array.from({length:10},()=> '先生、仕事が忙しいですか。')];
  const makeSvg=(labels:string[])=>`<svg width="700" height="600">${labels.map((text,i)=>`<g data-font-css="24px system-ui"><rect x="40" y="${60+i*32}" width="${text.length*24}" height="28" aria-label="${text}" fill="transparent"/><text x="40" y="${83+i*32}" style="font:24px system-ui">${text}</text></g>`).join('')}</svg>`;
  await page.route('https://docs.google.com/document/d/reader/edit',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#f0f2ed}.toolbar{height:90px;padding:20px;background:white;font:20px system-ui}.kix-page{height:950px;width:700px;margin:20px;background:white;border:1px solid #ccd}</style><div class="toolbar">Google Docs reading view — browser fixture</div><div class="kix-appview-editor"><div class="kix-page" data-page="0">${makeSvg(lines)}</div><div class="kix-page" data-page="1">${makeSvg(['図書館で本を読む。'])}</div></div>`}));
  await page.goto('https://docs.google.com/document/d/reader/edit');
  await expect.poll(async()=> (await annotations(page)).length,{timeout:30000}).toBeGreaterThan(0);
  expect(await readerEval(page,readerSnapshot)).toBeNull();
  const before=await page.locator('.kix-appview-editor').evaluate(el=>({html:el.innerHTML,rect:el.getBoundingClientRect().toJSON()}));
  const popup=await context.newPage();await page.bringToFront();await popup.goto(`chrome-extension://${extension}/popup.html`);
  await expect(popup.locator('#docs-reading-panel')).toBeVisible();
  await popup.locator('#docs-reading-panel summary').click();
  await popup.getByRole('switch',{name:/Extra-space reading view/}).check();
  await popup.getByLabel('Line spacing',{exact:true}).selectOption('3.4');
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('にほんご');
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.spacing).toBe('68px');
  expect((await readerEval(page,readerSnapshot)).lines).toContain('This is a reading test.');
  expect((await readerEval(page,readerSnapshot)).lines).toContain('日本語を勉強する。');
  expect(await annotations(page)).toHaveLength(0);
  expect(await page.locator('.kix-appview-editor').evaluate(el=>({html:el.innerHTML,rect:el.getBoundingClientRect().toJSON()}))).toEqual(before);
  await page.screenshot({path:test.info().outputPath('docs-reading-view.png'),caret:'initial'});
  await readerEval(page,`function(){this.querySelector('.content').scrollTop=100;return true}`);
  await page.waitForTimeout(300);
  expect((await readerEval(page,readerSnapshot)).scrollTop).toBeGreaterThan(0);
  expect((await readerEval(page,readerSnapshot)).readings).toContain('にほんご');
  await settings({readingOverrides:{'日本語':'にっぽんご'}});
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('にっぽんご');
  await page.locator('[data-page="0"] rect').first().evaluate(el=>el.setAttribute('aria-label','病気かもしれません'));
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('びょうき');
  expect((await readerEval(page,readerSnapshot)).readings).not.toContain('にっぽんご');
  await page.locator('[data-page="1"]').evaluate(el=>el.scrollIntoView({block:'start'}));
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('としょかん');
  expect((await readerEval(page,readerSnapshot)).lines).toEqual(['図書館で本を読む。']);
  await page.emulateMedia({media:'print'});await expect(page.locator('fob-reading-view')).toBeHidden();await page.emulateMedia({media:'screen'});
  await readerEval(page,`function(){this.querySelector('button').click();return true}`);
  await expect(page.locator('fob-reading-view')).toHaveCount(0);
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text)).toContain('としょかん');
  await popup.close();const reopened=await context.newPage();await page.bringToFront();await reopened.goto(`chrome-extension://${extension}/popup.html`);
  await expect(reopened.locator('#docs-reading-enabled')).not.toBeChecked();await expect(reopened.locator('#docs-reading-spacing')).toHaveValue('3.4');
  await reopened.locator('#docs-reading-panel summary').click();await reopened.getByRole('switch',{name:/Extra-space reading view/}).check();
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('としょかん');
  await settings({enabled:false});await expect(page.locator('fob-reading-view')).toHaveCount(0);
  await settings({enabled:true,excluded:['docs.google.com']});await expect(page.locator('fob-reading-view')).toHaveCount(0);
  await settings({excluded:[]});await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('としょかん');
  await settings({docsReadingView:{enabled:false,spacing:2.8},readingOverrides:{}});await reopened.close();await page.close();
});

test('Docs pageless reading view starts automatically, ignores offscreen text, and waits during IME',async()=>{
  await settings({docsReadingView:{enabled:true,spacing:2.2}});
  const page=await context.newPage();
  await page.route('https://docs.google.com/document/d/reader-pageless/edit',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:0}.kix-appview-editor{position:absolute;top:100px;width:900px;height:600px;overflow:auto}</style><div class="kix-appview-editor"><svg width="900" height="1200"><g data-font-css="24px system-ui" fill="none"><rect x="40" y="60" width="240" height="28" aria-label="仕事が忙しいですか"/><rect x="40" y="110" width="240" height="28" aria-label="&lt;img src=x&gt;"/><rect x="40" y="900" width="96" height="28" aria-label="京都大学"/></g></svg></div>`}));
  await page.goto('https://docs.google.com/document/d/reader-pageless/edit');
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings,{timeout:30000}).toContain('しごと');
  const snapshot=await readerEval(page,readerSnapshot);
  expect(snapshot.lines).toEqual(['仕事が忙しいですか','<img src=x>']);expect(snapshot.spacing).toBe('44px');
  expect(snapshot.status).toContain('Visible document text');
  expect(await readerEval(page,`function(){return this.querySelectorAll('img,script').length}`)).toBe(0);
  await page.evaluate(()=>document.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})));
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toEqual([]);
  await page.waitForTimeout(250);expect((await readerEval(page,readerSnapshot)).readings).toEqual([]);
  await page.evaluate(()=>document.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('しごと');
  await page.locator('svg').evaluate(el=>el.remove());
  await expect.poll(()=>readerEval(page,`function(){return this.querySelector('.empty')?.textContent}`)).toContain('Docs text is unavailable');
  await settings({docsReadingView:{enabled:false,spacing:2.8}});await page.close();
});
