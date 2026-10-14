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
  profile = await mkdtemp(resolve(tmpdir(),'ko-test-'));
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
    function visit(n:any) {if(n.nodeName === 'KO-OVERLAY') shadow=n.shadowRoots?.[0]?.nodeId; for(const c of [...(n.children??[]),...(n.shadowRoots??[])]) visit(c);}
    visit(tree.root); if(!shadow) return [];
    const resolved = await session.send('DOM.resolveNode',{nodeId:shadow});
    const result = await session.send('Runtime.callFunctionOn',{objectId:resolved.object.objectId, functionDeclaration:'function(){return Array.from(this.querySelectorAll("span"),s=>({text:s.textContent,top:s.getBoundingClientRect().top,left:s.getBoundingClientRect().left,fontSize:parseFloat(getComputedStyle(s).fontSize),color:getComputedStyle(s).color}))}',returnByValue:true});
    return result.result.value as {text:string;top:number;left:number;fontSize:number;color:string}[];
  } finally {await session.detach();}
}
async function settings(values:Record<string,unknown>) {
  const worker=context.serviceWorkers()[0];
  await worker.evaluate(async values=>{
    if(values.docsReadingView) {
      const view=values.docsReadingView as {enabled:boolean;spacing:number};
      values.readingView={sites:{'docs.google.com':view.enabled},spacing:view.spacing,fontSize:20,width:420};
    }
    await chrome.storage.local.set(values);
  },values);
}
test('vocabulary noun readings reach Docs overlays and word metadata without changing names or saved corrections',async()=>{
  await settings({docsReadingView:{enabled:false,spacing:2.8},readingOverrides:{}});
  const page=await context.newPage();
  try {
    const lines=['出口 = salida','出口','出口太郎','出口はどこですか。'];
    await page.route('https://docs.google.com/document/d/vocabulary/edit',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:0}.kix-appview-editor{position:absolute;top:100px;width:900px;height:600px}</style><div class="kix-appview-editor"><svg width="900" height="600">${lines.map((text,i)=>`<g data-font-css="24px system-ui"><rect x="40" y="${60+i*60}" width="${text.length*24}" height="28" aria-label="${text}" fill="transparent"/><text x="40" y="${83+i*60}" style="font:24px system-ui">${text}</text></g>`).join('')}</svg></div>`}));
    await page.goto('https://docs.google.com/document/d/vocabulary/edit');
    const source=await page.locator('.kix-appview-editor').innerHTML();
    await expect.poll(async()=> (await annotations(page)).filter(a=>a.text==='でぐち').length,{timeout:30000}).toBe(3);
    expect((await annotations(page)).filter(a=>a.text==='いでぐち')).toHaveLength(1);
    await settings({docsReadingView:{enabled:true,spacing:2.8}});
    const exitWords=`function(){return Array.from(this.querySelectorAll('[data-surface="出口"]'),el=>({reading:el.dataset.reading,ruby:el.querySelector('rt')?.textContent}))}`;
    await expect.poll(()=>readerEval(page,exitWords)).toEqual([
      {reading:'でぐち',ruby:'でぐち'},{reading:'でぐち',ruby:'でぐち'},
      {reading:'いでぐち',ruby:'いでぐち'},{reading:'でぐち',ruby:'でぐち'}
    ]);
    // The isolated 出口 above has already been cached. Splitting the name at
    // a correction must still keep its surname reading for the same fragment.
    await settings({readingOverrides:{'太郎':'たろ'}});
    await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('たろ');
    expect((await readerEval(page,readerSnapshot)).readings.filter((r:string)=>r==='いでぐち')).toEqual(['いでぐち']);
    expect((await readerEval(page,readerSnapshot)).readings.filter((r:string)=>r==='でぐち')).toHaveLength(3);
    await settings({readingOverrides:{'出口':'いでぐち'}});
    await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings.filter((r:string)=>r==='でぐち')).toEqual([]);
    expect((await readerEval(page,readerSnapshot)).readings.filter((r:string)=>r==='いでぐち')).toHaveLength(4);
    expect(await page.locator('.kix-appview-editor').innerHTML()).toBe(source);
  } finally {
    await settings({docsReadingView:{enabled:false,spacing:2.8},readingOverrides:{}});
    await page.close();
  }
});
test('automatic offline readings preserve source, react to changes, and disable cleanly',async()=>{
  const page=await context.newPage(); const remote:string[]=[];
  page.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('chrome-extension:'))remote.push(request.url());});
  await page.goto(base);
  const before=await page.locator('#text').evaluate(el=>({html:el.innerHTML,rect:el.getBoundingClientRect().toJSON()}));
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text),{timeout:30000}).toContain('にほんご');
  expect((await annotations(page)).map(a=>a.text)).toContain('た');
  expect((await annotations(page)).filter(a=>a.text==='にほんご')).toHaveLength(2);
  await expect(page.locator('ko-overlay')).toBeVisible();
  await page.screenshot({path:test.info().outputPath('furigana-before-print.png'),caret:'initial'});
  await page.emulateMedia({media:'print'});
  expect(await page.locator('ko-overlay').isVisible()).toBe(false);
  await page.emulateMedia({media:'screen'});
  await expect(page.locator('ko-overlay')).toBeVisible();
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
  await page.route('https://docs.google.com/document/d/ko-fixture/edit',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:0}.kix-page{height:950px;width:700px;margin:20px;border:1px solid}</style><div class="kix-appview-editor">${Array.from({length:100},(_,i)=>`<div class="kix-page" data-page="${i}"><svg width="700" height="200"><g data-font-css="24px system-ui"><rect x="40" y="80" width="96" height="28" aria-label="${i%2?'図書館':'日本語'}" fill="transparent"/></g></svg></div>`).join('')}</div>`}));
  await page.goto('https://docs.google.com/document/d/ko-fixture/edit');
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
  await page.route('https://docs.google.com/document/d/ko-dense/edit',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:0}.toolbar{position:fixed;top:0;width:100%;height:100px;background:white;z-index:2}.kix-appview-editor{position:absolute;top:100px;width:900px;height:600px;overflow:hidden}</style><div class="toolbar">Toolbar</div><div class="kix-appview-editor"><svg width="900" height="600"><g fill="none">${body}<rect x="80" y="-50" width="60" height="17.6" aria-label="日本語" data-font-css="14.6667px Arial"/></g></svg><svg style="position:absolute;inset:0" width="900" height="600"><g fill="none">${body}</g></svg></div>`}));
  await page.goto('https://docs.google.com/document/d/ko-dense/edit');
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text),{timeout:30000}).toContain('こしょう');
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text)).toContain('びょうき');
  // The first readings can appear while later batches are still being rendered.
  await expect.poll(async()=> (await annotations(page)).length).toBeGreaterThan(6);
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
  await expect(popup.locator('#view-reading-panel')).toBeVisible();
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

test('toolbar follows tab preferences and navigation, stays active without kanji, and recovers Docs availability',async()=>{
  await settings({enabled:true,excluded:[],readingView:{sites:{},spacing:2.8,fontSize:20,width:420}});
  const worker=context.serviceWorkers()[0],page=await context.newPage();
  const url=`${base}/toolbar-empty`;
  await page.route(url,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><p>No Japanese text here.</p>'}));
  await page.goto(url);
  const tabId=await worker.evaluate(async url=>(await chrome.tabs.query({url}))[0].id!,url);
  const title=()=>worker.evaluate(tabId=>chrome.action.getTitle({tabId}),tabId);
  await expect.poll(title).toContain('active on 127.0.0.1');
  await page.evaluate(()=>{document.dispatchEvent(new Event('scroll'));document.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));});
  expect(await title()).toContain('active on 127.0.0.1');
  await page.evaluate(()=>document.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));
  await settings({excluded:['127.0.0.1']});await expect.poll(title).toContain('paused on 127.0.0.1');
  await settings({enabled:false});await expect.poll(title).toContain('paused everywhere');
  await settings({enabled:true,excluded:[]});await expect.poll(title).toContain('active on 127.0.0.1');
  const unsupported=await worker.evaluate(async()=>(await chrome.tabs.create({url:'about:blank',active:true})).id!);
  await expect.poll(()=>worker.evaluate(tabId=>chrome.action.getTitle({tabId}),unsupported)).toContain('unavailable on this page');
  expect(await title()).toContain('active on 127.0.0.1');
  await worker.evaluate(tabId=>chrome.tabs.update(tabId,{active:true}),tabId);
  await expect.poll(title).toContain('active on 127.0.0.1');
  await worker.evaluate(tabId=>chrome.tabs.remove(tabId),unsupported);
  await page.goto('about:blank');await expect.poll(title).toContain('unavailable on this page');
  await page.goto(url);await expect.poll(title).toContain('active on 127.0.0.1');
  await page.evaluate(()=>history.pushState({},'',location.pathname+'#reading'));
  await expect.poll(title).toContain('active on 127.0.0.1');
  const docsUrl='https://docs.google.com/document/d/toolbar-availability/edit';
  await page.route(docsUrl,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>.kix-appview-editor{position:absolute;top:100px;width:900px;height:600px}</style><div class="kix-appview-editor"></div>'}));
  await page.goto(docsUrl);await expect.poll(title).toContain('Docs text is unavailable');
  await page.locator('.kix-appview-editor').evaluate(el=>{el.innerHTML='<svg width="900" height="600"><rect x="40" y="60" width="96" height="28" aria-label="日本語" data-font-css="24px system-ui"/></svg>';});
  await expect.poll(title).toContain('active on docs.google.com');
  await page.close();
});

test('popup handles long hostnames and expanded forms without horizontal overflow',async()=>{
  const hostname=`${'long-'.repeat(8)}example.test`,url=`https://${hostname}/read`;
  const page=await context.newPage();await page.route(url,route=>route.fulfill({contentType:'text/html; charset=utf-8',body:fixture}));await page.goto(url);
  const popup=await context.newPage();await popup.setViewportSize({width:380,height:580});await page.bringToFront();await popup.goto(`chrome-extension://${extension}/popup.html`);
  await expect(popup.locator('#site')).toHaveText(hostname);
  const reading=popup.locator('#view-reading-panel summary');await reading.focus();await popup.keyboard.press('Enter');
  await expect(popup.locator('#view-reading-panel')).toHaveAttribute('open','');
  await popup.locator('body').screenshot({path:test.info().outputPath('popup-reading.png')});
  await popup.locator('#appearance-panel summary').click();await popup.locator('#correction-panel summary').click();
  await popup.getByLabel('Word or name',{exact:true}).fill('日本語');
  await popup.getByLabel('Reading',{exact:true}).fill('にほんご');
  await popup.getByRole('button',{name:'Save correction',exact:true}).click();
  await expect(popup.locator('#corrections')).toContainText('にほんご');
  const dimensions=await popup.locator('body').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,scrollHeight:el.scrollHeight}));
  expect(dimensions.width).toBe(380);expect(dimensions.scrollWidth).toBe(380);expect(dimensions.height).toBeLessThanOrEqual(580);expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.height);
  await popup.locator('#correction-search').focus();await expect(popup.locator('#correction-search')).toBeFocused();
  await popup.locator('#view-reading-panel summary').click();await popup.locator('#appearance-panel summary').click();
  await popup.locator('#correction-search').focus();
  await popup.screenshot({path:test.info().outputPath('popup-corrections.png'),clip:{x:0,y:0,width:380,height:580}});
  await settings({readingOverrides:{}});await popup.close();await page.close();
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
    function visit(n:any){if(n.nodeName==='KO-READING-VIEW')shadow=n.shadowRoots?.[0]?.nodeId;for(const c of [...(n.children??[]),...(n.shadowRoots??[])])visit(c);}
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
  await expect(popup.locator('#view-reading-panel')).toBeVisible();
  await popup.locator('#view-reading-panel summary').click();
  await popup.getByRole('switch',{name:/Extra-space reading view/}).check();
  await popup.getByLabel('Line spacing',{exact:true}).selectOption('3.4');
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('にほんご');
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.spacing).toBe('68px');
  expect((await readerEval(page,readerSnapshot)).lines).toContain('This is a reading test.');
  expect((await readerEval(page,readerSnapshot)).lines).toContain('日本語を勉強する。');
  expect(await annotations(page)).toHaveLength(0);
  expect(await page.locator('.kix-appview-editor').evaluate(el=>({html:el.innerHTML,rect:el.getBoundingClientRect().toJSON()}))).toEqual(before);
  await page.screenshot({path:test.info().outputPath('view-reading-view.png'),caret:'initial'});
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
  await page.emulateMedia({media:'print'});await expect(page.locator('ko-reading-view')).toBeHidden();await page.emulateMedia({media:'screen'});
  await readerEval(page,`function(){this.querySelector('button').click();return true}`);
  await expect(page.locator('ko-reading-view')).toHaveCount(0);
  await expect.poll(async()=> (await annotations(page)).map(a=>a.text)).toContain('としょかん');
  await popup.close();const reopened=await context.newPage();await page.bringToFront();await reopened.goto(`chrome-extension://${extension}/popup.html`);
  await expect(reopened.locator('#view-reading-enabled')).not.toBeChecked();await expect(reopened.locator('#view-reading-spacing')).toHaveValue('3.4');
  await reopened.locator('#view-reading-panel summary').click();await reopened.getByRole('switch',{name:/Extra-space reading view/}).check();
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('としょかん');
  await settings({enabled:false});await expect(page.locator('ko-reading-view')).toHaveCount(0);
  await settings({enabled:true,excluded:['docs.google.com']});await expect(page.locator('ko-reading-view')).toHaveCount(0);
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

