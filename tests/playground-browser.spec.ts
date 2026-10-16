import {test,expect,chromium,type Browser,type Page} from '@playwright/test';
import {build} from 'esbuild';
import kuromoji from 'kuromoji';
import {hiragana,type Word} from '../src/shared';

let browser:Browser,source:string,tokenizer:kuromoji.Tokenizer<kuromoji.IpadicFeatures>;
test.beforeAll(async()=>{
  tokenizer=await new Promise((resolve,reject)=>kuromoji.builder({dicPath:'node_modules/kuromoji/dict/'}).build((error,value)=>error?reject(error):resolve(value)));
  const bundle=await build({stdin:{contents:"export * from './src/playground-browser';export * from './src/exploration';export * from './src/verb-playground';export * from './src/reading-panel';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',target:'chrome116',format:'iife',globalName:'playgroundModule',define:{__KO_LOGO_SVG__:JSON.stringify('<svg viewBox="0 0 24 24"></svg>')}});
  source=bundle.outputFiles[0].text;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
});
test.afterAll(async()=>{await browser?.close();});

function analyze(text:string):Word[] {
  let offset=0;
  return tokenizer.tokenize(text).flatMap(token=>{
    const start=text.indexOf(token.surface_form,offset);offset=start+token.surface_form.length;
    if(!/[\p{L}\p{N}]/u.test(token.surface_form))return [];
    const lemma=token.basic_form && token.basic_form!=='*'?token.basic_form:token.surface_form;
    return [{start,end:offset,lemma,reading:hiragana(token.reading ?? ''),pos:token.pos,posDetail:token.pos_detail_1,
      ...(token.word_type==='KNOWN' && token.conjugated_type && token.conjugated_type!=='*'?{verbClass:token.conjugated_type,verbForm:token.conjugated_form}:{}),
      ...(token.pos==='動詞' && token.word_type==='KNOWN'?{lemmaReading:hiragana(tokenizer.tokenize(lemma).map(part=>part.reading ?? '').join(''))}:{})}];
  });
}
async function setup(page:Page) {
  await page.setContent('<!doctype html><meta charset="utf-8"><style>:root{--paper:#f4ecd8;--surface:#e6dec9;--ink:#242b2d;--line:#242b2d;--accent:#294c66;--muted:#535a5b;--body:system-ui}body{margin:16px}*{box-sizing:border-box}button{padding:7px}</style>');
  await page.exposeFunction('analyzeLocal',(texts:string[])=>texts.map(analyze));
  await page.addScriptTag({content:source});
  await page.evaluate(()=>{
    const module=(window as any).playgroundModule;
    const style=document.createElement('style');style.textContent=module.explorationStyles+module.playgroundBrowserStyles;document.head.append(style);
    const tokenize=(texts:string[],signal:AbortSignal)=>{if(signal.aborted)return Promise.reject(new Error('Aborted'));return (window as any).analyzeLocal(texts);};
    const app=module.renderPlaygroundBrowser({tokenize});(window as any).app=app;document.body.append(app.element);app.focus();
  });
}
async function plain(page:Page) {
  return page.locator('.verb-japanese').evaluate(el=>{const copy=el.cloneNode(true) as HTMLElement;copy.querySelectorAll('rt').forEach(rt=>rt.remove());return copy.textContent;});
}
async function checkVerb(page:Page,input:string) {
  if(await page.getByRole('button',{name:'Change verb',exact:true}).isVisible())await page.getByRole('button',{name:'Change verb',exact:true}).click();
  await page.getByLabel('Dictionary-form verb',{exact:true}).fill(input);await page.getByRole('button',{name:'Check verb locally',exact:true}).click();
}

test('verbs open with free input only, while mimetic search, categories, keyboard and narrow layout work offline',async()=>{
  const page=await browser.newPage({viewport:{width:280,height:950},reducedMotion:'reduce'});const requests:string[]=[];page.on('request',request=>requests.push(request.url()));
  try {
    await page.context().setOffline(true);await setup(page);
    await expect(page.getByLabel('Dictionary-form verb',{exact:true})).toBeFocused();await expect(page.locator('.playground-entry')).toHaveCount(0);
    await expect(page.getByLabel('Search mimetic expressions')).toBeHidden();await expect(page.locator('.playground-count')).toBeHidden();
    await checkVerb(page,'食べる');await page.locator('.playground-confirmation button').click();
    await expect.poll(()=>plain(page)).toBe('食べる');await expect(page.locator('.explore-source rt')).toHaveText('た');
    await page.getByRole('button',{name:'Change verb',exact:true}).click();await expect(page.getByLabel('Dictionary-form verb',{exact:true})).toBeFocused();
    await expect(page.getByLabel('Dictionary-form verb',{exact:true})).toHaveValue('食べる');await expect(page.locator('.playground-entry')).toHaveCount(0);
    await page.getByRole('tab',{name:'Verbs',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Mimetics',exact:true})).toBeFocused();
    await page.getByLabel('Search mimetic expressions').fill('');await expect(page.locator('.playground-count')).toHaveText('60 expressions');
    await page.getByLabel('Mimetic category').selectOption('people');expect(await page.locator('.playground-entry').count()).toBeGreaterThan(0);
    await page.getByLabel('Mimetic category').selectOption('');await page.getByLabel('Search mimetic expressions').fill('ｻﾞｰｻﾞｰ');await expect(page.locator('.playground-entry')).toHaveCount(1);
    await page.locator('.playground-entry').click();await expect(page.locator('.mimetic-term')).toHaveText('ざあざあ');await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeHidden();
    await page.getByRole('button',{name:'Back to examples',exact:true}).click();await page.getByLabel('Search mimetic expressions').fill('sleep');expect(await page.locator('.playground-entry').count()).toBeGreaterThan(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(requests).toEqual([]);
    await page.locator('.playground-entry').first().click();
    const navigationVisible=await page.evaluate(()=>{
      const root=document.querySelector<HTMLElement>('.playground-browser')!;root.style.height='300px';
      const scroller=root.querySelector('.playground-scroll')!;scroller.scrollTop=scroller.scrollHeight;
      const button=root.querySelector('.playground-back')!.getBoundingClientRect(),bounds=root.getBoundingClientRect();return button.top>=bounds.top && button.bottom<=bounds.bottom;
    });expect(navigationVisible).toBe(true);
  } finally {await page.close();}
});

test('applicable switches preserve compatible values, clear incompatible values, and shorten spoken constructions',async()=>{
  const page=await browser.newPage();
  try {
    await setup(page);await page.evaluate(()=>{
      const m=(window as any).playgroundModule;
      const model=m.createVerbPlayground({lemma:'食べる',reading:'たべる',verbClass:'一段'},{text:'食べませんでした',reading:'たべませんでした'});
      document.querySelector('.playground-selection')!.append(m.renderVerbPlayground(model));
    });
    const select=page.getByLabel('Verb form');await expect(page.locator('.verb-controls input')).toHaveCount(3);
    await select.selectOption('te');await expect(page.locator('.verb-controls input')).toHaveCount(1);await expect.poll(()=>plain(page)).toBe('食べなくて');
    await select.selectOption('volitional');await expect(page.locator('.verb-controls input')).toHaveCount(1);await expect.poll(()=>plain(page)).toBe('食べよう');
    await select.selectOption('teIru');await expect(page.locator('.verb-controls input')).toHaveCount(4);await page.getByLabel('Spoken shortening',{exact:true}).check();await expect.poll(()=>plain(page)).toBe('食べてる');
    await page.getByLabel('Negative',{exact:true}).check();await expect.poll(()=>plain(page)).toBe('食べてない');
    await select.selectOption('simple');await expect(page.getByLabel('Spoken shortening',{exact:true})).toHaveCount(0);await expect.poll(()=>plain(page)).toBe('食べない');
    await page.getByRole('button',{name:'Reset',exact:true}).click();await expect.poll(()=>plain(page)).toBe('食べませんでした');
    await select.selectOption('conditionalTara');await expect(page.getByLabel('Past',{exact:true})).toHaveCount(0);await expect(page.locator('.verb-explanation')).toContainText('past');
  } finally {await page.close();}
});

test('Reset preserves original imperative and polite desire aliases exactly',async()=>{
  const page=await browser.newPage();
  try {
    await setup(page);
    for(const [text,reading] of [['食べよ','たべよ'],['食べたくありません','たべたくありません']]) {
      await page.evaluate(({text,reading})=>{
        const m=(window as any).playgroundModule;const target=document.querySelector('.playground-selection')!;target.replaceChildren(m.renderVerbPlayground(m.createVerbPlayground({lemma:'食べる',reading:'たべる',verbClass:'一段'},{text,reading})));
      },{text,reading});
      await expect.poll(()=>plain(page)).toBe(text);await page.getByLabel('Verb form').selectOption('simple');await expect.poll(()=>plain(page)).not.toBe(text);
      await page.getByRole('button',{name:'Reset',exact:true}).click();await expect.poll(()=>plain(page)).toBe(text);
    }
  } finally {await page.close();}
});

test('typed verbs require confirmation of reading and class, accept compounds and reject sentences or conjugated input',async()=>{
  const page=await browser.newPage();
  try {
    await setup(page);await page.context().setOffline(true);
    await checkVerb(page,'食べる');await expect(page.locator('.playground-confirmation')).toContainText('たべる');await expect(page.locator('.playground-confirmation')).toContainText('Ichidan');await expect(page.locator('.verb-playground')).toHaveCount(0);
    await page.locator('.playground-confirmation button').first().click();await expect.poll(()=>plain(page)).toBe('食べる');await expect(page.getByLabel('Verb form').locator('option[value="causativePassive"]')).toHaveCount(1);
    await checkVerb(page,'勉強する');await expect(page.locator('.playground-confirmation')).toContainText('べんきょうする');await page.locator('.playground-confirmation button').first().click();await page.getByLabel('Verb form').selectOption('potential');await expect.poll(()=>plain(page)).toBe('勉強できる');
    for(const value of ['食べた','学校へ行く','xyzzyる','食べる。','あ'.repeat(40)]) {
      await checkVerb(page,value);await expect(page.locator('.playground-feedback')).toContainText(/dictionary-form|recognized dictionary/u);await expect(page.locator('.playground-confirmation button')).toHaveCount(0);await expect(page.locator('.verb-playground')).toHaveCount(0);
    }
    await expect(page.getByLabel('Dictionary-form verb',{exact:true})).toHaveAttribute('maxlength','40');
  } finally {await page.close();}
});

test('typed いる and verified fused potential bases require explicit choices without double potential',async()=>{
  const page=await browser.newPage();
  try {
    await setup(page);await checkVerb(page,'いる');await expect.poll(()=>page.locator('.playground-confirmation button').count()).toBeGreaterThanOrEqual(2);await expect(page.locator('.playground-confirmation')).toContainText('Godan');await expect(page.locator('.playground-confirmation')).toContainText('Ichidan');
    await checkVerb(page,'読める');await expect(page.locator('.playground-confirmation')).toContainText('Potential of 読む');await expect(page.locator('.verb-playground')).toHaveCount(0);
    await page.locator('.playground-confirmation button').filter({hasText:'Potential of 読む'}).click();await expect.poll(()=>plain(page)).toBe('読める');await page.getByLabel('Verb form').selectOption('simple');await expect.poll(()=>plain(page)).toBe('読む');await page.getByLabel('Verb form').selectOption('potential');await expect.poll(()=>plain(page)).toBe('読める');
    await page.getByRole('button',{name:'Reset',exact:true}).click();await expect.poll(()=>plain(page)).toBe('読める');
    await checkVerb(page,'みれる');await expect(page.locator('.playground-feedback')).toContainText('outside the supported forms');await expect(page.locator('.playground-confirmation button')).toHaveCount(0);await expect(page.locator('.verb-playground')).toHaveCount(0);
  } finally {await page.close();}
});

test('ambiguous られる has no assigned interpretation until chosen, and Reset restores the choice gate',async()=>{
  const page=await browser.newPage();
  try {
    await setup(page);await page.evaluate(()=>{
      const m=(window as any).playgroundModule;document.querySelector('.playground-selection')!.append(m.renderVerbPlayground(m.createVerbPlayground({lemma:'食べる',reading:'たべる',verbClass:'一段'},{text:'食べられる',reading:'たべられる'})));
    });
    await expect(page.getByLabel('Verb form')).toBeHidden();await expect(page.locator('.verb-ambiguity')).toBeVisible();await expect(page.locator('.verb-state')).toContainText('Choose an interpretation');
    await page.locator('.verb-ambiguity button').filter({hasText:/potential/iu}).click();await expect(page.getByLabel('Verb form')).toBeVisible();await page.getByLabel('Negative',{exact:true}).check();await expect.poll(()=>plain(page)).toBe('食べられない');
    await page.getByRole('button',{name:'Reset',exact:true}).click();await expect.poll(()=>plain(page)).toBe('食べられる');await expect(page.locator('.verb-ambiguity')).toBeVisible();
  } finally {await page.close();}
});

test('typing, tab changes and disposal cancel pending analysis and ignore late replies',async()=>{
  const page=await browser.newPage();
  try {
    await setup(page);await page.evaluate(()=>{
      (window as any).app.dispose();document.body.querySelector('.playground-browser')?.remove();
      const m=(window as any).playgroundModule;(window as any).pending=[];
      const app=m.renderPlaygroundBrowser({tokenize:(texts:string[],signal:AbortSignal)=>new Promise(resolve=>(window as any).pending.push({texts,signal,resolve}))});(window as any).app=app;document.body.append(app.element);
    });
    await checkVerb(page,'食べる');await page.getByLabel('Dictionary-form verb',{exact:true}).fill('読む');expect(await page.evaluate(()=>(window as any).pending[0].signal.aborted)).toBe(true);
    await page.evaluate(words=>(window as any).pending[0].resolve([words]),analyze('食べる'));await expect(page.locator('.playground-confirmation button')).toHaveCount(0);
    await page.getByRole('button',{name:'Check verb locally',exact:true}).click();await page.getByRole('tab',{name:'Mimetics',exact:true}).click();expect(await page.evaluate(()=>(window as any).pending[1].signal.aborted)).toBe(true);
    await page.evaluate(words=>(window as any).pending[1].resolve([words]),analyze('読む'));await expect(page.locator('.playground-confirmation button')).toHaveCount(0);
    await page.getByRole('tab',{name:'Verbs',exact:true}).click();await checkVerb(page,'食べる');await page.evaluate(()=>(window as any).app.dispose());expect(await page.evaluate(()=>(window as any).pending[2].signal.aborted)).toBe(true);
    await page.evaluate(words=>(window as any).pending[2].resolve([words]),analyze('食べる'));await expect(page.locator('.playground-confirmation button')).toHaveCount(0);
  } finally {await page.close();}
});

test('page-selected fused potentials verify bases before offering transformations, and disposal cancels probes',async()=>{
  const page=await browser.newPage();
  try {
    await setup(page);await page.evaluate(words=>{
      const m=(window as any).playgroundModule;const models=m.wordExplorations('読める',words,0,'読める',{});
      const panel=m.renderExplorations(models,{tokenize:(texts:string[])=>(window as any).analyzeLocal(texts)});panel.hidden=false;document.querySelector('.playground-selection')!.replaceChildren(panel);
    },analyze('読める'));
    await expect(page.locator('.verb-base-choices')).toContainText('Potential of 読む');await expect(page.locator('.verb-playground')).toHaveCount(0);
    await page.locator('.verb-base-choices button').filter({hasText:'dictionary entry'}).click();await expect.poll(()=>plain(page)).toBe('読める');await expect(page.getByLabel('Verb form').locator('option[value="potential"]')).toHaveCount(0);
    await page.evaluate(words=>{
      const m=(window as any).playgroundModule;(window as any).pending=[];
      const panel=m.renderExplorations(m.wordExplorations('読める',words,0,'読める',{}),{tokenize:(texts:string[],signal:AbortSignal)=>new Promise(resolve=>(window as any).pending.push({texts,signal,resolve}))});panel.hidden=false;document.querySelector('.playground-selection')!.replaceChildren(panel);m.disposeExplorations(panel);
    },analyze('読める'));
    expect(await page.evaluate(()=>(window as any).pending[0].signal.aborted)).toBe(true);
    await page.evaluate(words=>(window as any).pending[0].resolve([words]),analyze('読む'));await expect(page.locator('.verb-base-choices button')).toHaveCount(0);await expect(page.locator('.verb-playground')).toHaveCount(0);
  } finally {await page.close();}
});

test('verified potential chains stay restricted and failed probes never restore unsupported source controls',async()=>{
  const page=await browser.newPage();
  try {
    await setup(page);
    await page.evaluate(words=>{
      const m=(window as any).playgroundModule;const panel=m.renderExplorations(m.wordExplorations('読めたら',words,0,'読め',{}),{tokenize:(texts:string[])=>(window as any).analyzeLocal(texts)});panel.hidden=false;document.querySelector('.playground-selection')!.replaceChildren(panel);
    },analyze('読めたら'));
    await expect(page.getByLabel('Verb form')).toBeVisible();await expect(page.getByLabel('Verb form').locator('option[value="potential"]')).toHaveCount(0);await expect(page.getByLabel('Verb form').locator('option[value="causative"]')).toHaveCount(0);await expect.poll(()=>plain(page)).toBe('読めたら');
    await page.evaluate(words=>{
      const m=(window as any).playgroundModule;const panel=m.renderExplorations(m.wordExplorations('読めたい',words,0,'読め',{}),{tokenize:()=>Promise.reject(new Error('Local worker unavailable'))});panel.hidden=false;document.querySelector('.playground-selection')!.replaceChildren(panel);
    },analyze('読めたい'));
    await expect(page.locator('.playground-selection')).toContainText('Could not verify');await expect(page.locator('.verb-playground')).toHaveCount(0);
  } finally {await page.close();}
});


test('opening Playgrounds during initial reading analysis preserves the workspace and typed verb',async()=>{
  const page=await browser.newPage();
  try {
    await page.setContent('<!doctype html><meta charset="utf-8">');await page.addScriptTag({content:source});
    const initial=await page.evaluate(()=>{
      const module=(window as any).playgroundModule;
      // Capture only this test's closed root; production isolation is unchanged.
      let root:ShadowRoot;const attach=Element.prototype.attachShadow;
      Element.prototype.attachShadow=function(options){const value=attach.call(this,options);root=value;return value;};
      let panel:any;try{panel=new module.ReadingPanel(()=>{},async()=>{});}finally{Element.prototype.attachShadow=attach;}
      (window as any).readerPanel=panel;(window as any).readerRoot=root!;
      panel.loading(true,'Analyzing visible text…');
      root!.querySelector<HTMLButtonElement>('.playgrounds-open')!.click();
      const input=root!.querySelector<HTMLInputElement>('.playground-verb-input input')!;input.value='食べる';input.dispatchEvent(new Event('input'));
      const workspace=root!.querySelector('.playground-browser');
      panel.display([{text:'日本語',top:0,left:0,right:60,readings:[{start:0,end:3,reading:'にほんご'}]}],'web',{sites:{},width:420,fontSize:20,spacing:2.8},{scale:1,contrast:'auto'},100,false);
      return {same:root!.querySelector('.playground-browser')===workspace,value:input.value,focused:root!.activeElement===input};
    });
    expect(initial).toEqual({same:true,value:'食べる',focused:true});
    expect(await page.evaluate(()=>{const root=(window as any).readerRoot as ShadowRoot;root.querySelector<HTMLButtonElement>('.playgrounds-open')!.click();return {reading:root.querySelector('.content')!.textContent,visible:getComputedStyle(root.querySelector('.content')!).display};})).toEqual({reading:'日本語にほんご',visible:'block'});
  } finally {await page.close();}
});
