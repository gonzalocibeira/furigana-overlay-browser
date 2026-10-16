import {test,expect,chromium,type Browser,type Page} from '@playwright/test';
import {build} from 'esbuild';
import kuromoji from 'kuromoji';
import {findMimetic,matchMimeticAt,mimeticEntries,normalizeMimetic} from '../src/mimetic-playground';
import type {Word} from '../src/shared';

const katakana=(word:string)=>word.replace(/[ぁ-ゖ]/g,char=>String.fromCharCode(char.charCodeAt(0)+0x60));
const narrowKana=new Map(Array.from({length:0xFF9D-0xFF66+1},(_,index)=>{
  const half=String.fromCharCode(0xFF66+index);return [half.normalize('NFKC'),half];
}));
narrowKana.set('\u3099','ﾞ');narrowKana.set('\u309A','ﾟ');
const halfwidth=(word:string)=>[...katakana(word).normalize('NFD')].map(char=>narrowKana.get(char)??char).join('');
const inventory=[
  'ころころ/ごろごろ','くるくる/ぐるぐる','きらきら/ぎらぎら','しとしと/ざあざあ','さらさら/ざらざら','にこにこ/にやにや',
  'わくわく/どきどき','いらいら/むかむか','ほっと/すっきり','はらはら/おろおろ','うとうと/ぐっすり','くたくた/ぐったり',
  'ずきずき/ちくちく','ぺこぺこ/ぱんぱん','ふらふら/よろよろ','ぽかぽか/ひんやり','のろのろ/すたすた','ばたばた/てきぱき',
  'うろうろ/ぶらぶら','じっと/じろじろ','くすくす/げらげら','しくしく/わんわん','ふわふわ/もちもち','しっとり/じっとり',
  'ねばねば/べたべた','つるつる/ぬるぬる','さくさく/かりかり','からから/かさかさ','がやがや/ざわざわ','とんとん/どんどん'
];

test('only complete curated mimetics match, with the encountered variant selected',()=>{
  expect(mimeticEntries).toHaveLength(30);
  expect(mimeticEntries.map(entry=>entry.variants.map(variant=>variant.term).join('/'))).toEqual(inventory);
  expect(new Set(mimeticEntries.map(entry=>entry.id)).size).toBe(30);
  expect(new Set(mimeticEntries.map(entry=>entry.category))).toEqual(new Set(['movement','nature','texture','people','feelings','body','sounds']));
  const words=new Set<string>();
  const aliases=new Set<string>();
  for(const entry of mimeticEntries)for(const [index,variant] of entry.variants.entries()) {
    expect(entry.keywords.length).toBeGreaterThan(0);
    expect(words.has(variant.term)).toBe(false);words.add(variant.term);
    for(const spelling of [variant.term,katakana(variant.term),halfwidth(variant.term),variant.term.normalize('NFD'),...variant.aliases.flatMap(alias=>[alias,katakana(alias),halfwidth(alias)])]) {
      const match=findMimetic(spelling);
      expect(match?.id).toBe(entry.id);expect(match?.initialVariant).toBe(index);
      expect(match?.variants[index].term).toBe(variant.term);
    }
    for(const alias of variant.aliases) {
      expect(aliases.has(normalizeMimetic(alias))).toBe(false);aliases.add(normalizeMimetic(alias));
      expect(variant.term).not.toBe(normalizeMimetic(alias));
    }
    expect(variant.example).toContain(variant.term);
    expect(variant.translation.length).toBeGreaterThan(10);
    expect(variant.sceneDescription.length).toBeGreaterThan(10);
    expect(variant.otherUses.length).toBeGreaterThan(10);
    const url=new URL(variant.reference.url);
    expect(url.protocol).toBe('https:');
    expect(['www2.ninjal.ac.jp','kotobank.jp']).toContain(url.hostname);
  }
  expect(words.size).toBe(60);
  expect([...aliases].every(alias=>!words.has(alias))).toBe(true);
  for(const surface of ['', ' ころころ','ころころと','ころころ。','ころっ','ごろり','きらーきら','ざーーざーー','ざざ','ふわっと','ふわーふわー','雨がしとしと降る','<script>ころころ</script>'])expect(findMimetic(surface),surface).toBeUndefined();
  // Finding one variant cannot change the shared default or another result.
  findMimetic('ごろごろ');expect(findMimetic('ころころ')?.initialVariant).toBe(0);
  expect(mimeticEntries.every(entry=>entry.initialVariant===0)).toBe(true);
  // These publisher URLs use full-size つ in the slug even though the headword has small っ.
  for(const [term,slug,id] of [['ぐったり','ぐつたり',3210060],['しっとり','しつとり',3211894],['じっとり','じつとり',3211895]] as const) {
    const entry=findMimetic(term)!;
    expect(entry.variants[entry.initialVariant].reference.url).toBe(`https://kotobank.jp/word/${encodeURIComponent(slug)}-${id}`);
  }
});