test('Docs word clicks show bilingual definitions, use lemmas, cache results, and handle failures and stale lookups',async()=>{
  const lookups:string[]=[];
  await context.route('https://*.wiktionary.org/w/api.php*',async route=>{
    const url=new URL(route.request().url()),word=url.searchParams.get('page')!,ja=url.hostname.startsWith('ja.');
    lookups.push(`${ja?'ja':'en'}:${word}`);
    if(word==='未知') {await route.fulfill({json:{error:{code:'missingtitle'}}});return;}
    if(word==='図書館' && ja) {await route.abort();return;}
    if(word==='食べる')await new Promise(resolve=>setTimeout(resolve,500));
    const language=ja?'日本語':'Japanese',pos=ja?'名詞':'Noun';
    // Include other languages, nested examples, references, and untrusted markup.
    const html=`<h2>Chinese</h2><h3>Noun</h3><ol><li>Wrong language</li></ol><div class="mw-heading mw-heading2"><h2 id="${language}">${language}</h2></div><div class="mw-heading mw-heading3"><h3>${pos}<span class="mw-editsection">[edit]</span></h3></div><ol><li>${ja?'学ぶための施設。':'A place for learning &amp; study.'}<a href="javascript:alert(1)"> safe text</a><img src="https://untrusted.example/tracker" onerror="alert(1)"><script>alert(1)</script><dl><dd>Hidden example</dd></dl><ul><li>Hidden quotation</li></ul></li></ol><h4>References</h4><ol><li>Wrong reference</li></ol><h2>Korean</h2><h3>Noun</h3><ol><li>Wrong language</li></ol>`;
    await route.fulfill({json:{parse:{title:word,text:html}}});
  });
  await settings({docsReadingView:{enabled:true,spacing:2.8}});
  const page=await context.newPage();
  try {
    await page.route('https://docs.google.com/document/d/definitions/edit',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:0}.kix-appview-editor{position:absolute;top:100px;width:900px;height:600px}</style><div class="kix-appview-editor"><svg width="900" height="600"><g data-font-css="24px system-ui" fill="none"><rect x="40" y="60" width="540" height="28" aria-label="学校で食べました。図書館。未知。"/><rect x="40" y="120" width="540" height="28" aria-label="ありがとう。"/></g></svg></div>`}));
    await page.goto('https://docs.google.com/document/d/definitions/edit');
    await expect.poll(()=>readerEval(page,`function(){return this.querySelectorAll('.word').length}`),{timeout:30000}).toBeGreaterThan(0);
    const before=await page.locator('.kix-appview-editor').innerHTML();
    expect(lookups).toEqual([]);
    expect(await readerEval(page,`function(){return this.querySelector('[data-surface="食べ"]')?.dataset.word}`)).toBe('食べる');
    expect(await readerEval(page,`function(){return !!this.querySelector('[data-surface="ありがとう"]')}`)).toBe(true);
    // A native keyboard click should work through the closed shadow root.
    await readerEval(page,`function(){this.querySelector('[data-surface="学校"]').focus()}`);
    await page.keyboard.press('Enter');
    const snapshot=`function(){return {hidden:this.querySelector('.definition').hidden,text:this.querySelector('.definition').textContent,busy:this.querySelector('.definition-body')?.getAttribute('aria-busy'),selected:this.querySelector('.word[aria-pressed="true"]')?.dataset.surface,links:Array.from(this.querySelectorAll('.definition a'),a=>a.href),unsafe:this.querySelectorAll('.definition script,.definition img,.definition iframe').length}}`;
    await expect.poll(async()=> (await readerEval(page,snapshot))?.text).toContain('A place for learning & study. safe text');
    const result=await readerEval(page,snapshot);
    expect(result.text).toContain('学ぶための施設。');expect(result.text).toContain('English');expect(result.text).toContain('日本語');
    expect(result.text).not.toMatch(/Wrong|Hidden|alert/);expect(result.unsafe).toBe(0);expect(result.busy).toBe('false');expect(result.selected).toBe('学校');
    expect(result.links).toEqual([`https://en.wiktionary.org/wiki/${encodeURIComponent('学校')}#Japanese`,`https://ja.wiktionary.org/wiki/${encodeURIComponent('学校')}#${encodeURIComponent('日本語')}`]);
    expect(lookups.sort()).toEqual(['en:学校','ja:学校']);
    await page.screenshot({path:test.info().outputPath('docs-word-definitions.png')});
    await page.keyboard.press('Escape');expect((await readerEval(page,snapshot)).hidden).toBe(true);
    expect(await readerEval(page,`function(){return this.activeElement?.dataset.surface}`)).toBe('学校');
    const click=async(surface:string)=>readerEval(page,`function(){this.querySelector('[data-surface="${surface}"]').click()}`);
    await click('学校');expect((await readerEval(page,snapshot)).text).toContain('A place for learning');expect(lookups).toHaveLength(2);
    await click('食べ');await expect.poll(()=>lookups.includes('en:食べる')).toBe(true);
    await click('学校');await page.waitForTimeout(650);expect((await readerEval(page,snapshot)).selected).toBe('学校');
    await click('未知');await expect.poll(async()=> (await readerEval(page,snapshot))?.text).toContain('No English definition found');
    expect((await readerEval(page,snapshot)).text).toContain('日本語の定義が見つかりません');
    await click('図書館');await expect.poll(async()=> (await readerEval(page,snapshot))?.text).toContain('接続を確認');
    expect((await readerEval(page,snapshot)).text).toContain('A place for learning');
    const requestsBeforeRetry=lookups.length;
    await click('図書館');await expect.poll(()=>lookups.length).toBeGreaterThan(requestsBeforeRetry);
    await expect.poll(async()=> (await readerEval(page,snapshot))?.busy).toBe('false');
    expect(await page.locator('.kix-appview-editor').innerHTML()).toBe(before);
    await click('食べ');
    await page.locator('rect').first().evaluate(el=>el.setAttribute('aria-label','先生です。'));
    await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.lines).toContain('先生です。');
    expect((await readerEval(page,snapshot)).hidden).toBe(true);
    await readerEval(page,`function(){this.querySelector('.header button').click()}`);
    await expect(page.locator('ko-reading-view')).toHaveCount(0);
  } finally {
    await context.unroute('https://*.wiktionary.org/w/api.php*');
    await settings({docsReadingView:{enabled:false,spacing:2.8}});await page.close();
  }
});

test('Docs panel debounces edits and preserves text, scroll, focus, and definitions during unchanged redraws',async()=>{
  await settings({docsReadingView:{enabled:true,spacing:2.8}});
  await context.route('https://*.wiktionary.org/w/api.php*',route=>{
    const ja=new URL(route.request().url()).hostname.startsWith('ja.');
    return route.fulfill({json:{parse:{title:'学校',text:`<h2>${ja?'日本語':'Japanese'}</h2><h3>${ja?'名詞':'Noun'}</h3><ol><li>${ja?'学ぶための施設。':'A school.'}</li></ol>`}}});
  });
  const page=await context.newPage();
  try {
    await page.route('https://docs.google.com/document/d/debounce/edit',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:0}.kix-appview-editor{position:absolute;top:100px;width:900px;height:600px}</style><div id="toolbar">Saved</div><div class="kix-appview-editor"><svg width="900" height="600"><g data-font-css="24px system-ui" fill="none">${Array.from({length:15},(_,i)=>`<rect x="40" y="${40+i*32}" width="300" height="28" aria-label="学校で日本語を勉強する。"/>`).join('')}</g></svg></div>`}));
    await page.goto('https://docs.google.com/document/d/debounce/edit');
    await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings,{timeout:30000}).toContain('がっこう');
    await readerEval(page,`function(){this.querySelector('[data-surface="学校"]').click()}`);
    await expect.poll(()=>readerEval(page,`function(){return this.querySelector('.definition-body')?.getAttribute('aria-busy')}`)).toBe('false');
    await readerEval(page,`function(){
      const content=this.querySelector('.content'),word=this.querySelector('[data-surface="学校"]');word.focus();content.scrollTop=100;
      this.testRefresh={word,scrollTop:content.scrollTop,changes:0};
      this.testObserver=new MutationObserver(()=>this.testRefresh.changes++);this.testObserver.observe(content,{childList:true});
    }`);
    // Several separate event bursts must neither blank the content immediately
    // nor replace it after a scan that finds the same words.
    for(let burst=0;burst<2;burst++) {
      await page.evaluate(async()=>{
        for(let i=0;i<6;i++) {
          document.querySelector('#toolbar')!.textContent=`Saved ${i}`;
          document.querySelector('rect')!.setAttribute('width',String(300+i));
          document.dispatchEvent(new Event('scroll'));
          await new Promise(resolve=>setTimeout(resolve,80));
        }
      });
      await page.waitForTimeout(650);
    }
    const stable=await readerEval(page,`function(){return {changes:this.testRefresh.changes,sameWord:this.testRefresh.word===this.querySelector('[data-surface="学校"]'),focused:this.activeElement===this.testRefresh.word,scrollTop:this.querySelector('.content').scrollTop,expectedScroll:this.testRefresh.scrollTop,definitionHidden:this.querySelector('.definition').hidden}}`);
    expect(stable).toMatchObject({changes:0,sameWord:true,focused:true,definitionHidden:false});
    expect(stable.scrollTop).toBe(stable.expectedScroll);expect(stable.scrollTop).toBeGreaterThan(0);
    await page.evaluate(async()=>{
      const rect=document.querySelector('rect')!;
      for(const text of ['病気です。','仕事です。','図書館です。','先生です。']) {
        rect.setAttribute('aria-label',text);
        await new Promise(resolve=>setTimeout(resolve,100));
      }
    });
    expect(await readerEval(page,`function(){return this.testRefresh.changes}`)).toBe(0);
    expect((await readerEval(page,readerSnapshot)).lines[0]).toBe('学校で日本語を勉強する。');
    await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.lines[0]).toBe('先生です。');
    expect(await readerEval(page,`function(){return this.testRefresh.changes}`)).toBe(1);
    expect(await readerEval(page,`function(){return this.querySelector('.definition').hidden}`)).toBe(true);
    // Pause still removes the panel immediately, even with a pending refresh.
    await page.locator('rect').first().evaluate(el=>el.setAttribute('aria-label','仕事です。'));
    await settings({enabled:false});await expect(page.locator('ko-reading-view')).toHaveCount(0);
  } finally {
    await context.unroute('https://*.wiktionary.org/w/api.php*');
    await settings({enabled:true,docsReadingView:{enabled:false,spacing:2.8}});await page.close();
  }
});

const webPanelSettings={sites:{'127.0.0.1':true},spacing:2.8,fontSize:20,width:420};

test('web reading panel handles wrapped inline text, kana, viewport changes and its own occlusion',async()=>{
  await settings({enabled:true,excluded:[],readingOverrides:{},readingView:webPanelSettings,siteAppearance:{}});
  const page=await context.newPage();
  await page.route(`${base}/reader-web`,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:30px;font:24px/2.5 system-ui}.wrapped{width:240px}.covered{position:absolute;right:40px;top:100px}footer{position:absolute;top:1800px}</style><p id="inline" class="wrapped">日<span>本</span>語を勉強する。図書館で本を読む。</p><p>ありがとう。</p><p class="covered">東京大学。</p><textarea>編集しない</textarea><p hidden>隠された文章</p><footer>京都大学。</footer>`}));
  await page.goto(`${base}/reader-web`);
  const original=await page.locator('body').innerHTML();
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.lines,{timeout:30000}).toContain('日本語を勉強する。図書館で本を読む。');
  const snapshot=await readerEval(page,readerSnapshot);
  expect(snapshot.lines).toContain('ありがとう。');expect(snapshot.lines).toContain('東京大学。');
  expect(snapshot.lines.join('')).not.toMatch(/京都大学|編集しない|隠された|Reading view/);
  expect(snapshot.readings).toContain('にほんご');expect((await annotations(page))).toHaveLength(0);
  expect(await readerEval(page,`function(){return !!this.querySelector('[data-surface="ありがとう"]')}`)).toBe(true);
  await page.waitForTimeout(700);
  expect((await readerEval(page,readerSnapshot)).lines).toEqual(snapshot.lines);
  expect(await page.locator('body').innerHTML()).toBe(original);
  await page.screenshot({path:test.info().outputPath('web-reading-panel.png')});
  await page.locator('#inline').evaluate(el=>el.textContent='学校で学ぶ。');
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.lines).toContain('学校で学ぶ。');
  await page.evaluate(()=>scrollTo(0,1600));
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.lines).toContain('京都大学。');
  expect((await readerEval(page,readerSnapshot)).lines).not.toContain('学校で学ぶ。');
  await page.evaluate(()=>document.body.replaceChildren());
  await expect.poll(()=>readerEval(page,`function(){return this.querySelector('.empty')?.textContent}`)).toContain('No readable text');
  await page.close();await settings({readingView:{...webPanelSettings,sites:{}}});
});