let browser:Browser,source:string,tokenizer:kuromoji.Tokenizer<kuromoji.IpadicFeatures>;
test.beforeAll(async()=>{
  tokenizer=await new Promise((resolve,reject)=>kuromoji.builder({dicPath:'node_modules/kuromoji/dict/'}).build((error,value)=>error?reject(error):resolve(value)));
  const bundle=await build({stdin:{contents:"export * from './src/mimetic-playground';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',target:'chrome116',format:'iife',globalName:'mimeticModule'});
  source=bundle.outputFiles[0].text;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
});
test.afterAll(async()=>{await browser?.close();});

function analyze(text:string):Word[] {
  let cursor=0;
  return tokenizer.tokenize(text).map(token=>{
    const start=text.indexOf(token.surface_form,cursor);cursor=start+token.surface_form.length;
    return {start,end:cursor,lemma:token.basic_form,reading:token.reading??''};
  });
}

test('joined recognition works for every expression and alias with actual dictionary tokenization',()=>{
  for(const entry of mimeticEntries)for(const [variantIndex,variant] of entry.variants.entries()) {
    for(const spelling of [variant.term,katakana(variant.term),halfwidth(variant.term),...variant.aliases.flatMap(alias=>[alias,katakana(alias),halfwidth(alias)])]) {
      const text=`例：${spelling}。`,start=2,end=start+spelling.length,words=analyze(text);
      for(let index=0;index<words.length;index++) {
        if(words[index].start>=start&&words[index].end<=end) {
          const match=matchMimeticAt(text,words,index);
          expect(match?.entry.id,`${spelling}, token ${index}`).toBe(entry.id);
          expect(match?.entry.initialVariant).toBe(variantIndex);
          expect([match?.start,match?.end]).toEqual([start,end]);
        }
      }
    }
    const position=variant.example.indexOf(variant.term),words=analyze(variant.example);
    for(let index=0;index<words.length;index++)if(words[index].start>=position&&words[index].end<=position+variant.term.length) {
      expect(matchMimeticAt(variant.example,words,index)?.entry.id,variant.example).toBe(entry.id);
    }
  }
});

test('joined recognition preserves boundaries, gaps, offsets and the longest complete expression',()=>{
  const word=(start:number,end:number):Word=>({start,end,lemma:'',reading:''});
  expect(matchMimeticAt('しっとり',[word(0,2),word(2,4)],1)?.entry.id).toBe('moisture');
  expect(matchMimeticAt('じっとり',[word(0,3),word(3,4)],0)?.entry.variants[1].term).toBe('じっとり');
  expect(matchMimeticAt('しっ とり',[word(0,2),word(3,5)],1)).toBeUndefined();
  expect(matchMimeticAt('ころころする',[word(0,6)],0)).toBeUndefined();
  expect(matchMimeticAt('ころころ。',[word(0,4),word(4,5)],1)).toBeUndefined();
  expect(matchMimeticAt('ざーざー',[word(0,4)],0)?.entry.initialVariant).toBe(1);
  for(const index of [-1,.5,1])expect(matchMimeticAt('ころころ',[word(0,4)],index)).toBeUndefined();
  for(const broken of [word(-1,4),word(0,10),word(2,1),word(.5,4)])expect(matchMimeticAt('ころころ',[broken],0)).toBeUndefined();
  expect(normalizeMimetic('ｻﾞｰｻﾞｰ')).toBe('ざーざー');
  expect(normalizeMimetic(' ころころ')).toBe(' ころころ');
});

async function render(page:Page,word:string) {
  await page.setContent('<!doctype html><meta charset="utf-8"><style>:root{--paper:#f4ecd8;--surface:#e6dec9;--ink:#242b2d;--line:#242b2d;--accent:#294c66;--muted:#535a5b}body{margin:16px}*{box-sizing:border-box}</style>');
  await page.addScriptTag({content:source});
  await page.evaluate(word=>{
    const module=(window as any).mimeticModule;
    const style=document.createElement('style');style.textContent=module.mimeticStyles;document.head.append(style);
    document.body.append(module.renderMimeticPlayground(module.findMimetic(word)));
  },word);
}

for(const entry of mimeticEntries) {
  test(`${entry.id} switches the complete explanation and scene offline at minimum panel width`,async()=>{
    const page=await browser.newPage({viewport:{width:280,height:800}});
    const requests:string[]=[];page.on('request',request=>requests.push(request.url()));
    try {
      await page.context().setOffline(true);
      await render(page,katakana(entry.variants[1].term));
      await expect(page.getByRole('region',{name:'Mimetic Playground'})).toHaveCount(1);
      await expect(page.getByRole('button',{name:entry.variants[1].term,exact:true})).toHaveAttribute('aria-pressed','true');
      for(const [index,variant] of entry.variants.entries()) {
        const button=page.getByRole('button',{name:variant.term,exact:true});
        await button.focus();await page.keyboard.press('Space');
        await expect(button).toBeFocused();await expect(button).toHaveAttribute('aria-pressed','true');
        await expect(page.locator('.mimetic-term')).toHaveText(variant.term);
        await expect(page.locator('.mimetic-gloss')).toHaveText(variant.gloss);
        await expect(page.locator('.mimetic-example')).toHaveText(variant.example);
        await expect(page.locator('.mimetic-translation')).toHaveText(variant.translation);
        await expect(page.locator('.mimetic-caption')).toHaveText(variant.sceneDescription);
        await expect(page.locator('.mimetic-uses')).toHaveText(variant.otherUses);
        await expect(page.locator('.mimetic-art')).toHaveAttribute('data-variant',String(index));
        await expect(page.locator('.mimetic-art')).toHaveAttribute('data-scene',entry.id);
        await expect(page.locator('.mimetic-reference')).toHaveAttribute('href',variant.reference.url);
        await expect(page.locator('.mimetic-reference')).toHaveAttribute('rel','noopener noreferrer');
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      }
      expect(requests).toEqual([]);
    } finally {await page.close();}
  });
}

test('replay starts a finite animation without changing the chosen expression',async()=>{
  const page=await browser.newPage();
  try {
    await render(page,'ごろごろ');
    expect(await page.locator('.mimetic-art').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
    await page.evaluate(()=>{(window as any).previousArt=document.querySelector('.mimetic-art');});
    await page.getByRole('button',{name:'Replay scene',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).previousArt!==document.querySelector('.mimetic-art'))).toBe(true);
    await expect(page.locator('.mimetic-term')).toHaveText('ごろごろ');
    const timing=await page.locator('.mimetic-art').evaluate(el=>el.getAnimations({subtree:true}).map(animation=>animation.effect!.getTiming()));
    expect(timing.length).toBeGreaterThan(0);
    expect(timing.every(item=>item.iterations!==Infinity && Number(item.duration)*item.iterations<=3000)).toBe(true);
    await page.locator('.mimetic-art').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.finished)));
    expect(await page.locator('.mimetic-art').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
  } finally {await page.close();}
});

test('all sixty scenes have distinct artwork and finite replay without automatic motion',async()=>{
  const page=await browser.newPage();
  try {
    await render(page,'ころころ');
    const scenes=await page.evaluate(()=>{
      const module=(window as any).mimeticModule;
      const results=[];
      for(const entry of module.mimeticEntries)for(const [index,variant] of entry.variants.entries()) {
        const root=module.renderMimeticPlayground({...entry,initialVariant:index});
        document.body.replaceChildren(root);
        const art=root.querySelector('.mimetic-art');
        const initialAnimations=art.getAnimations({subtree:true}).length;
        const markup=art.innerHTML;
        (root.querySelector('.mimetic-replay') as HTMLButtonElement).click();
        const replay=root.querySelector('.mimetic-art');
        const timings=replay.getAnimations({subtree:true}).map((animation:Animation)=>animation.effect!.getTiming());
        results.push({id:entry.id,term:variant.term,markup,initialAnimations,timings});
      }
      return results;
    });
    expect(scenes).toHaveLength(60);
    expect(new Set(scenes.map(item=>item.markup)).size).toBe(60);
    for(const item of scenes) {
      expect(item.initialAnimations,item.term).toBe(0);
      expect(item.timings.length,item.term).toBeGreaterThan(0);
      expect(item.timings.every((timing:any)=>timing.iterations!==Infinity&&Number(timing.duration)*timing.iterations<3000),item.term).toBe(true);
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    const animations=await page.evaluate(()=>{
      const module=(window as any).mimeticModule;
      return module.mimeticEntries.flatMap((entry:any)=>entry.variants.map((_:any,index:number)=>{
        const root=module.renderMimeticPlayground({...entry,initialVariant:index});document.body.replaceChildren(root);
        (root.querySelector('.mimetic-replay') as HTMLButtonElement).click();
        return root.querySelector('.mimetic-art').getAnimations({subtree:true}).length;
      }));
    });
    expect(animations.every((count:number)=>count===0)).toBe(true);
  } finally {await page.close();}
});

test('reduced motion keeps scenes static while expression comparisons remain usable',async()=>{
  const page=await browser.newPage({reducedMotion:'reduce'});
  try {
    await render(page,'しとしと');
    await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeHidden();
    await expect(page.locator('.mimetic-motion-note')).toBeVisible();
    await page.getByRole('button',{name:'ざあざあ',exact:true}).click();
    await expect(page.locator('.mimetic-term')).toHaveText('ざあざあ');
    await expect(page.locator('.mimetic-caption')).toHaveText(mimeticEntries.find(entry=>entry.id==='rain')!.variants[1].sceneDescription);
    expect(await page.locator('.mimetic-art').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
    // Changing the preference while the card is open also takes effect.
    await page.emulateMedia({reducedMotion:'no-preference'});
    await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeVisible();
    await page.emulateMedia({reducedMotion:'reduce'});
    expect(await page.locator('.mimetic-art').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
  } finally {await page.close();}
});

test('authored text is rendered as text and unsafe reference links are suppressed',async()=>{
  const page=await browser.newPage();
  try {
    await render(page,'にこにこ');
    await page.evaluate(()=>{
      const module=(window as any).mimeticModule;
      const entry=module.findMimetic('にこにこ');
      const variant={...entry.variants[0],term:'<img src=x onerror=alert(1)>',example:'<script>alert(1)</script>',reference:{label:'Unsafe',url:'javascript:alert(1)'}};
      document.body.replaceChildren(module.renderMimeticPlayground({...entry,variants:[variant,entry.variants[1]]}));
    });
    await expect(page.locator('.mimetic-term')).toHaveText('<img src=x onerror=alert(1)>');
    await expect(page.locator('.mimetic-example')).toHaveText('<script>alert(1)</script>');
    await expect(page.locator('body img,body script')).toHaveCount(0);
    await expect(page.locator('.mimetic-reference')).toBeHidden();
    await expect(page.locator('.mimetic-reference')).not.toHaveAttribute('href');
    await page.evaluate(()=>{
      const module=(window as any).mimeticModule,entry=module.findMimetic('にこにこ');
      document.body.replaceChildren(module.renderMimeticPlayground({...entry,variants:[{...entry.variants[0],reference:{label:'Broken',url:'invalid URL'}},entry.variants[1]]}));
    });
    await expect(page.locator('.mimetic-reference')).toBeHidden();
    await expect(page.locator('.mimetic-term')).toHaveText('にこにこ');
  } finally {await page.close();}
});