test('web panel definitions and offline corrections update effective readings and support restoration',async()=>{
  const requested:string[]=[];
  await context.route('https://*.wiktionary.org/w/api.php*',route=>{requested.push(route.request().url());return route.abort();});
  await settings({enabled:true,excluded:[],readingOverrides:{},readingView:webPanelSettings});
  const page=await context.newPage();await page.goto(base);
  const before=await page.locator('body').innerHTML();
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings,{timeout:30000}).toContain('にほんご');
  const open=`function(){this.querySelector('[data-surface="日本語"]').click();Array.from(this.querySelectorAll('.definition button')).find(b=>b.textContent==='Correct reading').click();return Array.from(this.querySelectorAll('.correction-form input'),i=>i.value)}`;
  expect(await readerEval(page,open)).toEqual(['日本語','にほんご']);
  await expect.poll(()=>requested.length).toBe(2);
  await readerEval(page,`function(){const inputs=this.querySelectorAll('.correction-form input');inputs[1].value='abc';this.querySelector('.correction-form').requestSubmit();}`);
  await expect.poll(()=>readerEval(page,`function(){return this.querySelector('.correction-form .feedback').textContent}`)).toContain('hiragana or katakana');
  await readerEval(page,`function(){const inputs=this.querySelectorAll('.correction-form input');inputs[1].value='ニッポンゴ';inputs[1].dispatchEvent(new Event('input',{bubbles:true,composed:true}));this.querySelector('.correction-form').requestSubmit();}`);
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('にっぽんご');
  expect(await readerEval(page,open)).toEqual(['日本語','にっぽんご']);
  expect(await readerEval(page,`function(){return this.querySelector('.pronunciation').textContent}`)).toContain('にっぽんご');
  await readerEval(page,`function(){Array.from(this.querySelectorAll('.correction-actions button')).find(b=>b.textContent==='Restore automatic reading').click()}`);
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings).toContain('にほんご');
  await settings({readingOverrides:{'日本語を勉強':'にっぽんごをべんきょう'}});
  await expect.poll(()=>readerEval(page,`function(){return this.querySelector('[data-surface="日本語を勉強"]')?.dataset.reading}`)).toBe('にっぽんごをべんきょう');
  expect(await page.locator('body').innerHTML()).toBe(before);
  await page.close();await context.unroute('https://*.wiktionary.org/w/api.php*');await settings({readingOverrides:{},readingView:{...webPanelSettings,sites:{}}});
});

test('panel appearance and resizing preserve content, selection and definition; sites stay independent',async()=>{
  await context.route('https://*.wiktionary.org/w/api.php*',route=>route.fulfill({json:{parse:{title:'日本語',text:'<h2>Japanese</h2><h3>Noun</h3><ol><li>The Japanese language.</li></ol>'}}}));
  await settings({enabled:true,excluded:[],readingOverrides:{},readingView:webPanelSettings});
  const page=await context.newPage();await page.goto(base);
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings,{timeout:30000}).toContain('にほんご');
  await readerEval(page,`function(){const word=this.querySelector('[data-surface="日本語"]');word.click();word.focus();const range=document.createRange();range.selectNodeContents(word);this.getSelection().removeAllRanges();this.getSelection().addRange(range);this.testWord=word;this.changes=0;this.testObserver=new MutationObserver(()=>this.changes++);this.testObserver.observe(this.querySelector('.content'),{childList:true});}`);
  await settings({readingView:{...webPanelSettings,fontSize:28,width:500,spacing:3.4}});
  const metrics=`function(){return {font:getComputedStyle(this.querySelector('.content')).fontSize,width:this.host.getBoundingClientRect().width,same:this.testWord===this.querySelector('[data-surface="日本語"]'),changes:this.changes,definition:this.querySelector('.definition').hidden,selection:this.getSelection().toString()}}`;
  await expect.poll(()=>readerEval(page,metrics)).toMatchObject({font:'28px',width:500,same:true,changes:0,definition:false});
  expect((await readerEval(page,metrics)).selection).toContain('日本語');
  await readerEval(page,`function(){this.querySelector('.resize').focus()}`);await page.keyboard.press('ArrowLeft');
  await expect.poll(()=>context.serviceWorkers()[0].evaluate(async()=> (await chrome.storage.local.get('readingView')).readingView.width)).toBe(510);
  const box=await page.locator('ko-reading-view').boundingBox();
  await page.mouse.move(box!.x,box!.y+30);await page.mouse.down();await page.mouse.move(box!.x-70,box!.y+30);
  expect(await context.serviceWorkers()[0].evaluate(async()=> (await chrome.storage.local.get('readingView')).readingView.width)).toBe(510);
  await page.mouse.up();
  await expect.poll(()=>context.serviceWorkers()[0].evaluate(async()=> (await chrome.storage.local.get('readingView')).readingView.width)).toBe(580);
  await page.reload();await expect.poll(()=>readerEval(page,`function(){return this.host.getBoundingClientRect().width}`)).toBe(580);
  await page.setViewportSize({width:300,height:650});
  await expect.poll(()=>readerEval(page,`function(){return this.host.getBoundingClientRect().width}`)).toBe(276);
  await page.setViewportSize({width:1000,height:800});
  const other=await context.newPage();await other.goto(base.replace('127.0.0.1','localhost'));
  await expect.poll(async()=> (await annotations(other)).length,{timeout:30000}).toBeGreaterThan(0);await expect(other.locator('ko-reading-view')).toHaveCount(0);
  await page.bringToFront();await readerEval(page,`function(){this.querySelector('.header button').click()}`);await expect(page.locator('ko-reading-view')).toHaveCount(0);
  await page.reload();await expect.poll(async()=> (await annotations(page)).length).toBeGreaterThan(0);await expect(page.locator('ko-reading-view')).toHaveCount(0);
  await other.close();await page.close();await context.unroute('https://*.wiktionary.org/w/api.php*');
});

test('popup searches, exports and imports correction backups without losing existing readings',async()=>{
  await settings({readingView:{...webPanelSettings,sites:{}},readingOverrides:{'日本語':'にっぽんご','東京':'とうきょう'}});
  const page=await context.newPage();await page.goto(base);
  const popup=await context.newPage();await page.bringToFront();await popup.goto(`chrome-extension://${extension}/popup.html`);
  await popup.locator('#correction-panel summary').click();
  await popup.locator('#correction-search').fill('トウキョウ');await expect(popup.locator('#corrections li')).toHaveCount(1);
  await popup.getByRole('button',{name:'Edit 東京',exact:true}).click();await popup.locator('#correction-reading').fill('とうきょ');await popup.getByRole('button',{name:'Save correction',exact:true}).click();
  await expect(popup.locator('#correction-search')).toHaveValue('トウキョウ');await expect(popup.locator('#correction-empty')).toBeVisible();
  await popup.locator('#correction-search').fill('日本');await expect(popup.locator('#corrections li')).toHaveCount(1);
  const downloadEvent=popup.waitForEvent('download');await popup.getByRole('button',{name:'Export backup'}).click();const download=await downloadEvent;
  const {readFile}=await import('node:fs/promises');const exported=JSON.parse(await readFile((await download.path())!,'utf8'));
  expect(exported).toEqual({version:1,corrections:{'日本語':'にっぽんご','東京':'とうきょ'}});
  const upload=async(data:unknown)=>popup.locator('#correction-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});
  await upload({version:1,corrections:{'日本語':'にほんご','学校':'ガッコウ'}});
  await expect(popup.locator('#correction-feedback')).toHaveText('Imported 1 corrections; skipped 1 existing words.');
  await expect(popup.locator('#correction-search')).toHaveValue('日本');await expect(popup.locator('#corrections')).toContainText('にっぽんご');
  const snapshot=await context.serviceWorkers()[0].evaluate(()=>chrome.storage.local.get('readingOverrides'));
  await upload({version:1,corrections:{'京都':'きょうと','学校':17}});await expect(popup.locator('#correction-feedback')).toContainText('invalid');
  expect(await context.serviceWorkers()[0].evaluate(()=>chrome.storage.local.get('readingOverrides'))).toEqual(snapshot);
  await upload('{');await expect(popup.locator('#correction-feedback')).toContainText('JSON');
  await upload(' '.repeat(256*1024+1));await expect(popup.locator('#correction-feedback')).toContainText('256 KiB');
  await popup.screenshot({path:test.info().outputPath('popup-correction-backups.png')});
  await popup.close();await page.close();await settings({readingOverrides:{}});
});

test('legacy Docs preferences migrate through popup without enabling other websites',async()=>{
  const worker=context.serviceWorkers()[0];await worker.evaluate(async()=>{await chrome.storage.local.remove('readingView');await chrome.storage.local.set({docsReadingView:{enabled:true,spacing:3.4}});});
  const page=await context.newPage();await page.route('https://docs.google.com/document/d/migrate/edit',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><style>.kix-appview-editor{position:absolute;top:100px;width:900px;height:600px}</style><div class="kix-appview-editor"><svg width="900" height="600"><rect x="40" y="60" width="150" height="28" data-font-css="24px system-ui" aria-label="日本語"/></svg></div>'}));await page.goto('https://docs.google.com/document/d/migrate/edit');
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.readings,{timeout:30000}).toContain('にほんご');
  const popup=await context.newPage();await page.bringToFront();await popup.goto(`chrome-extension://${extension}/popup.html`);await popup.locator('#view-reading-panel summary').click();
  await expect(popup.locator('#view-reading-enabled')).toBeChecked();await expect(popup.locator('#view-reading-spacing')).toHaveValue('3.4');
  await popup.locator('#panel-font-size').selectOption('24');
  await expect.poll(()=>worker.evaluate(async()=> (await chrome.storage.local.get('readingView')).readingView)).toEqual({sites:{'docs.google.com':true},spacing:3.4,fontSize:24,width:420});
  await page.screenshot({path:test.info().outputPath('docs-custom-reading-panel.png')});
  await popup.close();await page.close();await settings({docsReadingView:{enabled:false,spacing:2.8}});
});

test('web panel clips offscreen wrapped text, preserves hard breaks and shadow order, and stays out of frames',async()=>{
  await settings({enabled:true,excluded:[],readingOverrides:{},readingView:webPanelSettings});
  const page=await context.newPage();
  await page.route(`${base}/reader-boundaries`,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{margin:0;font:24px/2 system-ui}.clipped{position:absolute;top:-500px;left:20px;width:240px}</style><p class="clipped">最初の印。${'学校で日本語を勉強する。'.repeat(50)}最後の印。</p><p style="position:absolute;left:700px;top:20px">こんにちは。<br>ありがとう。</p><div id="shadow" style="position:absolute;left:350px;top:300px"></div><iframe style="position:absolute;top:650px" srcdoc="<p>埋め込みの文章。</p>"></iframe>`}));
  await page.goto(`${base}/reader-boundaries`);
  await page.locator('#shadow').evaluate(el=>{el.attachShadow({mode:'open'}).innerHTML='<p>順序一。</p><p>順序二。</p>';document.dispatchEvent(new Event('scroll'));});
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.lines,{timeout:30000}).toContain('こんにちは。\nありがとう。');
  await expect.poll(async()=> (await readerEval(page,readerSnapshot))?.lines).toContain('順序一。');
  const snapshot=await readerEval(page,readerSnapshot);
  expect(snapshot.lines.join('')).not.toMatch(/最初の印|最後の印|埋め込みの文章/);
  expect(snapshot.lines.indexOf('順序一。')).toBeGreaterThan(-1);
  expect(snapshot.lines.indexOf('順序二。')).toBeGreaterThan(snapshot.lines.indexOf('順序一。'));
  for(const frame of page.frames())if(frame!==page.mainFrame())await expect(frame.locator('ko-reading-view')).toHaveCount(0);
  await page.close();await settings({readingView:{...webPanelSettings,sites:{}}});
});
